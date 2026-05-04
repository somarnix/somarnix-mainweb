# 🔒 Tools & Licensing System - Security Guide

## Executive Summary

This document provides a complete security model for the SOMARNIX tools and licensing system. It covers architecture, threat models, protection strategies, and implementation guidelines.

---

## 1. Security Architecture Overview

### 1.1 Core Principles

1. **Never Trust the Client** - All license validation happens server-side
2. **Defense in Depth** - Multiple layers of protection
3. **Minimal Secrets** - No secrets in frontend code
4. **Short-Lived Tokens** - All tokens expire quickly
5. **Audit Everything** - Complete audit trail for all actions

### 1.2 Trust Boundaries

```
┌────────────────────────────────────────────────────────────┐
│                    UNTRUSTED ZONE                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Browser    │  │  EXE/DLL     │  │  APK/IPA     │    │
│  │   (Web)      │  │  (Desktop)   │  │  (Mobile)    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                 │                  │             │
│         └─────────────────┼──────────────────┘             │
│                           │                                │
│                    [CAN BE COMPROMISED]                    │
└───────────────────────────┼────────────────────────────────┘
                            │
                            ▼ API Calls (HTTPS Only)
┌────────────────────────────────────────────────────────────┐
│                    TRUSTED ZONE                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              Backend API (Next.js)                   │ │
│  │  - Validates all requests                            │ │
│  │  - Enforces rate limits                              │ │
│  │  - Checks license status                             │ │
│  │  - Generates signed URLs                             │ │
│  └──────────────────────────────────────────────────────┘ │
│                            │                               │
│                            ▼                               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              Database (MySQL)                        │ │
│  │  - Stores license keys (hashed)                      │ │
│  │  - Tracks device activations                         │ │
│  │  - Audit logs                                        │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Threat Model

### 2.1 What Can Be Secured Strongly ✅

| Asset | Protection Level | Method |
|-------|-----------------|--------|
| **Web Tools** | ⭐⭐⭐⭐⭐ | Server-side validation, JWT tokens |
| **Download URLs** | ⭐⭐⭐⭐⭐ | Short-lived signed URLs |
| **License Keys** | ⭐⭐⭐⭐ | Hashed storage, rate limiting |
| **Device Limits** | ⭐⭐⭐⭐ | Server-side enforcement |
| **Admin Operations** | ⭐⭐⭐⭐⭐ | Role-based access, audit logs |

### 2.2 What Cannot Be Fully Secured ⚠️

| Asset | Risk Level | Reality Check |
|-------|-----------|---------------|
| **Offline PC Tools** | 🔴 HIGH | Will be cracked by determined attackers |
| **APK Files** | 🟡 MEDIUM-HIGH | Can be decompiled and patched |
| **Python Scripts** | 🔴 HIGH | Source code is accessible |
| **EXE Files** | 🟡 MEDIUM | Can be reverse engineered |
| **Client-Side Checks** | 🔴 HIGH | Always bypassable |

### 2.3 Hacker Attack Vectors

#### A. Browser/Web Tools

**Attack:** Bypass license check in browser console
```javascript
// Attacker tries:
localStorage.setItem('license_valid', 'true');
```

**Defense:**
- License validation happens on server
- Every API call requires valid JWT token
- Token is validated server-side on every request
- Frontend state is irrelevant

**Residual Risk:** LOW - Server controls access

#### B. Downloadable EXE Tools

**Attack:** Patch binary to skip license check
```
Original: if (!license_valid) exit();
Patched:  if (!license_valid) ; // NOP
```

**Defense:**
1. Multiple license checks throughout code
2. Integrity checks (detect patched binary)
3. Code obfuscation (ConfuserEx, VMProtect)
4. Native code for critical checks (C/C++)
5. **Most Important:** Put valuable features server-side

**Residual Risk:** HIGH - Determined attackers will succeed

#### C. Python Tools

**Attack:** Extract and modify source code
```bash
# Attacker can:
unzip tool.zip
cat license_check.py  # Source is visible!
# Modify and redistribute
```

**Defense:**
1. Compile to .pyc (not secure, just harder)
2. Use Cython to create native extensions
3. Keep critical logic server-side
4. Require online activation

**Residual Risk:** VERY HIGH - Python is inherently insecure

#### D. APK/Mobile Tools

**Attack:** Decompile, patch, repackage
```bash
apktool d tool.apk
# Modify smali code
apktool b tool.apk
# Resign and redistribute
```

**Defense:**
1. Play Integrity API (Android)
2. App Attest (iOS)
3. NDK for critical code (C++)
4. Certificate pinning
5. Root/jailbreak detection

**Residual Risk:** MEDIUM-HIGH

---

## 3. Protection Strategies by Tool Type

### 3.1 Web Tools (Most Secure)

```
┌─────────────────────────────────────────────────────────┐
│                    WEB TOOL FLOW                        │
└─────────────────────────────────────────────────────────┘

User → [Website] → Check License → [API] → Validate → [DB]
                              ↓
                        Return JWT Token
                              ↓
User → [Tool UI] → API Call + Token → [API] → Validate → Execute
```

**Protection:**
- Every API call validates JWT token
- Token expires in 24 hours
- Rate limiting per license
- Device fingerprinting

**Implementation:**
```typescript
// Frontend: Check license before rendering tool
const { isValid, token } = useToolLicense({ slug: 'my-tool' });

if (!isValid) {
  return <LicenseRequired />;
}

// Backend: Validate on every API call
const payload = verifyToolLicenseToken(token);
if (!payload || payload.slug !== 'my-tool') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

### 3.2 Downloadable Tools (Online Required)

```
┌─────────────────────────────────────────────────────────┐
│                DOWNLOADABLE TOOL FLOW                   │
└─────────────────────────────────────────────────────────┘

1. Purchase → Create License → [DB]
2. Request Download → Validate License → Signed URL
3. Download File → One-time token
4. First Run → Activate → Server validates → Return JWT
5. Every 24h → Heartbeat → Keep alive
6. No Heartbeat → Token expires → Require re-activation
```

**Protection:**
- Download requires valid license
- First run requires online activation
- Periodic re-validation (every 24-72 hours)
- Server can revoke access

**Implementation:**
```typescript
// Desktop app: Activate on first run
async function activate(licenseKey: string) {
  const deviceId = getMachineId();
  const response = await fetch('https://api.yoursite.com/license/activate', {
    method: 'POST',
    body: JSON.stringify({
      slug: 'my-tool',
      licenseKey,
      deviceId,
    }),
  });
  
  const data = await response.json();
  if (data.token) {
    // Store token securely (Windows: DPAPI, macOS: Keychain)
    saveTokenSecurely(data.token);
  }
}

// Before each operation
async function validateToken() {
  const token = getToken();
  const response = await fetch('https://api.yoursite.com/license/validate', {
    method: 'POST',
    body: JSON.stringify({ token, deviceId: getMachineId() }),
  });
  
  const data = await response.json();
  return data.valid; // If false, require re-activation
}
```

### 3.3 Offline Tools (Least Secure)

```
┌─────────────────────────────────────────────────────────┐
│                  OFFLINE TOOL FLOW                      │
└─────────────────────────────────────────────────────────┘

1. Online Activation → Server returns:
   - Signed offline payload
   - Next check date (e.g., 14 days)
   
2. Offline Period (0-14 days):
   - Tool works without internet
   - Validates signature locally
   
3. After Next Check Date:
   - Require online re-validation
   - Server checks if license still valid
```

**Protection:**
- Cryptographic signature (HMAC-SHA256)
- Time-limited offline period
- Must phone home eventually

**Implementation:**
```typescript
// Server: Generate offline payload
const offlinePayload = {
  licenseId: 123,
  userId: 456,
  productId: 789,
  slug: 'my-offline-tool',
  machineId: 'device-abc',
  expiresAt: '2024-12-31T23:59:59Z',
  nextCheckAt: '2024-01-15T00:00:00Z', // 14 days from now
};

const signature = createHmac('sha256', SECRET)
  .update(JSON.stringify(offlinePayload))
  .digest('base64');

// Desktop app: Validate offline
function validateOffline(payload: any, signature: string): boolean {
  // Verify signature
  const expectedSignature = createHmac('sha256', SECRET)
    .update(JSON.stringify(payload))
    .digest('base64');
  
  if (signature !== expectedSignature) {
    return false; // Tampered!
  }
  
  // Check dates
  const now = new Date();
  const expiresAt = new Date(payload.expiresAt);
  const nextCheckAt = new Date(payload.nextCheckAt);
  
  if (now > expiresAt) {
    return false; // Expired
  }
  
  if (now > nextCheckAt) {
    return false; // Need online check
  }
  
  return true;
}
```

**Honest Assessment:**
> ⚠️ **Offline tools WILL be cracked.** The goal is not to make them uncrackable (impossible) but to:
> 1. Make cracking economically unviable
> 2. Stop casual piracy
> 3. Require occasional online check for updates/revocation

---

## 4. Security Implementation Checklist

### 4.1 Backend Security

- [ ] JWT secret stored in environment variable (min 32 chars)
- [ ] All license validation is server-side
- [ ] Rate limiting on all license endpoints
- [ ] IP-based blocking for suspicious activity
- [ ] Audit logging for all license operations
- [ ] Short-lived tokens (24h max)
- [ ] Signed URLs for downloads (15 min expiry)
- [ ] Input validation on all endpoints
- [ ] HTTPS enforced everywhere

### 4.2 Frontend Security

- [ ] No secrets in frontend code
- [ ] License tokens stored securely (not in plain localStorage for desktop)
- [ ] Token refresh before expiry
- [ ] Graceful handling of license errors
- [ ] No client-side license enforcement (always verify server)

### 4.3 Desktop App Security

- [ ] Code obfuscation (ConfuserEx, VMProtect, etc.)
- [ ] Multiple license check points
- [ ] Integrity checks (detect patched binary)
- [ ] Secure token storage (DPAPI, Keychain)
- [ ] Certificate pinning for API calls
- [ ] Native code for critical checks (C++ DLL)

### 4.4 Mobile App Security

- [ ] Play Integrity API (Android)
- [ ] App Attest (iOS)
- [ ] Root/jailbreak detection
- [ ] Certificate pinning
- [ ] NDK for critical code
- [ ] Obfuscation (R8/ProGuard)

---

## 5. Rate Limiting Strategy

### 5.1 Default Limits

| Endpoint | Max Requests | Window | Block Duration |
|----------|-------------|--------|----------------|
| `/api/license/activate` | 10 | 60s | 15 min |
| `/api/license/validate` | 100 | 60s | 15 min |
| `/api/license/refresh` | 10 | 60s | 15 min |
| `/api/tools/download` | 5 | 60s | 15 min |
| `/api/device/heartbeat` | 30 | 60s | 15 min |

### 5.2 Escalating Penalties

```
1st offense (10 failed attempts) → 15 min block
2nd offense → 1 hour block
3rd offense → 24 hour block
4th offense → Permanent block + license revocation
```

### 5.3 Implementation

```typescript
// Check rate limit before processing
const rateLimit = await checkRateLimit(
  licenseKey,
  ip,
  deviceId,
  'activate',
  10,  // max requests
  60   // window (seconds)
);

if (!rateLimit.allowed) {
  return NextResponse.json({
    error: 'Too many attempts',
    retryAfter: rateLimit.retryAfter,
  }, { status: 429 });
}
```

---

## 6. Incident Response

### 6.1 Detecting Abuse

Monitor for:
- Multiple failed activation attempts
- Same license used from many IPs
- Same IP trying many license keys
- Unusual device patterns (emulators, VMs)
- Rapid download requests

### 6.2 Response Actions

1. **Temporary Block** (15 min - 24h)
   - Automatic via rate limiting
   - Logs the incident

2. **License Revocation**
   - Admin manually revokes
   - All devices logged out
   - User notified via email

3. **Permanent Block**
   - Hash license key
   - Block all future attempts
   - Consider legal action

### 6.3 Audit Log Queries

```sql
-- Find suspicious activity
SELECT 
  license_key,
  ip_address,
  COUNT(*) as attempt_count,
  MAX(created_at) as last_attempt
FROM license_audit_logs
WHERE action = 'activate'
  AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY license_key, ip_address
HAVING attempt_count > 10;

-- Find licenses with many devices
SELECT 
  tlk.license_key,
  COUNT(tla.device_id) as device_count,
  tlk.max_devices
FROM tool_license_keys tlk
JOIN tool_license_activations tla ON tla.license_id = tlk.id
GROUP BY tlk.id
HAVING device_count > tlk.max_devices;
```

---

## 7. Environment Variables

### Required Variables

```bash
# .env.local

# JWT/Token Signing (MIN 32 CHARACTERS!)
TOOL_LICENSE_SECRET=your_super_secret_key_min_32_characters_long

# Storage (for downloads)
STORAGE_R2_ACCOUNT_ID=your_account_id
STORAGE_R2_BUCKET=your-bucket-name
STORAGE_R2_ACCESS_KEY=your_access_key
STORAGE_R2_SECRET_KEY=your_secret_key
STORAGE_R2_PUBLIC_URL=https://your-bucket.your-r2-endpoint

# Optional: Enhanced Security
LICENSE_RATE_LIMIT_ENABLED=true
LICENSE_AUDIT_LOG_ENABLED=true
```

### Security Best Practices

1. **Never commit .env files** - Already in .gitignore
2. **Use different secrets per environment** - Dev, Staging, Production
3. **Rotate secrets periodically** - Every 90 days recommended
4. **Use a secrets manager** - AWS Secrets Manager, HashiCorp Vault

---

## 8. Testing Checklist

### 8.1 Functional Tests

- [ ] License activation works
- [ ] Device limits enforced
- [ ] Token validation works
- [ ] Token refresh works
- [ ] Download authorization works
- [ ] Rate limiting triggers
- [ ] Audit logs created

### 8.2 Security Tests

- [ ] Cannot bypass license check with modified token
- [ ] Cannot use expired token
- [ ] Cannot use token from different license
- [ ] Cannot download without valid license
- [ ] Rate limiting blocks after N attempts
- [ ] Admin operations require admin role
- [ ] Audit logs capture all actions

### 8.3 Penetration Tests

- [ ] Try to crack offline tool
- [ ] Try to decompile and patch APK
- [ ] Try to bypass rate limiting
- [ ] Try to forge download URLs
- [ ] Try to escalate privileges

---

## 9. Future Improvements

### Phase 1 (Immediate)
- [ ] Implement R2 signed URLs
- [ ] Add device fingerprinting
- [ ] Enhanced audit logging
- [ ] Admin dashboard improvements

### Phase 2 (Short-term)
- [ ] Machine learning for anomaly detection
- [ ] Hardware binding for desktop apps
- [ ] Improved offline mode
- [ ] License transfer workflow

### Phase 3 (Long-term)
- [ ] Native C++ license library
- [ ] Hardware attestation (TPM)
- [ ] Blockchain-based license verification (experimental)
- [ ] Zero-knowledge proofs for privacy

---

## 10. Contact & Support

For security issues, contact:
- Email: security@somarnix.com
- Telegram: @somarnix_support

**DO NOT** disclose vulnerabilities publicly before they are fixed.

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
