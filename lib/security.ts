export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function getJwtSecret(): string {
  return getRequiredEnv("JWT_SECRET");
}

export function buildSessionCookie(token: string, maxAgeSeconds = 7 * 24 * 60 * 60): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `token=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `token=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
}
