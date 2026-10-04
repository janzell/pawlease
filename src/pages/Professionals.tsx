import { useState } from "react";
import { CalendarPlus, Globe, Mail, MapPin, Pencil, Phone, Plus, Star } from "lucide-react";
import { PRO_KINDS, type Professional } from "../../shared/types.ts";
import { useSession } from "../state.tsx";
import { PRO_META, toneStyle } from "../lib/meta.ts";
import { BookingForm, ProForm } from "../components/forms.tsx";
import { Empty } from "../components/ui.tsx";

export function ProfessionalsPage() {
  const { data } = useSession();
  const [sheet, setSheet] = useState<null | "new" | { edit: Professional } | { book: Professional }>(null);

  const myVet = data.professionals.find((p) => p.kind === "vet" && p.is_primary);
  const others = data.professionals.filter((p) => p !== myVet);
  const byKind = PRO_KINDS.map((k) => [k, others.filter((p) => p.kind === k)] as const).filter(([, ps]) => ps.length);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Professionals</h1>
          <p className="sub">Your vet and everyone else who helps care for your dogs.</p>
        </div>
      </div>

      <section>
        <div className="section-head">
          <h2>My Vet</h2>
        </div>
        {myVet ? (
          <ProCard pro={myVet} featured onEdit={() => setSheet({ edit: myVet })} onBook={() => setSheet({ book: myVet })} />
        ) : (
          <Empty
            emoji="🩺"
            text={
              data.professionals.some((p) => p.kind === "vet")
                ? "Mark one of your vets as your go-to so it's one tap away in an emergency."
                : "Save your vet so anyone in the family can call them in one tap."
            }
            action={
              <button className="btn btn-primary" onClick={() => setSheet("new")}>
                <Plus size={18} /> Add my vet
              </button>
            }
          />
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>My Professionals</h2>
          <button className="link-btn" onClick={() => setSheet("new")}>
            + Add
          </button>
        </div>
        {byKind.length === 0 ? (
          <Empty emoji="✂️" text="Add your groomer, dog walker, sitter, trainer or daycare." />
        ) : (
          byKind.map(([kind, ps]) => (
            <div key={kind} style={{ marginBottom: 18 }}>
              <h3 className="small muted" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                {PRO_META[kind].plural}
              </h3>
              <div className="stack">
                {ps.map((p) => (
                  <ProCard key={p.id} pro={p} onEdit={() => setSheet({ edit: p })} onBook={() => setSheet({ book: p })} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <button className="fab" aria-label="Add professional" onClick={() => setSheet("new")}>
        <Plus size={26} />
      </button>

      {sheet === "new" && <ProForm initial={{ is_primary: myVet ? 0 : 1 }} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === "object" && "edit" in sheet && <ProForm initial={sheet.edit} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === "object" && "book" in sheet && (
        <BookingForm
          initial={{
            professional_id: sheet.book.id,
            type: PRO_META[sheet.book.kind].booking,
            location: sheet.book.address,
            title: `${PRO_META[sheet.book.kind].label} – ${sheet.book.business || sheet.book.name}`,
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

function ProCard({ pro, featured, onEdit, onBook }: { pro: Professional; featured?: boolean; onEdit: () => void; onBook: () => void }) {
  const meta = PRO_META[pro.kind];
  const website = pro.website && (/^https?:\/\//.test(pro.website) ? pro.website : `https://${pro.website}`);
  return (
    <div className={`card pro-card ${featured ? "featured" : ""}`}>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <span className="avatar" style={toneStyle(meta.tone)}>
          <meta.icon size={22} />
        </span>
        <div className="grow">
          <div className="row" style={{ gap: 6 }}>
            <h3 className="ellipsis">{pro.name}</h3>
            {!!pro.is_primary && <Star size={15} fill="currentColor" style={{ color: "var(--sun)" }} aria-label="Go-to" />}
          </div>
          <div className="small muted">{[pro.business, meta.label].filter(Boolean).join(" · ")}</div>
          {pro.address && <div className="small" style={{ marginTop: 4 }}>{pro.address}</div>}
          {pro.notes && (
            <div className="small muted" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>
              {pro.notes}
            </div>
          )}
        </div>
        <button className="icon-btn" onClick={onEdit} aria-label={`Edit ${pro.name}`}>
          <Pencil size={17} />
        </button>
      </div>
      <div className="pro-actions">
        {pro.phone && (
          <a className={`btn btn-sm ${featured ? "btn-primary" : "btn-secondary"}`} href={`tel:${pro.phone}`}>
            <Phone size={15} /> Call
          </a>
        )}
        {pro.email && (
          <a className="btn btn-secondary btn-sm" href={`mailto:${pro.email}`}>
            <Mail size={15} /> Email
          </a>
        )}
        {pro.address && (
          <a className="btn btn-secondary btn-sm" href={`https://maps.google.com/?q=${encodeURIComponent(pro.address)}`} target="_blank" rel="noreferrer">
            <MapPin size={15} /> Map
          </a>
        )}
        {website && (
          <a className="btn btn-secondary btn-sm" href={website} target="_blank" rel="noreferrer">
            <Globe size={15} /> Website
          </a>
        )}
        <button className="btn btn-secondary btn-sm" onClick={onBook}>
          <CalendarPlus size={15} /> Book
        </button>
      </div>
    </div>
  );
}
