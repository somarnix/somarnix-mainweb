# 🎨 Badge SVG System - Levels 1 to 1000

## Your Badge Folder Location

```
C:\Users\Sophanaroth Lem\Documents\Word\Lesson\somarnix\somarnix\public\Budget SOMARNIX SVG\
```

---

## 📊 Badge System

### Levels 1-10: One Badge Per Level (10 badges)
```
Level 1  → level_1.svg
Level 2  → level_2.svg
Level 3  → level_3.svg
Level 4  → level_4.svg
Level 5  → level_5.svg
Level 6  → level_6.svg
Level 7  → level_7.svg
Level 8  → level_8.svg
Level 9  → level_9.svg
Level 10 → level_10.svg
```

### Levels 11-1000: One Badge Per 11 Levels (90 badges)
```
Level 11-21   → level_11.svg
Level 22-32   → level_22.svg
Level 33-43   → level_33.svg
Level 44-54   → level_44.svg
Level 55-65   → level_55.svg
Level 66-76   → level_66.svg
Level 77-87   → level_77.svg
Level 88-98   → level_88.svg
Level 99-109  → level_99.svg
Level 110-120 → level_110.svg
...
Level 990-1000 → level_990.svg
```

---

## 📋 Complete Badge List (100 SVG Files)

### Tier 1: Levels 1-10 (Individual)
```
level_1.svg
level_2.svg
level_3.svg
level_4.svg
level_5.svg
level_6.svg
level_7.svg
level_8.svg
level_9.svg
level_10.svg
```

### Tier 2: Levels 11-1000 (Every 11 levels)
```
level_11.svg
level_22.svg
level_33.svg
level_44.svg
level_55.svg
level_66.svg
level_77.svg
level_88.svg
level_99.svg
level_110.svg
level_121.svg
level_132.svg
level_143.svg
level_154.svg
level_165.svg
level_176.svg
level_187.svg
level_198.svg
level_209.svg
level_220.svg
level_231.svg
level_242.svg
level_253.svg
level_264.svg
level_275.svg
level_286.svg
level_297.svg
level_308.svg
level_319.svg
level_330.svg
level_341.svg
level_352.svg
level_363.svg
level_374.svg
level_385.svg
level_396.svg
level_407.svg
level_418.svg
level_429.svg
level_440.svg
level_451.svg
level_462.svg
level_473.svg
level_484.svg
level_495.svg
level_506.svg
level_517.svg
level_528.svg
level_539.svg
level_550.svg
level_561.svg
level_572.svg
level_583.svg
level_594.svg
level_605.svg
level_616.svg
level_627.svg
level_638.svg
level_649.svg
level_660.svg
level_671.svg
level_682.svg
level_693.svg
level_704.svg
level_715.svg
level_726.svg
level_737.svg
level_748.svg
level_759.svg
level_770.svg
level_781.svg
level_792.svg
level_803.svg
level_814.svg
level_825.svg
level_836.svg
level_847.svg
level_858.svg
level_869.svg
level_880.svg
level_891.svg
level_902.svg
level_913.svg
level_924.svg
level_935.svg
level_946.svg
level_957.svg
level_968.svg
level_979.svg
level_990.svg
level_1000.svg
```

**Total: 100 SVG files**

---

## 📐 SVG Size

**64x64 pixels**

```xml
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <!-- Your badge design here -->
</svg>
```

---

## 🎨 Color Guide

| Level Range | Color | Example |
|-------------|-------|---------|
| 1-10 | Gray | `#9CA3AF` |
| 11-21 | Bronze | `#CD7F32` |
| 22-32 | Silver | `#C0C0C0` |
| 33-43 | Gold | `#FFD700` |
| 44-54 | Platinum | `#E5E4E2` |
| 55-65 | Diamond | `#B9F2FF` |
| 66-76 | Crystal | `#xFF70F` |
| 77-87 | Emerald | `#50C878` |
| 88-98 | Ruby | `#E0115F` |
| 99-109 | Sapphire | `#0F52BA` |
| 110+ | Special Colors | Your choice |
| 1000 | Legendary | `#FF6B6B` |

---

## 📝 How to Calculate Badge Filename

**For Levels 1-10:**
```
Badge filename = level_{level}.svg
Example: Level 5 → level_5.svg
```

**For Levels 11+:**
```
Badge filename = level_{floor(level / 11) * 11}.svg

Examples:
Level 25  → floor(25/11) * 11 = 2 * 11 = 22 → level_22.svg
Level 50  → floor(50/11) * 11 = 4 * 11 = 44 → level_44.svg
Level 100 → floor(100/11) * 11 = 9 * 11 = 99 → level_99.svg
Level 500 → floor(500/11) * 11 = 45 * 11 = 495 → level_495.svg
Level 1000 → Special case → level_1000.svg
```

---

## 🗄️ Database Reference

The badge filenames are stored in the `level_benefits` table:

```sql
SELECT benefit_key, benefit_value->>'$.badge_icon' AS badge_icon
FROM level_benefits
WHERE benefit_key LIKE 'badge_level_%';
```

**Result:**
```
badge_level_10   → level_10.svg
badge_level_11   → level_11.svg
badge_level_22   → level_22.svg
badge_level_33   → level_33.svg
...
badge_level_1000 → level_1000.svg
```

---

## ✅ Summary

| Property | Value |
|----------|-------|
| **Total SVG Files** | 100 |
| **Size** | 64x64 pixels |
| **Format** | SVG |
| **Location** | `public/Budget SOMARNIX SVG/` |
| **Naming** | `level_1.svg` to `level_10.svg`, then `level_11.svg`, `level_22.svg`, ... `level_990.svg`, `level_1000.svg` |

---

**Status:** Ready to create! 🎨
