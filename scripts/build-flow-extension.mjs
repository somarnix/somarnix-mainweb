import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourceDir = path.join(
  rootDir,
  "app",
  "pages",
  "tools-ai",
  "Generate Video for FLow ai"
);
const outputDir = path.join(rootDir, "extension-dist", "flow-extension");

const runtimeFiles = [
  "manifest.json",
  "background.js",
  "content.js",
  "popup.html",
  "popup.js",
  "popup.css",
  "website-bridge.js",
  "icon16.png",
  "icon48.png",
  "icon128.png",
];

function ensureCleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function compactJs(source) {
  return source
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim()
    .concat("\n");
}

function compactCss(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .trim()
    .concat("\n");
}

function compactHtml(source) {
  return source
    .replace(/>\s+</g, "><")
    .replace(/\n{2,}/g, "\n")
    .trim()
    .concat("\n");
}

function transformFile(fileName, content) {
  if (fileName.endsWith(".js")) return compactJs(content);
  if (fileName.endsWith(".css")) return compactCss(content);
  if (fileName.endsWith(".html")) return compactHtml(content);
  return content;
}

ensureCleanDir(outputDir);

for (const fileName of runtimeFiles) {
  const sourcePath = path.join(sourceDir, fileName);
  const outputPath = path.join(outputDir, fileName);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing extension file: ${sourcePath}`);
  }

  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(fileName)) {
    fs.copyFileSync(sourcePath, outputPath);
    continue;
  }

  const content = fs.readFileSync(sourcePath, "utf8");
  fs.writeFileSync(outputPath, transformFile(fileName, content), "utf8");
}

const readme = `Flow Extension Production Package

This folder is the stripped runtime package generated from:
app/pages/tools-ai/Generate Video for FLow ai

Included:
- manifest.json
- background.js
- content.js
- popup.html
- popup.js
- popup.css
- website-bridge.js
- icons

Not included:
- README/test/dev guide files
- Python/icon generator helpers
- repo source context

Load this folder as the unpacked extension for testing, or zip it for delivery.
`;

fs.writeFileSync(path.join(outputDir, "README.txt"), readme, "utf8");

console.log(`Built Flow extension package at ${outputDir}`);
