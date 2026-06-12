import React, { useState } from "react";
import { X, MessageCircle, Send, Trash2 } from "lucide-react";
import {
  useThreads,
  useCreateThread,
  useCreateComment,
  useDeleteComment,
  useSelf,
} from "../../lib/liveblocks";

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CommentAvatar({ name, color, avatar }: { name: string; color: string; avatar: string }) {
  const isUrl = avatar.startsWith("http");
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ background: color }}
    >
      {isUrl ? (
        <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : avatar}
    </div>
  );
}

interface Props {
  taskId: string;
  taskTitle: string;
  onClose: () => void;
}

export default function TaskComments({ taskId, taskTitle, onClose }: Props) {
  const self = useSelf();
  const { threads } = useThreads({ query: { metadata: { taskId, resolved: false } } });
  const createThread = useCreateThread();
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();

  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  const taskThread = threads?.find(t => t.metadata.taskId === taskId) ?? null;
  const comments = taskThread?.comments ?? [];

  const handleSend = async () => {
    const text = newComment.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      if (taskThread) {
        createComment({ threadId: taskThread.id, body: { version: 1, content: [{ type: "paragraph", children: [{ text }] }] } });
      } else {
        createThread({
          body: { version: 1, content: [{ type: "paragraph", children: [{ text }] }] },
          metadata: { taskId, resolved: false },
        });
      }
      setNewComment("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end p-4"
      style={{ background: "rgba(15,23,42,0.35)", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm h-full max-h-[90vh] rounded-2xl flex flex-col shadow-2xl"
        style={{ background: "var(--fb-surface)", border: "1px solid var(--fb-border)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--fb-border)" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EEF0FF" }}>
            <MessageCircle size={15} color="#7467F0" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--fb-text)" }}>Comments</p>
            <p className="text-xs truncate" style={{ color: "var(--fb-text-muted)" }}>{taskTitle}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X size={14} style={{ color: "var(--fb-text-muted)" }} />
          </button>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#EEF0FF" }}>
                <MessageCircle size={22} color="#7467F0" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--fb-text)" }}>No comments yet</p>
                <p className="text-xs" style={{ color: "var(--fb-text-muted)" }}>Be the first to comment on this task.</p>
              </div>
            </div>
          ) : comments.map(comment => {
            const authorInfo = comment.userId === self?.id ? self.info : null;
            const name = authorInfo?.name ?? comment.userId ?? "User";
            const color = authorInfo?.color ?? "#7467F0";
            const avatar = authorInfo?.avatar ?? name.slice(0, 2).toUpperCase();
            const isOwn = comment.userId === self?.id;

            const textContent = comment.body?.content
              ?.flatMap((block: any) => block.children?.map((c: any) => c.text ?? "") ?? [])
              .join("") ?? "";

            return (
              <div key={comment.id} className="flex gap-2.5 group">
                <CommentAvatar name={name} color={color} avatar={avatar} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold" style={{ color: "var(--fb-text)" }}>{name}</span>
                    <span className="text-xs" style={{ color: "var(--fb-text-muted)" }}>
                      {timeAgo(new Date(comment.createdAt))}
                    </span>
                    {isOwn && (
                      <button
                        onClick={() => taskThread && deleteComment({ threadId: taskThread.id, commentId: comment.id })}
                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete comment"
                      >
                        <Trash2 size={11} color="#F43F5E" />
                      </button>
                    )}
                  </div>
                  <div
                    className="px-3 py-2 rounded-xl text-xs leading-relaxed"
                    style={{ background: isOwn ? "#EEF0FF" : "var(--fb-muted)", color: "var(--fb-text)" }}
                  >
                    {textContent}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--fb-border)" }}>
          <div className="flex items-end gap-2">
            {self && (
              <CommentAvatar
                name={self.info?.name ?? "You"}
                color={self.info?.color ?? "#7467F0"}
                avatar={self.info?.avatar ?? "?"}
              />
            )}
            <div className="flex-1 flex items-end gap-2 rounded-xl px-3 py-2" style={{ background: "var(--fb-muted)", border: "1px solid var(--fb-border)" }}>
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Add a comment…"
                rows={1}
                className="flex-1 outline-none resize-none bg-transparent text-xs leading-relaxed"
                style={{ color: "var(--fb-text)", maxHeight: "80px" }}
              />
              <button
                onClick={handleSend}
                disabled={!newComment.trim() || sending}
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background: newComment.trim() ? "#7467F0" : "var(--fb-border)",
                  cursor: newComment.trim() ? "pointer" : "not-allowed",
                }}
              >
                <Send size={12} color="white" />
              </button>
            </div>
          </div>
          <p className="text-xs mt-1.5 text-center" style={{ color: "var(--fb-text-muted)" }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
