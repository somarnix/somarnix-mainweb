"use client";
// gstechedukh\app\pages\chat\ChatPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Edit3,
  Loader2,
  MessageCircle,
  MoreVertical,
  Pin,
  Search,
  Send,
  Smile,
  SmilePlus,
  Sticker,
  Trash2,
  X,
} from "lucide-react";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";

type PresenceInfo = {
  status: string | null;
  lastActiveAt: string | null;
};

type Participant = {
  id: number | null;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  presence?: PresenceInfo;
};

type ConversationSummary = {
  id: number;
  orderId: number;
  orderNumber: string;
  state: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageFromAdmin: boolean;
  lastMessageType?: "text" | "sticker" | "emoji" | null;
  lastStickerPath?: string | null;
  buyer: Participant & { id: number; email: string };
  seller: Participant;
  unreadCount: number;
};

type ConversationDetail = {
  id: number;
  orderId: number;
  orderNumber: string;
  topic: string;
  lastMessageAt: string | null;
  buyer: Participant & { id: number; email: string };
  seller: Participant;
};

type MessageReaction = {
  emoji: string;
  count: number;
  reacted: boolean;
};

type ChatMessage = {
  id: number;
  senderId: number;
  body: string;
  attachmentUrl: string | null;
  createdAt: string | null;
  isAdmin: boolean;
  type: "text" | "sticker" | "emoji";
  stickerPath: string | null;
  deletedAt: string | null;
  deletedBy?: number | null;
  buyerSeenAt?: string | null;
  sellerSeenAt?: string | null;
  isPinned: boolean;
  editedAt: string | null;
  editedBy?: number | null;
  sender: {
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  reactions: MessageReaction[];
};

type StickerPack = {
  id: string;
  label: string;
  cover?: string | null;
  stickers: string[];
};

interface ChatPageProps {
  onNavigate: (page: string) => void;
  initialOrderId?: number | null;
  onOpenOrderDetail?: (orderId: number) => void;
  onInitialOrderConsumed?: () => void;
  onOpenConversation?: (orderId: number) => void;
  hideList?: boolean;
}

const QUICK_EMOJI = ["😀", "😂", "😍", "😎", "🙏", "👍", "🔥", "🎉"];
const PRESENCE_WINDOW_MS = 5 * 60 * 1000;

const isPresenceOnline = (presence?: PresenceInfo) => {
  if (!presence) return false;
  if (presence.status === "online") return true;
  if (presence.status === "offline") return false;
  if (presence.lastActiveAt) {
    const last = new Date(presence.lastActiveAt).getTime();
    if (!Number.isNaN(last)) {
      return Date.now() - last <= PRESENCE_WINDOW_MS;
    }
  }
  return false;
};

function formatRelative(date: string | null, lang: "en" | "km") {
  if (!date) return lang === "km" ? "មិនទាន់មាន" : "No messages";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleString(lang === "km" ? "km-KH" : undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const resolveDisplayName = (
  ...candidates: Array<string | null | undefined>
) => {
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return null;
};

function normalizePresence(
  source?: { status?: string | null; lastActiveAt?: string | null },
  fallbackStatus?: string | null,
  fallbackLastActive?: string | null
): PresenceInfo | undefined {
  const status = source?.status ?? fallbackStatus ?? null;
  const rawLastActive = source?.lastActiveAt ?? fallbackLastActive ?? null;
  const lastActive =
    rawLastActive instanceof Date
      ? rawLastActive.toISOString()
      : rawLastActive;
  if (!status && !lastActive) {
    return undefined;
  }
  return {
    status,
    lastActiveAt: lastActive,
  };
}

export function ChatPage({
  onNavigate,
  initialOrderId = null,
  onOpenOrderDetail,
  onInitialOrderConsumed,
  onOpenConversation,
  hideList = false,
}: ChatPageProps) {
  const { language } = useLanguage();
  const lang: "en" | "km" = language === "km" ? "km" : "en";
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const fallbackAdminLabel = lang === "km" ? "អ្នកគ្រប់គ្រង" : "Admin";
  const fallbackBuyerLabel = lang === "km" ? "អតិថិជន" : "Buyer";

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(
    null
  );
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [stickerPacks, setStickerPacks] = useState<StickerPack[]>([]);
  const [activePackId, setActivePackId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const [reactionPickerFor, setReactionPickerFor] = useState<number | null>(null);
  const [reactingMessageId, setReactingMessageId] = useState<number | null>(null);
  const [messageMenuId, setMessageMenuId] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [savingEditId, setSavingEditId] = useState<number | null>(null);
  const [pinningMessageId, setPinningMessageId] = useState<number | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const queryHandledRef = useRef(false);

  const filteredConversations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((conv) => {
      const buyerMatch = conv.buyer.name?.toLowerCase().includes(term);
      const sellerMatch = conv.seller.name?.toLowerCase().includes(term);
      const orderMatch = conv.orderNumber.toLowerCase().includes(term);
      return buyerMatch || sellerMatch || orderMatch;
    });
  }, [conversations, searchTerm]);

  const activeStickerPack = useMemo(() => {
    const found = stickerPacks.find((pack) => pack.id === activePackId);
    return found || stickerPacks[0] || null;
  }, [stickerPacks, activePackId]);

  const pinnedMessages = useMemo(
    () => messages.filter((msg) => msg.isPinned && !msg.deletedAt),
    [messages]
  );
  const activeCounterpart = useMemo(() => {
    if (!selectedConversation) return null;
    return isAdmin ? selectedConversation.buyer : selectedConversation.seller;
  }, [isAdmin, selectedConversation]);
  const lastSeenMessageId = useMemo(() => {
    if (!user?.id) return null;
    let seenId: number | null = null;
    for (const msg of messages) {
      if (msg.senderId !== user.id) continue;
      const seenAt = isAdmin ? msg.buyerSeenAt : msg.sellerSeenAt;
      if (seenAt) {
        seenId = msg.id;
      }
    }
    return seenId;
  }, [messages, user?.id, isAdmin]);

  const refreshConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const res = await fetch("/api/chats", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : lang === "km"
            ? "មិនអាចទាញបញ្ជីការសន្ទនាឡើងបានទេ"
            : "Unable to load conversations."
        );
      }
      const normalized: ConversationSummary[] = (Array.isArray(
        data.conversations
      )
        ? data.conversations
        : []
      ).map((raw: any) => {
        const buyerPresence = normalizePresence(
          raw.buyer?.presence,
          raw.buyer_status,
          raw.buyer_last_active_at
        );
        const sellerPresence = normalizePresence(
          raw.seller?.presence,
          raw.seller_status,
          raw.seller_last_active_at
        );
        return {
          id: Number(raw.id ?? raw.conversation_id ?? 0),
          orderId: Number(raw.orderId ?? raw.order_id ?? 0),
          orderNumber: String(raw.orderNumber ?? raw.order_number ?? ""),
          state: raw.state ?? null,
          lastMessage: raw.lastMessage ?? raw.last_body ?? null,
          lastMessageAt: raw.lastMessageAt ?? raw.last_created_at ?? null,
          lastMessageFromAdmin: !!(
            raw.lastMessageFromAdmin ??
            raw.last_is_admin
          ),
          lastMessageType: raw.lastMessageType ?? raw.last_message_type ?? null,
          lastStickerPath:
            raw.lastStickerPath ?? raw.last_sticker_path ?? null,
          buyer: {
            id: Number(raw.buyer?.id ?? raw.user_id ?? 0),
            name: raw.buyer?.name ?? raw.buyer_name ?? raw.buyer?.email ?? null,
            email: raw.buyer?.email ?? raw.buyer_email ?? "",
            avatarUrl: raw.buyer?.avatarUrl ?? raw.buyer_avatar ?? null,
            presence: buyerPresence,
          },
          seller: {
            id: raw.seller?.id ?? raw.seller_id ?? null,
            name:
              raw.seller?.name ??
              raw.seller_name ??
              raw.seller?.email ??
              null,
            email: raw.seller?.email ?? raw.seller_email ?? null,
            avatarUrl: raw.seller?.avatarUrl ?? raw.seller_avatar ?? null,
            presence: sellerPresence,
          },
          unreadCount: Number(raw.unreadCount ?? raw.unread_count ?? 0),
        };
      });
      setConversations(normalized);
      setConversationsError(null);
    } catch (err) {
      setConversations([]);
      setConversationsError(
        err instanceof Error
          ? err.message
          : lang === "km"
          ? "មិនអាចទាញបញ្ជីការសន្ទនាឡើងបានទេ"
          : "Unable to load conversations."
      );
    } finally {
      setConversationsLoading(false);
    }
  }, [lang]);

  const loadStickerPacks = useCallback(async () => {
    try {
      const res = await fetch("/api/stickers", { cache: "no-store" });
      const data = await res.json();
      const packs: StickerPack[] = Array.isArray(data.packs)
        ? data.packs
        : [];
      setStickerPacks(packs);
      setActivePackId((prev) => prev ?? packs[0]?.id ?? null);
    } catch {
      setStickerPacks([]);
    }
  }, []);

  const loadConversation = useCallback(
    async (orderId: number) => {
      setMessagesLoading(true);
      try {
        const res = await fetch(`/api/orders/${orderId}/chat`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof data?.error === "string"
              ? data.error
              : lang === "km"
              ? "មិនអាចទាញសារបានទេ"
              : "Unable to load chat messages."
          );
        }
        setSelectedConversation(data.conversation ?? null);
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setConversations((prev) =>
          prev.map((conv) =>
            conv.orderId === orderId ? { ...conv, unreadCount: 0 } : conv
          )
        );
        setMessageError(null);
      } catch (err) {
        setSelectedConversation(null);
        setMessages([]);
        setMessageError(
          err instanceof Error
            ? err.message
            : lang === "km"
            ? "មិនអាចទាញសារបានទេ"
            : "Unable to load chat messages."
        );
      } finally {
        setMessagesLoading(false);
      }
    },
    [lang]
  );

  const handleSelectConversation = (conversation: ConversationSummary) => {
    if (onOpenConversation) {
      onOpenConversation(conversation.orderId);
      return;
    }
    setConversations((prev) =>
      prev.map((conv) =>
        conv.orderId === conversation.orderId ? { ...conv, unreadCount: 0 } : conv
      )
    );
    setReactionPickerFor(null);
    loadConversation(conversation.orderId);
  };

  const sendChatPayload = async (payload: {
    message: string;
    type?: "text" | "emoji" | "sticker";
    stickerPath?: string | null;
  }) => {
    if (!selectedConversation) return;
    setSending(true);
    try {
      const res = await fetch(`/api/orders/${selectedConversation.orderId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed");
      }
      if (data.message) {
        setMessages((prev) => [...prev, data.message as ChatMessage]);
      }
      setMessageInput("");
      refreshConversations();
    } catch (err) {
      setMessageError(
        err instanceof Error
          ? err.message
          : lang === "km"
          ? "មិនអាចផ្ញើសារបានទេ"
          : "Unable to send message"
      );
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    const text = messageInput.trim();
    if (!text || !selectedConversation) return;
    await sendChatPayload({ message: text, type: emojiOpen ? "emoji" : "text" });
    setEmojiOpen(false);
    setStickerOpen(false);
    setReactionPickerFor(null);
  };

  const handleSendSticker = async (stickerPath: string) => {
    if (!selectedConversation) return;
    await sendChatPayload({ message: "", type: "sticker", stickerPath });
    setStickerOpen(false);
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!selectedConversation) return;
    setDeletingMessageId(messageId);
    try {
      const res = await fetch(`/api/orders/${selectedConversation.orderId}/chat`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : lang === "km"
            ? "មិនអាចលុបសារបានទេ"
            : "Unable to delete message"
        );
      }
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, deletedAt: new Date().toISOString(), body: "", stickerPath: null, reactions: [], isPinned: false }
            : msg
        )
      );
      refreshConversations();
    } catch (err) {
      setMessageError(
        err instanceof Error
          ? err.message
          : lang === "km"
          ? "មិនអាចលុបសារ"
          : "Unable to delete message"
      );
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleToggleReaction = async (messageId: number, emoji: string) => {
    if (!selectedConversation || !emoji) return;
    setReactingMessageId(messageId);
    try {
      const res = await fetch(`/api/orders/${selectedConversation.orderId}/chat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : lang === "km"
            ? "មិនអាចធ្វើប្រតិកម្មបានទេ"
            : "Unable to react to message"
        );
      }
      if (Array.isArray(data.reactions)) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, reactions: data.reactions } : msg
          )
        );
      }
    } catch (err) {
      setMessageError(
        err instanceof Error
          ? err.message
          : lang === "km"
          ? "មិនអាចធ្វើប្រតិកម្មបានទេ"
          : "Unable to react to message"
      );
    } finally {
      setReactingMessageId(null);
      setReactionPickerFor(null);
    }
  };

  const handleTogglePin = async (message: ChatMessage) => {
    if (!selectedConversation) return;
    setPinningMessageId(message.id);
    try {
      const res = await fetch(`/api/orders/${selectedConversation.orderId}/chat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id, action: "pin", pinned: !message.isPinned }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : lang === "km"
            ? "មិនអាចបិទភ្ជាប់សារ"
            : "Unable to pin message"
        );
      }
      if (data.message) {
        const updated = data.message as ChatMessage;
        setMessages((prev) => prev.map((msg) => (msg.id === updated.id ? updated : msg)));
      }
    } catch (err) {
      setMessageError(
        err instanceof Error
          ? err.message
          : lang === "km"
          ? "មិនអាចបិទភ្ជាប់សារ"
          : "Unable to pin message"
      );
    } finally {
      setPinningMessageId(null);
      setMessageMenuId((prev) => (prev === message.id ? null : prev));
    }
  };

  const handleStartEdit = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditingValue(message.body);
    setMessageMenuId(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingValue("");
  };

  const handleSaveEdit = async () => {
    if (!selectedConversation || editingMessageId === null) return;
    const trimmed = editingValue.trim();
    if (!trimmed) {
      setMessageError(
        lang === "km" ? "សូមបញ្ចូលអត្ថបទថ្មី" : "Please provide the updated message."
      );
      return;
    }
    setSavingEditId(editingMessageId);
    try {
      const res = await fetch(`/api/orders/${selectedConversation.orderId}/chat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: editingMessageId, action: "edit", body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : lang === "km"
            ? "មិនអាចកែសារបានទេ"
            : "Unable to edit message"
        );
      }
      if (data.message) {
        const updated = data.message as ChatMessage;
        setMessages((prev) => prev.map((msg) => (msg.id === updated.id ? updated : msg)));
      }
      setEditingMessageId(null);
      setEditingValue("");
    } catch (err) {
      setMessageError(
        err instanceof Error
          ? err.message
          : lang === "km"
          ? "មិនអាចកែសារបានទេ"
          : "Unable to edit message"
      );
    } finally {
      setSavingEditId(null);
    }
  };

  useEffect(() => {
    refreshConversations();
    loadStickerPacks();
  }, [refreshConversations, loadStickerPacks]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!initialOrderId) return;
    loadConversation(initialOrderId).then(() => {
      onInitialOrderConsumed?.();
    });
  }, [initialOrderId, loadConversation, onInitialOrderConsumed]);

  useEffect(() => {
    if (hideList) return;
    if (!onOpenConversation) return;
    if (queryHandledRef.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const orderParam = params.get("orderId");
    if (!orderParam) return;
    const numeric = Number(orderParam);
    if (!Number.isNaN(numeric)) {
      queryHandledRef.current = true;
      onOpenConversation(numeric);
    }
  }, [hideList, onOpenConversation]);

  useEffect(() => {
    const handler = () => setMessageMenuId(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-4 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {lang === "km" ? "បន្ទប់សន្ទនា" : "Support inbox"}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {lang === "km" ? "សន្ទនាជាមួយអ្នកគ្រប់គ្រង" : "Chat with admins"}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onNavigate(hideList ? "chat" : "orders")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {hideList
                ? lang === "km"
                  ? "ត្រឡប់ទៅបញ្ជី"
                  : "Back to chats"
                : lang === "km"
                ? "ត្រឡប់ទៅការបញ្ជាទិញ"
                : "Back to orders"}
            </Button>
            <Button variant="outline" onClick={refreshConversations}>
              {lang === "km" ? "ធ្វើបច្ចុប្បន្នភាព" : "Refresh"}
            </Button>
          </div>
        </div>

        <div
          className={
            hideList
              ? "space-y-6"
              : `grid grid-cols-1 gap-6 ${
                  selectedConversation ? "lg:grid-cols-[360px,minmax(0,1fr)]" : "lg:grid-cols-[360px,minmax(0,1fr)]"
                }`
          }
        >
          {!hideList && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 flex flex-col">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  lang === "km"
                    ? "ស្វែងរកតាម Order ID ឬអ៊ីមែល"
                    : "Search by order or email"
                }
                className="pl-9"
              />
            </div>

            {conversationsError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-4">
                <AlertCircle className="w-4 h-4" />
                <span>{conversationsError}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2">
              {conversationsLoading ? (
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {lang === "km" ? "កំពុងផ្ទុក..." : "Loading conversations..."}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-sm text-gray-500">
                  {lang === "km" ? "មិនមានការសន្ទនាទេ" : "No conversations yet."}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isActive = selectedConversation?.orderId === conv.orderId;
                  const counterpart = isAdmin ? conv.buyer : conv.seller;
                  const fallbackLabel = isAdmin ? fallbackBuyerLabel : fallbackAdminLabel;
                  const displayName =
                    resolveDisplayName(counterpart?.name, counterpart?.email) ??
                    fallbackLabel;
                  const avatarLetter = displayName.slice(0, 2).toUpperCase();
                  const online = isPresenceOnline(counterpart?.presence);
                  const isUnread = conv.unreadCount > 0;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        isActive
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                          : "border-gray-200 dark:border-gray-800 hover:border-blue-400"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {counterpart?.avatarUrl ? (
                            <img
                              src={counterpart.avatarUrl}
                              alt={displayName}
                              className="w-10 h-10 rounded-full object-cover border border-blue-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold">
                              {avatarLetter}
                            </div>
                          )}
                          {online && (
                            <span className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-sm font-semibold truncate ${
                              isUnread
                                ? "text-blue-600 dark:text-blue-300"
                                : "text-gray-900 dark:text-gray-100"
                            }`}
                          >
                            {displayName}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {lang === "km" ? "លេខបញ្ជាទិញ" : "Order"} {conv.orderNumber}
                          </div>
                          <div
                            className={`mt-1 text-xs line-clamp-2 ${
                              isUnread
                                ? "text-gray-900 dark:text-gray-100"
                                : "text-gray-500"
                            }`}
                          >
                            {conv.lastMessageType === "sticker"
                              ? lang === "km"
                                ? "ស្ទីក័រ"
                                : "Sticker"
                              : conv.lastMessage || (lang === "km" ? "គ្មានសារ" : "No message yet")}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[11px] text-gray-400">
                            {formatRelative(conv.lastMessageAt, lang)}
                          </span>
                          {isUnread && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs">
                              {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          )}

          {selectedConversation && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow flex flex-col">
              <div className="border-b border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const party = isAdmin
                      ? selectedConversation.buyer
                      : selectedConversation.seller;
                    const fallbackLabel = isAdmin ? fallbackBuyerLabel : fallbackAdminLabel;
                    const name =
                      resolveDisplayName(party?.name, party?.email) ?? fallbackLabel;
                    const initials = name.slice(0, 2).toUpperCase();
                    const online = isPresenceOnline(party?.presence);
                    return (
                      <div className="relative">
                        {party?.avatarUrl ? (
                          <img
                            src={party.avatarUrl}
                            alt={name}
                            className="w-10 h-10 rounded-full object-cover border border-blue-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold">
                            {initials}
                          </div>
                        )}
                        {online && (
                          <span className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900" />
                        )}
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-xs uppercase text-gray-500">
                      {isAdmin ? fallbackBuyerLabel : fallbackAdminLabel}
                    </p>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {(isAdmin
                        ? resolveDisplayName(
                            selectedConversation.buyer?.name,
                            selectedConversation.buyer?.email
                          )
                        : resolveDisplayName(
                            selectedConversation.seller?.name,
                            selectedConversation.seller?.email
                          )) ??
                        (isAdmin ? fallbackBuyerLabel : fallbackAdminLabel)}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {lang === "km" ? "លេខបញ្ជាទិញ" : "Order"}{" "}
                      {selectedConversation.orderNumber}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {onOpenOrderDetail && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenOrderDetail(selectedConversation.orderId)}
                    >
                      {lang === "km" ? "មើលការបញ្ជាទិញ" : "View order"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadConversation(selectedConversation.orderId)}
                  >
                    {lang === "km" ? "ធ្វើបច្ចុប្បន្នភាព" : "Refresh"}
                  </Button>
                </div>
              </div>

              <div ref={messageListRef} className="overflow-y-auto p-4 space-y-4 h-200 scroll-y-12">
                {messagesLoading ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {lang === "km" ? "កំពុងផ្ទុកសារ..." : "Loading messages..."}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-gray-500 text-sm">
                    {lang === "km"
                      ? "មិនមានសារទេ។ សូមចាប់ផ្តើមសន្ទនា!"
                      : "No messages yet. Say hi!"}
                  </div>
                ) : (
                  <>
                    {pinnedMessages.length > 0 && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Pin className="w-4 h-4" />
                          <span>
                            {lang === "km" ? "សារបិទភ្ជាប់" : "Pinned messages"} (
                            {pinnedMessages.length})
                          </span>
                        </div>
                        <span className="text-xs text-amber-500 dark:text-amber-200">
                          {lang === "km"
                            ? "បង្ហាញនៅលើកំពូល"
                            : "Highlighted for quick access"}
                        </span>
                      </div>
                    )}

                    {messages.map((msg) => {
                      const isMine = msg.senderId === user?.id;
                      const senderLabel = isMine
                        ? lang === "km"
                          ? "អ្នក"
                          : "You"
                        : msg.sender?.name ||
                          msg.sender?.email ||
                          (msg.isAdmin
                            ? lang === "km"
                              ? "អ្នកគ្រប់គ្រង"
                              : "Admin"
                            : lang === "km"
                            ? "អ្នកប្រើ"
                            : "User");
                      const wasSeen =
                        isMine && (isAdmin ? msg.buyerSeenAt : msg.sellerSeenAt);
                      const isDeleted = !!msg.deletedAt;
                      const counterpartFallback = isAdmin
                        ? fallbackBuyerLabel
                        : fallbackAdminLabel;
                      const counterpartName =
                        resolveDisplayName(
                          activeCounterpart?.name,
                          activeCounterpart?.email
                        ) ?? counterpartFallback;
                      const showSeenAvatar =
                        isMine &&
                        msg.id === lastSeenMessageId &&
                        !!activeCounterpart &&
                        wasSeen;
                      const counterpartInitials =
                        counterpartName.slice(0, 2).toUpperCase() || "👤";
                      const seenAvatarElement = activeCounterpart?.avatarUrl ? (
                        <img
                          src={activeCounterpart.avatarUrl}
                          alt={counterpartName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-semibold">
                          {counterpartInitials}
                        </div>
                      );
                      const initials =
                        (msg.sender?.name ||
                          msg.sender?.email ||
                          (msg.isAdmin
                            ? lang === "km"
                              ? "អ្នកគ្រប់គ្រង"
                              : "Admin"
                            : lang === "km"
                            ? "អ្នកប្រើ"
                            : "User"))?.slice(0, 2).toUpperCase() || "👤";
                      const avatarNode = (
                        <div className="relative">
                          {msg.sender?.avatarUrl ? (
                            <img
                              src={msg.sender.avatarUrl}
                              alt={senderLabel ?? ""}
                              className="w-9 h-9 rounded-full object-cover border border-blue-100"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center text-xs font-semibold">
                              {initials}
                            </div>
                          )}
                        </div>
                      );

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-3 ${isMine ? "justify-end" : ""}`}
                        >
                          {!isMine && avatarNode}
                          <div
                            className={`group flex flex-col gap-1 max-w-xl ${
                              isMine ? "items-end" : "items-start"
                            }`}
                          >
                            <div className="relative w-full group/message">
                              {msg.isPinned && !isDeleted && (
                                <span
                                  className={`absolute -top-3 ${
                                    isMine ? "right-8" : "left-8"
                                  } inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-300`}
                                >
                                  <Pin className="w-3 h-3" />
                                  {lang === "km" ? "បានបិទភ្ជាប់" : "Pinned"}
                                </span>
                              )}
                              <div
                                className={`rounded-2xl px-4 py-2 text-sm shadow ${
                                  isMine
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                } ${isDeleted ? "italic opacity-70" : ""}`}
                              >
                                <div
                                  className={`text-xs mb-1 ${
                                    isMine ? "text-white/70" : "text-gray-500"
                                  }`}
                                >
                                  {senderLabel}
                                </div>
                                {isDeleted ? (
                                  <p>
                                    {isMine
                                      ? lang === "km"
                                        ? "អ្នកបានលុបសារនេះ"
                                        : "You unsent this message."
                                      : lang === "km"
                                      ? "សារនេះត្រូវបានលុប"
                                      : "This message was removed."}
                                  </p>
                                ) : msg.type === "sticker" && msg.stickerPath ? (
                                  <img
                                    src={msg.stickerPath}
                                    alt="Sticker"
                                    className="max-h-48 rounded-lg object-contain"
                                  />
                                ) : (
                                  <p>{msg.body}</p>
                                )}
                              </div>

                              {msg.reactions.length > 0 && (
                                <div
                                  className={`absolute -bottom-3 ${
                                    isMine ? "right-6" : "left-6"
                                  }`}
                                >
                                  <div className="flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/90 px-2 py-0.5 text-xs shadow">
                                    {msg.reactions.map((reaction) => (
                                      <span
                                        key={`${msg.id}-${reaction.emoji}`}
                                        className="flex items-center gap-1 leading-none"
                                      >
                                        <span>{reaction.emoji}</span>
                                        {reaction.count > 1 && (
                                          <span className="text-[10px] font-semibold">
                                            {reaction.count}
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {!isDeleted && (
                                <div
                                  className={`absolute ${
                                    isMine ? "right-2" : "left-2"
                                  } -top-2 hidden group-hover/message:block`}
                                >
                                  <button
                                    className={`p-1 rounded-full ${
                                      isMine
                                        ? "text-white/80 hover:bg-white/20"
                                        : "text-gray-500 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMessageMenuId((prev) =>
                                        prev === msg.id ? null : msg.id
                                      );
                                    }}
                                    title={lang === "km" ? "ជម្រើស" : "More actions"}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                </div>
                              )}

                              {messageMenuId === msg.id && !isDeleted && (
                                <div
                                  className={`absolute z-20 mt-2 w-44 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow ${
                                    isMine ? "right-0" : "left-0"
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                                    onClick={() => handleTogglePin(msg)}
                                    disabled={pinningMessageId === msg.id}
                                  >
                                    {pinningMessageId === msg.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Pin className="w-4 h-4" />
                                    )}
                                    <span>
                                      {msg.isPinned
                                        ? lang === "km"
                                          ? "ដោះបិទភ្ជាប់"
                                          : "Unpin"
                                        : lang === "km"
                                        ? "បិទភ្ជាប់"
                                        : "Pin message"}
                                    </span>
                                  </button>
                                  {isMine && msg.type !== "sticker" && (
                                    <button
                                      className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                                      onClick={() => handleStartEdit(msg)}
                                    >
                                      <Edit3 className="w-4 h-4" />
                                      <span>{lang === "km" ? "កែសារ" : "Edit message"}</span>
                                    </button>
                                  )}
                                  {isMine && (
                                    <button
                                      className="w-full px-3 py-2 flex items-center gap-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      disabled={deletingMessageId === msg.id}
                                    >
                                      {deletingMessageId === msg.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                      <span>{lang === "km" ? "លុប" : "Remove"}</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div
                              className={`flex items-center gap-2 text-[11px] ${
                                isMine ? "text-white/70 justify-end" : "text-gray-500"
                              }`}
                            >
                              <span>{formatRelative(msg.createdAt, lang)}</span>
                              {isMine && (
                                <span className="inline-flex items-center gap-1">
                                  {wasSeen ? (
                                    <CheckCheck className="w-3 h-3" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                  {wasSeen
                                    ? lang === "km"
                                      ? "បានឃើញ"
                                      : "Seen"
                                    : lang === "km"
                                    ? "បានផ្ញើ"
                                    : "Delivered"}
                                </span>
                              )}
                              {msg.editedAt && !isDeleted && (
                                <span className="italic">
                                  {lang === "km" ? "បានកែប្រែ" : "Edited"}
                                </span>
                              )}
                              {!isDeleted && (
                                <button
                                  className={`ml-1 p-1 rounded-full ${
                                    isMine ? "text-white/80" : "text-gray-400"
                                  } hover:bg-gray-200/60 dark:hover:bg-gray-700`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReactionPickerFor((prev) =>
                                      prev === msg.id ? null : msg.id
                                    );
                                  }}
                                  disabled={reactingMessageId === msg.id}
                                  title={lang === "km" ? "ប្រតិកម្ម" : "React"}
                                >
                                  <SmilePlus className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {reactionPickerFor === msg.id && !isDeleted && (
                              <div
                                className={`flex flex-wrap gap-2 rounded-xl px-3 py-2 text-lg ${
                                  isMine
                                    ? "justify-end bg-blue-50"
                                    : "justify-start bg-gray-100 dark:bg-gray-800"
                                }`}
                              >
                                {QUICK_EMOJI.map((emoji) => (
                                  <button
                                    key={`${msg.id}-${emoji}`}
                                    onClick={() => handleToggleReaction(msg.id, emoji)}
                                    className="hover:scale-110 transition"
                                    disabled={reactingMessageId === msg.id}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}

                            {editingMessageId === msg.id && !isDeleted && msg.type !== "sticker" && (
                              <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-2">
                                <Textarea
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  rows={3}
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    className="text-gray-600 dark:text-gray-300"
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    {lang === "km" ? "បោះបង់" : "Cancel"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={handleSaveEdit}
                                    disabled={savingEditId === msg.id}
                                  >
                                    {savingEditId === msg.id ? (
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4 mr-1" />
                                    )}
                                    {lang === "km" ? "រក្សាទុក" : "Save"}
                                  </Button>
                                </div>
                              </div>
                            )}
                            {showSeenAvatar && (
                              <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1">
                                <div className="w-5 h-5 rounded-full overflow-hidden border border-white shadow">
                                  {seenAvatarElement}
                                </div>
                                <span>{lang === "km" ? "បានឃើញ" : "Seen"}</span>
                              </div>
                            )}
                          </div>
                          {isMine && avatarNode}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {messageError && (
                <div className="px-4 text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{messageError}</span>
                </div>
              )}

              <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEmojiOpen((prev) => !prev);
                      setStickerOpen(false);
                    }}
                    className={`p-2 rounded-full border ${
                      emojiOpen
                        ? "border-blue-500 text-blue-500"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                    title={lang === "km" ? "អារម្មណ៍" : "Emoji"}
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setStickerOpen((prev) => !prev);
                      setEmojiOpen(false);
                    }}
                    className={`p-2 rounded-full border ${
                      stickerOpen
                        ? "border-blue-500 text-blue-500"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                    title={lang === "km" ? "ស្ទីក័រ" : "Stickers"}
                  >
                    <Sticker className="w-4 h-4" />
                  </button>
                </div>

                {emojiOpen && (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 flex flex-wrap gap-2">
                    {QUICK_EMOJI.map((emoji) => (
                      <button
                        key={emoji}
                        className="text-xl"
                        onClick={() => setMessageInput((prev) => `${prev}${emoji}`)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {stickerOpen && activeStickerPack && (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 space-y-3 max-h-72 overflow-y-auto">
                    <div className="flex gap-2 flex-wrap items-center">
                      {stickerPacks.map((pack) => {
                        const isActivePack = pack.id === activeStickerPack.id;
                        return (
                          <button
                            key={pack.id}
                            onClick={() => setActivePackId(pack.id)}
                            className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium transition ${
                              isActivePack
                                ? "border-blue-500 bg-blue-50 text-blue-600"
                                : "border-transparent bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-200"
                            }`}
                          >
                            {pack.cover ? (
                              <img
                                src={pack.cover}
                                alt={pack.label}
                                className="w-6 h-6 rounded-full object-cover border border-gray-200"
                              />
                            ) : (
                              <Sticker className="w-4 h-4" />
                            )}
                            <span>{pack.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {activeStickerPack.stickers.map((sticker) => (
                        <button
                          key={sticker}
                          onClick={() => handleSendSticker(sticker)}
                          className="bg-white dark:bg-gray-900 rounded-lg p-1 hover:scale-105 transition"
                        >
                          <img src={sticker} alt="Sticker" className="max-h-20 mx-auto" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  rows={3}
                  placeholder={
                    lang === "km"
                      ? "វាយសាររបស់អ្នកទីនេះ..."
                      : "Type your message..."
                  }
                />
                <div className="flex justify-end">
                  <Button onClick={handleSendMessage} disabled={sending || !messageInput.trim()}>
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {lang === "km" ? "ផ្ញើ" : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
