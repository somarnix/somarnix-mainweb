/**
 * User Level Dashboard Component
 * 
 * Full level statistics dashboard for user profile
 * 
 * Usage:
 * <UserLevelDashboard userId={user.id} />
 */

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { TrendingUp, ShoppingBag, Store, Award, Star, Lock, Trophy } from "lucide-react";

type UserLevelData = {
  user: {
    id: number;
    username: string | null;
    level: number;
    progressionScore: number;
    buyingScore: number;
    sellingScore: number;
    qualityBonus: number;
    penalties: number;
    totalTransactions: number;
    totalBought: number;
    totalSold: number;
    timesBought: number;
    timesSold: number;
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

type UserLevelDashboardProps = {
  userId: number;
  className?: string;
};

export function UserLevelDashboard({
  userId,
  className = "",
}: UserLevelDashboardProps) {
  const [data, setData] = useState<UserLevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLevel() {
      try {
        const res = await fetch(`/api/level/stats/${userId}`);
        if (!res.ok) {
          throw new Error("Failed to load level");
        }
        const jsonData = await res.json();
        setData(jsonData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load level");
      } finally {
        setLoading(false);
      }
    }

    fetchLevel();
  }, [userId]);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading level...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 ${className}`}>
        <p className="text-red-600 dark:text-red-400">{error || "Failed to load level"}</p>
      </div>
    );
  }

  const { user, progress, benefits } = data;
  const buyingScore = Number(user.buyingScore ?? 0);
  const sellingScore = Number(user.sellingScore ?? 0);
  const qualityBonus = Number(user.qualityBonus ?? 0);
  const penalties = Number(user.penalties ?? 0);
  const totalBought = Number(user.totalBought ?? 0);
  const totalSold = Number(user.totalSold ?? 0);
  const progressionScore = Number(user.progressionScore ?? 0);
  const progressPercent = Number(progress.progressPercent ?? 0);
  const currentScore = Number(progress.currentScore ?? 0);

  function getBadgeAssetNumber(currentLevel: number) {
    if (currentLevel <= 1) return 1;
    if (currentLevel <= 10) return currentLevel;
    return Math.min(100, 11 + Math.floor((currentLevel - 11) / 11));
  }

  const badgeAssetNumber = getBadgeAssetNumber(user.level);
  const badgeAssetSrc = `/Budget%20SOMARNIX%20SVG/${badgeAssetNumber}.svg`;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Level {user.level}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {user.username || "User"}
          </p>
        </div>
        <div className="relative h-12 w-12 shrink-0">
          <Image
            src={badgeAssetSrc}
            alt={`Level ${user.level} badge`}
            fill
            sizes="48px"
            className="object-contain"
            unoptimized
          />
        </div>
      </div>

      {/* Progress Bar */}
      {user.level < 1000 ? (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Level {progress.currentLevel}</span>
            <span>Level {progress.nextLevel}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-green-400 to-green-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            {currentScore.toFixed(0)} / {progress.nextLevelScore} points (
            {progressPercent.toFixed(1)}% to next level)
          </p>
        </div>
      ) : (
        <div className="mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-4 text-white text-center">
          <Trophy className="h-8 w-8 mx-auto mb-2" />
          <p className="font-bold">MAX LEVEL REACHED!</p>
          <p className="text-sm opacity-90">You&apos;ve reached the highest level!</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={ShoppingBag}
          label="Total Bought"
          value={`$${totalBought.toFixed(2)}`}
          subValue={`${user.timesBought} purchases`}
        />
        <StatCard
          icon={Store}
          label="Total Sold"
          value={`$${totalSold.toFixed(2)}`}
          subValue={`${user.timesSold} sales`}
        />
        <StatCard
          icon={TrendingUp}
          label="Total Score"
          value={progressionScore.toFixed(0)}
          subValue={`${user.totalTransactions} transactions`}
        />
        <StatCard
          icon={Star}
          label="Quality Bonus"
          value={`+${qualityBonus.toFixed(0)}`}
          subValue="From 5-star ratings"
        />
      </div>

      {/* Score Breakdown */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Score Breakdown
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Buying Score</span>
            <span className="font-medium text-gray-900 dark:text-white">
              +{buyingScore.toFixed(0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Selling Score</span>
            <span className="font-medium text-gray-900 dark:text-white">
              +{sellingScore.toFixed(0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Quality Bonus</span>
            <span className="font-medium text-green-600">
              +{qualityBonus.toFixed(0)}
            </span>
          </div>
          {penalties > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Penalties</span>
              <span className="font-medium text-red-600">
                -{penalties.toFixed(0)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Total Score</span>
            <span className="font-bold text-gray-900 dark:text-white">
              {progressionScore.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Unlocked Benefits */}
      {benefits.unlocked.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            🎉 Unlocked Benefits ({benefits.unlocked.length})
          </h3>
          <div className="space-y-2">
            {benefits.unlocked.slice(0, 5).map((benefit) => (
              <div
                key={benefit.key}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <Award className="h-4 w-4 text-green-600" />
                <span>{benefit.name}</span>
              </div>
            ))}
            {benefits.unlocked.length > 5 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                +{benefits.unlocked.length - 5} more benefits
              </p>
            )}
          </div>
        </div>
      )}

      {/* Available Benefits */}
      {benefits.available.length > 0 && user.level < 1000 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            🔒 Available Benefits
          </h3>
          <div className="space-y-3">
            {benefits.available.map((benefit) => (
              <div
                key={benefit.key}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <Lock className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {benefit.name}
                    </span>
                    <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                      Level {benefit.unlockLevel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: any;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <Icon className="h-5 w-5 text-green-600 mb-2" />
      <div className="text-lg font-bold text-gray-900 dark:text-white">{value}</div>
      {subValue && (
        <div className="text-xs text-gray-600 dark:text-gray-400">{subValue}</div>
      )}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}
