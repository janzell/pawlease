import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Copy, Crown, LogOut, RefreshCw, Share2 } from "lucide-react";
import { api } from "../api.ts";
import type { Me } from "../../shared/types.ts";
import { useSession } from "../state.tsx";
import { parseUtc } from "../lib/format.ts";
import { DeleteButton, ErrorText, Field, PersonBadge, Sheet, useSubmit } from "../components/ui.tsx";

export function FamilyPage() {
  const { me, setMe, toast, reloadMe } = useSession();
  const [sheet, setSheet] = useState<null | "join" | "create" | "rename" | "profile">(null);
  const isOwner = me.household.role === "owner";
  const inviteUrl = `${location.origin}/join/${me.household.invite_code}`;
  const [copied, setCopied] = useState(false);

  const shareInvite = async () => {
    const text = `Join "${me.household.name}" on Pawlease to help look after our dogs 🐾`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Pawlease invite", text, url: inviteUrl });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${inviteUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast("Invite link copied");
    } catch {
      /* cancelled */
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(me.household.invite_code);
      toast("Code copied");
    } catch {
      /* clipboard unavailable */
    }
  };

  const rotate = async () => {
    setMe(await api<Me>("POST", "/household/invite"));
    toast("New invite code created. The old one no longer works.");
  };

  const removeMember = async (id: number) => {
    if (id === me.user.id) {
      await api("DELETE", `/household/members/${id}`);
      await reloadMe();
      toast("You left the household");
    } else {
      setMe(await api<Me>("DELETE", `/household/members/${id}`));
      toast("Member removed");
    }
  };

  const switchTo = async (id: number) => {
    setMe(await api<Me>("POST", "/households/switch", { id }));
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Family</h1>
          <p className="sub">Everyone here can see and update your dogs, tasks and bookings.</p>
        </div>
      </div>

      <section className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="grow">
            <div className="small muted" style={{ fontWeight: 800 }}>
              HOUSEHOLD
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem" }}>{me.household.name}</h2>
          </div>
          {isOwner && (
            <button className="btn btn-ghost btn-sm" onClick={() => setSheet("rename")}>
              Rename
            </button>
          )}
        </div>

        <div className="section" style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 8 }}>Invite family</h3>
          <p className="small muted" style={{ marginBottom: 12 }}>
            Send the link, or have them enter this code when they sign up.
          </p>
          <div className="code-box">
            <span>{me.household.invite_code}</span>
            <button className="icon-btn" onClick={copyCode} aria-label="Copy code">
              <Copy size={18} />
            </button>
          </div>
          <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn btn-primary grow" onClick={shareInvite}>
              {copied ? <Check size={18} /> : <Share2 size={18} />} Share invite link
            </button>
            {isOwner && (
              <button className="btn btn-secondary" onClick={rotate} title="Create a new code and disable the old one">
                <RefreshCw size={16} /> New code
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Members · {me.members.length}</h2>
        </div>
        <div className="list">
          {me.members.map((m) => (
            <div key={m.id} className="list-item">
              <PersonBadge member={m} />
              <div className="grow">
                <div className="row" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 800 }}>
                    {m.name}
                    {m.id === me.user.id && " (you)"}
                  </span>
                  {m.role === "owner" && <Crown size={14} style={{ color: "var(--sun)" }} aria-label="Owner" />}
                </div>
                <div className="small muted ellipsis">
                  {m.email} · joined {parseUtc(m.joined_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </div>
              </div>
              {isOwner && m.id !== me.user.id && <DeleteButton label="Remove" onConfirm={() => removeMember(m.id)} />}
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Your households</h2>
        </div>
        <div className="list">
          {me.households.map((h) => (
            <button key={h.id} className="list-item" onClick={() => h.id !== me.household.id && switchTo(h.id)}>
              <span className="grow" style={{ fontWeight: 700 }}>
                {h.name}
              </span>
              {h.id === me.household.id ? <span className="tag sage">Current</span> : <span className="small muted">Switch</span>}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={() => setSheet("join")}>
            Join with a code
          </button>
          <button className="btn btn-secondary" onClick={() => setSheet("create")}>
            New household
          </button>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Your account</h2>
        </div>
        <div className="list">
          <button className="list-item" onClick={() => setSheet("profile")}>
            <PersonBadge member={me.user} />
            <div className="grow">
              <div style={{ fontWeight: 800 }}>{me.user.name}</div>
              <div className="small muted">{me.user.email}</div>
            </div>
            <span className="small muted">Edit</span>
          </button>
        </div>
        <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
          {(me.members.length > 1 || me.households.length > 1) && <DeleteButton label="Leave this household" onConfirm={() => removeMember(me.user.id)} />}
          <SignOutButton />
        </div>
      </section>

      {sheet === "join" && <JoinSheet onClose={() => setSheet(null)} />}
      {sheet === "create" && <NameSheet title="New household" label="Household name" endpoint="POST /households" onClose={() => setSheet(null)} />}
      {sheet === "rename" && <NameSheet title="Rename household" label="Household name" initial={me.household.name} endpoint="PATCH /household" onClose={() => setSheet(null)} />}
      {sheet === "profile" && <NameSheet title="Your name" label="Name" initial={me.user.name} endpoint="PATCH /me" onClose={() => setSheet(null)} />}
    </>
  );
}

export function SignOutButton() {
  const { setMe } = useSession();
  return (
    <button
      className="btn btn-secondary"
      onClick={async () => {
        await api("POST", "/auth/logout");
        setMe(null);
      }}
    >
      <LogOut size={16} /> Sign out
    </button>
  );
}

function NameSheet({ title, label, initial = "", endpoint, onClose }: { title: string; label: string; initial?: string; endpoint: string; onClose: () => void }) {
  const { setMe, toast } = useSession();
  const [name, setName] = useState(initial);
  const [method, path] = endpoint.split(" ");
  const { busy, error, submit } = useSubmit(async () => {
    setMe(await api<Me>(method, path, { name }));
    toast("Saved");
    onClose();
  });
  return (
    <Sheet title={title} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label={label}>
          <input className="input" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <ErrorText error={error} />
        <div className="sheet-actions">
          <button className="btn btn-primary" disabled={busy}>
            Save
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function JoinSheet({ onClose }: { onClose: () => void }) {
  const { setMe, toast } = useSession();
  const [code, setCode] = useState("");
  const { busy, error, submit } = useSubmit(async () => {
    const me = await api<Me>("POST", "/households/join", { code });
    setMe(me);
    toast(`Welcome to ${me.household.name}! 🐾`);
    onClose();
  });
  return (
    <Sheet title="Join a household" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Invite code" hint="Ask a family member for the code on their Family page.">
          <input
            className="input"
            required
            autoCapitalize="characters"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
          />
        </Field>
        <ErrorText error={error} />
        <div className="sheet-actions">
          <button className="btn btn-primary" disabled={busy}>
            Join
          </button>
        </div>
      </form>
    </Sheet>
  );
}

/** Signed-in users who open an invite link land here. */
export function JoinPage() {
  const { code = "" } = useParams();
  const { me, setMe, toast } = useSession();
  const navigate = useNavigate();
  const member = me.households.find((h) => h.invite_code === code.toUpperCase());

  useEffect(() => {
    if (member && member.id === me.household.id) navigate("/", { replace: true });
  }, [member, me.household.id, navigate]);

  const { busy, error, submit } = useSubmit(async () => {
    // Already a member of another household: joining just switches to it.
    const next = await api<Me>("POST", "/households/join", { code });
    setMe(next);
    toast(member ? `Switched to ${next.household.name}` : `Welcome to ${next.household.name}! 🐾`);
    navigate("/", { replace: true });
  });
  return (
    <div style={{ maxWidth: 440, margin: "10vh auto 0", textAlign: "center" }}>
      <div style={{ fontSize: "3rem" }}>🏡</div>
      <h1 style={{ marginTop: 8 }}>{member ? `You're already in ${member.name}` : "Join a household?"}</h1>
      <p className="muted" style={{ margin: "10px 0 20px" }}>
        {member
          ? "Switch to it now? You can change households anytime from the Family page."
          : `You've been invited to share dog care on Pawlease. You'll keep access to ${me.household.name} too and can switch between them anytime.`}
      </p>
      <ErrorText error={error} />
      <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
        <button className="btn btn-secondary" onClick={() => navigate("/")}>
          Not now
        </button>
        <button className="btn btn-primary" disabled={busy} onClick={() => submit()}>
          {member ? "Switch" : "Join household"}
        </button>
      </div>
    </div>
  );
}
