import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import "./build-flow-extension.mjs";

const rootDir = process.cwd();
const extensionDir = path.join(rootDir, "extension-dist", "flow-extension");
const zipPath = path.join(rootDir, "extension-dist", "flow-extension.zip");

if (!fs.existsSync(extensionDir)) {
  throw new Error(`Extension build output not found: ${extensionDir}`);
}

if (fs.existsSync(zipPath)) {
  fs.rmSync(zipPath, { force: true });
}

const powershell = process.env.SystemRoot
  ? path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
  : "powershell.exe";

const command = [
  "$ErrorActionPreference = 'Stop'",
  `Compress-Archive -Path '${extensionDir}\\*' -DestinationPath '${zipPath}' -Force`,
].join("; ");

const result = spawnSync(powershell, ["-NoProfile", "-Command", command], {
  stdio: "inherit",
  shell: false,
});

if (result.status !== 0) {
  throw new Error(`Failed to create zip archive at ${zipPath}`);
}

console.log(`Packed Flow extension zip at ${zipPath}`);
