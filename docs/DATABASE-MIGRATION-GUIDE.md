# 🗄️ Database Migration Guide - Tools & Licensing System

## ⚠️ IMPORTANT: Safe Migration for Existing Databases

This migration is **100% safe for production** - it will NOT drop or modify your existing data.

---

## Existing SQL Files Overview

Your project has these SQL files:

| File | Purpose | Status |
|------|---------|--------|
| `04-tools-and-licenses.sql` | Core license tables | ✅ Keep as-is |
| `11-tool-definitions.sql` | Tool definitions table | ✅ Keep as-is |
| `12-enhanced-tools-licenses.sql` | **NEW - This migration** | 📝 Run this |

### What Each File Creates

**04-tools-and-licenses.sql:**
- `tool_variants` - Product pricing variants
- `tool_device_access` - Device tracking
- `tool_license_keys` - License key storage
- `tool_license_activations` - Device activations
- `license_audit_logs` - Audit trail
- `license_failed_attempts` - Failed login tracking

**11-tool-definitions.sql:**
- `tool_definitions` - Tool metadata
- `tool_route_aliases` - URL aliases

**12-enhanced-tools-licenses.sql (NEW):**
- `tool_download_tokens` - Secure download URLs ✨ NEW
- `license_rate_limits` - Rate limiting ✨ NEW
- `device_fingerprints` - Device identification ✨ NEW
- `tool_access_stats` - Analytics ✨ NEW
- Enhanced columns for `tool_definitions` ✨ ENHANCED
- Enhanced columns for `license_audit_logs` ✨ ENHANCED
- Views for admin dashboard ✨ NEW
- Stored procedures ✨ NEW

---

## Migration Steps

### Step 1: Backup Your Database (IMPORTANT!)

```bash
# Create backup before migration
mysqldump -u root -p somarnix > backup_before_migration_$(date +%Y%m%d).sql

# Verify backup exists
ls -lh backup_before_migration_*.sql
```

### Step 2: Run the Migration

```bash
# Connect to MySQL
mysql -u root -p

# Select database
USE somarnix;

# Run migration
SOURCE sql/12-enhanced-tools-licenses.sql;
```

### Step 3: Verify Migration

```sql
-- Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'somarnix' 
  AND table_name IN (
    'tool_download_tokens',
    'license_rate_limits', 
    'device_fingerprints',
    'tool_access_stats'
  );

-- Should return 4 rows

-- Check tool_definitions has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'somarnix' 
  AND table_name = 'tool_definitions'
  AND column_name IN (
    'tool_category', 'platform', 'default_device_limit',
    'max_device_limit', 'allow_offline_mode', 'storage_provider',
    'current_version', 'is_featured', 'is_beta', 'sort_order'
  );

-- Should return 10 rows

-- Check views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'somarnix' 
  AND table_name IN (
    'v_active_licenses_summary',
    'v_recent_activations',
    'v_download_stats'
  );

-- Should return 3 rows
```

### Step 4: Test Stored Procedures

```sql
-- Test cleanup procedure (safe - won't delete anything if nothing expired)
CALL sp_cleanup_expired_tokens();

-- Should return deleted_count = 0 if nothing to clean
```

---

## What This Migration Does

### ✅ Safe Operations (Non-Destructive)

1. **Creates NEW tables only**
   - `CREATE TABLE IF NOT EXISTS` - won't fail if table exists
   - No `DROP TABLE` statements

2. **Adds NEW columns to existing tables**
   - `ADD COLUMN IF NOT EXISTS` - won't fail if column exists
   - No column modifications or deletions

3. **Creates views**
   - `CREATE OR REPLACE VIEW` - safe to run multiple times

4. **Creates stored procedures**
   - `CREATE PROCEDURE IF NOT EXISTS` - won't duplicate

5. **Adds indexes**
   - `ADD INDEX IF NOT EXISTS` - won't duplicate

### ❌ What This Migration Does NOT Do

- ❌ Does NOT drop any tables
- ❌ Does NOT drop any columns
- ❌ Does NOT modify existing data
- ❌ Does NOT change existing column types
- ❌ Does NOT remove foreign keys

---

## Rollback Plan (If Needed)

If you need to rollback:

```sql
-- Drop NEW tables only (created by this migration)
DROP TABLE IF EXISTS tool_download_tokens;
DROP TABLE IF EXISTS license_rate_limits;
DROP TABLE IF EXISTS device_fingerprints;
DROP TABLE IF EXISTS tool_access_stats;

-- Drop views
DROP VIEW IF EXISTS v_active_licenses_summary;
DROP VIEW IF EXISTS v_recent_activations;
DROP VIEW IF EXISTS v_download_stats;

-- Drop stored procedures
DROP PROCEDURE IF EXISTS sp_create_tool_license;
DROP PROCEDURE IF EXISTS sp_revoke_tool_license;
DROP PROCEDURE IF EXISTS sp_remove_device_from_license;
DROP PROCEDURE IF EXISTS sp_cleanup_expired_tokens;

-- Note: We DO NOT drop columns from tool_definitions or license_audit_logs
-- as they may be referenced by application code
```

---

## Post-Migration Setup

### 1. Add Environment Variables

Add to `.env.local`:

```bash
# Tool Licensing (REQUIRED - min 32 characters)
TOOL_LICENSE_SECRET=change_this_to_a_very_long_random_string_min_32_chars

# Cloudflare R2 Storage (for secure downloads)
STORAGE_R2_ACCOUNT_ID=your_r2_account_id
STORAGE_R2_BUCKET=your-tools-bucket
STORAGE_R2_ACCESS_KEY=your_r2_access_key
STORAGE_R2_SECRET_KEY=your_r2_secret_key
STORAGE_R2_PUBLIC_URL=https://your-bucket.your-r2-endpoint
```

### 2. Set Up Cleanup Cron Job

The stored procedure `sp_cleanup_expired_tokens` should be called periodically to clean up expired download tokens and rate limit blocks.

**Linux/Unix (crontab):**
```bash
# Edit crontab
crontab -e

# Add hourly cleanup
0 * * * * mysql -u root -p'your_password' -e "CALL somarnix.sp_cleanup_expired_tokens();"
```

**Windows (Task Scheduler):**
```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "mysql" -Argument "-u root -p'password' -e `"CALL somarnix.sp_cleanup_expired_tokens();`""
$trigger = New-ScheduledTaskTrigger -Hourly -At 0
Register-ScheduledTask -TaskName "SOMARNIX License Cleanup" -Action $action -Trigger $trigger
```

### 3. Verify Application Works

```bash
# Run development server
npm run dev

# Test API endpoints
curl http://localhost:3000/api/tools/definition/list

# Should return JSON with tools array
```

---

## Troubleshooting

### Error: "Column already exists"

This is normal if you've already added some columns manually. The migration uses `IF NOT EXISTS` so it will skip those columns and continue.

### Error: "Table already exists"

This is normal if you've already created some tables. The migration uses `IF NOT EXISTS` so it will skip those tables and continue.

### Error: "Foreign key constraint fails"

Make sure you have run the previous migration files first:
1. `04-tools-and-licenses.sql`
2. `11-tool-definitions.sql`

The new migration depends on tables from these files.

### Stored procedure already exists

The migration uses `CREATE PROCEDURE IF NOT EXISTS` so it will skip existing procedures. If you want to update them, run:

```sql
DROP PROCEDURE IF EXISTS sp_create_tool_license;
DROP PROCEDURE IF EXISTS sp_revoke_tool_license;
DROP PROCEDURE IF EXISTS sp_remove_device_from_license;
DROP PROCEDURE IF EXISTS sp_cleanup_expired_tokens;

-- Then re-run the migration
SOURCE sql/12-enhanced-tools-licenses.sql;
```

---

## Database Schema After Migration

### New Tables (4)

```
tool_download_tokens
├── id (BIGINT, PK)
├── user_id (BIGINT, FK → users)
├── license_id (BIGINT, FK → tool_license_keys)
├── tool_definition_id (BIGINT, FK → tool_definitions)
├── token (VARCHAR 128, UNIQUE)
├── file_path (VARCHAR 500)
├── file_name (VARCHAR 255)
├── max_downloads (INT)
├── used_count (INT)
├── expires_at (DATETIME)
├── ip_address (VARCHAR 64)
├── user_agent (VARCHAR 500)
├── created_at (TIMESTAMP)
└── first_used_at (TIMESTAMP)

license_rate_limits
├── id (BIGINT, PK)
├── license_key_hash (CHAR 64)
├── ip_address (VARCHAR 64)
├── device_id (VARCHAR 128)
├── action_type (ENUM: validate/activate/download/heartbeat)
├── request_count (INT)
├── last_request_at (DATETIME)
├── blocked_until (DATETIME)
├── permanent_block (TINYINT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

device_fingerprints
├── id (BIGINT, PK)
├── user_id (BIGINT, FK → users)
├── device_id (VARCHAR 128)
├── fingerprint_hash (CHAR 64)
├── platform (ENUM: windows/macos/linux/android/ios/web)
├── platform_version (VARCHAR 50)
├── app_version (VARCHAR 50)
├── cpu_cores (INT)
├── total_memory_gb (INT)
├── screen_resolution (VARCHAR 20)
├── trust_score (INT)
├── is_suspicious (TINYINT)
├── suspicion_reason (VARCHAR 255)
├── first_seen_at (TIMESTAMP)
└── last_seen_at (TIMESTAMP)

tool_access_stats
├── id (BIGINT, PK)
├── tool_definition_id (BIGINT, FK → tool_definitions)
├── user_id (BIGINT, FK → users)
├── license_id (BIGINT, FK → tool_license_keys)
├── access_date (DATE)
├── access_count (INT)
└── last_access_at (DATETIME)
```

### Enhanced Tables (2)

```
tool_definitions (NEW COLUMNS)
├── ... (existing columns from file 11)
├── short_description (VARCHAR 500) ✨
├── long_description (TEXT) ✨
├── tool_category (ENUM) ✨
├── platform (ENUM) ✨
├── requires_license (TINYINT) ✨
├── default_device_limit (INT) ✨
├── max_device_limit (INT) ✨
├── default_license_duration_days (INT) ✨
├── allow_offline_mode (TINYINT) ✨
├── offline_grace_period_hours (INT) ✨
├── storage_provider (ENUM) ✨
├── storage_bucket (VARCHAR 100) ✨
├── storage_key_prefix (VARCHAR 255) ✨
├── file_extension (VARCHAR 20) ✨
├── api_endpoint (VARCHAR 255) ✨
├── current_version (VARCHAR 50) ✨
├── version_changelog (TEXT) ✨
├── min_client_version (VARCHAR 50) ✨
├── is_featured (TINYINT) ✨
├── is_beta (TINYINT) ✨
├── sort_order (INT) ✨
└── published_at (TIMESTAMP) ✨

license_audit_logs (NEW COLUMNS)
├── ... (existing columns from file 04)
├── ip_address (VARCHAR 64) ✨
├── device_id (VARCHAR 128) ✨
└── metadata (JSON) ✨
```

### Views (3)

```
v_active_licenses_summary
- Aggregates license counts by tool
- Shows active/revoked/expired counts
- Shows total active devices

v_recent_activations
- Last 100 license activations
- Shows user, device, timestamps

v_download_stats
- Download counts by tool
- Unique downloaders
- Last download date
```

---

## Migration Checklist

- [ ] Backup database
- [ ] Run migration
- [ ] Verify new tables exist (4 tables)
- [ ] Verify new columns added (10+ columns)
- [ ] Verify views created (3 views)
- [ ] Verify stored procedures created (4 procedures)
- [ ] Add environment variables to .env.local
- [ ] Set up cleanup cron job
- [ ] Test API endpoints
- [ ] Monitor for errors

---

## Support

If you encounter issues:

1. Check the error message
2. Verify previous migrations were run (04, 11)
3. Check foreign key constraints
4. Restore from backup if needed

For help:
- Email: support@somarnix.com
- Telegram: @somarnix_support

---

**Last Updated:** 2024-01-15
**Migration Version:** 12
**Status:** ✅ Production Safe
