"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef, type RefObject } from "react";
import { translationOverrides } from "../lib/translation-overrides";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", shortLabel: "EN", flagCode: "us" },
  { code: "km", label: "Khmer", shortLabel: "KM", flagCode: "kh" },
  { code: "zh", label: "Chinese", shortLabel: "ZH", flagCode: "cn" },
  { code: "ja", label: "Japanese", shortLabel: "JA", flagCode: "jp" },
  { code: "ko", label: "Korean", shortLabel: "KO", flagCode: "kr" },
  { code: "vi", label: "Vietnamese", shortLabel: "VI", flagCode: "vn" },
  { code: "fr", label: "French", shortLabel: "FR", flagCode: "fr" },
  { code: "de", label: "German", shortLabel: "DE", flagCode: "de" },
  { code: "es", label: "Spanish", shortLabel: "ES", flagCode: "es" },
  { code: "ru", label: "Russian", shortLabel: "RU", flagCode: "ru" },
  { code: "ar", label: "Arabic", shortLabel: "AR", flagCode: "sa" },
  { code: "hi", label: "Hindi", shortLabel: "HI", flagCode: "in" },
  { code: "tl", label: "Filipino / Tagalog", shortLabel: "TL", flagCode: "ph" },
  { code: "sv", label: "Swedish", shortLabel: "SV", flagCode: "se" },
  { code: "th", label: "Thai", shortLabel: "TH", flagCode: "th" },
  { code: "id", label: "Indonesian", shortLabel: "ID", flagCode: "id" },
  { code: "ms", label: "Malay", shortLabel: "MS", flagCode: "my" },
  { code: "pt", label: "Portuguese", shortLabel: "PT", flagCode: "pt" },
  { code: "it", label: "Italian", shortLabel: "IT", flagCode: "it" },
  { code: "nl", label: "Dutch", shortLabel: "NL", flagCode: "nl" },
  { code: "tr", label: "Turkish", shortLabel: "TR", flagCode: "tr" },
  { code: "pl", label: "Polish", shortLabel: "PL", flagCode: "pl" },
  { code: "uk", label: "Ukrainian", shortLabel: "UK", flagCode: "ua" },
] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number]["code"];
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const SUPPORTED_LANGUAGE_CODES = new Set<string>(SUPPORTED_LANGUAGES.map((item) => item.code));
const DEFAULT_LANGUAGE: Language = "km";
const DEFAULT_LANGUAGE_VERSION = "khmer-default-v1";

export function getLanguageFlagUrl(language: Pick<SupportedLanguage, "flagCode">) {
  return `https://flagcdn.com/w40/${language.flagCode}.png`;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  languages: typeof SUPPORTED_LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/* ================= PROVIDER ================= */
export function LanguageProvider({ children }: { children: ReactNode }) {
  // ✅ SAFE DEFAULT (SSR)
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [mounted, setMounted] = useState(false);
  const translateScopeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ READ localStorage AFTER MOUNT
  useEffect(() => {
    const saved = localStorage.getItem("edugroit-language");
    const defaultVersion = localStorage.getItem("edugroit-language-default-version");
    if (!defaultVersion) {
      localStorage.setItem("edugroit-language-default-version", DEFAULT_LANGUAGE_VERSION);
      if (!saved || saved === "en") {
        if (language !== DEFAULT_LANGUAGE) setLanguage(DEFAULT_LANGUAGE);
        return;
      }
    }
    if (saved && SUPPORTED_LANGUAGE_CODES.has(saved) && saved !== language) {
      setLanguage(saved as Language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ SAVE language
  useEffect(() => {
    localStorage.setItem("edugroit-language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);


  const t = (key: string, values?: Record<string, string | number>): string => {
    const overrideMap = translationOverrides as Partial<Record<Language, Record<string, string>>>;
    const translationMap = translations as Partial<Record<Language, Record<string, string>>>;
    const template =
      overrideMap[language]?.[key] ??
      translationMap[language]?.[key] ??
      overrideMap.en?.[key] ??
      translationMap.en?.[key] ??
      key;

    if (!values) {
      return template;
    }

    return Object.entries(values).reduce(
      (message, [token, value]) => message.split(`{${token}}`).join(String(value)),
      template
    );
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: SUPPORTED_LANGUAGES }}>
      <div key={language} ref={translateScopeRef} className="contents" data-auto-translate-scope>
        {children}
      </div>
      {mounted ? <AutoTranslatePage language={language} rootRef={translateScopeRef} /> : null}
    </LanguageContext.Provider>
  );
}

const SKIP_AUTO_TRANSLATE_SELECTOR =
  [
    "[data-no-auto-translate]",
    "[translate='no']",
    "script",
    "style",
    "noscript",
    "code",
    "pre",
    "svg",
    "canvas",
    "iframe",
  ].join(", ");
const TRANSLATABLE_ATTRIBUTES = ["placeholder", "title", "aria-label", "alt"] as const;

type TranslateApply = (translated: string) => void;
type DomUpdate = () => void;

const MAX_TRANSLATE_BATCH_SIZE = 64;
const DOM_UPDATE_BATCH_SIZE = 20;
const SCAN_TEXT_NODE_BATCH_SIZE = 180;
const SCAN_ELEMENT_BATCH_SIZE = 120;
const INITIAL_SCAN_DELAY_MS = 120;
const RESCAN_DELAY_MS = 120;

function normalizeAutoTranslateText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function shouldAutoTranslate(value: string) {
  const text = normalizeAutoTranslateText(value);
  if (text.length < 2 || text.length > 1200) return false;
  if (/^[\d\s$€£¥៛.,:;%()+\-/#|]+$/.test(text)) return false;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(text)) return false;
  return /[\p{L}\p{Script=Khmer}\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Arabic}\p{Script=Devanagari}]/u.test(
    text
  );
}

function applyTranslatedTextLikeOriginal(originalWithSpacing: string, translated: string) {
  const leading = originalWithSpacing.match(/^\s*/)?.[0] ?? "";
  const trailing = originalWithSpacing.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function AutoTranslatePage({
  language,
  rootRef,
}: {
  language: Language;
  rootRef: RefObject<HTMLElement | null>;
}) {
  const textOriginalsRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const cacheRef = useRef<Map<string, string>>(new Map());
  const pendingRef = useRef<Map<string, Set<TranslateApply>>>(new Map());
  const flushTimerRef = useRef<number | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const languageRef = useRef(language);
  const applyingRef = useRef(false);
  const flushInFlightRef = useRef(false);
  const requestVersionRef = useRef(0);
  const scanRunIdRef = useRef(0);
  const translatedTextRef = useRef<WeakMap<Text, { language: Language; value: string }>>(
    new WeakMap()
  );

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    const effectVersion = requestVersionRef.current + 1;
    requestVersionRef.current = effectVersion;
    applyingRef.current = false;
    const pendingMap = pendingRef.current;
    let disposed = false;

    const isCurrentRequest = (targetLanguage: Language) =>
      !disposed &&
      requestVersionRef.current === effectVersion &&
      languageRef.current === targetLanguage;

    const getRoot = () => rootRef.current ?? document.body;

    const applyDomUpdates = (targetLanguage: Language, updates: DomUpdate[]) => {
      if (!updates.length || !isCurrentRequest(targetLanguage)) return;

      applyingRef.current = true;
      let index = 0;

      const runBatch = () => {
        if (!isCurrentRequest(targetLanguage)) {
          applyingRef.current = false;
          return;
        }

        const end = Math.min(index + DOM_UPDATE_BATCH_SIZE, updates.length);
        for (; index < end; index += 1) {
          updates[index]();
        }

        if (index < updates.length) {
          window.requestAnimationFrame(runBatch);
          return;
        }

        window.setTimeout(() => {
          if (isCurrentRequest(targetLanguage)) {
            applyingRef.current = false;
          }
        }, 0);
      };

      window.requestAnimationFrame(runBatch);
    };

    const scheduleFlush = () => {
      if (flushTimerRef.current || flushInFlightRef.current) return;
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null;
        void flushPendingTranslations();
      }, 180);
    };

    const flushPendingTranslations = async () => {
      if (flushInFlightRef.current) return;
      flushInFlightRef.current = true;
      const targetLanguage = languageRef.current;

      try {
        const allPending = Array.from(pendingRef.current.entries());
        pendingRef.current.clear();
        if (!allPending.length || targetLanguage === "en") return;

        const pending = allPending.slice(0, MAX_TRANSLATE_BATCH_SIZE);
        const overflow = allPending.slice(MAX_TRANSLATE_BATCH_SIZE);
        overflow.forEach(([text, applies]) => {
          const existing = pendingRef.current.get(text) ?? new Set<TranslateApply>();
          applies.forEach((apply) => existing.add(apply));
          pendingRef.current.set(text, existing);
        });

        const sourceTexts = pending.map(([text]) => text);
        try {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              q: sourceTexts,
              source: "auto",
              target: targetLanguage,
            }),
          });
          if (!res.ok) throw new Error("Translation request failed");
          const data = await res.json();
          const returnedOriginalText =
            typeof data?.warning === "string" && data.warning.includes("returned original text");
          const translatedItems = Array.isArray(data?.translatedText)
            ? data.translatedText
            : [data?.translatedText];

          if (!isCurrentRequest(targetLanguage)) return;

          const updates: DomUpdate[] = [];
          sourceTexts.forEach((sourceText, index) => {
            const translated = String(translatedItems[index] ?? sourceText);
            if (!returnedOriginalText) {
              cacheRef.current.set(`${targetLanguage}\u0000${sourceText}`, translated);
            }
            pending[index][1].forEach((apply) => updates.push(() => apply(translated)));
          });
          applyDomUpdates(targetLanguage, updates);
        } catch {
          if (!isCurrentRequest(targetLanguage)) return;
          const updates: DomUpdate[] = [];
          pending.forEach(([sourceText, applies]) => {
            applies.forEach((apply) => updates.push(() => apply(sourceText)));
          });
          applyDomUpdates(targetLanguage, updates);
        }
      } finally {
        flushInFlightRef.current = false;
        if (!disposed && pendingRef.current.size > 0) {
          scheduleFlush();
        }
      }
    };

    const enqueueTranslation = (original: string, apply: TranslateApply) => {
      const normalized = normalizeAutoTranslateText(original);
      if (!shouldAutoTranslate(normalized)) return;

      const cacheKey = `${languageRef.current}\u0000${normalized}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        apply(cached);
        return;
      }

      const applies = pendingRef.current.get(normalized) ?? new Set<TranslateApply>();
      applies.add(apply);
      pendingRef.current.set(normalized, applies);

      scheduleFlush();
    };

    const translateTextNode = (node: Text) => {
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP_AUTO_TRANSLATE_SELECTOR)) return;
      const currentText = node.textContent ?? "";
      const lastTranslated = translatedTextRef.current.get(node);
      if (lastTranslated?.language === languageRef.current && lastTranslated.value === currentText) {
        return;
      }

      const savedOriginal = textOriginalsRef.current.get(node);
      const original =
        savedOriginal !== undefined && lastTranslated?.value === currentText
          ? savedOriginal
          : currentText;
      textOriginalsRef.current.set(node, original);
      if (!shouldAutoTranslate(original)) return;

      enqueueTranslation(original, (translated) => {
        if (!node.parentElement) return;
        const nextText = applyTranslatedTextLikeOriginal(original, translated);
        translatedTextRef.current.set(node, {
          language: languageRef.current,
          value: nextText,
        });
        if (node.textContent !== nextText) {
          node.textContent = nextText;
        }
      });
    };

    const isActiveScan = (targetLanguage: Language, scanRunId: number) =>
      scanRunIdRef.current === scanRunId && isCurrentRequest(targetLanguage);

    const translateAttributes = (root: ParentNode, targetLanguage: Language, scanRunId: number) => {
      const elements =
        root instanceof Element
          ? [root, ...Array.from(root.querySelectorAll("*"))]
          : Array.from(root.querySelectorAll("*"));

      let index = 0;

      const runBatch = () => {
        if (!isActiveScan(targetLanguage, scanRunId)) return;

        const end = Math.min(index + SCAN_ELEMENT_BATCH_SIZE, elements.length);
        for (; index < end; index += 1) {
          const element = elements[index];
          if (!(element instanceof HTMLElement)) continue;
          if (element.closest(SKIP_AUTO_TRANSLATE_SELECTOR)) continue;

          TRANSLATABLE_ATTRIBUTES.forEach((attributeName) => {
            const value = element.getAttribute(attributeName);
            if (!value || !shouldAutoTranslate(value)) return;

            const originalKey = `autoTranslateOriginal${attributeName
              .split("-")
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join("")}`;
            const original = element.dataset[originalKey] ?? value;
            element.dataset[originalKey] = original;

            enqueueTranslation(original, (translated) => {
              if (!element.isConnected) return;
              const nextValue = applyTranslatedTextLikeOriginal(original, translated);
              if (element.getAttribute(attributeName) !== nextValue) {
                element.setAttribute(attributeName, nextValue);
              }
            });
          });
        }

        if (index < elements.length) {
          window.requestAnimationFrame(runBatch);
        }
      };

      window.requestAnimationFrame(runBatch);
    };

    const scan = (root: ParentNode = document.body) => {
      if (!root) return;
      const targetLanguage = languageRef.current;
      const scanRunId = scanRunIdRef.current + 1;
      scanRunIdRef.current = scanRunId;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const textNode = node as Text;
          const parent = textNode.parentElement;
          if (!parent || parent.closest(SKIP_AUTO_TRANSLATE_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }
          return shouldAutoTranslate(textNode.textContent ?? "")
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        },
      });

      const runTextBatch = () => {
        if (!isActiveScan(targetLanguage, scanRunId)) return;

        let processed = 0;
        while (processed < SCAN_TEXT_NODE_BATCH_SIZE && walker.nextNode()) {
          translateTextNode(walker.currentNode as Text);
          processed += 1;
        }

        if (processed === SCAN_TEXT_NODE_BATCH_SIZE) {
          window.requestAnimationFrame(runTextBatch);
          return;
        }

        translateAttributes(root, targetLanguage, scanRunId);
      };

      window.requestAnimationFrame(runTextBatch);
    };

    const restoreTextNode = (node: Text) => {
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP_AUTO_TRANSLATE_SELECTOR)) return;
      const original = textOriginalsRef.current.get(node);
      if (original !== undefined && node.textContent !== original) {
        node.textContent = original;
      }
    };

    const restoreAttributes = (root: ParentNode) => {
      const elements =
        root instanceof Element
          ? [root, ...Array.from(root.querySelectorAll("*"))]
          : Array.from(root.querySelectorAll("*"));

      elements.forEach((element) => {
        if (!(element instanceof HTMLElement)) return;
        if (element.closest(SKIP_AUTO_TRANSLATE_SELECTOR)) return;

        TRANSLATABLE_ATTRIBUTES.forEach((attributeName) => {
          const originalKey = `autoTranslateOriginal${attributeName
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join("")}`;
          const original = element.dataset[originalKey];
          if (original !== undefined && element.getAttribute(attributeName) !== original) {
            element.setAttribute(attributeName, original);
          }
        });
      });
    };

    const restore = (root: ParentNode = document.body) => {
      if (!root) return;
      applyingRef.current = true;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const textNode = node as Text;
          const parent = textNode.parentElement;
          if (!parent || parent.closest(SKIP_AUTO_TRANSLATE_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }
          return textOriginalsRef.current.get(textNode) !== undefined
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        },
      });

      const textNodes: Text[] = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
      textNodes.forEach(restoreTextNode);
      restoreAttributes(root);

      window.setTimeout(() => {
        if (isCurrentRequest("en")) {
          applyingRef.current = false;
        }
      }, 0);
    };

    const scheduleScan = (root: ParentNode = document.body, delay = RESCAN_DELAY_MS) => {
      if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = window.setTimeout(() => {
        scanTimerRef.current = null;
        scan(root);
      }, delay);
    };

    if (language === "en") {
      pendingRef.current.clear();
      flushInFlightRef.current = false;
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (scanTimerRef.current) {
        window.clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      restore(getRoot());
      return () => {
        disposed = true;
        requestVersionRef.current += 1;
        scanRunIdRef.current += 1;
        applyingRef.current = false;
        flushInFlightRef.current = false;
        pendingMap.clear();
      };
    }

    scheduleScan(getRoot(), INITIAL_SCAN_DELAY_MS);

    const observer = new MutationObserver((mutations) => {
      if (applyingRef.current) return;
      let shouldRescanRoot = false;
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text);
          return;
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node as Text);
          } else if (node instanceof Element) {
            shouldRescanRoot = true;
          }
        });
      });
      if (shouldRescanRoot) {
        scheduleScan(getRoot());
      }
    });

    observer.observe(getRoot(), {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      disposed = true;
      requestVersionRef.current += 1;
      scanRunIdRef.current += 1;
      applyingRef.current = false;
      flushInFlightRef.current = false;
      observer.disconnect();
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
      if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
      pendingMap.clear();
    };
  }, [language, rootRef]);

  return null;
}

/* ================= HOOK ================= */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}

/* ================= TRANSLATIONS (MUST BE FIRST) ================= */
const translations: Partial<Record<Language, Record<string, string>>> = {
  en: {
    // Header/Navigation
    'nav.home': 'Home',
    'nav.news': 'News',
    'nav.shorts': 'Shorts',
    'nav.all': 'All',
    'nav.courses': 'AI',
    'nav.ai': 'AI',
    'nav.videoCourses': 'Courses',
    'nav.programs': 'Programs',
    'nav.games': 'Games',
    'nav.tools': 'Tools',
    'nav.blog': 'Blog',
    'nav.account': 'Account',
    'nav.about': 'About',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    'nav.search': 'Search for courses...',
    // 'header.becomeSeller': 'Become a seller',
    // 'becomeSeller.title': 'Become a seller',
    // 'becomeSeller.subtitle': 'Apply to sell your courses and products',

    'blog.title': 'Blog',
    'blog.subtitle': 'Latest news and updates',
    'news.categories': 'Categories',
    'news.noCategories': 'No categories yet.',
    'nodata.title': 'No data yet',
    'nodata.subtitle': 'We will update later',
    
    // Hero Section
    'hero.badge': '🎓 #1 Platform for Online Learning',
    'hero.title1': 'Learn New Skills',
    'hero.title2': 'Anytime, Anywhere',
    'hero.description': 'Access 10,000+ courses from world-class instructors. Build your skills with hands-on projects and earn certificates to advance your career.',
    'hero.students': 'Students',
    'hero.learning': 'Learning Today',
    'hero.exploreBtn': 'Explore Courses',
    'hero.watchDemo': 'Watch Demo',
    
    // Stats Section
    'stats.active': 'Active Students',
    'stats.courses': 'Online Courses',
    'stats.instructors': 'Expert Instructors',
    'stats.success': 'Success Rate',
    
    // Featured Courses
    'featured.title': 'Featured Courses',
    'featured.description': 'Explore our most popular courses taught by industry experts',
    'featured.viewAll': 'View All Courses',
    
    // Why Choose Us
    'why.title': 'Why Choose Edugroit?',
    'why.description': 'We provide the best learning experience for students worldwide',
    'why.pace.title': 'Learn at Your Own Pace',
    'why.pace.description': 'Access course materials anytime, anywhere. Learn on your schedule with lifetime access to all course content.',
    'why.certificate.title': 'Industry-Recognized Certificates',
    'why.certificate.description': 'Earn certificates upon completion that you can share with employers and add to your professional profile.',
    'why.expert.title': 'Expert Instructors',
    'why.expert.description': 'Learn from industry professionals with real-world experience who are passionate about teaching.',
    
    // CTA Section
    'cta.title': 'Start Your Learning Journey Today',
    'cta.description': 'Join thousands of students already learning on Edugroit',
    'cta.getStarted': 'Get Started Free',
    'cta.browse': 'Browse Courses',
    
    // Course Cards
    'course.by': 'By',
    'course.bestseller': 'Bestseller',
    'course.new': 'New',
    'course.lessons': 'lessons',
    'course.addToCart': 'Add to Cart',
    'course.from': 'from',
    
    // Course Levels
    'level.beginner': 'Beginner',
    'level.intermediate': 'Intermediate',
    'level.advanced': 'Advanced',
    
    // Footer
    'footer.description': 'Empowering learners worldwide with high-quality online courses. Learn new skills, advance your career, and achieve your goals.',
    'footer.quickLinks': 'Quick Links',
    'footer.aboutUs': 'About Us',
    'footer.allCourses': 'All Courses',
    'footer.becomeInstructor': 'Become an Instructor',
    'footer.partnerships': 'Partnerships',
    'footer.careers': 'Careers',
    'footer.blog': 'Blog',
    'footer.support': 'Support',
    'footer.helpCenter': 'Help Center',
    'footer.faqs': 'FAQs',
    'footer.terms': 'Terms of Service',
    'footer.privacy': 'Privacy Policy',
    'footer.cookies': 'Cookie Policy',
    'footer.accessibility': 'Accessibility',
    'footer.newsletter': 'Newsletter',
    'footer.newsletterDesc': 'Subscribe to get updates on new courses and special offers.',
    'footer.emailPlaceholder': 'Enter your email',
    'footer.subscribe': 'Subscribe',
    'footer.rights': 'All rights reserved.',
    
    // Cart
    'cart.title': 'Shopping Cart',
    'cart.courses': 'course(s) in your cart',
    'cart.empty': 'Your cart is empty',
    'cart.emptyDesc': "Looks like you haven't added any courses yet",
    'cart.browseCourses': 'Browse Courses',
    'cart.continueShopping': 'Continue Shopping',
    'cart.orderSummary': 'Order Summary',
    'cart.couponCode': 'Coupon Code',
    'cart.enterCode': 'Enter code',
    'cart.subtotal': 'Subtotal',
    'cart.tax': 'Tax (10%)',
    'cart.discount': 'Discount',
    'cart.total': 'Total',
    'cart.checkout': 'Proceed to Checkout',
    'cart.guarantee': '30-Day Money-Back Guarantee',
    'cart.lifetime': 'Lifetime Access to Courses',
    'cart.certificate': 'Certificate of Completion',
    
    // Add to Cart Modal
    'modal.addToCart': 'Add to Cart',
    'modal.selectDuration': 'Select Duration',
    'modal.quantity': 'Quantity',
    'modal.total': 'Total',
    'modal.close': 'Close',
    'modal.confirm': 'Confirm',
    'modal.10days': '10 Days',
    'modal.1month': '1 Month',
    'modal.1year': '1 Year',
    'modal.under1month': 'Under 1 Month',
    'modal.under1year': 'Under 1 Year',
    'modal.fullAccess': 'Full Access',
    
    // Login Page
    'login.title': 'Welcome Back!',
    'login.description': 'Sign in to continue your learning journey',
    'login.google': 'Continue with Google',
    'login.facebook': 'Continue with Facebook',
    'login.email': 'Or continue with email',
    'login.emailLabel': 'Email Address',
    'login.emailPlaceholder': 'you@example.com',
    'login.passwordLabel': 'Password',
    'login.passwordPlaceholder': 'Enter your password',
    'login.remember': 'Remember me',
    'login.forgot': 'Forgot password?',
    'login.signin': 'Sign In',
    'login.noAccount': "Don't have an account?",
    'login.signupLink': 'Sign up for free',
    'login.backHome': '← Back to Home',
    'login.loading': 'Signing in...',
    'login.success': 'Signed in successfully',
    'login.errors.required': 'Email and password are required',
    'login.errors.invalid': 'Invalid email or password',
    'login.errors.deleted': 'This account was deleted. Please create a new account.',
    'login.errors.banned': 'This account is banned. Please contact support.',
    'login.errors.bannedUntil': 'This account is banned until',
    
    // Register Page
    'register.title': 'Create Your Account',
    'register.description': 'Start learning today with Edugroit',
    'register.google': 'Sign up with Google',
    'register.facebook': 'Sign up with Facebook',
    'register.email': 'Or sign up with email',
    'register.fullName': 'Full Name',
    'register.namePlaceholder': 'John Doe',
    'register.emailLabel': 'Email Address',
    'register.emailPlaceholder': 'you@example.com',
    'register.passwordLabel': 'Password',
    'register.passwordPlaceholder': 'Create a password',
    'register.confirmPassword': 'Confirm Password',
    'register.confirmPlaceholder': 'Confirm your password',
    'register.agreeTerms': 'I agree to the',
    'register.termsLink': 'Terms of Service',
    'register.and': 'and',
    'register.privacyLink': 'Privacy Policy',
    'register.createAccount': 'Create Account',
    'register.haveAccount': 'Already have an account?',
    'register.signinLink': 'Sign in',
    'register.backHome': '← Back to Home',
    
    // Profile
    'profile.chooseAvatar': 'Choose avatar',
    'profile.joined': 'Member since',
    'profile.settings': 'Settings',
    'profile.logout': 'Log out',
    'profile.overview': 'Overview',
    'profile.myCourses': 'My Courses',
    'profile.myProducts': 'My Products',
    'profile.about': 'About me',
    'profile.aboutSubtitle': 'Keep your personal information up to date.',
    'profile.edit': 'Edit',
    'profile.cancel': 'Cancel',
    'profile.saveChanges': 'Save changes',
    'profile.bioPlaceholder': 'Short bio',
    'profile.fullName': 'Full name',
    'profile.phone': 'Phone',
    'profile.phoneNumber': 'Phone number',
    'profile.location': 'Location',
    'profile.country': 'Country',
    'profile.selectCountry': 'Select country',
    'profile.searchCountry': 'Search country',
    'profile.noCountry': 'No country found',
    'profile.passionate': 'Passionate about learning and technology',
    'profile.language': 'Language',
    'profile.theme': 'Theme',
    'profile.switch': 'Switch',
    'profile.securityDesc': 'Manage password and account protection.',
    'profile.changePassword': 'Change Password',
    'profile.updateFailed': 'Profile update failed. Please try again.',
    'profile.enrolled': 'Enrolled',
    'profile.completed': 'Completed',
    'profile.hours': 'Hours',
    'profile.certificates': 'Certificates',
    'profile.deleteAccount': 'Delete account',
    'profile.deleteWarnTitle': 'Delete account?',
    'profile.deleteWarnBody': 'This will disable your account and sign you out.',
    'profile.confirmDelete': 'Type DELETE to confirm',
    'profile.confirm': 'Confirm',
    'profile.close': 'Close',
    'profile.totalOrders': 'Total orders',
    'profile.totalSpent': 'Total spent',
    'profile.totalItems': 'Items purchased',
    'profile.cartItems': 'Items in cart',
    'profile.statusBreakdown': 'Order status overview',
    'profile.status.pending': 'Pending',
    'profile.status.approved': 'Approved',
    'profile.status.delivering': 'Delivering',
    'profile.status.completed': 'Completed',
    'profile.status.cancelled': 'Cancelled',
    'profile.status.resolution': 'Resolution',
    'profile.recentPurchases': 'Recent purchases',
    'profile.viewAllPurchases': 'View all purchases',
    'profile.purchasesEmpty': "You haven't completed any purchases yet.",
    'profile.viewProduct': 'View detail',
    'profile.orderNumber': 'Order no.',
    'profile.orderedAt': 'Ordered at',
    'profile.quantity': 'Quantity',
    'profile.variant': 'Option',
    'profile.loadingStats': 'Loading your stats...',
    'profile.loadingPurchases': 'Loading your purchases...',
    'profile.retry': 'Retry',
    'profile.refresh': 'Refresh',

    // Courses Page
    'courses.title': 'Explore Our Courses',
    'courses.description': 'Discover courses in web development, design, business, and more',
    'courses.filters': 'Filters',
    'courses.categories': 'Categories',
    'courses.sortBy': 'Sort By',
    'courses.popular': 'Most Popular',
    'courses.rating': 'Highest Rated',
    'courses.priceLow': 'Price: Low to High',
    'courses.priceHigh': 'Price: High to Low',
    'courses.available': 'courses available',
    'courses.clearFilter': 'Clear Filter',
    'courses.noResults': 'No courses found',
    'courses.noResultsDesc': "Try adjusting your filters to find what you're looking for",
    'courses.viewAll': 'View All Courses',
    'courses.newReleases': 'New Releases',
    'courses.latestUploads': 'Latest uploads',
    'courses.popularVideos': 'Popular Videos',
    'courses.mostWatched': 'Most watched',
    'courses.videosAvailable': 'videos available',
    'courses.viewVideo': 'View Video',
    'courses.videoBlogTitle': 'Video Blog',
    'courses.videoBlogSubtitle': 'Find new videos fast',
    'courses.searchVideos': 'Search videos',

    'filters.title': 'Filters',
    'filters.categories': 'Categories',
    'filters.sortBy': 'Sort By',
    'filters.mostPopular': 'Most Popular',
    'filters.highestRated': 'Highest Rated',
    'filters.priceLowHigh': 'Price: Low to High',
    'filters.priceHighLow': 'Price: High to Low',
    'filters.allVideos': 'All Videos',
    'filters.tag': 'Tag',
    'filters.level': 'Level',
    'filters.levelAll': 'All levels',
    'filters.levelBeginner': 'Beginner',
    'filters.levelAdvanced': 'Advanced',
    'filters.levelPro': 'Pro',
    'filters.price': 'Price',
    'filters.priceAll': 'All',
    'filters.priceFree': 'Free',
    'filters.pricePaid': 'Paid',
    'filters.clearAll': 'Clear all filters',
    'filters.slugs': 'Slugs',
    'filters.all': 'All',
    'filters.ai': 'AI',
    'filters.programs': 'Programs',
    'filters.games': 'Games',
    'filters.tools': 'Tools',

    'all.title': 'Explore All Products',
    'all.subtitle': 'Discover courses, programs, games, and tools all in one place',
    'all.allProducts': 'All Products',
    'all.products': 'products',
    'all.available': 'available',
    'all.noResults': 'No results',
    'all.noResultsDesc': 'Try adjusting your filters.',
    'programs.title': 'Professional Programs',
    'programs.subtitle': 'Discover professional software for your career',
    'games.title': 'Games & Entertainment',
    'games.subtitle': 'Discover amazing games for entertainment and fun',
    'tools.title': 'Productivity Tools',
    'tools.subtitle': 'Discover tools to boost productivity and efficiency',
    'search.slug': 'Search slug...',

    'labels.programs': 'programs',
    'labels.games': 'games',
    'labels.tools': 'tools',
    'labels.video': 'Video',
    'labels.students': 'Students',
    'labels.lessons': 'Lessons',
    'labels.free': 'Free',
    'labels.instructor': 'Instructor',

    'common.loading': 'Loading...',
    'common.available': 'available',
    
    // Course Detail
    'detail.createdBy': 'Created by',
    'detail.students': 'students',
    'detail.addToCart': 'Add to Cart',
    'detail.buyNow': 'Buy Now',
    'detail.includes': 'This course includes:',
    'detail.video': 'on-demand video',
    'detail.resources': 'Downloadable resources',
    'detail.access': 'Full lifetime access',
    'detail.certificate': 'Certificate of completion',
    'detail.overview': 'Overview',
    'detail.curriculum': 'Curriculum',
    'detail.reviews': 'Reviews',
    'detail.about': 'About This Course',
    'detail.whatLearn': "What You'll Learn",
    'detail.requirements': 'Requirements',
    'detail.courseCurriculum': 'Course Curriculum',
    'detail.preview': 'Preview',
    'detail.studentReviews': 'Student Reviews',
    'detail.instructor': 'Your Instructor',
    'detail.expertInstructor': 'Expert Instructor',
    'detail.instructorRating': 'Instructor Rating',
  },
  km: {
    // Header/Navigation
    'nav.home': 'ទំព័រដើម',
    'nav.news': 'ព័ត៌មាន',
    'nav.shorts': 'ខ្លី',
    'nav.all': 'ទាំងអស់',
    'nav.courses': 'បញ្ញាសិប្បនិម្មិត',
    'nav.ai': 'បញ្ញាសិប្បនិម្មិត',
    'nav.videoCourses': 'វគ្គសិក្សា',
    'nav.programs': 'កម្មវិធី',
    'nav.games': 'ហ្គេម',
    'nav.tools': 'ឧបករណ៍',
    'nav.blog': 'ប្លុក',
    'nav.account': 'គណនី',
    'nav.about': 'អំពីយើង',
    'nav.login': 'ចូលគណនី',
    'nav.signup': 'ចុះឈ្មោះ',
    'nav.search': 'ស្វែងរកវគ្គសិក្សា...',
    // 'header.becomeSeller': 'ក្លាយជាអ្នកលក់',
    // 'becomeSeller.title': 'ក្លាយជាអ្នកលក់',
    // 'becomeSeller.subtitle': 'ដាក់ពាក្យលក់វគ្គសិក្សា និងផលិតផលរបស់អ្នក',

    'blog.title': 'ប្លុក',
    'blog.subtitle': 'ព័ត៌មានថ្មីៗ និងការអាប់ដេត',
    'news.categories': 'ប្រភេទ',
    'news.noCategories': 'មិនទាន់មានប្រភេទទេ។',
    'nodata.title': 'មិនមានទិន្នន័យទេ',
    'nodata.subtitle': 'យើងនឹងអាប់ដេតនៅពេលក្រោយ',
    
    // Hero Section
    'hero.badge': '🎓 វេទិកាអនឡាញលេខ 1 សម្រាប់ការសិក្សា',
    'hero.title1': 'រៀនជំនាញថ្មី',
    'hero.title2': 'គ្រប់ពេលវេលា គ្រប់ទីកន្លែង',
    'hero.description': 'ចូលប្រើវគ្គសិក្សាជាង 10,000+ ពីគ្រូបង្រៀនដ៏ល្អបំផុត។ បង្កើនជំនាញរបស់អ្នកជាមួយគម្រោងអនុវត្តជាក់ស្តែង និងទទួលបានវិញ្ញាបនប័ត្រដើម្បីបង្កើនអាជីពរបស់អ្នក។',
    'hero.students': 'សិស្ស',
    'hero.learning': 'កំពុងសិក្សា',
    'hero.exploreBtn': 'ស្វែងរកវគ្គសិក្សា',
    'hero.watchDemo': 'មើលការបង្ហាញ',
    
    // Stats Section
    'stats.active': 'សិស្សសកម្ម',
    'stats.courses': 'វគ្គសិក្សាអនឡាញ',
    'stats.instructors': 'គ្រូបង្រៀនជំនាញ',
    'stats.success': 'អត្រាជោគជ័យ',
    
    // Featured Courses
    'featured.title': 'វគ្គសិក្សាពិសេស',
    'featured.description': 'រុករកវគ្គសិក្សាពេញនិយមបំផុតរបស់យើងដែលបង្រៀនដោយអ្នកជំនាញក្នុងឧស្សាហកម្ម',
    'featured.viewAll': 'មើលវគ្គសិក្សាទាំងអស់',
    
    // Why Choose Us
    'why.title': 'ហេតុអ្វីជ្រើសរើស អេឌូហ្គ្រូត?',
    'why.description': 'យើងផ្តល់នូវបទពិសោធន៍សិក្សាល្អបំផុតសម្រាប់សិស្សទូទាំងពិភពលោក',
    'why.pace.title': 'រៀនតាមល្បឿនរបស់អ្នក',
    'why.pace.description': 'ចូលប្រើសម្ភារសិក្សាគ្រប់ពេលវេលា គ្រប់ទីកន្លែង។ រៀនតាមកាលវិភាគរបស់អ្នកជាមួយនឹងការចូលប្រើមួយជីវិតទៅកាន់មាតិកាវគ្គសិក្សាទាំងអស់។',
    'why.certificate.title': 'វិញ្ញាបនប័ត្រទទួលស្គាល់ដោយឧស្សាហកម្ម',
    'why.certificate.description': 'ទទួលបានវិញ្ញាបនប័ត្រនៅពេលបញ្ចប់ ដែលអ្នកអាចចែករំលែកជាមួយនិយោជក និងបន្ថែមទៅកាន់ប្រវត្តិរូបវិជ្ជាជីវៈរបស់អ្នក។',
    'why.expert.title': 'គ្រូបង្រៀនជំនាញ',
    'why.expert.description': 'រៀនពីអ្នកជំនាញឧស្សាហកម្មដែលមានបទពិសោធន៍ពិតប្រាកដ និងមានចិត្តចង់បង្រៀន។',
    
    // CTA Section
    'cta.title': 'ចាប់ផ្តើមការធ្វើដំណើរសិក្សារបស់អ្នកថ្ងៃនេះ',
    'cta.description': 'ចូលរួមជាមួយសិស្សរាប់ពាន់នាក់ដែលកំពុងសិក្សានៅលើ អេឌូហ្គ្រូត',
    'cta.getStarted': 'ចាប់ផ្តើមដោយឥតគិតថ្លៃ',
    'cta.browse': 'រុករកវគ្គសិក្សា',
    
    // Course Cards
    'course.by': 'ដោយ',
    'course.bestseller': 'លក់ដាច់បំផុត',
    'course.new': 'ថ្មី',
    'course.lessons': 'មេរៀន',
    'course.addToCart': 'បន្ថែមទៅកន្ត្រក',
    'course.from': 'ពី',
    
    // Course Levels
    'level.beginner': 'កម្រិតដើម',
    'level.intermediate': 'កម្រិតមធ្យម',
    'level.advanced': 'កម្រិតខ្ពស់',
    
    // Footer
    'footer.description': 'ផ្តល់សិទ្ធិអំណាចដល់អ្នកសិក្សាទូទាំងពិភពលោកជាមួយនឹងវគ្គសិក្សាអនឡាញដែលមានគុណភាពខ្ពស់។ រៀនជំនាញថ្មី បង្កើនអាជីពរបស់អ្នក និងសម្រេចបាននូវគោលដៅរបស់អ្នក។',
    'footer.quickLinks': 'តំណរហ័ស',
    'footer.aboutUs': 'អំពីយើង',
    'footer.allCourses': 'វគ្គសិក្សាទាំងអស់',
    'footer.becomeInstructor': 'ក្លាយជាគ្រូបង្រៀន',
    'footer.partnerships': 'ភាពជាដៃគូ',
    'footer.careers': 'ការងារ',
    'footer.blog': 'ប្លុក',
    'footer.support': 'ជំនួយ',
    'footer.helpCenter': 'មជ្ឈមណ្ឌលជំនួយ',
    'footer.faqs': 'សំណួរញឹកញាប់',
    'footer.terms': 'លក្ខខណ្ឌសេវាកម្ម',
    'footer.privacy': 'គោលការណ៍​ភាព​ឯកជន',
    'footer.cookies': 'គោលការណ៍ខូគី',
    'footer.accessibility': 'ភាពអាចចូលប្រើបាន',
    'footer.newsletter': 'ព័ត៌មានព្រឹត្តិបត្រ',
    'footer.newsletterDesc': 'ជាវដើម្បីទទួលបានការអាប់ដេតអំពីវគ្គសិក្សាថ្មី និងការផ្តល់ជូនពិសេស។',
    'footer.emailPlaceholder': 'បញ្ចូលអ៊ីមែលរបស់អ្នក',
    'footer.subscribe': 'ជាវ',
    'footer.rights': 'រក្សាសិទ្ធិគ្រប់យ៉ាង។',
    
    // Cart
    'cart.title': 'កន្ត្រកទិញទំនិញ',
    'cart.courses': 'វគ្គសិក្សានៅក្នុងកន្ត្រករបស់អ្នក',
    'cart.empty': 'កន្ត្រករបស់អ្នកទទេ',
    'cart.emptyDesc': 'មើលទៅហាក់ដូចជាអ្នកមិនទាន់បន្ថែមវគ្គសិក្សាណាមួយនៅឡើយទេ',
    'cart.browseCourses': 'រុករកវគ្គសិក្សា',
    'cart.continueShopping': 'បន្តទិញទំនិញ',
    'cart.orderSummary': 'សង្ខេបការបញ្ជាទិញ',
    'cart.couponCode': 'លេខកូដកូពុង',
    'cart.enterCode': 'បញ្ចូលលេខកូដ',
    'cart.subtotal': 'សរុបរង',
    'cart.tax': 'ពន្ធ (10%)',
    'cart.discount': 'បញ្ចុះតម្លៃ',
    'cart.total': 'សរុប',
    'cart.checkout': 'បន្តទៅការទូទាត់',
    'cart.guarantee': 'ការធានាសងប្រាក់វិញ 30 ថ្ងៃ',
    'cart.lifetime': 'ចូលប្រើមួយជីវិតទៅកាន់វគ្គសិក្សា',
    'cart.certificate': 'វិញ្ញាបនប័ត្របញ្ចប់',
    
    // Add to Cart Modal
    'modal.addToCart': 'បន្ថែមទៅកន្ត្រក',
    'modal.selectDuration': 'ជ្រើសរើសរយៈពេល',
    'modal.quantity': 'បរិមាណ',
    'modal.total': 'សរុប',
    'modal.close': 'បិទ',
    'modal.confirm': 'បញ្ជាក់',
    'modal.10days': '10 ថ្ងៃ',
    'modal.1month': '1 ខែ',
    'modal.1year': '1 ឆ្នាំ',
    'modal.under1month': 'តិចជាង 1 ខែ',
    'modal.under1year': 'តិចជាង 1 ឆ្នាំ',
    'modal.fullAccess': 'ចូលប្រើពេញលីមួយជីវិត',
    
    // Login Page
    'login.title': 'សូមស្វាគមន៍ការត្រឡប់មកវិញ!',
    'login.description': 'ចូលគណនីដើម្បីបន្តដំណើរសិក្សារបស់អ្នក',
    'login.google': 'បន្តជាមួយ ហ្គូហ្គល',
    'login.facebook': 'បន្តជាមួយ ហ្វេសប៊ុក',
    'login.email': 'ឬបន្តជាមួយអ៊ីមែល',
    'login.emailLabel': 'អាសយដ្ឋានអ៊ីមែល',
    'login.emailPlaceholder': 'បញ្ចូលអ៊ីមែលរបស់អ្នក',
    'login.passwordLabel': 'ពាក្យសម្ងាត់',
    'login.passwordPlaceholder': 'បញ្ចូលពាក្យសម្ងាត់',
    'login.remember': 'ចងចាំខ្ញុំ',
    'login.forgot': 'ភ្លេចពាក្យសម្ងាត់?',
    'login.signin': 'ចូលគណនី',
    'login.noAccount': 'មិនមានគណនី?',
    'login.signupLink': 'ចុះឈ្មោះដោយឥតគិតថ្លៃ',
    'login.backHome': '← ត្រឡប់ទៅទំព័រដើម',
    'login.loading': 'កំពុងចូល...',
    'login.success': 'ចូលគណនីបានជោគជ័យ',
    'login.errors.required': 'សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់',
    'login.errors.invalid': 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ',
    'login.errors.deleted': 'គណនីនេះត្រូវបានលុប។ សូមបង្កើតគណនីថ្មី។',
    'login.errors.banned': 'គណនីនេះត្រូវបានហាមប្រើ។ សូមទាក់ទងអ្នកគាំទ្រ។',
    'login.errors.bannedUntil': 'គណនីនេះត្រូវបានហាមប្រើរហូតដល់',
    
    // Register Page
    'register.title': 'បង្កើតគណនីរបស់អ្នក',
    'register.description': 'ចាប់ផ្តើមសិក្សាថ្ងៃនេះជាមួយ អេឌូហ្គ្រូត',
    'register.google': 'ចុះឈ្មោះជាមួយ ហ្គូហ្គល',
    'register.facebook': 'ចុះឈ្មោះជាមួយ ហ្វេសប៊ុក',
    'register.email': 'ឬចុះឈ្មោះជាមួយអ៊ីមែល',
    'register.fullName': 'ឈ្មោះពេញ',
    'register.namePlaceholder': 'ឈ្មោះរបស់អ្នក',
    'register.emailLabel': 'អាសយដ្ឋានអ៊ីមែល',
    'register.emailPlaceholder': 'បញ្ចូលអ៊ីមែលរបស់អ្នក',
    'register.passwordLabel': 'ពាក្យសម្ងាត់',
    'register.passwordPlaceholder': 'បង្កើតពាក្យសម្ងាត់',
    'register.confirmPassword': 'បញ្ជាក់ពាក្យសម្ងាត់',
    'register.confirmPlaceholder': 'បញ្ជាក់ពាក្យសម្ងាត់របស់អ្នក',
    'register.agreeTerms': 'ខ្ញុំយល់ព្រមនឹង',
    'register.termsLink': 'លក្ខខណ្ឌសេវាកម្ម',
    'register.and': 'និង',
    'register.privacyLink': 'គោលការណ៍ភាពឯកជន',
    'register.createAccount': 'បង្កើតគណនី',
    'register.haveAccount': 'មានគណនីរួចហើយ?',
    'register.signinLink': 'ចូលគណនី',
    'register.backHome': '← ត្រឡប់ទៅទំព័រដើម',
 
    // Profile 
    'profile.chooseAvatar': 'ជ្រើសរូបអវតារ',
    'profile.joined': 'ចូលរួមតាំងពី',
    'profile.settings': 'ការកំណត់',
    'profile.logout': 'ចាកចេញ',
    'profile.overview': 'ទិដ្ឋភាពទូទៅ',
    'profile.myCourses': 'វគ្គសិក្សារបស់ខ្ញុំ',
    'profile.myProducts': 'ផលិតផលរបស់ខ្ញុំ',
    'profile.about': 'អំពីខ្ញុំ',
    'profile.aboutSubtitle': 'រក្សាព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នកឱ្យទាន់សម័យជានិច្ច។',
    'profile.edit': 'កែប្រែ',
    'profile.cancel': 'បោះបង់',
    'profile.saveChanges': 'រក្សាទុកការផ្លាស់ប្តូរ',

    'profile.bioPlaceholder': 'ពណ៌នា​ខ្លី',
    'profile.fullName': 'ឈ្មោះពេញ',
    'profile.phone': '+855 ...',
    'profile.phoneNumber': 'លេខទូរស័ព្ទ',
    'profile.location': 'កម្ពុជា',
    'profile.country': 'ប្រទេស',
    'profile.selectCountry': 'ជ្រើសរើសប្រទេស',
    'profile.searchCountry': 'ស្វែងរកប្រទេស',
    'profile.noCountry': 'រកមិនឃើញប្រទេស',
    'profile.passionate': 'ស្រលាញ់ការសិក្សា និងបច្ចេកវិទ្យា',

    'profile.language': 'ភាសា',
    'profile.theme': 'រចនាប័ទ្ម',
    'profile.switch': 'ប្តូរ',
    'profile.securityDesc': 'គ្រប់គ្រងពាក្យសម្ងាត់ និងការការពារគណនីរបស់អ្នក។',
    'profile.changePassword': 'ប្ដូរពាក្យសម្ងាត់',
    'profile.updateFailed': 'ការធ្វើបច្ចុប្បន្នភាពប្រវត្តិរូបបរាជ័យ។ សូមព្យាយាមម្តងទៀត។',

    'profile.enrolled': 'បានចុះឈ្មោះ',
    'profile.completed': 'បានបញ្ចប់',
    'profile.hours': 'ម៉ោង',
    'profile.certificates': 'វិញ្ញាបនបត្រ',
    'profile.totalOrders': 'ការបញ្ជាទិញសរុប',
    'profile.totalSpent': 'ចំណាយសរុប',
    'profile.totalItems': 'ចំនួនទំនិញបានទិញ',
    'profile.cartItems': 'ទំនិញក្នុងកន្ត្រក',
    'profile.statusBreakdown': 'ស្ថានភាពការបញ្ជាទិញ',
    'profile.status.pending': 'កំពុងរង់ចាំ',
    'profile.status.approved': 'អនុម័ត',
    'profile.status.delivering': 'កំពុងដឹកជញ្ជូន',
    'profile.status.completed': 'បញ្ចប់',
    'profile.status.cancelled': 'បោះបង់',
    'profile.status.resolution': 'ដោះស្រាយ',
    'profile.recentPurchases': 'ការទិញថ្មីៗ',
    'profile.viewAllPurchases': 'មើលការទិញទាំងអស់',
    'profile.purchasesEmpty': 'អ្នកមិនទាន់មានការទិញដែលបានបញ្ចប់ទេ។',
    'profile.viewProduct': 'មើលលម្អិត',
    'profile.orderNumber': 'លេខបញ្ជាទិញ',
    'profile.orderedAt': 'កាលបរិច្ឆេទបញ្ជាទិញ',
    'profile.quantity': 'បរិមាណ',
    'profile.variant': 'ជម្រើស',
    'profile.loadingStats': 'កំពុងទាញទិន្នន័យស្ថិតិ...',
    'profile.loadingPurchases': 'កំពុងទាញការទិញរបស់អ្នក...',
    'profile.retry': 'សាកល្បងម្តងទៀត',
    'profile.refresh': 'ធ្វើបច្ចុប្បន្នភាព',

    'profile.deleteAccount': 'លុបគណនី',
    'profile.deleteWarnTitle': 'លុបគណនីមែនទេ?',
    'profile.deleteWarnBody': 'វានឹងបិទគណនី ហើយអ្នកនឹងត្រូវចាកចេញ។',
    'profile.confirmDelete': 'វាយ លុប ដើម្បីបញ្ជាក់',
    'profile.confirm': 'បញ្ជាក់',
    'profile.close': 'បិទ',
  
    // Courses Page
    'courses.title': 'ស្វែងរកវគ្គសិក្សារបស់យើង',
    'courses.description': 'រកឃើញវគ្គសិក្សាក្នុងការអភិវឌ្ឍន៍គេហទំព័រ ការរចនា អាជីវកម្ម និងច្រើនទៀត',
    'courses.filters': 'តម្រង',
    'courses.categories': 'ប្រភេទ',
    'courses.sortBy': 'តម្រៀបតាម',
    'courses.popular': 'ពេញនិយមបំផុត',
    'courses.rating': 'ការវាយតម្លៃខ្ពស់បំផុត',
    'courses.priceLow': 'តម្លៃ: ពីទាបទៅខ្ពស់',
    'courses.priceHigh': 'តម្លៃ: ពីខ្ពស់ទៅទាប',
    'courses.available': 'វគ្គសិក្សាមាន',
    'courses.clearFilter': 'សម្អាតតម្រង',
    'courses.noResults': 'រកមិនឃើញវគ្គសិក្សា',
    'courses.noResultsDesc': 'សូមព្យាយាមកែតម្រងរបស់អ្នកដើម្បីស្វែងរកអ្វីដែលអ្នកកំពុងស្វែងរក',
    'courses.viewAll': 'មើលវគ្គសិក្សាទាំងអស់',
    'courses.newReleases': 'ចេញផ្សាយថ្មី',
    'courses.latestUploads': 'វីដេអូបានបង្ហោះថ្មីៗ',
    'courses.popularVideos': 'វីដេអូពេញនិយម',
    'courses.mostWatched': 'មើលច្រើនបំផុត',
    'courses.videosAvailable': 'វីដេអូមាន',
    'courses.viewVideo': 'មើលវីដេអូ',
    'courses.videoBlogTitle': 'វិឌីអូប្លុក',
    'courses.videoBlogSubtitle': 'រកវីដេអូថ្មីៗបានរហ័ស',
    'courses.searchVideos': 'ស្វែងរកវីដេអូ',

    'filters.title': 'តម្រង',
    'filters.categories': 'ប្រភេទ',
    'filters.sortBy': 'តម្រៀបតាម',
    'filters.mostPopular': 'ពេញនិយមបំផុត',
    'filters.highestRated': 'វាយតម្លៃខ្ពស់បំផុត',
    'filters.priceLowHigh': 'តម្លៃពីទាបទៅខ្ពស់',
    'filters.priceHighLow': 'តម្លៃពីខ្ពស់ទៅទាប',
    'filters.allVideos': 'វីដេអូទាំងអស់',
    'filters.tag': 'ស្លាក',
    'filters.level': 'កម្រិត',
    'filters.levelAll': 'គ្រប់កម្រិត',
    'filters.levelBeginner': 'កម្រិតដើម',
    'filters.levelAdvanced': 'កម្រិតខ្ពស់',
    'filters.levelPro': 'កម្រិតជំនាញ',
    'filters.price': 'តម្លៃ',
    'filters.priceAll': 'ទាំងអស់',
    'filters.priceFree': 'ឥតគិតថ្លៃ',
    'filters.pricePaid': 'បង់ប្រាក់',
    'filters.clearAll': 'សម្អាតតម្រងទាំងអស់',
    'filters.slugs': 'ស្លាក',
    'filters.all': 'ទាំងអស់',
    'filters.ai': 'បញ្ញាសិប្បនិម្មិត',
    'filters.programs': 'កម្មវិធី',
    'filters.games': 'ហ្គេម',
    'filters.tools': 'ឧបករណ៍',

    'all.title': 'ស្វែងរកផលិតផលទាំងអស់',
    'all.subtitle': 'រកឃើញវគ្គសិក្សា កម្មវិធី ហ្គេម និងឧបករណ៍នៅកន្លែងតែមួយ',
    'all.allProducts': 'ផលិតផលទាំងអស់',
    'all.products': 'ផលិតផល',
    'all.available': 'មាន',
    'all.noResults': 'មិនមានលទ្ធផល',
    'all.noResultsDesc': 'សូមកែតម្រងរបស់អ្នកម្តងទៀត។',
    'programs.title': 'កម្មវិធីជំនាញ',
    'programs.subtitle': 'ស្វែងរកកម្មវិធីជំនាញសម្រាប់អាជីពរបស់អ្នក',
    'games.title': 'ហ្គេម និងការកម្សាន្ត',
    'games.subtitle': 'ស្វែងរកហ្គេមល្អៗសម្រាប់ការកម្សាន្ត',
    'tools.title': 'ឧបករណ៍ផលិតភាព',
    'tools.subtitle': 'ស្វែងរកឧបករណ៍ដើម្បីបង្កើនផលិតភាព និងប្រសិទ្ធភាព',
    'search.slug': 'ស្វែងរកស្លាក...',

    'labels.programs': 'កម្មវិធី',
    'labels.games': 'ហ្គេម',
    'labels.tools': 'ឧបករណ៍',
    'labels.video': 'វីដេអូ',
    'labels.students': 'សិស្ស',
    'labels.lessons': 'មេរៀន',
    'labels.free': 'ឥតគិតថ្លៃ',
    'labels.instructor': 'គ្រូបង្រៀន',

    'common.loading': 'កំពុងផ្ទុក...',
    'common.available': 'មាន',
    
    // Course Detail
    'detail.createdBy': 'បង្កើតដោយ',
    'detail.students': 'សិស្ស',
    'detail.addToCart': 'បន្ថែមទៅកន្ត្រក',
    'detail.buyNow': 'ទិញឥឡូវនេះ',
    'detail.includes': 'វគ្គសិក្សានេះរួមបញ្ចូល:',
    'detail.video': 'វីដេអូតាមតម្រូវការ',
    'detail.resources': 'ធនធានដែលអាចទាញយកបាន',
    'detail.access': 'ការចូលប្រើពេញមួយជីវិត',
    'detail.certificate': 'វិញ្ញាបនប័ត្របញ្ចប់',
    'detail.overview': 'ទិដ្ឋភាពទូទៅ',
    'detail.curriculum': 'កម្មវិធីសិក្សា',
    'detail.reviews': 'សម្រង់',
    'detail.about': 'អំពីវគ្គសិក្សានេះ',
    'detail.whatLearn': 'អ្វីដែលអ្នកនឹងរៀន',
    'detail.requirements': 'តម្រូវការ',
    'detail.courseCurriculum': 'កម្មវិធីសិក្សាវគ្គ',
    'detail.preview': 'មើលជាមុន',
    'detail.studentReviews': 'សម្រង់របស់សិស្ស',
    'detail.instructor': 'គ្រូបង្រៀនរបស់អ្នក',
    'detail.expertInstructor': 'គ្រូបង្រៀនជំនាញ',
    'detail.instructorRating': 'ការវាយតម្លៃគ្រូបង្រៀន',
  }
};
