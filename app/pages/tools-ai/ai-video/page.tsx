"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Download, Play } from "lucide-react";

export default function YoutubeToMp4() {
  const [url, setUrl] = useState("");
  const [downloadLink, setDownloadLink] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!url) return;
    setLoading(true);

    try {
      // Appelle ton API avec l'URL YouTube
      const res = await fetch(`/api/youtube-to-mp4?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      setDownloadLink(data.downloadUrl); // ton API doit renvoyer { downloadUrl: "..." }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la génération du MP4");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white px-6 py-12 flex flex-col items-center">
      <h1 className="text-5xl font-bold mb-4 text-center">YouTube to MP4</h1>
      <p className="text-gray-300 mb-8 max-w-2xl text-center">
        Collez l'URL de votre vidéo YouTube et téléchargez-la au format MP4 instantanément.
      </p>

      {/* Input URL */}
      <Card className="bg-zinc-800 border-zinc-700 w-full max-w-xl mb-6">
        <CardContent className="flex flex-col items-center p-6">
          <input
            type="text"
            placeholder="Collez l'URL YouTube ici"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mb-4 w-full px-4 py-2 rounded bg-zinc-900 border border-zinc-700 text-white"
          />
          <Button size="lg" onClick={handleGenerate} disabled={loading || !url}>
            <Play className="mr-2" /> {loading ? "Génération..." : "Générer MP4"}
          </Button>
        </CardContent>
      </Card>

      {/* Download Link */}
      {downloadLink && (
        <Card className="bg-zinc-800 border-zinc-700 w-full max-w-xl">
          <CardContent className="flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-2">Téléchargement prêt</h2>
            <a
              href={downloadLink}
              className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download /> Télécharger MP4
            </a>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
