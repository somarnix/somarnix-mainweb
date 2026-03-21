/**
 * User Level Badge Component
 * 
 * Displays user's level badge with progress bar
 * Supports English and Khmer languages
 * 
 * Usage:
 * <UserLevelBadge userId={user.id} size="md" lang="km" />
 */

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { t, getLevelTierName, getCurrentLanguage, Language } from '@/app/lib/level/translations';

type UserLevelData = {
  user: {
    id: number;
    username: string | null;
    level: number;
    progressionScore: number;
    buyingScore: number;
    sellingScore: number;
  };
  progress: {
    currentLevel: number;
    nextLevel: number;
    currentScore: number;
    nextLevelScore: number;
    progressPercent: number;
  };
  benefits: {
    unlocked: any[];
    available: any[];
  };
};

type UserLevelBadgeProps = {
  userId: number;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
  showStats?: boolean;
  className?: string;
  lang?: "en" | "km";
  tone?: "light" | "dark";
};

export function UserLevelBadge({
  userId,
  size = "md",
  showProgress = true,
  showStats = false,
  className = "",
  lang,
  tone = "light",
}: UserLevelBadgeProps) {
  const [data, setData] = useState<UserLevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState<Language>(lang || 'en');

  useEffect(() => {
    if (lang) {
      setCurrentLang(lang);
    } else {
      setCurrentLang(getCurrentLanguage());
    }
  }, [lang]);

  useEffect(() => {
    async function fetchLevel() {
      try {
        const res = await fetch(`/api/level/stats/${userId}`);
        if (!res.ok) {
          throw new Error(t('failedToLoad', currentLang));
        }
        const jsonData = await res.json();
        setData(jsonData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('failedToLoad', currentLang));
      } finally {
        setLoading(false);
      }
    }

    fetchLevel();
  }, [userId, currentLang]);

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t('loading', currentLang)}
        </span>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { user, progress } = data;
  const level = user.level;
  const tierName = getLevelTierName(level, currentLang);

  function getBadgeAssetNumber(currentLevel: number) {
    if (currentLevel <= 1) return 1;
    if (currentLevel <= 10) return currentLevel;
    return Math.min(100, 11 + Math.floor((currentLevel - 11) / 11));
  }

  const badgeAssetNumber = getBadgeAssetNumber(level);
  const badgeAssetSrc = `/Budget%20GSTECHKH%20SVG/${badgeAssetNumber}.svg`;

  function getProgressColor(level: number) {
    if (level >= 1000) return "from-yellow-400 to-orange-500";
    if (level >= 500) return "from-fuchsia-500 to-pink-500";
    if (level >= 100) return "from-sky-500 to-cyan-500";
    if (level >= 50) return "from-emerald-500 to-green-500";
    if (level >= 25) return "from-teal-500 to-emerald-500";
    if (level >= 10) return "from-orange-500 to-amber-500";
    return "from-emerald-500 to-green-500";
  }

  const progressColor = getProgressColor(level);

  // Size classes
  const sizeClasses = {
    sm: {
      container: "min-w-[120px]",
      iconBox: "h-9 w-9",
      level: "text-xs",
      score: "text-[11px]",
      gap: "gap-2.5",
    },
    md: {
      container: "min-w-[188px]",
      iconBox: "h-12 w-12",
      level: "text-lg",
      score: "text-xs",
      gap: "gap-3.5",
    },
    lg: {
      container: "min-w-[220px]",
      iconBox: "h-16 w-16",
      level: "text-xl",
      score: "text-sm",
      gap: "gap-4",
    },
  };

  const classes = sizeClasses[size];
  const isDarkTone = tone === "dark";
  const levelTextClass = isDarkTone ? "text-slate-900 dark:text-white" : "text-white";
  const subTextClass = isDarkTone ? "text-slate-600 dark:text-slate-300" : "text-white/90";

  return (
    <div className={`inline-block ${className}`}>
      <div className={`${classes.container} ${levelTextClass}`}>
        <div className={`flex items-center ${classes.gap}`}>
          <div className={`relative shrink-0 ${classes.iconBox}`}>
            <Image
              src={badgeAssetSrc}
              alt={`Level ${level} badge`}
              fill
              sizes={size === "lg" ? "64px" : size === "md" ? "48px" : "36px"}
              className="object-contain drop-shadow-[0_10px_22px_rgba(15,23,42,0.22)]"
              unoptimized
            />
          </div>
          <div className="min-w-0">
            <div className={`${classes.level} font-extrabold tracking-tight leading-none ${levelTextClass}`}>
              {t('level', currentLang)} {level}
            </div>
            {showStats && (
              <div className={`${classes.score} mt-1.5 font-medium ${subTextClass}`}>
                {user.buyingScore >= 0 && user.buyingScore < 1000
                  ? `$${user.buyingScore.toFixed(0)}`
                  : ""}{" "}
                {user.sellingScore >= 0 && user.sellingScore < 1000
                  ? `$${user.sellingScore.toFixed(0)}`
                  : ""}
              </div>
            )}
            {!showStats && tierName && (
              <div className={`${classes.score} mt-1.5 font-semibold ${subTextClass}`}>
                {tierName}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {showProgress && level < 1000 && (
        <div className="mt-2 w-full">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>{t('level', currentLang)} {progress.currentLevel}</span>
            <span>{t('level', currentLang)} {progress.nextLevel}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`bg-gradient-to-r ${progressColor} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
            {progress.currentScore.toFixed(0)} / {progress.nextLevelScore} {t('score', currentLang)} ({progress.progressPercent.toFixed(1)}%)
          </div>
        </div>
      )}

      {/* Max Level Indicator */}
      {level >= 1000 && (
        <div className="mt-2 text-xs text-center text-yellow-600 dark:text-yellow-400 font-semibold">
          👑 {t('maxLevelReached', currentLang)} 👑
        </div>
      )}
    </div>
  );
}
