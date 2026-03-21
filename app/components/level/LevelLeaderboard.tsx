/**
 * Level Leaderboard Component
 * 
 * Displays top users by level
 * 
 * Usage:
 * <LevelLeaderboard limit={50} />
 */

"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, Award } from "lucide-react";

type LeaderboardEntry = {
  rank: number;
  userId: number;
  username: string | null;
  level: number;
  progressionScore: number;
  buyingScore: number;
  sellingScore: number;
};

type LevelLeaderboardProps = {
  limit?: number;
  minLevel?: number;
  className?: string;
};

export function LevelLeaderboard({
  limit = 50,
  minLevel = 1,
  className = "",
}: LevelLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch(
          `/api/level/leaderboard?limit=${limit}&minLevel=${minLevel}`
        );
        if (!res.ok) {
          throw new Error("Failed to load leaderboard");
        }
        const jsonData = await res.json();
        setLeaderboard(jsonData.leaderboard);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [limit, minLevel]);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading leaderboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 ${className}`}>
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-yellow-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Level Leaderboard
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Top {leaderboard.length} users by level
        </p>
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                User
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Level
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Score
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                Bought
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                Sold
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {leaderboard.map((entry, index) => (
              <tr
                key={entry.userId}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                {/* Rank */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {index === 0 && <Trophy className="h-5 w-5 text-yellow-600" />}
                    {index === 1 && <Medal className="h-5 w-5 text-gray-400" />}
                    {index === 2 && <Award className="h-5 w-5 text-orange-600" />}
                    {index > 2 && (
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        #{entry.rank}
                      </span>
                    )}
                  </div>
                </td>

                {/* User */}
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {entry.username || `User #${entry.userId}`}
                  </span>
                </td>

                {/* Level */}
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-bold text-green-600">
                    Level {entry.level}
                  </span>
                </td>

                {/* Score */}
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {entry.progressionScore.toFixed(0)}
                  </span>
                </td>

                {/* Bought */}
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ${entry.buyingScore.toFixed(0)}
                  </span>
                </td>

                {/* Sold */}
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ${entry.sellingScore.toFixed(0)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {leaderboard.length === 0 && (
        <div className="p-12 text-center">
          <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            No users found in leaderboard
          </p>
        </div>
      )}
    </div>
  );
}
