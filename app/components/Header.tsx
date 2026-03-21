// app\components\Header.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingCart, Menu, X, User, Globe, Moon, Sun, LogOut, Settings, BookOpen, Wallet, DollarSign, Package, FileText, Layers, ChevronRight, Facebook, Youtube, Send, MessageCircle, Loader2, Smile, SmilePlus, Sticker, Pin, ArrowLeft, MoreVertical, Edit3, Trash2, Check, Bell, Search, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { ProfileAvatar } from "./ProfileAvatar";
import { UserOnlineStatus } from "./UserOnlineStatus";
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useUserPresence } from '../lib/hooks/useUserPresence';
import {
  FAVORITES_CHANGED_EVENT,
  OPEN_FAVORITES_EVENT,
  readFavoriteItems,
  removeFavoriteItem,
  type FavoriteItem,
} from "../lib/favorites";
const PRESENCE_WINDOW_MS = 5 * 60 * 1000;
const DESKTOP_SIDEBAR_MIN_WIDTH = 980;

const isPresenceOnline = (
  status?: string | null,
  lastActive?: string | null
) => {
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
  avatarBorderUrl?: string | null;
  online: boolean;
};

type HeaderChatSummary = {
  orderId: number;
  orderNumber: string;
  state?: string | null;
  result?: string | null;
  handlerAdminId?: number | null;
  handlerAdminName?: string | null;
  buyer: HeaderChatParticipant;
  seller: HeaderChatParticipant;
  sellerName?: string | null;
  sellerAvatar?: string | null;
  sellerAvatarBorderUrl?: string | null;
  sellerOnline?: boolean | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageType?: string | null;
  lastStickerPath?: string | null;
  unreadCount: number;
};
type ChatWidgetActivityFilter = "all" | "online" | "offline" | "read" | "unread";

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
  senderAvatarBorderUrl?: string | null;
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

type HeaderNotificationOrder = {
  id: number;
  order_number: string;
  product_title: string | null;
  isRead: boolean;
};

type HeaderSystemNotification = {
  id: string;
  title: string;
  description: string;
  icon: "security" | "account" | "product" | "update";
  createdAt?: string | null;
  linkUrl?: string | null;
  isRead: boolean;
};

const normalizeHeaderSystemNotificationIcon = (
  value: unknown
): HeaderSystemNotification["icon"] => {
  if (
    value === "security" ||
    value === "account" ||
    value === "product" ||
    value === "update"
  ) {
    return value;
  }

  return "security";
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
  isAppShell?: boolean;
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
  isAppShell = false,
}: HeaderProps) {
  const [isDesktopSidebarViewport, setIsDesktopSidebarViewport] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountPopupOpen, setAccountPopupOpen] = useState(false);
  const [favoriteOpen, setFavoriteOpen] = useState(false);
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<"orders" | "system">("orders");
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [purchaseNotifications, setPurchaseNotifications] = useState<
    HeaderNotificationOrder[]
  >([]);
  const [cancelledNotifications, setCancelledNotifications] = useState<
    HeaderNotificationOrder[]
  >([]);
  const [soldNotifications, setSoldNotifications] = useState<
    HeaderNotificationOrder[]
  >([]);
  const [orderUnreadCounts, setOrderUnreadCounts] = useState({
    cancelled: 0,
    purchase: 0,
    sold: 0,
    total: 0,
  });
  const [systemNotifications, setSystemNotifications] = useState<
    HeaderSystemNotification[]
  >([]);
  const [systemUnreadCount, setSystemUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [systemNotificationError, setSystemNotificationError] = useState<string | null>(null);
  const [systemNotificationLoading, setSystemNotificationLoading] = useState(false);
  const [orderNotificationSaving, setOrderNotificationSaving] = useState<string | "all" | null>(null);
  const [systemNotificationSaving, setSystemNotificationSaving] = useState<string | "all" | null>(null);
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
  const [chatWidgetSearchTerm, setChatWidgetSearchTerm] = useState("");
  const [chatWidgetActivityFilter, setChatWidgetActivityFilter] =
    useState<ChatWidgetActivityFilter>("all");
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
  const favoriteRef = useRef<HTMLDivElement | null>(null);
  const chatWidgetRef = useRef<HTMLDivElement | null>(null);
  const chatWidgetMessagesRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const toggleSidebarMenu = useCallback(() => {
    if (typeof window === "undefined") return;

    if (window.innerWidth >= DESKTOP_SIDEBAR_MIN_WIDTH) {
      setMobileSidebarOpen(false);
      setSidebarOpen(!sidebarOpen);
      return;
    }

    setSidebarOpen(false);
    setMobileSidebarOpen(!mobileSidebarOpen);
  }, [
    mobileSidebarOpen,
    setMobileSidebarOpen,
    setSidebarOpen,
    sidebarOpen,
  ]);
  const chatWidgetPinnedMessages = useMemo(
    () => chatWidgetMessages.filter((msg) => msg.isPinned && !msg.deletedAt),
    [chatWidgetMessages]
  );

  useEffect(() => {
    const syncSidebarMode = () => {
      const isDesktop = window.innerWidth >= DESKTOP_SIDEBAR_MIN_WIDTH;
      setIsDesktopSidebarViewport(isDesktop);

      if (isDesktop) {
        setMobileSidebarOpen(false);
      } else {
        setSidebarOpen(false);
      }
    };

    syncSidebarMode();
    window.addEventListener("resize", syncSidebarMode);
    return () => window.removeEventListener("resize", syncSidebarMode);
  }, [setMobileSidebarOpen, setSidebarOpen]);
  const fallbackAdminLabel = language === "km" ? "អ្នកគ្រប់គ្រង" : "Admin";
  const fallbackBuyerLabel = language === "km" ? "អ្នកទិញ" : "Buyer";
  const activeParty = chatWidgetActive
    ? isAdmin
      ? chatWidgetActive.buyer
      : chatWidgetActive.seller
    : null;
  const activePartyFallback = isAdmin ? fallbackBuyerLabel : fallbackAdminLabel;
  const activePartyName = chatWidgetActive
    ? resolveDisplayName(activeParty?.name, activeParty?.email) ?? activePartyFallback
    : null;
  const accountDisplayName =
    user?.username?.trim() ||
    user?.firstName?.trim() ||
    user?.email?.trim() ||
    "User";
  const userLevel = Number(user?.level ?? 1);
  const userHasLevelPerks = userLevel >= 2;
  const userAvatarBorderUrl = userHasLevelPerks ? user?.avatarBorderUrl ?? null : null;
  const userPresence = useUserPresence(user?.id ?? null);
  const verifiedBadgeSrc = "/border/blue%20verify.svg";
  const unreadCancelledNotifications = useMemo(
    () => cancelledNotifications.filter((item) => !item.isRead),
    [cancelledNotifications]
  );
  const unreadPurchaseNotifications = useMemo(
    () => purchaseNotifications.filter((item) => !item.isRead),
    [purchaseNotifications]
  );
  const unreadSoldNotifications = useMemo(
    () => soldNotifications.filter((item) => !item.isRead),
    [soldNotifications]
  );
  const unreadSystemNotifications = useMemo(
    () => systemNotifications.filter((item) => !item.isRead),
    [systemNotifications]
  );
  const totalNotificationUnread = systemUnreadCount + orderUnreadCounts.total;
  const notificationHasOrderItems = totalNotificationUnread > 0;
  const favoriteCount = favoriteItems.length;
  const orderUnreadBadge =
    orderUnreadCounts.total > 9 ? "9+" : String(Math.max(0, orderUnreadCounts.total));
  const systemUnreadBadge =
    systemUnreadCount > 9 ? "9+" : String(Math.max(0, systemUnreadCount));
  const activePartyInitials =
    activePartyName?.slice(0, 2).toUpperCase() ??
    activePartyFallback.slice(0, 2).toUpperCase();
  const activePartyAvatar = activeParty?.avatarUrl ?? null;
  const activePartyAvatarBorderUrl = activeParty?.avatarBorderUrl ?? null;
  const activePartyOnline = activeParty?.online ?? false;
  const applySystemNotificationPayload = useCallback((payload: unknown) => {
    const data =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    const notifications: HeaderSystemNotification[] = Array.isArray(data.notifications)
      ? data.notifications.map((item: unknown) => {
          const entry =
            item && typeof item === "object"
              ? (item as Record<string, unknown>)
              : {};
          return {
            id: String(entry.id ?? ""),
            title: String(entry.title ?? ""),
            description: String(entry.description ?? ""),
            icon: normalizeHeaderSystemNotificationIcon(entry.icon),
            createdAt:
              typeof entry.createdAt === "string" ? entry.createdAt : null,
            linkUrl: typeof entry.linkUrl === "string" ? entry.linkUrl : null,
            isRead: entry.isRead === true,
          };
        })
      : [];

    setSystemNotifications(notifications);
    setSystemUnreadCount(
      Number.isFinite(Number(data.unreadCount)) ? Number(data.unreadCount) : 0
    );
  }, []);
  const applyOrderNotificationPayload = useCallback((payload: unknown) => {
    const data =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    const mapOrders = (value: unknown): HeaderNotificationOrder[] =>
      Array.isArray(value)
        ? value.map((item: unknown) => {
            const entry =
              item && typeof item === "object"
                ? (item as Record<string, unknown>)
                : {};
            return {
              id: Number(entry.id ?? 0),
              order_number: String(entry.order_number ?? ""),
              product_title:
                typeof entry.product_title === "string" ? entry.product_title : null,
              isRead: entry.isRead === true,
            };
          })
        : [];

    const unreadCountsRaw =
      data.unreadCounts && typeof data.unreadCounts === "object"
        ? (data.unreadCounts as Record<string, unknown>)
        : {};

    setCancelledNotifications(mapOrders(data.cancelledOrders));
    setPurchaseNotifications(mapOrders(data.purchaseOrders));
    setSoldNotifications(mapOrders(data.soldOrders));
    setOrderUnreadCounts({
      cancelled: Number(unreadCountsRaw.cancelled ?? 0) || 0,
      purchase: Number(unreadCountsRaw.purchase ?? 0) || 0,
      sold: Number(unreadCountsRaw.sold ?? 0) || 0,
      total: Number(unreadCountsRaw.total ?? 0) || 0,
    });
  }, []);
  const chatWidgetActivityCounts = useMemo(() => {
    const counts: Record<ChatWidgetActivityFilter, number> = {
      all: chatWidgetConversations.length,
      online: 0,
      offline: 0,
      read: 0,
      unread: 0,
    };
    for (const conv of chatWidgetConversations) {
      const counterpart = isAdmin ? conv.buyer : conv.seller;
      const online = isAdmin
        ? !!counterpart?.online
        : typeof conv.sellerOnline === "boolean"
          ? !!conv.sellerOnline
          : !!counterpart?.online;
      const unread = Number(conv.unreadCount ?? 0) > 0;
      if (online) counts.online += 1;
      else counts.offline += 1;
      if (unread) counts.unread += 1;
      else counts.read += 1;
    }
    return counts;
  }, [chatWidgetConversations, isAdmin]);
  const filteredChatWidgetConversations = useMemo(() => {
    const term = chatWidgetSearchTerm.trim().toLowerCase();
    return chatWidgetConversations.filter((conv) => {
      const counterpart = isAdmin ? conv.buyer : conv.seller;
      const online = isAdmin
        ? !!counterpart?.online
        : typeof conv.sellerOnline === "boolean"
          ? !!conv.sellerOnline
          : !!counterpart?.online;
      const unread = Number(conv.unreadCount ?? 0) > 0;
      if (chatWidgetActivityFilter === "online" && !online) return false;
      if (chatWidgetActivityFilter === "offline" && online) return false;
      if (chatWidgetActivityFilter === "unread" && !unread) return false;
      if (chatWidgetActivityFilter === "read" && unread) return false;
      if (!term) return true;
      const buyerText = `${conv.buyer?.name ?? ""} ${conv.buyer?.email ?? ""}`.toLowerCase();
      const sellerText = `${conv.seller?.name ?? ""} ${conv.seller?.email ?? ""}`.toLowerCase();
      const orderText = String(conv.orderNumber ?? "").toLowerCase();
      return buyerText.includes(term) || sellerText.includes(term) || orderText.includes(term);
    });
  }, [chatWidgetConversations, chatWidgetSearchTerm, chatWidgetActivityFilter, isAdmin]);
  const getChatWidgetFilterLabel = (filter: ChatWidgetActivityFilter) => {
    switch (filter) {
      case "online":
        return t("popup.filterOnline");
      case "offline":
        return t("popup.filterOffline");
      case "read":
        return t("popup.filterRead");
      case "unread":
        return t("popup.filterUnread");
      default:
        return t("popup.filterAll");
    }
  };
  const emojiQuickList = ["😀", "😂", "😍", "😎", "🙏", "👍", "🔥", "🎉"];

  const normalizeWidgetMessage = useCallback(
  (msg: any): HeaderChatMessage => ({
    id: Number(msg.id ?? 0),
    senderId: Number(msg.senderId ?? 0),
    body: String(msg.body ?? ''),
    createdAt: msg.createdAt ?? null,
      senderName: msg.sender?.name ?? msg.sender?.email ?? null,
      senderAvatar: msg.sender?.avatarUrl ?? null,
      senderAvatarBorderUrl: msg.sender?.avatarBorderUrl ?? null,
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
    { name: t('nav.ai'), value: 'courses' },
    { name: t('nav.programs'), value: 'programs' },
    { name: t('nav.games'), value: 'games' },
    { name: t('nav.tools'), value: 'tools' },
    { name: t('nav.videoCourses'), value: 'video-courses' },
    { name: t('nav.blog'), value: 'blog' },
    { name: t('nav.about'), value: 'services' }
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
    avatarBorderUrl: participant?.avatarBorderUrl ?? null,
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
            ? 'មិនអាចផ្ទុកការជជែកបានទេ'
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
          ? 'មិនអាចផ្ទុកការជជែកបានទេ'
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
    avatarBorderUrl: raw.buyer?.avatarBorderUrl ?? raw.buyer_avatar_border ?? null,
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
    avatarBorderUrl: raw.seller?.avatarBorderUrl ?? raw.seller_avatar_border ?? null,
    presence: {
      status: raw.seller?.presence?.status ?? raw.seller_status ?? null,
      lastActiveAt: raw.seller?.presence?.lastActiveAt ?? raw.seller_last_active_at ?? null,
    },
  });
  return {
    orderId: Number(raw.orderId ?? raw.order_id ?? 0),
    orderNumber: String(raw.orderNumber ?? raw.order_number ?? ''),
    state: raw.state ?? null,
    result: raw.result ?? null,
    handlerAdminId:
      raw.handlerAdminId === null || raw.handlerAdminId === undefined
        ? null
        : Number(raw.handlerAdminId),
    handlerAdminName:
      typeof raw.handlerAdminName === "string" && raw.handlerAdminName.trim()
        ? raw.handlerAdminName.trim()
        : null,
    buyer,
    seller,
    sellerAvatarBorderUrl:
      raw.seller?.avatarBorderUrl ?? raw.seller_avatar_border ?? null,
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

const getChatOrderStateLabel = (state?: string | null) => {
  const normalized = (state ?? "").toLowerCase();
  const labels: Record<string, string> = {
    pending: "Order is Preparing",
    approved: "Approved",
    delivering: "Delivering",
    completed: "Complete",
    cancelled: "Cancelled",
    canceled: "Cancelled",
    resolution: "Resolution",
  };
  return labels[normalized] ?? "Unknown";
};

const getChatOrderStateBadgeClass = (state?: string | null) => {
  const normalized = (state ?? "").toLowerCase();
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5 shadow-sm";
  if (normalized === "completed") {
    return `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return `${base} border-rose-200 bg-rose-50 text-rose-700`;
  }
  if (normalized === "resolution") {
    return `${base} border-red-200 bg-red-50 text-red-700`;
  }
  if (normalized === "approved" || normalized === "delivering") {
    return `${base} border-blue-200 bg-blue-50 text-blue-700`;
  }
  return `${base} border-slate-200 bg-slate-50 text-slate-700`;
};

const getChatNoteLabel = (result?: string | null) => {
  const normalized = (result ?? "").toLowerCase();
  if (normalized === "done") return "Done";
  if (normalized === "failed") return "Cancel";
  return "Not yet";
};

const getChatNoteBadgeClass = (result?: string | null) => {
  const normalized = (result ?? "").toLowerCase();
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-5 shadow-sm";
  if (normalized === "done") return `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
  if (normalized === "failed") return `${base} border-rose-200 bg-rose-50 text-rose-700`;
  return `${base} border-gray-200 bg-gray-50 text-gray-700`;
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
            ? 'មិនអាចផ្ទុកការសន្ទនាបានទេ'
            : 'Unable to load chats'
        );
      }
      const normalized: HeaderChatSummary[] = (Array.isArray(data.conversations)
        ? data.conversations
        : []
      ).map(mapSummary);
      setChatWidgetConversations(normalized);
      const unreadTotal = normalized.reduce(
        (sum, conv) => sum + Number(conv.unreadCount ?? 0),
        0
      );
      setHasChatActivity(unreadTotal > 0);
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
      setHasChatActivity(false);
      if (!keepActive) {
        setChatWidgetActive(null);
        setChatWidgetMessages([]);
      }
      setChatWidgetError(
        err instanceof Error
          ? err.message
          : language === 'km'
          ? 'មិនអាចផ្ទុកការសន្ទនាបានទេ'
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
        setChatWidgetSearchTerm("");
        setChatWidgetActivityFilter("all");
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

  const handleToggleNotifications = () => {
    setNotificationOpen((prev) => !prev);
    setNotificationTab("orders");
  };

  const handleToggleFavorites = () => {
    setFavoriteOpen((prev) => !prev);
  };

  const handleOpenFavoriteItem = (item: FavoriteItem) => {
    setFavoriteOpen(false);
    if (typeof window !== "undefined") {
      window.location.href = item.href;
    }
  };

  const loadNotifications = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setNotificationLoading(true);
        setSystemNotificationLoading(true);
      }
      setNotificationError(null);
      setSystemNotificationError(null);
      try {
        const [ordersRes, systemRes] = await Promise.all([
          fetch("/api/notifications/orders", {
            cache: "no-store",
            credentials: "include",
          }),
          fetch("/api/notifications/system", {
            cache: "no-store",
            credentials: "include",
          }),
        ]);
        const [ordersData, systemData] = await Promise.all([
          ordersRes.json().catch(() => ({})),
          systemRes.json().catch(() => ({})),
        ]);
        if (!ordersRes.ok) {
          setNotificationError(
            typeof ordersData?.error === "string"
              ? ordersData.error
              : "Failed to load"
          );
          setCancelledNotifications([]);
          setPurchaseNotifications([]);
          setSoldNotifications([]);
          setOrderUnreadCounts({ cancelled: 0, purchase: 0, sold: 0, total: 0 });
        } else {
          applyOrderNotificationPayload(ordersData);
        }

        if (!systemRes.ok) {
          setSystemNotificationError(
            typeof systemData?.error === "string"
              ? systemData.error
              : "Failed to load"
          );
          setSystemNotifications([]);
          setSystemUnreadCount(0);
        } else {
          applySystemNotificationPayload(systemData);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load";
        setNotificationError(message);
        setSystemNotificationError(message);
        setCancelledNotifications([]);
        setPurchaseNotifications([]);
        setSoldNotifications([]);
        setOrderUnreadCounts({ cancelled: 0, purchase: 0, sold: 0, total: 0 });
        setSystemNotifications([]);
        setSystemUnreadCount(0);
      } finally {
        if (showLoading) {
          setNotificationLoading(false);
          setSystemNotificationLoading(false);
        }
      }
    },
    [applyOrderNotificationPayload, applySystemNotificationPayload]
  );

  useEffect(() => {
    if (!notificationOpen) return;
    void loadNotifications(true);
  }, [notificationOpen, loadNotifications]);

  useEffect(() => {
    const handleRefresh = () => {
      if (!isAuthenticated) return;
      void loadNotifications(notificationOpen);
    };

    window.addEventListener("edugroit-system-notifications-changed", handleRefresh);
    window.addEventListener("edugroit-order-notifications-changed", handleRefresh);

    return () => {
      window.removeEventListener("edugroit-system-notifications-changed", handleRefresh);
      window.removeEventListener("edugroit-order-notifications-changed", handleRefresh);
    };
  }, [isAuthenticated, loadNotifications, notificationOpen]);

  useEffect(() => {
    const syncFavorites = () => {
      setFavoriteItems(readFavoriteItems());
    };

    const openFavorites = () => {
      syncFavorites();
      setFavoriteOpen(true);
    };

    syncFavorites();
    window.addEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);
    window.addEventListener(OPEN_FAVORITES_EVENT, openFavorites);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);
      window.removeEventListener(OPEN_FAVORITES_EVENT, openFavorites);
    };
  }, []);

  useEffect(() => {
    if (!favoriteOpen) return;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (favoriteRef.current && !favoriteRef.current.contains(target)) {
        setFavoriteOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [favoriteOpen]);

  useEffect(() => {
    if (!notificationOpen) return;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [notificationOpen]);

  const handleMarkSystemNotificationRead = useCallback(
    async (notificationId: string) => {
      if (!notificationId || systemNotificationSaving) return;
      setSystemNotificationSaving(notificationId);
      setSystemNotificationError(null);
      try {
        const res = await fetch("/api/notifications/system", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: Number(notificationId) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data?.error === "string" ? data.error : "Failed to update"
          );
        }
        applySystemNotificationPayload(data);
      } catch (err) {
        setSystemNotificationError(
          err instanceof Error ? err.message : "Failed to update"
        );
      } finally {
        setSystemNotificationSaving(null);
      }
    },
    [applySystemNotificationPayload, systemNotificationSaving]
  );

  const handleMarkAllSystemNotificationsRead = useCallback(async () => {
    if (systemNotificationSaving || systemUnreadCount <= 0) return;
    setSystemNotificationSaving("all");
    setSystemNotificationError(null);
    try {
      const res = await fetch("/api/notifications/system", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Failed to update"
        );
      }
      applySystemNotificationPayload(data);
    } catch (err) {
      setSystemNotificationError(
        err instanceof Error ? err.message : "Failed to update"
      );
    } finally {
      setSystemNotificationSaving(null);
    }
  }, [applySystemNotificationPayload, systemNotificationSaving, systemUnreadCount]);

  const handleMarkOrderNotificationRead = useCallback(
    async (orderId: number, scope: "cancelled" | "purchase" | "sold") => {
      if (!orderId || orderNotificationSaving) return;
      setOrderNotificationSaving(`${scope}:${orderId}`);
      setNotificationError(null);
      try {
        const res = await fetch("/api/notifications/orders", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, scope }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data?.error === "string" ? data.error : "Failed to update"
          );
        }
        applyOrderNotificationPayload(data);
      } catch (err) {
        setNotificationError(
          err instanceof Error ? err.message : "Failed to update"
        );
      } finally {
        setOrderNotificationSaving(null);
      }
    },
    [applyOrderNotificationPayload, orderNotificationSaving]
  );

  const handleMarkAllOrderNotificationsRead = useCallback(async () => {
    if (orderNotificationSaving || orderUnreadCounts.total <= 0) return;
    setOrderNotificationSaving("all");
    setNotificationError(null);
    try {
      const res = await fetch("/api/notifications/orders", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Failed to update"
        );
      }
      applyOrderNotificationPayload(data);
    } catch (err) {
      setNotificationError(
        err instanceof Error ? err.message : "Failed to update"
      );
    } finally {
        setOrderNotificationSaving(null);
    }
  }, [applyOrderNotificationPayload, orderNotificationSaving, orderUnreadCounts.total]);

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
          ? 'មិនអាចផ្ញើស្ទីគ័របានទេ'
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
            ? 'មិនអាចដាក់ប្រតិកម្មបានទេ'
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
          ? 'មិនអាចដាក់ប្រតិកម្មបានទេ'
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
            ? "មិនអាចលុបសារបានទេ"
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
          ? "មិនអាចលុបសារបានទេ"
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
            ? "មិនអាចបិទភ្ជាប់សារបានទេ"
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
          ? "មិនអាចបិទភ្ជាប់សារបានទេ"
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
          ? "សូមបញ្ចូលសារដែលបានកែ"
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

  const handleLogout = async () => {
    await logout();
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
    <header
      className={`sticky top-0 z-30 border-b shadow-sm transition-colors ${
        isAppShell
          ? "app-safe-top bg-gradient-to-br from-blue-50 via-purple-50 to-white/95 border-slate-200/80 backdrop-blur dark:from-slate-950 dark:via-slate-900 dark:to-slate-950/95 dark:border-slate-800"
          : "bg-gradient-to-br from-blue-50 via-purple-50 to-white border-gray-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:border-gray-700"
      }`}
    >
      {/* Top Bar - Currency, Language, Theme, Social Icons */}
      <div
        className={`bg-gradient-to-r from-blue-50 via-purple-50 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 border-b border-gray-200 dark:border-gray-700 ${
          isAppShell ? "hidden" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-10">
            {/* Left Side - Currency, Translate, Theme */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
              {/* Currency Switcher */}
              <button
                onClick={() => setCurrency(currency === 'USD' ? 'KHR' : 'USD')}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={currency === 'USD' ? 'Switch to KHR' : 'Switch to USD'}
              >
                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="font-semibold hidden xs:inline">{currency}</span>
              </button>

              {/* Language Switcher */}
              <button
                onClick={() => setLanguage(language === 'en' ? 'km' : 'en')}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={language === 'en' ? 'Switch to Khmer' : 'Switch to English'}
              >
                <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="font-medium">{language === 'en' ? 'KM' : 'EN'}</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {theme === 'light' ? <Moon className="w-3 h-3 sm:w-4 sm:h-4" /> : <Sun className="w-3 h-3 sm:w-4 sm:h-4" />}
                <span className="font-medium hidden md:inline">{theme === 'light' ? 'Dark' : 'Light'}</span>
              </button>
            </div>

            {/* Right Side - Social Media Icons */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                title="YouTube"
              >
                <Youtube className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>

              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Facebook"
              >
                <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>

              <a
                href="https://t.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:text-blue-400 dark:hover:text-blue-300 transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Telegram"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>

              <a
                href="https://www.tiktok.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                title="TikTok"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className={`max-w-7xl mx-auto overflow-x-clip ${isAppShell ? "px-3 sm:px-4 lg:px-6" : "px-4 sm:px-6 lg:px-8"}`}>
        <div className={`flex items-center justify-between ${isAppShell ? "h-[4rem] sm:h-[4.25rem] md:h-[4.5rem]" : "h-[4.25rem] sm:h-[4.5rem] md:h-[4.75rem]"}`}>
          {/* Left: Hamburger Menu + Logo */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={toggleSidebarMenu}
              className={`p-2 transition-colors ${
                isAppShell
                  ? "rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-900"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              }`}
              aria-label="Toggle menu"
            >
              {isDesktopSidebarViewport && sidebarOpen ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300" />
              )}
            </button>

            {/* Logo - Mobile: Logo + Name, Desktop: Logo + Name */}
            <button
              onClick={() => onNavigate('home')}
              className="flex min-w-0 items-center gap-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <img
                src="/khqr-assets/gstechkh-logo.png"
                alt="GSTECHKH"
                className="h-7 w-7 sm:h-10 sm:w-10 md:h-11 md:w-11 flex-shrink-0 object-contain rounded-lg shadow-md"
              />
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="font-bold text-blue-600 dark:text-blue-400 text-[0.7rem] sm:hidden">
                  GSTECH
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400 hidden sm:block sm:text-lg md:text-xl">
                  GSTECHKH
                </span>
                <span className="font-bold text-purple-600 dark:text-purple-400 text-xs sm:hidden">
                  KH
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation - Hidden on mobile/tablet */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => (
              <button
                key={link.value}
                onClick={() => onNavigate(link.value)}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-all hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  currentPage === link.value
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {link.name}
              </button>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Notification */}
          <div className="relative order-3 sm:order-none" ref={notificationRef}>
            <button
              onClick={handleToggleNotifications}
              className={`relative rounded-lg text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                isAppShell ? "p-1.5 sm:p-2" : "p-2"
              }`}
              title="Notifications"
            >
              <Bell className="h-5 w-5 sm:h-5 sm:w-5" />
              {totalNotificationUnread > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] sm:text-[10px] font-semibold leading-4 text-white">
                  {totalNotificationUnread > 9 ? "9+" : totalNotificationUnread}
                </span>
              ) : notificationHasOrderItems ? (
                <span className="absolute top-1.5 right-1.5 block w-2 h-2 rounded-full bg-green-500" />
              ) : null}
            </button>

            {notificationOpen && (
              <div className="fixed left-1/2 top-24 z-50 w-[calc(100vw-1rem)] max-w-sm -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:z-40 sm:mt-3 sm:w-80 sm:max-w-none sm:translate-x-0">
                <div className="border-b border-gray-100 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900 sm:px-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNotificationTab("orders")}
                      className={`inline-flex min-w-0 items-center justify-center rounded-full px-2.5 py-2 text-[11px] font-semibold whitespace-nowrap transition sm:px-3 sm:py-1.5 sm:text-xs ${
                        notificationTab === "orders"
                          ? "bg-blue-600 text-white"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                      }`}
                    >
                      <span className="truncate sm:hidden">Orders</span>
                      <span className="hidden truncate sm:inline">Order Notification</span>
                      {orderUnreadCounts.total > 0 ? (
                        <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] leading-none text-white">
                          {orderUnreadBadge}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationTab("system")}
                      className={`inline-flex min-w-0 items-center justify-center rounded-full px-2.5 py-2 text-[11px] font-semibold whitespace-nowrap transition sm:px-3 sm:py-1.5 sm:text-xs ${
                        notificationTab === "system"
                          ? "bg-blue-600 text-white"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                      }`}
                    >
                      <span className="truncate sm:hidden">Alerts</span>
                      <span className="hidden truncate sm:inline">Notification</span>
                      {systemUnreadCount > 0 ? (
                        <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] leading-none text-white">
                          {systemUnreadBadge}
                        </span>
                      ) : null}
                    </button>
                  </div>
                </div>

                {notificationTab === "orders" ? (
                  <div className="modal-scrollbar max-h-[calc(100vh-8rem)] overflow-y-auto sm:max-h-[28rem]">
                    <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 sm:text-[11px] sm:tracking-[0.12em]">
                        <span className="sm:hidden">Orders</span>
                        <span className="hidden sm:inline">Order Notifications</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleMarkAllOrderNotificationsRead}
                        disabled={orderUnreadCounts.total <= 0 || orderNotificationSaving !== null}
                        className="shrink-0 text-[11px] font-medium text-blue-600 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-blue-400 dark:disabled:text-gray-600 sm:text-xs"
                      >
                        {orderNotificationSaving === "all" ? "Saving..." : "Mark all"}
                      </button>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-[10px] font-semibold tracking-[0.08em] text-gray-500 dark:text-gray-400 flex items-center justify-between gap-3 sm:px-4 sm:text-[11px] sm:tracking-[0.12em]">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{t("popup.cancelledOrders")}</span>
                        {orderUnreadCounts.cancelled > 0 ? (
                          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] leading-none text-white">
                            {orderUnreadCounts.cancelled > 9 ? "9+" : orderUnreadCounts.cancelled}
                          </span>
                        ) : null}
                      </span>
                      <button
                        onClick={() => {
                          setNotificationOpen(false);
                          onNavigate("orders");
                        }}
                        className="shrink-0 whitespace-nowrap text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                      >
                        {t("popup.viewAll")}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {notificationLoading ? (
                        <div className="px-4 py-4 text-sm text-gray-500">
                          {t("popup.loading")}
                        </div>
                      ) : notificationError ? (
                        <div className="px-4 py-4 text-sm text-red-500">
                          {notificationError}
                        </div>
                      ) : unreadCancelledNotifications.length === 0 ? (
                        <div className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                          No cancelled orders
                        </div>
                      ) : (
                        unreadCancelledNotifications.map((item) => (
                          <div
                            key={`cancelled-${item.order_number}`}
                            className={`flex items-start gap-3 px-4 py-3 ${
                              item.isRead ? "" : "bg-blue-50/50 dark:bg-blue-950/20"
                            }`}
                          >
                            <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-900/20">
                              <X className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {!item.isRead ? (
                                  <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                ) : null}
                                <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                  {item.product_title || t("popup.orderItem")}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                #{item.order_number}
                              </div>
                              <div className="mt-2">
                                {!item.isRead ? (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkOrderNotificationRead(item.id, "cancelled")}
                                    disabled={orderNotificationSaving !== null}
                                    className="text-xs font-medium text-blue-600 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-blue-400 dark:disabled:text-gray-600"
                                  >
                                    {orderNotificationSaving === `cancelled:${item.id}` ? t("popup.saving") : t("popup.markRead")}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">Read</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-[10px] font-semibold tracking-[0.08em] text-gray-500 dark:text-gray-400 flex items-center justify-between gap-3 sm:px-4 sm:text-[11px] sm:tracking-[0.12em]">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">Purchase Orders</span>
                        {orderUnreadCounts.purchase > 0 ? (
                          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] leading-none text-white">
                            {orderUnreadCounts.purchase > 9 ? "9+" : orderUnreadCounts.purchase}
                          </span>
                        ) : null}
                      </span>
                      <button
                        onClick={() => {
                          setNotificationOpen(false);
                          onNavigate("orders");
                        }}
                        className="shrink-0 whitespace-nowrap text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                      >
                        {t("popup.viewAll")}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {notificationLoading ? (
                        <div className="px-4 py-4 text-sm text-gray-500">
                          {t("popup.loading")}
                        </div>
                      ) : notificationError ? (
                        <div className="px-4 py-4 text-sm text-red-500">
                          {notificationError}
                        </div>
                      ) : unreadPurchaseNotifications.length === 0 ? (
                        <div className="px-4 py-4 text-sm text-gray-500">
                          No purchase orders
                        </div>
                      ) : (
                        unreadPurchaseNotifications.map((item) => (
                          <div
                            key={item.order_number}
                            className={`flex items-start gap-3 px-4 py-3 ${
                              item.isRead ? "" : "bg-blue-50/50 dark:bg-blue-950/20"
                            }`}
                          >
                            <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
                              <ShoppingCart className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {!item.isRead ? (
                                  <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                ) : null}
                                <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                  {item.product_title || t("popup.orderItem")}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                #{item.order_number}
                              </div>
                              <div className="mt-2">
                                {!item.isRead ? (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkOrderNotificationRead(item.id, "purchase")}
                                    disabled={orderNotificationSaving !== null}
                                    className="text-xs font-medium text-blue-600 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-blue-400 dark:disabled:text-gray-600"
                                  >
                                    {orderNotificationSaving === `purchase:${item.id}` ? t("popup.saving") : t("popup.markRead")}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">{t("popup.read")}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-[10px] font-semibold tracking-[0.08em] text-gray-500 dark:text-gray-400 flex items-center justify-between gap-3 sm:px-4 sm:text-[11px] sm:tracking-[0.12em]">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{t("popup.soldOrders")}</span>
                        {orderUnreadCounts.sold > 0 ? (
                          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] leading-none text-white">
                            {orderUnreadCounts.sold > 9 ? "9+" : orderUnreadCounts.sold}
                          </span>
                        ) : null}
                      </span>
                      <button
                        onClick={() => {
                          setNotificationOpen(false);
                          onNavigate("orders");
                        }}
                        className="shrink-0 whitespace-nowrap text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                      >
                        {t("popup.viewAll")}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {notificationLoading ? (
                        <div className="px-4 py-4 text-sm text-gray-500">
                          {t("popup.loading")}
                        </div>
                      ) : notificationError ? (
                        <div className="px-4 py-4 text-sm text-red-500">
                          {notificationError}
                        </div>
                      ) : unreadSoldNotifications.length === 0 ? (
                        <div className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          {t("popup.noNewSoldOrders")}
                        </div>
                      ) : (
                        unreadSoldNotifications.map((item) => (
                          <div
                            key={item.order_number}
                            className={`flex items-start gap-3 px-4 py-3 ${
                              item.isRead ? "" : "bg-blue-50/50 dark:bg-blue-950/20"
                            }`}
                          >
                            <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
                              <Package className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {!item.isRead ? (
                                  <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                ) : null}
                                <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                  {item.product_title || t("popup.orderItem")}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                #{item.order_number}
                              </div>
                              <div className="mt-2">
                                {!item.isRead ? (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkOrderNotificationRead(item.id, "sold")}
                                    disabled={orderNotificationSaving !== null}
                                    className="text-xs font-medium text-blue-600 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-blue-400 dark:disabled:text-gray-600"
                                  >
                                    {orderNotificationSaving === `sold:${item.id}` ? t("popup.saving") : t("popup.markRead")}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">{t("popup.read")}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="modal-scrollbar max-h-[calc(100vh-8rem)] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 sm:max-h-[28rem]">
                    <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 sm:text-[11px] sm:tracking-[0.12em]">
                        {t("popup.systemNotifications")}
                      </div>
                      <button
                        type="button"
                        onClick={handleMarkAllSystemNotificationsRead}
                        disabled={systemUnreadCount <= 0 || systemNotificationSaving !== null}
                        className="shrink-0 text-[11px] font-medium text-blue-600 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-blue-400 dark:disabled:text-gray-600 sm:text-xs"
                      >
                        {systemNotificationSaving === "all" ? t("popup.saving") : t("popup.markAllRead")}
                      </button>
                    </div>
                    {systemNotificationLoading ? (
                      <div className="px-4 py-4 text-sm text-gray-500">
                        {t("popup.loading")}
                      </div>
                    ) : systemNotificationError ? (
                      <div className="px-4 py-4 text-sm text-red-500">
                        {systemNotificationError}
                      </div>
                    ) : unreadSystemNotifications.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {t("popup.noNotifications")}
                      </div>
                    ) : (
                      unreadSystemNotifications.map((item) => {
                        const iconNode =
                          item.icon === "security" ? (
                            <Bell className="h-4 w-4" />
                          ) : item.icon === "account" ? (
                            <User className="h-4 w-4" />
                          ) : item.icon === "product" ? (
                            <Package className="h-4 w-4" />
                          ) : (
                            <Layers className="h-4 w-4" />
                          );
                        const iconClass =
                          item.icon === "security"
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300"
                            : item.icon === "account"
                              ? "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300"
                              : item.icon === "product"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300"
                                : "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300";

                        return (
                          <div
                            key={item.id}
                            className={`flex items-start gap-3 px-4 py-3 ${
                              item.isRead ? "" : "bg-blue-50/50 dark:bg-blue-950/20"
                            }`}
                          >
                            <div className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full ${iconClass}`}>
                              {iconNode}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  {!item.isRead ? (
                                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                  ) : null}
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {item.title}
                                  </div>
                                </div>
                                {item.createdAt ? (
                                  <div className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
                                    {formatWidgetTime(item.createdAt)}
                                  </div>
                                ) : null}
                              </div>
                              <div className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                {item.description}
                              </div>
                              <div className="mt-2 flex items-center gap-3">
                                {!item.isRead ? (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkSystemNotificationRead(item.id)}
                                    disabled={systemNotificationSaving !== null}
                                    className="text-xs font-medium text-blue-600 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-blue-400 dark:disabled:text-gray-600"
                                  >
                                    {systemNotificationSaving === item.id ? t("popup.saving") : t("popup.markRead")}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {t("popup.read")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative order-2 sm:order-none" ref={favoriteRef}>
            <button
              onClick={handleToggleFavorites}
              className={`hidden sm:inline-flex rounded-lg text-gray-700 transition-colors hover:text-rose-500 dark:text-gray-300 dark:hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                isAppShell ? "p-1.5 sm:p-2" : "p-2"
              }`}
              title={t("profile.favorite")}
            >
              <Heart className="h-5 w-5 sm:h-5 sm:w-5" />
              {favoriteCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold leading-4 text-white">
                  {favoriteCount > 9 ? "9+" : favoriteCount}
                </span>
              ) : null}
            </button>

            <button
              onClick={handleToggleFavorites}
              className="relative order-2 rounded-lg p-2 text-gray-700 transition-colors hover:text-rose-500 dark:text-gray-300 dark:hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-gray-800 sm:hidden inline-flex"
              title={t("profile.favorite")}
            >
              <Heart className="w-5 h-5" />
              {favoriteCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold leading-4 text-white">
                  {favoriteCount > 9 ? "9+" : favoriteCount}
                </span>
              ) : null}
            </button>

            {favoriteOpen && (
              <div className="fixed left-3 right-3 top-24 z-50 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[24rem]">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t("profile.favorite")}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("favorites.savedItems", { count: favoriteCount })}
                    </p>
                  </div>
                  {favoriteCount > 0 ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFavoriteOpen(false);
                          onNavigate("favorites");
                        }}
                        className="text-xs font-semibold text-rose-500 transition hover:text-rose-600"
                      >
                        {t("favorites.viewAll")}
                      </button>
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                        {favoriteCount}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="max-h-[calc(100vh-8rem)] overflow-y-auto sm:max-h-[24rem]">
                  {favoriteCount === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      {t("favorites.empty")}
                    </div>
                  ) : (
                    favoriteItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 dark:border-gray-800"
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenFavoriteItem(item)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <img
                            src={item.image ?? "/placeholder.png"}
                            alt={item.title}
                            className="h-14 w-14 rounded-xl object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {item.title}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              {item.label ? (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                  {item.label}
                                </span>
                              ) : null}
                              {item.price === null ? null : Number(item.price) === 0 ? (
                                <span>{t("labels.free")}</span>
                              ) : (
                                <span>{formatPrice(Number(item.price))}</span>
                              )}
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFavoriteItems(removeFavoriteItem(item.id))}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500 transition hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300"
                          title={t("favorites.remove")}
                        >
                          <Heart className="h-4 w-4 fill-current" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Chat - Desktop/Tablet */}
          <div className="relative inline-flex">
            <button
              onClick={handleToggleChatWidget}
              className={`relative hidden rounded-lg text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 sm:inline-flex ${
                isAppShell ? "p-1.5 sm:p-2" : "p-2"
              }`}
              title={t("popup.chat")}
            >
              <MessageCircle className="h-5 w-5 sm:h-5 sm:w-5" />
              {hasChatActivity && (
                <span className="absolute top-1.5 right-1.5 block w-2 h-2 rounded-full bg-green-500" />
              )}
            </button>
            {chatWidgetOpen && (
              <div
                ref={chatWidgetRef}
                className="fixed left-3 right-3 top-24 z-50 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl overscroll-contain dark:border-gray-700 dark:bg-gray-900 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[28rem]"
              >
                {!chatWidgetActive ? (
                  <div className="flex h-[30rem] max-h-[calc(100vh-8rem)] flex-col sm:h-[40rem]">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {t("popup.chatWithAdmins")}
                        </p>
                        <p className="text-xs opacity-80">{t("popup.selectConversation")}</p>
                      </div>
                      <button
                        onClick={() => setChatWidgetOpen(false)}
                        className="p-1 rounded-full hover:bg-white/20 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 uppercase font-semibold">
                      <span>{t("popup.conversations")}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setChatWidgetOpen(false);
                          onNavigate("chat");
                        }}
                      >
                        {t("popup.viewAll")}
                      </Button>
                    </div>
                    <div className="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800 space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          value={chatWidgetSearchTerm}
                          onChange={(e) => setChatWidgetSearchTerm(e.target.value)}
                          placeholder={t("popup.searchOrderEmail")}
                          className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-8 pr-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          [
                            { key: "all", label: "All" },
                            { key: "online", label: "Online" },
                            { key: "offline", label: "Offline" },
                            { key: "read", label: "Read" },
                            { key: "unread", label: "Unread" },
                          ] as Array<{ key: ChatWidgetActivityFilter; label: string }>
                        ).map((tab) => {
                          const active = chatWidgetActivityFilter === tab.key;
                          const count = chatWidgetActivityCounts[tab.key] ?? 0;
                          return (
                            <button
                              key={`chat-widget-${tab.key}`}
                              onClick={() => setChatWidgetActivityFilter(tab.key)}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold transition ${
                                tab.key === "all"
                                  ? active
                                    ? "border-blue-800 bg-blue-800 text-white shadow-sm"
                                    : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                  : tab.key === "online"
                                    ? active
                                      ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    : tab.key === "offline"
                                      ? active
                                        ? "border-gray-700 bg-gray-700 text-white shadow-sm"
                                        : "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
                                      : tab.key === "read"
                                        ? active
                                          ? "border-amber-600 bg-amber-600 text-white shadow-sm"
                                          : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                        : active
                                          ? "border-rose-700 bg-rose-700 text-white shadow-sm"
                                          : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                              }`}
                            >
                              <span>{getChatWidgetFilterLabel(tab.key)}</span>
                              <span
                                className={`inline-flex min-w-[16px] items-center justify-center rounded-full px-1 py-0.5 text-[9px] ${
                                  tab.key === "all"
                                    ? active
                                      ? "bg-white/25 text-white"
                                      : "bg-blue-100 text-blue-700"
                                    : tab.key === "online"
                                      ? active
                                        ? "bg-white/25 text-white"
                                        : "bg-emerald-100 text-emerald-700"
                                      : tab.key === "offline"
                                        ? active
                                          ? "bg-white/25 text-white"
                                          : "bg-gray-200 text-gray-700"
                                        : tab.key === "read"
                                          ? active
                                            ? "bg-white/25 text-white"
                                            : "bg-amber-100 text-amber-700"
                                          : active
                                            ? "bg-white/25 text-white"
                                            : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-2 touch-pan-y [-webkit-overflow-scrolling:touch]">
                      {chatWidgetLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t("popup.loading")}
                        </div>
                      ) : filteredChatWidgetConversations.length === 0 ? (
                        <div className="text-sm text-gray-500">
                          {t("popup.noConversations")}
                        </div>
                      ) : (
                        filteredChatWidgetConversations.map((conv) => {
                          const isActive = false;
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
                          const avatarBorderUrl = isAdmin
                            ? counterpart?.avatarBorderUrl ?? null
                            : conv.sellerAvatarBorderUrl ?? counterpart?.avatarBorderUrl ?? null;
                          const online = isAdmin
                            ? !!counterpart?.online
                            : typeof conv.sellerOnline === "boolean"
                            ? !!conv.sellerOnline
                            : !!counterpart?.online;
                          const snippet =
                            conv.lastMessageType === "sticker"
                              ? t("popup.sticker")
                              : conv.lastMessage ||
                                t("popup.noMessages");
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
                                  <ProfileAvatar
                                    src={avatar}
                                    alt={displayName}
                                    fallback={initials}
                                    borderUrl={avatarBorderUrl}
                                    className="h-10 w-10"
                                    contentClassName="border border-blue-200"
                                    fallbackClassName="text-sm"
                                  />
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
                                  <div className="mt-0.5 flex items-center gap-2">
                                    <div className="text-xs text-gray-500 truncate">
                                      Order {conv.orderNumber}
                                    </div>
                                    <span className={getChatOrderStateBadgeClass(conv.state)}>
                                      {getChatOrderStateLabel(conv.state)}
                                    </span>
                                    {isAdmin ? (
                                      <span className={getChatNoteBadgeClass(conv.result)}>
                                        {getChatNoteLabel(conv.result)}
                                      </span>
                                    ) : null}
                                    {isAdmin && conv.handlerAdminName ? (
                                      <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold leading-5 text-violet-700 shadow-sm">
                                        {conv.handlerAdminName}
                                      </span>
                                    ) : null}
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
                  <div className="flex h-[30rem] max-h-[calc(100vh-8rem)] flex-col sm:h-[40rem]">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between gap-3">
                      <button
                        onClick={handleBackToWidgetList}
                        className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                        title={t("popup.back")}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative">
                          <ProfileAvatar
                            src={activePartyAvatar}
                            alt={activePartyName ?? activePartyFallback}
                            fallback={activePartyInitials}
                            borderUrl={activePartyAvatarBorderUrl}
                            className="h-10 w-10"
                            contentClassName="border border-white/30"
                            fallbackClassName="bg-white/20 text-sm"
                          />
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
                          <span className={getChatOrderStateBadgeClass(chatWidgetActive.state)}>
                            {getChatOrderStateLabel(chatWidgetActive.state)}
                          </span>
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
                        {t("popup.adminReady")}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenOrderDetail(chatWidgetActive.orderId)}
                      >
                        {t("popup.viewOrder")}
                      </Button>
                    </div>
                    <div ref={chatWidgetMessagesRef} className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 touch-pan-y [-webkit-overflow-scrolling:touch]">
                      {chatWidgetMessagesLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t("popup.loading")}
                        </div>
                      ) : chatWidgetMessages.length === 0 ? (
                        <div className="text-sm text-gray-500">
                          {t("popup.noMessagesYet")}
                        </div>
                      ) : (
                        <>
                          {chatWidgetPinnedMessages.length > 0 && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3 text-xs text-amber-700 dark:text-amber-100 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Pin className="w-3 h-3" />
                                <span>
                                  {t("popup.pinnedMessages")} (
                                  {chatWidgetPinnedMessages.length})
                                </span>
                              </div>
                              <span className="text-[11px] text-amber-500 dark:text-amber-200">
                                {t("popup.highlighted")}
                              </span>
                            </div>
                          )}
                          {chatWidgetMessages.map((msg) => {
                            const isMine = msg.senderId === user?.id;
                          const isDeleted = !!msg.deletedAt;
                          const displayName =
                            msg.senderName ||
                            (isMine
                              ? t("popup.you")
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
                          const seenAvatarElement = (
                            <ProfileAvatar
                              src={activePartyAvatar}
                              alt={activePartyName ?? activePartyFallback}
                              fallback={activePartyInitials}
                              borderUrl={activePartyAvatarBorderUrl}
                              className="h-full w-full"
                              fallbackClassName="text-[10px]"
                            />
                          );
                          const avatarNode = (
                            <ProfileAvatar
                              src={msg.senderAvatar}
                              alt={displayName}
                              fallback={displayName.trim().slice(0, 2).toUpperCase()}
                              borderUrl={msg.senderAvatarBorderUrl}
                              className="h-8 w-8"
                              contentClassName="border border-white/40"
                              fallbackClassName="text-xs"
                            />
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
                                      {t("popup.pinnedMessages")}
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
                                          ? t("popup.youUnsent") : t("popup.messageRemoved")}
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
                                        title={t("popup.moreActions")}
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
                                            ? t("popup.unpin") : t("popup.pinMessage")}
                                        </span>
                                      </button>
                                      {isMine && msg.type !== "sticker" && (
                                        <button
                                          className="w-full px-3 py-2 flex items-center gap-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
                                          onClick={() => handleWidgetStartEdit(msg)}
                                        >
                                          <Edit3 className="w-3 h-3" />
                                          <span>{t("popup.editMessage")}</span>
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
                                          <span>{t("popup.remove")}</span>
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
                                      {t("popup.edited")}
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
                                      title={t("popup.react")}
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
                                    <span>{t("popup.seen")}</span>
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
                                        {t("popup.cancel")}
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
                                        {t("popup.save")}
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
                          title={t("popup.emoji")}
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
                          title={t("popup.stickers")}
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
                        placeholder={t("popup.typeQuickMessage")}
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
                          {t("popup.send")}
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
              className={`relative rounded-lg text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                isAppShell ? "p-1.5 sm:p-2" : "p-2"
              } hidden sm:inline-flex`}
              title={t("sidebar.cart")}
            >
              <ShoppingCart className="h-5 w-5 sm:h-5 sm:w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] sm:text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-semibold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {/* Mobile Chat Button - Shows only on mobile (below sm) */}
            <button
              onClick={handleToggleChatWidget}
              className="relative order-3 rounded-lg p-2 text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 sm:order-none sm:hidden inline-flex"
              title={t("popup.chat")}
            >
              <MessageCircle className="w-5 h-5" />
              {hasChatActivity && (
                <span className="absolute top-1.5 right-1.5 block w-2 h-2 rounded-full bg-green-500" />
              )}
            </button>

            {/* Mobile Cart Button - Shows only on xs/sm screens */}
            <button
              onClick={() => onNavigate('cart')}
              className="relative order-4 rounded-lg p-2 text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 sm:order-none sm:hidden inline-flex"
              title={t("sidebar.cart")}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {/* User Account Icon - Desktop/Tablet ONLY (hidden on mobile) */}
            {isAuthenticated && user ? (
              <div
                className="relative hidden sm:block"
                data-header-desktop-account
              >
                <button
                  onClick={() => setAccountPopupOpen(!accountPopupOpen)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title={t("popup.account")}
                >
                  <div className="relative">
                    <ProfileAvatar
                      src={user.avatarUrl}
                      alt={accountDisplayName}
                      fallback={(user?.firstName || user?.username || user?.email || "U")
                        .trim()
                        .slice(0, 2)
                        .toUpperCase()}
                      borderUrl={userAvatarBorderUrl}
                      className="h-9 w-9 rounded-full bg-white p-0.5 shadow-[0_10px_24px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80 dark:bg-slate-950 dark:ring-slate-700/70"
                      fallbackClassName="text-sm"
                    />
                    <UserOnlineStatus
                      online={userPresence.online}
                      showLabel={false}
                      className="absolute bottom-0 right-0"
                      dotClassName="h-3.5 w-3.5 border-2 border-white shadow-none dark:border-slate-950"
                    />
                  </div>
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
                      <div className="border-b border-blue-500 bg-blue-700 px-4 py-3 dark:bg-blue-800">
                        <div className="mb-2 flex items-center gap-3">
                          <div className="relative">
                            <ProfileAvatar
                              src={user.avatarUrl}
                              alt={accountDisplayName}
                              fallback={(user?.firstName || user?.username || user?.email || "U")
                                .trim()
                                .slice(0, 2)
                                .toUpperCase()}
                              borderUrl={userAvatarBorderUrl}
                              className="h-10 w-10 rounded-full bg-white p-0.5 ring-1 ring-white/50"
                              fallbackClassName="text-xs"
                            />
                            <UserOnlineStatus
                              online={userPresence.online}
                              showLabel={false}
                              className="absolute bottom-0 right-0"
                              dotClassName="h-3.5 w-3.5 border-2 border-white shadow-none"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div className="truncate text-xs font-bold text-white">{accountDisplayName}</div>
                              {userHasLevelPerks ? (
                                <img
                                  src={verifiedBadgeSrc}
                                  alt="Verified"
                                  className="h-4 w-4 shrink-0 object-contain"
                                />
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="hidden text-xs font-bold text-white truncate">{accountDisplayName}</div>
                        <div className="text-xs text-blue-200 truncate">
                          {t("sidebar.userId")}: {user.id}
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
                        <span>{t("popup.account")}</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          onNavigate('orders');
                          setAccountPopupOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        <span>{t("popup.purchaseHistory")}</span>
                      </button>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t("popup.logout")}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Login/Signup Buttons */}
                <div className="hidden lg:flex items-center gap-2">
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
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    {t('nav.signup')}
                  </Button>
                </div>

                {/* Mobile Login Button - Icon Only */}
                <button
                  onClick={() => onNavigate('login')}
                className="order-5 hidden rounded-lg p-2 text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 sm:order-none sm:inline-flex lg:hidden"
                  title={t('nav.login')}
                >
                  <User className="w-5 h-5" />
                </button>
              </>
            )}

            {/* User Account Icon - Mobile ONLY (hidden on desktop) */}
            {isAuthenticated && user ? (
              <div
                className="relative order-5 sm:order-none sm:hidden block"
                data-header-mobile-account
              >
                <button
                  onClick={() => setAccountPopupOpen(!accountPopupOpen)}
                  className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title={language === 'km' ? 'គណនី' : 'Account'}
                >
                  <div className="relative">
                    <ProfileAvatar
                      src={user.avatarUrl}
                      alt={accountDisplayName}
                      fallback={(user?.firstName || user?.username || user?.email || "U")
                        .trim()
                        .slice(0, 2)
                        .toUpperCase()}
                      borderUrl={userAvatarBorderUrl}
                      className="h-9 w-9 rounded-full bg-white p-0.5 shadow-[0_8px_20px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/80 dark:bg-slate-950 dark:ring-slate-700/70"
                      fallbackClassName="text-xs"
                    />
                    <UserOnlineStatus
                      online={userPresence.online}
                      showLabel={false}
                      className="absolute bottom-0 right-0"
                      dotClassName="h-3.5 w-3.5 border-2 border-white shadow-none dark:border-slate-950"
                    />
                  </div>
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
                      <div className="border-b border-blue-500 bg-blue-700 px-4 py-3 dark:bg-blue-800">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <ProfileAvatar
                              src={user.avatarUrl}
                              alt={accountDisplayName}
                              fallback={(user?.firstName || user?.username || user?.email || "U")
                                .trim()
                                .slice(0, 2)
                                .toUpperCase()}
                              borderUrl={userAvatarBorderUrl}
                              className="h-10 w-10 rounded-full bg-white p-0.5 ring-1 ring-white/50"
                              fallbackClassName="text-xs"
                            />
                            <UserOnlineStatus
                              online={userPresence.online}
                              showLabel={false}
                              className="absolute bottom-0 right-0"
                              dotClassName="h-3.5 w-3.5 border-2 border-white shadow-none"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div className="truncate text-xs font-bold text-white">{accountDisplayName}</div>
                              {userHasLevelPerks ? (
                                <img
                                  src={verifiedBadgeSrc}
                                  alt="Verified"
                                  className="h-4 w-4 shrink-0 object-contain"
                                />
                              ) : null}
                            </div>
                            <div className="truncate text-xs text-blue-200">
                              {t("sidebar.userId")}: {user.id}
                            </div>
                          </div>
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
                        <span>{t("popup.account")}</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          onNavigate('orders');
                          setAccountPopupOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <Package className="w-4 h-4" />
                        <span>{t("popup.purchaseHistory")}</span>
                      </button>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t("popup.logout")}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className={`order-5 p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors sm:hidden ${
                  isDesktopSidebarViewport ? "hidden" : "block"
                }`}
              >
                <User className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}

