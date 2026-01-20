import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock3,
  Copy,
  Download,
  Loader2,
  MessageCircle,
  Send,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { Button } from "../../components/ui/button";
import type { OrderStatus } from "@/lib/order-status";
import { getStatusLabel } from "./orderStatusConfig";
import { Textarea } from "../../components/ui/textarea";
import { useAuth } from "../../contexts/AuthContext";

type LanguageCode = "en" | "km";

type Order = {
  id: number;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  tax_amount: number;
  total: number;
  created_at: string;
  delivery_title?: string | null;
  delivery_message?: string | null;
  delivered_at?: string | null;
  reviewed_at?: string | null;
};

type Item = {
  id: number;
  title: string;
  image_url: string | null;
  qty: number;
  unit_price: number;
  duration_label: string | null;
  device_label: string | null;
};

type Payment = {
  account_id: string;
  payment_id: string;
  payment_apv: string;
  paid_at: string;
  method: string;
} | null;

type TimelineState = "done" | "current" | "upcoming";

type TimelineStep = {
  key: string;
  label: string;
  description: string;
  date: string | null;
  state: TimelineState;
};

type ActivityItem = {
  key: string;
  title: string;
  description: string;
  date: string | null;
};

type DeliveryEntry = {
  id: string;
  title: string;
  content: string;
};

type OrderChatMessage = {
  id: number;
  senderId: number;
  body: string;
  createdAt: string | null;
  isAdmin: boolean;
  senderName: string | null;
};

type ApiChatMessage = {
  id: number;
  senderId: number;
  body: string;
  createdAt?: string | null;
  isAdmin?: boolean;
  sender?: {
    name?: string | null;
    email?: string | null;
  };
};

const STANDARD_TIMELINE_CONFIG = [
  {
    key: "placed",
    label: { en: "Order placed", km: "បានដាក់ការបញ្ជាទិញ" },
    description: {
      en: "We received your order and are preparing it.",
      km: "យើងបានទទួលការបញ្ជាទិញរបស់អ្នក។",
    },
  },
  {
    key: "paid",
    label: { en: "Paid", km: "បានបង់ប្រាក់" },
    description: {
      en: "Payment received and awaiting admin review.",
      km: "ការបង់ប្រាក់ត្រូវបានទទួល និងកំពុងរង់ចាំអនុម័ត។",
    },
  },
  {
    key: "prepared",
    label: { en: "Prepared", km: "ត្រៀមរួច" },
    description: {
      en: "Account or assets are being prepared for delivery.",
      km: "កំពុងត្រៀមទិន្នន័យឬគណនីសម្រាប់ផ្គត់ផ្គង់។",
    },
  },
  {
    key: "delivering",
    label: { en: "Delivering", km: "កំពុងដឹកជញ្ជូន" },
    description: {
      en: "Delivery is in progress.",
      km: "ការដឹកជញ្ជូនកំពុងដំណើរការ។",
    },
  },
  {
    key: "completed",
    label: { en: "Completed", km: "បានបញ្ចប់" },
    description: {
      en: "Order has been fulfilled successfully.",
      km: "ការបញ្ជាទិញបានបញ្ចប់ដោយជោគជ័យ។",
    },
  },
] as const;

const TIMELINE_PROGRESS_INDEX: Record<OrderStatus, number> = {
  pending: 0,
  approved: 2,
  delivering: 3,
  completed: 4,
  cancelled: 1,
  resolution: 1,
};

function normalizeDateForDisplay(value?: string | null, lang: LanguageCode = "en") {
  if (!value) return lang === "km" ? "មិនមាន" : "No record";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(lang === "km" ? "km-KH" : undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildTimelineSteps(order: Order, payment: Payment, lang: LanguageCode): TimelineStep[] {
  const stepsDateMap: Record<string, string | null> = {
    placed: order.created_at,
    paid: payment?.paid_at ?? order.created_at,
    prepared: order.reviewed_at ?? payment?.paid_at ?? order.created_at,
    delivering: order.delivered_at ?? order.reviewed_at ?? payment?.paid_at ?? order.created_at,
    completed: order.delivered_at ?? order.reviewed_at ?? payment?.paid_at ?? order.created_at,
  };

  if (order.status === "cancelled" || order.status === "resolution") {
    const finalDescription =
      order.status === "cancelled"
        ? {
            en: "The order has been cancelled by the admin.",
            km: "ការបញ្ជាទិញត្រូវបានបោះបង់ដោយអ្នកគ្រប់គ្រង។",
          }
        : {
            en: "Resolution in progress with support team.",
            km: "កំពុងដោះស្រាយបញ្ហាជាមួយក្រុមគាំទ្រ។",
          };
    const finalDate = order.reviewed_at ?? payment?.paid_at ?? order.created_at;

    return [
      {
        key: "placed",
        label: STANDARD_TIMELINE_CONFIG[0].label[lang],
        description: STANDARD_TIMELINE_CONFIG[0].description[lang],
        date: stepsDateMap.placed,
        state: "done",
      },
      {
        key: order.status,
        label: getStatusLabel(order.status, lang),
        description: finalDescription[lang],
        date: finalDate,
        state: "done",
      },
    ];
  }

  const completedIndex = TIMELINE_PROGRESS_INDEX[order.status] ?? 0;
  const currentIndex =
    completedIndex >= STANDARD_TIMELINE_CONFIG.length - 1
      ? completedIndex
      : Math.min(completedIndex + 1, STANDARD_TIMELINE_CONFIG.length - 1);

  return STANDARD_TIMELINE_CONFIG.map((step, index) => {
    let state: TimelineState = "upcoming";
    if (index <= completedIndex) {
      state = "done";
    } else if (index === currentIndex) {
      state = "current";
    }

    return {
      key: step.key,
      label: step.label[lang],
      description: step.description[lang],
      date: stepsDateMap[step.key] ?? null,
      state,
    };
  });
}

function buildActivity(order: Order, payment: Payment, lang: LanguageCode): ActivityItem[] {
  const items: ActivityItem[] = [
    {
      key: "placed",
      title: lang === "km" ? "បានបង្កើតការបញ្ជាទិញ" : "Order created",
      description:
        lang === "km"
          ? "យើងបានទទួលការបញ្ជាទិញរបស់អ្នក។"
          : "Your order has been received.",
      date: order.created_at,
    },
  ];

  if (payment) {
    items.push({
      key: "payment",
      title: lang === "km" ? "បានបង់ប្រាក់" : "Payment submitted",
      description:
        lang === "km"
          ? `វិធីសាស្ត្រ៖ ${payment.method} • លេខគណនី ${payment.payment_id}`
          : `Method: ${payment.method} • Account ${payment.payment_id}`,
      date: payment.paid_at,
    });
  }

  if (order.status === "approved") {
    items.push({
      key: "approved",
      title: lang === "km" ? "បានអនុម័ត" : "Order approved",
      description:
        lang === "km"
          ? "អ្នកគ្រប់គ្រងបានអនុម័តការបញ្ជាទិញ។"
          : "Admin approved your order.",
      date: order.reviewed_at ?? payment?.paid_at ?? order.created_at,
    });
  }

  if (order.status === "delivering") {
    items.push({
      key: "delivering",
      title: lang === "km" ? "កំពុងដឹកជញ្ជូន" : "Delivery in progress",
      description:
        order.delivery_message ??
        (lang === "km"
          ? "កំពុងផ្ទេរគណនី ឬកម្មវិធីទៅអ្នក។"
          : "Your items are currently being delivered."),
      date: order.delivered_at ?? order.reviewed_at ?? order.created_at,
    });
  }

  if (order.status === "completed") {
    items.push({
      key: "completed",
      title: lang === "km" ? "បានបញ្ចប់" : "Order completed",
      description:
        lang === "km"
          ? "ការបញ្ជាទិញត្រូវបានផ្តល់ជូនរួចរាល់។"
          : "The order was fulfilled successfully.",
      date: order.delivered_at ?? order.reviewed_at ?? order.created_at,
    });
  }

  if (order.status === "cancelled") {
    items.push({
      key: "cancelled",
      title: lang === "km" ? "ការបញ្ជាទិញត្រូវបានបោះបង់" : "Order cancelled",
      description:
        lang === "km"
          ? "សូមទាក់ទងជាមួយជំនួយការសម្រាប់ព័ត៌មានបន្ថែម។"
          : "Please contact support for more information.",
      date: order.reviewed_at ?? order.created_at,
    });
  }

  if (order.status === "resolution") {
    items.push({
      key: "resolution",
      title: lang === "km" ? "កំពុងដោះស្រាយ" : "Resolution",
      description:
        lang === "km"
          ? "យើងកំពុងធ្វើការជាមួយអ្នកដើម្បីដោះស្រាយបញ្ហា។"
          : "We are working with you to resolve the issue.",
      date: order.reviewed_at ?? order.created_at,
    });
  }

  if (order.delivery_message && order.status !== "cancelled") {
    items.push({
      key: "delivery-message",
      title: order.delivery_title || (lang === "km" ? "ព័ត៌មានបន្ថែម" : "Delivery message"),
      description: order.delivery_message,
      date: order.delivered_at ?? order.reviewed_at ?? order.created_at,
    });
  }

  return items;
}

function parseDeliveryEntries(
  title: string | null | undefined,
  message: string | null | undefined,
  lang: LanguageCode
): DeliveryEntry[] {
  if (!message) return [];
  const segments = message
    .split(/\n-{3,}\n|\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);

  const fallbackTitle =
    lang === "km" ? "ព័ត៌មានគណនី" : "Account delivery";

  if (segments.length === 0) {
    return [
      {
        id: "0",
        title: title || fallbackTitle,
        content: message.trim(),
      },
    ];
  }

  return segments.map((content, index) => ({
    id: String(index),
    title:
      segments.length > 1
        ? `${title || fallbackTitle} #${index + 1}`
        : title || fallbackTitle,
    content,
  }));
}

function formatChatDate(value: string | null | undefined, lang: LanguageCode) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value ?? "";
  return parsed.toLocaleString(lang === "km" ? "km-KH" : undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Timeline({ steps, lang }: { steps: TimelineStep[]; lang: LanguageCode }) {
  return (
    <div className="space-y-6">
      <div className="hidden md:flex items-center gap-2">
        {steps.map((step, index) => {
          const color =
            step.state === "done"
              ? "bg-emerald-500 border-emerald-500 text-white"
              : step.state === "current"
              ? "bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950/30 dark:text-blue-200"
              : "bg-gray-100 border-gray-300 text-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-500";

          const lineColor =
            step.state === "done" ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700";

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center text-center flex-1">
                <div className={`size-12 rounded-full border-2 flex items-center justify-center ${color}`}>
                  {step.state === "done" ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : step.state === "current" ? (
                    <Clock3 className="w-6 h-6" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </div>
                <div className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {step.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {normalizeDateForDisplay(step.date, lang)}
                </div>
              </div>
              {index < steps.length - 1 && <div className={`flex-1 h-1 ${lineColor}`} />}
            </div>
          );
        })}
      </div>

      <div className="space-y-3 md:hidden">
        {steps.map((step) => {
          const badgeColor =
            step.state === "done"
              ? "bg-emerald-500 text-white"
              : step.state === "current"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
              : "bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400";

          return (
            <div key={step.key} className="flex gap-3">
              <div className={`size-10 rounded-full flex items-center justify-center ${badgeColor}`}>
                {step.state === "done" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : step.state === "current" ? (
                  <Clock3 className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {step.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {normalizeDateForDisplay(step.date, lang)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{step.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OrderDetailPage({
  orderId,
  onBack,
  onOpenChat,
}: {
  orderId: number | string;
  onBack: () => void;
  onOpenChat?: (orderId: number) => void;
}) {
  const { language } = useLanguage();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const lang: LanguageCode = language === "km" ? "km" : "en";

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [payment, setPayment] = useState<Payment>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<OrderChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatEnabled = order?.status === "completed";

  const orderIdentifier =
    typeof orderId === "number" ? String(orderId) : String(orderId ?? "");

  const deliveryEntries = useMemo(
    () =>
      parseDeliveryEntries(
        order?.delivery_title,
        order?.delivery_message,
        lang
      ),
    [order?.delivery_title, order?.delivery_message, lang]
  );

  const handleDownloadDelivery = () => {
    if (!order?.delivery_message) return;
    const blob = new Blob([order.delivery_message], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${order.order_number || "delivery"}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleCopyDelivery = async (content: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(content);
      }
    } catch {
      // ignore clipboard errors
    }
  };

  const fetchChat = useCallback(async (targetOrderId: number) => {
    setChatLoading(true);
    try {
      const res = await fetch(`/api/orders/${targetOrderId}/chat`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : lang === "km"
            ? "មិនអាចទាញយកជជែកកំសាន្តបាន"
            : "Unable to load chat messages"
        );
      }

      setChatMessages(
        (data.messages ?? []).map((msg: ApiChatMessage) => ({
          id: msg.id,
          senderId: msg.senderId,
          body: msg.body,
          createdAt: msg.createdAt ?? null,
          isAdmin: !!msg.isAdmin,
          senderName: msg.sender?.name || msg.sender?.email || null,
        }))
      );
      setChatError(null);
    } catch (err) {
      setChatMessages([]);
      setChatError(
        err instanceof Error
          ? err.message
          : lang === "km"
          ? "កំហុសក្នុងការទាញយកជជែកកំសាន្ត"
          : "Failed to load chat"
      );
    } finally {
      setChatLoading(false);
    }
  }, [lang]);

  const handleSendChatMessage = async () => {
    if (!order || !chatInput.trim() || order.status !== "completed") return;
    const text = chatInput.trim();
    setChatSending(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : lang === "km"
            ? "មិនអាចផ្ញើសារ"
            : "Unable to send message"
        );
      }
      if (data.message) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: data.message.id,
            senderId: data.message.senderId,
            body: data.message.body,
            createdAt: data.message.createdAt ?? null,
            isAdmin: !!data.message.isAdmin,
            senderName:
              data.message.sender?.name ||
              data.message.sender?.email ||
              null,
          },
        ]);
      }
      setChatInput("");
      setChatError(null);
    } catch (err) {
      setChatError(
        err instanceof Error
          ? err.message
          : lang === "km"
          ? "កំហុសក្នុងការផ្ញើសារ"
          : "Failed to send message"
      );
    } finally {
      setChatSending(false);
    }
  };

  const handleOpenChatPage = () => {
    if (order?.id && onOpenChat && order.status === "completed") {
      onOpenChat(order.id);
    }
  };

  const handleRefreshChat = () => {
    if (order?.id && order.status === "completed") {
      fetchChat(order.id);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const encodedId = encodeURIComponent(orderIdentifier);
        const res = await fetch(`/api/orders/${encodedId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          setOrder(null);
          setItems([]);
          setPayment(null);
          setError(
            typeof data?.error === "string"
              ? data.error
              : language === "km"
              ? "រកមិនឃើញការបញ្ជាទិញ"
              : "Order not found"
          );
          return;
        }

        setOrder(data.order);
        setItems(data.items ?? []);
        setPayment(data.payment ?? null);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orderIdentifier, language]);

  useEffect(() => {
    if (!order?.id) return;
    if (order.status === "completed") {
      fetchChat(order.id);
    } else {
      setChatMessages([]);
      setChatError(
        lang === "km"
          ? "ការជជែកអាចប្រើបានក្រោយពេលការបញ្ជាទិញបានបញ្ចប់។"
          : "Chat will unlock after this order is completed."
      );
    }
  }, [order?.id, order?.status, fetchChat, lang]);

  const timeline = useMemo(
    () => (order ? buildTimelineSteps(order, payment, lang) : []),
    [order, payment, lang]
  );
  const activity = useMemo(
    () => (order ? buildActivity(order, payment, lang) : []),
    [order, payment, lang]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-gray-600 dark:text-gray-400">
            {language === "km" ? "កំពុងផ្ទុក..." : "Loading..."}
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === "km" ? "ត្រឡប់ក្រោយ" : "Back"}
            </Button>
            <div className="mt-4 text-gray-600 dark:text-gray-400">
              {error ||
                (language === "km"
                  ? "រកមិនឃើញការបញ្ជាទិញ"
                  : "Order not found")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-5xl mx-auto px-4 space-y-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <ArrowLeft className="w-5 h-5" />
          {language === "km" ? "ត្រឡប់ក្រោយ" : "Back"}
        </button>

        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === "km" ? "លេខបញ្ជាទិញ" : "Order no."}
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {order.order_number}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === "km" ? "បានដាក់នៅ" : "Placed on"}{" "}
                {normalizeDateForDisplay(order.created_at, lang)}
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === "km" ? "ស្ថានភាពបច្ចុប្បន្ន" : "Current status"}
              </p>
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                {getStatusLabel(order.status, lang)}
              </span>
            </div>
          </div>

          <Timeline steps={timeline} lang={lang} />

          <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {language === "km" ? "សកម្មភាពបញ្ជាទិញ" : "Order activity"}
            </h3>
            <div className="space-y-4">
              {activity.map((item) => (
                <div
                  key={item.key}
                  className="flex flex-col md:flex-row md:items-start md:gap-6 text-sm text-gray-700 dark:text-gray-300"
                >
                  <div className="md:w-48 text-gray-500 dark:text-gray-400">
                    {normalizeDateForDisplay(item.date, lang)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {item.title}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">{item.description}</div>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <div className="text-gray-500 dark:text-gray-400">
                  {language === "km" ? "មិនមានសកម្មភាព" : "No activity to show yet."}
                </div>
              )}
            </div>
          </div>
        </section>

        {deliveryEntries.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {lang === "km" ? "គណនីដែលបានទិញ" : "Purchased Accounts"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {lang === "km"
                    ? "ព័ត៌មានដែលអ្នកគ្រប់គ្រងផ្តល់ឱ្យបន្ទាប់ពីបញ្ចប់។"
                    : "Credentials delivered after completion."}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadDelivery}
              >
                <Download className="w-4 h-4 mr-2" />
                {lang === "km" ? "ទាញយកទាំងអស់" : "Download all"}
              </Button>
            </div>

            <div className="space-y-3">
              {deliveryEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-gray-100 dark:border-gray-800 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {entry.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {lang === "km" ? "ចុចដើម្បីចម្លង" : "Copy to share safely"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyDelivery(entry.content)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      {lang === "km" ? "ចម្លង" : "Copy"}
                    </Button>
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 overflow-x-auto">
                    {entry.content}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {lang === "km" ? "ការជជែកជាមួយអ្នកគ្រប់គ្រង" : "Chat with admin"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {lang === "km"
                  ? "សួរពត៌មានបន្ថែម ឬគាំទ្របន្ថែមអំពីការបញ្ជាទិញនេះ។"
                  : "Ask questions or follow up about this order."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshChat}
                disabled={!chatEnabled}
              >
                {lang === "km" ? "ធ្វើបច្ចុប្បន្នភាព" : "Refresh"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenChatPage}
                disabled={!order || !chatEnabled}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                {lang === "km" ? "បើកបន្ទប់សន្ទនា" : "Open chat"}
              </Button>
            </div>
          </div>

          {!chatEnabled && (
            <div className="mb-3 text-sm text-amber-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>
                {lang === "km"
                  ? "ការជជែកនឹងអាចប្រើបានក្រោយពេលការបញ្ជាទិញបានបញ្ចប់។"
                  : "Chat becomes available once this order is completed."}
              </span>
            </div>
          )}
          {chatEnabled && chatError && (
            <div className="mb-3 text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{chatError}</span>
            </div>
          )}

          <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 max-h-72 overflow-y-auto space-y-3">
            {!chatEnabled ? (
              <div className="text-sm text-gray-500">
                {lang === "km"
                  ? "សូមរង់ចាំដល់ការបញ្ជាទិញបានបញ្ចប់ ដើម្បីទាក់ទងអ្នកលក់។"
                  : "Wait until the order is completed to contact the seller."}
              </div>
            ) : chatLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                {lang === "km" ? "កំពុងផ្ទុកសារ..." : "Loading messages..."}
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="text-sm text-gray-500">
                {lang === "km"
                  ? "មិនទាន់មានសារ។ សូមសារទៅកាន់អ្នកគ្រប់គ្រង។"
                  : "No messages yet. Send a note to the admin."}
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMine = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-lg rounded-2xl px-4 py-2 text-sm shadow ${
                        isMine
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      <div className="text-xs opacity-70 mb-1">
                        {msg.senderName ||
                          (isMine
                            ? lang === "km"
                              ? "អ្នក"
                              : "You"
                            : lang === "km"
                            ? "អ្នកគ្រប់គ្រង"
                            : "Admin")}
                      </div>
                      <p>{msg.body}</p>
                      <div className="text-[10px] opacity-70 mt-1">
                        {formatChatDate(msg.createdAt, lang)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 space-y-2">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={!chatEnabled}
              rows={3}
              placeholder={
                chatEnabled
                  ? lang === "km"
                    ? "វាយសាររបស់អ្នក..."
                    : "Type your message..."
                  : lang === "km"
                  ? "ការជជែកនឹងបើកក្រោយពេលបញ្ចប់"
                  : "Chat unlocks after completion"
              }
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSendChatMessage}
                disabled={!chatEnabled || chatSending || !chatInput.trim()}
              >
                {chatSending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {lang === "km" ? "ផ្ញើ" : "Send"}
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {language === "km" ? "មូលដ្ឋានទិញ" : "Purchased items"}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {items.length} {language === "km" ? "មុខ" : "item(s)"}
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((it) => (
              <div key={it.id} className="py-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <img
                    src={it.image_url ?? "/placeholder.png"}
                    alt={it.title}
                    className="w-20 h-20 rounded-xl object-cover border border-gray-100 dark:border-gray-800"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{it.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {language === "km" ? "បរិមាណ" : "Qty"}: {it.qty}
                      {it.duration_label ? ` • ${it.duration_label}` : ""}
                      {it.device_label ? ` • ${it.device_label}` : ""}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      ID #{it.id}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === "km" ? "តម្លៃ" : "Price"}
                  </p>
                  <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {formatPrice(it.unit_price * it.qty)}
                  </p>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="py-6 text-center text-gray-500 dark:text-gray-400">
                {language === "km" ? "មិនមានមុខទំនិញ" : "No items to display."}
              </div>
            )}
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {language === "km" ? "សង្ខេបការបញ្ជាទិញ" : "Order summary"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === "km"
                  ? "ព័ត៌មានគណនេយ្យសម្រាប់ការទូទាត់"
                  : "Billing breakdown for this order."}
              </p>
            </div>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>{language === "km" ? "សរុបរង" : "Subtotal"}</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === "km" ? "ពន្ធ" : "Tax"}</span>
                <span>{formatPrice(order.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-gray-900 dark:text-gray-100">
                <span>{language === "km" ? "សរុប" : "Total"}</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {language === "km" ? "ព័ត៌មានការទូទាត់" : "Payment info"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === "km"
                  ? "ព័ត៌មានដែលបានផ្តល់សម្រាប់ការទូទាត់"
                  : "Details you submitted for payment verification."}
              </p>
            </div>
            {payment ? (
              <dl className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex justify-between">
                  <dt>{language === "km" ? "ឈ្មោះគណនី" : "Account name"}</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">
                    {payment.account_id}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>{language === "km" ? "លេខគណនី" : "Account number"}</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">
                    {payment.payment_id}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>{language === "km" ? "លេខ Apv" : "Payment Apv"}</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">
                    {payment.payment_apv}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>{language === "km" ? "ថ្ងៃទូទាត់" : "Paid at"}</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">
                    {normalizeDateForDisplay(payment.paid_at, lang)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>{language === "km" ? "វិធីសាស្ត្រ" : "Method"}</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">
                    {payment.method}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                {language === "km"
                  ? "មិនទាន់មានព័ត៌មានការបង់ប្រាក់"
                  : "No payment info submitted yet."}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
