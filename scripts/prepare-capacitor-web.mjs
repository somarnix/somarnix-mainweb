import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const capacitorWebDir = path.join(projectRoot, "capacitor-web");
const androidPublicDir = path.join(
  projectRoot,
  "android",
  "app",
  "src",
  "main",
  "assets",
  "public",
);

const shellHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Edugroit</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: system-ui, sans-serif;
        background: #0b1020;
        color: #fff;
      }
      .card {
        padding: 24px 28px;
        border-radius: 18px;
        background: linear-gradient(135deg, #1d4ed8, #9333ea);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
        text-align: center;
      }
      p {
        margin: 0;
        opacity: 0.9;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <p>Loading Edugroit...</p>
    </div>
  </body>
</html>
`;

await rm(androidPublicDir, { force: true, recursive: true });
await mkdir(capacitorWebDir, { recursive: true });
await writeFile(path.join(capacitorWebDir, "index.html"), shellHtml, "utf8");

console.log("Prepared Capacitor web shell and cleared stale Android assets.");
