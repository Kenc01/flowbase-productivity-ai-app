import { Router } from "express";
import { getAuth } from "@clerk/express";
import { Liveblocks } from "@liveblocks/node";

const router = Router();

const liveblocksSecret = process.env.LIVEBLOCKS_SECRET_KEY;
const liveblocks = liveblocksSecret
  ? new Liveblocks({ secret: liveblocksSecret })
  : null;

const AVATAR_COLORS = [
  "#7467F0", "#06B6D4", "#10B981", "#F59E0B",
  "#F43F5E", "#A855F7", "#EC4899", "#14B8A6",
];

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsAvatar(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.slice(0, 2) ?? "??").toUpperCase();
  return initials;
}

router.post("/auth", async (req, res) => {
  if (!liveblocks) {
    return res.status(503).json({ error: "Liveblocks not configured" });
  }

  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const room = (req.body?.room as string) ?? "";
  const firstName = (req.body?.firstName as string) ?? "";
  const lastName = (req.body?.lastName as string) ?? "";
  const email = (req.body?.email as string) ?? userId;
  const imageUrl = (req.body?.imageUrl as string) ?? "";

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0] || "User";
  const color = colorForUser(userId);
  const avatar = imageUrl || initialsAvatar(displayName);

  try {
    const session = liveblocks.prepareSession(userId, {
      userInfo: { name: displayName, color, avatar },
    });

    if (room) {
      session.allow(room, session.FULL_ACCESS);
    } else {
      session.allow("flowbase-board-*", session.FULL_ACCESS);
    }

    const { body, status } = await session.authorize();
    res.status(status).send(body);
  } catch (err: any) {
    console.error("Liveblocks auth error:", err);
    res.status(500).json({ error: "Liveblocks auth failed" });
  }
});

export default router;
