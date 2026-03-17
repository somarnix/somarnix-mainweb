import fs from "fs";
import path from "path";

import dotenv from "dotenv";

let loaded = false;

function loadEnvFile(projectRoot: string, filename: string): void {
  const filePath = path.join(projectRoot, filename);
  if (!fs.existsSync(filePath)) return;
  dotenv.config({ path: filePath, override: false, quiet: true });
}

export function ensureServerEnv(): void {
  if (loaded || typeof window !== "undefined") return;
  loaded = true;

  const projectRoot = process.cwd();

  if (process.env.NODE_ENV === "production") {
    loadEnvFile(projectRoot, ".env.production.local");
    loadEnvFile(projectRoot, ".env.local");
    loadEnvFile(projectRoot, ".env.production");
    loadEnvFile(projectRoot, ".env.website");
    loadEnvFile(projectRoot, ".env");
    return;
  }

  loadEnvFile(projectRoot, ".env.development.local");
  loadEnvFile(projectRoot, ".env.local");
  loadEnvFile(projectRoot, ".env.development");
  loadEnvFile(projectRoot, ".env");
}

ensureServerEnv();
