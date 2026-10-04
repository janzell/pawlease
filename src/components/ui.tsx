import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import type { Member, Pet } from "../../shared/types.ts";
import { initials } from "../lib/format.ts";

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("input, textarea, select, button:not(.icon-btn)")?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`field ${className ?? ""}`}>
      <span>{label}</span>
      {children}
      {hint && <small className="hint">{hint}</small>}
    </label>
  );
}

export function Empty({ emoji, text, action }: { emoji: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="emoji" aria-hidden>
        {emoji}
      </span>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function PetAvatar({ pet, size }: { pet?: Pick<Pet, "avatar" | "name"> | null; size?: "sm" | "lg" }) {
  return (
    <span className={`avatar ${size ?? ""}`} aria-hidden>
      {pet?.avatar || "🐾"}
    </span>
  );
}

export function PersonBadge({ member, small }: { member?: Pick<Member, "name"> | null; small?: boolean }) {
  if (!member) return null;
  return (
    <span className={`person ${small ? "sm" : ""}`} title={member.name} aria-label={member.name}>
      {initials(member.name)}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <div className="error" role="alert">
      {error}
    </div>
  ) : null;
}

/** Handles the submitting/error dance shared by every form. */
export function useSubmit(fn: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e?: { preventDefault: () => void }) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

/** A delete button that asks for a second tap instead of a blocking confirm(). */
export function DeleteButton({ onConfirm, label = "Delete" }: { onConfirm: () => Promise<void> | void; label?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" className="btn btn-danger" onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? "Tap to confirm" : label}
    </button>
  );
}
