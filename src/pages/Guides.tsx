import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Phone } from "lucide-react";
import { GUIDES, type Guide } from "../lib/guides.ts";
import { useSession } from "../state.tsx";
import { Empty } from "../components/ui.tsx";

const CATEGORIES = ["All", "Health", "Daily care", "Training", "Family"] as const;

export function GuidesPage() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const guides = GUIDES.filter((g) => cat === "All" || g.category === cat);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Guides</h1>
          <p className="sub">Quick, practical dog-care know-how.</p>
        </div>
      </div>
      <div className="chips" style={{ marginBottom: 14 }}>
        {CATEGORIES.map((c) => (
          <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="list">
        {guides.map((g) => (
          <Link key={g.slug} to={`/guides/${g.slug}`} className="list-item guide-card">
            <span className="emoji" aria-hidden>
              {g.emoji}
            </span>
            <div className="grow">
              <div style={{ fontWeight: 800 }}>{g.title}</div>
              <div className="small muted">{g.summary}</div>
            </div>
            <ChevronRight size={18} className="muted" style={{ alignSelf: "center" }} />
          </Link>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 16 }}>
        These guides are general information, not a substitute for advice from your vet.
      </p>
    </>
  );
}

export function GuideDetailPage() {
  const { slug } = useParams();
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) return <Empty emoji="📚" text="Guide not found." action={<Link to="/guides">Back to guides</Link>} />;
  return <GuideView guide={guide} />;
}

function GuideView({ guide }: { guide: Guide }) {
  const { data } = useSession();
  const vet = data.professionals.find((p) => p.kind === "vet" && p.is_primary) ?? data.professionals.find((p) => p.kind === "vet");
  return (
    <article>
      <Link to="/guides" className="icon-btn" aria-label="Back to guides" style={{ marginBottom: 6 }}>
        <ArrowLeft size={20} />
      </Link>
      <div style={{ fontSize: "2.4rem" }} aria-hidden>
        {guide.emoji}
      </div>
      <h1 style={{ marginTop: 6 }}>{guide.title}</h1>
      <p className="muted" style={{ marginTop: 6, fontWeight: 600 }}>
        {guide.summary}
      </p>

      {guide.callout && (
        <div className={`callout ${guide.callout.tone === "danger" ? "danger" : ""}`}>
          {guide.callout.text}
          {guide.callout.tone === "danger" && vet?.phone && (
            <div style={{ marginTop: 10 }}>
              <a className="btn btn-primary btn-sm" href={`tel:${vet.phone}`}>
                <Phone size={15} /> Call {vet.business || vet.name}
              </a>
            </div>
          )}
        </div>
      )}

      <div className="prose">
        {guide.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.text?.map((t, i) => <p key={i}>{t}</p>)}
            {s.list && (
              <ul>
                {s.list.map((li, i) => (
                  <li key={i}>{li}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 24 }}>
        General information only. Always follow your vet's advice for your dog.
      </p>
    </article>
  );
}
