"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Play } from "lucide-react";
import Header, { MenuItem } from "@/components/Header";

// Menu réutilisé
const menu: MenuItem[] = [
  { title: "Script Tools" },
  { title: "Podcast Tools" },
  { title: "Pro Accounts", sub: ["Capcut Pro", "Express VPN", "ChatGPT Pro"] },
  { title: "Background Sounds" },
];

export default function YoutubeToMp4() {
  const [url, setUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [downloadLink, setDownloadLink] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!url) return;
    setLoading(true);
    setStatusMessage("Starting download...");

    try {
      const res = await fetch("http://localhost:8000/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, prompt_id: 0 }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMessage("Download started in background!");
        if (data.downloadUrl) setDownloadLink(data.downloadUrl);
      } else {
        setStatusMessage("Error starting download: " + (data.message || "Unknown error"));
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage("Cannot reach backend: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex bg-gray-900 text-white font-sans">
      {/* Header global */}
      <Header menu={menu} />

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-6 py-24 md:py-12 pt-[4rem] md:pt-12">
        {/* Hero */}
        <h1 className="text-5xl font-bold mb-4 text-center">YouTube to MP4</h1>
        <p className="text-gray-300 mb-8 max-w-2xl text-center">
          Paste your YouTube video URL and download it as MP4 instantly.
        </p>

        {/* Input URL */}
        <Card className="bg-zinc-800 border-zinc-700 w-full max-w-xl mb-6">
          <CardContent className="flex flex-col items-center p-6">
            <input
              type="text"
              placeholder="Paste YouTube URL here"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mb-4 w-full px-4 py-2 rounded bg-zinc-900 border border-zinc-700 text-white"
            />
            <Button size="lg" onClick={handleGenerate} disabled={loading || !url}>
              <Play className="mr-2" /> {loading ? "Starting..." : "Download MP4"}
            </Button>
          </CardContent>
        </Card>

        {/* Status message */}
        {statusMessage && <p className="mb-4 text-gray-300">{statusMessage}</p>}

        {/* Download Link */}
        {downloadLink && (
          <Card className="bg-zinc-800 border-zinc-700 w-full max-w-xl">
            <CardContent className="flex flex-col items-center">
              <h2 className="text-2xl font-semibold mb-2">Download ready</h2>
              <a
                href={downloadLink}
                className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download /> Download MP4
              </a>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
