# 🎮 Level System - Simple Guide (LEVELS ONLY - No Discounts)

## ✅ What This System Does

✅ **One Unified Level (1-1000)** for buyers and sellers
✅ **Pure Level Progression** - No XP, no discounts, no benefits
✅ **Visual Badges** - Show level tier on profile (bragging rights only)
✅ **Automatic Updates** - Database triggers update level instantly
✅ **100% FREE** - MySQL only, no external services

## ❌ What This System Does NOT Do

❌ No fee discounts
❌ No search boosts
❌ No special perks or benefits
❌ No functional advantages

**This is a PURE LEVEL system** - users level up based on activity, and get visual badges to show their level. That's it.

---

## 🚀 3-Step Setup

### Step 1: Run Database Migration

```bash
# Backup first!
mysqldump -u root -p gstechedukh > backup_$(date +%Y%m%d).sql

# Run migration
mysql -u root -p gstechedukh < sql/13-marketplace-level-system.sql
```

### Step 2: Test It

```sql
-- Connect
mysql -u root -p gstechedukh

-- Test level calculation (replace 1 with actual user ID)
CALL sp_calculate_user_level(1, 'test', NULL);

-- Check result
SELECT id, username, level, progression_score FROM users WHERE id = 1;
```

### Step 3: Add to Frontend

```typescript
import { UserLevelBadge } from '@/app/components/level/UserLevelBadge';

// Show user's level
<UserLevelBadge userId={user.id} size="md" showProgress={true} />
```

**Done!** 🎉

---

## 📊 Level System Details

### How Level is Calculated

```
Level = floor(1 + (TotalScore / 10) ^ 0.6)
Capped at 1 to 1000

TotalScore = BuyingScore + SellingScore
```

**That's it!** No bonuses, no penalties, no complexity.

### Examples

| User Activity | Total Score | Level |
|--------------|-------------|-------|
| New user | 0 | 1 |
| Bought $50 + Sold $100 | 150 | 10 |
| Bought $500 + Sold $800 | 1,300 | 50 |
| Bought $2,000 + Sold $1,500 | 3,500 | 100 |
| Bought $20,000 + Sold $15,000 | 35,000 | 500 |
| Bought $80,000 + Sold $78,000 | 158,000 | 1000 |

---

## 🏆 Level Badges (Visual Only)

Users get badges at these levels:

| Level | Badge Name | Color |
|-------|-----------|-------|
| 10 | Level 10 Badge | Gray |
| 25 | Level 25 Badge | Bronze |
| 50 | Level 50 Badge | Silver |
| 100 | Level 100 Badge | Gold |
| 250 | Level 250 Badge | Platinum |
| 500 | Level 500 Badge | Diamond |
| 1000 | Level 1000 Badge | Legendary |

**Badges are for display only** - no functional benefits.

---

## 📱 API Endpoints

### Get User Level

```typescript
const res = await fetch(`/api/level/stats/${userId}`);
const data = await res.json();

console.log(data.user.level); // 25
console.log(data.user.progressionScore); // 500
```

### Get Leaderboard

```typescript
const res = await fetch('/api/level/leaderboard?limit=50');
const data = await res.json();

console.log(data.leaderboard[0].username); // Top user
console.log(data.leaderboard[0].level); // Highest level
```

---

## 🎯 When Level Updates

**Automatic (Real-Time):**
- ✅ Order completed
- ✅ Order approved (past refund window)

**Not Counted:**
- ❌ Pending orders
- ❌ Cancelled orders
- ❌ Refunded orders

---

## 🛡️ Anti-Abuse

| Abuse | Prevention |
|-------|------------|
| Self-trading | Detected and flagged |
| Fake orders | Only completed orders count |
| Refund abuse | Points removed |

---

## 📚 Files Created

| File | Purpose |
|------|---------|
| `sql/13-marketplace-level-system.sql` | Database migration |
| `app/api/level/stats/[userId]/route.ts` | Get user level |
| `app/api/level/leaderboard/route.ts` | Get leaderboard |
| `app/api/level/history/[userId]/route.ts` | Get level history |
| `app/components/level/UserLevelBadge.tsx` | Level badge component |
| `app/components/level/UserLevelDashboard.tsx` | Level dashboard |
| `app/components/level/LevelLeaderboard.tsx` | Leaderboard |

---

## ✅ Summary

**What you get:**
- One unified level (1-1000)
- Automatic level updates
- Visual badges for milestones
- Leaderboard to show top users
- Level history tracking

**What you DON'T get:**
- No fee discounts
- No search boosts
- No special perks
- No functional benefits

**This is perfect if you just want:**
- Users to have a level
- Show activity on profile
- Bragging rights via badges
- Competition via leaderboard

---

## 💡 Want to Add Benefits Later?

You can add fee discounts or other benefits anytime by inserting into the `level_benefits` table:

```sql
INSERT INTO level_benefits (
  benefit_key, benefit_name, benefit_description,
  benefit_category, unlock_level, benefit_value
) VALUES (
  'my_discount',
  '10% Fee Discount',
  'Save 10% on seller fees',
  'fee',
  50,
  JSON_OBJECT('discount_percent', 10)
);
```

But for now, **this is a pure level system only** - exactly what you asked for!

---

**Setup Time:** 10 minutes
**Cost:** $0 (MySQL only)
**Status:** ✅ Ready to use
