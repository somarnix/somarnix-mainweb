import "@/lib/server-env";

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
  return `token=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function clearSessionCookies(): string[] {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const base = `token=; HttpOnly; SameSite=Lax${secure}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  const paths = [
    "/",
    "/api",
    "/api/",
    "/api/me",
    "/api/auth",
    "/api/auth/",
    "/api/auth/login",
    "/api/auth/login-cookie",
    "/api/auth/google",
    "/api/auth/logout",
  ];

  return paths.map((path) => `${base}; Path=${path}`);
}
