import jwt, { JwtPayload } from "jsonwebtoken";

export type AuthUser = {
  id: any;
  userId: number;
  role: "user" | "admin";
};

type TokenPayload = JwtPayload & {
  userId: number;
  role: "user" | "admin";
};

export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const cookie = req.headers.get("cookie") ?? "";
  const token = cookie
    .split("; ")
    .find((c) => c.startsWith("token="))
    ?.split("=")[1];

  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET ?? "dev_secret"
    );

    if (typeof decoded !== "object" || decoded === null) {
      return null;
    }

    const payload = decoded as TokenPayload;

    if (!payload.userId || !payload.role) {
      return null;
    }

    return {
      userId: Number(payload.userId),
      role: payload.role,
    };
  } catch {
    return null;
  }
}
