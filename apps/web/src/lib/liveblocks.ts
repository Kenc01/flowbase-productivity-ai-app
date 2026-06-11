import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const client = createClient({
  authEndpoint: async (room) => {
    const res = await fetch(`${BASE}/api/liveblocks/auth`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room }),
    });
    if (!res.ok) throw new Error("Liveblocks auth failed");
    return res.json();
  },
});

export type Presence = {
  cursor: { x: number; y: number } | null;
  name: string;
  color: string;
  avatar: string;
};

export type UserMeta = {
  id: string;
  info: {
    name: string;
    color: string;
    avatar: string;
  };
};

export type RoomEvent = never;

export type ThreadMetadata = {
  taskId: string;
  resolved: boolean;
};

export const {
  RoomProvider,
  useOthers,
  useSelf,
  useMyPresence,
  useThreads,
  useCreateThread,
  useCreateComment,
  useEditComment,
  useDeleteComment,
} = createRoomContext<Presence, {}, UserMeta, RoomEvent, ThreadMetadata>(client);
