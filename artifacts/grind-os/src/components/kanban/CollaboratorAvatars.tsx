import React from "react";
import { useOthers, useSelf } from "../../lib/liveblocks";

function Avatar({ name, color, avatar, isYou }: {
  name: string; color: string; avatar: string; isYou?: boolean;
}) {
  const isUrl = avatar.startsWith("http");
  return (
    <div
      title={isYou ? `${name} (you)` : name}
      className="relative shrink-0"
      style={{ marginLeft: "-8px" }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-md transition-transform hover:scale-110 hover:z-10"
        style={{ background: color, zIndex: 1, position: "relative" }}
      >
        {isUrl ? (
          <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
        ) : (
          avatar
        )}
      </div>
      {isYou && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
          style={{ background: "#10B981" }}
        />
      )}
    </div>
  );
}

export default function CollaboratorAvatars() {
  const others = useOthers();
  const self = useSelf();

  const all = [
    ...(self ? [{ id: "me", info: self.info, isYou: true }] : []),
    ...others.map(o => ({ id: o.connectionId.toString(), info: o.info, isYou: false })),
  ];

  if (all.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center" style={{ paddingLeft: "8px" }}>
        {all.slice(0, 6).map(u => (
          <Avatar
            key={u.id}
            name={u.info?.name ?? "User"}
            color={u.info?.color ?? "#7467F0"}
            avatar={u.info?.avatar ?? "?"}
            isYou={u.isYou}
          />
        ))}
        {all.length > 6 && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-md"
            style={{ background: "#94a3b8", marginLeft: "-8px" }}
          >
            +{all.length - 6}
          </div>
        )}
      </div>
      <span className="text-xs ml-1" style={{ color: "var(--fb-text-muted)" }}>
        {all.length === 1 ? "Just you" : `${all.length} online`}
      </span>
    </div>
  );
}
