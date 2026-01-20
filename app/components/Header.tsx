// app\components\Header.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingCart, Menu, X, Search, User, Globe, Moon, Sun, LogOut, Settings, BookOpen, Wallet, DollarSign, Package, FileText, Layers, ChevronRight, Facebook, Youtube, Send, MessageCircle, Loader2, Smile, SmilePlus, Sticker, Pin, ArrowLeft, MoreVertical, Edit3, Trash2, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
const PRESENCE_WINDOW_MS = 5 * 60 * 1000;

const isPresenceOnline = (
  status?: string | null,
  lastActive?: string | null
) => {
  if (status === "online") return true;
  if (status === "offline") return false;
  if (lastActive) {
    const parsed = new Date(lastActive).getTime();
    if (!Number.isNaN(parsed)) {
      return Date.now() - parsed <= PRESENCE_WINDOW_MS;
    }
  }
  return false;
};

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

type HeaderChatParticipant = {
  id: number | null;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  online: boolean;
};

type HeaderChatSummary = {
  orderId: number;
  orderNumber: string;
  buyer: HeaderChatParticipant;
  seller: HeaderChatParticipant;
  sellerName?: string | null;
  sellerAvatar?: string | null;
  sellerOnline?: boolean | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageType?: string | null;
  lastStickerPath?: string | null;
  unreadCount: number;
};

type MessageReaction = {
  emoji: string;
  count: number;
  reacted: boolean;
};

type HeaderChatMessage = {
  id: number;
  senderId: number;
  body: string;
  createdAt: string | null;
  senderName: string | null;
  type?: "text" | "sticker" | "emoji";
  stickerPath?: string | null;
  deletedAt?: string | null;
  reactions: MessageReaction[];
  senderAvatar?: string | null;
  editedAt?: string | null;
  isPinned?: boolean;
  buyerSeenAt?: string | null;
  sellerSeenAt?: string | null;
};

type StickerPack = {
  id: string;
  label: string;
  cover?: string | null;
  stickers: string[];
};

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  cartCount: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  onOpenChat: (orderId: number) => void;
}

export function Header({
  onNavigate,
  currentPage,
  cartCount,
  sidebarOpen,
  setSidebarOpen,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  onOpenChat,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountPopupOpen, setAccountPopupOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { currency, setCurrency, formatPrice, balance } = useCurrency();
  const isAdmin = user?.role === 'admin';
  const [hasChatActivity, setHasChatActivity] = useState(false);
  const [chatWidgetOpen, setChatWidgetOpen] = useState(false);
  const [chatWidgetLoading, setChatWidgetLoading] = useState(false);
  const [chatWidgetConversations, setChatWidgetConversations] = useState<HeaderChatSummary[]>([]);
  const [chatWidgetActive, setChatWidgetActive] = useState<HeaderChatSummary | null>(null);
  const [chatWidgetMessages, setChatWidgetMessages] = useState<HeaderChatMessage[]>([]);
  const [chatWidgetInput, setChatWidgetInput] = useState("");
  const [chatWidgetError, setChatWidgetError] = useState<string | null>(null);
  const [chatWidgetSending, setChatWidgetSending] = useState(false);
  const [chatWidgetMessagesLoading, setChatWidgetMessagesLoading] = useState(false);
  const [chatWidgetEmojiOpen, setChatWidgetEmojiOpen] = useState(false);
  const [chatWidgetStickerOpen, setChatWidgetStickerOpen] = useState(false);
  const [chatWidgetStickerPacks, setChatWidgetStickerPacks] = useState<StickerPack[]>([]);
  const [chatWidgetActivePackId, setChatWidgetActivePackId] = useState<string | null>(null);
  const [chatWidgetReactionFor, setChatWidgetReactionFor] = useState<number | null>(null);
  const [chatWidgetReactingId, setChatWidgetReactingId] = useState<number | null>(null);
  const [chatWidgetMenuId, setChatWidgetMenuId] = useState<number | null>(null);
  const [chatWidgetDeletingId, setChatWidgetDeletingId] = useState<number | null>(null);
  const [chatWidgetPinningId, setChatWidgetPinningId] = useState<number | null>(null);
  const [chatWidgetEditingId, setChatWidgetEditingId] = useState<number | null>(null);
  const [chatWidgetEditingValue, setChatWidgetEditingValue] = useState("");
  const [chatWidgetSavingEditId, setChatWidgetSavingEditId] = useState<number | null>(null);
  const chatWidgetRef = useRef<HTMLDivElement | null>(null);
  const chatWidgetMessagesRef = useRef<HTMLDivElement | null>(null);
  const chatWidgetPinnedMessages = useMemo(
    () => chatWidgetMessages.filter((msg) => msg.isPinned && !msg.deletedAt),
    [chatWidgetMessages]
  );
  const fallbackAdminLabel = language === "km" ? "អ្នកគ្រប់គ្រង" : "Admin";
  const fallbackBuyerLabel = language === "km" ? "អតិថិជន" : "Buyer";
  const activeParty = chatWidgetActive
    ? isAdmin
      ? chatWidgetActive.buyer
      : chatWidgetActive.seller
    : null;
  const activePartyFallback = isAdmin ? fallbackBuyerLabel : fallbackAdminLabel;
  const activePartyName = chatWidgetActive
    ? resolveDisplayName(activeParty?.name, activeParty?.email) ?? activePartyFallback
    : null;
  const activePartyInitials =
    activePartyName?.slice(0, 2).toUpperCase() ??
    activePartyFallback.slice(0, 2).toUpperCase();
  const activePartyAvatar = activeParty?.avatarUrl ?? null;
  const activePartyOnline = activeParty?.online ?? false;
  const emojiQuickList = ["😀", "😂", "😍", "😎", "🙏", "👍", "🔥", "🎉"];

  const normalizeWidgetMessage = useCallback(
  (msg: any): HeaderChatMessage => ({
    id: Number(msg.id ?? 0),
    senderId: Number(msg.senderId ?? 0),
    body: String(msg.body ?? ''),
    createdAt: msg.createdAt ?? null,
      senderName: msg.sender?.name ?? msg.sender?.email ?? null,
      senderAvatar: msg.sender?.avatarUrl ?? null,
      type: msg.type ?? 'text',
      stickerPath: msg.stickerPath ?? null,
    deletedAt: msg.deletedAt ?? null,
    editedAt: msg.editedAt ?? null,
    isPinned: !!msg.isPinned,
    buyerSeenAt: msg.buyerSeenAt ?? null,
    sellerSeenAt: msg.sellerSeenAt ?? null,
    reactions: Array.isArray(msg.reactions)
      ? msg.reactions
          .map((reaction: any) => ({
            emoji: String(reaction.emoji ?? ''),
              count: Number(reaction.count ?? 0),
              reacted: !!reaction.reacted,
            }))
            .filter((reaction: MessageReaction) => reaction.emoji.length > 0)
        : [],
    }),
    []
  );

  const navLinks = [
    { name: t('nav.home'), value: 'home' },
    { name: t('nav.all'), value: 'all' },
    { name: t('nav.courses'), value: 'courses' },
    { name: t('nav.programs'), value: 'programs' },
    { name: t('nav.games'), value: 'games' },
    { name: t('nav.tools'), value: 'tools' },
    { name: t('nav.blog'), value: 'blog' },
    { name: t('nav.about'), value: 'about' }
  ];

  const formatWidgetTime = (value: string | null) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(language === 'km' ? 'km-KH' : undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeParticipant = (participant?: any): HeaderChatParticipant => {
  const rawLastActive = participant?.presence?.lastActiveAt;
  const lastActive =
    rawLastActive instanceof Date
      ? rawLastActive.toISOString()
      : rawLastActive ?? null;
  return {
    id:
      typeof participant?.id === 'number'
        ? participant.id
        : participant?.id ?? null,
    name: participant?.name ?? null,
    email: participant?.email ?? null,
    avatarUrl: participant?.avatarUrl ?? null,
    online: isPresenceOnline(
      participant?.presence?.status ?? null,
      lastActive
    ),
  };
};

  const chatWidgetSeenMessageId = useMemo(() => {
    if (!user?.id) return null;
    let seenId: number | null = null;
    for (const msg of chatWidgetMessages) {
      if (msg.senderId !== user.id) continue;
      const seenAt = isAdmin ? msg.buyerSeenAt : msg.sellerSeenAt;
      if (seenAt) {
        seenId = msg.id;
      }
    }
    return seenId;
  }, [chatWidgetMessages, user?.id, isAdmin]);

  const loadWidgetMessages = async (orderId: number) => {
    setChatWidgetMessagesLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/chat`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : language === 'km'
            ? 'មិនអាចទាញយកការសន្ទនាបានទេ'
            : 'Unable to load chat'
        );
      }
      setChatWidgetMessages(
        (Array.isArray(data.messages) ? data.messages : []).map(normalizeWidgetMessage)
      );
      setChatWidgetError(null);
    } catch (err) {
      setChatWidgetMessages([]);
      setChatWidgetError(
        err instanceof Error
          ? err.message
          : language === 'km'
          ? 'មិនអាចទាញយកការសន្ទនាបានទេ'
          : 'Unable to load chat'
      );
    } finally {
      setChatWidgetMessagesLoading(false);
    }
  };

const mapSummary = (raw: any): HeaderChatSummary => {
  const buyer = normalizeParticipant({
    id: raw.buyer?.id ?? raw.user_id ?? null,
    name: raw.buyer?.name ?? raw.buyer_name ?? null,
    email: raw.buyer?.email ?? raw.buyer_email ?? null,
    avatarUrl: raw.buyer?.avatarUrl ?? raw.buyer_avatar ?? null,
    presence: {
      status: raw.buyer?.presence?.status ?? raw.buyer_status ?? null,
      lastActiveAt: raw.buyer?.presence?.lastActiveAt ?? raw.buyer_last_active_at ?? null,
    },
  });
  const seller = normalizeParticipant({
    id: raw.seller?.id ?? raw.seller_id ?? null,
    name: raw.seller?.name ?? raw.seller_name ?? null,
    email: raw.seller?.email ?? raw.seller_email ?? null,
    avatarUrl: raw.seller?.avatarUrl ?? raw.seller_avatar ?? null,
    presence: {
      status: raw.seller?.presence?.status ?? raw.seller_status ?? null,
      lastActiveAt: raw.seller?.presence?.lastActiveAt ?? raw.seller_last_active_at ?? null,
    },
  });
  return {
    orderId: Number(raw.orderId ?? raw.order_id ?? 0),
    orderNumber: String(raw.orderNumber ?? raw.order_number ?? ''),
    buyer,
    seller,
    lastMessage: raw.lastMessage ?? raw.last_body ?? null,
    lastMessageAt:
      raw.lastMessageAt instanceof Date
        ? raw.lastMessageAt.toISOString()
        : raw.lastMessageAt ?? raw.last_created_at ?? null,
    lastMessageType: raw.lastMessageType ?? raw.last_message_type ?? null,
    lastStickerPath: raw.lastStickerPath ?? raw.last_sticker_path ?? null,
    unreadCount: Number(raw.unreadCount ?? raw.unread_count ?? 0),
  };
};

  const loadWidgetConversations = async (
    options?: { keepActive?: boolean }
  ) => {
    const keepActive = !!options?.keepActive;
    const activeId = keepActive ? chatWidgetActive?.orderId ?? null : null;
    setChatWidgetLoading(true);
    try {
      const res = await fetch('/api/chats', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : language === 'km'
            ? 'មិនអាចទាញយកបញ្ជីការសន្ទនាបានទេ'
            : 'Unable to load chats'
        );
      }
      const normalized: HeaderChatSummary[] = (Array.isArray(data.conversations)
        ? data.conversations
        : []
      ).map(mapSummary);
      setChatWidgetConversations(normalized);
      setHasChatActivity(normalized.length > 0);
      if (keepActive && activeId) {
        const stillExists =
          normalized.find((conv) => conv.orderId === activeId) ?? null;
        setChatWidgetActive(stillExists);
        if (!stillExists) {
          setChatWidgetMessages([]);
        }
      } else {
        setChatWidgetActive(null);
        setChatWidgetMessages([]);
      }
      setChatWidgetError(null);
    } catch (err) {
      setChatWidgetConversations([]);
      if (!keepActive) {
        setChatWidgetActive(null);
        setChatWidgetMessages([]);
      }
      setChatWidgetError(
        err instanceof Error
          ? err.message
          : language === 'km'
          ? 'មិនអាចទាញយកបញ្ជីការសន្ទនាបានទេ'
          : 'Unable to load chats'
      );
    } finally {
      setChatWidgetLoading(false);
    }
  };

  const handleToggleChatWidget = () => {
    if (!isAuthenticated) {
      onNavigate('login');
      return;
    }
    setChatWidgetOpen((prev) => {
      const next = !prev;
      if (next) {
        loadWidgetConversations();
        setChatWidgetReactionFor(null);
        setChatWidgetEmojiOpen(false);
        setChatWidgetStickerOpen(false);
        setChatWidgetMenuId(null);
        setChatWidgetEditingId(null);
        setChatWidgetEditingValue("");
      } else {
        setChatWidgetReactionFor(null);
        setChatWidgetEmojiOpen(false);
        setChatWidgetStickerOpen(false);
        setChatWidgetMenuId(null);
        setChatWidgetEditingId(null);
        setChatWidgetEditingValue("");
      }
      return next;
    });
  };

  const handleSelectWidgetConversation = (conversation: HeaderChatSummary) => {
    setChatWidgetActive(conversation);
    setChatWidgetReactionFor(null);
    setChatWidgetEmojiOpen(false);
    setChatWidgetStickerOpen(false);
    setChatWidgetError(null);
    setChatWidgetMessages([]);
    setChatWidgetConversations((prev) =>
      prev.map((conv) =>
        conv.orderId === conversation.orderId
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
    loadWidgetMessages(conversation.orderId);
  };

  const handleBackToWidgetList = () => {
    setChatWidgetActive(null);
    setChatWidgetMessages([]);
    setChatWidgetReactionFor(null);
    setChatWidgetEmojiOpen(false);
    setChatWidgetStickerOpen(false);
    setChatWidgetMenuId(null);
    setChatWidgetEditingId(null);
    setChatWidgetEditingValue("");
    setChatWidgetError(null);
  };

  const appendWidgetMessage = (raw: any) => {
    setChatWidgetMessages((prev) => [...prev, normalizeWidgetMessage(raw)]);
  };

  const postWidgetMessage = async (payload: {
    message?: string;
    type?: "text" | "emoji" | "sticker";
    stickerPath?: string | null;
  }) => {
    if (!chatWidgetActive) return;
    const res = await fetch(`/api/orders/${chatWidgetActive.orderId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        typeof data?.error === 'string'
          ? data.error
          : language === 'km'
          ? 'មិនអាចផ្ញើសារបានទេ'
          : 'Unable to send message'
      );
    }
    if (data.message) {
      appendWidgetMessage(data.message);
    }
    await loadWidgetConversations({ keepActive: true });
    setChatWidgetError(null);
  };

  const handleWidgetSend = async () => {
    if (!chatWidgetActive) return;
    const text = chatWidgetInput.trim();
    if (!text) return;
    setChatWidgetSending(true);
    try {
      await postWidgetMessage({ message: text, type: chatWidgetEmojiOpen ? 'emoji' : 'text' });
      setChatWidgetInput('');
      setChatWidgetEmojiOpen(false);
    } catch (err) {
      setChatWidgetError(
        err instanceof Error
          ? err.message
          : language === 'km'
          ? 'មិនអាចផ្ញើសារបានទេ'
          : 'Unable to send message'
      );
    } finally {
      setChatWidgetSending(false);
    }
  };

  const handleWidgetSendSticker = async (stickerPath: string) => {
    if (!chatWidgetActive || !stickerPath) return;
    setChatWidgetSending(true);
    try {
      await postWidgetMessage({ message: '', type: 'sticker', stickerPath });
      setChatWidgetStickerOpen(false);
    } catch (err) {
      setChatWidgetError(
        err instanceof Error
          ? err.message
          : language === 'km'
          ? 'មិនអាចផ្ញើស្ទីក័រ'
          : 'Unable to send sticker'
      );
    } finally {
      setChatWidgetSending(false);
    }
  };

  const handleWidgetReaction = async (messageId: number, emoji: string) => {
    if (!chatWidgetActive || !emoji) return;
    setChatWidgetReactingId(messageId);
    try {
      const res = await fetch(`/api/orders/${chatWidgetActive.orderId}/chat`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageId, emoji }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : language === 'km'
            ? 'មិនអាចធ្វើប្រតិកម្មបានទេ'
            : 'Unable to react'
        );
      }
      if (Array.isArray(data.reactions)) {
        setChatWidgetMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  reactions: data.reactions.map((reaction: any) => ({
                    emoji: String(reaction.emoji ?? ''),
                    count: Number(reaction.count ?? 0),
                    reacted: !!reaction.reacted,
                  })),
                }
              : msg
          )
        );
      }
      setChatWidgetError(null);
    } catch (err) {
      setChatWidgetError(
        err instanceof Error
          ? err.message
          : language === 'km'
          ? 'មិនអាចធ្វើប្រតិកម្មបានទេ'
          : 'Unable to react'
      );
    } finally {
      setChatWidgetReactingId(null);
      setChatWidgetReactionFor(null);
    }
  };

  const handleWidgetDeleteMessage = async (messageId: number) => {
    if (!chatWidgetActive) return;
    setChatWidgetDeletingId(messageId);
    try {
      const res = await fetch(`/api/orders/${chatWidgetActive.orderId}/chat`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messageId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : language === "km"
            ? "មិនអាចលុបសារ"
            : "Unable to delete message"
        );
      }
      setChatWidgetMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                deletedAt: new Date().toISOString(),
                body: "",
                stickerPath: null,
                reactions: [],
                isPinned: false,
              }
            : msg
        )
      );
      setChatWidgetMenuId((prev) => (prev === messageId ? null : prev));
      await loadWidgetConversations({ keepActive: true });
      setChatWidgetError(null);
    } catch (err) {
      setChatWidgetError(
        err instanceof Error
          ? err.message
          : language === "km"
          ? "មិនអាចលុបសារ"
          : "Unable to delete message"
      );
    } finally {
      setChatWidgetDeletingId(null);
    }
  };

  const handleWidgetTogglePin = async (message: HeaderChatMessage) => {
    if (!chatWidgetActive) return;
    setChatWidgetPinningId(message.id);
    try {
      const res = await fetch(`/api/orders/${chatWidgetActive.orderId}/chat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messageId: message.id,
          action: "pin",
          pinned: !message.isPinned,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : language === "km"
            ? "មិនអាចបិទភ្ជាប់សារ"
            : "Unable to pin message"
        );
      }
      if (data.message) {
        const updated = normalizeWidgetMessage(data.message);
        setChatWidgetMessages((prev) =>
          prev.map((msg) => (msg.id === updated.id ? updated : msg))
        );
      }
      setChatWidgetMenuId((prev) => (prev === message.id ? null : prev));
      setChatWidgetError(null);
    } catch (err) {
      setChatWidgetError(
        err instanceof Error
          ? err.message
          : language === "km"
          ? "មិនអាចបិទភ្ជាប់សារ"
          : "Unable to pin message"
      );
    } finally {
      setChatWidgetPinningId(null);
    }
  };

  const handleWidgetStartEdit = (message: HeaderChatMessage) => {
    setChatWidgetEditingId(message.id);
    setChatWidgetEditingValue(message.body);
    setChatWidgetMenuId(null);
  };

  const handleWidgetCancelEdit = () => {
    setChatWidgetEditingId(null);
    setChatWidgetEditingValue("");
  };

  const handleWidgetSaveEdit = async () => {
    if (!chatWidgetActive || chatWidgetEditingId === null) return;
    const trimmed = chatWidgetEditingValue.trim();
    if (!trimmed) {
      setChatWidgetError(
        language === "km"
          ? "សូមបញ្ចូលអត្ថបទថ្មី"
          : "Please provide the updated message."
      );
      return;
    }
    setChatWidgetSavingEditId(chatWidgetEditingId);
    try {
      const res = await fetch(`/api/orders/${chatWidgetActive.orderId}/chat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messageId: chatWidgetEditingId,
          action: "edit",
          body: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : language === "km"
            ? "មិនអាចកែសារបានទេ"
            : "Unable to edit message"
        );
      }
      if (data.message) {
        const updated = normalizeWidgetMessage(data.message);
        setChatWidgetMessages((prev) =>
          prev.map((msg) => (msg.id === updated.id ? updated : msg))
        );
      }
      setChatWidgetEditingId(null);
      setChatWidgetEditingValue("");
      setChatWidgetError(null);
    } catch (err) {
      setChatWidgetError(
        err instanceof Error
          ? err.message
          : language === "km"
          ? "មិនអាចកែសារបានទេ"
          : "Unable to edit message"
      );
    } finally {
      setChatWidgetSavingEditId(null);
    }
  };

  const handleLogout = () => {
    logout();
    setAccountPopupOpen(false);
    onNavigate('home');
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setHasChatActivity(false);
      setChatWidgetOpen(false);
      return;
    }
    let cancelled = false;
    const loadChats = async () => {
      try {
        const res = await fetch("/api/chats", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) {
          setHasChatActivity((data.conversations ?? []).length > 0);
        }
      } catch {
        if (!cancelled) {
          setHasChatActivity(false);
        }
      }
    };
    loadChats();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!chatWidgetOpen) return;
    const handler = (event: MouseEvent) => {
      if (
        chatWidgetRef.current &&
        !chatWidgetRef.current.contains(event.target as Node)
      ) {
        setChatWidgetOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, [chatWidgetOpen]);

  useEffect(() => {
    if (!chatWidgetActive) return;
    if (chatWidgetMessagesRef.current) {
      chatWidgetMessagesRef.current.scrollTop =
        chatWidgetMessagesRef.current.scrollHeight;
    }
  }, [chatWidgetMessages, chatWidgetActive]);

  useEffect(() => {
    if (!chatWidgetOpen || chatWidgetStickerPacks.length > 0) return;
    (async () => {
      try {
        const res = await fetch("/api/stickers", { cache: "no-store" });
        const data = await res.json();
        const packs: StickerPack[] = Array.isArray(data?.packs) ? data.packs : [];
        setChatWidgetStickerPacks(packs);
        if (packs.length > 0) {
          setChatWidgetActivePackId(packs[0].id);
        }
      } catch {
        setChatWidgetStickerPacks([]);
      }
    })();
  }, [chatWidgetOpen, chatWidgetStickerPacks.length]);

  useEffect(() => {
    const handler = () => setChatWidgetMenuId(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const onOpenOrderDetail = (orderId: number) => {
    setChatWidgetOpen(false);
    onNavigate('order-detail');
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm transition-colors">
      {/* Top Bar - Currency, Language, Theme, Social Icons */}
      <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-10">
            {/* Left Side - Currency, Language, Dark Mode */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Currency Switcher */}
              <button
                onClick={() => setCurrency(currency === 'USD' ? 'KHR' : 'USD')}
                className="flex items-center gap-1 px-2 md:px-3 py-1 rounded text-xs md:text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title={currency === 'USD' ? 'Switch to KHR' : 'Switch to USD'}
              >
                <DollarSign className="w-3 h-3 md:w-4 md:h-4" />
                <span className="font-semibold">{currency}</span>
              </button>

              {/* Language Switcher */}
              <button
                onClick={() => setLanguage(language === 'en' ? 'km' : 'en')}
                className="flex items-center gap-1 px-2 md:px-3 py-1 rounded text-xs md:text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title={language === 'en' ? 'Switch to Khmer' : 'Switch to English'}
              >
                <Globe className="w-3 h-3 md:w-4 md:h-4" />
                <span className="font-medium">{language === 'en' ? 'ភាសាខ្មែរ' : 'EN'}</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1 px-2 md:px-3 py-1 rounded text-xs md:text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {theme === 'light' ? <Moon className="w-3 h-3 md:w-4 md:h-4" /> : <Sun className="w-3 h-3 md:w-4 md:h-4" />}
                <span className="font-medium hidden sm:inline">{theme === 'light' ? 'Dark' : 'Light'}</span>
              </button>
            </div>

            {/* Right Side - Social Media Icons */}
            <div className="flex items-center gap-2 md:gap-3">
              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="YouTube"
              >
                <Youtube className="w-4 h-4 md:w-5 md:h-5" />
              </a>
              
              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Facebook"
              >
                <Facebook className="w-4 h-4 md:w-5 md:h-5" />
              </a>
              
              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-400 dark:hover:text-blue-300 transition-colors"
                title="Telegram"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </a>
              
              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="TikTok"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Hamburger Menu + Logo */}
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Toggle - Desktop */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:block p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>

            {/* Hamburger Menu Toggle - Mobile */}
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>

            {/* Logo */}
            <button 
              onClick={() => onNavigate('home')}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg sm:text-xl">E</span>
              </div>
              <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
                Edugroit
              </span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <button
                key={link.value}
                onClick={() => onNavigate(link.value)}
                className={`text-sm font-medium transition-colors hover:text-blue-600 dark:hover:text-blue-400 ${
                  currentPage === link.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {link.name}
              </button>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Search Icon */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

          {/* Chat */}
          <div className="relative">
            <button
              onClick={handleToggleChatWidget}
              className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              {hasChatActivity && (
                <span className="absolute top-1 right-1 block w-2 h-2 rounded-full bg-green-500" />
              )}
            </button>
            {chatWidgetOpen && (
              <div
                ref={chatWidgetRef}
                className="absolute right-0 mt-3 w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-40"
              >
                {!chatWidgetActive ? (
                  <div className="flex flex-col">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {language === "km" ? "ជជែកជាមួយអ្នកគ្រប់គ្រង" : "Chat with admins"}
                        </p>
                        <p className="text-xs opacity-80">
                          {language === "km"
                            ? "????????????????????????????????"
                            : "Select a conversation to begin"}
                        </p>
                      </div>
                      <button
                        onClick={() => setChatWidgetOpen(false)}
                        className="p-1 rounded-full hover:bg-white/20 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 uppercase font-semibold">
                      <span>{language === "km" ? "??????????????" : "Conversations"}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setChatWidgetOpen(false);
                          onNavigate("chat");
                        }}
                      >
                        {language === "km" ? "??????????" : "View all"}
                      </Button>
                    </div>
                    <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                      {chatWidgetLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {language === "km" ? "??????????..." : "Loading..."}
                        </div>
                      ) : chatWidgetConversations.length === 0 ? (
                        <div className="text-sm text-gray-500">
                          {language === "km"
                            ? "???????????????????????"
                            : "No conversations yet."}
                        </div>
                      ) : (
                        chatWidgetConversations.map((conv) => {
                          const isActive =
                            chatWidgetActive !== null &&
                            chatWidgetActive.orderId === conv.orderId;
                          const counterpart = isAdmin ? conv.buyer : conv.seller;
                          const fallbackLabel = isAdmin
                            ? fallbackBuyerLabel
                            : fallbackAdminLabel;
                          const counterpartName = isAdmin
                            ? resolveDisplayName(counterpart?.name, counterpart?.email)
                            : resolveDisplayName(
                                conv.sellerName,
                                counterpart?.name,
                                counterpart?.email
                              );
                          const displayName = counterpartName ?? fallbackLabel;
                          const initials = displayName.slice(0, 2).toUpperCase();
                          const avatar = isAdmin
                            ? counterpart?.avatarUrl ?? null
                            : conv.sellerAvatar ?? counterpart?.avatarUrl ?? null;
                          const online = isAdmin
                            ? !!counterpart?.online
                            : typeof conv.sellerOnline === "boolean"
                            ? !!conv.sellerOnline
                            : !!counterpart?.online;
                          const snippet =
                            conv.lastMessageType === "sticker"
                              ? language === "km"
                                ? "???????"
                                : "Sticker"
                              : conv.lastMessage ||
                                (language === "km" ? "????????" : "No messages");
                          return (
                            <button
                              key={conv.orderId}
                              onClick={() => handleSelectWidgetConversation(conv)}
                              className={`w-full text-left p-3 rounded-xl border transition ${
                                isActive
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                                  : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 hover:border-blue-400"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  {avatar ? (
                                    <img
                                      src={avatar}
                                      alt={displayName}
                                      className="w-10 h-10 rounded-full object-cover border border-blue-200"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold">
                                      {initials}
                                    </div>
                                  )}
                                  {online && (
                                    <span className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white dark:border-gray-900" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={`text-sm font-semibold truncate ${
                                      conv.unreadCount > 0
                                        ? "text-blue-600 dark:text-blue-300"
                                        : "text-gray-900 dark:text-gray-100"
                                    }`}
                                  >
                                    {displayName}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {language === "km" ? "???????????" : "Order"}{" "}
                                    {conv.orderNumber}
                                  </div>
                                  <div
                                    className={`mt-1 text-xs line-clamp-2 ${
                                      conv.unreadCount > 0
                                        ? "text-gray-900 dark:text-gray-100"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {snippet}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-[11px] text-gray-400">
                                    {formatWidgetTime(conv.lastMessageAt)}
                                  </span>
                                  {conv.unreadCount > 0 && (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs">
                                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between gap-3">
                      <button
                        onClick={handleBackToWidgetList}
                        className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                        title={language === "km" ? "??????" : "Back"}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative">
                          {activePartyAvatar ? (
                            <img
                              src={activePartyAvatar}
                              alt={activePartyName ?? activePartyFallback}
                              className="w-10 h-10 rounded-full object-cover border border-white/30"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-semibold">
                              {activePartyInitials}
                            </div>
                          )}
                          {activePartyOnline && (
                            <span className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {activePartyName ?? activePartyFallback}
                          </p>
                          <p className="text-xs opacity-80">
                            #{chatWidgetActive.orderNumber}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setChatWidgetOpen(false)}
                        className="p-1 rounded-full hover:bg-white/20 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 flex items-center justify-between">
                      <span>
                        {language === "km"
                          ? "អ្នកគ្រប់គ្រងរួចរាល់ក្នុងការឆ្លើយតប"
                          : "Admin is ready to respond"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenOrderDetail(chatWidgetActive.orderId)}
                      >
                        {language === "km" ? "??????????????" : "View order"}
                      </Button>
                    </div>
                    <div ref={chatWidgetMessagesRef} className="p-4 space-y-3 max-h-72 overflow-y-auto">
                      {chatWidgetMessagesLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {language === "km" ? "??????????..." : "Loading..."}
                        </div>
                      ) : chatWidgetMessages.length === 0 ? (
                        <div className="text-sm text-gray-500">
                          {language === "km"
                            ? "?????????????? ???????????????!"
                            : "No messages yet. Say hello!"}
                        </div>
                      ) : (
                        <>
                          {chatWidgetPinnedMessages.length > 0 && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3 text-xs text-amber-700 dark:text-amber-100 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Pin className="w-3 h-3" />
                                <span>
                                  {language === "km" ? "សារបិទភ្ជាប់" : "Pinned messages"} (
                                  {chatWidgetPinnedMessages.length})
                                </span>
                              </div>
                              <span className="text-[11px] text-amber-500 dark:text-amber-200">
                                {language === "km"
                                  ? "បង្ហាញនៅលើកំពូល"
                                  : "Highlighted for quick access"}
                              </span>
                            </div>
                          )}
                          {chatWidgetMessages.map((msg) => {
                            const isMine = msg.senderId === user?.id;
                          const isDeleted = !!msg.deletedAt;
                          const displayName =
                            msg.senderName ||
                            (isMine
                              ? language === "km"
                                ? "អ្នក"
                                : "You"
                              : isAdmin
                              ? fallbackBuyerLabel
                              : fallbackAdminLabel);
                          const isReacting = chatWidgetReactingId === msg.id;
                          const seenAt = isAdmin ? msg.buyerSeenAt : msg.sellerSeenAt;
                          const showSeenAvatar =
                            isMine &&
                            chatWidgetSeenMessageId === msg.id &&
                            !!activePartyName &&
                            !!seenAt;
                          const seenAvatarElement = activePartyAvatar ? (
                            <img
                              src={activePartyAvatar}
                              alt={activePartyName ?? activePartyFallback}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-semibold">
                                {activePartyInitials}
                            </div>
                          );
                          const avatarNode = msg.senderAvatar ? (
                            <img
                              src={msg.senderAvatar}
                              alt={displayName}
                              className="w-8 h-8 rounded-full object-cover border border-white/40"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center text-xs font-semibold">
                              {displayName.trim().slice(0, 2).toUpperCase()}
                            </div>
                          );
                          return (
                            <div
                              key={msg.id}
                              className={`flex items-end gap-2 ${isMine ? "justify-end" : ""}`}
                            >
                              {!isMine && avatarNode}
                              <div
                                className={`flex flex-col gap-1 max-w-[80%] ${
                                  isMine ? "items-end" : "items-start"
                                }`}
                              >
                                <div className="relative w-full group/message">
                                  {msg.isPinned && !isDeleted && (
                                    <span
                                      className={`absolute -top-2 ${
                                        isMine ? "right-4" : "left-4"
                                      } inline-flex items-center gap-1 text-[10px] text-amber-500`}
                                    >
                                      <Pin className="w-3 h-3" />
                                      {language === "km" ? "????????????" : "Pinned"}
                                    </span>
                                  )}
                                  <div
                                    className={`rounded-2xl px-3 py-2 text-xs shadow ${
                                      isMine
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    } ${isDeleted ? "italic opacity-70" : ""}`}
                                  >
                                    <div className="font-medium opacity-80">{displayName}</div>
                                    {isDeleted ? (
                                      <p>
                                        {isMine
                                          ? language === "km"
                                            ? "?????????????"
                                            : "You unsent this message."
                                          : language === "km"
                                          ? "?????????????????"
                                          : "This message was removed."}
                                      </p>
                                    ) : msg.type === "sticker" && msg.stickerPath ? (
                                      <img
                                        src={msg.stickerPath}
                                        alt="Sticker"
                                        className="max-h-32 rounded-lg object-contain mt-1"
                                      />
                                    ) : (
                                      <p className="mt-1">{msg.body}</p>
                                    )}
                                  </div>
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
                                          setChatWidgetMenuId((prev) =>
                                            prev === msg.id ? null : msg.id
                                          );
                                        }}
                                        title={language === "km" ? "ជម្រើស" : "More actions"}
                                      >
                                        <MoreVertical className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                  {chatWidgetMenuId === msg.id && !isDeleted && (
                                    <div
                                      className={`absolute z-30 mt-2 w-44 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow ${
                                        isMine ? "right-0" : "left-0"
                                      }`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        className="w-full px-3 py-2 flex items-center gap-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
                                        onClick={() => handleWidgetTogglePin(msg)}
                                        disabled={chatWidgetPinningId === msg.id}
                                      >
                                        {chatWidgetPinningId === msg.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Pin className="w-3 h-3" />
                                        )}
                                        <span>
                                          {msg.isPinned
                                            ? language === "km"
                                              ? "ដោះបិទភ្ជាប់"
                                              : "Unpin"
                                            : language === "km"
                                            ? "បិទភ្ជាប់"
                                            : "Pin message"}
                                        </span>
                                      </button>
                                      {isMine && msg.type !== "sticker" && (
                                        <button
                                          className="w-full px-3 py-2 flex items-center gap-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
                                          onClick={() => handleWidgetStartEdit(msg)}
                                        >
                                          <Edit3 className="w-3 h-3" />
                                          <span>{language === "km" ? "កែសារ" : "Edit message"}</span>
                                        </button>
                                      )}
                                      {isMine && (
                                        <button
                                          className="w-full px-3 py-2 flex items-center gap-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                                          onClick={() => handleWidgetDeleteMessage(msg.id)}
                                          disabled={chatWidgetDeletingId === msg.id}
                                        >
                                          {chatWidgetDeletingId === msg.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Trash2 className="w-3 h-3" />
                                          )}
                                          <span>{language === "km" ? "លុប" : "Remove"}</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {msg.reactions.length > 0 && (
                                    <div className={`absolute -bottom-3 ${
                                      isMine ? "right-4" : "left-4"
                                    }`}
                                    >
                                      <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/90 px-2 py-0.5 text-[10px] shadow">
                                        {msg.reactions.map((reaction) => (
                                          <span
                                            key={`${msg.id}-${reaction.emoji}`}
                                            className="flex items-center gap-1 leading-none"
                                          >
                                            <span>{reaction.emoji}</span>
                                            {reaction.count > 1 && (
                                              <span className="font-semibold">{reaction.count}</span>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div
                                  className={`text-[10px] text-gray-400 flex items-center gap-2 ${
                                    isMine ? "justify-end" : "justify-start"
                                  }`}
                                >
                                  <span>{formatWidgetTime(msg.createdAt)}</span>
                                  {msg.editedAt && !isDeleted && (
                                    <span className="italic">
                                      {language === "km" ? "?????" : "Edited"}
                                    </span>
                                  )}
                                  {!isDeleted && (
                                    <button
                                      className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                                      onClick={() =>
                                        setChatWidgetReactionFor((prev) =>
                                          prev === msg.id ? null : msg.id
                                        )
                                      }
                                      title={language === "km" ? "?????????" : "React"}
                                    >
                                      <SmilePlus className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                {!isDeleted && chatWidgetReactionFor === msg.id && (
                                  <div className="flex flex-wrap gap-2 rounded-xl px-3 py-2 text-lg bg-gray-100 dark:bg-gray-800">
                                    {emojiQuickList.map((emoji) => (
                                      <button
                                        key={`${msg.id}-${emoji}`}
                                        onClick={() => handleWidgetReaction(msg.id, emoji)}
                                        disabled={isReacting}
                                        className="hover:scale-110 transition"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {showSeenAvatar && (
                                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1">
                                    <div className="w-5 h-5 rounded-full overflow-hidden border border-white shadow">
                                      {seenAvatarElement}
                                    </div>
                                    <span>{language === "km" ? "បានឃើញ" : "Seen"}</span>
                                  </div>
                                )}
                                {chatWidgetEditingId === msg.id && !isDeleted && msg.type !== "sticker" && (
                                  <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-2">
                                    <textarea
                                      className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                      rows={3}
                                      value={chatWidgetEditingValue}
                                      onChange={(e) => setChatWidgetEditingValue(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-2 text-xs">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleWidgetCancelEdit}
                                        className="text-gray-600 dark:text-gray-300"
                                      >
                                        <X className="w-3 h-3 mr-1" />
                                        {language === "km" ? "បោះបង់" : "Cancel"}
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={handleWidgetSaveEdit}
                                        disabled={chatWidgetSavingEditId === msg.id}
                                      >
                                        {chatWidgetSavingEditId === msg.id ? (
                                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                        ) : (
                                          <Check className="w-3 h-3 mr-1" />
                                        )}
                                        {language === "km" ? "រក្សាទុក" : "Save"}
                                      </Button>
                                    </div>
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

                    {chatWidgetError && (
                      <div className="px-4 text-xs text-red-600 dark:text-red-400">
                        {chatWidgetError}
                      </div>
                    )}

                    <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setChatWidgetEmojiOpen((prev) => !prev);
                            setChatWidgetStickerOpen(false);
                          }}
                          className={`p-2 rounded-full border ${
                            chatWidgetEmojiOpen
                              ? "border-blue-500 text-blue-500"
                              : "border-gray-200 dark:border-gray-700 text-gray-500"
                          }`}
                          title={language === "km" ? "????????" : "Emoji"}
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setChatWidgetStickerOpen((prev) => !prev);
                            setChatWidgetEmojiOpen(false);
                          }}
                          className={`p-2 rounded-full border ${
                            chatWidgetStickerOpen
                              ? "border-blue-500 text-blue-500"
                              : "border-gray-200 dark:border-gray-700 text-gray-500"
                          }`}
                          title={language === "km" ? "???????" : "Stickers"}
                        >
                          <Sticker className="w-4 h-4" />
                        </button>
                      </div>
                      {chatWidgetEmojiOpen && (
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 flex flex-wrap gap-2">
                          {emojiQuickList.map((emoji) => (
                            <button
                              key={`widget-emoji-${emoji}`}
                              className="text-xl"
                              onClick={() => setChatWidgetInput((prev) => `${prev}${emoji}`)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                      {chatWidgetStickerOpen && chatWidgetActivePackId && (
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 space-y-3 max-h-64 overflow-y-auto">
                          <div className="flex gap-2 flex-wrap items-center">
                            {chatWidgetStickerPacks.map((pack) => {
                              const isActivePack = pack.id === chatWidgetActivePackId;
                              return (
                                <button
                                  key={`widget-pack-${pack.id}`}
                                  onClick={() => setChatWidgetActivePackId(pack.id)}
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
                            {(
                              chatWidgetStickerPacks.find(
                                (pack) => pack.id === chatWidgetActivePackId
                              )?.stickers ?? []
                            ).map((sticker) => (
                                <button
                                  key={`widget-sticker-${sticker}`}
                                  onClick={() => handleWidgetSendSticker(sticker)}
                                  className="bg-white dark:bg-gray-900 rounded-lg p-1 hover:scale-105 transition"
                                >
                                  <img src={sticker} alt="Sticker" className="max-h-16 mx-auto" />
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                      <textarea
                        className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={2}
                        value={chatWidgetInput}
                        onChange={(e) => setChatWidgetInput(e.target.value)}
                        placeholder={
                          language === "km"
                            ? "??????????????..."
                            : "Type a quick message..."
                        }
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={handleWidgetSend}
                          disabled={
                            !chatWidgetActive || chatWidgetSending || !chatWidgetInput.trim()
                          }
                        >
                          {chatWidgetSending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          {language === "km" ? "????" : "Send"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart */}
            <button
              onClick={() => onNavigate('cart')}
              className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Account Icon - Desktop */}
            {isAuthenticated && user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setAccountPopupOpen(!accountPopupOpen)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-8 h-8 rounded-full ring-2 ring-blue-500 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full ring-2 ring-blue-500 bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold">
                      {(user?.firstName || user?.username || user?.email || "U")
                        .trim()
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                </button>

                {/* Account Popup */}
                {accountPopupOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-30"
                      onClick={() => setAccountPopupOpen(false)}
                    />
                    
                    {/* Popup - Small like reference image */}
                    <div className="absolute right-0 mt-2 w-48 bg-blue-600 dark:bg-blue-700 rounded-lg shadow-2xl overflow-hidden z-40">
                      {/* User Info Header */}
                      <div className="px-4 py-3 bg-blue-700 dark:bg-blue-800 border-b border-blue-500">
                        <div className="text-xs font-bold text-white truncate">{user.name}</div>
                        <div className="text-xs text-blue-200 truncate">
                          {language === 'km' ? 'អត្តសញ្ញាណ' : 'User ID'}: {user.id}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          onNavigate('profile');
                          setAccountPopupOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>{language === 'km' ? 'គណនី' : 'Account'}</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          onNavigate('orders');
                          setAccountPopupOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        <span>{language === 'km' ? 'ការបញ្ជាទិញ' : 'Purchase History'}</span>
                      </button>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{language === 'km' ? 'ចាកចេញ' : 'Logout'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('login')}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <User className="w-4 h-4 mr-2" />
                  {t('nav.login')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => onNavigate('register')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {t('nav.signup')}
                </Button>
              </div>
            )}

            {/* User Account Icon - Mobile */}
            {isAuthenticated && user ? (
              <div className="relative md:hidden">
                <button
                  onClick={() => setAccountPopupOpen(!accountPopupOpen)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-8 h-8 rounded-full ring-2 ring-blue-500 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full ring-2 ring-blue-500 bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold">
                      {(user?.firstName || user?.username || user?.email || "U")
                        .trim()
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                </button>

                {/* Mobile Account Popup */}
                {accountPopupOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 bg-black/50 z-40"
                      onClick={() => setAccountPopupOpen(false)}
                    />
                    
                    {/* Popup - Match PC style with 3 buttons */}
                    <div className="absolute right-0 mt-2 w-48 bg-blue-600 dark:bg-blue-700 rounded-lg shadow-2xl overflow-hidden z-50">
                      <button
                        onClick={() => {
                          onNavigate('profile');
                          setAccountPopupOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>{language === 'km' ? 'គណនី' : 'Account'}</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          onNavigate('orders');
                          setAccountPopupOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <Package className="w-4 h-4" />
                        <span>{language === 'km' ? 'ការបញ្ជាទិញ' : 'Purchase History'}</span>
                      </button>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{language === 'km' ? 'ចាកចេញ' : 'Logout'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <User className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar - Expandable */}
        {searchOpen && (
          <div className="pb-4 animate-in slide-in-from-top duration-300">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder={t('nav.search')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
