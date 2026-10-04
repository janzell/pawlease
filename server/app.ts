import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import type { DB, Param, Q, Row } from "./db.ts";
import { hashPassword, newInviteCode, newToken, verifyPassword } from "./auth.ts";
import { HttpError, RESOURCES, validate, type RefChecker } from "./resources.ts";
import type { Household, Me, Member, Task } from "../shared/types.ts";

const COOKIE = "pl_session";
const SESSION_DAYS = 30;
const HOUSEHOLD_TABLES = ["pets", "professionals", "tasks", "notes", "bookings", "activities", "memberships"];

interface Ctx {
  userId: number;
  householdId: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ctx?: Ctx;
    }
  }
}

export function createApp(db: DB, opts: { secureCookies?: boolean } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());
  app.use("/api", async (_req, _res, next) => {
    await db.ready();
    next();
  });

  // ---- helpers -----------------------------------------------------------

  async function createHousehold(q: Q, name: string, ownerId: number): Promise<number> {
    const { lastId: hid } = await q.run("INSERT INTO households (name, invite_code) VALUES (?, ?)", name, newInviteCode());
    await q.run("INSERT INTO memberships (household_id, user_id, role) VALUES (?, ?, 'owner')", hid, ownerId);
    await q.run("UPDATE users SET active_household_id = ? WHERE id = ?", hid, ownerId);
    return hid;
  }

  async function startSession(res: Response, userId: number) {
    const token = newToken();
    const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
    await db.run("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", token, userId, expires.toISOString());
    res.cookie(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: !!opts.secureCookies,
      expires,
      path: "/",
    });
  }

  function membership(userId: number, householdId: number) {
    return db.one<{ role: string }>(
      "SELECT role FROM memberships WHERE user_id = ? AND household_id = ?",
      userId,
      householdId,
    );
  }

  async function me(userId: number, householdId: number): Promise<Me> {
    const [user, households, members] = await Promise.all([
      db.one<Me["user"]>("SELECT id, email, name FROM users WHERE id = ?", userId),
      db.all<Household>(
        `SELECT h.id, h.name, h.invite_code, m.role FROM households h
         JOIN memberships m ON m.household_id = h.id WHERE m.user_id = ? ORDER BY h.name`,
        userId,
      ),
      db.all<Member>(
        `SELECT u.id, u.name, u.email, m.role, m.joined_at FROM memberships m
         JOIN users u ON u.id = m.user_id WHERE m.household_id = ? ORDER BY m.role = 'owner' DESC, m.joined_at`,
        householdId,
      ),
    ]);
    return { user: user!, household: households.find((h) => h.id === householdId)!, households, members };
  }

  async function activeHousehold(userId: number) {
    const u = await db.one<{ active_household_id: number }>("SELECT active_household_id FROM users WHERE id = ?", userId);
    return u!.active_household_id;
  }

  async function requireAuth(req: Request, _res: Response, next: NextFunction) {
    const token = req.cookies?.[COOKIE];
    if (!token) throw new HttpError(401, "Not signed in");
    const s = await db.one<{ user_id: number; expires_at: string; active_household_id: number | null }>(
      `SELECT s.user_id, s.expires_at, u.active_household_id FROM sessions s
       JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
      token,
    );
    if (!s || new Date(s.expires_at) < new Date()) throw new HttpError(401, "Session expired");

    let hid = s.active_household_id;
    if (!hid || !(await membership(s.user_id, hid))) {
      // Active household was lost (e.g. removed by owner): fall back to any
      // other membership, or give the user a fresh household.
      const other = await db.one<{ household_id: number }>("SELECT household_id FROM memberships WHERE user_id = ?", s.user_id);
      if (other) {
        hid = other.household_id;
        await db.run("UPDATE users SET active_household_id = ? WHERE id = ?", hid, s.user_id);
      } else {
        hid = await db.tx((q) => createHousehold(q, "My Pack", s.user_id));
      }
    }
    req.ctx = { userId: s.user_id, householdId: hid };
    next();
  }

  const ctx = (req: Request) => req.ctx!;

  async function requireOwner(req: Request) {
    const { userId, householdId } = ctx(req);
    if ((await membership(userId, householdId))?.role !== "owner") throw new HttpError(403, "Only the household owner can do that");
  }

  function refChecker(householdId: number): RefChecker {
    return async (kind, id) =>
      kind === "member"
        ? !!(await db.one("SELECT 1 AS x FROM memberships WHERE household_id = ? AND user_id = ?", householdId, id))
        : !!(await db.one(`SELECT 1 AS x FROM ${kind} WHERE household_id = ? AND id = ?`, householdId, id));
  }

  const nameField = (req: Request, what: string) => {
    const name = String(req.body?.name ?? "").trim();
    if (!name || name.length > 60) throw new HttpError(400, `Enter ${what}`);
    return name;
  };

  // ---- auth --------------------------------------------------------------

  app.post("/api/auth/register", async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const name = nameField(req, "your name");
    const password = String(req.body?.password ?? "");
    const inviteCode = String(req.body?.inviteCode ?? "").trim().toUpperCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Enter a valid email");
    if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");
    if (await db.one("SELECT 1 AS x FROM users WHERE email = ?", email)) throw new HttpError(409, "An account with that email already exists");

    let joinId: number | undefined;
    if (inviteCode) {
      joinId = (await db.one<{ id: number }>("SELECT id FROM households WHERE invite_code = ?", inviteCode))?.id;
      if (!joinId) throw new HttpError(404, "Invite code not found");
    }

    const hash = await hashPassword(password);
    const userId = await db.tx(async (q) => {
      const { lastId: uid } = await q.run("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)", email, name, hash);
      if (joinId) {
        await q.run("INSERT INTO memberships (household_id, user_id, role) VALUES (?, ?, 'member')", joinId, uid);
        await q.run("UPDATE users SET active_household_id = ? WHERE id = ?", joinId, uid);
      } else {
        await createHousehold(q, `${name.split(" ")[0]}'s Pack`, uid);
      }
      return uid;
    });
    await startSession(res, userId);
    res.status(201).json(await me(userId, await activeHousehold(userId)));
  });

  app.post("/api/auth/login", async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const u = await db.one<{ id: number; password_hash: string }>("SELECT id, password_hash FROM users WHERE email = ?", email);
    if (!u || !(await verifyPassword(password, u.password_hash))) throw new HttpError(401, "Wrong email or password");
    await db.run("DELETE FROM sessions WHERE user_id = ? AND expires_at < ?", u.id, new Date().toISOString());
    await startSession(res, u.id);
    res.json({ ok: true });
  });

  app.post("/api/auth/logout", async (req, res) => {
    const token = req.cookies?.[COOKIE];
    if (token) await db.run("DELETE FROM sessions WHERE token = ?", token);
    res.clearCookie(COOKIE, { path: "/" });
    res.json({ ok: true });
  });

  app.get("/api/me", requireAuth, async (req, res) => {
    res.json(await me(ctx(req).userId, ctx(req).householdId));
  });

  app.patch("/api/me", requireAuth, async (req, res) => {
    await db.run("UPDATE users SET name = ? WHERE id = ?", nameField(req, "your name"), ctx(req).userId);
    res.json(await me(ctx(req).userId, ctx(req).householdId));
  });

  // ---- households & family sharing ----------------------------------------

  app.patch("/api/household", requireAuth, async (req, res) => {
    await requireOwner(req);
    await db.run("UPDATE households SET name = ? WHERE id = ?", nameField(req, "a household name"), ctx(req).householdId);
    res.json(await me(ctx(req).userId, ctx(req).householdId));
  });

  app.post("/api/household/invite", requireAuth, async (req, res) => {
    await requireOwner(req);
    await db.run("UPDATE households SET invite_code = ? WHERE id = ?", newInviteCode(), ctx(req).householdId);
    res.json(await me(ctx(req).userId, ctx(req).householdId));
  });

  app.post("/api/households/join", requireAuth, async (req, res) => {
    const code = String(req.body?.code ?? "").trim().toUpperCase();
    const h = await db.one<{ id: number }>("SELECT id FROM households WHERE invite_code = ?", code);
    if (!h) throw new HttpError(404, "Invite code not found");
    const { userId } = ctx(req);
    await db.run("INSERT OR IGNORE INTO memberships (household_id, user_id, role) VALUES (?, ?, 'member')", h.id, userId);
    await db.run("UPDATE users SET active_household_id = ? WHERE id = ?", h.id, userId);
    res.json(await me(userId, h.id));
  });

  app.post("/api/households", requireAuth, async (req, res) => {
    const name = nameField(req, "a household name");
    const hid = await db.tx((q) => createHousehold(q, name, ctx(req).userId));
    res.status(201).json(await me(ctx(req).userId, hid));
  });

  app.post("/api/households/switch", requireAuth, async (req, res) => {
    const id = Number(req.body?.id);
    const { userId } = ctx(req);
    if (!(await membership(userId, id))) throw new HttpError(404, "Household not found");
    await db.run("UPDATE users SET active_household_id = ? WHERE id = ?", id, userId);
    res.json(await me(userId, id));
  });

  app.delete("/api/household/members/:userId", requireAuth, async (req, res) => {
    const { userId, householdId } = ctx(req);
    const target = Number(req.params.userId);
    const leaving = target === userId;
    if (!leaving) await requireOwner(req);
    if (!(await membership(target, householdId))) throw new HttpError(404, "Member not found");

    await db.tx(async (q) => {
      await q.run("DELETE FROM memberships WHERE household_id = ? AND user_id = ?", householdId, target);
      await q.run("UPDATE tasks SET assignee_id = NULL WHERE household_id = ? AND assignee_id = ?", householdId, target);
      const remaining = await q.all<{ user_id: number; role: string }>(
        "SELECT user_id, role FROM memberships WHERE household_id = ? ORDER BY joined_at",
        householdId,
      );
      if (remaining.length === 0) {
        for (const t of HOUSEHOLD_TABLES) await q.run(`DELETE FROM ${t} WHERE household_id = ?`, householdId);
        await q.run("DELETE FROM households WHERE id = ?", householdId);
      } else if (!remaining.some((r) => r.role === "owner")) {
        await q.run("UPDATE memberships SET role = 'owner' WHERE household_id = ? AND user_id = ?", householdId, remaining[0].user_id);
      }
    });

    if (leaving) {
      // requireAuth on the next request will pick another household (or create one).
      await db.run("UPDATE users SET active_household_id = NULL WHERE id = ?", userId);
      res.json({ ok: true });
    } else {
      res.json(await me(userId, householdId));
    }
  });

  // ---- household data ------------------------------------------------------

  app.get("/api/data", requireAuth, async (req, res) => {
    const { householdId } = ctx(req);
    const entries = await Promise.all(
      Object.entries(RESOURCES).map(async ([key, spec]) => {
        const rows = await db.all(
          `SELECT * FROM ${spec.table} WHERE household_id = ? ORDER BY ${spec.order}${spec.limit ? ` LIMIT ${spec.limit}` : ""}`,
          householdId,
        );
        return [key, rows.map(({ household_id: _h, ...rest }) => rest)] as const;
      }),
    );
    res.json(Object.fromEntries(entries));
  });

  // Completing a recurring task schedules its next occurrence.
  app.post("/api/tasks/:id/toggle", requireAuth, async (req, res) => {
    const { userId, householdId } = ctx(req);
    const t = await db.one<Task>("SELECT * FROM tasks WHERE id = ? AND household_id = ?", Number(req.params.id), householdId);
    if (!t) throw new HttpError(404, "Task not found");
    const result = await db.tx(async (q) => {
      if (t.done_at) {
        await q.run("UPDATE tasks SET done_at = NULL, done_by = NULL WHERE id = ?", t.id);
        return { next: null };
      }
      await q.run("UPDATE tasks SET done_at = datetime('now'), done_by = ? WHERE id = ?", userId, t.id);
      if (t.repeat === "none" || !t.due_date) return { next: null };
      const { lastId } = await q.run(
        `INSERT INTO tasks (household_id, pet_id, title, notes, due_date, due_time, repeat, assignee_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        householdId, t.pet_id, t.title, t.notes, advanceDate(t.due_date, t.repeat), t.due_time, t.repeat, t.assignee_id, t.created_by,
      );
      return { next: lastId };
    });
    res.json(result);
  });

  for (const [key, spec] of Object.entries(RESOURCES)) {
    const base = `/api/${key}`;

    const fetchOne = async (id: number, householdId: number) => {
      const row = await db.one(`SELECT * FROM ${spec.table} WHERE id = ? AND household_id = ?`, id, householdId);
      if (!row) throw new HttpError(404, "Not found");
      delete row.household_id;
      return row;
    };

    const afterWrite = async (householdId: number, row: Row) => {
      // Only one primary professional per kind ("My Vet").
      if (key === "professionals" && row.is_primary) {
        await db.run(
          "UPDATE professionals SET is_primary = 0 WHERE household_id = ? AND kind = ? AND id != ?",
          householdId, row.kind, row.id,
        );
      }
      // Logging a weight keeps the pet profile current.
      if (key === "activities" && row.kind === "weight" && row.pet_id && row.value != null) {
        await db.run("UPDATE pets SET weight_kg = ? WHERE id = ? AND household_id = ?", row.value, row.pet_id, householdId);
      }
    };

    app.post(base, requireAuth, async (req, res) => {
      const { userId, householdId } = ctx(req);
      const values = await validate(spec, req.body, false, refChecker(householdId));
      const cols = ["household_id", ...Object.keys(values)];
      const params: Param[] = [householdId, ...Object.values(values)];
      if (spec.createdBy) {
        cols.push("created_by");
        params.push(userId);
      }
      const { lastId } = await db.run(
        `INSERT INTO ${spec.table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
        ...params,
      );
      const row = await fetchOne(lastId, householdId);
      await afterWrite(householdId, row);
      res.status(201).json(row);
    });

    app.patch(`${base}/:id`, requireAuth, async (req, res) => {
      const { householdId } = ctx(req);
      const id = Number(req.params.id);
      await fetchOne(id, householdId);
      const values = await validate(spec, req.body, true, refChecker(householdId));
      const sets = Object.keys(values).map((c) => `${c} = ?`);
      if (spec.touch) sets.push("updated_at = datetime('now')");
      if (sets.length) {
        await db.run(`UPDATE ${spec.table} SET ${sets.join(", ")} WHERE id = ? AND household_id = ?`, ...Object.values(values), id, householdId);
      }
      const row = await fetchOne(id, householdId);
      await afterWrite(householdId, row);
      res.json(row);
    });

    app.delete(`${base}/:id`, requireAuth, async (req, res) => {
      const { householdId } = ctx(req);
      const id = Number(req.params.id);
      const changes = await db.tx(async (q) => {
        const r = await q.run(`DELETE FROM ${spec.table} WHERE id = ? AND household_id = ?`, id, householdId);
        if (!r.changes) return 0;
        // Clean up references (in place of ON DELETE CASCADE / SET NULL).
        if (key === "pets") {
          await q.run("DELETE FROM activities WHERE pet_id = ? AND household_id = ?", id, householdId);
          for (const t of ["tasks", "notes", "bookings"]) {
            await q.run(`UPDATE ${t} SET pet_id = NULL WHERE pet_id = ? AND household_id = ?`, id, householdId);
          }
        } else if (key === "professionals") {
          await q.run("UPDATE bookings SET professional_id = NULL WHERE professional_id = ? AND household_id = ?", id, householdId);
        }
        return r.changes;
      });
      if (!changes) throw new HttpError(404, "Not found");
      res.json({ ok: true });
    });
  }

  app.use("/api", () => {
    throw new HttpError(404, "Not found");
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json({ error: "Malformed JSON" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}

export function advanceDate(date: string, repeat: Task["repeat"]): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (repeat === "daily") dt.setUTCDate(dt.getUTCDate() + 1);
  else if (repeat === "weekly") dt.setUTCDate(dt.getUTCDate() + 7);
  else if (repeat === "monthly") {
    // Clamp to month end so Jan 31 -> Feb 28/29 rather than Mar 3.
    const target = new Date(Date.UTC(y, m, 1));
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(d, lastDay));
    return target.toISOString().slice(0, 10);
  }
  return dt.toISOString().slice(0, 10);
}
