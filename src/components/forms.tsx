import { useState, type ChangeEvent } from "react";
import { BOOKING_TYPES, PRO_KINDS, type Booking, type Note, type Pet, type Professional, type Task } from "../../shared/types.ts";
import { useSession } from "../state.tsx";
import { BOOKING_META, PET_AVATARS, PRO_META } from "../lib/meta.ts";
import { nowLocalInput, todayStr } from "../lib/format.ts";
import { DeleteButton, ErrorText, Field, Sheet, useSubmit } from "./ui.tsx";

type Values = Record<string, string | boolean>;

function useValues<T extends Values>(initial: T) {
  const [v, setV] = useState<T>(initial);
  const bind = (key: keyof T) => ({
    value: v[key] as string,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setV((prev) => ({ ...prev, [key]: e.target.value })),
  });
  const check = (key: keyof T) => ({
    checked: v[key] as boolean,
    onChange: (e: ChangeEvent<HTMLInputElement>) => setV((prev) => ({ ...prev, [key]: e.target.checked })),
  });
  return { v, setV, bind, check };
}

const idOrNull = (s: string) => (s ? Number(s) : null);
const str = (n: number | null | undefined) => (n == null ? "" : String(n));

interface FormProps<T> {
  initial?: Partial<T> & { id?: number };
  onClose: () => void;
  onSaved?: (row: T) => void;
  onDeleted?: () => void;
}

function Actions({ busy, isEdit, onDelete, saveLabel }: { busy: boolean; isEdit: boolean; onDelete?: () => Promise<void>; saveLabel: string }) {
  return (
    <div className="sheet-actions">
      {isEdit && onDelete && <DeleteButton onConfirm={onDelete} />}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Saving…" : isEdit ? "Save changes" : saveLabel}
      </button>
    </div>
  );
}

function PetSelect({ bind, pets, label = "Pet" }: { bind: ReturnType<ReturnType<typeof useValues>["bind"]>; pets: Pet[]; label?: string }) {
  return (
    <Field label={label}>
      <select className="input" {...bind}>
        <option value="">All / no specific pet</option>
        {pets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.avatar} {p.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

// ---------------------------------------------------------------------------

export function PetForm({ initial, onClose, onSaved, onDeleted }: FormProps<Pet>) {
  const { create, update, remove, toast } = useSession();
  const isEdit = !!initial?.id;
  const { v, setV, bind } = useValues({
    name: initial?.name ?? "",
    breed: initial?.breed ?? "",
    sex: initial?.sex ?? "",
    birthday: initial?.birthday ?? "",
    weight_kg: str(initial?.weight_kg),
    color: initial?.color ?? "",
    microchip: initial?.microchip ?? "",
    food: initial?.food ?? "",
    allergies: initial?.allergies ?? "",
    medications: initial?.medications ?? "",
    notes: initial?.notes ?? "",
    avatar: initial?.avatar ?? "🐶",
  });

  const { busy, error, submit } = useSubmit(async () => {
    const body = { ...v, weight_kg: v.weight_kg === "" ? null : Number(v.weight_kg) };
    const row = isEdit ? await update<Pet>("pets", initial!.id!, body) : await create<Pet>("pets", body);
    toast(isEdit ? "Profile updated" : `Welcome, ${row.name}! 🐾`);
    onSaved?.(row);
    onClose();
  });

  return (
    <Sheet title={isEdit ? `Edit ${initial?.name}` : "Add a dog"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="field">
          <span>Avatar</span>
          <div className="chips" role="radiogroup" aria-label="Avatar">
            {PET_AVATARS.map((a) => (
              <button
                type="button"
                key={a}
                className="chip"
                style={{ fontSize: "1.3rem" }}
                aria-pressed={v.avatar === a}
                onClick={() => setV((p) => ({ ...p, avatar: a }))}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="form-grid">
          <Field label="Name" className="full">
            <input className="input" required maxLength={60} placeholder="e.g. Biscuit" {...bind("name")} />
          </Field>
          <Field label="Breed">
            <input className="input" placeholder="Beagle" {...bind("breed")} />
          </Field>
          <Field label="Sex">
            <select className="input" {...bind("sex")}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>
          <Field label="Birthday">
            <input className="input" type="date" max={todayStr()} {...bind("birthday")} />
          </Field>
          <Field label="Weight (kg)">
            <input className="input" type="number" inputMode="decimal" step="0.1" min="0" {...bind("weight_kg")} />
          </Field>
          <Field label="Colour / markings">
            <input className="input" {...bind("color")} />
          </Field>
          <Field label="Microchip #">
            <input className="input" {...bind("microchip")} />
          </Field>
          <Field label="Food & portions" className="full">
            <input className="input" placeholder="1 cup kibble, twice a day" {...bind("food")} />
          </Field>
          <Field label="Allergies" className="full">
            <input className="input" placeholder="Chicken, flea bites…" {...bind("allergies")} />
          </Field>
          <Field label="Medications" className="full">
            <input className="input" placeholder="Name, dose, schedule" {...bind("medications")} />
          </Field>
          <Field label="Other notes" className="full">
            <textarea className="input" placeholder="Temperament, fears, favourite toys…" {...bind("notes")} />
          </Field>
        </div>
        <ErrorText error={error} />
        <Actions
          busy={busy}
          isEdit={isEdit}
          saveLabel="Add dog"
          onDelete={async () => {
            await remove("pets", initial!.id!);
            toast(`${initial?.name} removed`);
            onClose();
            onDeleted?.();
          }}
        />
      </form>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------

export function TaskForm({ initial, onClose }: FormProps<Task>) {
  const { create, update, remove, toast, data, me } = useSession();
  const isEdit = !!initial?.id;
  const { v, bind } = useValues({
    title: initial?.title ?? "",
    pet_id: str(initial?.pet_id),
    due_date: initial?.due_date ?? (isEdit ? "" : todayStr()),
    due_time: initial?.due_time ?? "",
    repeat: initial?.repeat ?? "none",
    assignee_id: str(initial?.assignee_id),
    notes: initial?.notes ?? "",
  });

  const { busy, error, submit } = useSubmit(async () => {
    const body = { ...v, pet_id: idOrNull(v.pet_id), assignee_id: idOrNull(v.assignee_id) };
    if (isEdit) await update("tasks", initial!.id!, body);
    else await create("tasks", body);
    toast(isEdit ? "Task updated" : "Task added");
    onClose();
  });

  return (
    <Sheet title={isEdit ? "Edit task" : "New task"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="What needs doing?">
          <input className="input" required maxLength={120} placeholder="Give heartworm tablet" {...bind("title")} />
        </Field>
        <div className="form-grid">
          <Field label="Due date">
            <input className="input" type="date" {...bind("due_date")} />
          </Field>
          <Field label="Time">
            <input className="input" type="time" {...bind("due_time")} />
          </Field>
          <Field label="Repeat">
            <select className="input" {...bind("repeat")}>
              <option value="none">Doesn't repeat</option>
              <option value="daily">Every day</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
            </select>
          </Field>
          <Field label="Assign to">
            <select className="input" {...bind("assignee_id")}>
              <option value="">Anyone</option>
              {me.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === me.user.id ? `${m.name} (me)` : m.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <PetSelect bind={bind("pet_id")} pets={data.pets} />
        <Field label="Notes">
          <textarea className="input" {...bind("notes")} />
        </Field>
        {v.repeat !== "none" && !v.due_date && <p className="small muted">Set a due date so the next one can be scheduled automatically.</p>}
        <ErrorText error={error} />
        <Actions
          busy={busy}
          isEdit={isEdit}
          saveLabel="Add task"
          onDelete={async () => {
            await remove("tasks", initial!.id!);
            toast("Task deleted");
            onClose();
          }}
        />
      </form>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------

export function NoteForm({ initial, onClose }: FormProps<Note>) {
  const { create, update, remove, toast, data } = useSession();
  const isEdit = !!initial?.id;
  const { v, bind, check } = useValues({
    title: initial?.title ?? "",
    body: initial?.body ?? "",
    pet_id: str(initial?.pet_id),
    pinned: !!initial?.pinned,
  });

  const { busy, error, submit } = useSubmit(async () => {
    if (!v.title.trim() && !v.body.trim()) throw new Error("Write something first");
    const body = { ...v, pet_id: idOrNull(v.pet_id) };
    if (isEdit) await update("notes", initial!.id!, body);
    else await create("notes", body);
    toast(isEdit ? "Note saved" : "Note added");
    onClose();
  });

  return (
    <Sheet title={isEdit ? "Edit note" : "New note"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Title">
          <input className="input" maxLength={120} placeholder="What the vet said" {...bind("title")} />
        </Field>
        <Field label="Note">
          <textarea className="input" rows={6} {...bind("body")} />
        </Field>
        <PetSelect bind={bind("pet_id")} pets={data.pets} />
        <label className="check">
          <input type="checkbox" {...check("pinned")} /> Pin to top
        </label>
        <ErrorText error={error} />
        <Actions
          busy={busy}
          isEdit={isEdit}
          saveLabel="Save note"
          onDelete={async () => {
            await remove("notes", initial!.id!);
            toast("Note deleted");
            onClose();
          }}
        />
      </form>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------

export function BookingForm({ initial, onClose }: FormProps<Booking>) {
  const { create, update, remove, toast, data } = useSession();
  const isEdit = !!initial?.id;
  const defaultStart = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return nowLocalInput(d);
  };
  const { v, setV, bind } = useValues({
    title: initial?.title ?? "",
    type: initial?.type ?? "vet",
    pet_id: str(initial?.pet_id),
    professional_id: str(initial?.professional_id),
    starts_at: initial?.starts_at ?? defaultStart(),
    ends_at: initial?.ends_at ?? "",
    location: initial?.location ?? "",
    notes: initial?.notes ?? "",
    status: initial?.status ?? "upcoming",
  });

  const onPro = (e: ChangeEvent<HTMLSelectElement>) => {
    const pro = data.professionals.find((p) => p.id === Number(e.target.value));
    setV((prev) => ({
      ...prev,
      professional_id: e.target.value,
      // Prefill from the professional's record when fields are still blank.
      location: prev.location || pro?.address || "",
      type: pro && !isEdit ? PRO_META[pro.kind].booking : prev.type,
      title: prev.title || (pro ? `${BOOKING_META[PRO_META[pro.kind].booking].label} – ${pro.business || pro.name}` : ""),
    }));
  };

  const { busy, error, submit } = useSubmit(async () => {
    if (v.ends_at && v.ends_at < v.starts_at) throw new Error("End time is before the start");
    const body = { ...v, pet_id: idOrNull(v.pet_id), professional_id: idOrNull(v.professional_id) };
    if (isEdit) await update("bookings", initial!.id!, body);
    else await create("bookings", body);
    toast(isEdit ? "Booking updated" : "Booking added");
    onClose();
  });

  return (
    <Sheet title={isEdit ? "Edit booking" : "New booking"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Professional">
          <select className="input" value={v.professional_id} onChange={onPro}>
            <option value="">None</option>
            {data.professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.business ? ` · ${p.business}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-grid">
          <Field label="Type">
            <select className="input" {...bind("type")}>
              {BOOKING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BOOKING_META[t].label}
                </option>
              ))}
            </select>
          </Field>
          <PetSelect bind={bind("pet_id")} pets={data.pets} />
          <Field label="Title" className="full">
            <input className="input" required maxLength={120} placeholder="Annual vaccination" {...bind("title")} />
          </Field>
          <Field label="Starts">
            <input className="input" type="datetime-local" required {...bind("starts_at")} />
          </Field>
          <Field label="Ends">
            <input className="input" type="datetime-local" min={v.starts_at} {...bind("ends_at")} />
          </Field>
          <Field label="Location" className="full">
            <input className="input" {...bind("location")} />
          </Field>
          {isEdit && (
            <Field label="Status" className="full">
              <select className="input" {...bind("status")}>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
          )}
          <Field label="Notes" className="full">
            <textarea className="input" placeholder="Bring vaccination card, fast from 8pm…" {...bind("notes")} />
          </Field>
        </div>
        <ErrorText error={error} />
        <Actions
          busy={busy}
          isEdit={isEdit}
          saveLabel="Add booking"
          onDelete={async () => {
            await remove("bookings", initial!.id!);
            toast("Booking deleted");
            onClose();
          }}
        />
      </form>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------

export function ProForm({ initial, onClose }: FormProps<Professional>) {
  const { create, update, remove, toast } = useSession();
  const isEdit = !!initial?.id;
  const { v, bind, check } = useValues({
    kind: initial?.kind ?? "vet",
    name: initial?.name ?? "",
    business: initial?.business ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    address: initial?.address ?? "",
    website: initial?.website ?? "",
    notes: initial?.notes ?? "",
    is_primary: !!initial?.is_primary,
  });

  const { busy, error, submit } = useSubmit(async () => {
    if (isEdit) await update("professionals", initial!.id!, v);
    else await create("professionals", v);
    toast(isEdit ? "Contact updated" : "Contact added");
    onClose();
  });

  return (
    <Sheet title={isEdit ? "Edit contact" : "Add a professional"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Type">
            <select className="input" {...bind("kind")}>
              {PRO_KINDS.map((k) => (
                <option key={k} value={k}>
                  {PRO_META[k].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name">
            <input className="input" required maxLength={100} placeholder="Dr. Rivera" {...bind("name")} />
          </Field>
          <Field label="Clinic / business" className="full">
            <input className="input" placeholder="Happy Paws Veterinary" {...bind("business")} />
          </Field>
          <Field label="Phone">
            <input className="input" type="tel" inputMode="tel" {...bind("phone")} />
          </Field>
          <Field label="Email">
            <input className="input" type="email" {...bind("email")} />
          </Field>
          <Field label="Address" className="full">
            <input className="input" {...bind("address")} />
          </Field>
          <Field label="Website" className="full">
            <input className="input" type="url" placeholder="https://" {...bind("website")} />
          </Field>
          <Field label="Notes" className="full">
            <textarea className="input" placeholder="Opening hours, after-hours number, rates…" {...bind("notes")} />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" {...check("is_primary")} /> This is my go-to {PRO_META[v.kind as keyof typeof PRO_META].label.toLowerCase()}
        </label>
        <ErrorText error={error} />
        <Actions
          busy={busy}
          isEdit={isEdit}
          saveLabel="Add contact"
          onDelete={async () => {
            await remove("professionals", initial!.id!);
            toast("Contact removed");
            onClose();
          }}
        />
      </form>
    </Sheet>
  );
}
