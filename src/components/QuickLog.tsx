import { useState } from "react";
import type { ActivityKind } from "../../shared/types.ts";
import { useSession } from "../state.tsx";
import { ACTIVITY_META } from "../lib/meta.ts";
import { ErrorText, Field, Sheet, useSubmit } from "./ui.tsx";

/**
 * Logs one activity per selected dog. Weight is per-dog so it only allows a
 * single selection; everything else defaults to the whole pack.
 */
export function QuickLog({ kind, petId, onClose }: { kind: ActivityKind; petId?: number; onClose: () => void }) {
  const { data, create, toast } = useSession();
  const meta = ACTIVITY_META[kind];
  const single = kind === "weight";
  const [selected, setSelected] = useState<number[]>(() =>
    petId ? [petId] : single ? data.pets.slice(0, 1).map((p) => p.id) : data.pets.map((p) => p.id),
  );
  const [detail, setDetail] = useState("");
  const [value, setValue] = useState("");

  const toggle = (id: number) =>
    setSelected((s) => (single ? [id] : s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const { busy, error, submit } = useSubmit(async () => {
    if (single && !value) throw new Error("Enter a weight");
    const targets: (number | null)[] = data.pets.length === 0 ? [null] : selected;
    if (targets.length === 0) throw new Error("Pick at least one dog");
    for (const pet_id of targets) {
      await create("activities", { kind, pet_id, detail, value: value === "" ? null : Number(value) });
    }
    const names = data.pets.filter((p) => selected.includes(p.id)).map((p) => p.name);
    toast(`${meta.label} logged${names.length ? ` for ${names.join(" & ")}` : ""}`);
    onClose();
  });

  return (
    <Sheet title={`Log ${meta.label.toLowerCase()}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {data.pets.length > 0 && (
          <div className="field">
            <span>{single ? "Which dog?" : "Which dogs?"}</span>
            <div className="chips">
              {data.pets.map((p) => (
                <button type="button" key={p.id} className="chip" aria-pressed={selected.includes(p.id)} onClick={() => toggle(p.id)}>
                  {p.avatar} {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {kind === "walk" && (
          <div className="field" role="group" aria-label="Duration">
            <span>Duration</span>
            <div className="chips">
              {["15", "30", "45", "60"].map((m) => (
                <button type="button" key={m} className="chip" aria-pressed={value === m} onClick={() => setValue(value === m ? "" : m)}>
                  {m} min
                </button>
              ))}
            </div>
          </div>
        )}
        {kind === "weight" && (
          <Field label="Weight (kg)">
            <input className="input" type="number" inputMode="decimal" step="0.1" min="0" required value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        )}
        <Field label="Note (optional)">
          <input
            className="input"
            maxLength={200}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={kind === "meds" ? "Which medication?" : kind === "potty" ? "All good?" : ""}
          />
        </Field>
        <ErrorText error={error} />
        <div className="sheet-actions">
          <button className="btn btn-primary" disabled={busy}>
            <meta.icon size={18} /> {busy ? "Logging…" : `Log ${meta.label.toLowerCase()}`}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
