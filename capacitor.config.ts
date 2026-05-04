import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://somarnix.com";

const config: CapacitorConfig = {
  appId: "com.edugroit.app",
  appName: "SOMARNIX",
  webDir: "capacitor-web",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    androidScheme: "https",
  },
};

export default config;
