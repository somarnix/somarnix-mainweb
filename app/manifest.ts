import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SOMARNIX",
    short_name: "SOMARNIX",
    description: "SOMARNIX marketplace and learning platform.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    orientation: "portrait",
    lang: "en",
    icons: [
      {
        src: "/icons/icon-800.png",
        sizes: "800x800",
        type: "image/png",
      },
      {
        src: "/icons/icon-800-maskable.png",
        sizes: "800x800",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
