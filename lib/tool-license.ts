import jwt from "jsonwebtoken";
import { createHmac } from "crypto";

export type ToolLicenseTokenPayload = {
  userId: number;
  productId: number;
  licenseId: number;
  slug: string;
  deviceId: string;
};

export type OfflineToolLicensePayload = {
  licenseId: number;
  userId: number;
  productId: number;
  slug: string;
  machineId: string;
  expiresAt: string | null;
  nextCheckAt: string;
};

function getToolLicenseSecret(): string {
  return process.env.TOOL_LICENSE_SECRET || process.env.JWT_SECRET || "dev_secret";
}

export function signOfflineToolLicensePayload(payload: OfflineToolLicensePayload): string {
  const json = JSON.stringify(payload);
  return createHmac("sha256", getToolLicenseSecret()).update(json).digest("base64");
}

export function signToolLicenseToken(
  payload: ToolLicenseTokenPayload,
  expiresAt?: Date | null,
  jwtId?: string
): string {
  const finalJwtId =
    jwtId ||
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  if (expiresAt && !Number.isNaN(expiresAt.getTime())) {
    return jwt.sign(payload, getToolLicenseSecret(), {
      expiresIn: Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
      jwtid: finalJwtId,
    });
  }
  return jwt.sign(payload, getToolLicenseSecret(), { expiresIn: "30d", jwtid: finalJwtId });
}

export function verifyToolLicenseToken(token: string): ToolLicenseTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getToolLicenseSecret());
    if (!decoded || typeof decoded !== "object") return null;
    const payload = decoded as Partial<ToolLicenseTokenPayload>;
    if (
      !payload.userId ||
      !payload.productId ||
      !payload.licenseId ||
      !payload.slug ||
      !payload.deviceId
    ) {
      return null;
    }
    return {
      userId: Number(payload.userId),
      productId: Number(payload.productId),
      licenseId: Number(payload.licenseId),
      slug: String(payload.slug),
      deviceId: String(payload.deviceId),
    };
  } catch {
    return null;
  }
}
