# 🎮 Tiered Level System - $2/$5/$10/$20 Formula

## ✅ Updated Level Formula

The level system now uses a **tiered progression** where different level ranges require different amounts per level.

---

## 📊 Level Tiers

| Level Range | $ Per Level | Total $ Needed | Example |
|-------------|-------------|----------------|---------|
| **1 → 10** | $2 | $20 | Buy $2 → Level 2 |
| **11 → 100** | $5 | $470 | Buy $5 → +1 level |
| **101 → 500** | $10 | $4,470 | Buy $10 → +1 level |
| **501 → 1000** | $20 | $14,470 | Buy $20 → +1 level |

---

## 🎯 How It Works

### Tier 1: Level 1 to 10 (Beginner)
**$2 = 1 Level**

```
Buy $2  → Level 2
Buy $4  → Level 3
Buy $6  → Level 4
...
Buy $20 → Level 10
```

**Formula:**
```
Level = 1 + FLOOR(score / 2)
```

---

### Tier 2: Level 11 to 100 (Intermediate)
**$5 = 1 Level**

```
Total $20  → Level 10
Total $25  → Level 11
Total $30  → Level 12
...
Total $470 → Level 100
```

**Formula:**
```
Level = 10 + FLOOR((score - 20) / 5)
```

---

### Tier 3: Level 101 to 500 (Advanced)
**$10 = 1 Level**

```
Total $470   → Level 100
Total $480   → Level 101
Total $490   → Level 102
...
Total $4,470 → Level 500
```

**Formula:**
```
Level = 100 + FLOOR((score - 470) / 10)
```

---

### Tier 4: Level 501 to 1000 (Expert)
**$20 = 1 Level**

```
Total $4,470  → Level 500
Total $4,490  → Level 501
Total $4,510  → Level 502
...
Total $14,470 → Level 1000
```

**Formula:**
```
Level = 500 + FLOOR((score - 4470) / 20)
```

---

## 💰 Examples

### Example 1: New User (Tier 1)
```
User buys item for $2
Total Score = $2
Level = 1 + FLOOR(2/2) = Level 2 ✅

User sells item for $4
Total Score = $6
Level = 1 + FLOOR(6/2) = Level 4 ✅
```

### Example 2: Growing User (Tier 2)
```
User has $100 in transactions
Level = 10 + FLOOR((100 - 20) / 5)
Level = 10 + FLOOR(80 / 5)
Level = 10 + 16 = Level 26 ✅
```

### Example 3: Active User (Tier 3)
```
User has $2,000 in transactions
Level = 100 + FLOOR((2000 - 470) / 10)
Level = 100 + FLOOR(1530 / 10)
Level = 100 + 153 = Level 253 ✅
```

### Example 4: Power User (Tier 4)
```
User has $10,000 in transactions
Level = 500 + FLOOR((10000 - 4470) / 20)
Level = 500 + FLOOR(5530 / 20)
Level = 500 + 276 = Level 776 ✅
```

---

## 📈 Complete Progression Table

| Level | Total $ Needed | Activity Example |
|-------|---------------|------------------|
| 1 | $0 | New user |
| 2 | $2 | 1 small purchase |
| 5 | $8 | 4 small purchases |
| 10 | $20 | 10 small purchases |
| 15 | $45 | 9 × $5 purchases |
| 25 | $95 | Mixed buying/selling |
| 50 | $245 | Regular trader |
| 75 | $370 | Active trader |
| 100 | $470 | Experienced trader |
| 150 | $970 | Power trader |
| 200 | $1,470 | High volume |
| 300 | $2,470 | Very high volume |
| 400 | $3,470 | Expert trader |
| 500 | $4,470 | Master trader |
| 600 | $6,470 | Grand master |
| 700 | $8,470 | Legend |
| 800 | $10,470 | Elite legend |
| 900 | $12,470 | Top trader |
| 1000 | $14,470 | THE BEST |

---

## 🔄 How Score is Calculated

```
Total Score = BuyingScore + SellingScore + QualityBonus - Penalties

Where:
- BuyingScore = Sum of all completed purchases
- SellingScore = Sum of all completed sales
- QualityBonus = 5-star ratings × $5
- Penalties = Refunds × 20%
```

### Example Calculation

```
User Activity:
- Bought: $500 total
- Sold: $800 total
- 5-star ratings: 10
- Refunds: $100

Score Calculation:
BuyingScore = 500
SellingScore = 800
QualityBonus = 10 × 5 = 50
Penalties = 100 × 0.2 = 20

Total Score = 500 + 800 + 50 - 20 = 1,330

Level Calculation:
Total Score = 1,330 (in Tier 3: 470-4470)
Level = 100 + FLOOR((1330 - 470) / 10)
Level = 100 + FLOOR(860 / 10)
Level = 100 + 86 = Level 186 ✅
```

---

## 🗄️ Database Formula

The formula is implemented in the stored procedure:

```sql
-- Tiered level calculation
IF v_total_score < 20 THEN
  -- Level 1-10: $2 per level
  SET v_new_level = 1 + FLOOR(v_total_score / 2);
ELSEIF v_total_score < 470 THEN
  -- Level 11-100: $5 per level
  SET v_new_level = 10 + FLOOR((v_total_score - 20) / 5);
ELSEIF v_total_score < 4470 THEN
  -- Level 101-500: $10 per level
  SET v_new_level = 100 + FLOOR((v_total_score - 470) / 10);
ELSE
  -- Level 501-1000: $20 per level
  SET v_new_level = 500 + FLOOR((v_total_score - 4470) / 20);
END IF;
```

---

## ✅ Benefits of Tiered System

| Benefit | Explanation |
|---------|-------------|
| **Fast early progress** | Users reach Level 10 quickly (just $20) |
| **Meaningful mid-game** | Levels 11-100 require real activity |
| **Prestigious end-game** | Levels 500-1000 require serious commitment |
| **Balanced economy** | Higher levels = harder to achieve |
| **Clear progression** | Users understand "$X = 1 level" |

---

## 🎯 Comparison: Old vs New

### Old Formula (Exponential)
```
Level = FLOOR(1 + (Score/10)^0.6)

Level 10  = ~$150
Level 100 = ~$3,500
Level 500 = ~$35,000
Level 1000 = ~$158,000
```

### New Formula (Tiered) ✅
```
Level 10  = $20
Level 100 = $470
Level 500 = $4,470
Level 1000 = $14,470
```

**Why the new formula is better:**
- ✅ **Easier to understand** - "$2 = 1 level" is clear
- ✅ **Faster early progress** - Users see results quickly
- ✅ **More achievable** - $14,470 vs $158,000 for max level
- ✅ **Still prestigious** - Top levels require real commitment

---

## 📝 Summary

**Tier 1 (Level 1-10):** $2 = 1 level
**Tier 2 (Level 11-100):** $5 = 1 level
**Tier 3 (Level 101-500):** $10 = 1 level
**Tier 4 (Level 501-1000):** $20 = 1 level

**Total for Max Level:** $14,470

**Status:** ✅ Updated in SQL file
**Ready to Use:** Yes!

---

**ប្រើបានហើយ!** (Ready to use!) 🎉
