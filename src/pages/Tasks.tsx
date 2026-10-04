import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import type { Note, Task } from "../../shared/types.ts";
import { useSession } from "../state.tsx";
import { todayStr } from "../lib/format.ts";
import { NoteForm, TaskForm } from "../components/forms.tsx";
import { NoteCard, TaskRow } from "../components/items.tsx";
import { Empty, Segmented } from "../components/ui.tsx";

type Tab = "tasks" | "notes";
type Filter = "todo" | "mine" | "done";

export function TasksPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "notes" ? "notes" : "tasks";
  const [sheet, setSheet] = useState<null | "new" | { task: Task } | { note: Note }>(null);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tasks &amp; Notes</h1>
          <p className="sub">Shared to-dos and notes for the whole household.</p>
        </div>
      </div>
      <Segmented<Tab>
        label="Tasks or notes"
        value={tab}
        onChange={(t) => setParams(t === "notes" ? { tab: "notes" } : {}, { replace: true })}
        options={[
          { value: "tasks", label: "Tasks" },
          { value: "notes", label: "Notes" },
        ]}
      />
      {tab === "tasks" ? <TaskList onOpen={(task) => setSheet({ task })} /> : <NoteList onOpen={(note) => setSheet({ note })} />}

      <button className="fab" aria-label={tab === "tasks" ? "Add task" : "Add note"} onClick={() => setSheet("new")}>
        <Plus size={26} />
      </button>

      {sheet === "new" && (tab === "tasks" ? <TaskForm onClose={() => setSheet(null)} /> : <NoteForm onClose={() => setSheet(null)} />)}
      {sheet && typeof sheet === "object" && "task" in sheet && <TaskForm initial={sheet.task} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === "object" && "note" in sheet && <NoteForm initial={sheet.note} onClose={() => setSheet(null)} />}
    </>
  );
}

function TaskList({ onOpen }: { onOpen: (t: Task) => void }) {
  const { data, me } = useSession();
  const [filter, setFilter] = useState<Filter>("todo");
  const today = todayStr();

  const open = data.tasks.filter((t) => !t.done_at && (filter !== "mine" || t.assignee_id === me.user.id));
  const groups: [string, Task[]][] =
    filter === "done"
      ? [["Completed", data.tasks.filter((t) => t.done_at).sort((a, b) => (b.done_at! > a.done_at! ? 1 : -1)).slice(0, 50)]]
      : [
          ["Overdue", open.filter((t) => t.due_date && t.due_date < today)],
          ["Today", open.filter((t) => t.due_date === today)],
          ["Upcoming", open.filter((t) => t.due_date > today)],
          ["Anytime", open.filter((t) => !t.due_date)],
        ];
  const nonEmpty = groups.filter(([, ts]) => ts.length);

  return (
    <>
      <div className="chips" style={{ marginBottom: 14 }}>
        {(
          [
            ["todo", "To do"],
            ["mine", "Assigned to me"],
            ["done", "Done"],
          ] as const
        ).map(([v, label]) => (
          <button key={v} className="chip" aria-pressed={filter === v} onClick={() => setFilter(v)}>
            {label}
          </button>
        ))}
      </div>
      {nonEmpty.length === 0 ? (
        <Empty
          emoji={filter === "done" ? "🦴" : "🎉"}
          text={filter === "done" ? "Completed tasks will show here." : "Nothing to do. Add recurring care like flea treatment or nail trims."}
        />
      ) : (
        nonEmpty.map(([label, ts]) => (
          <div key={label} style={{ marginBottom: 18 }}>
            <h2 className="small muted" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, ...(label === "Overdue" ? { color: "var(--danger)" } : {}) }}>
              {label} · {ts.length}
            </h2>
            <div className="list">
              {ts.map((t) => (
                <TaskRow key={t.id} task={t} onOpen={() => onOpen(t)} />
              ))}
            </div>
          </div>
        ))
      )}
    </>
  );
}

function NoteList({ onOpen }: { onOpen: (n: Note) => void }) {
  const { data } = useSession();
  const [petId, setPetId] = useState<number | "all">("all");
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const notes = data.notes.filter(
    (n) => (petId === "all" || n.pet_id === petId) && (!query || `${n.title} ${n.body}`.toLowerCase().includes(query)),
  );

  return (
    <>
      <div className="field" style={{ position: "relative", marginBottom: 12 }}>
        <Search size={18} className="muted" style={{ position: "absolute", left: 14, top: 14 }} />
        <input className="input" style={{ paddingLeft: 42 }} placeholder="Search notes" aria-label="Search notes" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {data.pets.length > 1 && (
        <div className="chips" style={{ marginBottom: 14 }}>
          <button className="chip" aria-pressed={petId === "all"} onClick={() => setPetId("all")}>
            All
          </button>
          {data.pets.map((p) => (
            <button key={p.id} className="chip" aria-pressed={petId === p.id} onClick={() => setPetId(p.id)}>
              {p.avatar} {p.name}
            </button>
          ))}
        </div>
      )}
      {notes.length ? (
        <div className="stack">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} onOpen={() => onOpen(n)} />
          ))}
        </div>
      ) : (
        <Empty emoji="📝" text={query ? "No notes match your search." : "Jot down vet advice, house rules, sitter instructions and more."} />
      )}
    </>
  );
}
