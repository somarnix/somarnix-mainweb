# 🛠️ Tools & Licensing System - Implementation Guide

## Quick Start

### Step 1: Run Database Migration

```bash
# Connect to MySQL
mysql -u root -p

# Run the migration
USE gstechedukh;
SOURCE sql/12-enhanced-tools-licenses.sql;
```

### Step 2: Add Environment Variables

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

### Step 3: Build and Test

```bash
# Install dependencies (if needed)
npm install

# Run development server
npm run dev

# Test the APIs
curl http://localhost:3000/api/tools/definition/list
```

---

## API Reference

### Public Endpoints (No Auth Required)

#### GET /api/tools/definition/list

Get all active tools for catalog display.

**Query Parameters:**
- `category` - Filter by category (ai, video, image, etc.)
- `platform` - Filter by platform (web, pc, mobile)
- `toolKind` - Filter by kind (online, downloadable, etc.)
- `featured` - Show only featured tools (true/false)

**Response:**
```json
{
  "tools": [
    {
      "id": 1,
      "productId": 123,
      "slug": "veo3-ai",
      "name": "Veo3 AI Video Generator",
      "description": "Generate videos from text",
      "kind": "embedded",
      "category": "ai",
      "platform": "web",
      "accessModel": "license",
      "deliveryModel": "web",
      "requiresLicense": true,
      "deviceLimit": 3,
      "allowOfflineMode": false,
      "currentVersion": "1.0.0",
      "isBeta": false
    }
  ],
  "count": 1
}
```

#### GET /api/tools/definition/[slug]

Get single tool details.

**Response:**
```json
{
  "tool": {
    "id": 1,
    "slug": "veo3-ai",
    "name": "Veo3 AI Video Generator",
    "description": "Short description",
    "longDescription": "Full description...",
    "kind": "embedded",
    "category": "ai",
    "platform": "web",
    "requiresLicense": true,
    "deviceLimit": 3,
    "maxDeviceLimit": 10,
    "allowOfflineMode": false,
    "currentVersion": "1.0.0",
    "config": {}
  }
}
```

---

### License Endpoints (Auth Required)

#### POST /api/license/activate

Activate a license on a device.

**Request:**
```json
{
  "slug": "veo3-ai",
  "licenseKey": "GSTCH-ABCD-EFGH-IJKL-MNOP",
  "deviceId": "unique-device-id",
  "deviceInfo": {
    "platform": "windows",
    "platformVersion": "10.0",
    "appVersion": "1.0.0",
    "cpuCores": 8,
    "totalMemory": 16
  }
}
```

**Response:**
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-12-31T23:59:59Z",
  "machineId": "unique-device-id",
  "maxDevices": 3,
  "deviceCount": 1,
  "offlinePayload": {
    "licenseId": 123,
    "userId": 456,
    "productId": 789,
    "slug": "veo3-ai",
    "machineId": "unique-device-id",
    "expiresAt": "2024-12-31T23:59:59Z",
    "nextCheckAt": "2024-01-15T00:00:00Z"
  },
  "signature": "base64_signature_here",
  "nextCheckAt": "2024-01-15T00:00:00Z"
}
```

**Error Responses:**
```json
// Invalid license key
{ "error": "invalid_license_key" }

// Device limit reached
{ "error": "device_limit_reached" }

// Too many attempts (rate limited)
{ 
  "error": "Too many activation attempts",
  "retryAfter": 900,
  "blockedUntil": "2024-01-15T10:30:00Z"
}
```

#### POST /api/license/validate

Validate a license token.

**Request:**
```json
{
  "slug": "veo3-ai",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "deviceId": "unique-device-id"
}
```

**Response:**
```json
{
  "valid": true,
  "expiresAt": "2024-12-31T23:59:59Z",
  "maxDevices": 3,
  "deviceCount": 1,
  "licenseId": 123
}
```

#### POST /api/device/heartbeat

Keep session alive.

**Request:**
```json
{
  "slug": "veo3-ai",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "deviceId": "unique-device-id"
}
```

**Response:**
```json
{
  "ok": true,
  "nextHeartbeatAt": "2024-01-29T00:00:00Z"
}
```

---

### Download Endpoints

#### POST /api/tools/download

Request a secure download URL.

**Request:**
```json
{
  "slug": "video-downloader-pro",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "deviceId": "unique-device-id"
}
```

**Response:**
```json
{
  "ok": true,
  "downloadUrl": "https://storage.r2.cloudflarestorage.com/tools/pc/exe/tool-v1.0.exe?X-Amz-Expires=900&X-Amz-Signature=abc123",
  "fileName": "video-downloader-pro-v1.2.0.exe",
  "expiresAt": "2024-01-15T10:45:00Z",
  "checksum": {
    "sha256": "abc123..."
  }
}
```

---

### Admin Endpoints (Admin Only)

#### POST /api/admin/tools/definition

Create a new tool definition.

**Request:**
```json
{
  "productId": 123,
  "canonicalSlug": "my-new-tool",
  "displayName": "My New Tool",
  "shortDescription": "Brief description",
  "toolKind": "downloadable",
  "toolCategory": "video",
  "platform": "pc",
  "accessModel": "license",
  "deliveryModel": "download+license",
  "requiresLicense": true,
  "defaultDeviceLimit": 2,
  "maxDeviceLimit": 5,
  "allowOfflineMode": true,
  "offlineGracePeriodHours": 72,
  "storageProvider": "r2",
  "storageBucket": "my-tools",
  "storageKeyPrefix": "tools/pc/exe/",
  "fileExtension": ".exe",
  "currentVersion": "1.0.0",
  "isActive": true,
  "sortOrder": 10
}
```

**Response:**
```json
{
  "ok": true,
  "toolId": 456,
  "slug": "my-new-tool"
}
```

#### POST /api/admin/license/create

Create a new license key.

**Request:**
```json
{
  "productId": 123,
  "userId": 456,
  "orderId": 789,
  "maxDevices": 3,
  "durationDays": 365,
  "reason": "Manual license creation"
}
```

**Response:**
```json
{
  "ok": true,
  "licenseId": 101,
  "licenseKey": "GSTCH-ABCD-EFGH-IJKL-MNOP",
  "expiresAt": "2025-01-15T00:00:00Z"
}
```

#### POST /api/admin/license/revoke

Revoke a license.

**Request:**
```json
{
  "licenseId": 101,
  "reason": "License sharing detected"
}
```

**Response:**
```json
{
  "ok": true,
  "licenseId": 101,
  "revokedAt": "2024-01-15T10:00:00Z"
}
```

#### GET /api/admin/license/status/[licenseId]

Get license details and device list.

**Response:**
```json
{
  "license": {
    "id": 101,
    "licenseKey": "GSTCH-ABCD-EFGH-IJKL-MNOP",
    "status": "active",
    "maxDevices": 3,
    "expiresAt": "2025-01-15T00:00:00Z",
    "product": {
      "id": 123,
      "title": "My Tool",
      "slug": "my-tool"
    },
    "user": {
      "id": 456,
      "email": "user@example.com"
    }
  },
  "devices": [
    {
      "deviceId": "device-1",
      "activatedAt": "2024-01-01T00:00:00Z",
      "lastSeenAt": "2024-01-15T00:00:00Z"
    }
  ],
  "deviceCount": 1,
  "auditLogs": [...]
}
```

---

## Frontend Integration

### React Hook Usage

```typescript
import { useToolLicense } from '@/app/lib/hooks/useToolLicense';
import { ToolDownloadButton } from '@/app/lib/hooks/useToolDownload';

function MyToolPage() {
  const {
    isValid,
    loading,
    activate,
    token,
    deviceId,
    deviceCount,
    maxDevices,
  } = useToolLicense({
    slug: 'my-tool',
    autoActivate: false,
    onActivated: () => console.log('Tool activated!'),
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isValid) {
    return (
      <div>
        <h2>License Required</h2>
        <input
          type="text"
          placeholder="Enter license key"
          onBlur={(e) => activate(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div>
      <h2>My Tool</h2>
      <p>Device {deviceCount}/{maxDevices} activated</p>
      
      {/* Tool UI here */}
      
      {/* Download button (for downloadable tools) */}
      <ToolDownloadButton
        slug="my-tool"
        token={token}
        deviceId={deviceId}
      />
    </div>
  );
}
```

### Tool Catalog Usage

```typescript
import { ToolCatalog } from '@/app/components/tools/ToolCatalog';

function ToolsPage() {
  const handleToolSelect = (tool) => {
    if (tool.kind === 'embedded' || tool.kind === 'online') {
      // Open tool
      router.push(tool.launchPath);
    } else if (tool.deliveryModel.includes('download')) {
      // Show download page
      router.push(`/tools/${tool.slug}/download`);
    }
  };

  return (
    <div>
      <h1>Tools Catalog</h1>
      <ToolCatalog onToolSelect={handleToolSelect} />
    </div>
  );
}
```

---

## Desktop App Integration

### C# Example (.NET)

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class LicenseManager
{
    private readonly string _apiBaseUrl = "https://api.yoursite.com";
    private readonly string _slug = "my-desktop-tool";
    private readonly string _deviceId;
    
    public LicenseManager()
    {
        _deviceId = GetMachineId(); // Implement unique device ID
    }
    
    public async Task<bool> ActivateAsync(string licenseKey)
    {
        using var client = new HttpClient();
        
        var response = await client.PostAsJsonAsync(
            $"{_apiBaseUrl}/api/license/activate",
            new
            {
                slug = _slug,
                licenseKey,
                deviceId = _deviceId,
                deviceInfo = new
                {
                    platform = "windows",
                    platformVersion = Environment.OSVersion.Version.ToString(),
                    cpuCores = Environment.ProcessorCount,
                }
            }
        );
        
        if (!response.IsSuccessStatusCode)
            return false;
        
        var result = await response.Content.ReadFromJsonAsync<ActivateResponse>();
        
        if (result.ok)
        {
            // Store token securely
            SaveTokenSecurely(result.token);
            return true;
        }
        
        return false;
    }
    
    public async Task<bool> ValidateAsync()
    {
        var token = GetTokenSecurely();
        if (string.IsNullOrEmpty(token))
            return false;
        
        using var client = new HttpClient();
        
        var response = await client.PostAsJsonAsync(
            $"{_apiBaseUrl}/api/license/validate",
            new
            {
                slug = _slug,
                token,
                deviceId = _deviceId
            }
        );
        
        var result = await response.Content.ReadFromJsonAsync<ValidateResponse>();
        return result.valid;
    }
}

public class ActivateResponse
{
    public bool ok { get; set; }
    public string token { get; set; }
    public string expiresAt { get; set; }
    public int maxDevices { get; set; }
    public int deviceCount { get; set; }
}

public class ValidateResponse
{
    public bool valid { get; set; }
    public string reason { get; set; }
}
```

### Python Example

```python
import requests
import hashlib
import platform
import json
from pathlib import Path

class LicenseManager:
    def __init__(self, slug: str, api_base: str = "https://api.yoursite.com"):
        self.slug = slug
        self.api_base = api_base
        self.device_id = self._get_device_id()
        self.token = None
        self.token_file = Path.home() / ".yourapp" / "license_token"
        
    def _get_device_id(self) -> str:
        """Generate unique device ID from hardware info"""
        machine = platform.node()
        processor = platform.processor()
        mac = hex(uuid.getnode())
        return hashlib.sha256(f"{machine}{processor}{mac}".encode()).hexdigest()
    
    def activate(self, license_key: str) -> bool:
        """Activate license on this device"""
        try:
            response = requests.post(
                f"{self.api_base}/api/license/activate",
                json={
                    "slug": self.slug,
                    "licenseKey": license_key,
                    "deviceId": self.device_id,
                    "deviceInfo": {
                        "platform": platform.system().lower(),
                        "platformVersion": platform.version(),
                    }
                }
            )
            
            if response.status_code != 200:
                print(f"Activation failed: {response.json().get('error')}")
                return False
            
            result = response.json()
            if result.get('ok'):
                self.token = result['token']
                self._save_token()
                return True
            
            return False
        except Exception as e:
            print(f"Activation error: {e}")
            return False
    
    def validate(self) -> bool:
        """Validate current token"""
        if not self.token:
            self._load_token()
        
        if not self.token:
            return False
        
        try:
            response = requests.post(
                f"{self.api_base}/api/license/validate",
                json={
                    "slug": self.slug,
                    "token": self.token,
                    "deviceId": self.device_id
                }
            )
            
            result = response.json()
            return result.get('valid', False)
        except Exception as e:
            print(f"Validation error: {e}")
            return False
    
    def _save_token(self):
        """Save token to file (use encryption in production!)"""
        self.token_file.parent.mkdir(exist_ok=True)
        self.token_file.write_text(self.token)
    
    def _load_token(self):
        """Load token from file"""
        if self.token_file.exists():
            self.token = self.token_file.read_text()
```

---

## Testing

### Manual Testing Checklist

1. **License Activation**
   - [ ] Valid license activates successfully
   - [ ] Invalid license returns error
   - [ ] Device limit is enforced
   - [ ] Rate limiting triggers after 10 attempts

2. **Token Validation**
   - [ ] Valid token returns valid: true
   - [ ] Expired token returns valid: false
   - [ ] Tampered token returns valid: false

3. **Downloads**
   - [ ] Download URL is generated
   - [ ] Download URL expires after 15 minutes
   - [ ] Download requires valid license

4. **Admin Operations**
   - [ ] Can create new license
   - [ ] Can revoke license
   - [ ] Can view license status
   - [ ] Non-admin cannot access admin endpoints

### Automated Tests

```typescript
// __tests__/license-api.test.ts
import { describe, it, expect } from '@jest/globals';

describe('License API', () => {
  it('should activate valid license', async () => {
    const response = await fetch('http://localhost:3000/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'test-tool',
        licenseKey: 'GSTCH-TEST-KEY-1234',
        deviceId: 'test-device',
      }),
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.token).toBeDefined();
  });
  
  it('should reject invalid license', async () => {
    const response = await fetch('http://localhost:3000/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'test-tool',
        licenseKey: 'INVALID-KEY',
        deviceId: 'test-device',
      }),
    });
    
    expect(response.status).toBe(403);
  });
});
```

---

## Troubleshooting

### Common Issues

**Issue:** "Invalid token" error
- **Cause:** Token expired or tampered
- **Solution:** Re-activate the license

**Issue:** "Device limit reached"
- **Cause:** Too many devices activated
- **Solution:** Remove a device via admin panel or wait for user to remove

**Issue:** "Too many attempts"
- **Cause:** Rate limit triggered
- **Solution:** Wait 15 minutes or contact admin

**Issue:** Download URL doesn't work
- **Cause:** URL expired (15 min lifetime)
- **Solution:** Request new download URL

---

## Support

For issues or questions:
- Email: support@gstechkh.com
- Telegram: @gstechkh_support
