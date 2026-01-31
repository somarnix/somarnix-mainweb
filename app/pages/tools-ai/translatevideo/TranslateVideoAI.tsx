"use client";

import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import {
  Languages,
  FileText,
  Type,
  Scissors,
  Merge,
  Wand2,
  Upload,
  Download,
  PlusCircle,
} from "lucide-react";

type SubtitleRow = {
  id: number;
  start: string;
  end: string;
  original: string;
  translated: string;
};

type TaskMode =
  | "translate-srt"
  | "srt-to-text"
  | "text-to-text"
  | "split-srt"
  | "merge-srt";

type ProviderKey =
  | "google-free"
  | "deepl"
  | "gemini"
  ;

type LanguageOption = { code: string; label: string };

const PROVIDERS: { key: ProviderKey; label: string }[] = [
  { key: "google-free", label: "Google (Free)" },
  { key: "deepl", label: "DeepL" },
  { key: "gemini", label: "Gemini" },
];

const LANGUAGES: LanguageOption[] = [
  { code: "af", label: "Afrikaans (អាហ្វ្រិកាន)" },
  { code: "sq", label: "Albanian (អាល់បានី)" },
  { code: "am", label: "Amharic (អាំហារីក)" },
  { code: "ar-SA", label: "Arabic (Saudi Arabia) (អារ៉ាប់)" },
  { code: "ar", label: "Arabic (អារ៉ាប់)" },
  { code: "hy", label: "Armenian (អាមេនី)" },
  { code: "az", label: "Azerbaijani (អាស៊ែបៃហ្សង់)" },
  { code: "eu", label: "Basque (បាស្ក៍)" },
  { code: "be", label: "Belarusian (បេឡារុស្ស)" },
  { code: "bn-IN", label: "Bengali (India) (បង់ក្លាដែស)" },
  { code: "bn", label: "Bengali (បង់ក្លាដែស)" },
  { code: "bs-Cyrl", label: "Bosnian (Cyrillic) (បូស្នី)" },
  { code: "bs", label: "Bosnian (បូស្នី)" },
  { code: "bg", label: "Bulgarian (ប៊ុលហ្គារី)" },
  { code: "my", label: "Burmese (ភូមា)" },
  { code: "ca", label: "Catalan (កាតាឡង់)" },
  { code: "zh-CN", label: "Chinese (China) (ចិន)" },
  { code: "zh-HK", label: "Chinese (Hong Kong) (ចិន)" },
  { code: "zh-Hans", label: "Chinese (Simplified) (ចិន)" },
  { code: "zh-TW", label: "Chinese (Taiwan) (ចិន)" },
  { code: "zh-Hant", label: "Chinese (Traditional) (ចិន)" },
  { code: "zh", label: "Chinese (ចិន)" },
  { code: "hr", label: "Croatian (ក្រូអាត)" },
  { code: "cs", label: "Czech (ឆែក)" },
  { code: "da", label: "Danish (ដាណឺម៉ាក)" },
  { code: "nl-BE", label: "Dutch (Belgium) (ហូឡង់)" },
  { code: "nl", label: "Dutch (ហូឡង់)" },
  { code: "en-AU", label: "English (Australia) (អង់គ្លេស)" },
  { code: "en-CA", label: "English (Canada) (អង់គ្លេស)" },
  { code: "en-NZ", label: "English (New Zealand) (អង់គ្លេស)" },
  { code: "en-PH", label: "English (Philippines) (អង់គ្លេស)" },
  { code: "en-ZA", label: "English (South Africa) (អង់គ្លេស)" },
  { code: "en-GB", label: "English (United Kingdom) (អង់គ្លេស)" },
  { code: "en-US", label: "English (United States) (អង់គ្លេស)" },
  { code: "en", label: "English (អង់គ្លេស)" },
  { code: "et", label: "Estonian (អេស្តូនី)" },
  { code: "fil", label: "Filipino (ហ្វីលីពីន)" },
  { code: "fi", label: "Finnish (ហ្វាំងឡង់)" },
  { code: "fr-CA", label: "French (Canada) (បារាំង)" },
  { code: "fr-CH", label: "French (Switzerland) (បារាំង)" },
  { code: "fr", label: "French (បារាំង)" },
  { code: "fy", label: "Frisian (ហ្វ្រីស៊ី)" },
  { code: "gl", label: "Galician (ហ្គាលីស៊ី)" },
  { code: "ka", label: "Georgian (ហ្សកហ្ស៊ី)" },
  { code: "de", label: "German (អាល្លឺម៉ង់)" },
  { code: "el", label: "Greek (ក្រិក)" },
  { code: "gu", label: "Gujarati (ហ្គុយ៉ារាទី)" },
  { code: "he", label: "Hebrew (ហេប្រ៊ូ)" },
  { code: "hi", label: "Hindi (ហិណ្ឌី)" },
  { code: "hu", label: "Hungarian (ហុងគ្រី)" },
  { code: "is", label: "Icelandic (អ៊ីស្លង់)" },
  { code: "id", label: "Indonesian (ឥណ្ឌូនេស៊ី)" },
  { code: "it", label: "Italian (អ៊ីតាលី)" },
  { code: "ja", label: "Japanese (ជប៉ុន)" },
  { code: "km", label: "Khmer (ខ្មែរ)" },
  { code: "ko", label: "Korean (កូរ៉េ)" },
  { code: "lo", label: "Lao (ឡាវ)" },
  { code: "ms", label: "Malay (ម៉ាឡេ)" },
  { code: "ne", label: "Nepali (នេប៉ាល់)" },
  { code: "no", label: "Norwegian (ន័រវេស)" },
  { code: "fa", label: "Persian (ផាស៊ី)" },
  { code: "pl", label: "Polish (ប៉ូឡូញ)" },
  { code: "pt-BR", label: "Portuguese (Brazil) (ព័រទុយហ្គាល់)" },
  { code: "pt-PT", label: "Portuguese (Portugal) (ព័រទុយហ្គាល់)" },
  { code: "pt", label: "Portuguese (ព័រទុយហ្គាល់)" },
  { code: "ro", label: "Romanian (រូម៉ានី)" },
  { code: "ru", label: "Russian (រុស្ស៊ី)" },
  { code: "sk", label: "Slovak (ស្លូវ៉ាគី)" },
  { code: "sl", label: "Slovenian (ស្លូវ៉េនី)" },
  { code: "es-AR", label: "Spanish (Argentina) (ស្ពានីស)" },
  { code: "es-ES", label: "Spanish (Spain) (ស្ពានីស)" },
  { code: "es", label: "Spanish (ស្ពានីស)" },
  { code: "sv", label: "Swedish (ស៊ុយអែត)" },
  { code: "th", label: "Thai (ថៃ)" },
  { code: "tr", label: "Turkish (ទួរគី)" },
  { code: "uk", label: "Ukrainian (អ៊ុយក្រែន)" },
  { code: "ur", label: "Urdu (អ៊ូរឌូ)" },
  { code: "vi", label: "Vietnamese (វៀតណាម)" },
  { code: "cy", label: "Welsh (វែល)" },
  { code: "zu", label: "Zulu (ហ្សូលូ)" }
];

const normalizeDeeplCode = (code: string) => {
  const raw = code.trim();
  if (!raw) return "";
  const upper = raw.replace("_", "-").toUpperCase();
  if (upper.startsWith("ZH")) return "ZH";
  if (upper === "PT") return "PT-PT";
  if (upper === "EN") return "EN";
  return upper;
};

const DEEPL_LANGUAGE_CODES = new Set([
  "AR",
  "BG",
  "CS",
  "DA",
  "DE",
  "EL",
  "EN",
  "EN-GB",
  "EN-US",
  "ES",
  "ES-419",
  "ET",
  "FI",
  "FR",
  "HU",
  "ID",
  "IT",
  "JA",
  "KO",
  "LT",
  "LV",
  "NB",
  "NL",
  "PL",
  "PT-PT",
  "PT-BR",
  "RO",
  "RU",
  "SK",
  "SL",
  "SV",
  "TR",
  "UK",
  "ZH",
  // Beta target languages (enable_beta_languages)
  "ACE",
  "AF",
  "AN",
  "AS",
  "AY",
  "AZ",
  "BA",
  "BE",
  "BHO",
  "BN",
  "BR",
  "BS",
  "CA",
  "CEB",
  "CKB",
  "CY",
  "EO",
  "EU",
  "FA",
  "GA",
  "GL",
  "GN",
  "GOM",
  "GU",
  "HA",
  "HE",
  "HI",
  "HR",
  "HT",
  "HY",
  "IG",
  "IS",
  "JV",
  "KA",
  "KK",
  "KM",
  "KN",
  "KY",
  "LA",
  "LB",
  "LG",
  "LN",
  "LO",
  "MR",
  "MS",
  "MT",
  "MY",
  "NE",
  "NN",
  "NS",
  "OC",
  "OR",
  "PA",
  "PLS",
  "PS",
  "QU",
  "RM",
  "RN",
  "RW",
  "SE",
  "SI",
  "SN",
  "SO",
  "SQ",
  "ST",
  "SU",
  "TA",
  "TE",
  "TG",
  "TH",
  "TI",
  "TK",
  "TL",
  "TN",
  "TS",
  "TT",
  "UG",
  "UR",
  "UZ",
  "VI",
  "XH",
  "YI",
  "YO",
  "ZU",
]);

const DEEPL_LANGUAGES: LanguageOption[] = LANGUAGES.filter((lang) =>
  DEEPL_LANGUAGE_CODES.has(normalizeDeeplCode(lang.code))
);

const GEMINI_LANGUAGE_CODES = new Set([
  "ar",
  "bn",
  "bg",
  "zh",
  "hr",
  "cs",
  "da",
  "nl",
  "en",
  "et",
  "fi",
  "fr",
  "de",
  "el",
  "iw",
  "hi",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "lv",
  "lt",
  "no",
  "pl",
  "pt",
  "ro",
  "ru",
  "sr",
  "sk",
  "sl",
  "es",
  "sw",
  "sv",
  "th",
  "tr",
  "uk",
  "vi",
]);

const GEMINI_LANGUAGES: LanguageOption[] = LANGUAGES.filter((lang) =>
  GEMINI_LANGUAGE_CODES.has(lang.code)
);

const parseTimeToMs = (value: string) => {
  const cleaned = value.trim();
  const match = cleaned.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!match) return 0;
  const [, hh, mm, ss, ms] = match;
  return (
    Number(hh) * 3600000 +
    Number(mm) * 60000 +
    Number(ss) * 1000 +
    Number(ms.padEnd(3, "0").slice(0, 3))
  );
};

function parseSrt(content: string): SubtitleRow[] {
  const blocks = content
    .replace(/\r/g, "")
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  const rows: SubtitleRow[] = [];
  let counter = 1;

  for (const block of blocks) {
    const lines = block.split("\n");
    const timingLineIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingLineIndex === -1) continue;

    const timingLine = lines[timingLineIndex];
    const [start, end] = timingLine.split("-->").map((s) => s.trim());
    const textLines = lines.slice(timingLineIndex + 1).filter(Boolean);
    const original = textLines.join(" ").trim();

    rows.push({
      id: counter,
      start: start || "00:00:00,000",
      end: end || "00:00:00,000",
      original,
      translated: "",
    });

    counter += 1;
  }

  return rows;
}

function parseTextToRows(text: string): SubtitleRow[] {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, idx) => ({
    id: idx + 1,
    start: "00:00:00,000",
    end: "00:00:00,000",
    original: line,
    translated: "",
  }));
}

function toSrt(rows: SubtitleRow[]): string {
  return rows
    .map((row) => {
      return `${row.id}\n${row.start} --> ${row.end}\n${row.translated || row.original}\n`;
    })
    .join("\n");
}

function toSrtOriginal(rows: SubtitleRow[]): string {
  return rows
    .map((row) => {
      return `${row.id}\n${row.start} --> ${row.end}\n${row.original}\n`;
    })
    .join("\n");
}

function toTxt(rows: SubtitleRow[]): string {
  return rows
    .map((row) => row.translated || row.original)
    .join("\n");
}

function toTxtOriginal(rows: SubtitleRow[]): string {
  return rows.map((row) => row.original).join("\n");
}

function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function TranslateVideoAI() {
  const [mode, setMode] = useState<TaskMode>("translate-srt");
  const [provider, setProvider] = useState<ProviderKey>("google-free");
  const [targetLanguage, setTargetLanguage] = useState("km");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<SubtitleRow[]>([]);
  const [rawText, setRawText] = useState("");
  const [splitMinutes, setSplitMinutes] = useState(10);
  const [splitOutputs, setSplitOutputs] = useState<{ name: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const languageOptions = useMemo(() => {
    if (provider === "gemini") return GEMINI_LANGUAGES;
    if (provider === "deepl") return DEEPL_LANGUAGES;
    return LANGUAGES;
  }, [provider]);

  const canTranslate =
    !loading &&
    ((mode === "text-to-text" && rawText.trim().length > 0) ||
      (mode !== "text-to-text" && rows.length > 0));

  useEffect(() => {
    if (!languageOptions.find((lang) => lang.code === targetLanguage)) {
      setTargetLanguage(languageOptions[0]?.code || "en");
    }
  }, [languageOptions, targetLanguage]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    if (mode === "text-to-text") {
      setRawText(text);
      setRows([]);
      setFileName(file.name);
      setSuccess(null);
      setError(null);
      return;
    }
    const parsed = parseSrt(text);
    setRows(parsed);
    setFileName(file.name);
    setSuccess(null);
    setError(null);
  };

  const handleMultiFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const parsedLists: SubtitleRow[][] = [];
    for (const file of Array.from(files)) {
      const text = await file.text();
      parsedLists.push(parseSrt(text));
    }

    const merged = parsedLists
      .flat()
      .sort((a, b) => {
        const aStart = parseTimeToMs(a.start);
        const bStart = parseTimeToMs(b.start);
        if (aStart !== bStart) return aStart - bStart;
        const aEnd = parseTimeToMs(a.end);
        const bEnd = parseTimeToMs(b.end);
        if (aEnd !== bEnd) return aEnd - bEnd;
        return a.id - b.id;
      })
      .map((row, idx) => ({ ...row, id: idx + 1 }));

    setRows(merged);
    setFileName(`${files.length} files`);
    setSuccess("Merged subtitles loaded.");
    setError(null);
  };

  const handleTranslate = async () => {
    if (!canTranslate) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "srt-to-text") {
        setSuccess("Converted SRT to text.");
        return;
      }

      if (mode === "split-srt") {
        const durationMs = Math.max(1, splitMinutes) * 60 * 1000;
        const buckets = new Map<number, SubtitleRow[]>();
        rows.forEach((row) => {
          const startMs = parseTimeToMs(row.start);
          const bucket = Math.floor(startMs / durationMs);
          const existing = buckets.get(bucket) ?? [];
          existing.push(row);
          buckets.set(bucket, existing);
        });

        const outputs = Array.from(buckets.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([bucket, bucketRows]) => {
            const normalized = bucketRows.map((row, idx) => ({
              ...row,
              id: idx + 1,
            }));
            const label = `part-${bucket + 1}-${splitMinutes}min.srt`;
            return { name: label, content: toSrt(normalized) };
          });

        setSplitOutputs(outputs);
        setSuccess(`Split into ${outputs.length} parts.`);
        return;
      }

      if (mode === "merge-srt") {
        setSuccess("Merged subtitles ready.");
        return;
      }

      const rowsToTranslate =
        mode === "text-to-text" ? parseTextToRows(rawText) : rows;
      await translateRows(rowsToTranslate);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const translateRows = async (rowsToTranslate: SubtitleRow[]) => {
    const res = await fetch("/api/tools/translate-srt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        targetLanguage,
        rows: rowsToTranslate,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || "Translate failed. Configure provider API.");
    }

    const translatedRows: SubtitleRow[] = Array.isArray(data?.rows)
      ? data.rows
      : rowsToTranslate.map((row) => ({ ...row, translated: row.original }));

    setRows(translatedRows);
    if (data?.warning) {
      setSuccess(`Subtitle translated! (${data.warning})`);
    } else {
      setSuccess("Subtitle translated!");
    }
  };

  const handleTranslateMerged = async () => {
    if (rows.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await translateRows(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setRows([]);
    setFileName(null);
    setRawText("");
    setSplitOutputs([]);
    setSuccess(null);
    setError(null);
  };

  const outputSrt = useMemo(() => toSrt(rows), [rows]);
  const outputTxt = useMemo(() => toTxt(rows), [rows]);
  const outputSrtOriginal = useMemo(() => toSrtOriginal(rows), [rows]);
  const outputTxtOriginal = useMemo(() => toTxtOriginal(rows), [rows]);
  const hasTranslated = useMemo(
    () => rows.some((row) => row.translated && row.translated !== row.original),
    [rows]
  );

  const downloadSplitZip = async () => {
    if (splitOutputs.length === 0) return;
    const zip = new JSZip();
    splitOutputs.forEach((item) => {
      zip.file(item.name, item.content);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "srt-split-parts.zip";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveMerged = (type: "srt" | "txt") => {
    if (rows.length === 0) return;
    const wantsTranslated =
      hasTranslated &&
      window.confirm(
        "Save translated version?\nOK = translated\nCancel = original"
      );
    if (type === "srt") {
      downloadFile(
        "subtitle-merged.srt",
        wantsTranslated ? outputSrt : outputSrtOriginal
      );
    } else {
      downloadFile(
        "subtitle-merged.txt",
        wantsTranslated ? outputTxt : outputTxtOriginal
      );
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe_0%,_#ffffff_45%,_#e2e8f0_100%)] dark:bg-[radial-gradient(circle_at_top,_#111827_0%,_#0b1220_55%,_#030712_100%)]">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-[32px] border border-slate-200/70 bg-white/95 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur dark:border-gray-800/70 dark:bg-gray-900/90">
          <div className="border-b border-slate-200/70 px-6 py-6 dark:border-gray-800">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Wand2 className="h-3.5 w-3.5" />
                    Task
                  </span>
                  {[
                    { key: "translate-srt", label: "Translate SRT", icon: Languages },
                    { key: "srt-to-text", label: "SRT to Text", icon: FileText },
                    { key: "text-to-text", label: "Text to Text", icon: Type },
                    { key: "split-srt", label: "Split SRT", icon: Scissors },
                    { key: "merge-srt", label: "Merge SRT", icon: Merge },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setMode(item.key as TaskMode);
                          setRows([]);
                          setRawText("");
                          setSplitOutputs([]);
                          setFileName(null);
                          setSuccess(null);
                          setError(null);
                        }}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          mode === item.key
                            ? "bg-blue-600 text-white shadow"
                            : "border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {mode !== "srt-to-text" && (
                    <button
                      type="button"
                      onClick={handleNew}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:text-gray-300"
                    >
                      <PlusCircle className="h-4 w-4" />
                      New
                    </button>
                  )}
                  {mode !== "srt-to-text" && (
                    <button
                      type="button"
                      onClick={() =>
                        mode === "merge-srt"
                          ? handleSaveMerged("srt")
                          : downloadFile("subtitle-translated.srt", outputSrt)
                      }
                      disabled={rows.length === 0 || mode === "text-to-text"}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                    >
                      <Download className="h-4 w-4" />
                      Save SRT
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      mode === "merge-srt"
                        ? handleSaveMerged("txt")
                        : downloadFile("subtitle-translated.txt", outputTxt)
                    }
                    disabled={rows.length === 0 && rawText.trim().length === 0}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                  >
                    <Download className="h-4 w-4" />
                    Save TXT
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleTranslate}
                disabled={!canTranslate}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
              >
                <Wand2 className="h-4 w-4" />
                {loading
                  ? "Working..."
                  : mode === "translate-srt"
                    ? "Translate"
                    : mode === "text-to-text"
                      ? "Translate Text"
                      : mode === "srt-to-text"
                        ? "Convert"
                        : mode === "split-srt"
                          ? "Split"
                          : "Merge"}
                </button>
              {mode === "merge-srt" && rows.length > 0 && (
                <button
                  type="button"
                  onClick={handleTranslateMerged}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:border-blue-300 hover:bg-blue-100 disabled:opacity-50"
                >
                  <Languages className="h-4 w-4" />
                  {loading ? "Translating..." : "Translate"}
                </button>
              )}
              </div>
              {(mode === "translate-srt" || mode === "text-to-text" || mode === "merge-srt") && (
                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/70">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Provider</span>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as ProviderKey)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Target</span>
                    <div className="flex flex-col">
                      <select
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      >
                        {languageOptions.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 text-xs text-slate-400">
                        {provider === "gemini"
                          ? `Powered by Gemini • ${languageOptions.length} languages`
                          : provider === "deepl"
                            ? `Powered by DeepL API Free • 500,000 chars/month • ${languageOptions.length} languages`
                            : `Powered by Google Translate (Free) • ${languageOptions.length} languages`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-6">
            {mode === "text-to-text" ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <label className="text-xs font-semibold text-slate-500">Input Text</label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="mt-2 min-h-[140px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
            ) : mode === "merge-srt" ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <div className="flex flex-col items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    <Upload className="h-4 w-4" />
                    Choose Files
                  </div>
                  <input
                    type="file"
                    accept=".srt,.vtt,.ass,.sub,.sbv"
                    multiple
                    onChange={(e) => handleMultiFiles(e.target.files)}
                    className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-500/20 dark:file:text-blue-300"
                  />
                  {fileName && <p className="text-xs">Files: {fileName}</p>}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <div className="flex flex-col items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    <Upload className="h-4 w-4" />
                    Choose File
                  </div>
                  <input
                    type="file"
                    accept=".srt,.vtt,.ass,.sub,.sbv,.txt"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-500/20 dark:file:text-blue-300"
                  />
                  {fileName && <p className="text-xs">File: {fileName}</p>}
                </div>
              </div>
            )}

            {mode === "split-srt" && (
              <div className="mt-4 flex items-center gap-3 text-sm text-slate-600">
                <span className="text-xs font-semibold text-slate-500">Split every</span>
                <input
                  type="number"
                  min={1}
                  value={splitMinutes}
                  onChange={(e) => setSplitMinutes(Number(e.target.value) || 1)}
                  className="w-20 rounded-lg border border-slate-200 px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
                <span className="text-xs font-semibold text-slate-500">minutes</span>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 shadow-sm">
                {success}
              </div>
            )}

            {mode === "text-to-text" && rows.length > 0 && (
              <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-gray-800">
                <label className="text-xs font-semibold text-slate-500">Translated Text</label>
                <textarea
                  value={toTxt(rows)}
                  readOnly
                  className="mt-2 min-h-[140px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
            )}

            {mode === "srt-to-text" && rows.length > 0 && (
              <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-gray-800">
                <label className="text-xs font-semibold text-slate-500">Output Text</label>
                <textarea
                  value={toTxt(rows)}
                  readOnly
                  className="mt-2 min-h-[140px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
            )}

            {mode === "split-srt" && splitOutputs.length > 0 && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-gray-800 dark:bg-gray-900/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-700 dark:text-gray-200">
                    Split Results
                  </div>
                  <button
                    type="button"
                    onClick={downloadSplitZip}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download All (ZIP)
                  </button>
                </div>
                <div className="mt-3 grid gap-2">
                  {splitOutputs.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    >
                      <span className="text-slate-600 dark:text-gray-300">{item.name}</span>
                      <button
                        type="button"
                        onClick={() => downloadFile(item.name, item.content)}
                        className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rows.length > 0 &&
              mode !== "text-to-text" &&
              mode !== "split-srt" && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-gray-800">
                <div className="max-h-[520px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-xs font-semibold uppercase text-slate-500 dark:bg-gray-800 dark:text-gray-400">
                      <tr>
                        <th className="px-3 py-2">No.</th>
                        <th className="px-3 py-2">From</th>
                        <th className="px-3 py-2">To</th>
                        <th className="px-3 py-2">Original Text</th>
                        {mode !== "srt-to-text" && (
                          <th className="px-3 py-2">Translated Text</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-200 dark:border-gray-800">
                          <td className="px-3 py-2 text-slate-500">{row.id}</td>
                          <td className="px-3 py-2 text-slate-600">{row.start}</td>
                          <td className="px-3 py-2 text-slate-600">{row.end}</td>
                          <td className="px-3 py-2">
                            <textarea
                              value={row.original}
                              onChange={(e) => {
                                const next = rows.map((r) =>
                                  r.id === row.id ? { ...r, original: e.target.value } : r
                                );
                                setRows(next);
                              }}
                              className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            />
                          </td>
                          {mode !== "srt-to-text" && (
                            <td className="px-3 py-2">
                              <textarea
                                value={row.translated}
                                onChange={(e) => {
                                  const next = rows.map((r) =>
                                    r.id === row.id ? { ...r, translated: e.target.value } : r
                                  );
                                  setRows(next);
                                }}
                                className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
