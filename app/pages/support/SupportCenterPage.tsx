"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, LifeBuoy, MessageSquare, Search, Sparkles } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  type SupportFaqRecord,
  getEmbedVideoUrl,
  getSupportFaqAnswer,
  getSupportFaqQuestion,
  getSupportFaqSearchText,
} from "../../lib/support-faq";

const FALLBACK_FAQ_ITEMS: SupportFaqRecord[] = [
  {
    id: 1,
    questionEn: "How do I buy a product?",
    questionKm: "តើខ្ញុំទិញផលិតផលដោយរបៀបណា?",
    answerEn: "Open any product, choose a plan, click confirm, then complete payment from checkout.",
    answerKm: "បើកផលិតផលណាមួយ ជ្រើសគម្រោង ចុចបញ្ជាក់ ហើយបញ្ចប់ការទូទាត់ពី checkout។",
    videoUrl: null,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 2,
    questionEn: "Why is product out of stock?",
    questionKm: "ហេតុអ្វីផលិតផលអស់ស្តុក?",
    answerEn:
      "Out of stock means current quantity is reserved or sold. It will return when seller restocks or cancelled orders release stock.",
    answerKm:
      "អស់ស្តុកមានន័យថាបរិមាណបច្ចុប្បន្នត្រូវបានបម្រុងទុក ឬលក់រួច។ វានឹងត្រឡប់មកវិញនៅពេលអ្នកលក់បន្ថែមស្តុក ឬមានការលុបចោលការបញ្ជាទិញ។",
    videoUrl: null,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 3,
    questionEn: "Where can I see my orders?",
    questionKm: "តើខ្ញុំអាចមើលការបញ្ជាទិញរបស់ខ្ញុំនៅទីណា?",
    answerEn: "Go to Orders from left sidebar or profile menu. You can open details and chat with seller/admin there.",
    answerKm: "ចូលទៅកាន់ Orders ពី sidebar ខាងឆ្វេង ឬម៉ឺនុយ profile។ អ្នកអាចបើកលម្អិត និងជជែកជាមួយ seller/admin នៅទីនោះ។",
    videoUrl: null,
    sortOrder: 3,
    isActive: true,
  },
];

export function SupportCenterPage() {
  const { language } = useLanguage();
  const staticLanguage = language === "km" ? "km" : "en";
  const [faqItems, setFaqItems] = useState<SupportFaqRecord[]>([]);
  const [faqLoading, setFaqLoading] = useState(true);
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

  useEffect(() => {
    let active = true;

    const loadFaqs = async () => {
      try {
        setFaqLoading(true);
        const res = await fetch("/api/support/faq", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error("Failed to load support FAQs");
        if (!active) return;
        const nextItems = Array.isArray(data.items) ? data.items : [];
        setFaqItems(nextItems);
      } catch {
        if (!active) return;
        setFaqItems([]);
      } finally {
        if (active) setFaqLoading(false);
      }
    };

    void loadFaqs();
    return () => {
      active = false;
    };
  }, []);

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return faqItems;
    return faqItems.filter((item) => getSupportFaqSearchText(item).includes(q));
  }, [faqItems, searchQuery]);

  const findBestFaq = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    let best: { item: SupportFaqRecord; score: number } | null = null;

    for (const item of faqItems) {
      const source = getSupportFaqSearchText(item);
      let score = 0;
      if (source.includes(q)) score += 5;
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
          ? `${getSupportFaqQuestion(matched, staticLanguage)}\n${getSupportFaqAnswer(matched, staticLanguage)}`
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
              {faqLoading && (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                  Loading FAQ...
                </p>
              )}
              {!faqLoading && filteredFaqs.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                  No FAQ found for this search.
                </p>
              )}
              {filteredFaqs.map((item) => {
                const expanded = expandedId === item.id;
                const question = getSupportFaqQuestion(item, staticLanguage);
                const answer = getSupportFaqAnswer(item, staticLanguage);
                const embedVideoUrl = getEmbedVideoUrl(item.videoUrl);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setExpandedId(expanded ? null : item.id);
                      askBot(question);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {question}
                    </div>
                    {expanded && (
                      <div className="mt-2 space-y-3">
                        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {answer}
                        </p>
                        {item.videoUrl ? (
                          embedVideoUrl ? (
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-black dark:border-slate-700">
                              <iframe
                                src={embedVideoUrl}
                                title={question}
                                className="aspect-video w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <a
                              href={item.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex text-sm font-medium text-blue-600 hover:underline dark:text-blue-300"
                            >
                              Open support video
                            </a>
                          )
                        ) : null}
                      </div>
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
                  <div
                    className={`flex max-w-[92%] items-end gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                  >
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
