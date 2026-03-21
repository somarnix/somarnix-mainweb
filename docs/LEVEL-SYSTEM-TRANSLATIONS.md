# 🌐 Level System Translations (English & Khmer)

## ✅ Translation Support Added

The level system now supports **both English and Khmer** languages!

---

## 📚 Translation Files

| File | Purpose |
|------|---------|
| `app/lib/level/translations.ts` | Translation utilities and dictionaries |
| `sql/13-marketplace-level-system.sql` | Database with translations |
| `app/components/level/UserLevelBadge.tsx` | Bilingual badge component |

---

## 🗣️ Available Languages

- **English (en)** - Default
- **Khmer (km)** - ខ្មែរ

---

## 🎯 Level Translations

### Level Badge Names

| Level | English | Khmer |
|-------|---------|-------|
| 10 | Level 10 Badge | ផ្លាកលេខ ១០ |
| 25 | Level 25 Badge | ផ្លាកលេខ ២៥ |
| 50 | Level 50 Badge | ផ្លាកលេខ ៥០ |
| 100 | Level 100 Badge | ផ្លាកលេខ ១០០ |
| 250 | Level 250 Badge | ផ្លាកលេខ ២៥០ |
| 500 | Level 500 Badge | ផ្លាកលេខ ៥០០ |
| 1000 | Level 1000 Badge | ផ្លាកលេខ ១០០០ |

### Level Tier Names

| Level | English | Khmer |
|-------|---------|-------|
| 1 | Beginner | អ្នកចាប់ផ្តើម |
| 10 | Active Trader | អ្នកជួញដូរសកម្ម |
| 25 | Experienced Trader | អ្នកជួញដូរមានបទពិសោធន៍ |
| 50 | Trusted Trader | អ្នកជួញដូរទុកចិត្តបាន |
| 100 | Expert Trader | អ្នកជួញដូរជំនាញ |
| 250 | Master Trader | អ្នកជួញដូរកម្រិតខ្ពស់ |
| 500 | Grand Master Trader | អ្នកជួញដូរកម្រិតធំ |
| 1000 | Legend | កិរ្តិយស |

### UI Translations

| English | Khmer |
|---------|-------|
| Level | លេខ |
| Progress | វឌ្ឍនភាព |
| Score | ពិន្ទុ |
| Buying Score | ពិន្ទុទិញ |
| Selling Score | ពិន្ទុលក់ |
| Quality Bonus | ប្រាក់រង្វាន់គុណភាព |
| Penalties | ការផាកពិន័យ |
| Total Transactions | ប្រតិបត្តិការសរុប |
| Total Bought | ទិញសរុប |
| Total Sold | លក់សរុប |
| Loading... | កំពុងផ្ទុក... |
| Failed to load level | បរាជ័យក្នុងការផ្ទុកលេខ |
| MAX LEVEL REACHED! | ឈានដល់លេខអតិបរមាហើយ! |
| Leaderboard | តារាងពិន្ទុលេខ |
| Rank | លំដាប់ |
| User | អ្នកប្រើ |

---

## 💻 How to Use

### Option 1: Auto-detect from localStorage

```typescript
import { UserLevelBadge } from '@/app/components/level/UserLevelBadge';

// Automatically uses language from localStorage
<UserLevelBadge userId={user.id} />
```

### Option 2: Specify language manually

```typescript
// English
<UserLevelBadge userId={user.id} lang="en" />

// Khmer
<UserLevelBadge userId={user.id} lang="km" />
```

### Option 3: Use with your existing language system

```typescript
// If you have a language context/hook
const { language } = useLanguage(); // 'en' or 'km'

<UserLevelBadge 
  userId={user.id} 
  lang={language} 
/>
```

---

## 📖 Translation Utilities

### Import translations

```typescript
import { t, getLevelTierName, getCurrentLanguage } from '@/app/lib/level/translations';
```

### Translate text

```typescript
// Basic translation
t('level', 'km') // Returns: 'លេខ'
t('loading', 'en') // Returns: 'Loading...'

// With parameters
tWithParams('levelBadge', { level: 50 }, 'km') 
// Returns: 'ផ្លាកលេខ ៥០'
```

### Get level tier name

```typescript
getLevelTierName(100, 'en') // Returns: 'Expert Trader'
getLevelTierName(100, 'km') // Returns: 'អ្នកជួញដូរជំនាញ'
```

### Get current language

```typescript
const lang = getCurrentLanguage(); // Returns 'en' or 'km' from localStorage
```

---

## 🗄️ Database Translations

Badge translations are stored in JSON format:

```json
{
  "badge_icon": "level_100.png",
  "color": "gold",
  "translations": {
    "en": {
      "name": "Level 100 Badge",
      "description": "Reached Level 100 - Expert Trader"
    },
    "km": {
      "name": "ផ្លាកលេខ ១០០",
      "description": "ឈានដល់លេខ ១០០ - អ្នកជួញដូរជំនាញ"
    }
  }
}
```

---

## ➕ Add More Translations

### Add a new translation key

Edit `app/lib/level/translations.ts`:

```typescript
export type TranslationKey = 
  | 'level'
  | 'progress'
  | 'myNewKey' // Add here

export const levelTranslations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    level: 'Level',
    progress: 'Progress',
    myNewKey: 'My new text', // Add English
  },
  km: {
    level: 'លេខ',
    progress: 'វឌ្ឍនភាព',
    myNewKey: 'អត្ថបទថ្មីរបស់ខ្ញុំ', // Add Khmer
  },
};
```

### Add a new badge translation

```sql
INSERT INTO level_benefits (benefit_key, benefit_name, benefit_description, benefit_category, unlock_level, benefit_value)
SELECT * FROM (
  SELECT 'badge_level_75', 
         'Level 75 Badge', 
         'Reached Level 75',
         'visibility', 
         75, 
         JSON_OBJECT(
           'badge_icon', 'level_75.png', 
           'color', 'crystal',
           'translations', JSON_OBJECT(
             'en', JSON_OBJECT('name', 'Level 75 Badge', 'description', 'Reached Level 75 - Senior Trader'),
             'km', JSON_OBJECT('name', 'ផ្លាកលេខ ៧៥', 'description', 'ឈានដល់លេខ ៧៥ - អ្នកជួញដូរជាន់ខ្ពស់')
           )
         ) AS benefit_value
) AS data
WHERE NOT EXISTS (
  SELECT 1 FROM level_benefits WHERE benefit_key = 'badge_level_75'
);
```

---

## 🎨 Color Translations

| Color | English | Khmer |
|-------|---------|-------|
| Gray | Gray | ពណ៌ប្រផេះ |
| Bronze | Bronze | សំរិទ្ធ |
| Silver | Silver | ប្រាក់ |
| Gold | Gold | មាស |
| Platinum | Platinum | ប្លាទីន |
| Diamond | Diamond | ពេជ្រ |
| Legendary | Legendary | កិរ្តិយស |

---

## ✅ Features

- ✅ **Bilingual Support** - English & Khmer
- ✅ **Auto-detection** - From localStorage
- ✅ **Manual Override** - Specify language via prop
- ✅ **Complete Coverage** - All UI text translated
- ✅ **Database Translations** - Badge names & descriptions
- ✅ **Easy to Extend** - Add new translations easily

---

## 🔧 Integration with Existing Language System

If you already have a language system (like `useLanguage` hook):

```typescript
// Your existing language hook
const { language, setLanguage } = useLanguage();

// Pass to level component
<UserLevelBadge userId={user.id} lang={language} />
```

Or update the `getCurrentLanguage()` function in `translations.ts`:

```typescript
export function getCurrentLanguage(): Language {
  // Use your existing language system
  const { language } = useLanguage();
  return (language === 'km' || language === 'en') ? language : 'en';
}
```

---

## 📝 Translation Keys

Available keys for translation:

```typescript
type TranslationKey = 
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
```

---

## 🎯 Summary

**What's Translated:**
- ✅ All UI text in components
- ✅ Level badge names
- ✅ Level tier names
- ✅ Progress labels
- ✅ Button text
- ✅ Error messages
- ✅ Database records

**Languages Supported:**
- ✅ English (en)
- ✅ Khmer (km)

**Easy to Use:**
- ✅ Auto-detect from localStorage
- ✅ Manual override with `lang` prop
- ✅ Integrates with existing language systems

---

**Status:** ✅ Complete
**Languages:** English & Khmer
**Ready to Use:** Yes!
