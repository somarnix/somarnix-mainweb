export type AppRole = "user" | "editor" | "admin";

export function normalizeAppRole(value: unknown): AppRole {
  return value === "admin" || value === "editor" ? value : "user";
}

export function isAdminRole(value: unknown): value is "admin" {
  return value === "admin";
}
