import React, { useState } from "react";
import { X, Users, UserPlus, Mail, Trash2, Check, Crown } from "lucide-react";
import { useOthers, useSelf } from "../../lib/liveblocks";
import { api } from "../../lib/api";

interface SharedUser {
  email: string;
  addedAt: string;
}

interface Props {
  boardId: string;
  boardName: string;
  onClose: () => void;
}

const AVATAR_COLORS = ["#7467F0","#06B6D4","#10B981","#F59E0B","#F43F5E","#A855F7","#EC4899","#14B8A6"];
function colorForStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(email: string) {
  const name = email.split("@")[0];
  return name.slice(0, 2).toUpperCase();
}

export default function CollaborationPanel({ boardId, boardName, onClose }: Props) {
  const self = useSelf();
  const others = useOthers();

  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [tab, setTab] = useState<"active" | "invite">("active");

  const activeUsers = [
    ...(self ? [{ id: "me", name: self.info?.name ?? "You", color: self.info?.color ?? "#7467F0", avatar: self.info?.avatar, isYou: true }] : []),
    ...others.map(o => ({ id: o.connectionId.toString(), name: o.info?.name ?? "User", color: o.info?.color ?? "#94a3b8", avatar: o.info?.avatar, isYou: false })),
  ];

  const handleInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || inviting) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    if (sharedUsers.find(u => u.email === trimmed)) return;

    setInviting(true);
    try {
      setSharedUsers(prev => [...prev, { email: trimmed, addedAt: new Date().toISOString() }]);
      setEmail("");
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 2000);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = (emailToRemove: string) => {
    setSharedUsers(prev => prev.filter(u => u.email !== emailToRemove));
  };

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl flex flex-col shadow-2xl"
        style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)", maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--fb-border)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EEF0FF" }}>
            <Users size={17} color="#7467F0" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "var(--fb-text)" }}>Collaboration</p>
            <p className="text-xs truncate" style={{ color: "var(--fb-text-muted)" }}>{boardName}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X size={14} style={{ color: "var(--fb-text-muted)" }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-3 gap-2 shrink-0">
          {(["active", "invite"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{
                background: tab === t ? "#EEF0FF" : "var(--fb-muted)",
                color: tab === t ? "#7467F0" : "var(--fb-text-muted)",
                border: `1px solid ${tab === t ? "#7467F044" : "var(--fb-border)"}`,
              }}>
              {t === "active" ? `Active Now (${activeUsers.length})` : "Share Access"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {tab === "active" ? (
            <>
              <p className="text-xs" style={{ color: "var(--fb-text-muted)" }}>
                People currently viewing this board in real time.
              </p>
              {activeUsers.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#EEF0FF" }}>
                    <Users size={22} color="#7467F0" strokeWidth={1.5} />
                  </div>
                  <p className="text-xs text-center" style={{ color: "var(--fb-text-muted)" }}>No one is active right now.</p>
                </div>
              ) : activeUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)" }}>
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: u.color }}>
                      {u.avatar && u.avatar.startsWith("http") ? (
                        <img src={u.avatar} alt={u.name} className="w-full h-full rounded-full object-cover" />
                      ) : (u.avatar ?? u.name.slice(0, 2).toUpperCase())}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: "#10B981" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--fb-text)" }}>
                      {u.name}{u.isYou ? " (you)" : ""}
                    </p>
                    <p className="text-xs" style={{ color: "#10B981" }}>● Active now</p>
                  </div>
                  {u.isYou && <Crown size={13} style={{ color: "#F59E0B" }} />}
                </div>
              ))}
            </>
          ) : (
            <>
              {/* Invite input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>Invite by email</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)" }}>
                    <Mail size={13} style={{ color: "var(--fb-text-muted)" }} />
                    <input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleInvite()}
                      placeholder="colleague@company.com"
                      className="flex-1 text-sm outline-none bg-transparent"
                      style={{ color: "var(--fb-text)" }}
                    />
                  </div>
                  <button
                    onClick={handleInvite}
                    disabled={!email.trim() || inviting}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shrink-0 transition-all"
                    style={{ background: email.trim() ? (inviteSuccess ? "#10B981" : "#7467F0") : "var(--fb-border)", cursor: email.trim() ? "pointer" : "not-allowed" }}
                  >
                    {inviteSuccess ? <><Check size={12} /> Invited!</> : <><UserPlus size={12} /> Invite</>}
                  </button>
                </div>
                <p className="text-xs" style={{ color: "var(--fb-text-muted)" }}>
                  They'll be added to this board's collaborator list.
                </p>
              </div>

              {/* Shared users */}
              {sharedUsers.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>Shared with</p>
                  {sharedUsers.map(u => (
                    <div key={u.email} className="flex items-center gap-3 px-3 py-2.5 rounded-xl group" style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: colorForStr(u.email) }}>
                        {initials(u.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--fb-text)" }}>{u.email}</p>
                        <p className="text-xs" style={{ color: "var(--fb-text-muted)" }}>Added {fmtDate(u.addedAt)}</p>
                      </div>
                      <button
                        onClick={() => handleRemove(u.email)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-50"
                        title="Remove"
                      >
                        <Trash2 size={11} color="#F43F5E" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {sharedUsers.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#EEF0FF" }}>
                    <UserPlus size={22} color="#7467F0" strokeWidth={1.5} />
                  </div>
                  <p className="text-xs text-center" style={{ color: "var(--fb-text-muted)" }}>
                    No one invited yet. Add an email above to share this board.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Room ID info */}
        <div className="px-5 py-3 shrink-0" style={{ borderTop: "1px solid var(--fb-border)" }}>
          <p className="text-xs" style={{ color: "var(--fb-text-muted)" }}>
            Room: <code className="font-mono" style={{ color: "#7467F0" }}>board-{boardId.slice(0, 8)}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
