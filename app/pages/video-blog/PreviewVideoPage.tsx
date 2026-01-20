"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Gauge,
  Maximize2,
  Pause,
  Play,
  PlayCircle,
  SkipBack,
  SkipForward,
  Settings2,
  Subtitles,
  Volume2,
  X,
} from "lucide-react";

export type PreviewLesson = {
  id: string;
  title: string;
  time: string;
  youtubeUrl: string;
};

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    __ytApiPromise?: Promise<void>;
  }
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);

    // youtu.be/<id>
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id || null;
    }

    // youtube.com/watch?v=<id>
    const v = u.searchParams.get("v");
    if (v) return v;

    // youtube.com/embed/<id>
    const parts = u.pathname.split("/").filter(Boolean);
    const embedIndex = parts.indexOf("embed");
    if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1];

    return null;
  } catch {
    return null;
  }
}

interface PreviewVideoPageProps {
  courseTitle: string;
  lessons: PreviewLesson[];
  initialLessonId?: string;
  onBack: () => void;
}

const QUALITY_ORDER = [
  "highres",
  "hd2160",
  "hd1440",
  "hd1080",
  "hd720",
  "large",
  "medium",
  "small",
  "tiny",
];

type CaptionTrack = {
  languageCode?: string;
  languageName?: string;
  name?: { simpleText?: string; runs?: Array<{ text?: string }> } | string;
  kind?: string;
};

function getNameText(
  name?: { simpleText?: string; runs?: Array<{ text?: string }> } | string
): string {
  if (!name) return "";
  if (typeof name === "string") return name;
  if (name.simpleText) return name.simpleText;
  if (Array.isArray(name.runs)) {
    return name.runs.map((run) => run.text ?? "").join("").trim();
  }
  return "";
}

function normalizeCaptionTrack(track: any): CaptionTrack | null {
  if (!track) return null;
  const languageCode =
    track.languageCode || track.lang_code || track.langCode || track.language || "";
  if (!languageCode) return null;
  return {
    languageCode,
    languageName:
      track.languageName ||
      track.lang_translated ||
      track.lang_original ||
      languageCode,
    name: track.name || "",
    kind: track.kind || "",
  };
}

export function PreviewVideoPage({
  courseTitle,
  lessons,
  initialLessonId,
  onBack,
}: PreviewVideoPageProps) {
  const [activeId, setActiveId] = useState<string>(() => {
    if (initialLessonId && lessons.some((lesson) => lesson.id === initialLessonId)) {
      return initialLessonId;
    }
    return lessons[0]?.id ?? "";
  });
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const videoFrameRef = useRef<HTMLDivElement | null>(null);
  const fullscreenRef = useRef<HTMLDivElement | null>(null);
  const userQualityRef = useRef(false);
  const qualityLevelsRef = useRef<string>("");

  const active = useMemo(() => {
    return lessons.find((l) => l.id === activeId) ?? lessons[0];
  }, [activeId, lessons]);
  const activeIndex = useMemo(() => lessons.findIndex((l) => l.id === activeId), [activeId, lessons]);
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < lessons.length - 1;

  const goPrev = useCallback(() => {
    if (!hasPrev) return;
    setActiveId(lessons[activeIndex - 1].id);
  }, [activeIndex, hasPrev, lessons]);

  const goNext = useCallback(() => {
    if (!hasNext) return;
    setActiveId(lessons[activeIndex + 1].id);
  }, [activeIndex, hasNext, lessons]);

  const videoId = active ? getYouTubeId(active.youtubeUrl) : null;

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [availableRates, setAvailableRates] = useState<number[]>([0.5, 1, 1.25, 1.5, 2]);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [qualityOption, setQualityOption] = useState<string>("auto");
  const [qualityLevel, setQualityLevel] = useState<string>("auto");
  const [volume, setVolume] = useState(100);
  const [captionTracks, setCaptionTracks] = useState<CaptionTrack[]>([]);
  const [captionSelection, setCaptionSelection] = useState("off");
  const [captionsLoading, setCaptionsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!lessons.length) return;
    if (initialLessonId && lessons.some((lesson) => lesson.id === initialLessonId)) {
      setActiveId(initialLessonId);
    }
  }, [initialLessonId, lessons]);

  const loadYouTubeApi = useCallback(() => {
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
  }, []);

  const formatTime = (value: number) => {
    if (!Number.isFinite(value)) return "0:00";
    const total = Math.max(0, Math.floor(value));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatQualityLevel = useCallback((level: string) => {
    const labels: Record<string, string> = {
      highres: "4K+",
      hd2160: "2160p",
      hd1440: "1440p",
      hd1080: "1080p",
      hd720: "720p",
      large: "480p",
      medium: "360p",
      small: "240p",
      tiny: "144p",
    };
    return labels[level] ?? level;
  }, []);

  const formatCaptionLabel = useCallback((track: CaptionTrack) => {
    const nameText = getNameText(track.name);
    if (nameText) return nameText;
    if (track.languageName) return track.languageName;
    if (track.languageCode) {
      return track.kind === "asr" ? `${track.languageCode} (Auto)` : track.languageCode;
    }
    return "Caption";
  }, []);

  const syncPlayerState = useCallback(() => {
    if (!playerRef.current) return;
    const nextTime = Number(playerRef.current.getCurrentTime?.() ?? 0);
    const nextDuration = Number(playerRef.current.getDuration?.() ?? 0);
    setCurrentTime(nextTime);
    if (nextDuration && nextDuration !== duration) {
      setDuration(nextDuration);
    }
  }, [duration]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    const state = Number(playerRef.current.getPlayerState?.() ?? 0);
    if (state === 1) {
      playerRef.current.pauseVideo?.();
    } else {
      playerRef.current.playVideo?.();
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    const target = fullscreenRef.current;
    if (!target) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    target.requestFullscreen?.();
  }, []);

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
    if (playerRef.current?.setVolume) {
      playerRef.current.setVolume(value);
    }
  }, []);

  const handleVideoClick = useCallback(() => {
    if (isFullscreen) return;
    togglePlay();
  }, [isFullscreen, togglePlay]);

  const applyQualitySelection = useCallback((optionId: string) => {
    if (!playerRef.current) return;
    if (optionId === "auto") {
      playerRef.current.setPlaybackQuality?.("default");
      setQualityLevel("auto");
      return;
    }
    playerRef.current.setPlaybackQuality?.(optionId);
    setQualityLevel(optionId);
  }, []);

  const refreshQualityLevels = useCallback(() => {
    if (!playerRef.current?.getAvailableQualityLevels) return;
    let levels = playerRef.current.getAvailableQualityLevels() ?? [];
    if (!Array.isArray(levels) || levels.length === 0) {
      const current = playerRef.current.getPlaybackQuality?.();
      if (current && current !== "unknown") {
        levels = [current];
      } else {
        return;
      }
    }
    const signature = levels.join("|");
    if (signature !== qualityLevelsRef.current) {
      qualityLevelsRef.current = signature;
      setAvailableQualities(levels);
    }
  }, []);

  const loadCaptionTracks = useCallback(() => {
    if (!videoId) return;
    if (!playerRef.current?.getOption) {
      setCaptionsLoading(true);
      return;
    }
    setCaptionsLoading(true);
    const readPlayerTracks = () => {
      try {
        playerRef.current.loadModule?.("captions");
        const raw = playerRef.current.getOption?.("captions", "tracklist") ?? [];
        if (Array.isArray(raw)) {
          return raw
            .map((item: any) => normalizeCaptionTrack(item))
            .filter(Boolean) as CaptionTrack[];
        }
      } catch {}
      return [];
    };
    const tracks = readPlayerTracks();
    setCaptionTracks(tracks);
    setCaptionsLoading(false);
    if (!tracks.length) {
      window.setTimeout(() => {
        const delayedTracks = readPlayerTracks();
        if (delayedTracks.length) {
          setCaptionTracks(delayedTracks);
        }
      }, 800);
    }
  }, [videoId]);

  const applyCaptionSelection = useCallback(
    (selection: string, tracks: CaptionTrack[]) => {
      if (selection === "off") {
        setCaptionSelection("off");
        playerRef.current?.unloadModule?.("captions");
        return;
      }
      const track = tracks.find((item) => item.languageCode === selection);
      if (!track?.languageCode) return;
      setCaptionSelection(track.languageCode);
      playerRef.current?.loadModule?.("captions");
      const trackOption: Record<string, string> = { languageCode: track.languageCode };
      if (track.kind) {
        trackOption.kind = track.kind;
      }
      playerRef.current?.setOption?.("captions", "track", trackOption);
    },
    []
  );


  const qualityOptions = useMemo(() => {
    const uniqueLevels = Array.from(
      new Set(availableQualities.filter((level) => level && level !== "auto" && level !== "default"))
    );
    const ordered = QUALITY_ORDER.filter((level) => uniqueLevels.includes(level));
    const extras = uniqueLevels.filter((level) => !QUALITY_ORDER.includes(level));
    const levels = [...ordered, ...extras];
    return [
      ...levels.map((level) => ({ id: level, label: formatQualityLevel(level) })),
      { id: "auto", label: "Auto" },
    ];
  }, [availableQualities, formatQualityLevel]);

  const handleCaptionMenuChange = useCallback(
    (value: string) => {
      if (value === "loading" || value === "none") return;
      applyCaptionSelection(value, captionTracks);
    },
    [applyCaptionSelection, captionTracks]
  );

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !playerContainerRef.current || !videoId) return;

      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          controls: 0,
          disablekb: 1,
          iv_load_policy: 3,
          playsinline: 1,
          fs: 0,
          cc_load_policy: 0,
        },
        events: {
          onReady: () => {
            if (!playerRef.current) return;
            setIsReady(true);
            setDuration(Number(playerRef.current.getDuration?.() ?? 0));
            setVolume(Number(playerRef.current.getVolume?.() ?? 100));
            const rates = playerRef.current.getAvailablePlaybackRates?.() ?? [];
            if (rates.length) setAvailableRates(rates);
            const levels = playerRef.current.getAvailableQualityLevels?.() ?? [];
            setAvailableQualities(levels);
            qualityLevelsRef.current = Array.isArray(levels) ? levels.join("|") : "";
            setPlaybackRate(Number(playerRef.current.getPlaybackRate?.() ?? 1));
            loadCaptionTracks();
            const preferredOption = userQualityRef.current ? qualityOption : "auto";
            const nextOption =
              preferredOption !== "auto" && !levels.includes(preferredOption)
                ? "auto"
                : preferredOption;
            if (!userQualityRef.current) {
              setQualityOption(nextOption);
            }
            applyQualitySelection(nextOption);
            window.setTimeout(refreshQualityLevels, 600);
          },
          onApiChange: () => {
            loadCaptionTracks();
          },
          onStateChange: (event: { data: number }) => {
            setIsPlaying(event.data === 1);
            if (event.data === 1) {
              refreshQualityLevels();
              window.setTimeout(refreshQualityLevels, 700);
              loadCaptionTracks();
            }
          },
          onPlaybackRateChange: (event: { data: number }) => {
            setPlaybackRate(event.data);
          },
          onPlaybackQualityChange: (event: { data: string }) => {
            const nextLevel = event.data || "auto";
            setQualityLevel(nextLevel);
            if (nextLevel !== "auto") {
              setQualityOption(nextLevel);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (playerRef.current) {
        playerRef.current.destroy?.();
        playerRef.current = null;
      }
    };
  }, [loadYouTubeApi, videoId]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenRef.current);
    };
    document.addEventListener("fullscreenchange", handleChange);
    handleChange();
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  useEffect(() => {
    if (!playerRef.current || !videoId) return;
    if (!isReady) return;
    playerRef.current.loadVideoById?.(videoId);
    setCurrentTime(0);
    setIsPlaying(false);
    setCaptionSelection("off");
    playerRef.current.unloadModule?.("captions");
    setCaptionTracks([]);
    loadCaptionTracks();
  }, [loadCaptionTracks, videoId, isReady]);

  useEffect(() => {
    if (!videoId) return;
    loadCaptionTracks();
  }, [loadCaptionTracks, videoId]);

  useEffect(() => {
    if (!isReady) return;
    const timer = window.setInterval(syncPlayerState, 500);
    return () => window.clearInterval(timer);
  }, [isReady, syncPlayerState]);

  useEffect(() => {
    if (!isReady) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      refreshQualityLevels();
      if (qualityLevelsRef.current || attempts >= 8) {
        window.clearInterval(timer);
      }
    }, 600);
    return () => window.clearInterval(timer);
  }, [isReady, refreshQualityLevels]);

  useEffect(() => {
    if (!isReady) return;
    if (!availableQualities.length) {
      applyQualitySelection("auto");
      return;
    }
    let optionToApply = qualityOption || "auto";
    if (optionToApply !== "auto" && !availableQualities.includes(optionToApply)) {
      optionToApply = "auto";
      if (!userQualityRef.current) {
        setQualityOption("auto");
      }
    }
    applyQualitySelection(optionToApply);
  }, [
    applyQualitySelection,
    availableQualities,
    isReady,
    qualityOption,
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-300">Course Preview</div>
            <div className="mt-1 text-xl md:text-2xl font-bold">{courseTitle}</div>
          </div>

          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>

        {/* Player */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div
            ref={fullscreenRef}
            className={`relative ${isFullscreen ? "h-full w-full bg-black" : ""}`}
          >
            <div
              className={`relative w-full overflow-hidden rounded-xl bg-black ${
                isFullscreen ? "h-full" : "aspect-video"
              }`}
            >
            {videoId ? (
              <>
        <div ref={videoFrameRef} className="h-full w-full">
          <div ref={playerContainerRef} className="h-full w-full" />
        </div>
        <button
          type="button"
          onClick={handleVideoClick}
          onContextMenu={(event) => event.preventDefault()}
          className="absolute inset-0 z-10 cursor-pointer bg-transparent"
          aria-label={isPlaying ? "Pause video" : "Play video"}
        />
      </>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400">
                Invalid video link
              </div>
            )}
            </div>

          <div
            className={`${
              isFullscreen ? "absolute left-4 right-4 bottom-4 z-30" : "mt-3"
            }`}
          >
            <div className="text-sm text-slate-200 font-semibold">
              {active?.title}
              <span className="ml-2 text-slate-400 font-normal">• {active?.time}</span>
            </div>

            <div className="mt-2 rounded-xl border border-white/10 bg-black/70 px-3 py-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={!isReady}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    <span className="hidden sm:inline">{isPlaying ? "Pause" : "Play"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={!hasPrev}
                    className="inline-flex items-center justify-center rounded-lg bg-white/10 px-2 py-1.5 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
                    aria-label="Previous"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!hasNext}
                    className="inline-flex items-center justify-center rounded-lg bg-white/10 px-2 py-1.5 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
                    aria-label="Next"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>

                  <div className="flex w-full items-center gap-2 text-xs text-slate-300">
                    <span className="w-10 text-left tabular-nums">{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={0.1}
                      value={Math.min(currentTime, duration || 0)}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setCurrentTime(value);
                        playerRef.current?.seekTo?.(value, true);
                      }}
                      className="flex-1 accent-blue-400"
                      disabled={!isReady || duration === 0}
                    />
                    <span className="w-10 text-right tabular-nums">{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Gauge className="h-4 w-4 text-slate-300" />
                    <select
                      value={playbackRate}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setPlaybackRate(next);
                        playerRef.current?.setPlaybackRate?.(next);
                      }}
                      className="w-20 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
                      disabled={!isReady}
                    >
                      {availableRates.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}x
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <Volume2 className="h-4 w-4 text-slate-300" />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={volume}
                      onChange={(event) => handleVolumeChange(Number(event.target.value))}
                      className="w-24 accent-blue-400"
                      disabled={!isReady}
                    />
                  </div>

                <div className="flex items-center gap-2 text-xs">
                  <Subtitles className="h-4 w-4 text-slate-300" />
                  <select
                    value={captionSelection}
                    onChange={(event) => handleCaptionMenuChange(event.target.value)}
                    className="w-32 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
                    disabled={!isReady || captionsLoading}
                  >
                    <option value="off">Off</option>
                    {captionsLoading ? (
                      <option value="loading" disabled>
                        Loading...
                      </option>
                    ) : null}
                    {!captionsLoading && captionTracks.length === 0 ? (
                      <option value="none" disabled>
                        No captions
                      </option>
                    ) : null}
                    {captionTracks.map((track, index) => {
                      const label = formatCaptionLabel(track) || `Caption ${index + 1}`;
                      return (
                        <option key={track.languageCode || label} value={track.languageCode}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                  <div className="flex items-center gap-2 text-xs">
                    <Settings2 className="h-4 w-4 text-slate-300" />
                    <select
                      value={qualityOption}
                      onChange={(event) => {
                        const nextOption = event.target.value;
                        userQualityRef.current = true;
                        setQualityOption(nextOption);
                        applyQualitySelection(nextOption);
                      }}
                      className="w-24 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
                      disabled={!isReady}
                    >
                      {qualityOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
                    disabled={!isReady}
                  >
                    <Maximize2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Fullscreen</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* List */}
        <div className="mt-6">
          <div className="text-sm font-semibold text-slate-200">Free Sample Videos:</div>

          <div className="mt-3 rounded-2xl border border-white/10 overflow-hidden">
            {lessons.map((l) => {
              const isActive = l.id === activeId;
              return (
                <button
                  key={l.id}
                  onClick={() => setActiveId(l.id)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-4 text-left border-b border-white/10 last:border-b-0 ${
                    isActive ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isActive ? "bg-white/15" : "bg-white/10"}`}>
                      <PlayCircle className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="truncate font-semibold">{l.title}</div>
                      {/* ✅ no URL displayed */}
                      <div className="text-xs text-slate-400">Preview lesson</div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-300 whitespace-nowrap">{l.time}</div>
                </button>
              );
            })}
          </div>

          <button
            onClick={onBack}
            className="mt-5 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
