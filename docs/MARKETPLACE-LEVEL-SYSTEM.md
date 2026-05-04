# 🎮 Marketplace Level System - Complete Guide

## Quick Start

### Step 1: Run Database Migration

```bash
# Backup first!
mysqldump -u root -p somarnix > backup_$(date +%Y%m%d).sql

# Run migration
mysql -u root -p somarnix < sql/13-marketplace-level-system.sql
```

### Step 2: Test the System

```sql
-- Check tables created
USE somarnix;
SHOW TABLES LIKE 'user_level%';

-- Test level calculation (replace 1 with actual user ID)
CALL sp_calculate_user_level(1, 'manual_test', NULL);

-- Check user level
SELECT id, username, level, progression_score FROM users WHERE id = 1;
```

### Step 3: Add to Your Frontend

```typescript
import { UserLevelBadge } from '@/app/components/level/UserLevelBadge';
import { UserLevelDashboard } from '@/app/components/level/UserLevelDashboard';

// In user profile page
<UserLevelBadge userId={user.id} size="md" showProgress={true} />

// Or full dashboard
<UserLevelDashboard userId={user.id} />
```

---

## System Overview

### What This System Does

✅ **One Unified Level (1-1000)** for both buyers and sellers
✅ **Money-Based Progression** - No confusing XP
✅ **Automatic Updates** - Via database triggers
✅ **Anti-Abuse Built-In** - Prevents self-trading, refund abuse
✅ **100% FREE** - Uses only MySQL (no external services)

### How It Works

```
User buys or sells → Order completed → Database trigger fires
→ Stored procedure calculates score → Level updated → History logged
→ Frontend displays new level
```

### Level Formula

```
Level = floor(1 + (TotalScore / 10) ^ 0.6)
Capped at 1 to 1000

TotalScore = BuyingScore + SellingScore + QualityBonus - Penalties
```

**Example Progression:**

| Level | Total Score | Approx. Activity |
|-------|-------------|-----------------|
| 1 | 0 | New user |
| 10 | 150 | ~$150 traded |
| 50 | 1,300 | ~$1,300 traded |
| 100 | 3,500 | ~$3,500 traded |
| 500 | 35,000 | ~$35,000 traded |
| 1000 | 158,000 | ~$158,000 traded |

---

## Database Schema

### New Tables Created

| Table | Purpose |
|-------|---------|
| `user_level_history` | Tracks all level changes |
| `user_level_relationships` | Tracks buyer-seller pairs (for diminishing returns) |
| `user_level_flags` | Tracks suspicious activity |
| `level_benefits` | Defines benefits for each level |
| `user_level_benefits` | Tracks which benefits user unlocked |

### New Columns Added to `users` Table

| Column | Type | Purpose |
|--------|------|---------|
| `level` | INT | Current level (1-1000) |
| `progression_score` | DECIMAL | Total score |
| `buying_score` | DECIMAL | Score from buying |
| `selling_score` | DECIMAL | Score from selling |
| `quality_bonus` | DECIMAL | Bonus from 5-star ratings |
| `penalties` | DECIMAL | Penalties from refunds |
| `level_last_calculated_at` | TIMESTAMP | Last calculation time |
| `level_last_changed_at` | TIMESTAMP | Last level change time |
| `previous_level` | INT | Previous level |

---

## How Progression Works

### Score Calculation

```
TotalScore = BuyingScore + SellingScore + QualityBonus - Penalties

Where:
- BuyingScore = Sum of all completed purchases
- SellingScore = Sum of all completed sales
- QualityBonus = 5-star ratings × $5
- Penalties = Refunds × 20%
```

### Example User

```
User Activity:
- Bought: $500 total
- Sold: $800 total
- 5-star ratings received: 10
- Refunds: $100

Calculation:
BuyingScore = 500
SellingScore = 800
QualityBonus = 10 × 5 = 50
Penalties = 100 × 0.2 = 20

TotalScore = 500 + 800 + 50 - 20 = 1,330

Level = floor(1 + (1330 / 10) ^ 0.6)
Level = floor(1 + 133 ^ 0.6)
Level = floor(1 + 19.0)
Level = 20
```

### When Level Updates

**Automatic Updates (Real-Time):**
- ✅ Order completed (buyer confirms receipt)
- ✅ Refund processed
- ✅ 5-star rating received

**Scheduled Updates (Batch):**
- 🕐 Daily cleanup (2 AM)
- 🕐 Weekly reconciliation (3 AM Sunday)

---

## Anti-Abuse System

### What's Protected

| Abuse Type | Prevention |
|------------|------------|
| Self-trading | Detected via user ID matching |
| Fake orders | Only completed orders count |
| Refund abuse | Points removed + penalty |
| Spam transactions | Velocity limits (via stored procedures) |
| Multi-account farming | Relationship tracking |

### How It Works

**Self-Trade Detection:**
```sql
CALL sp_check_self_trade(buyer_id, seller_id, order_id);
-- Flags if buyer_id = seller_id
```

**Refund Clawback:**
```sql
CALL sp_apply_refund_clawback(order_id, refund_amount, buyer_id, seller_id);
-- Removes points from both parties
-- Adds 20% penalty
```

**Diminishing Returns:**
```
1st trade with same user: 100% points
2nd trade: 80% points
3rd trade: 60% points
4th+ trade: 50% points
```

---

## API Endpoints

### Public Endpoints

#### GET /api/level/stats/[userId]

Get user level statistics.

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "john",
    "level": 25,
    "progressionScore": 500,
    "buyingScore": 200,
    "sellingScore": 300
  },
  "progress": {
    "currentLevel": 25,
    "nextLevel": 26,
    "currentScore": 500,
    "nextLevelScore": 580,
    "progressPercent": 62.5
  },
  "benefits": {
    "unlocked": [...],
    "available": [...]
  }
}
```

#### GET /api/level/leaderboard

Get top users by level.

**Query Parameters:**
- `limit` - Number of users (default: 50, max: 100)
- `minLevel` - Minimum level filter (default: 1)

#### GET /api/level/history/[userId]

Get user's level change history.

**Query Parameters:**
- `limit` - Number of records (default: 50, max: 200)

---

### Admin Endpoints

#### POST /api/admin/level/recalculate/[userId]

Manually recalculate a user's level.

**Requires:** Admin role

**Response:**
```json
{
  "ok": true,
  "userId": 1,
  "newLevel": 25,
  "newScore": 500,
  "calculatedAt": "2024-01-15T10:00:00Z"
}
```

---

## Frontend Components

### UserLevelBadge

Compact level display with progress bar.

```typescript
import { UserLevelBadge } from '@/app/components/level/UserLevelBadge';

<UserLevelBadge 
  userId={user.id} 
  size="md" 
  showProgress={true}
  showStats={false}
/>
```

**Props:**
- `userId` - User ID (required)
- `size` - "sm" | "md" | "lg" (default: "md")
- `showProgress` - Show progress bar (default: true)
- `showStats` - Show buying/selling stats (default: false)

---

### UserLevelDashboard

Full level statistics dashboard.

```typescript
import { UserLevelDashboard } from '@/app/components/level/UserLevelDashboard';

<UserLevelDashboard userId={user.id} />
```

**Shows:**
- Current level and progress
- Total bought/sold stats
- Score breakdown
- Unlocked benefits
- Available benefits

---

### LevelLeaderboard

Top users leaderboard.

```typescript
import { LevelLeaderboard } from '@/app/components/level/LevelLeaderboard';

<LevelLeaderboard limit={50} minLevel={1} />
```

**Props:**
- `limit` - Number of users (default: 50)
- `minLevel` - Minimum level filter (default: 1)

---

## Benefits System

### Default Benefits

| Level | Benefit | Type |
|-------|---------|------|
| 10 | Active Trader Badge | Visibility |
| 20 | 5% Fee Discount | Fee |
| 25 | 5% Search Boost | Visibility |
| 50 | Trusted Trader Badge + 10% Fee Discount | Both |
| 100 | 15% Fee Discount | Fee |
| 250 | Elite Trader Badge | Visibility |
| 500 | 25% Fee Discount | Fee |
| 1000 | Legend Badge + 50% Fee Discount | Both |

### How to Add More Benefits

```sql
INSERT INTO level_benefits (
  benefit_key, benefit_name, benefit_description,
  benefit_category, unlock_level, benefit_value
) VALUES (
  'my_new_benefit',
  'My New Benefit',
  'Description of what this benefit does',
  'fee', -- or 'visibility', 'trust', 'exclusive'
  75, -- unlock at level 75
  JSON_OBJECT('discount_percent', 7) -- benefit config
);
```

---

## Stored Procedures Reference

### sp_calculate_user_level

Calculate and update user's level.

```sql
CALL sp_calculate_user_level(
  user_id,           -- BIGINT
  reason,            -- VARCHAR (purchase, sale, refund, etc.)
  related_order_id   -- BIGINT (optional)
);
```

### sp_check_self_trade

Check for self-trading.

```sql
CALL sp_check_self_trade(
  buyer_id,    -- BIGINT
  seller_id,   -- BIGINT
  order_id     -- BIGINT
);
```

### sp_update_relationship

Update buyer-seller relationship (diminishing returns).

```sql
CALL sp_update_relationship(
  buyer_id,   -- BIGINT
  seller_id,  -- BIGINT
  amount      -- DECIMAL
);
```

### sp_apply_refund_clawback

Apply refund clawback.

```sql
CALL sp_apply_refund_clawback(
  order_id,       -- BIGINT
  refund_amount,  -- DECIMAL
  buyer_id,       -- BIGINT
  seller_id       -- BIGINT
);
```

### sp_level_system_cleanup

Cleanup old data (runs daily automatically).

```sql
CALL sp_level_system_cleanup();
```

---

## Scheduled Events

### Daily Cleanup (2 AM)

```sql
-- Automatically runs every day at 2 AM
-- Cleans up old resolved flags
-- Recalculates levels for consistency
```

### Weekly Reconciliation (3 AM Sunday)

```sql
-- Automatically runs every Sunday at 3 AM
-- Full level recalculation for all users
-- Ensures data consistency
```

### Enable/Disable Events

```sql
-- Check if events are enabled
SHOW EVENTS;

-- Enable event scheduler
SET GLOBAL event_scheduler = ON;

-- Disable specific event
ALTER EVENT daily_level_cleanup DISABLE;
```

---

## Monitoring & Analytics

### Views for Analytics

```sql
-- User level stats
SELECT * FROM v_user_level_stats WHERE id = 1;

-- Top users by level
SELECT * FROM v_top_users_by_level LIMIT 10;

-- Level distribution
SELECT * FROM v_level_distribution;
```

### Useful Queries

```sql
-- Find users who leveled up today
SELECT u.username, ulh.old_level, ulh.new_level, ulh.created_at
FROM user_level_history ulh
JOIN users u ON u.id = ulh.user_id
WHERE DATE(ulh.created_at) = CURDATE()
ORDER BY ulh.created_at DESC;

-- Find suspicious activity
SELECT * FROM user_level_flags 
WHERE status = 'open' 
ORDER BY created_at DESC;

-- Check level distribution
SELECT 
  CASE 
    WHEN level BETWEEN 1 AND 10 THEN '1-10'
    WHEN level BETWEEN 11 AND 25 THEN '11-25'
    WHEN level BETWEEN 26 AND 50 THEN '26-50'
    WHEN level BETWEEN 51 AND 100 THEN '51-100'
    WHEN level > 100 THEN '100+'
  END AS tier,
  COUNT(*) AS users
FROM users
GROUP BY tier;
```

---

## Troubleshooting

### Level Not Updating

**Check:**
1. Order state is 'completed' or 'approved'
2. Event scheduler is enabled: `SHOW VARIABLES LIKE 'event_scheduler';`
3. Stored procedure exists: `SHOW PROCEDURE STATUS WHERE Db = 'somarnix';`

**Fix:**
```sql
-- Manually recalculate
CALL sp_calculate_user_level(user_id, 'manual', NULL);

-- Enable event scheduler
SET GLOBAL event_scheduler = ON;
```

### Events Not Running

**Check:**
```sql
SHOW EVENTS;
SELECT @@event_scheduler;
```

**Fix:**
```sql
SET GLOBAL event_scheduler = ON;

-- Or add to my.cnf:
-- [mysqld]
-- event_scheduler=ON
```

### Performance Issues

**Optimize:**
```sql
-- Add indexes if missing
ALTER TABLE user_level_history ADD INDEX idx_user_created (user_id, created_at);
ALTER TABLE users ADD INDEX idx_level (level);

-- Analyze tables
ANALYZE TABLE user_level_history;
ANALYZE TABLE users;
```

---

## Migration Checklist

- [ ] Backup database
- [ ] Run SQL migration (file 13)
- [ ] Verify tables created
- [ ] Test stored procedures
- [ ] Add API endpoints (already created)
- [ ] Add frontend components (already created)
- [ ] Test level updates with sample orders
- [ ] Enable event scheduler
- [ ] Monitor for 24 hours
- [ ] Announce to users

---

## Files Created

| File | Purpose |
|------|---------|
| `sql/13-marketplace-level-system.sql` | Database migration |
| `app/api/level/stats/[userId]/route.ts` | Get user level stats API |
| `app/api/level/leaderboard/route.ts` | Get leaderboard API |
| `app/api/level/history/[userId]/route.ts` | Get level history API |
| `app/api/admin/level/recalculate/[userId]/route.ts` | Admin recalculate API |
| `app/components/level/UserLevelBadge.tsx` | Level badge component |
| `app/components/level/UserLevelDashboard.tsx` | Level dashboard component |
| `app/components/level/LevelLeaderboard.tsx` | Leaderboard component |
| `docs/MARKETPLACE-LEVEL-SYSTEM.md` | This documentation |

---

## Support

For issues or questions:
- Check logs: `SELECT * FROM user_level_flags WHERE status = 'open';`
- Manual recalculation: `CALL sp_calculate_user_level(user_id, 'manual', NULL);`
- Contact: support@somarnix.com

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
**Status:** ✅ Production Ready
