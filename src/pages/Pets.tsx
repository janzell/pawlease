import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Pencil, Plus, Share2 } from "lucide-react";
import type { ActivityKind, Booking, Note, Pet, Task } from "../../shared/types.ts";
import { useSession } from "../state.tsx";
import { ACTIVITY_META, toneStyle } from "../lib/meta.ts";
import { age, capitalize, friendlyDate } from "../lib/format.ts";
import { BookingForm, NoteForm, PetForm, TaskForm } from "../components/forms.tsx";
import { ActivityRow, BookingRow, NoteCard, TaskRow } from "../components/items.tsx";
import { QuickLog } from "../components/QuickLog.tsx";
import { Empty, PetAvatar, Segmented } from "../components/ui.tsx";

export function PetsPage() {
  const { data } = useSession();
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Your dogs</h1>
          <p className="sub">Profiles are shared with everyone in your household.</p>
        </div>
      </div>
      {data.pets.length === 0 ? (
        <Empty
          emoji="🐶"
          text="No dogs yet. Add your first one to get started."
          action={
            <button className="btn btn-primary" onClick={() => setAdding(true)}>
              <Plus size={18} /> Add a dog
            </button>
          }
        />
      ) : (
        <div className="list">
          {data.pets.map((p) => (
            <Link key={p.id} to={`/pets/${p.id}`} className="list-item">
              <PetAvatar pet={p} />
              <div className="grow">
                <div style={{ fontWeight: 800 }}>{p.name}</div>
                <div className="small muted ellipsis">{[p.breed, age(p.birthday), p.weight_kg ? `${p.weight_kg} kg` : ""].filter(Boolean).join(" · ") || "Tap to add details"}</div>
              </div>
              <ChevronRight size={18} className="muted" />
            </Link>
          ))}
        </div>
      )}
      <button className="fab" aria-label="Add a dog" onClick={() => setAdding(true)}>
        <Plus size={26} />
      </button>
      {adding && <PetForm onClose={() => setAdding(false)} onSaved={(p) => navigate(`/pets/${p.id}`)} />}
    </>
  );
}

type Tab = "activity" | "tasks" | "notes" | "bookings";
type Sheet = null | "edit" | "task" | "note" | "booking" | { task: Task } | { note: Note } | { booking: Booking };

const PET_QUICK: ActivityKind[] = ["walk", "feed", "meds", "potty", "treat", "bath", "weight"];

function shareText(p: Pet): string {
  const lines = [
    `🐾 ${p.name}`,
    p.breed && `Breed: ${p.breed}`,
    p.birthday && `Born: ${friendlyDate(p.birthday)} (${age(p.birthday)})`,
    p.sex && `Sex: ${capitalize(p.sex)}`,
    p.weight_kg && `Weight: ${p.weight_kg} kg`,
    p.microchip && `Microchip: ${p.microchip}`,
    p.food && `Food: ${p.food}`,
    p.allergies && `Allergies: ${p.allergies}`,
    p.medications && `Medications: ${p.medications}`,
    p.notes && `Notes: ${p.notes}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function PetDetailPage() {
  const { id } = useParams();
  const { data, toast } = useSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("activity");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [log, setLog] = useState<ActivityKind | null>(null);
  const pet = data.pets.find((p) => p.id === Number(id));

  if (!pet) {
    return (
      <>
        <Link to="/pets" className="btn btn-ghost">
          <ArrowLeft size={18} /> Back
        </Link>
        <Empty emoji="🔍" text="This dog isn't in your household (or is still loading)." />
      </>
    );
  }

  const tasks = data.tasks.filter((t) => t.pet_id === pet.id);
  const notes = data.notes.filter((n) => n.pet_id === pet.id);
  const bookings = data.bookings.filter((b) => b.pet_id === pet.id);
  const activities = data.activities.filter((a) => a.pet_id === pet.id);

  const share = async () => {
    const text = shareText(pet);
    try {
      if (navigator.share) await navigator.share({ title: pet.name, text });
      else {
        await navigator.clipboard.writeText(text);
        toast("Profile copied, ready to paste for a sitter or vet");
      }
    } catch {
      /* user cancelled */
    }
  };

  const facts: [string, string][] = [
    ["Breed", pet.breed],
    ["Age", pet.birthday ? `${age(pet.birthday)} · ${friendlyDate(pet.birthday)}` : ""],
    ["Sex", capitalize(pet.sex)],
    ["Weight", pet.weight_kg ? `${pet.weight_kg} kg` : ""],
    ["Colour", pet.color],
    ["Microchip", pet.microchip],
  ];
  const care: [string, string][] = [
    ["Food", pet.food],
    ["Allergies", pet.allergies],
    ["Medications", pet.medications],
    ["Notes", pet.notes],
  ];

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <Link to="/pets" className="icon-btn" aria-label="Back to pets">
          <ArrowLeft size={20} />
        </Link>
        <div className="row" style={{ gap: 4 }}>
          <button className="icon-btn" onClick={share} aria-label="Share profile">
            <Share2 size={19} />
          </button>
          <button className="icon-btn" onClick={() => setSheet("edit")} aria-label="Edit profile">
            <Pencil size={19} />
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: 16, marginBottom: 18 }}>
        <PetAvatar pet={pet} size="lg" />
        <div className="grow">
          <h1>{pet.name}</h1>
          <p className="muted" style={{ fontWeight: 600 }}>
            {[pet.breed, age(pet.birthday)].filter(Boolean).join(" · ") || "Add breed and birthday"}
          </p>
        </div>
      </div>

      <div className="chips" style={{ marginBottom: 18 }}>
        {PET_QUICK.map((k) => {
          const m = ACTIVITY_META[k];
          return (
            <button key={k} className="chip" onClick={() => setLog(k)}>
              <m.icon size={15} style={{ color: toneStyle(m.tone).color }} /> {m.label}
            </button>
          );
        })}
      </div>

      <div className="card">
        <div className="kv">
          {facts.map(([k, v]) => (
            <div key={k}>
              <div className="k">{k}</div>
              <div className="v">{v || <span className="muted">—</span>}</div>
            </div>
          ))}
        </div>
        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />
        <div className="kv">
          {care.map(([k, v]) => (
            <div key={k} className="full">
              <div className="k">{k}</div>
              <div className="v" style={{ fontWeight: 600, whiteSpace: "pre-wrap", ...(k === "Allergies" && v ? { color: "var(--danger)" } : {}) }}>
                {v || <span className="muted">—</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <Segmented<Tab>
          label="Pet sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: "activity", label: "Log" },
            { value: "tasks", label: `Tasks${tasks.filter((t) => !t.done_at).length ? ` (${tasks.filter((t) => !t.done_at).length})` : ""}` },
            { value: "notes", label: "Notes" },
            { value: "bookings", label: "Bookings" },
          ]}
        />

        {tab === "activity" &&
          (activities.length ? (
            <div className="card tight">
              {activities.slice(0, 30).map((a) => (
                <ActivityRow key={a.id} activity={a} />
              ))}
            </div>
          ) : (
            <Empty emoji="🐾" text={`Use the buttons above to log ${pet.name}'s walks, meals and meds.`} />
          ))}

        {tab === "tasks" && (
          <>
            {tasks.length ? (
              <div className="list">
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t} onOpen={() => setSheet({ task: t })} />
                ))}
              </div>
            ) : (
              <Empty emoji="✅" text={`No tasks for ${pet.name} yet.`} />
            )}
            <button className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={() => setSheet("task")}>
              <Plus size={18} /> Add task
            </button>
          </>
        )}

        {tab === "notes" && (
          <>
            {notes.length ? (
              <div className="stack">
                {notes.map((n) => (
                  <NoteCard key={n.id} note={n} onOpen={() => setSheet({ note: n })} />
                ))}
              </div>
            ) : (
              <Empty emoji="📝" text="Vet advice, quirks, sitter instructions: keep them here." />
            )}
            <button className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={() => setSheet("note")}>
              <Plus size={18} /> Add note
            </button>
          </>
        )}

        {tab === "bookings" && (
          <>
            {bookings.length ? (
              <div className="list">
                {bookings.map((b) => (
                  <BookingRow key={b.id} booking={b} onOpen={() => setSheet({ booking: b })} />
                ))}
              </div>
            ) : (
              <Empty emoji="📅" text={`No bookings for ${pet.name}.`} />
            )}
            <button className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={() => setSheet("booking")}>
              <Plus size={18} /> Add booking
            </button>
          </>
        )}
      </div>

      {log && <QuickLog kind={log} petId={pet.id} onClose={() => setLog(null)} />}
      {sheet === "edit" && <PetForm initial={pet} onClose={() => setSheet(null)} onDeleted={() => navigate("/pets")} />}
      {sheet === "task" && <TaskForm initial={{ pet_id: pet.id }} onClose={() => setSheet(null)} />}
      {sheet === "note" && <NoteForm initial={{ pet_id: pet.id }} onClose={() => setSheet(null)} />}
      {sheet === "booking" && <BookingForm initial={{ pet_id: pet.id }} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === "object" && "task" in sheet && <TaskForm initial={sheet.task} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === "object" && "note" in sheet && <NoteForm initial={sheet.note} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === "object" && "booking" in sheet && <BookingForm initial={sheet.booking} onClose={() => setSheet(null)} />}
    </>
  );
}
