"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Minus, Send, X } from "lucide-react";

type FaqItem = {
  question: string;
  answer: string;
  keywords: string[];
};

type ChatMessage = {
  id: number;
  role: "user" | "bot";
  text: string;
  time: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How do I buy a product?",
    answer:
      "Open product detail, choose plan, add to cart, then complete checkout and payment.",
    keywords: ["buy", "purchase", "checkout", "payment", "order"],
  },
  {
    question: "Why is product out of stock?",
    answer:
      "Out of stock means quantity is used or reserved. It returns when seller restocks or cancellations release stock.",
    keywords: ["stock", "sold out", "out of stock", "restock"],
  },
  {
    question: "Where can I see my orders?",
    answer:
      "Go to Orders page from the left sidebar to see all statuses and open details.",
    keywords: ["orders", "history", "order detail", "my order"],
  },
  {
    question: "How can I contact human support?",
    answer:
      "Click Contact Human Support below and include your order ID so support can help quickly.",
    keywords: ["support", "human", "contact", "help"],
  },
];

function getTimeLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function findBestAnswer(input: string) {
  const q = input.trim().toLowerCase();
  if (!q) return null;

  let best: { item: FaqItem; score: number } | null = null;
  for (const item of FAQ_ITEMS) {
    const source = `${item.question} ${item.answer} ${item.keywords.join(" ")}`.toLowerCase();
    let score = 0;

    if (source.includes(q)) score += 5;
    for (const keyword of item.keywords) {
      if (q.includes(keyword) || keyword.includes(q)) score += 3;
    }
    for (const token of q.split(/\s+/).filter(Boolean)) {
      if (source.includes(token)) score += 1;
    }

    if (!best || score > best.score) best = { item, score };
  }

  if (!best || best.score < 2) return null;
  return best.item;
}

export function SupportBotWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [showContactHuman, setShowContactHuman] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(1000);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "bot",
      text: "Hi! How can I assist you today? Ask me anything about orders, stock, or payment.",
      time: getTimeLabel(),
    },
  ]);
  const quickQuestions = useMemo(
    () => [
      "How do I buy a product?",
      "Why is product out of stock?",
      "Where can I see my orders?",
    ],
    []
  );
  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    []
  );

  useEffect(() => {
    const openBot = () => {
      setOpen(true);
      setMinimized(false);
    };
    window.addEventListener("open-support-bot", openBot);
    return () => window.removeEventListener("open-support-bot", openBot);
  }, []);

  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, open, minimized]);

  const sendMessage = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const nextId = () => {
      idRef.current += 1;
      return idRef.current;
    };

    const userMessage: ChatMessage = {
      id: nextId(),
      role: "user",
      text: clean,
      time: getTimeLabel(),
    };

    const matched = findBestAnswer(clean);
    const botMessage: ChatMessage = matched
      ? {
          id: nextId(),
          role: "bot",
          text: `${matched.question}\n${matched.answer}`,
          time: getTimeLabel(),
        }
      : {
          id: nextId(),
          role: "bot",
          text: "I could not find a clear answer. Please click Contact Human Support.",
          time: getTimeLabel(),
        };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setShowContactHuman(!matched);
    setInput("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  return (
    <div
      className="md:right-6 md:bottom-6"
      style={{
        position: "fixed",
        right: "16px",
        bottom: "96px",
        zIndex: 999999,
      }}
    >
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setMinimized(false);
          }}
          className="group relative h-16 w-16 rounded-full border-4 border-white bg-gradient-to-br from-fuchsia-600 via-rose-600 to-red-700 shadow-2xl ring-1 ring-black/10 transition hover:scale-105"
          aria-label="Open support bot"
        >
          <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
            Mia
          </div>
          <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white" />
          <span className="absolute -left-12 top-1/2 -translate-y-1/2 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
            Support
          </span>
        </button>
      )}

      {open && (
        <div className="w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between bg-[#a31652] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                M
              </div>
              <div className="text-lg font-semibold">Mia</div>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase">
                Beta
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMinimized((prev) => !prev)}
                className="rounded p-1 hover:bg-white/20"
                aria-label="Minimize"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 hover:bg-white/20"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              <div ref={bodyRef} className="h-[370px] overflow-y-auto bg-slate-50 p-4 dark:bg-slate-800">
                <div className="mb-4 flex justify-center">
                  <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    {dateLabel}
                  </span>
                </div>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`mb-3 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="flex max-w-[88%] items-end gap-2">
                      {message.role === "bot" && (
                        <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-600 text-xs font-bold text-white">
                          M
                        </div>
                      )}
                      <div
                        className={`whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                          message.role === "user"
                            ? "bg-rose-600 text-white"
                            : "bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200"
                        }`}
                      >
                        <div>{message.text}</div>
                        <div
                          className={`mt-1 text-[11px] ${
                            message.role === "user" ? "text-rose-100" : "text-slate-400"
                          }`}
                        >
                          {message.time}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-2 flex flex-wrap gap-2">
                  {quickQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => sendMessage(question)}
                      className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] text-slate-700 hover:border-rose-300 hover:bg-rose-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {question}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>

                {showContactHuman && (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/chat";
                    }}
                    className="mt-3 w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    <span className="inline-flex items-center gap-2">
                      <MessageCircle className="h-3.5 w-3.5" />
                      Contact Human Support
                    </span>
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
