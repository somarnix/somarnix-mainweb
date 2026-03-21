/**
 * Level System Translations
 * English and Khmer language support
 */

export type TranslationKey = 
  | 'level'
  | 'levelBadge'
  | 'progress'
  | 'score'
  | 'buyingScore'
  | 'sellingScore'
  | 'qualityBonus'
  | 'penalties'
  | 'totalTransactions'
  | 'totalBought'
  | 'totalSold'
  | 'timesBought'
  | 'timesSold'
  | 'scoreBreakdown'
  | 'unlockedBenefits'
  | 'availableBenefits'
  | 'maxLevelReached'
  | 'leaderboard'
  | 'rank'
  | 'user'
  | 'loading'
  | 'failedToLoad';

export type Language = 'en' | 'km';

export const levelTranslations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    level: 'Level',
    levelBadge: 'Level {level} Badge',
    progress: 'Progress',
    score: 'Score',
    buyingScore: 'Buying Score',
    sellingScore: 'Selling Score',
    qualityBonus: 'Quality Bonus',
    penalties: 'Penalties',
    totalTransactions: 'Total Transactions',
    totalBought: 'Total Bought',
    totalSold: 'Total Sold',
    timesBought: 'purchases',
    timesSold: 'sales',
    scoreBreakdown: 'Score Breakdown',
    unlockedBenefits: '🎉 Unlocked Benefits',
    availableBenefits: '🔒 Available Benefits',
    maxLevelReached: 'MAX LEVEL REACHED!',
    leaderboard: 'Level Leaderboard',
    rank: 'Rank',
    user: 'User',
    loading: 'Loading...',
    failedToLoad: 'Failed to load level',
  },
  km: {
    level: 'លេខ',
    levelBadge: 'ផ្លាកលេខ {level}',
    progress: 'វឌ្ឍនភាព',
    score: 'ពិន្ទុ',
    buyingScore: 'ពិន្ទុទិញ',
    sellingScore: 'ពិន្ទុលក់',
    qualityBonus: 'ប្រាក់រង្វាន់គុណភាព',
    penalties: 'ការផាកពិន័យ',
    totalTransactions: 'ប្រតិបត្តិការសរុប',
    totalBought: 'ទិញសរុប',
    totalSold: 'លក់សរុប',
    timesBought: 'ការទិញ',
    timesSold: 'ការលក់',
    scoreBreakdown: 'ការបំបែកពិន្ទុ',
    unlockedBenefits: '🎉 អត្ថប្រយោជន៍ដែលបានបើកដំណើរការ',
    availableBenefits: '🔒 អត្ថប្រយោជន៍ដែលមាន',
    maxLevelReached: 'ឈានដល់លេខអតិបរមាហើយ!',
    leaderboard: 'តារាងពិន្ទុលេខ',
    rank: 'លំដាប់',
    user: 'អ្នកប្រើ',
    loading: 'កំពុងផ្ទុក...',
    failedToLoad: 'បរាជ័យក្នុងការផ្ទុកលេខ',
  },
};

/**
 * Get level tier name in selected language
 */
export function getLevelTierName(level: number, lang: Language = 'en'): string {
  const tiers = {
    en: {
      1000: 'Legend',
      500: 'Grand Master User',
      250: 'Master User',
      100: 'Expert User',
      50: 'Trusted User',
      25: 'Experienced User',
      10: 'Active User',
      1: 'Beginner',
    },
    km: {
      1000: 'កិរ្តិយស',
      500: 'អ្នកជួញដូរកម្រិតធំ',
      250: 'អ្នកជួញដូរកម្រិតខ្ពស់',
      100: 'អ្នកជួញដូរជំនាញ',
      50: 'អ្នកជួញដូរទុកចិត្តបាន',
      25: 'អ្នកជួញដូរមានបទពិសោធន៍',
      10: 'អ្នកជួញដូរសកម្ម',
      1: 'អ្នកចាប់ផ្តើម',
    },
  };

  const tierLevels = [1000, 500, 250, 100, 50, 25, 10, 1];
  const matchedLevel = tierLevels.find(l => level >= l);
  
  if (!matchedLevel) return lang === 'km' ? 'អ្នកចាប់ផ្តើម' : 'Beginner';
  
  return tiers[lang][matchedLevel as keyof typeof tiers.en];
}

/**
 * Get badge color name in selected language
 */
export function getBadgeColorName(color: string, lang: Language = 'en'): string {
  const colors: Record<string, Record<Language, string>> = {
    gray: { en: 'Gray', km: 'ពណ៌ប្រផេះ' },
    bronze: { en: 'Bronze', km: 'សំរិទ្ធ' },
    silver: { en: 'Silver', km: 'ប្រាក់' },
    gold: { en: 'Gold', km: 'មាស' },
    platinum: { en: 'Platinum', km: 'ប្លាទីន' },
    diamond: { en: 'Diamond', km: 'ពេជ្រ' },
    legendary: { en: 'Legendary', km: 'កិរ្តិយស' },
  };

  return colors[color]?.[lang] || color;
}

/**
 * Translate a key
 */
export function t(key: TranslationKey, lang: Language = 'en'): string {
  return levelTranslations[lang][key] || levelTranslations.en[key] || key;
}

/**
 * Translate with parameters
 */
export function tWithParams(
  key: TranslationKey, 
  params: Record<string, string | number>, 
  lang: Language = 'en'
): string {
  let translation = t(key, lang);
  
  Object.entries(params).forEach(([param, value]) => {
    translation = translation.replace(`{${param}}`, String(value));
  });
  
  return translation;
}

/**
 * Get current language from localStorage or default to 'en'
 */
export function getCurrentLanguage(): Language {
  if (typeof localStorage === 'undefined') {
    return 'en';
  }
  
  const stored = localStorage.getItem('language');
  return (stored === 'km' || stored === 'en') ? stored : 'en';
}

/**
 * Get language label
 */
export function getLanguageLabel(lang: Language): string {
  return lang === 'en' ? 'English' : 'ខ្មែរ';
}
