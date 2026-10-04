import { Link } from "react-router-dom";
import { BookOpen, ChevronRight, StickyNote, Stethoscope, Users } from "lucide-react";
import { useSession } from "../state.tsx";
import { toneStyle } from "../lib/meta.ts";
import { SignOutButton } from "./Family.tsx";

export function MorePage() {
  const { me, data } = useSession();
  const vet = data.professionals.find((p) => p.kind === "vet" && p.is_primary);
  const items = [
    { to: "/pros", label: "Professionals", sub: vet ? `My Vet: ${vet.business || vet.name}` : "My Vet, groomers, walkers, sitters", icon: Stethoscope, tone: "danger" as const },
    { to: "/guides", label: "Guides", sub: "Emergencies, toxic foods, feeding, training…", icon: BookOpen, tone: "sky" as const },
    { to: "/family", label: "Family & sharing", sub: `${me.household.name} · ${me.members.length} member${me.members.length > 1 ? "s" : ""}`, icon: Users, tone: "sage" as const },
    { to: "/tasks?tab=notes", label: "Notes", sub: `${data.notes.length} shared note${data.notes.length === 1 ? "" : "s"}`, icon: StickyNote, tone: "sun" as const },
  ];
  return (
    <>
      <div className="page-head">
        <h1>More</h1>
      </div>
      <div className="list">
        {items.map(({ to, label, sub, icon: Icon, tone }) => (
          <Link key={to} to={to} className="list-item">
            <span className="avatar" style={toneStyle(tone)}>
              <Icon size={20} />
            </span>
            <div className="grow">
              <div style={{ fontWeight: 800 }}>{label}</div>
              <div className="small muted ellipsis">{sub}</div>
            </div>
            <ChevronRight size={18} className="muted" />
          </Link>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <SignOutButton />
      </div>
      <p className="small muted" style={{ marginTop: 24, textAlign: "center" }}>
        Signed in as {me.user.email}
      </p>
    </>
  );
}
