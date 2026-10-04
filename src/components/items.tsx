import { Check, Pin, Repeat } from "lucide-react";
import type { Activity, Booking, Note, Task } from "../../shared/types.ts";
import { useSession } from "../state.tsx";
import { ACTIVITY_META, BOOKING_META, toneStyle } from "../lib/meta.ts";
import { firstName, friendlyDate, friendlyTime, parseLocal, parseUtc, timeAgo, todayStr } from "../lib/format.ts";
import { PersonBadge } from "./ui.tsx";

function usePeople() {
  const { data, me } = useSession();
  return {
    pet: (id: number | null) => data.pets.find((p) => p.id === id),
    member: (id: number | null) => me.members.find((m) => m.id === id),
    pro: (id: number | null) => data.professionals.find((p) => p.id === id),
    meId: me.user.id,
  };
}

export function TaskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { toggleTask } = useSession();
  const { pet, member, meId } = usePeople();
  const p = pet(task.pet_id);
  const assignee = member(task.assignee_id);
  const doneBy = member(task.done_by);
  const overdue = !task.done_at && task.due_date && task.due_date < todayStr();
  const done = !!task.done_at;

  return (
    <div className="list-item">
      <button
        className={`task-check ${done ? "done" : ""}`}
        onClick={() => toggleTask(task.id)}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        aria-pressed={done}
      >
        <Check size={16} strokeWidth={3} />
      </button>
      <button className="grow" style={{ all: "unset", flex: 1, minWidth: 0, cursor: "pointer" }} onClick={onOpen}>
        <div className={`task-title ellipsis ${done ? "done" : ""}`} style={{ fontWeight: 700 }}>
          {task.title}
        </div>
        <div className="small muted row" style={{ gap: 6, flexWrap: "wrap", marginTop: 2 }}>
          {p && (
            <span>
              {p.avatar} {p.name}
            </span>
          )}
          {task.due_date && (
            <span className={overdue ? "overdue" : ""}>
              {overdue ? "Overdue · " : ""}
              {friendlyDate(task.due_date)}
              {task.due_time && ` ${friendlyTime(task.due_time)}`}
            </span>
          )}
          {task.repeat !== "none" && (
            <span className="row" style={{ gap: 3 }}>
              <Repeat size={12} /> {task.repeat}
            </span>
          )}
          {done && doneBy && <span>Done by {doneBy.id === meId ? "you" : firstName(doneBy.name)}</span>}
        </div>
      </button>
      {assignee && !done && <PersonBadge member={assignee} small />}
    </div>
  );
}

export function BookingRow({ booking, onOpen }: { booking: Booking; onOpen: () => void }) {
  const { pet, pro } = usePeople();
  const meta = BOOKING_META[booking.type];
  const d = parseLocal(booking.starts_at);
  const p = pet(booking.pet_id);
  const professional = pro(booking.professional_id);
  const [date, time] = booking.starts_at.split("T");

  return (
    <button className="list-item" onClick={onOpen}>
      <div className="date-badge" style={booking.status === "cancelled" ? { opacity: 0.5 } : toneStyle(meta.tone)}>
        <span className="m">{d.toLocaleDateString(undefined, { month: "short" })}</span>
        <span className="d">{d.getDate()}</span>
      </div>
      <div className="grow">
        <div className="ellipsis" style={{ fontWeight: 800, textDecoration: booking.status === "cancelled" ? "line-through" : undefined }}>
          {booking.title}
        </div>
        <div className="small muted ellipsis">
          {friendlyDate(date)} · {friendlyTime(time)}
          {professional && ` · ${professional.business || professional.name}`}
        </div>
        <div className="row" style={{ gap: 6, marginTop: 4 }}>
          <span className="tag" style={toneStyle(meta.tone)}>
            <meta.icon size={12} /> {meta.label}
          </span>
          {p && (
            <span className="tag">
              {p.avatar} {p.name}
            </span>
          )}
          {booking.status !== "upcoming" && <span className={`tag ${booking.status === "completed" ? "sage" : "danger"}`}>{booking.status}</span>}
        </div>
      </div>
    </button>
  );
}

export function ActivityRow({ activity }: { activity: Activity }) {
  const { pet, member, meId } = usePeople();
  const meta = ACTIVITY_META[activity.kind];
  const p = pet(activity.pet_id);
  const who = member(activity.created_by);
  const whoName = who ? (who.id === meId ? "You" : firstName(who.name)) : "Someone";
  const value =
    activity.value == null ? "" : activity.kind === "weight" ? ` · ${activity.value} kg` : activity.kind === "walk" ? ` · ${activity.value} min` : "";

  return (
    <div className="timeline-item">
      <span className="timeline-ico" style={toneStyle(meta.tone)}>
        <meta.icon size={17} />
      </span>
      <div className="grow">
        <div style={{ fontWeight: 700 }}>
          {whoName} {meta.verb} {p ? p.name : "the pack"}
          <span className="muted" style={{ fontWeight: 600 }}>
            {value}
          </span>
        </div>
        {activity.detail && <div className="small muted">{activity.detail}</div>}
      </div>
      <span className="small muted" style={{ whiteSpace: "nowrap" }}>
        {timeAgo(parseUtc(activity.created_at))}
      </span>
    </div>
  );
}

export function NoteCard({ note, onOpen }: { note: Note; onOpen: () => void }) {
  const { pet, member, meId } = usePeople();
  const p = pet(note.pet_id);
  const author = member(note.created_by);
  return (
    <button className="card tight" style={{ textAlign: "left", width: "100%" }} onClick={onOpen}>
      <div className="row">
        <h3 className="grow ellipsis">{note.title || note.body.split("\n")[0]}</h3>
        {!!note.pinned && <Pin size={15} className="muted" aria-label="Pinned" />}
      </div>
      {note.title && note.body && <p className="note-body note-card">{note.body}</p>}
      <div className="small muted row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {p && (
          <span className="tag">
            {p.avatar} {p.name}
          </span>
        )}
        <span>
          {author ? (author.id === meId ? "You" : firstName(author.name)) : "Someone"} · {timeAgo(parseUtc(note.updated_at))}
        </span>
      </div>
    </button>
  );
}
