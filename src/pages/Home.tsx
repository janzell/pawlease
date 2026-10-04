import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Phone, Plus, Siren } from "lucide-react";
import type { ActivityKind, Task } from "../../shared/types.ts";
import { useSession } from "../state.tsx";
import { ACTIVITY_META, toneStyle } from "../lib/meta.ts";
import { firstName, greeting, nowLocalInput, parseUtc, timeAgo, todayStr } from "../lib/format.ts";
import { QuickLog } from "../components/QuickLog.tsx";
import { ActivityRow, BookingRow, TaskRow } from "../components/items.tsx";
import { BookingForm, PetForm, TaskForm } from "../components/forms.tsx";
import { Empty, PetAvatar } from "../components/ui.tsx";

const QUICK: ActivityKind[] = ["walk", "feed", "potty", "meds", "water", "treat"];

export function HomePage() {
  const { me, data } = useSession();
  const navigate = useNavigate();
  const [log, setLog] = useState<ActivityKind | null>(null);
  const [sheet, setSheet] = useState<null | "pet" | "task" | "booking" | { task: Task }>(null);

  const today = todayStr();
  const myVet = data.professionals.find((p) => p.kind === "vet" && p.is_primary) ?? data.professionals.find((p) => p.kind === "vet");
  const dueTasks = data.tasks.filter((t) => !t.done_at && (!t.due_date || t.due_date <= today)).slice(0, 6);
  const now = nowLocalInput();
  const upcoming = data.bookings.filter((b) => b.status === "upcoming" && b.starts_at >= now.slice(0, 10)).slice(0, 3);
  const recent = data.activities.slice(0, 6);

  const lastFor = (petId: number, kind: ActivityKind) => data.activities.find((a) => a.pet_id === petId && a.kind === kind);

  return (
    <>
      <section className="hero">
        <p className="small" style={{ fontWeight: 800, color: "var(--brand-strong)" }}>
          {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1>
          {greeting()}, {firstName(me.user.name)}
        </h1>
        <p className="sub">
          {data.pets.length === 0
            ? "Let's add your first dog."
            : dueTasks.length === 0
              ? `All caught up. ${data.pets.map((p) => p.name).join(" & ")} ${data.pets.length > 1 ? "are" : "is"} in good hands.`
              : `${dueTasks.length} thing${dueTasks.length > 1 ? "s" : ""} to do today.`}
        </p>
        {data.pets.length > 0 && (
          <div className="pet-strip">
            {data.pets.map((p) => {
              const fed = lastFor(p.id, "feed");
              const walk = lastFor(p.id, "walk");
              return (
                <Link key={p.id} to={`/pets/${p.id}`} className="pet-mini">
                  <PetAvatar pet={p} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800 }}>{p.name}</div>
                    <div className="small muted ellipsis">
                      {fed ? `Fed ${timeAgo(parseUtc(fed.created_at))}` : "Not fed yet"}
                      {walk ? ` · walked ${timeAgo(parseUtc(walk.created_at))}` : ""}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {data.pets.length === 0 && (
        <div className="section">
          <Empty
            emoji="🐶"
            text="Add your dog's profile: food, meds, allergies, microchip and more. Your family will see it too."
            action={
              <button className="btn btn-primary" onClick={() => setSheet("pet")}>
                <Plus size={18} /> Add a dog
              </button>
            }
          />
        </div>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Quick actions</h2>
        </div>
        <div className="qa-grid">
          {QUICK.map((k) => {
            const m = ACTIVITY_META[k];
            return (
              <button key={k} className="qa" onClick={() => setLog(k)}>
                <span className="ico" style={toneStyle(m.tone)}>
                  <m.icon size={20} />
                </span>
                {m.label}
              </button>
            );
          })}
          {myVet?.phone ? (
            <a className="qa" href={`tel:${myVet.phone}`}>
              <span className="ico" style={toneStyle("danger")}>
                <Phone size={20} />
              </span>
              Call vet
            </a>
          ) : (
            <button className="qa" onClick={() => navigate("/pros")}>
              <span className="ico" style={toneStyle("danger")}>
                <Phone size={20} />
              </span>
              Add vet
            </button>
          )}
          <button className="qa" onClick={() => navigate("/guides/emergency")}>
            <span className="ico" style={toneStyle("danger")}>
              <Siren size={20} />
            </span>
            Emergency
          </button>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Today's tasks</h2>
          <button className="link-btn" onClick={() => setSheet("task")}>
            + Add
          </button>
        </div>
        {dueTasks.length ? (
          <div className="list">
            {dueTasks.map((t) => (
              <TaskRow key={t.id} task={t} onOpen={() => setSheet({ task: t })} />
            ))}
          </div>
        ) : (
          <Empty emoji="✅" text="Nothing due today." />
        )}
        {dueTasks.length > 0 && (
          <p style={{ marginTop: 8 }}>
            <Link to="/tasks" className="small" style={{ fontWeight: 700 }}>
              See all tasks →
            </Link>
          </p>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Coming up</h2>
          <Link to="/bookings">All bookings</Link>
        </div>
        {upcoming.length ? (
          <div className="list">
            {upcoming.map((b) => (
              <BookingRow key={b.id} booking={b} onOpen={() => navigate("/bookings")} />
            ))}
          </div>
        ) : (
          <Empty
            emoji="📅"
            text="No upcoming bookings."
            action={
              <button className="btn btn-secondary btn-sm" onClick={() => setSheet("booking")}>
                Add booking
              </button>
            }
          />
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Family activity</h2>
          {me.members.length < 2 && <Link to="/family">Invite family</Link>}
        </div>
        {recent.length ? (
          <div className="card tight">
            {recent.map((a) => (
              <ActivityRow key={a.id} activity={a} />
            ))}
          </div>
        ) : (
          <Empty emoji="🐾" text="Walks, meals and meds you log with quick actions show up here for everyone." />
        )}
      </section>

      {log && <QuickLog kind={log} onClose={() => setLog(null)} />}
      {sheet === "pet" && <PetForm onClose={() => setSheet(null)} />}
      {sheet === "task" && <TaskForm onClose={() => setSheet(null)} />}
      {sheet === "booking" && <BookingForm onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === "object" && <TaskForm initial={sheet.task} onClose={() => setSheet(null)} />}
    </>
  );
}
