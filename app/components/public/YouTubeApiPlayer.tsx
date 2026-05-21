"use client";

import { useEffect, useRef, useState } from "react";

import { getYouTubeVideoId } from "@/app/lib/video-embed";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    __ytApiPromise?: Promise<void>;
  }
}

function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (window.__ytApiPromise) return window.__ytApiPromise;

  window.__ytApiPromise = new Promise<void>((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };

    const existing = document.querySelector("script[data-yt-iframe-api]");
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.setAttribute("data-yt-iframe-api", "true");
      document.body.appendChild(script);
    }
  });

  return window.__ytApiPromise;
}

type YouTubeApiPlayerProps = {
  videoUrl: string | null | undefined;
  title: string;
  className?: string;
};

export function YouTubeApiPlayer({ videoUrl, title, className = "" }: YouTubeApiPlayerProps) {
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const readyRef = useRef(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const videoId = getYouTubeVideoId(videoUrl);

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;
    setFailed(false);
    setReady(false);

    if (!videoId) return;

    const loadTimer = window.setTimeout(() => {
      if (!cancelled && !readyRef.current) setFailed(true);
    }, 8000);

    loadYouTubeApi().then(() => {
      if (cancelled || !playerHostRef.current || !window.YT?.Player) return;

      playerRef.current = new window.YT.Player(playerHostRef.current, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          enablejsapi: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            window.clearTimeout(loadTimer);
            readyRef.current = true;
            setReady(true);
          },
          onError: () => setFailed(true),
        },
      });
    });

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
      if (playerRef.current) {
        playerRef.current.destroy?.();
        playerRef.current = null;
      }
    };
  }, [videoId]);

  if (!videoId) {
    return (
      <div className={`grid place-items-center bg-slate-950 px-4 text-center text-xs font-bold text-white ${className}`}>
        Invalid YouTube link
      </div>
    );
  }

  if (failed) {
    return (
      <a
        href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
        target="_blank"
        rel="noreferrer"
        className={`grid place-items-center bg-slate-950 px-4 text-center text-xs font-bold text-white ${className}`}
      >
        Watch on YouTube
      </a>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-black ${className}`} aria-label={title}>
      <div ref={playerHostRef} className="absolute inset-0 h-full w-full" />
      {!ready ? (
        <div className="absolute inset-0 grid place-items-center bg-black text-xs font-bold text-white">
          Loading video...
        </div>
      ) : null}
    </div>
  );
}
