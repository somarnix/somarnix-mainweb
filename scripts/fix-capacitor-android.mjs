import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const replacements = [
  {
    file: "android/app/capacitor.build.gradle",
    rules: [
      ["JavaVersion.VERSION_21", "JavaVersion.VERSION_17"],
    ],
  },
  {
    file: "android/capacitor-cordova-android-plugins/build.gradle",
    rules: [
      ["com.android.tools.build:gradle:8.7.2", "com.android.tools.build:gradle:8.6.0"],
      ["JavaVersion.VERSION_21", "JavaVersion.VERSION_17"],
    ],
  },
  {
    file: "node_modules/@capacitor/android/capacitor/build.gradle",
    rules: [
      ["com.android.tools.build:gradle:8.7.2", "com.android.tools.build:gradle:8.6.0"],
      ["JavaVersion.VERSION_21", "JavaVersion.VERSION_17"],
    ],
  },
  {
    file: "node_modules/@capacitor/cli/dist/android/update.js",
    rules: [
      ["JavaVersion.VERSION_21", "JavaVersion.VERSION_17"],
    ],
  },
];

for (const { file, rules } of replacements) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) {
    continue;
  }

  let content = await readFile(fullPath, "utf8");
  let updated = content;

  for (const [search, replace] of rules) {
    updated = updated.split(search).join(replace);
  }

  if (updated !== content) {
    await writeFile(fullPath, updated, "utf8");
    console.log(`patched ${file}`);
  }
}
