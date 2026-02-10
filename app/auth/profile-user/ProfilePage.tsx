"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";

interface ProfilePageProps {
  onNavigate: (page: string) => void;
  onOpenProductDetail?: (slug: string) => void;
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

export function ProfilePage({ onNavigate, onOpenProductDetail }: ProfilePageProps) {
  const { user, logout, updateProfile, deleteAccount } = useAuth();
  const { language, setLanguage, t } = useLanguage(); // ✅ must have t()
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const [editForm, setEditForm] = useState({
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
          .map((item: any) => {
            const name = item?.name?.common ?? "";
            const cca2 = String(item?.cca2 ?? "").toUpperCase();
            const flag = item?.flags?.png || item?.flags?.svg || "";
            const root = item?.idd?.root ?? "";
            const suffixes: string[] = Array.isArray(item?.idd?.suffixes)
              ? item.idd.suffixes
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
    return full || user.username || user.email || "";
  }, [user]);

  useEffect(() => {
    if (!user?.phone || countries.length === 0) return;
    const match = findCountryFromPhone(user.phone);
    if (!match) return;
    setSelectedCountry(match.country);
    saveCountryToStorage(match.country);
    const number = user.phone.replace(/[^\d+]/g, "").slice(match.dial.length);
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

  // const enrolledCourses = courses.slice(0, 3);

  const handleLogout = async () => {
    await logout();
    onNavigate("home");
  };

  const startEditing = () => {
    if (!user) return;
    const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    const match = user.phone ? findCountryFromPhone(user.phone) : null;
    if (match) {
      setSelectedCountry(match.country);
      saveCountryToStorage(match.country);
    }
    const phoneNumber = match
      ? user.phone.replace(/[^\d+]/g, "").slice(match.dial.length)
      : user.phone || "";
    setEditForm({
      name: full || user.username || "",
      bio: user.bio || "",
      phone: phoneNumber,
      location: match?.country.name || user.place || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => setIsEditing(false);

  const handleSaveProfile = async () => {
    if (!user) return;

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

    await updateProfile({
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      bio: editForm.bio || undefined,
      phone: phoneValue || undefined,
      place: placeValue,
    });

    setIsEditing(false);
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
    (item: PurchaseItem) => String(item.categoryName || "").toLowerCase() === "tools",
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
  if (!user) return null;
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="relative">
              <img
                src={user.avatarUrl || "/Job Jik.jpg"}
                alt={displayName}
                className="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover"
              />

              <button
                onClick={() => setAvatarOpen((v) => !v)}
                className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white"
                type="button"
              >
                <Camera className="w-5 h-5" />
              </button>

              {avatarOpen && (
                <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-3 w-64 z-50">
                  <div className="text-sm font-semibold mb-2">
                    {t("profile.chooseAvatar")}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {AVATARS.map((src) => (
                      <button
                        key={src}
                        onClick={async () => {
                          await updateProfile({ avatarUrl: src });
                          setAvatarOpen(false);
                        }}
                        className="rounded-lg overflow-hidden border"
                        type="button"
                      >
                        <img src={src} className="w-full h-24 object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-white">{displayName}</h1>
              <p className="text-blue-100">{user.email}</p>

              <div className="flex gap-4 mt-2 justify-center md:justify-start">
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
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-white text-white"
                onClick={() => setActiveTab("settings")}
              >
                <Settings className="w-4 h-4 mr-2" /> {t("profile.settings")}
              </Button>
              <Button
                variant="outline"
                className="border-white text-white"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" /> {t("profile.logout")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 flex items-center gap-2 border-b-2 ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500"
                }`}
                type="button"
              >
                <Icon className="w-5 h-5" /> {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "overview" && (
          <div className="space-y-6">
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

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {statsCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.key}
                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${card.accent}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{card.label}</span>
                    </div>
                    <div className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{card.value}</div>
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
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-4 flex items-center justify-between gap-4">
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
                  >
                    <Loader2 className={`h-4 w-4 ${statsLoading ? "animate-spin" : ""}`} />
                    {translate("profile.refresh", "Refresh")}
                  </Button>
                </div>

                <div className="space-y-4">
                  {ORDER_STATUS_ORDER.map((status) => (
                    <div
                      key={status}
                      className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm dark:border-gray-800"
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

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-4 flex items-center justify-between gap-3">
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
                        className="flex w-full items-center gap-4 rounded-xl border border-gray-100 px-3 py-3 text-left transition hover:border-blue-300 dark:border-gray-800"
                      >
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
                        <div className="text-right text-sm text-gray-700 dark:text-gray-300">
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
                {productPurchases.map((item) => (
                  <div
                    key={`${item.orderNumber}-${item.productId}`}
                    className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center"
                  >
                    <div className="flex flex-1 items-center gap-4">
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

                    <div className="text-right">
                      <div className="text-lg font-semibold text-blue-600 dark:text-blue-300">
                        {formatCurrency((item.unitPrice ?? 0) * (item.quantity ?? 0))}
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(item.unitPrice ?? 0)} / {translate("profile.quantity", "Quantity")}
                      </p>
                    </div>

                    <div className="flex w-full justify-end gap-2 md:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToProduct(item.slug)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        {translate("profile.viewProduct", "View product")}
                      </Button>
                    </div>
                  </div>
                ))}
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
                {toolPurchases.map((item) => (
                  <div
                    key={`${item.orderNumber}-${item.productId}`}
                    className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center"
                  >
                    <div className="flex flex-1 items-center gap-4">
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

                    <div className="text-right">
                      <div className="text-lg font-semibold text-blue-600 dark:text-blue-300">
                        {formatCurrency((item.unitPrice ?? 0) * (item.quantity ?? 0))}
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(item.unitPrice ?? 0)} / {translate("profile.quantity", "Quantity")}
                      </p>
                    </div>

                    <div className="flex w-full justify-end gap-2 md:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToProduct(item.slug)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        {translate("profile.viewProduct", "View product")}
                      </Button>
                    </div>
                  </div>
                ))}
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
              {translate("profile.totalItems", "Items purchased")}: {formatNumber(videoCourses.length)}
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
                  onClick={() => setMyCourseTab(tab.id as "subscribe" | "lifetime" | "favorite")}
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
                {subscribedCourses.map((course) => {
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
                {freeCourses.map((course) => {
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
                {videoCourses.map((course) => (
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
                {favoriteCourses.map((course) => (
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
              </div>
            ))}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {t("profile.about")}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {t("profile.aboutSubtitle") || "Keep your personal information up to date."}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => (isEditing ? cancelEditing() : startEditing())}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  {isEditing ? t("profile.cancel") : t("profile.edit")}
                </Button>
              </div>

              {isEditing ? (
                <div className="mt-4 space-y-4">
                  <Input
                    placeholder={t("profile.fullName")}
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  <Input
                    placeholder={t("profile.bioPlaceholder")}
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  />
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
                            {selectedCountry?.dial || t("profile.country")}
                          </span>
                          <span className="text-xs text-gray-500">
                            {selectedCountry?.name || t("profile.selectCountry")}
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
                              placeholder={t("profile.searchCountry")}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            />
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {filteredCountries.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-gray-500">
                                {t("profile.noCountry")}
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
                      placeholder={t("profile.phoneNumber")}
                      value={editForm.phone}
                      onChange={(e) => handlePhoneInput(e.target.value)}
                    />
                  </div>
                  <Input
                    placeholder={t("profile.location")}
                    value={selectedCountry?.name || editForm.location}
                    disabled
                  />
                  <Button onClick={handleSaveProfile} className="w-full">
                    {t("profile.saveChanges")}
                  </Button>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <p>{user.bio || t("profile.passionate")}</p>
                  <p>{user.phone || t("profile.phone")}</p>
                  <p>{user.place || t("profile.location")}</p>
                </div>
              )}
            </div>

            {/* SECURITY / CHANGE PASSWORD */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-emerald-100 text-emerald-600">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {t("profile.security") || "Security"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {t("profile.securityDesc") || "Manage password and account protection."}
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
                >
                  {pwOpen
                    ? (t("profile.close") || "Close")
                    : (t("profile.changePassword") || "Change Password")}
                </Button>
              </div>

              {!!pwError && <div className="mt-3 text-sm text-red-600">{pwError}</div>}
              {!!pwSuccess && <div className="mt-3 text-sm text-green-600">{pwSuccess}</div>}

              {pwOpen && (
                <div className="mt-4 space-y-3">
                  {[
                    {
                      key: "current",
                      label: t("profile.currentPassword") || "Current password",
                      value: pwForm.currentPassword,
                    },
                    {
                      key: "next",
                      label: t("profile.newPassword") || "New password",
                      value: pwForm.newPassword,
                    },
                    {
                      key: "confirm",
                      label: t("profile.confirmNewPassword") || "Confirm new password",
                      value: pwForm.confirmPassword,
                    },
                  ].map((field) => (
                    <div className="relative" key={field.key}>
                      <Input
                        type={showPw[field.key as keyof typeof showPw] ? "text" : "password"}
                        placeholder={field.label}
                        value={field.value}
                        onChange={(e) =>
                          setPwForm({ ...pwForm, [`${field.key}Password`]: e.target.value } as any)
                        }
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

                  <div className="flex gap-2">
                    <Button
                      onClick={handleChangePassword}
                      disabled={pwLoading}
                      type="button"
                    >
                      {pwLoading
                        ? (t("profile.saving") || "Saving...")
                        : (t("profile.savePassword") || "Save Password")}
                    </Button>

                    <Button
                      variant="outline"
                      type="button"
                      onClick={resetPwUI}
                    >
                      {t("profile.cancel") || "Cancel"}
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500">
                    {t("profile.passwordTip") ||
                      "Tip: use 8+ characters with numbers and symbols."}
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-700 space-y-4">
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
                >
                  <Globe className="w-4 h-4 mr-2" /> {t("profile.switch")}
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
                <Button size="sm" variant="outline" onClick={toggleTheme}>
                  {theme === "light" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-red-600">{t("profile.deleteAccount")}</div>
                    <p className="text-sm text-gray-500">
                      {t("profile.deleteWarnBody")}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setDeleteText("");
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("profile.deleteAccount")}
                  </Button>
                </div>

                {deleteOpen && (
                  <div className="mt-4 border rounded-xl p-4">
                    <div className="font-bold mb-1">{t("profile.deleteWarnTitle")}</div>
                    <p className="text-sm text-gray-500 mb-3">{t("profile.deleteWarnBody")}</p>

                    <Input
                      placeholder={t("profile.confirmDelete")}
                      value={deleteText}
                      onChange={(e) => setDeleteText(e.target.value)}
                    />

                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="destructive"
                        disabled={deleteText !== "DELETE"}
                        onClick={async () => {
                          await deleteAccount();
                          await logout();
                          onNavigate("home");
                        }}
                      >
                        {t("profile.confirm")}
                      </Button>
                      <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                        {t("profile.close")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
