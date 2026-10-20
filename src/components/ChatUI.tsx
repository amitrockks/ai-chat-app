"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

type Msg = { id: string; role: "user" | "assistant"; content: string };
type ConvSummary = { id: string; title: string };

export default function ChatUI({ userName }: { userName: string }) {
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) setConversations((await res.json()).conversations);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function openConversation(id: string) {
    setError("");
    setSidebarOpen(false);
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setActiveId(id);
    setMessages(data.conversation.messages);
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setError("");
    setSidebarOpen(false);
  }

  async function deleteConversation(id: string) {
    if (!confirm("Delete this conversation?")) return;
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (id === activeId) newChat();
      loadConversations();
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setError("");
    setSending(true);
    setInput("");

    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: text };
    const aiId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, userMsg, { id: aiId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId: activeId ?? undefined }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }

      const newId = res.headers.get("X-Conversation-Id");
      if (newId && !activeId) setActiveId(newId);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, content: reply } : m)));
      }

      loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      // drop the empty assistant placeholder
      setMessages((prev) => prev.filter((m) => !(m.id === aiId && m.content === "")));
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="chat-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <button onClick={newChat}>+ New chat</button>
        <div className="list">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`conv-item ${c.id === activeId ? "active" : ""}`}
              onClick={() => openConversation(c.id)}
            >
              <span className="t">{c.title}</span>
              <button
                className="x"
                aria-label="Delete conversation"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(c.id);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="user-row">
          <div className="name">{userName}</div>
          <button className="ghost full" style={{ marginTop: 8 }} onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </button>
        </div>
      </aside>

      <section className="chat-main">
        <button className="ghost menu-btn" onClick={() => setSidebarOpen((o) => !o)}>
          ☰ Chats
        </button>

        <div className="messages">
          <div className="inner">
            {messages.length === 0 && <p className="empty">Ask me anything to get started.</p>}
            {/* Rendered as plain text, so model output can never inject HTML */}
            {messages.map((m) => (
              <div key={m.id} className={`bubble ${m.role}`}>
                {m.content || (sending ? "…" : "")}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="composer">
          {error && <p className="error" role="alert" style={{ maxWidth: 760, margin: "0 auto 8px" }}>{error}</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a message (Enter to send, Shift+Enter for a new line)"
              maxLength={4000}
              aria-label="Message"
            />
            <button type="submit" disabled={sending || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
