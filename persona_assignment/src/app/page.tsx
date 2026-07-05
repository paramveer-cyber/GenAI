"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type PersonaId = "Hitesh Choudhary" | "Piyush Garg";

type ChatMessage = {
  role: "user" | "assistant" | "divider" | "error";
  content: string;
};

const personas: { id: PersonaId; label: string; tagline: string }[] = [
  { id: "Hitesh Choudhary", label: "Hitesh", tagline: "Chai aur Code" },
  { id: "Piyush Garg", label: "Piyush", tagline: "Ship it, dekho" },
];

function SketchPath({
  d,
  width = 2,
  fill = "none",
  stroke = "var(--ink)",
}: {
  d: string;
  width?: number;
  fill?: string;
  stroke?: string;
}) {
  return (
    <>
      <path
        d={d}
        fill={fill === "none" ? "none" : "var(--pencil)"}
        stroke="var(--pencil)"
        strokeWidth={width + 1}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.3}
        transform="translate(1, 1.2)"
      />
      <path
        d={d}
        fill={fill}
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

function ChaiCupDoodle({ active }: { active: boolean }) {
  return (
    <svg width="32" height="32" viewBox="0 0 42 42" filter="url(#roughen)">
      <SketchPath
        d="M8 34 c2 3 22 3 24 0 l1 -1.5 c-9 2 -17 2 -26 0 Z"
        width={1.6}
        fill={active ? "var(--ink)" : "none"}
      />
      <SketchPath
        d="M10 17 c-0.8 6 0.4 13 2 16 c3 2.5 13 2.5 16 0 c1.6 -3 2.8 -10 2 -16 Z"
        width={2.2}
        fill={active ? "var(--ink)" : "none"}
      />
      <SketchPath d="M10.5 17 c7 1.6 13.5 1.6 20.5 0" width={1.6} />
      <SketchPath d="M30 20 c5.5 -1.2 6.5 8 0.5 8.4" width={2} />
      <SketchPath d="M16 12 c1.2 -2.6 -1 -3.4 0.2 -6.4" width={1.4} />
      <SketchPath d="M21 12 c1.2 -2.6 -1 -3.4 0.2 -6.4" width={1.4} />
      <SketchPath d="M25.5 13 c1 -2.2 -0.8 -2.8 0.2 -5.2" width={1.2} />
    </svg>
  );
}

function LaptopDoodle({ active }: { active: boolean }) {
  return (
    <svg width="32" height="32" viewBox="0 0 42 42" filter="url(#roughen)">
      <SketchPath
        d="M9 9 h24 c1 0 1.4 0.5 1.4 1.4 v16 h-26.8 v-16 c0 -0.9 0.4 -1.4 1.4 -1.4 Z"
        width={2}
      />
      <SketchPath d="M11.5 12 h19" width={1} stroke="var(--pencil)" />
      <SketchPath d="M14 20 l-3 3.5 l3 3.5" width={1.6} />
      <SketchPath d="M28 20 l3 3.5 l-3 3.5" width={1.6} />
      <SketchPath d="M19 27 l4 -8" width={1.4} />
      <SketchPath
        d="M4 28.5 h34 l-2.6 4.6 c-0.3 0.6 -0.9 0.9 -1.6 0.9 h-25.6 c-0.7 0 -1.3 -0.3 -1.6 -0.9 Z"
        width={2}
        fill={active ? "var(--ink)" : "none"}
      />
      <SketchPath d="M18 31.3 h6" width={1.2} stroke="var(--pencil)" />
    </svg>
  );
}

function SendArrowDoodle() {
  return (
    <svg width="20" height="20" viewBox="0 0 28 28" filter="url(#roughen)">
      <SketchPath d="M4 14 c6 -0.6 12 -0.4 18 0" width={2.2} />
      <SketchPath d="M15 5 c3.5 3 6.5 6 8 9 c-1.5 3 -4.5 6 -8 9" width={2.2} />
    </svg>
  );
}

function SketchLayer({ tone }: { tone: string }) {
  return (
    <span
      aria-hidden
      className="absolute inset-0 wobble-box ink-border pointer-events-none"
      style={{ backgroundColor: tone }}
    />
  );
}

function ScribbleUnderline() {
  return (
    <svg
      width="230"
      height="16"
      viewBox="0 0 230 16"
      filter="url(#roughen)"
      className="block"
    >
      <SketchPath d="M2 9 C 45 2, 70 15, 115 7 S 190 3, 228 10" width={2.6} />
      <SketchPath
        d="M4 12 C 50 6, 90 16, 130 10 S 195 8, 226 13"
        width={1.4}
        stroke="var(--pencil)"
      />
    </svg>
  );
}

function extractYoutubeEmbedSrc(url: string): string | null {
  const videoPatterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of videoPatterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }

  const playlistMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (playlistMatch) {
    return `https://www.youtube.com/embed/videoseries?list=${playlistMatch[1]}`;
  }

  return null;
}

function YoutubeLink({
  href,
  children,
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  const embedSrc = href ? extractYoutubeEmbedSrc(href) : null;

  if (!embedSrc) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <span className="block my-2">
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
      <iframe
        className="w-full rounded mt-2"
        style={{ aspectRatio: "16 / 9" }}
        src={embedSrc}
        title="YouTube player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </span>
  );
}

function MessageContent({ content }: { content: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ a: YoutubeLink }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

const MAX_CHARS = 6000;
const STORAGE_KEY = "chai-aur-code-chat:conversations";

export default function Home() {
  const [ready, setReady] = useState(false);
  const [activePersona, setActivePersona] =
    useState<PersonaId>("Hitesh Choudhary");
  const [conversations, setConversations] = useState<
    Record<PersonaId, ChatMessage[]>
  >({
    "Hitesh Choudhary": [],
    "Piyush Garg": [],
  });
  const [loading, setLoading] = useState(false);

  const messages = conversations[activePersona];
  const charCount = messages.reduce((sum, m) => sum + m.content.length, 0);
  const limitReached = charCount >= MAX_CHARS;

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLElement>(null);
  const generationRef = useRef(0);
  const activePersonaRef = useRef(activePersona);
  const loadingRef = useRef(loading);
  const conversationsRef = useRef(conversations);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      setConversations((prev) => ({ ...prev, ...parsed }));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    activePersonaRef.current = activePersona;
  }, [activePersona]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    import("wired-elements").then(() => setReady(true));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  function appendMessage(personaId: PersonaId, message: ChatMessage) {
    setConversations((prev) => ({
      ...prev,
      [personaId]: [...prev[personaId], message],
    }));
  }

  const sendMessage = useCallback(async () => {
    const el = inputRef.current as (HTMLElement & { value?: string }) | null;
    const prompt = (el?.value ?? "").trim();
    if (!prompt || loadingRef.current) return;

    const persona = activePersonaRef.current;
    const existing = conversationsRef.current[persona];
    const existingChars = existing.reduce(
      (sum, m) => sum + m.content.length,
      0,
    );

    if (existingChars + prompt.length > MAX_CHARS) {
      appendMessage(persona, {
        role: "error",
        content: `Chat limit reached (${MAX_CHARS} characters). Clear this chat to keep talking to ${persona}.`,
      });
      return;
    }

    const requestGeneration = generationRef.current;

    const history = existing
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    appendMessage(persona, { role: "user", content: prompt });
    if (el) el.value = "";
    setLoading(true);

    try {
      const res = await fetch("/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          messages: history,
          personaTitle: persona,
        }),
      });

      const data = await res.json();
      if (requestGeneration !== generationRef.current) return;

      if (!res.ok) {
        appendMessage(persona, {
          role: "error",
          content: data?.error ?? "Something went wrong.",
        });
        return;
      }

      let replyText = data.reply as string;
      try {
        const parsed = JSON.parse(replyText);
        if (parsed?.text) replyText = parsed.text;
      } catch {}

      appendMessage(persona, { role: "assistant", content: replyText });
    } catch {
      if (requestGeneration !== generationRef.current) return;
      appendMessage(persona, {
        role: "error",
        content: "Couldn't reach the server, try again.",
      });
    } finally {
      if (requestGeneration === generationRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const el = inputRef.current as (HTMLElement & { value?: string }) | null;
    if (!el) return;
    const onKeyDown = (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === "Enter" && !ke.shiftKey) {
        ke.preventDefault();
        sendMessage();
      }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [ready, sendMessage]);

  function switchPersona(id: PersonaId) {
    if (id === activePersona) return;
    generationRef.current++;
    setActivePersona(id);
    const el = inputRef.current as (HTMLElement & { value?: string }) | null;
    if (el) el.value = "";
  }

  function clearChat() {
    generationRef.current++;
    setConversations((prev) => ({ ...prev, [activePersona]: [] }));
  }

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl flex flex-col gap-6 min-w-0">
        <header className="flex flex-col items-center gap-2 text-center">
          <h1
            className="text-4xl text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Chai aur Code Chat
          </h1>
          <ScribbleUnderline />
          <p
            className="text-pencil text-sm"
            style={{ fontFamily: "var(--font-label)" }}
          >
            pick a mentor, ask anything code related
          </p>
        </header>

        <div className="flex flex-wrap gap-4 justify-center">
          {personas.map((persona) => {
            const active = persona.id === activePersona;
            return (
              <wired-card
                key={persona.id}
                elevation={active ? 4 : 1}
                onClick={() => switchPersona(persona.id)}
                className="cursor-pointer px-5 py-3 select-none box-border"
                style={{
                  backgroundColor: active ? "var(--panel)" : "var(--paper)",
                  transform: active ? "rotate(-1deg)" : "rotate(1deg)",
                }}
              >
                <div className="flex items-center gap-3">
                  {persona.id === "Hitesh Choudhary" ? (
                    <ChaiCupDoodle active={active} />
                  ) : (
                    <LaptopDoodle active={active} />
                  )}
                  <div className="flex flex-col items-start">
                    <span
                      className="text-lg leading-none text-ink"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {persona.label}
                    </span>
                    <span
                      className="text-xs text-pencil leading-none mt-1"
                      style={{ fontFamily: "var(--font-label)" }}
                    >
                      {persona.tagline}
                    </span>
                  </div>
                </div>
              </wired-card>
            );
          })}
        </div>

        <div className="relative h-[58vh] w-full">
          <SketchLayer tone="var(--paper)" />
          <div
            ref={scrollRef}
            className="relative h-full overflow-y-auto flex flex-col gap-3 p-4 min-w-0"
          >
            {messages.length === 0 && (
              <p
                className="text-pencil text-center m-auto text-lg"
                style={{ fontFamily: "var(--font-body)" }}
              >
                say hi to {personas.find((p) => p.id === activePersona)?.label}
                ...
              </p>
            )}

            {messages.map((message, index) => {
              if (message.role === "divider") {
                return (
                  <div
                    key={index}
                    className="text-center text-xs text-pencil"
                    style={{ fontFamily: "var(--font-label)" }}
                  >
                    — {message.content} —
                  </div>
                );
              }

              if (message.role === "error") {
                return (
                  <wired-card
                    key={index}
                    elevation={1}
                    className="self-center px-4 py-2 text-sm box-border"
                    style={{ backgroundColor: "var(--panel)", maxWidth: "90%" }}
                  >
                    <MessageContent content={message.content} />
                  </wired-card>
                );
              }

              const isUser = message.role === "user";
              return (
                <wired-card
                  key={index}
                  elevation={1}
                  className={`px-4 py-2 text-lg leading-snug box-border ${
                    isUser ? "self-end" : "self-start"
                  }`}
                  style={{
                    backgroundColor: isUser ? "var(--paper)" : "var(--panel)",
                    fontFamily: "var(--font-body)",
                    maxWidth: "80%",
                  }}
                >
                  <MessageContent content={message.content} />
                </wired-card>
              );
            })}

            {loading && (
              <wired-card
                elevation={1}
                className="self-start px-4 py-3 flex gap-1 items-center box-border"
                style={{ backgroundColor: "var(--panel)" }}
              >
                <span
                  className="w-2 h-2 rounded-full bg-ink typing-dot"
                  style={{ animationDelay: "0s" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-ink typing-dot"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-ink typing-dot"
                  style={{ animationDelay: "0.3s" }}
                />
              </wired-card>
            )}
          </div>
        </div>

        {limitReached && (
          <div
            className="text-center text-xs text-pencil"
            style={{ fontFamily: "var(--font-label)" }}
          >
            chat limit reached for {activePersona} — clear it to keep going
          </div>
        )}

        <div className="flex gap-3 items-stretch min-w-0">
          <wired-input
            ref={inputRef}
            placeholder={
              limitReached ? "chat limit reached" : "type your question..."
            }
            disabled={limitReached}
            className="flex-1 box-border min-w-0"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "1.1rem",
              width: "100%",
            }}
          />
          <wired-button
            elevation={2}
            disabled={loading || limitReached}
            onClick={sendMessage}
            className="shrink-0"
            style={{ fontFamily: "var(--font-label)" }}
          >
            <span className="flex items-center gap-2">
              Send <SendArrowDoodle />
            </span>
          </wired-button>
          <wired-button
            elevation={1}
            onClick={clearChat}
            className="shrink-0"
            style={{ fontFamily: "var(--font-label)" }}
          >
            Clear
          </wired-button>
        </div>
      </div>
    </div>
  );
}
