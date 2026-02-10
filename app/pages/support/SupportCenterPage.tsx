"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Bot, LifeBuoy, MessageSquare, Search, Sparkles } from "lucide-react";

type FaqItem = {
  id: number;
  question: string;
  answer: string;
  keywords: string[];
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 1,
    question: "How do I buy a product?",
    answer:
      "Open any product, choose a plan, click confirm, then complete payment from checkout.",
    keywords: ["buy", "purchase", "order", "checkout", "payment"],
  },
  {
    id: 2,
    question: "Why is product out of stock?",
    answer:
      "Out of stock means current quantity is reserved or sold. It will return when seller restocks or cancelled orders release stock.",
    keywords: ["out of stock", "stock", "sold out", "restock"],
  },
  {
    id: 3,
    question: "Where can I see my orders?",
    answer:
      "Go to Orders from left sidebar or profile menu. You can open details and chat with seller/admin there.",
    keywords: ["orders", "my order", "order detail", "history"],
  },
  {
    id: 4,
    question: "How do I contact support?",
    answer:
      "Use the Contact Human button in this page. Include your order ID and issue so team can help quickly.",
    keywords: ["support", "contact", "human", "help"],
  },
  {
    id: 5,
    question: "How to access video course after payment?",
    answer:
      "After order approval/completion, open Courses and enter your purchased course. Access is controlled by your plan.",
    keywords: ["video", "course", "access", "plan", "subscription"],
  },
];

export function SupportCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [showContactHuman, setShowContactHuman] = useState(false);
  const messageIdRef = useRef(100);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<
    Array<{ id: number; role: "user" | "bot"; text: string }>
  >([
    {
      id: 1,
      role: "bot",
      text: "Hi! Ask any question and I will answer from FAQ.",
    },
  ]);

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter((item) => {
      const source = `${item.question} ${item.answer} ${item.keywords.join(" ")}`.toLowerCase();
      return source.includes(q);
    });
  }, [searchQuery]);

  const findBestFaq = (query: string) => {
    const q = query.trim().toLowerCase();
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
  };

  const nextMessageId = () => {
    messageIdRef.current += 1;
    return messageIdRef.current;
  };

  const askBot = (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    const matched = findBestFaq(clean);
    setMessages((prev) => [
      ...prev,
      { id: nextMessageId(), role: "user", text: clean },
      {
        id: nextMessageId(),
        role: "bot",
        text: matched
          ? `${matched.question}\n${matched.answer}`
          : "I could not find a clear answer. Please contact human support.",
      },
    ]);
    setShowContactHuman(!matched);
    setChatInput("");
    requestAnimationFrame(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    });
  };

  const onSubmitBot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    askBot(chatInput);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600/10 p-2 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Support Center
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                Search questions, read answers, or ask Support Bot.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Ask your question..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Browse FAQs below
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              FAQ (Questions and Answers)
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Tap a question to view answer.
            </p>
            <div className="mt-4 space-y-3">
              {filteredFaqs.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                  No FAQ found for this search.
                </p>
              )}
              {filteredFaqs.map((item) => {
                const expanded = expandedId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setExpandedId(expanded ? null : item.id);
                      askBot(item.question);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.question}
                    </div>
                    {expanded && (
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {item.answer}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300">
              <Sparkles className="h-3.5 w-3.5" />
              Fast help with Mia Bot
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Bot className="h-4 w-4 text-fuchsia-600" />
              Support Bot
            </div>
            <div
              ref={chatScrollRef}
              className="mt-3 h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex max-w-[92%] items-end gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        message.role === "user"
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "bg-fuchsia-600 text-white"
                      }`}
                    >
                      {message.role === "user" ? "You" : "M"}
                    </div>
                    <div>
                      <div
                        className={`mb-1 text-[11px] font-semibold ${message.role === "user" ? "text-right text-slate-500" : "text-slate-500"}`}
                      >
                        {message.role === "user" ? "You" : "Mia Bot"}
                      </div>
                      <div
                        className="max-w-full whitespace-pre-line rounded-xl px-3 py-2 text-sm"
                        style={
                          message.role === "user"
                            ? { backgroundColor: "#c026d3", color: "#ffffff" }
                            : { backgroundColor: "#ffffff", color: "#334155" }
                        }
                      >
                        {message.text}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={onSubmitBot} className="mt-3 flex gap-2">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Type your question..."
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fuchsia-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700"
              >
                <MessageSquare className="h-4 w-4" />
                Ask
              </button>
            </form>
            {showContactHuman && (
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/chat";
                }}
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              >
                Contact Human Support
              </button>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
