import { useState } from "react";
import { CalendarPlus, Check, MapPin, Pencil, Phone, Plus, X } from "lucide-react";
import type { Booking } from "../../shared/types.ts";
import { useSession } from "../state.tsx";
import { BOOKING_META, toneStyle } from "../lib/meta.ts";
import { friendlyDateTime, nowLocalInput, todayStr } from "../lib/format.ts";
import { downloadIcs } from "../lib/ics.ts";
import { BookingForm } from "../components/forms.tsx";
import { BookingRow } from "../components/items.tsx";
import { Empty, Segmented, Sheet } from "../components/ui.tsx";

type Tab = "upcoming" | "past";

export function BookingsPage() {
  const { data } = useSession();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [sheet, setSheet] = useState<null | "new" | { view: Booking } | { edit: Booking }>(null);

  const today = todayStr();
  const isUpcoming = (b: Booking) => b.status === "upcoming" && b.starts_at.slice(0, 10) >= today;
  const list = tab === "upcoming" ? data.bookings.filter(isUpcoming) : data.bookings.filter((b) => !isUpcoming(b)).reverse();

  // Group upcoming bookings by month for easier scanning.
  const groups = new Map<string, Booking[]>();
  for (const b of list) {
    const key = new Date(b.starts_at).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bookings</h1>
          <p className="sub">Vet visits, grooming, walkers, daycare and boarding.</p>
        </div>
      </div>
      <Segmented<Tab>
        label="Booking timeframe"
        value={tab}
        onChange={setTab}
        options={[
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past & cancelled" },
        ]}
      />
      {list.length === 0 ? (
        <Empty
          emoji="📅"
          text={tab === "upcoming" ? "No upcoming bookings. Add your next vet visit or grooming appointment." : "Past bookings will appear here."}
          action={
            tab === "upcoming" && (
              <button className="btn btn-primary" onClick={() => setSheet("new")}>
                <Plus size={18} /> Add booking
              </button>
            )
          }
        />
      ) : (
        [...groups].map(([month, bs]) => (
          <div key={month} style={{ marginBottom: 18 }}>
            <h2 className="small muted" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              {month}
            </h2>
            <div className="list">
              {bs.map((b) => (
                <BookingRow key={b.id} booking={b} onOpen={() => setSheet({ view: b })} />
              ))}
            </div>
          </div>
        ))
      )}

      <button className="fab" aria-label="Add booking" onClick={() => setSheet("new")}>
        <Plus size={26} />
      </button>

      {sheet === "new" && <BookingForm onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === "object" && "view" in sheet && (
        <BookingDetail booking={sheet.view} onClose={() => setSheet(null)} onEdit={() => setSheet({ edit: sheet.view })} />
      )}
      {sheet && typeof sheet === "object" && "edit" in sheet && <BookingForm initial={sheet.edit} onClose={() => setSheet(null)} />}
    </>
  );
}

function BookingDetail({ booking, onClose, onEdit }: { booking: Booking; onClose: () => void; onEdit: () => void }) {
  const { data, update, toast } = useSession();
  // Read the live copy so status changes reflect immediately.
  const b = data.bookings.find((x) => x.id === booking.id) ?? booking;
  const meta = BOOKING_META[b.type];
  const pet = data.pets.find((p) => p.id === b.pet_id);
  const pro = data.professionals.find((p) => p.id === b.professional_id);
  const past = b.starts_at < nowLocalInput();

  const setStatus = async (status: Booking["status"]) => {
    await update("bookings", b.id, { status });
    toast(status === "completed" ? "Marked as done" : status === "cancelled" ? "Booking cancelled" : "Booking restored");
  };

  return (
    <Sheet title={b.title} onClose={onClose}>
      <div className="stack">
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <span className="tag" style={toneStyle(meta.tone)}>
            <meta.icon size={12} /> {meta.label}
          </span>
          {pet && (
            <span className="tag">
              {pet.avatar} {pet.name}
            </span>
          )}
          {b.status !== "upcoming" && <span className={`tag ${b.status === "completed" ? "sage" : "danger"}`}>{b.status}</span>}
        </div>
        <div className="card flat">
          <div className="kv">
            <div className="full">
              <div className="k">When</div>
              <div className="v">
                {friendlyDateTime(b.starts_at)}
                {b.ends_at && ` – ${friendlyDateTime(b.ends_at)}`}
              </div>
            </div>
            {pro && (
              <div className="full">
                <div className="k">With</div>
                <div className="v">
                  {pro.name}
                  {pro.business && <span className="muted"> · {pro.business}</span>}
                </div>
              </div>
            )}
            {b.location && (
              <div className="full">
                <div className="k">Where</div>
                <div className="v">{b.location}</div>
              </div>
            )}
            {b.notes && (
              <div className="full">
                <div className="k">Notes</div>
                <div className="v" style={{ fontWeight: 600, whiteSpace: "pre-wrap" }}>
                  {b.notes}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="pro-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => downloadIcs(b, { petName: pet?.name, proName: pro?.business || pro?.name })}>
            <CalendarPlus size={16} /> Add to calendar
          </button>
          {b.location && (
            <a className="btn btn-secondary btn-sm" href={`https://maps.google.com/?q=${encodeURIComponent(b.location)}`} target="_blank" rel="noreferrer">
              <MapPin size={16} /> Directions
            </a>
          )}
          {pro?.phone && (
            <a className="btn btn-secondary btn-sm" href={`tel:${pro.phone}`}>
              <Phone size={16} /> Call
            </a>
          )}
        </div>
        <div className="sheet-actions">
          {b.status === "upcoming" ? (
            <>
              <button className="btn btn-danger" onClick={() => setStatus("cancelled")}>
                <X size={16} /> Cancel
              </button>
              {past && (
                <button className="btn btn-secondary" onClick={() => setStatus("completed")}>
                  <Check size={16} /> Done
                </button>
              )}
            </>
          ) : (
            <button className="btn btn-secondary" onClick={() => setStatus("upcoming")}>
              Restore
            </button>
          )}
          <button className="btn btn-primary" onClick={onEdit}>
            <Pencil size={16} /> Edit
          </button>
        </div>
      </div>
    </Sheet>
  );
}
