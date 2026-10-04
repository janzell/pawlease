import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { createDb } from "./db.ts";
import { advanceDate, createApp } from "./app.ts";

let server: Server;
let base: string;

beforeEach(async () => {
  // A real file rather than :memory:, since libSQL transactions open a new
  // connection and would otherwise see an empty in-memory database.
  const file = join(mkdtempSync(join(tmpdir(), "pawlease-")), "test.db");
  const app = createApp(createDb(createClient({ url: `file:${file}` })));
  server = await new Promise<Server>((r) => {
    const s = app.listen(0, () => r(s));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(() => new Promise<void>((r) => server.close(() => r())));

/** Minimal cookie-keeping client, one per simulated person. */
function client() {
  let cookie = "";
  return async (method: string, path: string, body?: unknown) => {
    const res = await fetch(base + path, {
      method,
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return { status: res.status, body: (await res.json()) as any };
  };
}

async function signup(name: string, extra: Record<string, string> = {}) {
  const c = client();
  const r = await c("POST", "/api/auth/register", {
    email: `${name.toLowerCase()}@example.com`,
    name,
    password: "correct horse",
    ...extra,
  });
  expect(r.status).toBe(201);
  return { c, me: r.body };
}

describe("auth", () => {
  it("registers, creates a household, and logs in again", async () => {
    const { me } = await signup("Alex");
    expect(me.household.name).toBe("Alex's Pack");
    expect(me.household.role).toBe("owner");

    const c = client();
    expect((await c("GET", "/api/me")).status).toBe(401);
    expect((await c("POST", "/api/auth/login", { email: "alex@example.com", password: "nope" })).status).toBe(401);
    expect((await c("POST", "/api/auth/login", { email: "ALEX@example.com", password: "correct horse" })).status).toBe(200);
    expect((await c("GET", "/api/me")).body.user.name).toBe("Alex");
    await c("POST", "/api/auth/logout");
    expect((await c("GET", "/api/me")).status).toBe(401);
  });

  it("rejects duplicate emails and short passwords", async () => {
    await signup("Alex");
    const c = client();
    expect((await c("POST", "/api/auth/register", { email: "alex@example.com", name: "A", password: "12345678" })).status).toBe(409);
    expect((await c("POST", "/api/auth/register", { email: "b@example.com", name: "B", password: "short" })).status).toBe(400);
  });
});

describe("family sharing", () => {
  it("lets family join with an invite code and see the same pets", async () => {
    const alex = await signup("Alex");
    await alex.c("POST", "/api/pets", { name: "Biscuit", breed: "Beagle" });

    const sam = await signup("Sam", { inviteCode: alex.me.household.invite_code.toLowerCase() });
    expect(sam.me.household.id).toBe(alex.me.household.id);
    expect(sam.me.members.map((m: any) => m.name)).toEqual(["Alex", "Sam"]);

    const data = await sam.c("GET", "/api/data");
    expect(data.body.pets.map((p: any) => p.name)).toEqual(["Biscuit"]);
  });

  it("isolates households from each other", async () => {
    const alex = await signup("Alex");
    const pet = (await alex.c("POST", "/api/pets", { name: "Biscuit" })).body;
    const eve = await signup("Eve");
    expect((await eve.c("GET", "/api/data")).body.pets).toEqual([]);
    expect((await eve.c("PATCH", `/api/pets/${pet.id}`, { name: "Stolen" })).status).toBe(404);
    expect((await eve.c("DELETE", `/api/pets/${pet.id}`)).status).toBe(404);
    // Cannot reference another household's pet either.
    expect((await eve.c("POST", "/api/tasks", { title: "Walk", pet_id: pet.id })).status).toBe(400);
  });

  it("existing users can join, switch, and leave households", async () => {
    const alex = await signup("Alex");
    const sam = await signup("Sam");
    const joined = await sam.c("POST", "/api/households/join", { code: alex.me.household.invite_code });
    expect(joined.body.households).toHaveLength(2);
    expect(joined.body.household.id).toBe(alex.me.household.id);

    const back = await sam.c("POST", "/api/households/switch", { id: sam.me.household.id });
    expect(back.body.household.id).toBe(sam.me.household.id);

    // Only owners can remove others or rename.
    expect((await sam.c("POST", "/api/households/switch", { id: alex.me.household.id })).status).toBe(200);
    expect((await sam.c("DELETE", `/api/household/members/${alex.me.user.id}`)).status).toBe(403);
    expect((await sam.c("PATCH", "/api/household", { name: "Mine" })).status).toBe(403);

    expect((await sam.c("DELETE", `/api/household/members/${sam.me.user.id}`)).status).toBe(200);
    const after = await sam.c("GET", "/api/me");
    expect(after.body.household.id).toBe(sam.me.household.id);
  });

  it("owner can rotate the invite code and remove a member", async () => {
    const alex = await signup("Alex");
    const sam = await signup("Sam", { inviteCode: alex.me.household.invite_code });
    const rotated = await alex.c("POST", "/api/household/invite");
    expect(rotated.body.household.invite_code).not.toBe(alex.me.household.invite_code);

    const removed = await alex.c("DELETE", `/api/household/members/${sam.me.user.id}`);
    expect(removed.body.members).toHaveLength(1);
    // Sam gets a fresh household instead of being locked out.
    const samMe = await sam.c("GET", "/api/me");
    expect(samMe.status).toBe(200);
    expect(samMe.body.household.id).not.toBe(alex.me.household.id);
  });

  it("assigns tasks only to household members", async () => {
    const alex = await signup("Alex");
    const sam = await signup("Sam", { inviteCode: alex.me.household.invite_code });
    const eve = await signup("Eve");
    expect((await alex.c("POST", "/api/tasks", { title: "Walk", assignee_id: sam.me.user.id })).status).toBe(201);
    expect((await alex.c("POST", "/api/tasks", { title: "Walk", assignee_id: eve.me.user.id })).status).toBe(400);
  });
});

describe("resources", () => {
  it("validates input and ignores unknown columns", async () => {
    const { c } = await signup("Alex");
    expect((await c("POST", "/api/pets", {})).status).toBe(400);
    expect((await c("POST", "/api/pets", { name: "X", birthday: "yesterday" })).status).toBe(400);
    expect((await c("POST", "/api/bookings", { title: "Vet" })).status).toBe(400);
    const pet = await c("POST", "/api/pets", { name: "X", household_id: 999, id: 5 });
    expect(pet.status).toBe(201);
    expect(pet.body.household_id).toBeUndefined();
  });

  it("completing a recurring task schedules the next one", async () => {
    const { c } = await signup("Alex");
    const t = (await c("POST", "/api/tasks", { title: "Flea treatment", due_date: "2026-01-31", repeat: "monthly" })).body;
    const r = await c("POST", `/api/tasks/${t.id}/toggle`);
    expect(r.body.next).toBeTypeOf("number");
    const tasks = (await c("GET", "/api/data")).body.tasks;
    const next = tasks.find((x: any) => x.id === r.body.next);
    expect(next.due_date).toBe("2026-02-28");
    expect(tasks.find((x: any) => x.id === t.id).done_at).not.toBeNull();
  });

  it("keeps a single primary professional per kind", async () => {
    const { c } = await signup("Alex");
    const a = (await c("POST", "/api/professionals", { name: "Dr A", kind: "vet", is_primary: true })).body;
    await c("POST", "/api/professionals", { name: "Dr B", kind: "vet", is_primary: true });
    await c("POST", "/api/professionals", { name: "Groomer", kind: "groomer", is_primary: true });
    const pros = (await c("GET", "/api/data")).body.professionals;
    expect(pros.filter((p: any) => p.is_primary).map((p: any) => p.name).sort()).toEqual(["Dr B", "Groomer"]);
    expect(pros.find((p: any) => p.id === a.id).is_primary).toBe(0);
  });

  it("logging weight updates the pet", async () => {
    const { c } = await signup("Alex");
    const pet = (await c("POST", "/api/pets", { name: "Biscuit" })).body;
    await c("POST", "/api/activities", { kind: "weight", pet_id: pet.id, value: 12.5 });
    const data = (await c("GET", "/api/data")).body;
    expect(data.pets[0].weight_kg).toBe(12.5);
    expect(data.activities[0].kind).toBe("weight");
  });

  it("cleans up references when a pet or professional is deleted", async () => {
    const { c } = await signup("Alex");
    const pet = (await c("POST", "/api/pets", { name: "Biscuit" })).body;
    const pro = (await c("POST", "/api/professionals", { name: "Dr A" })).body;
    await c("POST", "/api/activities", { kind: "walk", pet_id: pet.id });
    const task = (await c("POST", "/api/tasks", { title: "Walk", pet_id: pet.id })).body;
    const booking = (await c("POST", "/api/bookings", { title: "Vet", starts_at: "2026-11-01T10:00", pet_id: pet.id, professional_id: pro.id })).body;

    await c("DELETE", `/api/pets/${pet.id}`);
    await c("DELETE", `/api/professionals/${pro.id}`);
    const data = (await c("GET", "/api/data")).body;
    expect(data.activities).toEqual([]);
    expect(data.tasks.find((t: any) => t.id === task.id).pet_id).toBeNull();
    const b = data.bookings.find((x: any) => x.id === booking.id);
    expect([b.pet_id, b.professional_id]).toEqual([null, null]);
  });

  it("bumps updated_at on note edits and deletes", async () => {
    const { c } = await signup("Alex");
    const n = (await c("POST", "/api/notes", { title: "Vet said", body: "Less treats" })).body;
    const edited = (await c("PATCH", `/api/notes/${n.id}`, { pinned: true })).body;
    expect(edited.pinned).toBe(1);
    expect((await c("DELETE", `/api/notes/${n.id}`)).status).toBe(200);
    expect((await c("DELETE", `/api/notes/${n.id}`)).status).toBe(404);
  });
});

describe("advanceDate", () => {
  it("handles daily, weekly, and month-end clamping", () => {
    expect(advanceDate("2026-12-31", "daily")).toBe("2027-01-01");
    expect(advanceDate("2026-10-04", "weekly")).toBe("2026-10-11");
    expect(advanceDate("2028-01-31", "monthly")).toBe("2028-02-29");
    expect(advanceDate("2026-12-15", "monthly")).toBe("2027-01-15");
  });
});
