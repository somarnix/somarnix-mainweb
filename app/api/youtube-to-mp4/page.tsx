"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Download, Play } from "lucide-react";

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
    <main className="min-h-screen bg-gray-900 px-6 py-12 text-white">
      <div className="mx-auto flex max-w-3xl flex-col items-center">
        <h1 className="mb-4 text-center text-5xl font-bold">YouTube to MP4</h1>
        <p className="mb-8 max-w-2xl text-center text-gray-300">
          Paste your YouTube video URL and download it as MP4 instantly.
        </p>

        <Card className="mb-6 w-full max-w-xl border-zinc-700 bg-zinc-800">
          <CardContent className="flex flex-col items-center p-6">
            <input
              type="text"
              placeholder="Paste YouTube URL here"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mb-4 w-full rounded border border-zinc-700 bg-zinc-900 px-4 py-2 text-white"
            />
            <Button size="lg" onClick={handleGenerate} disabled={loading || !url}>
              <Play className="mr-2" /> {loading ? "Starting..." : "Download MP4"}
            </Button>
          </CardContent>
        </Card>

        {statusMessage && <p className="mb-4 text-gray-300">{statusMessage}</p>}

        {downloadLink && (
          <Card className="w-full max-w-xl border-zinc-700 bg-zinc-800">
            <CardContent className="flex flex-col items-center">
              <h2 className="mb-2 text-2xl font-semibold">Download ready</h2>
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
      </div>
    </main>
  );
}
