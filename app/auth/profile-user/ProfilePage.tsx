"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  User,
  Settings,
  LogOut,
  Camera,
  Calendar,
  MapPin,
  Edit2,
  Globe,
  Sun,
  Moon,
  Trash2,
  Shield,
  Info,
  Languages,
  Palette,
  Package,
  DollarSign,
  ShoppingCart,
  ShoppingBag,
  Wrench,
  AlertCircle,
  Loader2,
  ExternalLink,
  Smartphone,
  Mail,
  ImageIcon,
} from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Pagination } from "../../components/Pagination";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { DEFAULT_PROFILE_COVERS, getDefaultProfileCover, ProfileCoverArt } from "../../components/ProfileCoverArt";
import { UserLevelBadge } from "../../components/level/UserLevelBadge";
import { UserLevelDashboard } from "../../components/level/UserLevelDashboard";
import { UserOnlineStatus } from "../../components/UserOnlineStatus";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useUserPresence } from "../../lib/hooks/useUserPresence";
import { AVATAR_BORDER_URLS } from "../../lib/avatar-borders";

interface ProfilePageProps {
  onNavigate: (page: string) => void;
  onOpenProductDetail?: (slug: string) => void;
  onOpenToolDetail?: (slug: string) => void;
  onOpenOrderDetail?: (orderId: number | string) => void;
}

type TabId = "overview" | "courses" | "tools" | "my-courses" | "settings";
type OrderStateKey =
  | "pending"
  | "approved"
  | "delivering"
  | "completed"
  | "cancelled"
  | "resolution";

type OverviewStats = {
  totalOrders: number;
  totalSpent: number;
  totalItems: number;
  cartItems: number;
  stateCounts: Record<OrderStateKey, number>;
};

type PurchaseItem = {
  orderId?: number;
  productId: number;
  title: string;
  slug: string;
  categoryName?: string | null;
  imageUrl: string | null;
  orderNumber: string;
  orderedAt: string | null;
  completedAt?: string | null;
  quantity: number;
  unitPrice: number;
  variantLabel: string | null;
  durationDays?: number | null;
  accessEnd?: string | null;
  isActive?: boolean;
  deviceType?: string | null;
  deviceLimit?: number | null;
  unlimitedDevice?: boolean;
};

type StatsResponse = {
  stats?: {
    totalOrders?: number;
    totalSpent?: number;
    totalItems?: number;
    cartItems?: number;
    stateCounts?: Partial<Record<OrderStateKey, number>>;
  };
};

type PurchasesResponse = {
  products?: PurchaseItem[];
};

type VideoCourseItem = {
  courseId: number;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  orderNumber?: string | null;
  planName: string | null;
  accessStart: string | null;
  accessEnd: string | null;
  status: string | null;
  isActive?: boolean;
};

type VideoCoursesResponse = {
  courses?: VideoCourseItem[];
};

type SubscriptionCoursesResponse = {
  subscribed?: boolean;
  planName?: string | null;
  courses?: VideoCourseItem[];
};

type FavoriteCoursesResponse = {
  courses?: Array<VideoCourseItem & { favoritedAt?: string | null }>;
};

type FreeCoursesResponse = {
  courses?: VideoCourseItem[];
};

type CountryOption = {
  name: string;
  cca2: string;
  flag: string;
  dial: string;
  dials: string[];
};

type StoredCountry = {
  name: string;
  cca2: string;
  flag: string;
  dial: string;
};

type LoginDeviceItem = {
  deviceId: string;
  deviceName: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  trustedUntil?: string | null;
  deviceActionLockedUntil?: string | null;
};

type ApiKeyProviderId = "groq" | "openai" | "google" | "deepl";

type ApiKeyStatus = {
  configured: boolean;
  masked: string | null;
};

type ApiKeysState = Record<ApiKeyProviderId, ApiKeyStatus>;

type ApiKeysResponse = {
  apiKeys?: Partial<ApiKeysState>;
};

function normalizeAvatarInputUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function clampCoverValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeProfilePhone(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed.includes("@")) return "";
  const cleaned = trimmed.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

const ITEMS_PER_PAGE = 5;
const AVATARS: string[] = ["/Job Jik.jpg", "/Mrrecaps.png", "/Nut Roth Logo.png", "/Nut Roth.jpg"];

const ORDER_STATUS_ORDER: OrderStateKey[] = [
  "pending",
  "approved",
  "delivering",
  "completed",
  "cancelled",
  "resolution",
];

const DEFAULT_STATE_COUNTS: Record<OrderStateKey, number> = {
  pending: 0,
  approved: 0,
  delivering: 0,
  completed: 0,
  cancelled: 0,
  resolution: 0,
};

const STATUS_COLORS: Record<OrderStateKey, string> = {
  pending: "bg-amber-400",
  approved: "bg-blue-500",
  delivering: "bg-indigo-500",
  completed: "bg-emerald-500",
  cancelled: "bg-rose-500",
  resolution: "bg-purple-500",
};

const EMPTY_API_KEYS: ApiKeysState = {
  groq: { configured: false, masked: null },
  openai: { configured: false, masked: null },
  google: { configured: false, masked: null },
  deepl: { configured: false, masked: null },
};

const mapStateCounts = (
  raw?: Partial<Record<OrderStateKey, number>>
): Record<OrderStateKey, number> => ({
  pending: raw?.pending ?? 0,
  approved: raw?.approved ?? 0,
  delivering: raw?.delivering ?? 0,
  completed: raw?.completed ?? 0,
  cancelled: raw?.cancelled ?? 0,
  resolution: raw?.resolution ?? 0,
});

export function ProfilePage({ onNavigate, onOpenProductDetail, onOpenToolDetail, onOpenOrderDetail }: ProfilePageProps) {
  const { user, logout, updateProfile, deleteAccount } = useAuth();
  const { language, setLanguage, t } = useLanguage(); // ✅ must have t()
  const { theme, toggleTheme } = useTheme();

  const getLoginDeviceId = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    const key = "somarnix_login_device_id";
    const existing = window.localStorage.getItem(key);
    if (existing && existing.trim()) return existing;
    return null;
  }, []);

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [avatarUrlSaving, setAvatarUrlSaving] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState("");
  const [coverPositionX, setCoverPositionX] = useState(50);
  const [coverPositionY, setCoverPositionY] = useState(50);
  const [coverScale, setCoverScale] = useState(1);
  const [coverSaving, setCoverSaving] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleteCurrentPassword, setDeleteCurrentPassword] = useState("");
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteRequiresPassword, setDeleteRequiresPassword] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSendingCode, setDeleteSendingCode] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    username: "",
    name: "",
    bio: "",
    phone: "",
    location: "",
  });
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countryQuery, setCountryQuery] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);

  const redirectedRef = useRef(false);
  const coverPreviewRef = useRef<HTMLDivElement | null>(null);
  const coverDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    if (user) {
      redirectedRef.current = false;
      return;
    }
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    const tmr = setTimeout(() => onNavigate("login"), 0);
    return () => clearTimeout(tmr);
  }, [user, onNavigate]);

  useEffect(() => {
    let alive = true;
    const loadCountries = async () => {
      try {
        const res = await fetch(
          "https://restcountries.com/v3.1/all?fields=name,cca2,flags,idd",
          { cache: "force-cache" }
        );
        if (!res.ok) throw new Error("Failed to load countries");
        const data = await res.json();
        const mapped: CountryOption[] = (Array.isArray(data) ? data : [])
          .map((item: unknown) => {
            const row = (typeof item === "object" && item !== null ? item : {}) as {
              name?: { common?: string };
              cca2?: string;
              flags?: { png?: string; svg?: string };
              idd?: { root?: string; suffixes?: string[] };
            };
            const name = row?.name?.common ?? "";
            const cca2 = String(row?.cca2 ?? "").toUpperCase();
            const flag = row?.flags?.png || row?.flags?.svg || "";
            const root = row?.idd?.root ?? "";
            const suffixes: string[] = Array.isArray(row?.idd?.suffixes)
              ? row.idd!.suffixes!
              : [];
            const dials = root
              ? (suffixes.length ? suffixes : [""])
                  .map((suffix) => `${root}${suffix}`)
                  .filter(Boolean)
              : [];
            const dial = dials[0] ?? "";
            if (!name || !dial) return null;
            return { name, cca2, flag, dial, dials };
          })
          .filter(Boolean) as CountryOption[];
        mapped.sort((a, b) => a.name.localeCompare(b.name));
        if (alive) setCountries(mapped);
      } catch {
        if (alive) setCountries([]);
      }
    };

    loadCountries();
    return () => {
      alive = false;
    };
  }, []);

  const findCountryFromPhone = useCallback(
    (value: string) => {
      if (!value) return null;
      const cleaned = value.replace(/[^\d+]/g, "");
      if (!cleaned.startsWith("+")) return null;
      let best: { country: CountryOption; dial: string } | null = null;
      for (const country of countries) {
        const match = country.dials.find((dial) => cleaned.startsWith(dial));
        if (match && (!best || match.length > best.dial.length)) {
          best = { country, dial: match };
        }
      }
      return best;
    },
    [countries]
  );

  const saveCountryToStorage = useCallback((country: CountryOption | null) => {
    if (typeof window === "undefined") return;
    if (!country) return;
    const payload: StoredCountry = {
      name: country.name,
      cca2: country.cca2,
      flag: country.flag,
      dial: country.dial,
    };
    localStorage.setItem("edugroit-country", JSON.stringify(payload));
    window.dispatchEvent(new Event("edugroit-country-change"));
  }, []);

  const displayName = useMemo(() => {
    if (!user) return "";
    const fn = (user.firstName ?? "").trim();
    const ln = (user.lastName ?? "").trim();
    const full = `${fn} ${ln}`.trim();
    return user.username || full || user.email || "";
  }, [user]);

  useEffect(() => {
    const userPhone = sanitizeProfilePhone(user?.phone);
    if (!userPhone || countries.length === 0) return;
    const match = findCountryFromPhone(userPhone);
    if (!match) return;
    setSelectedCountry(match.country);
    saveCountryToStorage(match.country);
    const number = userPhone.replace(/[^\d+]/g, "").slice(match.dial.length);
    setEditForm((prev) => ({
      ...prev,
      phone: number,
      location: match.country.name,
    }));
  }, [user?.phone, countries.length, findCountryFromPhone, saveCountryToStorage]);

  const joinedText = useMemo(() => {
    if (!user?.joinedDate) return "";
    const d = new Date(user.joinedDate);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString();
  }, [user]);

  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchasesError, setPurchasesError] = useState<string | null>(null);
  const [videoCourses, setVideoCourses] = useState<VideoCourseItem[]>([]);
  const [videoCoursesLoading, setVideoCoursesLoading] = useState(false);
  const [videoCoursesError, setVideoCoursesError] = useState<string | null>(null);
  const [subscribedCourses, setSubscribedCourses] = useState<VideoCourseItem[]>([]);
  const [subscribedActive, setSubscribedActive] = useState(false);
  const [subscribedPlanName, setSubscribedPlanName] = useState<string | null>(null);
  const [subscribedLoading, setSubscribedLoading] = useState(false);
  const [subscribedError, setSubscribedError] = useState<string | null>(null);
  const [favoriteCourses, setFavoriteCourses] = useState<VideoCourseItem[]>([]);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [freeCourses, setFreeCourses] = useState<VideoCourseItem[]>([]);
  const [freeLoading, setFreeLoading] = useState(false);
  const [freeError, setFreeError] = useState<string | null>(null);
  const [myCourseTab, setMyCourseTab] = useState<"subscribe" | "lifetime" | "favorite" | "free">(
    "subscribe"
  );
  const [coursesPage, setCoursesPage] = useState(1);
  const [toolsPage, setToolsPage] = useState(1);
  const [myCoursesPage, setMyCoursesPage] = useState(1);
  const [loginDevices, setLoginDevices] = useState<LoginDeviceItem[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [deviceActionMessage, setDeviceActionMessage] = useState<string | null>(null);
  const [otpTargetDeviceId, setOtpTargetDeviceId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [deviceCurrentPassword, setDeviceCurrentPassword] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [removingDevice, setRemovingDevice] = useState(false);
  const [currentLoginDeviceId, setCurrentLoginDeviceId] = useState<string | null>(null);
  const currentManagedDevice = useMemo(
    () => loginDevices.find((device) => device.deviceId === currentLoginDeviceId) ?? null,
    [currentLoginDeviceId, loginDevices]
  );
  const [apiKeys, setApiKeys] = useState<ApiKeysState>(EMPTY_API_KEYS);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<ApiKeyProviderId, string>>({
    groq: "",
    openai: "",
    google: "",
    deepl: "",
  });
  const apiKeyInputRefs = useRef<Record<ApiKeyProviderId, HTMLInputElement | null>>({
    groq: null,
    openai: null,
    google: null,
    deepl: null,
  });
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeysSaving, setApiKeysSaving] = useState(false);
  const [apiKeysError, setApiKeysError] = useState<string | null>(null);
  const [apiKeysMessage, setApiKeysMessage] = useState<string | null>(null);

  const translate = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(language === "km" ? "km-KH" : undefined),
    [language]
  );
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language === "km" ? "km-KH" : "en-US", {
        style: "currency",
        currency: "USD",
      }),
    [language]
  );

  const formatNumber = useCallback(
    (value: number) => numberFormatter.format(value ?? 0),
    [numberFormatter]
  );

  const formatCurrency = useCallback(
    (value: number) => currencyFormatter.format(value ?? 0),
    [currencyFormatter]
  );

  const formatDateTime = useCallback(
    (value: string | null) => {
      if (!value) return "--";
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      return parsed.toLocaleString(language === "km" ? "km-KH" : undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    },
    [language]
  );

  const apiKeyProviders = useMemo(
    () =>
      [
        {
          id: "groq" as const,
          label: "Groq",
          placeholder: "gsk_...",
          description: translate(
            "profile.apiKeys.groq",
            "Used for story, outline, and story-to-scene generation."
          ),
        },
        {
          id: "openai" as const,
          label: "OpenAI",
          placeholder: "sk-...",
          description: translate(
            "profile.apiKeys.openai",
            "Used for OpenAI vision/image understanding tools."
          ),
        },
        {
          id: "google" as const,
          label: "Google / Gemini",
          placeholder: "AIza...",
          description: translate(
            "profile.apiKeys.google",
            "Used for Gemini text, image, and translation features."
          ),
        },
        {
          id: "deepl" as const,
          label: "DeepL",
          placeholder: "your-deepl-key",
          description: translate(
            "profile.apiKeys.deepl",
            "Used for DeepL subtitle translation."
          ),
        },
      ] satisfies Array<{
        id: ApiKeyProviderId;
        label: string;
        placeholder: string;
        description: string;
      }>,
    [translate]
  );

  const hasPendingApiKeyChanges = useMemo(
    () => Object.values(apiKeyInputs).some((value) => value.trim().length > 0),
    [apiKeyInputs]
  );

  const setApiKeyInputValue = useCallback((provider: ApiKeyProviderId, value: string) => {
    setApiKeyInputs((prev) => ({
      ...prev,
      [provider]: value,
    }));
  }, []);

  const goToProduct = useCallback(
    (slug: string) => {
      if (!slug) return;
      if (onOpenProductDetail) {
        onOpenProductDetail(slug);
        return;
      }
      if (typeof window !== "undefined") {
        window.location.href = `/product/${slug}`;
      }
    },
    [onOpenProductDetail]
  );

  const goToTool = useCallback(
    (slug: string) => {
      if (!slug) return;
      if (onOpenToolDetail) {
        onOpenToolDetail(slug);
        return;
      }
      if (typeof window !== "undefined") {
        window.location.href = `/tools-ai/${slug}`;
      }
    },
    [onOpenToolDetail]
  );

  const goToOrderDetail = useCallback(
    (orderId?: number) => {
      if (!orderId) return;
      if (onOpenOrderDetail) {
        onOpenOrderDetail(orderId);
        return;
      }
      if (typeof window !== "undefined") {
        window.location.href = `/orders/${orderId}`;
      }
    },
    [onOpenOrderDetail]
  );

  // const enrolledCourses = courses.slice(0, 3);

  const handleLogout = async () => {
    await logout();
    onNavigate("home");
  };

  const startEditing = () => {
    if (!user) return;
    setProfileUpdateError(null);
    const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    const userPhone = sanitizeProfilePhone(user.phone);
    const match = userPhone ? findCountryFromPhone(userPhone) : null;
    if (match) {
      setSelectedCountry(match.country);
      saveCountryToStorage(match.country);
    }
    const phoneNumber = match
      ? userPhone.replace(/[^\d+]/g, "").slice(match.dial.length)
      : userPhone;
    setEditForm({
      username: user.username || "",
      name: full,
      bio: user.bio || "",
      phone: phoneNumber,
      location: match?.country.name || user.place || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setProfileUpdateError(null);
    setIsEditing(false);
  };

  const getProfileUpdateErrorMessage = useCallback(
    (error: unknown) =>
      error instanceof Error && error.message.trim()
        ? error.message
        : translate("profile.updateFailed", "Profile update failed. Please try again."),
    [translate]
  );

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileUpdateError(null);

    const username = editForm.username.trim();
    if (!username) {
      setProfileUpdateError(t("register.errors.usernameRequired"));
      return;
    }
    if (!/^[a-zA-Z0-9._]{3,30}$/.test(username)) {
      setProfileUpdateError(t("register.errors.usernameInvalid"));
      return;
    }

    const parts = editForm.name.trim().split(/\s+/).filter(Boolean);
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? "";
    const lastName = parts.length > 1 ? parts[parts.length - 1] : "";

    const rawNumber = editForm.phone.trim();
    const cleanedNumber = rawNumber.replace(/\D/g, "");
    const phoneValue =
      cleanedNumber && selectedCountry?.dial
        ? `${selectedCountry.dial}${cleanedNumber}`
        : rawNumber.startsWith("+")
        ? rawNumber.replace(/[^\d+]/g, "")
        : cleanedNumber
        ? `+${cleanedNumber}`
        : undefined;
    const placeValue = selectedCountry?.name || editForm.location || undefined;

    try {
      await updateProfile({
        username,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        bio: editForm.bio || undefined,
        phone: phoneValue || undefined,
        place: placeValue,
      });

      setIsEditing(false);
    } catch (error) {
      setProfileUpdateError(getProfileUpdateErrorMessage(error));
    }
  };

  const handleSelectAvatar = async (avatarUrl: string) => {
    setProfileUpdateError(null);
    try {
      await updateProfile({ avatarUrl });
      setAvatarOpen(false);
    } catch (error) {
      setProfileUpdateError(getProfileUpdateErrorMessage(error));
    }
  };

  const handleSaveAvatarUrl = async () => {
    const normalizedUrl = normalizeAvatarInputUrl(avatarUrlInput);
    if (!normalizedUrl) {
      setProfileUpdateError("Please enter a valid image URL that starts with http or https.");
      return;
    }

    setProfileUpdateError(null);
    setAvatarUrlSaving(true);
    try {
      await updateProfile({ avatarUrl: normalizedUrl });
      setAvatarUrlInput(normalizedUrl);
      setAvatarOpen(false);
    } catch (error) {
      setProfileUpdateError(getProfileUpdateErrorMessage(error));
    } finally {
      setAvatarUrlSaving(false);
    }
  };

  const handleOpenCoverEditor = () => {
    setProfileUpdateError(null);
    const currentUser = user;
    if (!currentUser) return;
    setCoverUrlInput(currentUser.coverUrl ?? "");
    setCoverPositionX(clampCoverValue(Number(currentUser.coverPositionX ?? 50), 0, 100));
    setCoverPositionY(clampCoverValue(Number(currentUser.coverPositionY ?? 50), 0, 100));
    setCoverScale(clampCoverValue(Number(currentUser.coverScale ?? 1), 1, 3));
    setCoverOpen(true);
  };

  const handleSelectCover = (coverUrl: string) => {
    setCoverUrlInput(coverUrl);
  };

  const handleSaveCover = async () => {
    const normalizedUrl =
      coverUrlInput.trim().length > 0 ? normalizeAvatarInputUrl(coverUrlInput) : null;

    if (coverUrlInput.trim().length > 0 && !normalizedUrl) {
      setProfileUpdateError("Please enter a valid cover URL that starts with http or https.");
      return;
    }

    setProfileUpdateError(null);
    setCoverSaving(true);
    try {
      await updateProfile({
        coverUrl: normalizedUrl ?? null,
        coverPositionX: clampCoverValue(coverPositionX, 0, 100),
        coverPositionY: clampCoverValue(coverPositionY, 0, 100),
        coverScale: clampCoverValue(coverScale, 1, 3),
      });
      setCoverOpen(false);
    } catch (error) {
      setProfileUpdateError(getProfileUpdateErrorMessage(error));
    } finally {
      setCoverSaving(false);
    }
  };

  const handleClearCover = async () => {
    setProfileUpdateError(null);
    setCoverSaving(true);
    try {
      await updateProfile({
        coverUrl: null,
        coverPositionX: 50,
        coverPositionY: 50,
        coverScale: 1,
      });
      setCoverUrlInput("");
      setCoverPositionX(50);
      setCoverPositionY(50);
      setCoverScale(1);
      setCoverOpen(false);
    } catch (error) {
      setProfileUpdateError(getProfileUpdateErrorMessage(error));
    } finally {
      setCoverSaving(false);
    }
  };

  const handleCoverPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!coverPreviewRef.current) return;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    coverDragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: coverPositionX,
      originY: coverPositionY,
    };
  };

  const handleCoverPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = coverDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId || !coverPreviewRef.current) return;
    const rect = coverPreviewRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    setCoverPositionX(
      clampCoverValue(dragState.originX - (deltaX / rect.width) * (100 / coverScale), 0, 100)
    );
    setCoverPositionY(
      clampCoverValue(dragState.originY - (deltaY / rect.height) * (100 / coverScale), 0, 100)
    );
  };

  const handleCoverPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = coverDragStateRef.current;
    if (dragState?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      coverDragStateRef.current = null;
    }
  };

  const handleSelectAvatarBorder = async (avatarBorderUrl: string | null) => {
    setProfileUpdateError(null);
    try {
      await updateProfile({ avatarBorderUrl });
      setAvatarOpen(false);
    } catch (error) {
      setProfileUpdateError(getProfileUpdateErrorMessage(error));
    }
  };

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.cca2.toLowerCase().includes(q) ||
        c.dial.replace("+", "").includes(q)
      );
    });
  }, [countries, countryQuery]);

  const handlePhoneInput = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.startsWith("+")) {
      const match = findCountryFromPhone(trimmed);
      if (match) {
        setSelectedCountry(match.country);
        saveCountryToStorage(match.country);
        const number = trimmed.replace(/[^\d+]/g, "").slice(match.dial.length);
        setEditForm((prev) => ({
          ...prev,
          phone: number,
          location: match.country.name,
        }));
        return;
      }
    }
    setEditForm((prev) => ({ ...prev, phone: value }));
  };

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch("/api/me/stats", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load stats");
      }
      const data = (await res.json()) as StatsResponse;
      const raw = data?.stats;
      setOverviewStats({
        totalOrders: raw?.totalOrders ?? 0,
        totalSpent: raw?.totalSpent ?? 0,
        totalItems: raw?.totalItems ?? 0,
        cartItems: raw?.cartItems ?? 0,
        stateCounts: mapStateCounts(raw?.stateCounts),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatsError(message || "Failed to load stats.");
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  const fetchPurchases = useCallback(async () => {
    if (!user) return;
    setPurchasesLoading(true);
    setPurchasesError(null);
    try {
      const res = await fetch("/api/me/products", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load purchases");
      }
      const data = (await res.json()) as PurchasesResponse;
      setPurchases(Array.isArray(data?.products) ? data.products : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPurchasesError(message || "Failed to load purchases.");
    } finally {
      setPurchasesLoading(false);
    }
  }, [user]);

  const fetchVideoCourses = useCallback(async () => {
    if (!user) return;
    setVideoCoursesLoading(true);
    setVideoCoursesError(null);
    try {
      const res = await fetch("/api/me/video-courses", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load courses");
      }
      const data = (await res.json()) as VideoCoursesResponse;
      setVideoCourses(Array.isArray(data?.courses) ? data.courses : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setVideoCoursesError(message || "Failed to load courses.");
    } finally {
      setVideoCoursesLoading(false);
    }
  }, [user]);

  const fetchSubscribedCourses = useCallback(async () => {
    if (!user) return;
    setSubscribedLoading(true);
    setSubscribedError(null);
    try {
      const res = await fetch("/api/me/video-courses/subscribed", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load subscriptions");
      const data = (await res.json()) as SubscriptionCoursesResponse;
      setSubscribedActive(!!data?.subscribed);
      setSubscribedPlanName(typeof data?.planName === "string" ? data.planName : null);
      setSubscribedCourses(Array.isArray(data?.courses) ? data.courses : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSubscribedError(message || "Failed to load subscriptions.");
    } finally {
      setSubscribedLoading(false);
    }
  }, [user]);

  const fetchFreeCourses = useCallback(async () => {
    if (!user) return;
    setFreeLoading(true);
    setFreeError(null);
    try {
      const res = await fetch("/api/me/video-courses/free", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load free courses");
      const data = (await res.json()) as FreeCoursesResponse;
      setFreeCourses(Array.isArray(data?.courses) ? data.courses : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setFreeError(message || "Failed to load free courses.");
    } finally {
      setFreeLoading(false);
    }
  }, [user]);

  const fetchFavoriteCourses = useCallback(async () => {
    if (!user) return;
    setFavoriteLoading(true);
    setFavoriteError(null);
    try {
      const res = await fetch("/api/me/video-courses/favorites", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load favorites");
      const data = (await res.json()) as FavoriteCoursesResponse;
      setFavoriteCourses(Array.isArray(data?.courses) ? data.courses : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setFavoriteError(message || "Failed to load favorites.");
    } finally {
      setFavoriteLoading(false);
    }
  }, [user]);

  const fetchLoginDevices = useCallback(async () => {
    if (!user) return;
    setDevicesLoading(true);
    setDevicesError(null);
    try {
      const res = await fetch("/api/auth/devices", { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load devices");
      setLoginDevices(Array.isArray(data?.devices) ? (data.devices as LoginDeviceItem[]) : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDevicesError(message || "Failed to load devices.");
      setLoginDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  }, [user]);

  const forceSecurityLogout = useCallback((message?: string) => {
    if (message) {
      toast.error(message);
    }
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, []);

  const sendLogoutCode = useCallback(
    async (deviceId: string) => {
      if (!deviceId) return;
      setDeviceActionMessage(null);
      setDevicesError(null);
      setSendingOtp(true);
      try {
        const res = await fetch("/api/auth/devices/send-remove-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            deviceId,
            currentDeviceId: currentLoginDeviceId,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (data?.forceLogout) {
          forceSecurityLogout(
            typeof data?.error === "string" ? data.error : "This device is not allowed to manage other devices."
          );
          return;
        }
        if (!res.ok) {
          const errMsg =
            typeof data?.error === "string" && data.error.trim().length > 0
              ? data.error
              : "Failed to send code";
          const detail =
            typeof data?.detail === "string" && data.detail.trim().length > 0
              ? data.detail
              : "";
          throw new Error(detail ? `${errMsg}: ${detail}` : errMsg);
        }
        setOtpTargetDeviceId(deviceId);
        setOtpCode("");
        setDeviceCurrentPassword("");
        setDeviceActionMessage(
          `Verification code sent to ${user?.email || "your email"} (valid 10 minutes).`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setDevicesError(message || "Failed to send code.");
      } finally {
        setSendingOtp(false);
      }
    },
    [currentLoginDeviceId, forceSecurityLogout, user?.email]
  );

  const confirmLogoutOtherDevice = useCallback(
    async (deviceId: string) => {
      if (!deviceId || otpCode.trim().length === 0 || deviceCurrentPassword.trim().length === 0) return;
      setDeviceActionMessage(null);
      setDevicesError(null);
      setRemovingDevice(true);
      try {
        const res = await fetch("/api/auth/devices/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            deviceId,
            code: otpCode.trim(),
            currentPassword: deviceCurrentPassword,
            currentDeviceId: currentLoginDeviceId,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (data?.forceLogout) {
          forceSecurityLogout(
            typeof data?.error === "string" ? data.error : "This device is not allowed to manage other devices."
          );
          return;
        }
        if (!res.ok) {
          const errMsg =
            typeof data?.error === "string" && data.error.trim().length > 0
              ? data.error
              : "Failed to logout device";
          const detail =
            typeof data?.detail === "string" && data.detail.trim().length > 0
              ? data.detail
              : "";
          throw new Error(detail ? `${errMsg}: ${detail}` : errMsg);
        }
        setDeviceActionMessage("Device logged out successfully.");
        setOtpTargetDeviceId(null);
        setOtpCode("");
        setDeviceCurrentPassword("");
        await fetchLoginDevices();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setDevicesError(message || "Failed to logout device.");
      } finally {
        setRemovingDevice(false);
      }
    },
    [currentLoginDeviceId, deviceCurrentPassword, fetchLoginDevices, forceSecurityLogout, otpCode]
  );

  const sendDeleteAccountCode = useCallback(async () => {
    setDeleteError(null);
    setDeleteMessage(null);
    setDeleteSendingCode(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode: "send_code" }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.forceLogout) {
        forceSecurityLogout(
          typeof data?.error === "string"
            ? data.error
            : "This device is not allowed to delete the account."
        );
        return;
      }
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Failed to send delete-account code."
        );
      }
      setDeleteRequiresPassword(data?.requiresPassword !== false);
      setDeleteMessage(`Verification code sent to ${user?.email || "your email"} (valid 10 minutes).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDeleteError(message || "Failed to send delete-account code.");
    } finally {
      setDeleteSendingCode(false);
    }
  }, [forceSecurityLogout, user?.email]);

  const confirmDeleteAccount = useCallback(async () => {
    setDeleteError(null);
    setDeleteMessage(null);
    setDeleteLoading(true);
    try {
      await deleteAccount({
        confirmText: deleteText,
        currentPassword: deleteRequiresPassword ? deleteCurrentPassword : undefined,
        code: deleteCode,
      });
      await logout();
      onNavigate("home");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDeleteError(message || "Delete account failed.");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteAccount, deleteCode, deleteCurrentPassword, deleteRequiresPassword, deleteText, logout, onNavigate]);

  const fetchApiKeys = useCallback(async () => {
    setApiKeysLoading(true);
    setApiKeysError(null);
    try {
      const res = await fetch("/api/me/api-keys", {
        cache: "no-store",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as ApiKeysResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load API keys");
      }
      setApiKeys({
        groq: data.apiKeys?.groq ?? EMPTY_API_KEYS.groq,
        openai: data.apiKeys?.openai ?? EMPTY_API_KEYS.openai,
        google: data.apiKeys?.google ?? EMPTY_API_KEYS.google,
        deepl: data.apiKeys?.deepl ?? EMPTY_API_KEYS.deepl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setApiKeysError(message || "Failed to load API keys.");
    } finally {
      setApiKeysLoading(false);
    }
  }, []);

  const saveApiKeys = useCallback(async () => {
    const payload: Record<string, string> = {};
    const requestedProviders: ApiKeyProviderId[] = [];

    (Object.keys(apiKeyInputs) as ApiKeyProviderId[]).forEach((provider) => {
      const rawValue = apiKeyInputRefs.current[provider]?.value ?? apiKeyInputs[provider];
      const value = rawValue.trim();
      if (!value) return;
      requestedProviders.push(provider);
      payload[`${provider}ApiKey`] = value;
    });

    if (Object.keys(payload).length === 0) return;

    setApiKeysSaving(true);
    setApiKeysError(null);
    setApiKeysMessage(null);
    try {
      const res = await fetch("/api/me/api-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as ApiKeysResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save API keys");
      }
      const nextApiKeys = {
        groq: data.apiKeys?.groq ?? EMPTY_API_KEYS.groq,
        openai: data.apiKeys?.openai ?? EMPTY_API_KEYS.openai,
        google: data.apiKeys?.google ?? EMPTY_API_KEYS.google,
        deepl: data.apiKeys?.deepl ?? EMPTY_API_KEYS.deepl,
      };
      const savedProviders = requestedProviders.filter((provider) => nextApiKeys[provider].configured);
      const failedProviders = requestedProviders.filter((provider) => !nextApiKeys[provider].configured);
      const toProviderLabel = (provider: ApiKeyProviderId) =>
        apiKeyProviders.find((item) => item.id === provider)?.label ?? provider;

      setApiKeys(nextApiKeys);
      setApiKeyInputs((prev) => {
        const next = { ...prev };
        savedProviders.forEach((provider) => {
          next[provider] = "";
        });
        return next;
      });

      if (savedProviders.length > 0) {
        const savedLabels = savedProviders.map(toProviderLabel).join(", ");
        setApiKeysMessage(
          `${translate("profile.apiKeys.savedSelected", "Saved")}: ${savedLabels}.`
        );
      }

      if (failedProviders.length > 0) {
        const failedLabels = failedProviders.map(toProviderLabel).join(", ");
        setApiKeysError(
          `${translate(
            "profile.apiKeys.failedSelected",
            "These keys were not saved"
          )}: ${failedLabels}.`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setApiKeysError(message || "Failed to save API keys.");
    } finally {
      setApiKeysSaving(false);
    }
  }, [apiKeyInputs, apiKeyProviders, translate]);

  const removeApiKey = useCallback(
    async (provider: ApiKeyProviderId) => {
      setApiKeysSaving(true);
      setApiKeysError(null);
      setApiKeysMessage(null);
      try {
        const res = await fetch("/api/me/api-keys", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ [`${provider}ApiKey`]: null }),
        });
        const data = (await res.json().catch(() => ({}))) as ApiKeysResponse & { error?: string };
        if (!res.ok) {
          throw new Error(data?.error || "Failed to remove API key");
        }
        setApiKeys({
          groq: data.apiKeys?.groq ?? EMPTY_API_KEYS.groq,
          openai: data.apiKeys?.openai ?? EMPTY_API_KEYS.openai,
          google: data.apiKeys?.google ?? EMPTY_API_KEYS.google,
          deepl: data.apiKeys?.deepl ?? EMPTY_API_KEYS.deepl,
        });
        setApiKeyInputs((prev) => ({ ...prev, [provider]: "" }));
        setApiKeysMessage(
          translate("profile.apiKeys.removed", "The saved API key was removed.")
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setApiKeysError(message || "Failed to remove API key.");
      } finally {
        setApiKeysSaving(false);
      }
    },
    [translate]
  );

  useEffect(() => {
    setCurrentLoginDeviceId(getLoginDeviceId());
  }, [getLoginDeviceId]);

  useEffect(() => {
    if (!user || activeTab !== "settings") return;
    fetchLoginDevices();
  }, [activeTab, fetchLoginDevices, user]);

  useEffect(() => {
    if (!user || activeTab !== "settings") return;
    fetchApiKeys();
  }, [activeTab, fetchApiKeys, user]);

  useEffect(() => {
    if (!user) {
      setOverviewStats(null);
      setPurchases([]);
      setVideoCourses([]);
      return;
    }
    fetchStats();
    fetchPurchases();
    fetchVideoCourses();
    fetchSubscribedCourses();
    fetchFavoriteCourses();
    fetchFreeCourses();
  }, [
    user,
    fetchStats,
    fetchPurchases,
    fetchVideoCourses,
    fetchSubscribedCourses,
    fetchFavoriteCourses,
    fetchFreeCourses,
  ]);

  const tabs: Array<{ id: TabId; name: string; icon: typeof User }> = [
    { id: "overview", name: translate("profile.overview", "Overview"), icon: User },
    { id: "courses", name: translate("profile.myProducts", "My Products"), icon: ShoppingBag },
    { id: "tools", name: translate("profile.tools", "Tools"), icon: Wrench },
    { id: "my-courses", name: translate("profile.myCourses", "My Courses"), icon: ShoppingBag },
    { id: "settings", name: translate("profile.settings", "Settings"), icon: Settings },
  ];
  const profileTabsRef = useRef<HTMLDivElement | null>(null);
  const profileTabButtonRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;

    const activeButton = profileTabButtonRefs.current[activeTab];
    if (!activeButton) return;

    if (window.innerWidth < 1024) {
      activeButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      return;
    }

    const container = profileTabsRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    if (buttonRect.left < containerRect.left || buttonRect.right > containerRect.right) {
      activeButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeTab]);

  const statsCards = useMemo(
    () => [
      {
        key: "totalOrders",
        label: translate("profile.totalOrders", "Total orders"),
        value: formatNumber(overviewStats?.totalOrders ?? 0),
        icon: Package,
        accent: "bg-blue-100 text-blue-600",
      },
      {
        key: "totalSpent",
        label: translate("profile.totalSpent", "Total spent"),
        value: formatCurrency(overviewStats?.totalSpent ?? 0),
        icon: DollarSign,
        accent: "bg-emerald-100 text-emerald-600",
      },
      {
        key: "totalItems",
        label: translate("profile.totalItems", "Items purchased"),
        value: formatNumber(overviewStats?.totalItems ?? 0),
        icon: ShoppingBag,
        accent: "bg-purple-100 text-purple-600",
      },
      {
        key: "cartItems",
        label: translate("profile.cartItems", "Items in cart"),
        value: formatNumber(overviewStats?.cartItems ?? 0),
        icon: ShoppingCart,
        accent: "bg-amber-100 text-amber-600",
      },
    ],
    [overviewStats, translate, formatNumber, formatCurrency]
  );

  const statusLabels = useMemo(
    () => ({
      pending: translate("profile.status.pending", "Pending"),
      approved: translate("profile.status.approved", "Approved"),
      delivering: translate("profile.status.delivering", "Delivering"),
      completed: translate("profile.status.completed", "Completed"),
      cancelled: translate("profile.status.cancelled", "Cancelled"),
      resolution: translate("profile.status.resolution", "Resolution"),
    }),
    [translate]
  );

  const stateCounts = overviewStats?.stateCounts ?? DEFAULT_STATE_COUNTS;
  const isToolPurchase = useCallback(
    (item: PurchaseItem) => {
      const category = String(item.categoryName || "").trim().toLowerCase();
      return category === "tools" || category === "tool";
    },
    []
  );
  const productPurchases = useMemo(
    () => purchases.filter((item) => !isToolPurchase(item)),
    [purchases, isToolPurchase]
  );
  const toolPurchases = useMemo(
    () => purchases.filter((item) => isToolPurchase(item)),
    [purchases, isToolPurchase]
  );
  const recentPurchases = useMemo(() => productPurchases.slice(0, 3), [productPurchases]);
  const recentCourses = useMemo(() => videoCourses.slice(0, 3), [videoCourses]);
  const coursesTotalPages = Math.max(1, Math.ceil(productPurchases.length / ITEMS_PER_PAGE));
  const pagedProductPurchases = useMemo(() => {
    const start = (coursesPage - 1) * ITEMS_PER_PAGE;
    return productPurchases.slice(start, start + ITEMS_PER_PAGE);
  }, [productPurchases, coursesPage]);
  const toolsTotalPages = Math.max(1, Math.ceil(toolPurchases.length / ITEMS_PER_PAGE));
  const pagedToolPurchases = useMemo(() => {
    const start = (toolsPage - 1) * ITEMS_PER_PAGE;
    return toolPurchases.slice(start, start + ITEMS_PER_PAGE);
  }, [toolPurchases, toolsPage]);
  const activeCourseItemsCount = useMemo(() => {
    if (myCourseTab === "free") return freeCourses.length;
    if (myCourseTab === "subscribe") return subscribedCourses.length;
    if (myCourseTab === "favorite") return favoriteCourses.length;
    return videoCourses.length;
  }, [myCourseTab, freeCourses.length, subscribedCourses.length, favoriteCourses.length, videoCourses.length]);
  const myCoursesTotalPages = Math.max(1, Math.ceil(activeCourseItemsCount / ITEMS_PER_PAGE));
  const pagedSubscribedCourses = useMemo(() => {
    const start = (myCoursesPage - 1) * ITEMS_PER_PAGE;
    return subscribedCourses.slice(start, start + ITEMS_PER_PAGE);
  }, [subscribedCourses, myCoursesPage]);
  const pagedFreeCourses = useMemo(() => {
    const start = (myCoursesPage - 1) * ITEMS_PER_PAGE;
    return freeCourses.slice(start, start + ITEMS_PER_PAGE);
  }, [freeCourses, myCoursesPage]);
  const pagedVideoCourses = useMemo(() => {
    const start = (myCoursesPage - 1) * ITEMS_PER_PAGE;
    return videoCourses.slice(start, start + ITEMS_PER_PAGE);
  }, [videoCourses, myCoursesPage]);
  const pagedFavoriteCourses = useMemo(() => {
    const start = (myCoursesPage - 1) * ITEMS_PER_PAGE;
    return favoriteCourses.slice(start, start + ITEMS_PER_PAGE);
  }, [favoriteCourses, myCoursesPage]);

  useEffect(() => {
    setCoursesPage(1);
  }, [activeTab, productPurchases.length]);

  useEffect(() => {
    if (coursesPage > coursesTotalPages) {
      setCoursesPage(coursesTotalPages);
    }
  }, [coursesPage, coursesTotalPages]);

  useEffect(() => {
    setToolsPage(1);
  }, [activeTab, toolPurchases.length]);

  useEffect(() => {
    if (toolsPage > toolsTotalPages) {
      setToolsPage(toolsTotalPages);
    }
  }, [toolsPage, toolsTotalPages]);

  useEffect(() => {
    setMyCoursesPage(1);
  }, [
    activeTab,
    myCourseTab,
    subscribedCourses.length,
    freeCourses.length,
    videoCourses.length,
    favoriteCourses.length,
  ]);

  useEffect(() => {
    if (myCoursesPage > myCoursesTotalPages) {
      setMyCoursesPage(myCoursesTotalPages);
    }
  }, [myCoursesPage, myCoursesTotalPages]);

  const goToCourse = useCallback((slug: string) => {
    if (!slug) return;
    if (typeof window !== "undefined") {
      window.location.href = `/blog/${slug}`;
    }
  }, []);

  const toggleFavorite = useCallback(
    async (courseId: number, isFav: boolean) => {
      try {
        const res = await fetch("/api/me/video-courses/favorites", {
          method: isFav ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        });
        if (!res.ok) throw new Error("Failed to update favorite");
        fetchFavoriteCourses();
      } catch (err) {
        console.error(err);
      }
    },
    [fetchFavoriteCourses]
  );

  // ===== Change Password =====
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPw, setShowPw] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const [pwOpen, setPwOpen] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const resetPwUI = () => {
    setPwOpen(false);
    setPwError(null);
    setPwSuccess(null);
    setPwLoading(false);
    setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowPw({ current: false, next: false, confirm: false });
  };

  const handleChangePassword = async () => {
    setPwError(null);
    setPwSuccess(null);

    const cur = pwForm.currentPassword.trim();
    const nw = pwForm.newPassword.trim();
    const cf = pwForm.confirmPassword.trim();

    if (!cur || !nw || !cf) {
      setPwError(t("profile.passwordFillAll") || "Please fill all password fields.");
      return;
    }
    if (nw.length < 6) {
      setPwError(t("profile.passwordTooShort") || "New password must be at least 6 characters.");
      return;
    }
    if (nw !== cf) {
      setPwError(t("profile.passwordNotMatch") || "New password and confirm password do not match.");
      return;
    }

    try {
      setPwLoading(true);

      await updateProfile({
        currentPassword: cur,
        newPassword: nw,
      });

      setPwSuccess(t("profile.passwordChanged") || "Password updated successfully.");
      resetPwUI();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setPwError(msg || (t("profile.passwordUpdateFailed") || "Password update failed."));
    } finally {
      setPwLoading(false);
    }
  };
  const verifiedBadgeSrc = "/border/blue%20verify.svg";
  if (!user) return null;
  const userLevel = Number(user.level ?? 1);
  const userHasLevelPerks = userLevel >= 2;
  const userAvatarBorderUrl = userHasLevelPerks ? user.avatarBorderUrl ?? null : null;
  const userPresence = useUserPresence(user.id);
  const previewAvatarUrl =
    normalizeAvatarInputUrl(avatarUrlInput) ?? user.avatarUrl ?? "/Job Jik.jpg";
  const userCoverSrc = user.coverUrl || getDefaultProfileCover(user.id);
  const previewCoverUrl =
    normalizeAvatarInputUrl(coverUrlInput) ?? user.coverUrl ?? getDefaultProfileCover(user.id);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="relative overflow-hidden">
        <ProfileCoverArt
          src={userCoverSrc}
          alt={`${displayName} cover`}
          positionX={user.coverPositionX ?? 50}
          positionY={user.coverPositionY ?? 50}
          scale={user.coverScale ?? 1}
          className="absolute inset-0"
          imageClassName="brightness-[0.78]"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/35 via-blue-900/20 to-violet-900/35" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={handleOpenCoverEditor}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/12 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur hover:bg-white/18"
            >
              <ImageIcon className="h-4 w-4" />
              {translate("profile.editCover", "Edit cover")}
            </button>
          </div>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
            <div className="relative mx-auto w-fit md:mx-0">
              <div className="rounded-[2rem] bg-white/12 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.28)] ring-1 ring-white/25 backdrop-blur-sm">
                <ProfileAvatar
                  src={user.avatarUrl || "/Job Jik.jpg"}
                  alt={displayName}
                  fallback={displayName}
                  borderUrl={userAvatarBorderUrl}
                  className="h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32"
                  contentClassName={userAvatarBorderUrl ? "shadow-xl" : "border-4 border-white/90 shadow-xl"}
                  fallbackClassName="text-xl sm:text-2xl lg:text-3xl"
                />
              </div>
              <UserOnlineStatus
                online={userPresence.online}
                showLabel={false}
                className="absolute bottom-1 left-1"
                dotClassName="h-5 w-5 border-[3px] border-white shadow-none sm:h-6 sm:w-6"
              />

              <button
                onClick={() => {
                  setProfileUpdateError(null);
                  setAvatarUrlInput(user.avatarUrl ?? "");
                  setAvatarOpen((v) => !v);
                }}
                className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-lg transition hover:scale-105 sm:h-11 sm:w-11"
                type="button"
              >
                <Camera className="w-5 h-5" />
              </button>

              {avatarOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close avatar picker"
                    onClick={() => setAvatarOpen(false)}
                    className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]"
                  />

                  <div className="fixed inset-x-3 bottom-4 top-[5.5rem] z-50 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.22)] backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-[min(80vh,42rem)] sm:w-[26rem] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2">
                    <div className="flex h-full flex-col overflow-hidden">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 px-4 pb-3 pt-4 dark:border-gray-700 sm:border-b-0 sm:pb-0">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {t("profile.chooseAvatar")}
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Update your photo and pick a border style that fits your profile.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAvatarOpen(false)}
                          className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 dark:border-gray-700 dark:text-slate-300 dark:hover:bg-gray-800"
                        >
                          Close
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4">
                        {profileUpdateError ? (
                          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                            {profileUpdateError}
                          </div>
                        ) : null}
                        <div className="flex items-center gap-4 rounded-[1.25rem] bg-gradient-to-br from-slate-100 via-white to-blue-50 p-4 dark:from-gray-800 dark:via-gray-900 dark:to-slate-800">
                          <ProfileAvatar
                            src={user.avatarUrl || "/Job Jik.jpg"}
                            alt={displayName}
                            fallback={displayName}
                            borderUrl={userAvatarBorderUrl}
                            className="h-20 w-20 sm:h-24 sm:w-24"
                            contentClassName={userAvatarBorderUrl ? "shadow-lg" : "border-4 border-white/90 shadow-lg"}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
                              Current style
                            </div>
                            <div className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {displayName}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {userAvatarBorderUrl ? "Border applied" : "No border selected"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {translate("profile.avatarPasteLink", "Paste image link")}
                        </div>
                        <div className="mt-3 rounded-[1.1rem] border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                          <div className="flex items-center gap-3">
                            <ProfileAvatar
                              src={previewAvatarUrl}
                              alt={displayName}
                              fallback={displayName}
                              borderUrl={userAvatarBorderUrl}
                              className="h-16 w-16 shrink-0"
                              contentClassName={userAvatarBorderUrl ? "shadow-md" : "border-4 border-white/90 shadow-md"}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                {translate("profile.avatarLinkPreview", "Link preview")}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {translate(
                                  "profile.avatarLinkHint",
                                  "Paste any image URL. Large images will auto-fit your profile size."
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <Input
                              value={avatarUrlInput}
                              onChange={(e) => setAvatarUrlInput(e.target.value)}
                              placeholder="https://example.com/avatar.jpg"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              onClick={() => void handleSaveAvatarUrl()}
                              disabled={avatarUrlSaving}
                              className="w-full sm:w-auto"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              {avatarUrlSaving
                                ? translate("profile.saving", "Saving...")
                                : translate("profile.useImageLink", "Use link")}
                            </Button>
                          </div>
                        </div>

                        <div className="mt-5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {t("profile.chooseAvatar")}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {AVATARS.map((src) => (
                            <button
                              key={src}
                              onClick={() => void handleSelectAvatar(src)}
                              className={`overflow-hidden rounded-[1rem] border transition hover:-translate-y-0.5 hover:shadow-md ${
                                user.avatarUrl === src
                                  ? "border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/60"
                                  : "border-slate-200 dark:border-gray-700"
                              }`}
                              type="button"
                            >
                              <img
                                src={src}
                                alt="Avatar option"
                                className="h-24 w-full object-cover sm:h-28"
                              />
                            </button>
                          ))}
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Choose Border
                          </div>
                          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                            {AVATAR_BORDER_URLS.length} styles
                          </div>
                        </div>
                        {!userHasLevelPerks ? (
                          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
                            Blue verify and avatar borders unlock at Level 2.
                          </div>
                        ) : null}
                        <div className="mt-3 grid grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => void handleSelectAvatarBorder(null)}
                            className={`group flex aspect-square flex-col items-center justify-center rounded-[1.1rem] border p-3 text-center transition hover:-translate-y-0.5 hover:shadow-md ${
                              userAvatarBorderUrl
                                ? "border-slate-200 bg-slate-50 text-slate-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300"
                                : "border-blue-500 bg-blue-50 text-blue-600 ring-2 ring-blue-100 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-900/60"
                            }`}
                          >
                            <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                              None
                            </span>
                            <span className="mt-2 text-[11px] leading-4 text-slate-400 dark:text-slate-500">
                              Clean avatar
                            </span>
                          </button>
                          {AVATAR_BORDER_URLS.map((borderUrl) => (
                            <button
                              key={borderUrl}
                              type="button"
                              onClick={() => {
                                if (!userHasLevelPerks) return;
                                void handleSelectAvatarBorder(borderUrl);
                              }}
                              disabled={!userHasLevelPerks}
                              className={`group relative aspect-square rounded-[1.1rem] border p-3 transition ${
                                userHasLevelPerks ? "hover:-translate-y-0.5 hover:shadow-md" : "cursor-not-allowed opacity-45"
                              } ${
                                userAvatarBorderUrl === borderUrl
                                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-400 dark:bg-blue-500/10 dark:ring-blue-900/60"
                                  : "border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-800/70"
                              }`}
                            >
                              <div className="flex h-full items-center justify-center rounded-[0.9rem] bg-gradient-to-br from-slate-100 via-white to-slate-50 p-2 dark:from-gray-800 dark:via-gray-900 dark:to-slate-800">
                                <ProfileAvatar
                                  src={user.avatarUrl || "/Job Jik.jpg"}
                                  alt={displayName}
                                  fallback={displayName}
                                  borderUrl={borderUrl}
                                  className="h-full w-full max-h-[5.5rem] max-w-[5.5rem]"
                                  contentClassName="shadow-md"
                                />
                              </div>
                              {userAvatarBorderUrl === borderUrl ? (
                                <span className="absolute right-2 top-2 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                  On
                                </span>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {coverOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close cover editor"
                    onClick={() => setCoverOpen(false)}
                    className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]"
                  />

                  <div className="fixed inset-x-3 bottom-4 top-[5.5rem] z-50 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.22)] backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-[min(84vh,46rem)] sm:w-[34rem] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2">
                    <div className="flex h-full flex-col overflow-hidden">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 px-4 pb-3 pt-4 dark:border-gray-700">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {translate("profile.editCover", "Edit cover")}
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {translate(
                              "profile.coverHelp",
                              "Paste a cover URL, drag the preview, and use the sliders to fit it like a Facebook cover."
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCoverOpen(false)}
                          className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 dark:border-gray-700 dark:text-slate-300 dark:hover:bg-gray-800"
                        >
                          Close
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4">
                        {profileUpdateError ? (
                          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                            {profileUpdateError}
                          </div>
                        ) : null}

                        <div
                          ref={coverPreviewRef}
                          className="relative h-44 overflow-hidden rounded-[1.35rem] border border-slate-200 bg-slate-100 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:h-52"
                          onPointerDown={handleCoverPointerDown}
                          onPointerMove={handleCoverPointerMove}
                          onPointerUp={handleCoverPointerUp}
                          onPointerCancel={handleCoverPointerUp}
                        >
                          <ProfileCoverArt
                            src={previewCoverUrl}
                            alt={`${displayName} cover preview`}
                            positionX={coverPositionX}
                            positionY={coverPositionY}
                            scale={coverScale}
                            className="absolute inset-0"
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/5 via-transparent to-slate-950/20" />
                          <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-slate-900/65 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                            Drag to position
                          </div>
                        </div>

                        <div className="mt-4 rounded-[1.1rem] border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {translate("profile.coverPasteLink", "Paste cover link")}
                          </div>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <Input
                              value={coverUrlInput}
                              onChange={(e) => setCoverUrlInput(e.target.value)}
                              placeholder="https://example.com/cover.jpg"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              onClick={() => setCoverUrlInput(previewCoverUrl)}
                              variant="outline"
                              className="w-full sm:w-auto"
                            >
                              {translate("profile.usePreview", "Use preview")}
                            </Button>
                          </div>
                        </div>

                        <div className="mt-5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {translate("profile.chooseCover", "Choose cover")}
                            </div>
                            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                              {DEFAULT_PROFILE_COVERS.length} styles
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            {DEFAULT_PROFILE_COVERS.map((src) => (
                              <button
                                key={src}
                                type="button"
                                onClick={() => handleSelectCover(src)}
                                className={`overflow-hidden rounded-[1rem] border transition hover:-translate-y-0.5 hover:shadow-md ${
                                  previewCoverUrl === src
                                    ? "border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/60"
                                    : "border-slate-200 dark:border-gray-700"
                                }`}
                              >
                                <img
                                  src={src}
                                  alt="Cover option"
                                  className="h-20 w-full object-cover sm:h-24"
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-5 space-y-4 rounded-[1.1rem] border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                          <label className="block">
                            <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                              {translate("profile.coverZoom", "Zoom")}
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="3"
                              step="0.01"
                              value={coverScale}
                              onChange={(event) => setCoverScale(Number(event.target.value))}
                              className="w-full"
                            />
                          </label>

                          <label className="block">
                            <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                              {translate("profile.coverHorizontal", "Horizontal position")}
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="0.1"
                              value={coverPositionX}
                              onChange={(event) => setCoverPositionX(Number(event.target.value))}
                              className="w-full"
                            />
                          </label>

                          <label className="block">
                            <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                              {translate("profile.coverVertical", "Vertical position")}
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="0.1"
                              value={coverPositionY}
                              onChange={(event) => setCoverPositionY(Number(event.target.value))}
                              className="w-full"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 border-t border-slate-200/70 px-4 py-4 dark:border-gray-700 sm:flex-row sm:justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleClearCover()}
                          disabled={coverSaving}
                          className="w-full sm:w-auto"
                        >
                          {translate("profile.clearCover", "Clear cover")}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => void handleSaveCover()}
                          disabled={coverSaving}
                          className="w-full sm:w-auto"
                        >
                          {coverSaving
                            ? translate("profile.saving", "Saving...")
                            : translate("profile.saveCover", "Save cover")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center justify-center gap-2 align-middle md:justify-start">
                <h1 className="text-2xl font-bold text-white sm:text-3xl">{displayName}</h1>
                {userHasLevelPerks ? (
                  <Image
                    src={verifiedBadgeSrc}
                    alt="Verified"
                    width={40}
                    height={40}
                    className="mt-0.5 h-8 w-8 shrink-0 object-contain drop-shadow-[0_4px_10px_rgba(14,165,233,0.45)] sm:h-9 sm:w-9"
                  />
                ) : null}
              </div>
              <p className="mt-1 text-sm text-blue-100 sm:text-base">
                {translate("sidebar.userId", "Account ID")}: {user.id}
              </p>
              <div className="mt-3 flex flex-col items-center gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-4 md:items-start md:justify-start">
                {!!joinedText && (
                  <span className="text-white flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> {t("profile.joined")} {joinedText}
                  </span>
                )}
                {!!user.place && (
                  <span className="text-white flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {user.place}
                  </span>
                )}
              </div>
              <div className="mt-3 flex justify-center md:justify-start">
                <UserLevelBadge
                  userId={user.id}
                  size="lg"
                  showProgress={false}
                  lang={language as "en" | "km" || "en"}
                />
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <Button
                variant="outline"
                className="w-full border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 sm:w-auto"
                onClick={() => setActiveTab("settings")}
              >
                <Settings className="w-4 h-4 mr-2" /> {t("profile.settings")}
              </Button>
              <Button
                variant="outline"
                className="w-full border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 sm:w-auto"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" /> {t("profile.logout")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div
            ref={profileTabsRef}
            className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide sm:gap-3"
          >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  profileTabButtonRefs.current[tab.id] = node;
                }}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm sm:text-base ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500"
                }`}
                type="button"
              >
                <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                <span className="whitespace-nowrap">{tab.name}</span>
              </button>
            );
          })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Level Dashboard */}
            <div className="mb-6">
              <UserLevelDashboard userId={user.id} />
            </div>

            {statsError && (
              <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/50 dark:bg-red-500/10 dark:text-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{statsError}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={fetchStats}>
                  {translate("profile.retry", "Retry")}
                </Button>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statsCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.key}
                    className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${card.accent} sm:h-12 sm:w-12`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-right text-sm text-gray-500 dark:text-gray-400">{card.label}</span>
                    </div>
                    <div className="mt-4 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{card.value}</div>
                  </div>
                );
              })}
            </div>

            {statsLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {translate("profile.loadingStats", "Loading your stats...")}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {translate("profile.statusBreakdown", "Order status overview")}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {translate("profile.totalOrders", "Total orders")}: {formatNumber(overviewStats?.totalOrders ?? 0)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchStats}
                    disabled={statsLoading}
                    className="w-full sm:w-auto"
                  >
                    <Loader2 className={`h-4 w-4 ${statsLoading ? "animate-spin" : ""}`} />
                    {translate("profile.refresh", "Refresh")}
                  </Button>
                </div>

                <div className="space-y-4">
                  {ORDER_STATUS_ORDER.map((status) => (
                    <div
                      key={status}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-3 text-sm dark:border-gray-800 sm:px-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[status]}`} />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {statusLabels[status]}
                        </span>
                      </div>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatNumber(stateCounts[status])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {translate("profile.recentPurchases", "Recent purchases")}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {translate("profile.myProducts", "My Products")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveTab("courses")}
                    className="w-full justify-between sm:w-auto"
                  >
                    {translate("profile.viewAllPurchases", "View all purchases")}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                {purchasesError && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <span className="flex-1">{purchasesError}</span>
                    <button
                      type="button"
                      onClick={fetchPurchases}
                      className="text-xs font-semibold underline"
                    >
                      {translate("profile.retry", "Retry")}
                    </button>
                  </div>
                )}

                {purchasesLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((idx) => (
                      <div
                        key={idx}
                        className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800/60"
                      />
                    ))}
                  </div>
                ) : recentPurchases.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {translate("profile.purchasesEmpty", "You haven't completed any purchases yet.")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentPurchases.map((purchase) => (
                      <button
                        key={`${purchase.orderNumber}-${purchase.productId}`}
                        type="button"
                        onClick={() => goToProduct(purchase.slug)}
                        className="flex w-full flex-col gap-3 rounded-xl border border-gray-100 px-3 py-3 text-left transition hover:border-blue-300 dark:border-gray-800 sm:flex-row sm:items-center sm:gap-4"
                      >
                        <div className="flex items-center gap-3 sm:flex-1 sm:gap-4">
                          <img
                            src={purchase.imageUrl || "/Nut Roth Logo.png"}
                            alt={purchase.title}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                            {purchase.title}
                          </div>
                          {!purchase.isActive ? (
                            <div className="text-xs text-red-500">
                              {translate("profile.expired", "Expired")}
                            </div>
                          ) : null}
                          <p className="text-xs text-gray-500">
                            {formatDateTime(purchase.orderedAt)}
                          </p>
                          {purchase.accessEnd ? (
                            <p className="text-xs text-gray-400">
                              {translate("profile.accessEnd", "Access ends")}:{" "}
                              {formatDateTime(purchase.accessEnd)}
                            </p>
                          ) : null}
                          {purchase.completedAt ? (
                            <p className="text-xs text-gray-400">
                              {translate("profile.accessStart", "Access start")}:{" "}
                              {formatDateTime(purchase.completedAt)}
                            </p>
                          ) : null}
                          </div>
                        </div>
                        <div className="w-full text-left text-sm text-gray-700 dark:text-gray-300 sm:w-auto sm:text-right">
                          <div className="font-semibold text-blue-600 dark:text-blue-300">
                            {formatCurrency((purchase.unitPrice ?? 0) * (purchase.quantity ?? 0))}
                          </div>
                          <p className="text-xs text-gray-500">
                            {translate("profile.quantity", "Quantity")}: {formatNumber(purchase.quantity ?? 0)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {videoCoursesError && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <span className="flex-1">{videoCoursesError}</span>
                    <button
                      type="button"
                      onClick={fetchVideoCourses}
                      className="text-xs font-semibold underline"
                    >
                      {translate("profile.retry", "Retry")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "courses" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {translate("profile.myProducts", "My Products")}
                </h2>
                <p className="text-sm text-gray-500">
                  {translate(
                    "profile.recentPurchases",
                    "Products you've completed purchasing"
                  )}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {translate("profile.totalItems", "Items purchased")}: {formatNumber(productPurchases.length)}
              </div>
            </div>

            {purchasesError && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-100">
                <AlertCircle className="h-4 w-4" />
                <span className="flex-1">{purchasesError}</span>
                <Button size="sm" variant="outline" onClick={fetchPurchases}>
                  {translate("profile.retry", "Retry")}
                </Button>
              </div>
            )}

            {purchasesLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800/60"
                  />
                ))}
              </div>
            ) : productPurchases.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                {translate("profile.purchasesEmpty", "You haven't completed any purchases yet.")}
              </div>
            ) : (
              <div className="space-y-4">
                {pagedProductPurchases.map((item) => (
                  <div
                    key={`${item.orderNumber}-${item.productId}`}
                    className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 sm:p-5 md:flex-row md:items-center"
                  >
                    <div className="flex flex-1 items-start gap-4 sm:items-center">
                      <img
                        src={item.imageUrl || "/Nut Roth Logo.png"}
                        alt={item.title}
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                      <div>
                        <div className="text-base font-semibold text-gray-900 dark:text-white">
                          {item.title}
                        </div>
                        {!item.isActive ? (
                          <p className="text-xs text-red-500">
                            {translate("profile.expired", "Expired")}
                          </p>
                        ) : null}
                        <p className="text-sm text-gray-500">
                          {translate("profile.orderNumber", "Order no.")}: {item.orderNumber}
                        </p>
                        <p className="text-xs text-gray-400">{formatDateTime(item.orderedAt)}</p>
                        {item.accessEnd ? (
                          <p className="text-xs text-gray-400">
                            {translate("profile.accessEnd", "Access ends")}:{" "}
                            {formatDateTime(item.accessEnd)}
                          </p>
                        ) : null}
                        {item.completedAt ? (
                          <p className="text-xs text-gray-400">
                            {translate("profile.accessStart", "Access start")}:{" "}
                            {formatDateTime(item.completedAt)}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <span>
                        {translate("profile.quantity", "Quantity")}: {formatNumber(item.quantity ?? 0)}
                      </span>
                      {item.variantLabel && (
                        <span>
                          {translate("profile.variant", "Option")}: {item.variantLabel}
                        </span>
                      )}
                      {item.unlimitedDevice ? (
                        <span>{translate("profile.deviceLimit", "Devices")}: Unlimited</span>
                      ) : item.deviceLimit ? (
                        <span>
                          {translate("profile.deviceLimit", "Devices")}: {item.deviceLimit}
                        </span>
                      ) : null}
                      {item.deviceType ? (
                        <span>
                          {translate("profile.deviceType", "Device")}: {item.deviceType}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-left md:text-right">
                      <div className="text-lg font-semibold text-blue-600 dark:text-blue-300">
                        {formatCurrency((item.unitPrice ?? 0) * (item.quantity ?? 0))}
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(item.unitPrice ?? 0)} / {translate("profile.quantity", "Quantity")}
                      </p>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end md:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToOrderDetail(item.orderId)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        {translate("profile.viewProduct", "View detail")}
                      </Button>
                    </div>
                  </div>
                ))}
                <Pagination
                  currentPage={coursesPage}
                  totalPages={coursesTotalPages}
                  onPageChange={setCoursesPage}
                />
              </div>
            )}

          </div>
        )}

        {activeTab === "tools" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {translate("profile.tools", "Tools")}
                </h2>
                <p className="text-sm text-gray-500">
                  {translate("profile.toolsSubtitle", "Tools you've completed purchasing")}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {translate("profile.totalItems", "Items purchased")}: {formatNumber(toolPurchases.length)}
              </div>
            </div>

            {purchasesError && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-100">
                <AlertCircle className="h-4 w-4" />
                <span className="flex-1">{purchasesError}</span>
                <Button size="sm" variant="outline" onClick={fetchPurchases}>
                  {translate("profile.retry", "Retry")}
                </Button>
              </div>
            )}

            {purchasesLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800/60"
                  />
                ))}
              </div>
            ) : toolPurchases.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                {translate("profile.purchasesEmpty", "You haven't completed any purchases yet.")}
              </div>
            ) : (
              <div className="space-y-4">
                {pagedToolPurchases.map((item) => (
                  <div
                    key={`${item.orderNumber}-${item.productId}`}
                    className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 sm:p-5 md:flex-row md:items-center"
                  >
                    <div className="flex flex-1 items-start gap-4 sm:items-center">
                      <img
                        src={item.imageUrl || "/Nut Roth Logo.png"}
                        alt={item.title}
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                      <div>
                        <div className="text-base font-semibold text-gray-900 dark:text-white">
                          {item.title}
                        </div>
                        {!item.isActive ? (
                          <p className="text-xs text-red-500">
                            {translate("profile.expired", "Expired")}
                          </p>
                        ) : null}
                        <p className="text-sm text-gray-500">
                          {translate("profile.orderNumber", "Order no.")}: {item.orderNumber}
                        </p>
                        <p className="text-xs text-gray-400">{formatDateTime(item.orderedAt)}</p>
                        {item.accessEnd ? (
                          <p className="text-xs text-gray-400">
                            {translate("profile.accessEnd", "Access ends")}:{" "}
                            {formatDateTime(item.accessEnd)}
                          </p>
                        ) : null}
                        {item.completedAt ? (
                          <p className="text-xs text-gray-400">
                            {translate("profile.accessStart", "Access start")}:{" "}
                            {formatDateTime(item.completedAt)}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <span>
                        {translate("profile.quantity", "Quantity")}: {formatNumber(item.quantity ?? 0)}
                      </span>
                      {item.variantLabel && (
                        <span>
                          {translate("profile.variant", "Option")}: {item.variantLabel}
                        </span>
                      )}
                    </div>

                    <div className="text-left md:text-right">
                      <div className="text-lg font-semibold text-blue-600 dark:text-blue-300">
                        {formatCurrency((item.unitPrice ?? 0) * (item.quantity ?? 0))}
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(item.unitPrice ?? 0)} / {translate("profile.quantity", "Quantity")}
                      </p>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end md:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToTool(item.slug)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        {translate("profile.openTool", "Open tool")}
                      </Button>
                    </div>
                  </div>
                ))}
                <Pagination
                  currentPage={toolsPage}
                  totalPages={toolsTotalPages}
                  onPageChange={setToolsPage}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "my-courses" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {translate("profile.myCourses", "My Courses")}
                </h2>
                <p className="text-sm text-gray-500">
                  {translate("profile.myCoursesSubtitle", "Courses you've purchased")}
                </p>
                <p className="text-sm text-gray-500">
                  {subscribedActive
                    ? `${translate("profile.currentPlan", "Current plan")}: ${subscribedPlanName || "Active"}`
                    : subscribedError
                      ? translate("profile.subscriptionError", "Failed to load subscriptions")
                      : translate("profile.noSubscription", "Not subscribed yet")}
                </p>
              </div>
              <div className="text-sm text-gray-500">
              {translate("profile.totalItems", "Items purchased")}: {formatNumber(activeCourseItemsCount)}
            </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "free", label: translate("profile.free", "Free") },
                { id: "subscribe", label: translate("profile.subscribed", "Subscribed") },
                { id: "lifetime", label: translate("profile.lifetime", "Lifetime") },
                { id: "favorite", label: translate("profile.favorite", "Favorite") },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMyCourseTab(tab.id as "subscribe" | "lifetime" | "favorite" | "free")}
                  className={`px-4 py-2 rounded-full text-sm border ${
                    myCourseTab === tab.id
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {myCourseTab === "subscribe" && subscribedError && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-100">
                <AlertCircle className="h-4 h-4" />
                <span className="flex-1">{subscribedError}</span>
                <Button size="sm" variant="outline" onClick={fetchSubscribedCourses}>
                  {translate("profile.retry", "Retry")}
                </Button>
              </div>
            )}

            {myCourseTab === "subscribe" && (subscribedLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800/60"
                  />
                ))}
              </div>
            ) : !subscribedActive ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                {translate("profile.noSubscription", "No active subscription plan.")}
              </div>
            ) : subscribedCourses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                {translate("profile.coursesEmpty", "No video courses available yet.")}
              </div>
            ) : (
              <div className="space-y-4">
                {pagedSubscribedCourses.map((course) => {
                  const isFav = favoriteCourses.some((f) => f.courseId === course.courseId);
                  return (
                    <div
                      key={`${course.courseId}-${course.slug}`}
                      className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center"
                    >
                      <div className="flex flex-1 items-center gap-4">
                        <img
                          src={course.thumbnailUrl || "/Nut Roth Logo.png"}
                          alt={course.title}
                          className="h-16 w-16 rounded-xl object-cover"
                        />
                        <div>
                          <div className="text-base font-semibold text-gray-900 dark:text-white">
                            {course.title}
                          </div>
                          {!course.isActive ? (
                            <p className="text-xs text-red-500">
                              {translate("profile.expired", "Expired")}
                            </p>
                          ) : null}
                          <p className="text-xs text-gray-400">
                            {translate("profile.subscribed", "Subscribed")}
                          </p>
                        </div>
                      </div>
                      <div className="flex w-full justify-end gap-2 md:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToCourse(course.slug)}
                        >
                          {translate("profile.watch", "Watch")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(course.courseId, isFav)}
                        >
                          {isFav ? "♥" : "♡"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Pagination
                  currentPage={myCoursesPage}
                  totalPages={myCoursesTotalPages}
                  onPageChange={setMyCoursesPage}
                />
              </div>
            ))}

            {myCourseTab === "free" && freeError && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-100">
                <AlertCircle className="h-4 h-4" />
                <span className="flex-1">{freeError}</span>
                <Button size="sm" variant="outline" onClick={fetchFreeCourses}>
                  {translate("profile.retry", "Retry")}
                </Button>
              </div>
            )}

            {myCourseTab === "free" && (freeLoading ? (
              <div className="space-y-4">
                {[0, 1].map((idx) => (
                  <div
                    key={idx}
                    className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800/60"
                  />
                ))}
              </div>
            ) : freeCourses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                {translate("profile.noFreeCourses", "No free courses yet.")}
              </div>
            ) : (
              <div className="space-y-4">
                {pagedFreeCourses.map((course) => {
                  const isFav = favoriteCourses.some((f) => f.courseId === course.courseId);
                  return (
                    <div
                      key={`${course.courseId}-${course.slug}`}
                      className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center"
                    >
                      <div className="flex flex-1 items-center gap-4">
                        <img
                          src={course.thumbnailUrl || "/Nut Roth Logo.png"}
                          alt={course.title}
                          className="h-16 w-16 rounded-xl object-cover"
                        />
                        <div>
                          <div className="text-base font-semibold text-gray-900 dark:text-white">
                            {course.title}
                          </div>
                          {!course.isActive ? (
                            <p className="text-xs text-red-500">
                              {translate("profile.expired", "Expired")}
                            </p>
                          ) : null}
                          <p className="text-xs text-gray-400">
                            {translate("profile.free", "Free")}
                          </p>
                        </div>
                      </div>
                      <div className="flex w-full justify-end gap-2 md:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToCourse(course.slug)}
                        >
                          {translate("profile.watch", "Watch")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(course.courseId, isFav)}
                        >
                          {isFav ? "♥" : "♡"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Pagination
                  currentPage={myCoursesPage}
                  totalPages={myCoursesTotalPages}
                  onPageChange={setMyCoursesPage}
                />
              </div>
            ))}
            {myCourseTab === "lifetime" && videoCoursesError && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-100">
                <AlertCircle className="h-4 h-4" />
                <span className="flex-1">{videoCoursesError}</span>
                <Button size="sm" variant="outline" onClick={fetchVideoCourses}>
                  {translate("profile.retry", "Retry")}
                </Button>
              </div>
            )}

            {myCourseTab === "lifetime" && (videoCoursesLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800/60"
                  />
                ))}
              </div>
            ) : videoCourses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                {translate("profile.coursesEmpty", "No video courses purchased yet.")}
              </div>
            ) : (
              <div className="space-y-4">
                {pagedVideoCourses.map((course) => (
                  <div
                    key={`${course.courseId}-${course.slug}`}
                    className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center"
                  >
                    <div className="flex flex-1 items-center gap-4">
                      <img
                        src={course.thumbnailUrl || "/Nut Roth Logo.png"}
                        alt={course.title}
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                      <div>
                        <div className="text-base font-semibold text-gray-900 dark:text-white">
                          {course.title}
                        </div>
                        {!course.isActive ? (
                          <p className="text-xs text-red-500">
                            {translate("profile.expired", "Expired")}
                          </p>
                        ) : null}
                        <p className="text-sm text-gray-500">
                          {translate("profile.plan", "Plan")}: {course.planName || "Plan"}
                        </p>
                        {course.orderNumber ? (
                          <p className="text-xs text-gray-400">
                            {translate("profile.orderNumber", "Order no.")}: {course.orderNumber}
                          </p>
                        ) : null}
                        <p className="text-xs text-gray-400">
                          {translate("profile.accessEnd", "Access end")}:{" "}
                          {course.accessEnd
                            ? formatDateTime(course.accessEnd)
                            : translate("profile.lifetime", "Lifetime")}
                        </p>
                      </div>
                    </div>
                    <div className="flex w-full justify-end gap-2 md:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToCourse(course.slug)}
                      >
                        {translate("profile.watch", "Watch")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleFavorite(
                            course.courseId,
                            favoriteCourses.some((f) => f.courseId === course.courseId)
                          )
                        }
                      >
                        {favoriteCourses.some((f) => f.courseId === course.courseId) ? "♥" : "♡"}
                      </Button>
                    </div>
                  </div>
                ))}
                <Pagination
                  currentPage={myCoursesPage}
                  totalPages={myCoursesTotalPages}
                  onPageChange={setMyCoursesPage}
                />
              </div>
            ))}

            {myCourseTab === "favorite" && favoriteError && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-100">
                <AlertCircle className="h-4 h-4" />
                <span className="flex-1">{favoriteError}</span>
                <Button size="sm" variant="outline" onClick={fetchFavoriteCourses}>
                  {translate("profile.retry", "Retry")}
                </Button>
              </div>
            )}

            {myCourseTab === "favorite" && (favoriteLoading ? (
              <div className="space-y-4">
                {[0, 1].map((idx) => (
                  <div
                    key={idx}
                    className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800/60"
                  />
                ))}
              </div>
            ) : favoriteCourses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                {translate("profile.noFavorites", "No favorites yet.")}
              </div>
            ) : (
              <div className="space-y-4">
                {pagedFavoriteCourses.map((course) => (
                  <div
                    key={`${course.courseId}-${course.slug}`}
                    className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center"
                  >
                    <div className="flex flex-1 items-center gap-4">
                      <img
                        src={course.thumbnailUrl || "/Nut Roth Logo.png"}
                        alt={course.title}
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                      <div>
                        <div className="text-base font-semibold text-gray-900 dark:text-white">
                          {course.title}
                        </div>
                        {!course.isActive ? (
                          <p className="text-xs text-red-500">
                            {translate("profile.expired", "Expired")}
                          </p>
                        ) : null}
                        <p className="text-xs text-gray-400">
                          {translate("profile.favorite", "Favorite")}
                        </p>
                      </div>
                    </div>
                    <div className="flex w-full justify-end gap-2 md:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToCourse(course.slug)}
                      >
                        {translate("profile.watch", "Watch")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(course.courseId, true)}
                      >
                        {"♥"}
                      </Button>
                    </div>
                  </div>
                ))}
                <Pagination
                  currentPage={myCoursesPage}
                  totalPages={myCoursesTotalPages}
                  onPageChange={setMyCoursesPage}
                />
              </div>
            ))}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow border border-gray-100 dark:border-gray-700 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {translate("profile.about", "About me")}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {translate("profile.aboutSubtitle", "Keep your personal information up to date.")}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => (isEditing ? cancelEditing() : startEditing())}
                  className="w-full sm:w-auto"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  {isEditing
                    ? translate("profile.cancel", "Cancel")
                    : translate("profile.edit", "Edit")}
                </Button>
              </div>

              {isEditing ? (
                <div className="mt-4 space-y-4">
                  {profileUpdateError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                      {profileUpdateError}
                    </div>
                  ) : null}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      {translate("register.username", "Username")}
                    </p>
                    <Input
                      placeholder={translate("register.username", "Username")}
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Gmail
                    </p>
                    <Input
                      value={user.email || ""}
                      disabled
                      placeholder="Gmail"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      {translate("profile.fullName", "Full name")}
                    </p>
                    <Input
                      placeholder={translate("profile.fullName", "Full name")}
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      {translate("profile.bioPlaceholder", "Short bio")}
                    </p>
                    <Input
                      placeholder={translate("profile.bioPlaceholder", "Short bio")}
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setCountryOpen((prev) => !prev)}
                        className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                      >
                        <span className="flex items-center gap-2">
                          {selectedCountry?.flag ? (
                            <img
                              src={selectedCountry.flag}
                              alt={selectedCountry.name}
                              className="h-5 w-5 rounded-full object-cover"
                            />
                          ) : (
                            <Globe className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="font-medium">
                            {selectedCountry?.dial || translate("profile.country", "Country")}
                          </span>
                          <span className="text-xs text-gray-500">
                            {selectedCountry?.name || translate("profile.selectCountry", "Select country")}
                          </span>
                        </span>
                        <span className="text-xs text-gray-400">▾</span>
                      </button>
                      {countryOpen && (
                        <div className="absolute z-30 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                            <input
                              value={countryQuery}
                              onChange={(e) => setCountryQuery(e.target.value)}
                              placeholder={translate("profile.searchCountry", "Search country")}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            />
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {filteredCountries.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-gray-500">
                                {translate("profile.noCountry", "No country found")}
                              </div>
                            ) : (
                              filteredCountries.map((country) => (
                                <button
                                  key={`${country.cca2}-${country.dial}`}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCountry(country);
                                    saveCountryToStorage(country);
                                    setCountryOpen(false);
                                    setCountryQuery("");
                                    setEditForm((prev) => ({
                                      ...prev,
                                      location: country.name,
                                    }));
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                                >
                                  {country.flag ? (
                                    <img
                                      src={country.flag}
                                      alt={country.name}
                                      className="h-5 w-5 rounded-full object-cover"
                                    />
                                  ) : (
                                    <Globe className="h-4 w-4 text-gray-400" />
                                  )}
                                  <span className="font-semibold text-sm">{country.dial}</span>
                                  <span className="text-xs text-gray-500">{country.name}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <Input
                      placeholder={translate("profile.phoneNumber", "Phone number")}
                      value={editForm.phone}
                      onChange={(e) => handlePhoneInput(e.target.value)}
                    />
                  </div>
                  <Input
                    placeholder={translate("profile.location", "Location")}
                    value={selectedCountry?.name || editForm.location}
                    disabled
                  />
                  <Button onClick={handleSaveProfile} className="w-full">
                    {translate("profile.saveChanges", "Save changes")}
                  </Button>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <p>{user.email || t("login.emailLabel")}</p>
                  <p>{user.bio || translate("profile.passionate", "Passionate about learning and technology")}</p>
                  <p>{sanitizeProfilePhone(user.phone) || translate("profile.phone", "Phone")}</p>
                  <p>{user.place || translate("profile.location", "Location")}</p>
                </div>
              )}
            </div>

            {/* SECURITY / CHANGE PASSWORD */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow border border-gray-100 dark:border-gray-700 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-emerald-100 text-emerald-600">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {translate("profile.security", "Security")}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {translate("profile.securityDesc", "Manage password and account protection.")}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setPwError(null);
                    setPwSuccess(null);
                    setPwOpen((v) => !v);
                    if (pwOpen) resetPwUI();
                  }}
                  className="w-full sm:w-auto"
                >
                  {pwOpen
                    ? translate("profile.close", "Close")
                    : translate("profile.changePassword", "Change Password")}
                </Button>
              </div>

              {!!pwError && <div className="mt-3 text-sm text-red-600">{pwError}</div>}
              {!!pwSuccess && <div className="mt-3 text-sm text-green-600">{pwSuccess}</div>}

              {pwOpen && (
                <div className="mt-4 space-y-3">
                  {[
                    {
                      key: "current",
                      label: translate("profile.currentPassword", "Current password"),
                      value: pwForm.currentPassword,
                    },
                    {
                      key: "next",
                      label: translate("profile.newPassword", "New password"),
                      value: pwForm.newPassword,
                    },
                    {
                      key: "confirm",
                      label: translate("profile.confirmNewPassword", "Confirm new password"),
                      value: pwForm.confirmPassword,
                    },
                  ].map((field) => (
                    <div className="relative" key={field.key}>
                      <Input
                        type={showPw[field.key as keyof typeof showPw] ? "text" : "password"}
                        placeholder={field.label}
                        value={field.value}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (field.key === "current") {
                            setPwForm((prev) => ({ ...prev, currentPassword: v }));
                            return;
                          }
                          if (field.key === "next") {
                            setPwForm((prev) => ({ ...prev, newPassword: v }));
                            return;
                          }
                          setPwForm((prev) => ({ ...prev, confirmPassword: v }));
                        }}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"
                        onClick={() =>
                          setShowPw((prev) => ({
                            ...prev,
                            [field.key]: !prev[field.key as keyof typeof showPw],
                          }))
                        }
                      >
                        {showPw[field.key as keyof typeof showPw] ? "🙈" : "👁️"}
                      </button>
                    </div>
                  ))}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={handleChangePassword}
                      disabled={pwLoading}
                      type="button"
                      className="w-full sm:w-auto"
                    >
                      {pwLoading
                        ? translate("profile.saving", "Saving...")
                        : translate("profile.savePassword", "Save Password")}
                    </Button>

                    <Button
                      variant="outline"
                      type="button"
                      onClick={resetPwUI}
                      className="w-full sm:w-auto"
                    >
                      {translate("profile.cancel", "Cancel")}
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500">
                    {translate("profile.passwordTip", "Tip: use 8+ characters with numbers and symbols.")}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow border border-gray-100 dark:border-gray-700 mb-6 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {translate("profile.apiKeys.title", "Personal API keys")}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {translate(
                      "profile.apiKeys.description",
                      "Save your own Groq, OpenAI, Google, or DeepL key. Your requests will use your saved key first, then fall back to the website default if you have not set one."
                    )}
                  </p>
                </div>
              </div>

              {!!apiKeysMessage && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {apiKeysMessage}
                </div>
              )}
              {!!apiKeysError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {apiKeysError}
                </div>
              )}

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {apiKeyProviders.map((provider) => {
                  const current = apiKeys[provider.id];
                  return (
                    <div
                      key={provider.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {provider.label}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {provider.description}
                          </p>
                          <p className="mt-2 text-xs text-gray-500">
                            {current.configured
                              ? `${translate("profile.apiKeys.savedAs", "Saved as")}: ${current.masked || "****"}`
                              : translate("profile.apiKeys.notSaved", "No personal key saved yet.")}
                          </p>
                        </div>
                        {current.configured ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void removeApiKey(provider.id)}
                            disabled={apiKeysSaving}
                          >
                            {translate("profile.apiKeys.remove", "Remove")}
                          </Button>
                        ) : null}
                      </div>

                      <Input
                        ref={(element) => {
                          apiKeyInputRefs.current[provider.id] = element;
                        }}
                        type="password"
                        value={apiKeyInputs[provider.id]}
                        name={`${provider.id}-api-key`}
                        autoComplete="off"
                        onChange={(e) => setApiKeyInputValue(provider.id, e.target.value)}
                        onInput={(e) =>
                          setApiKeyInputValue(provider.id, e.currentTarget.value)
                        }
                        placeholder={provider.placeholder}
                        className="mt-3"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void saveApiKeys()}
                  disabled={apiKeysSaving || !hasPendingApiKeyChanges}
                >
                  {apiKeysSaving
                    ? translate("profile.saving", "Saving...")
                    : translate("profile.apiKeys.save", "Save API keys")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setApiKeyInputs({
                      groq: "",
                      openai: "",
                      google: "",
                      deepl: "",
                    })
                  }
                  disabled={apiKeysSaving}
                >
                  {translate("profile.cancel", "Cancel")}
                </Button>
                {apiKeysLoading ? (
                  <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {translate("profile.loading", "Loading...")}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                {translate(
                  "profile.apiKeys.maskedHint",
                  "Saved keys are hidden here and only shown as a short masked preview."
                )}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow border border-gray-100 dark:border-gray-700 space-y-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                    <Languages className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {t("profile.language")}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {language === "en" ? "English" : "ភាសាខ្មែរ"}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLanguage(language === "en" ? "km" : "en")}
                  className="w-full sm:w-auto"
                >
                  <Globe className="w-4 h-4 mr-2" /> {translate("profile.switch", "Switch")}
                </Button>

                <div className="h-px bg-gray-100"></div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {t("profile.theme")}
                    </h3>
                    <p className="text-sm text-gray-500 capitalize">{theme}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={toggleTheme} className="w-full sm:w-auto">
                  {theme === "light" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow border border-gray-100 dark:border-gray-700 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-red-600">{translate("profile.deleteAccount", "Delete account")}</div>
                    <p className="text-sm text-gray-500">
                      {translate("profile.deleteWarnBody", "This will disable your account and sign you out.")}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setDeleteText("");
                      setDeleteCurrentPassword("");
                      setDeleteCode("");
                      setDeleteRequiresPassword(true);
                      setDeleteError(null);
                      setDeleteMessage(null);
                      setDeleteOpen(true);
                    }}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {translate("profile.deleteAccount", "Delete account")}
                  </Button>
                </div>

                {deleteOpen && (
                  <div className="mt-4 border rounded-xl p-4">
                    <div className="font-bold mb-1">{translate("profile.deleteWarnTitle", "Delete account?")}</div>
                    <p className="text-sm text-gray-500 mb-3">{translate("profile.deleteWarnBody", "This will disable your account and sign you out.")}</p>
                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Only a trusted device that is at least 30 days old can remove devices or delete this account. Account deletion always requires a 6-digit email verification code. Password accounts also require the current password.
                    </div>
                    {currentManagedDevice ? (
                      <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                        This device first signed in: {formatDateTime(currentManagedDevice.firstSeenAt)}.
                        Trusted until: {currentManagedDevice.trustedUntil ? formatDateTime(currentManagedDevice.trustedUntil) : "Not trusted"}.
                      </div>
                    ) : null}
                    {deleteMessage ? (
                      <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        {deleteMessage}
                      </div>
                    ) : null}
                    {deleteError ? (
                      <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {deleteError}
                      </div>
                    ) : null}

                    <Input
                      placeholder={translate("profile.confirmDelete", "Type DELETE to confirm")}
                      value={deleteText}
                      onChange={(e) => setDeleteText(e.target.value)}
                    />
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {deleteRequiresPassword ? (
                        <Input
                          type="password"
                          placeholder="Current password"
                          value={deleteCurrentPassword}
                          onChange={(e) => setDeleteCurrentPassword(e.target.value)}
                        />
                      ) : (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                          This account signs in with Google, so password confirmation is not required.
                        </div>
                      )}
                      <Input
                        value={deleteCode}
                        onChange={(e) => setDeleteCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder={translate("profile.enterCode", "Enter 6-digit code")}
                      />
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void sendDeleteAccountCode()}
                        disabled={deleteSendingCode || deleteLoading}
                        className="w-full sm:w-auto"
                      >
                        {deleteSendingCode ? "Sending..." : translate("profile.sendCode", "Send code")}
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={
                          deleteText !== "DELETE" ||
                          (deleteRequiresPassword && deleteCurrentPassword.trim().length === 0) ||
                          deleteCode.trim().length !== 6 ||
                          deleteLoading
                        }
                        onClick={() => void confirmDeleteAccount()}
                        className="w-full sm:w-auto"
                      >
                        {deleteLoading ? translate("profile.saving", "Saving...") : translate("profile.confirm", "Confirm")}
                      </Button>
                      <Button variant="outline" onClick={() => setDeleteOpen(false)} className="w-full sm:w-auto">
                        {translate("profile.close", "Close")}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {translate("profile.manageDevices", "Manage devices")}
                      </div>
                      <p className="text-sm text-gray-500">
                        {translate(
                          "profile.manageDevicesDesc",
                          "Logout another device only from a trusted device that is at least 30 days old, then verify with your email code and password."
                        )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={fetchLoginDevices}
                      disabled={devicesLoading}
                    >
                      {devicesLoading
                        ? (translate("profile.loading", "Loading..."))
                        : (translate("profile.refresh", "Refresh"))}
                    </Button>
                  </div>

                  {!!deviceActionMessage && (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {deviceActionMessage}
                    </div>
                  )}
                  {!!devicesError && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {devicesError}
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    {devicesLoading ? (
                      <div className="text-sm text-gray-500">{translate("profile.loading", "Loading...")}</div>
                    ) : loginDevices.length === 0 ? (
                      <div className="text-sm text-gray-500">
                        {translate("profile.noDevices", "No active login devices.")}
                      </div>
                    ) : (
                      loginDevices.map((device) => {
                        const isCurrent = currentLoginDeviceId === device.deviceId;
                        const isOtpTarget = otpTargetDeviceId === device.deviceId;
                        return (
                          <div
                            key={device.deviceId}
                            className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                  <Smartphone className="h-4 w-4 text-gray-500" />
                                  <span className="min-w-0 break-words">{device.deviceName || "Unknown device"}</span>
                                  {isCurrent ? (
                                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                      {translate("profile.currentDevice", "Current")}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  ID: <span className="break-all font-mono">{device.deviceId}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {translate("profile.lastSeen", "Last seen")}: {formatDateTime(device.lastSeenAt)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Trusted until: {device.trustedUntil ? formatDateTime(device.trustedUntil) : "Not trusted"}
                                </div>
                                {isCurrent && device.deviceActionLockedUntil ? (
                                  <div className="text-xs text-amber-600">
                                    Removal changes locked until: {formatDateTime(device.deviceActionLockedUntil)}
                                  </div>
                                ) : null}
                              </div>

                              {!isCurrent ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void sendLogoutCode(device.deviceId)}
                                  disabled={sendingOtp || removingDevice}
                                  className="w-full sm:w-auto"
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  {translate("profile.sendCode", "Send code")}
                                </Button>
                              ) : null}
                            </div>

                            {!isCurrent && isOtpTarget ? (
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <Input
                                  value={otpCode}
                                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                  placeholder={translate("profile.enterCode", "Enter 6-digit code")}
                                  className="w-full"
                                />
                                <Input
                                  type="password"
                                  value={deviceCurrentPassword}
                                  onChange={(e) => setDeviceCurrentPassword(e.target.value)}
                                  placeholder="Re-enter password"
                                  className="w-full"
                                />
                                <div className="text-xs text-gray-500 sm:col-span-2">
                                  Removing another trusted device requires your email code and password again.
                                </div>
                                <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => void confirmLogoutOtherDevice(device.deviceId)}
                                    disabled={
                                      removingDevice ||
                                      otpCode.trim().length !== 6 ||
                                      deviceCurrentPassword.trim().length === 0
                                    }
                                    className="w-full sm:w-auto"
                                  >
                                    {removingDevice
                                      ? translate("profile.saving", "Saving...")
                                      : translate("profile.logoutDevice", "Logout device")}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setOtpTargetDeviceId(null);
                                      setOtpCode("");
                                      setDeviceCurrentPassword("");
                                    }}
                                    className="w-full sm:w-auto"
                                  >
                                    {translate("profile.cancel", "Cancel")}
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
