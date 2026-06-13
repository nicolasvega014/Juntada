"use client";
import { useCallback, useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { getPasswordStrength } from "@/lib/password";

const P = {
  bg: "#0f0e17", card: "#1a1825", card2: "#221f30",
  accent: "#ff6b35", accent2: "#ffd166", green: "#06d6a0",
  text: "#fffffe", muted: "#a7a9be", border: "#2a2840", red: "#ff6b6b",
};

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const AVATARS = ["🐻", "🦊", "🐺", "🦁", "🐯", "🐸", "🐼", "🦅", "🦋", "🐬", "🦖", "🐲", "🌈", "⚡", "🌙", "🔥", "🎯", "👾", "🎸", "🚀"];
const EMOJIS_GROUP = ["🍕", "🔥", "🍻", "🎉", "🍔", "🌮", "🍜", "🎮", "🎵", "⚽", "🏖️", "🎂", "🍣", "🥩", "☕"];

const inp: React.CSSProperties = { width: "100%", background: P.card2, border: `1px solid ${P.border}`, borderRadius: 12, padding: "12px 14px", color: P.text, fontSize: 15, fontFamily: "'Syne', sans-serif", outline: "none", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "block", fontSize: 11, color: P.muted, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 };
const primBtn = (full?: boolean): React.CSSProperties => ({ background: P.accent, color: "#fff", border: "none", borderRadius: 12, padding: full ? "14px" : "10px 20px", width: full ? "100%" : "auto", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: full ? 16 : 14 });
const ghostBtn: React.CSSProperties = { background: "transparent", color: P.accent, border: `1px solid ${P.accent}`, borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13 };
const iconBtn: React.CSSProperties = { background: "transparent", border: "none", color: P.text, cursor: "pointer", fontSize: 18, padding: "4px 8px", fontFamily: "'Syne', sans-serif" };

type User = { id: string; name: string; avatar: string; alias?: string | null };
type Expense = { id: string; desc: string; amount: number; date: string; paidBy: User; paidById: string };
type SettlementPayment = { id: string; amount: number; createdAt: string; from: User; fromId: string; to: User; toId: string };
type Member = { user: User; userId: string };
type Group = { id: string; name: string; emoji: string; inviteCode: string; eventDate?: string; members: Member[]; expenses: Expense[]; settlementPayments: SettlementPayment[] };
type AppSessionUser = { id?: string; name?: string | null; avatar?: string | null; alias?: string | null };
type NewGroupData = { name: string; emoji: string; eventDate: string | null };
type NewExpenseData = { desc: string; amount: string; paidById: string; date: string };

export default function App() {
  const { data: session, status, update } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [view, setView] = useState("groups");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [modal, setModal] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [authView, setAuthView] = useState("login");
  const [today] = useState(() => Date.now());
  const [pendingInvite, setPendingInvite] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash;
    return hash.startsWith("#invite=") ? hash.slice(8) : null;
  });

  const fetchGroups = useCallback(async () => {
    const res = await fetch("/api/groups");
    if (res.ok) setGroups(await res.json());
  }, []);

  useEffect(() => {
    if (window.location.hash.startsWith("#invite=")) window.location.hash = "";
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    let ignore = false;
    fetch("/api/groups")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Group[]) => {
        if (!ignore) setGroups(data);
      });

    return () => {
      ignore = true;
    };
  }, [status]);

  const group = groups.find((g) => g.id === activeGroupId);

  if (status === "loading") return <Splash />;
  if (status === "unauthenticated") return <AuthScreen view={authView} onSwitch={setAuthView} onSuccess={fetchGroups} pendingInvite={pendingInvite} />;
  if (!session?.user) return <Splash />;

  const sessionUser = session.user as NonNullable<typeof session>["user"] & AppSessionUser;
  const me: User = { id: sessionUser.id!, name: sessionUser.name!, avatar: sessionUser.avatar ?? "👤", alias: sessionUser.alias ?? null };
  const updateProfileInGroups = (user: User) => {
    setGroups((gs) => gs.map((g) => ({
      ...g,
      members: g.members.map((m) => (m.userId === user.id ? { ...m, user } : m)),
      expenses: g.expenses.map((e) => (e.paidById === user.id ? { ...e, paidBy: user } : e)),
      settlementPayments: g.settlementPayments.map((p) => ({
        ...p,
        from: p.fromId === user.id ? user : p.from,
        to: p.toId === user.id ? user : p.to,
      })),
    })));
  };

  return (
    <div style={{ minHeight: "100vh", background: P.bg, fontFamily: "'Syne', sans-serif", color: P.text, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", borderRadius: "50%", filter: "blur(90px)", opacity: 0.15, pointerEvents: "none", zIndex: 0, width: 420, height: 420, background: P.accent, top: -100, left: -100 }} />
      <div style={{ position: "fixed", borderRadius: "50%", filter: "blur(90px)", opacity: 0.15, pointerEvents: "none", zIndex: 0, width: 320, height: 320, background: "#7b2d8b", bottom: 80, right: -80 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <TopNav me={me} view={view} group={group} onBack={() => { setView("groups"); setActiveGroupId(null); }} onEditProfile={() => setModal("profile")} onLogout={() => signOut()} />
        <div style={{ flex: 1, padding: "0 16px 40px" }}>
          {view === "groups" && <GroupList groups={groups} today={today} onSelect={(id) => { setActiveGroupId(id); setView("group"); }} onNew={() => setModal("newGroup")} />}
          {view === "group" && group && (
            <GroupDetail
              group={group}
              onAddExpense={() => setModal("newExpense")}
              onEditExpense={(expense) => { setEditingExpense(expense); setModal("editExpense"); }}
              onDeleteExpense={async (expenseId) => {
                if (!confirm("¿Eliminar este gasto?")) return;
                const res = await fetch(`/api/groups/${group.id}/expenses/${expenseId}`, { method: "DELETE" });
                if (res.ok) setGroups((gs) => gs.map((g) => g.id === group.id ? { ...g, expenses: g.expenses.filter((e) => e.id !== expenseId) } : g));
              }}
              onMarkPaid={async (debt) => {
                const res = await fetch(`/api/groups/${group.id}/settlements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fromId: debt.from.id, toId: debt.to.id, amount: debt.amount }) });
                if (res.ok) {
                  const payment = await res.json();
                  setGroups((gs) => gs.map((g) => g.id === group.id ? { ...g, settlementPayments: [payment, ...g.settlementPayments] } : g));
                }
              }}
              onShowInvite={() => setModal("invite")}
              onDelete={async () => {
                if (!confirm("¿Eliminar esta juntada? Se borrarán todos los gastos.")) return;
                const res = await fetch(`/api/groups/${group.id}`, { method: "DELETE" });
                if (res.ok) {
                  setGroups((gs) => gs.filter((g) => g.id !== group.id));
                  setView("groups");
                  setActiveGroupId(null);
                }
              }}
            />
          )}
        </div>
      </div>

      {modal === "newGroup" && (
        <NewGroupModal onClose={() => setModal(null)} onCreate={async (data) => {
          const res = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
          if (res.ok) { const g = await res.json(); setGroups((gs) => [g, ...gs]); setActiveGroupId(g.id); setView("group"); setModal(null); }
        }} />
      )}
      {modal === "newExpense" && group && (
        <NewExpenseModal group={group} me={me} onClose={() => setModal(null)} onAdd={async (data) => {
          const res = await fetch(`/api/groups/${group.id}/expenses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
          if (res.ok) {
            const newExpense = await res.json();
            setGroups((gs) => gs.map((g) =>
              g.id === group.id ? { ...g, expenses: [...g.expenses, newExpense] } : g
            ));
            setModal(null);
          }
        }} />
      )}
      {modal === "editExpense" && group && editingExpense && (
        <ExpenseModal group={group} expense={editingExpense} onClose={() => { setModal(null); setEditingExpense(null); }} onSubmit={async (data) => {
          const res = await fetch(`/api/groups/${group.id}/expenses/${editingExpense.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
          if (res.ok) {
            const updated = await res.json();
            setGroups((gs) => gs.map((g) =>
              g.id === group.id ? { ...g, expenses: g.expenses.map((e) => e.id === updated.id ? updated : e) } : g
            ));
            setModal(null); setEditingExpense(null);
          }
        }} />
      )}
      {modal === "invite" && group && <InviteModal group={group} onClose={() => setModal(null)} />}
      {modal === "profile" && <ProfileModal me={me} onClose={() => setModal(null)} onSaved={async (user) => { updateProfileInGroups(user); await update({ user }); setModal(null); }} />}
      {(modal === "joinInvite" || (!modal && pendingInvite)) && pendingInvite && (
        <JoinInviteModal code={pendingInvite} onClose={() => { setModal(null); setPendingInvite(null); }}
          onJoin={async (groupId) => { setModal(null); setPendingInvite(null); await fetchGroups(); setActiveGroupId(groupId); setView("group"); }} />
      )}
    </div>
  );
}

function Splash() {
  return (
    <div style={{ minHeight: "100vh", background: P.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", color: P.text }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 56 }}>🍖</div><div style={{ color: P.muted, fontSize: 14, marginTop: 14 }}>Cargando...</div></div>
    </div>
  );
}

function AuthScreen({ view, onSwitch, onSuccess, pendingInvite }: { view: string; onSwitch: (v: string) => void; onSuccess: () => void; pendingInvite: string | null }) {
  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(circle at top, ${P.card2} 0, ${P.bg} 46%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Syne', sans-serif", color: P.text }}>
      <div style={{ width: "100%", maxWidth: 410 }}>
        {pendingInvite && <div style={{ background: `${P.green}18`, border: `1px solid ${P.green}66`, borderRadius: 14, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: P.green, textAlign: "center", fontWeight: 800 }}>Tenés una invitación para unirte</div>}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div style={{ background: `linear-gradient(135deg, ${P.accent}, ${P.accent2})`, borderRadius: 16, boxShadow: "0 16px 38px rgba(255,107,53,0.22)", display: "grid", fontSize: 30, height: 58, placeItems: "center", width: 58 }}>🍖</div>
            <div>
              <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: 0, lineHeight: 1, margin: 0 }}>Juntada</h1>
              <p style={{ color: P.muted, margin: "6px 0 0", fontSize: 13, fontWeight: 700 }}>Gastos compartidos, cuentas claras.</p>
            </div>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${P.border}`, borderRadius: 18, padding: 5, display: "flex", marginBottom: 14 }}>
          {[["login", "Iniciar sesión"], ["register", "Registrarse"]].map(([v, label]) => (
            <button key={v} onClick={() => onSwitch(v)} style={{ flex: 1, padding: "12px 10px", border: "none", borderRadius: 13, cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 14, background: view === v ? P.accent : "transparent", color: view === v ? "#fff" : P.muted, transition: "all 0.2s", boxShadow: view === v ? "0 10px 24px rgba(255,107,53,0.2)" : "none" }}>{label}</button>
          ))}
        </div>
        {view === "login" ? <LoginForm onSuccess={onSuccess} /> : <RegisterForm onSuccess={onSuccess} />}
      </div>
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState(""); const [pass, setPass] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const handle = async () => {
    setErr(""); setLoading(true);
    const res = await signIn("credentials", { name, password: pass, redirect: false });
    if (res?.error) setErr("Usuario o contraseña incorrectos");
    else onSuccess();
    setLoading(false);
  };
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 22, boxShadow: "0 22px 70px rgba(0,0,0,0.28)", padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 5 }}>Entrar a tu cuenta</div>
        <div style={{ color: P.muted, fontSize: 13 }}>Usá tu nombre y contraseña para seguir.</div>
      </div>
      <div style={{ marginBottom: 14 }}><label style={lbl}>Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" style={inp} onKeyDown={(e) => e.key === "Enter" && handle()} /></div>
      <div style={{ marginBottom: 18 }}><label style={lbl}>Contraseña</label><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" style={inp} onKeyDown={(e) => e.key === "Enter" && handle()} /></div>
      {err && <div style={{ background: `${P.red}14`, border: `1px solid ${P.red}55`, borderRadius: 12, color: P.red, fontSize: 13, fontWeight: 700, marginBottom: 14, padding: "10px 12px", textAlign: "center" }}>{err}</div>}
      <button onClick={handle} disabled={loading || !name || !pass} style={{ ...primBtn(true), opacity: loading || !name || !pass ? 0.65 : 1 }}>{loading ? "Entrando..." : "Entrar"}</button>
    </div>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState(""); const [pass, setPass] = useState(""); const [alias, setAlias] = useState(""); const [avatar, setAvatar] = useState(AVATARS[0]); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const strength = getPasswordStrength(pass);
  const handle = async () => {
    if (name.trim().length < 2) { setErr("Mínimo 2 caracteres"); return; }
    if (!strength.ok) { setErr("La contraseña tiene que ser segura"); return; }
    if (alias.trim().length < 2) { setErr("Alias mínimo 2 caracteres"); return; }
    setErr(""); setLoading(true);
    const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), password: pass, avatar, alias: alias.trim() }) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error); setLoading(false); return; }
    await signIn("credentials", { name: name.trim(), password: pass, redirect: false });
    onSuccess(); setLoading(false);
  };
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 22, boxShadow: "0 22px 70px rgba(0,0,0,0.28)", padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 5 }}>Crear cuenta</div>
        <div style={{ color: P.muted, fontSize: 13 }}>Tu alias queda listo para copiarlo en los pagos.</div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={lbl}>Avatar</label>
        <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${P.border}`, borderRadius: 14, display: "flex", flexWrap: "wrap", gap: 8, padding: 10 }}>
          {AVATARS.slice(0, 14).map((a) => <button key={a} onClick={() => setAvatar(a)} style={{ fontSize: 20, background: avatar === a ? `${P.accent}33` : "transparent", border: `2px solid ${avatar === a ? P.accent : "transparent"}`, borderRadius: 10, padding: "5px 8px", cursor: "pointer", transform: avatar === a ? "scale(1.12)" : "scale(1)", transition: "all 0.15s" }}>{a}</button>)}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}><label style={lbl}>Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="¿Cómo te llaman?" style={inp} /></div>
      <div style={{ marginBottom: 14 }}><label style={lbl}>Alias de transferencia</label><input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="@tu.alias, CVU o celular" style={inp} /></div>
      <div style={{ marginBottom: 16 }}><label style={lbl}>Contraseña</label><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" style={inp} /></div>
      <PasswordStrengthMeter password={pass} />
      {err && <div style={{ background: `${P.red}14`, border: `1px solid ${P.red}55`, borderRadius: 12, color: P.red, fontSize: 13, fontWeight: 700, marginBottom: 14, padding: "10px 12px", textAlign: "center" }}>{err}</div>}
      <button onClick={handle} disabled={loading || !name || !pass || !alias.trim()} style={{ ...primBtn(true), opacity: loading || !name || !pass || !alias.trim() ? 0.65 : 1 }}>{loading ? "Creando..." : "Crear cuenta"}</button>
    </div>
  );
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  const items = [
    ["8 caracteres", strength.checks.length],
    ["minúscula", strength.checks.lower],
    ["mayúscula", strength.checks.upper],
    ["número", strength.checks.number],
    ["símbolo", strength.checks.symbol],
    ["no común", strength.checks.uncommon],
  ] as const;

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${P.border}`, borderRadius: 12, padding: 12, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ color: P.muted, fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Seguridad</span>
        <span style={{ color: strength.ok ? P.green : strength.score >= 4 ? P.accent2 : P.red, fontSize: 12, fontWeight: 900 }}>{strength.label}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, marginBottom: 10 }}>
        {items.map(([label, ok]) => <div key={label} style={{ background: ok ? P.green : P.border, borderRadius: 99, height: 5 }} />)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map(([label, ok]) => (
          <span key={label} style={{ color: ok ? P.green : P.muted, border: `1px solid ${ok ? `${P.green}66` : P.border}`, borderRadius: 999, fontSize: 10, fontWeight: 800, padding: "4px 7px" }}>
            {ok ? "✓" : "•"} {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TopNav({ me, view, group, onBack, onEditProfile, onLogout }: { me: User; view: string; group?: Group; onBack: () => void; onEditProfile: () => void; onLogout: () => void }) {
  const title = view === "groups" ? "🍖 Juntada" : group ? `${group.emoji} ${group.name}` : "🍖 Juntada";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 8px", background: "rgba(15,14,23,0.88)", backdropFilter: "blur(14px)", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {view !== "groups" && <button onClick={onBack} style={{ ...iconBtn, fontSize: 20 }}>←</button>}
        <span style={{ fontSize: 19, fontWeight: 900, letterSpacing: -0.5 }}>{title}</span>
      </div>
      <AccountMenu me={me} onEditProfile={onEditProfile} onLogout={onLogout} />
    </div>
  );
}

function AccountMenu({ me, onEditProfile, onLogout }: { me: User; onEditProfile: () => void; onLogout: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: open ? P.card2 : "rgba(255,255,255,0.03)",
          border: `1px solid ${open ? P.accent : P.border}`,
          borderRadius: 999,
          color: P.text,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "'Syne', sans-serif",
          padding: "6px 8px 6px 6px",
          transition: "all 0.15s",
        }}
      >
        <span style={{ background: P.card2, border: `1px solid ${P.border}`, borderRadius: "50%", display: "grid", fontSize: 18, height: 30, placeItems: "center", width: 30 }}>{me.avatar}</span>
        <span style={{ display: "grid", lineHeight: 1.1, maxWidth: 94, textAlign: "left" }}>
          <span style={{ fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me.name}</span>
          <span style={{ color: P.muted, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me.alias || "sin alias"}</span>
        </span>
        <span style={{ color: P.muted, fontSize: 11, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>⌄</span>
      </button>

      {open && (
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.35)", minWidth: 230, padding: 14, position: "absolute", right: 0, top: 48 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
            <div style={{ background: P.card2, border: `1px solid ${P.border}`, borderRadius: 16, display: "grid", fontSize: 28, height: 52, placeItems: "center", width: 52 }}>{me.avatar}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me.name}</div>
              <div style={{ color: P.muted, fontSize: 11, fontWeight: 700, marginTop: 4, textTransform: "uppercase" }}>Cuenta activa</div>
            </div>
          </div>
          <div style={{ background: P.card2, border: `1px solid ${P.border}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <div style={{ color: P.muted, fontSize: 10, fontWeight: 800, marginBottom: 8, textTransform: "uppercase" }}>Alias de transferencia</div>
            <AliasPill alias={me.alias} />
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); onEditProfile(); }}
            style={{ ...primBtn(true), background: P.card2, border: `1px solid ${P.border}`, color: P.text, fontSize: 13, marginBottom: 8, padding: "11px 12px" }}
          >
            Editar perfil
          </button>
          <button
            type="button"
            onClick={onLogout}
            style={{ ...primBtn(true), background: "transparent", border: `1px solid ${P.red}66`, color: P.red, fontSize: 13, padding: "11px 12px" }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

function AliasPill({ alias }: { alias?: string | null }) {
  const [copied, setCopied] = useState(false);
  const cleanAlias = alias?.trim();

  if (!cleanAlias) {
    return <span style={{ fontSize: 11, color: P.muted }}>sin alias</span>;
  }

  const copy = async () => {
    await navigator.clipboard.writeText(cleanAlias);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Copiar alias"
      style={{
        background: copied ? `${P.green}24` : `${P.accent2}18`,
        border: `1px solid ${copied ? P.green : `${P.accent2}66`}`,
        borderRadius: 999,
        color: copied ? P.green : P.accent2,
        cursor: "pointer",
        fontFamily: "'Syne', sans-serif",
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1,
        padding: "5px 8px",
        transition: "all 0.15s",
      }}
    >
      {copied ? "Copiado" : cleanAlias}
    </button>
  );
}

function GroupList({ groups, today, onSelect, onNew }: { groups: Group[]; today: number; onSelect: (id: string) => void; onNew: () => void }) {
  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Mis juntadas</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: P.muted }}>{groups.length === 0 ? "Ninguna todavía" : `${groups.length} activa${groups.length !== 1 ? "s" : ""}`}</p>
        </div>
        <button onClick={onNew} style={primBtn()}>+ Nueva</button>
      </div>
      {groups.length === 0 && <div style={{ textAlign: "center", color: P.muted, padding: "60px 0" }}><div style={{ fontSize: 52, marginBottom: 14 }}>🍽️</div><p style={{ fontSize: 15 }}>No tenés juntadas.<br />¡Creá una!</p></div>}
      {groups.map((g) => {
        const total = g.expenses.reduce((s, e) => s + e.amount, 0);
        const perPerson = g.members.length > 0 ? total / g.members.length : 0;
        const eventDate = g.eventDate ? new Date(g.eventDate) : null;
        const diffDays = eventDate ? Math.ceil((eventDate.getTime() - today) / 86400000) : null;
        return (
          <div key={g.id} onClick={() => onSelect(g.id)} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 18, padding: "18px 20px", marginBottom: 12, cursor: "pointer", transition: "transform 0.15s, border-color 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = P.accent; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = P.border; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{g.emoji} {g.name}</div>
                {eventDate && (
                  <div style={{ fontSize: 12, color: diffDays !== null && diffDays <= 1 ? P.accent : P.accent2, fontWeight: 700, marginBottom: 6 }}>
                    📅 {eventDate.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })} · {eventDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    {diffDays !== null && diffDays >= 0 && <span style={{ marginLeft: 6, color: P.muted }}>({diffDays === 0 ? "¡hoy!" : diffDays === 1 ? "mañana" : `en ${diffDays} días`})</span>}
                  </div>
                )}
                <div style={{ display: "flex", gap: 4 }}>
                  {g.members.slice(0, 6).map((m) => <span key={m.userId} title={m.user.name} style={{ fontSize: 18 }}>{m.user.avatar}</span>)}
                  {g.members.length > 6 && <span style={{ fontSize: 12, color: P.muted, alignSelf: "center" }}>+{g.members.length - 6}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", marginLeft: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: P.accent2 }}>{fmt(total)}</div>
                <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>{fmt(perPerson)} c/u</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GroupDetail({ group, onAddExpense, onEditExpense, onDeleteExpense, onMarkPaid, onShowInvite, onDelete }: { group: Group; onAddExpense: () => void; onEditExpense: (expense: Expense) => void; onDeleteExpense: (expenseId: string) => void; onMarkPaid: (debt: Debt) => void; onShowInvite: () => void; onDelete: () => void }) {
  const members = group.members.map((m) => m.user);
  const total = group.expenses.reduce((s, e) => s + e.amount, 0);
  const perPerson = members.length > 0 ? total / members.length : 0;
  const paid: Record<string, number> = {};
  members.forEach((m) => (paid[m.id] = 0));
  group.expenses.forEach((e) => { if (paid[e.paidById] !== undefined) paid[e.paidById] += e.amount; });
  group.settlementPayments.forEach((p) => {
    if (paid[p.fromId] !== undefined) paid[p.fromId] += p.amount;
    if (paid[p.toId] !== undefined) paid[p.toId] -= p.amount;
  });
  const eventDate = group.eventDate ? new Date(group.eventDate) : null;

  return (
    <div style={{ paddingTop: 12 }}>
      {eventDate && (
        <div style={{ background: `${P.accent2}18`, border: `1px solid ${P.accent2}44`, borderRadius: 16, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>📅</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: P.accent2 }}>{eventDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</div>
            <div style={{ fontSize: 13, color: P.muted }}>{eventDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs</div>
          </div>
        </div>
      )}

      <div style={{ background: `linear-gradient(135deg, ${P.accent}22, ${P.accent2}22)`, border: `1px solid ${P.accent}44`, borderRadius: 20, padding: "20px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: P.muted, marginBottom: 4 }}>Total gastado</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: P.accent2, lineHeight: 1 }}>{fmt(total)}</div>
        <div style={{ fontSize: 13, color: P.muted, marginTop: 6 }}>{fmt(perPerson)} por persona · {members.length} persona{members.length !== 1 ? "s" : ""}</div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>Participantes</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onShowInvite} style={ghostBtn}>🔗 Invitar</button>
            <button onClick={onDelete} style={{ ...ghostBtn, color: P.red, borderColor: P.red }}>🗑️</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {members.map((m) => {
            const bal = (paid[m.id] || 0) - perPerson;
            return (
              <div key={m.id} style={{ background: P.card2, border: `1px solid ${P.border}`, borderRadius: 14, padding: "10px 14px", textAlign: "center", minWidth: 72 }}>
                <div style={{ fontSize: 26 }}>{m.avatar}</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{m.name}</div>
                <div style={{ marginTop: 6 }}><AliasPill alias={m.alias} /></div>
                <div style={{ fontSize: 11, color: bal >= 0 ? P.green : P.red, fontWeight: 700, marginTop: 3 }}>{bal >= 0 ? "+" : ""}{fmt(bal)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Gastos ({group.expenses.length})</span>
        <button onClick={onAddExpense} style={primBtn()}>+ Gasto</button>
      </div>
      {group.expenses.length === 0 && <div style={{ color: P.muted, textAlign: "center", padding: "28px 0", fontSize: 14 }}>Ningún gasto todavía.</div>}
      {[...group.expenses].reverse().map((e) => {
        const share = members.length > 0 ? e.amount / members.length : 0;
        return (
          <div key={e.id} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{e.desc}</div>
              <div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>{e.paidBy.avatar} {e.paidBy.name} pagó · {e.date}</div>
              <div style={{ fontSize: 11, color: P.muted, marginTop: 1 }}>{fmt(share)} c/u</div>
            </div>
            <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: P.accent2 }}>{fmt(e.amount)}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onEditExpense(e)} style={{ ...ghostBtn, padding: "5px 9px", fontSize: 11 }}>Editar</button>
                <button onClick={() => onDeleteExpense(e.id)} style={{ ...ghostBtn, borderColor: P.red, color: P.red, padding: "5px 9px", fontSize: 11 }}>Borrar</button>
              </div>
            </div>
          </div>
        );
      })}
      <Settlements members={members} paid={paid} perPerson={perPerson} payments={group.settlementPayments} onMarkPaid={onMarkPaid} />
    </div>
  );
}

type Debt = { from: User & { bal: number }; to: User & { bal: number }; amount: number };

function Settlements({ members, paid, perPerson, payments, onMarkPaid }: { members: User[]; paid: Record<string, number>; perPerson: number; payments: SettlementPayment[]; onMarkPaid: (debt: Debt) => void }) {
  const debts: Debt[] = [];
  const g = members.filter((m) => (paid[m.id] || 0) - perPerson > 1).sort((a, b) => ((paid[b.id] || 0) - perPerson) - ((paid[a.id] || 0) - perPerson)).map((m) => ({ ...m, bal: (paid[m.id] || 0) - perPerson }));
  const t = members.filter((m) => (paid[m.id] || 0) - perPerson < -1).sort((a, b) => ((paid[a.id] || 0) - perPerson) - ((paid[b.id] || 0) - perPerson)).map((m) => ({ ...m, bal: (paid[m.id] || 0) - perPerson }));
  let gi = 0, ti = 0;
  while (gi < g.length && ti < t.length) {
    const amt = Math.min(g[gi].bal, -t[ti].bal);
    debts.push({ from: t[ti], to: g[gi], amount: amt });
    g[gi].bal -= amt; t[ti].bal += amt;
    if (Math.abs(g[gi].bal) < 1) gi++;
    if (Math.abs(t[ti].bal) < 1) ti++;
  }
  if (debts.length === 0) return <div style={{ textAlign: "center", color: P.green, padding: "20px 0", fontSize: 14, fontWeight: 700 }}>✅ ¡Todo saldado!</div>;
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>💸 Quién le debe a quién</div>
      {debts.map((d, i) => (
        <div key={i} style={{ background: `${P.green}14`, border: `1px solid ${P.green}44`, borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 20 }}>{d.from.avatar}</span><span style={{ fontWeight: 700 }}>{d.from.name}</span><AliasPill alias={d.from.alias} />
          <span style={{ color: P.muted }}>le debe</span>
          <span style={{ fontWeight: 900, color: P.green, fontSize: 16 }}>{fmt(d.amount)}</span>
          <span style={{ color: P.muted }}>a</span>
          <span style={{ fontSize: 20 }}>{d.to.avatar}</span><span style={{ fontWeight: 700 }}>{d.to.name}</span><AliasPill alias={d.to.alias} />
          <button onClick={() => onMarkPaid(d)} style={{ ...ghostBtn, borderColor: P.green, color: P.green, marginLeft: "auto", padding: "6px 10px", fontSize: 11 }}>Marcar pagado</button>
        </div>
      ))}
      {payments.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ color: P.muted, fontSize: 11, fontWeight: 800, marginBottom: 8, textTransform: "uppercase" }}>Pagos registrados</div>
          {payments.slice(0, 5).map((p) => (
            <div key={p.id} style={{ color: P.muted, fontSize: 12, marginBottom: 5 }}>
              {p.from.avatar} {p.from.name} pagó {fmt(p.amount)} a {p.to.avatar} {p.to.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: P.card, borderRadius: "24px 24px 0 0", padding: 24, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", border: `1px solid ${P.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <span style={{ fontWeight: 900, fontSize: 19 }}>{title}</span>
          <button onClick={onClose} style={iconBtn}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProfileModal({ me, onClose, onSaved }: { me: User; onClose: () => void; onSaved: (user: User) => void }) {
  const [name, setName] = useState(me.name);
  const [alias, setAlias] = useState(me.alias ?? "");
  const [avatar, setAvatar] = useState(me.avatar);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const newStrength = getPasswordStrength(newPassword);

  const save = async () => {
    if (name.trim().length < 2) { setErr("Nombre mínimo 2 caracteres"); return; }
    if (alias.trim().length < 2) { setErr("Alias mínimo 2 caracteres"); return; }
    if (newPassword && !newStrength.ok) { setErr("La contraseña nueva tiene que ser segura"); return; }
    if (newPassword && !currentPassword) { setErr("Ingresá tu contraseña actual"); return; }

    setErr(""); setLoading(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        alias: alias.trim(),
        avatar,
        currentPassword,
        newPassword,
      }),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      setErr(data.error ?? "No se pudo guardar");
      setLoading(false);
      return;
    }

    onSaved(data);
    setLoading(false);
  };

  return (
    <Modal title="Editar perfil" onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <label style={lbl}>Avatar</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {AVATARS.map((a) => <button key={a} onClick={() => setAvatar(a)} style={{ fontSize: 20, background: avatar === a ? `${P.accent}33` : "transparent", border: `2px solid ${avatar === a ? P.accent : P.border}`, borderRadius: 10, padding: "5px 8px", cursor: "pointer", transform: avatar === a ? "scale(1.15)" : "scale(1)", transition: "all 0.15s" }}>{a}</button>)}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}><label style={lbl}>Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} style={inp} /></div>
      <div style={{ marginBottom: 20 }}><label style={lbl}>Alias de transferencia</label><input value={alias} onChange={(e) => setAlias(e.target.value)} style={inp} /></div>
      <div style={{ background: P.card2, border: `1px solid ${P.border}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
        <div style={{ color: P.muted, fontSize: 11, fontWeight: 900, marginBottom: 12, textTransform: "uppercase" }}>Cambiar contraseña</div>
        <div style={{ marginBottom: 12 }}><label style={lbl}>Contraseña actual</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" style={inp} /></div>
        <div style={{ marginBottom: 12 }}><label style={lbl}>Contraseña nueva</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Opcional" style={inp} /></div>
        {newPassword && <PasswordStrengthMeter password={newPassword} />}
      </div>
      {err && <div style={{ color: P.red, fontSize: 13, marginBottom: 14, textAlign: "center" }}>{err}</div>}
      <button onClick={save} disabled={loading || !name.trim() || !alias.trim()} style={primBtn(true)}>{loading ? "Guardando..." : "Guardar cambios"}</button>
    </Modal>
  );
}

function NewGroupModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: NewGroupData) => void }) {
  const [name, setName] = useState(""); const [emoji, setEmoji] = useState("🍕");
  const [date, setDate] = useState(""); const [time, setTime] = useState("20:00");
  return (
    <Modal title="Nueva juntada" onClose={onClose}>
      <div style={{ marginBottom: 14 }}><label style={lbl}>Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Asado del viernes..." style={inp} autoFocus /></div>
      <div style={{ marginBottom: 20 }}>
        <label style={lbl}>Emoji</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {EMOJIS_GROUP.map((e) => <button key={e} onClick={() => setEmoji(e)} style={{ fontSize: 22, background: emoji === e ? `${P.accent}33` : "transparent", border: `1px solid ${emoji === e ? P.accent : P.border}`, borderRadius: 10, padding: "6px 10px", cursor: "pointer", transform: emoji === e ? "scale(1.2)" : "scale(1)", transition: "all 0.15s" }}>{e}</button>)}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}><label style={lbl}>📅 Fecha (opcional)</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} /></div>
      {date && <div style={{ marginBottom: 20 }}><label style={lbl}>🕐 Hora</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inp} /></div>}
      <button onClick={() => { if (!name.trim()) return; const eventDate = date ? new Date(`${date}T${time}`).toISOString() : null; onCreate({ name: name.trim(), emoji, eventDate }); }} disabled={!name.trim()} style={primBtn(true)}>Crear juntada</button>
    </Modal>
  );
}

function NewExpenseModal({ group, me, onClose, onAdd }: { group: Group; me: User; onClose: () => void; onAdd: (data: NewExpenseData) => void }) {
  return <ExpenseModal group={group} expense={null} defaultPaidById={me.id} onClose={onClose} onSubmit={onAdd} />;
}

function ExpenseModal({ group, expense, defaultPaidById, onClose, onSubmit }: { group: Group; expense: Expense | null; defaultPaidById?: string; onClose: () => void; onSubmit: (data: NewExpenseData) => void }) {
  const [desc, setDesc] = useState(expense?.desc ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [paidById, setPaidById] = useState(expense?.paidById ?? defaultPaidById ?? group.members[0]?.userId ?? "");
  const [date, setDate] = useState(expense?.date ?? new Date().toISOString().slice(0, 10));
  const title = expense ? "Editar gasto" : "Agregar gasto";
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{ marginBottom: 14 }}><label style={lbl}>¿Qué se compró?</label><input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Carne, vino..." style={inp} autoFocus /></div>
      <div style={{ marginBottom: 16 }}><label style={lbl}>Monto ($)</label><input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" type="number" style={inp} /></div>
      <div style={{ marginBottom: 16 }}><label style={lbl}>Fecha</label><input value={date} onChange={(e) => setDate(e.target.value)} type="date" style={inp} /></div>
      <div style={{ marginBottom: 24 }}>
        <label style={lbl}>¿Quién pagó?</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {group.members.map((m) => (
            <button key={m.userId} onClick={() => setPaidById(m.userId)} style={{ background: paidById === m.userId ? `${P.accent}33` : "transparent", border: `2px solid ${paidById === m.userId ? P.accent : P.border}`, borderRadius: 12, padding: "8px 14px", cursor: "pointer", color: P.text, fontFamily: "'Syne', sans-serif", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}>
              <span style={{ fontSize: 18 }}>{m.user.avatar}</span> {m.user.name}
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => desc.trim() && amount && onSubmit({ desc: desc.trim(), amount, paidById, date })} disabled={!desc.trim() || !amount || !paidById || !date} style={primBtn(true)}>{expense ? "Guardar gasto" : "Agregar gasto"}</button>
    </Modal>
  );
}

function InviteModal({ group, onClose }: { group: Group; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}#invite=${group.inviteCode}`;
  const copy = () => { navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }); };
  return (
    <Modal title="Invitar al grupo" onClose={onClose}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🔗</div>
        <p style={{ color: P.muted, fontSize: 14, lineHeight: 1.7 }}>Compartí este link.<br />Al abrirlo se unen a <strong style={{ color: P.text }}>{group.emoji} {group.name}</strong>.</p>
      </div>
      <div style={{ background: P.card2, border: `1px solid ${P.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 16, wordBreak: "break-all", fontSize: 12, color: P.muted, fontFamily: "monospace" }}>{link}</div>
      <button onClick={copy} style={{ ...primBtn(true), background: copied ? P.green : P.accent, transition: "background 0.3s" }}>{copied ? "✅ ¡Copiado!" : "📋 Copiar link"}</button>
    </Modal>
  );
}

function JoinInviteModal({ code, onClose, onJoin }: { code: string; onClose: () => void; onJoin: (groupId: string) => void }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`/api/invite/${code}`).then((r) => r.json()).then((g) => { setGroup(g); setLoading(false); }); }, [code]);
  const join = async () => { const res = await fetch(`/api/invite/${code}`, { method: "POST" }); if (res.ok) { const data = await res.json(); onJoin(data.groupId); } };
  if (loading) return <Modal title="Invitación" onClose={onClose}><div style={{ textAlign: "center", padding: 40, color: P.muted }}>Cargando...</div></Modal>;
  if (!group) return <Modal title="Invitación inválida" onClose={onClose}><div style={{ textAlign: "center", padding: 40, color: P.red }}>Este link no es válido.</div></Modal>;
  return (
    <Modal title="Invitación recibida 🎉" onClose={onClose}>
      <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>{group.emoji}</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900 }}>{group.name}</h2>
        <p style={{ color: P.muted, fontSize: 14 }}>Te invitaron a unirte.</p>
        <div style={{ fontSize: 18, margin: "10px 0" }}>{group.members.length} miembro{group.members.length !== 1 ? "s" : ""}</div>
      </div>
      <button onClick={join} style={primBtn(true)}>🎉 Unirse</button>
      <button onClick={onClose} style={{ ...primBtn(true), background: "transparent", color: P.muted, border: `1px solid ${P.border}`, marginTop: 10 }}>Ahora no</button>
    </Modal>
  );
}

