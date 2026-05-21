"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  Globe2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  Paintbrush,
  Newspaper,
  Plus,
  Quote,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from "lucide-react";

import { YouTubeApiPlayer } from "@/app/components/public/YouTubeApiPlayer";
import { getVerticalVideoPreview, normalizeExternalVideoUrl } from "@/app/lib/video-embed";

type CmsContentType = "page" | "post" | "short";
type CmsStatus = "draft" | "published";

type CmsEntry = {
  id: number;
  contentType: CmsContentType;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  status: CmsStatus;
  featuredImageUrl: string | null;
  videoUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  menuLabel: string | null;
  showInMenu: boolean;
  sortOrder: number;
  publishedAt: string | null;
  updatedAt: string | null;
};

type CmsForm = {
  id: number | null;
  contentType: CmsContentType;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  status: CmsStatus;
  featuredImageUrl: string;
  videoUrl: string;
  seoTitle: string;
  seoDescription: string;
  menuLabel: string;
  showInMenu: boolean;
  sortOrder: string;
};

type ContentFormatMode = "bold" | "italic" | "h1" | "h2" | "h3" | "quote" | "list";
type EditorMode = "visual" | "source";
type ActiveContentFormats = Record<ContentFormatMode, boolean>;

const CMS_FONT_OPTIONS = [
  "Arial",
  "Impact",
  "Lobster",
  "EB Garamond",
  "Caveat",
  "Georgia",
  "Comic Sans MS",
  "Courier New",
  "Noto Sans Khmer",
  "Noto Serif Khmer",
  "Battambang",
  "Kantumruy Pro",
  "Hanuman",
  "Siemreap",
  "Moul",
  "Koulen",
  "Bayon",
  "Bokor",
  "Dangrek",
  "Khmer",
  "Lexend",
  "Lora",
  "Merriweather",
  "Montserrat",
  "Nunito",
  "Oswald",
  "Pacifico",
  "Playfair Display",
  "Roboto",
  "Roboto Mono",
  "Roboto Serif",
  "Comfortaa",
];

const EMPTY_ACTIVE_FORMATS: ActiveContentFormats = {
  bold: false,
  italic: false,
  h1: false,
  h2: false,
  h3: false,
  quote: false,
  list: false,
};

function getFontFamily(fontName: string) {
  const fallbacks: Record<string, string> = {
    "Noto Sans Khmer": '"Noto Sans Khmer", "Khmer OS Battambang", "Khmer OS", Arial, sans-serif',
    "Noto Serif Khmer": '"Noto Serif Khmer", "Khmer OS Muol Light", serif',
    Battambang: "Battambang, Khmer OS Battambang, Khmer OS, Arial, sans-serif",
    "Kantumruy Pro": '"Kantumruy Pro", Khmer OS, Arial, sans-serif',
    Hanuman: "Hanuman, Khmer OS, serif",
    Siemreap: "Siemreap, Khmer OS, Arial, sans-serif",
    Moul: "Moul, Khmer OS Muol Light, serif",
    Koulen: "Koulen, Khmer OS Muol Light, Arial, sans-serif",
    Bayon: "Bayon, Khmer OS Muol Light, Arial, sans-serif",
    Bokor: "Bokor, Khmer OS Muol Light, serif",
    Dangrek: "Dangrek, Khmer OS Muol Light, Arial, sans-serif",
    Khmer: "Noto Sans Khmer, Khmer OS Battambang, Khmer OS, Arial, sans-serif",
    Arial: "Arial, Helvetica, sans-serif",
    Georgia: "Georgia, serif",
    "Comic Sans MS": '"Comic Sans MS", cursive',
    "Courier New": '"Courier New", monospace',
  };
  return fallbacks[fontName] || `"${fontName}", Arial, sans-serif`;
}

function stripFontTags(value: string) {
  return value.replace(/\[\/?font[^\]]*\]/g, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function findMatchingFontClose(value: string, start: number) {
  let depth = 1;
  let index = start;

  while (index < value.length) {
    const nextOpen = value.indexOf("[font=", index);
    const nextClose = value.indexOf("[/font]", index);

    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      index = nextOpen + "[font=".length;
      continue;
    }

    depth -= 1;
    if (depth === 0) return nextClose;
    index = nextClose + "[/font]".length;
  }

  return -1;
}

function renderCmsInlineHtml(value: string): string {
  let html = "";
  let index = 0;

  while (index < value.length) {
    if (value.startsWith("[font=", index)) {
      const nameEnd = value.indexOf("]", index + 6);
      const close = nameEnd > -1 ? findMatchingFontClose(value, nameEnd + 1) : -1;
      if (nameEnd > -1 && close > -1) {
        const fontName = value.slice(index + 6, nameEnd).trim();
        const inner = value.slice(nameEnd + 1, close);
        html += `<span data-font="${escapeAttribute(fontName)}" style="font-family:${escapeAttribute(
          getFontFamily(fontName)
        )}">${renderCmsInlineHtml(inner)}</span>`;
        index = close + "[/font]".length;
        continue;
      }
    }

    if (value.startsWith("**", index)) {
      const close = value.indexOf("**", index + 2);
      if (close > -1) {
        html += `<strong>${renderCmsInlineHtml(value.slice(index + 2, close))}</strong>`;
        index = close + 2;
        continue;
      }
    }

    if (value[index] === "*") {
      const close = value.indexOf("*", index + 1);
      if (close > -1) {
        html += `<em>${renderCmsInlineHtml(value.slice(index + 1, close))}</em>`;
        index = close + 1;
        continue;
      }
    }

    const nextMarkers = [
      value.indexOf("[font=", index + 1),
      value.indexOf("**", index + 1),
      value.indexOf("*", index + 1),
    ].filter((next) => next > -1);
    const next = nextMarkers.length ? Math.min(...nextMarkers) : value.length;
    html += escapeHtml(value.slice(index, next));
    index = next;
  }

  return html;
}

function cmsMarkupToEditorHtml(content: string) {
  const lines = content.split("\n");
  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push(`<h3>${renderCmsInlineHtml(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      blocks.push(`<h2>${renderCmsInlineHtml(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith("# ")) {
      blocks.push(`<h1>${renderCmsInlineHtml(trimmed.slice(2))}</h1>`);
    } else if (trimmed.startsWith("> ")) {
      blocks.push(`<blockquote>${renderCmsInlineHtml(trimmed.slice(2))}</blockquote>`);
    } else if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(`<li>${renderCmsInlineHtml(lines[index].trim().slice(2))}</li>`);
        index += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    } else {
      blocks.push(`<p>${renderCmsInlineHtml(trimmed)}</p>`);
    }

    index += 1;
  }

  return blocks.length ? blocks.join("") : "<p><br></p>";
}

function serializeEditorNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replace(/\u00a0/g, " ");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map(serializeEditorNode).join("");
  const blockText = children.trim();

  if (tagName === "br") return "\n";
  if (tagName === "strong" || tagName === "b") return blockText ? `**${children}**` : children;
  if (tagName === "em" || tagName === "i") return blockText ? `*${children}*` : children;
  if (tagName === "span" && element.dataset.font) {
    return `[font=${element.dataset.font}]${children}[/font]`;
  }
  if (tagName === "h1") return blockText ? `# ${blockText}\n\n` : "";
  if (tagName === "h2") return blockText ? `## ${blockText}\n\n` : "";
  if (tagName === "h3") return blockText ? `### ${blockText}\n\n` : "";
  if (tagName === "blockquote") {
    return blockText
      ? `${blockText
          .split("\n")
          .map((line) => `> ${line.trim()}`)
          .join("\n")}\n\n`
      : "";
  }
  if (tagName === "li") return blockText ? `- ${blockText}\n` : "";
  if (tagName === "ul" || tagName === "ol") return `${children.trimEnd()}\n\n`;
  if (tagName === "p" || tagName === "div") return blockText ? `${blockText}\n\n` : "";

  return children;
}

function serializeEditorContent(editor: HTMLElement | null) {
  if (!editor) return "";
  return Array.from(editor.childNodes)
    .map(serializeEditorNode)
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function unwrapNestedFontSpans(container: HTMLElement) {
  container.querySelectorAll("span[data-font]").forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  });
}

const EMPTY_FORM: CmsForm = {
  id: null,
  contentType: "page",
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  status: "draft",
  featuredImageUrl: "",
  videoUrl: "",
  seoTitle: "",
  seoDescription: "",
  menuLabel: "",
  showInMenu: false,
  sortOrder: "0",
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 191);
}

function buildCopySlug(item: CmsEntry, items: CmsEntry[]) {
  const originalSlug = (item.slug || slugify(item.title)).replace(/(?:-copy(?:-\d+)?)+$/i, "");
  const base = `${originalSlug || slugify(stripCopySuffix(item.title)) || "content"}-copy`;
  const existing = new Set(
    items
      .filter((entry) => entry.contentType === item.contentType)
      .map((entry) => entry.slug)
  );

  if (!existing.has(base)) return base;

  let index = 2;
  while (existing.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

function stripCopySuffix(value: string) {
  return value.replace(/(?:\s*\(Copy\))+$/gi, "").trim();
}

function buildCopyTitle(value: string) {
  const base = stripCopySuffix(value);
  return `${base || "Untitled"} (Copy)`;
}

function getPublicPath(item: Pick<CmsEntry | CmsForm, "contentType" | "slug">) {
  if (item.contentType === "short") return `/news/${item.slug}`;
  return item.contentType === "post" ? `/post/${item.slug}` : `/page/${item.slug}`;
}

function mapEntryToForm(item: CmsEntry): CmsForm {
  return {
    id: item.id,
    contentType: item.contentType,
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt ?? "",
    content: item.content,
    status: item.status,
    featuredImageUrl: item.featuredImageUrl ?? "",
    videoUrl: item.videoUrl ?? "",
    seoTitle: item.seoTitle ?? "",
    seoDescription: item.seoDescription ?? "",
    menuLabel: item.menuLabel ?? "",
    showInMenu: item.showInMenu,
    sortOrder: String(item.sortOrder ?? 0),
  };
}

export default function AdminCmsPage() {
  const [items, setItems] = useState<CmsEntry[]>([]);
  const [form, setForm] = useState<CmsForm>(EMPTY_FORM);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const visualEditorRef = useRef<HTMLDivElement | null>(null);
  const savedVisualRangeRef = useRef<Range | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("visual");
  const [activeFormats, setActiveFormats] = useState<ActiveContentFormats>(EMPTY_ACTIVE_FORMATS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | CmsContentType>("all");
  const [query, setQuery] = useState("");
  const isShortForm = form.contentType === "short";
  const shortPreview = isShortForm ? getVerticalVideoPreview(form.videoUrl) : null;
  const shortPreviewUrl = shortPreview?.embedUrl ?? "";

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/cms", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load CMS content");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load CMS content");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(
    () => ({
      total: items.length,
      pages: items.filter((item) => item.contentType === "page").length,
      posts: items.filter((item) => item.contentType === "post").length,
      shorts: items.filter((item) => item.contentType === "short").length,
      published: items.filter((item) => item.status === "published").length,
      drafts: items.filter((item) => item.status === "draft").length,
    }),
    [items]
  );

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && item.contentType !== filter) return false;
      if (!term) return true;
      return (
        item.title.toLowerCase().includes(term) ||
        item.slug.toLowerCase().includes(term) ||
        (item.excerpt ?? "").toLowerCase().includes(term)
      );
    });
  }, [filter, items, query]);

  const resetForm = (contentType: CmsContentType = "page") => {
    setForm({ ...EMPTY_FORM, contentType });
    setError(null);
  };

  useEffect(() => {
    const editor = visualEditorRef.current;
    if (!editor || document.activeElement === editor) return;
    editor.innerHTML = cmsMarkupToEditorHtml(form.content);
  }, [editorMode, form.content, form.id]);

  const syncVisualEditorToForm = () => {
    const content = serializeEditorContent(visualEditorRef.current);
    setForm((prev) => ({ ...prev, content }));
    return content;
  };

  const updateActiveFormats = () => {
    const editor = visualEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) {
      setActiveFormats(EMPTY_ACTIVE_FORMATS);
      return EMPTY_ACTIVE_FORMATS;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      setActiveFormats(EMPTY_ACTIVE_FORMATS);
      return EMPTY_ACTIVE_FORMATS;
    }

    const block = String(document.queryCommandValue("formatBlock") || "").toLowerCase();
    const next: ActiveContentFormats = {
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      h1: block.includes("h1") || block.includes("heading 1"),
      h2: block.includes("h2") || block.includes("heading 2"),
      h3: block.includes("h3") || block.includes("heading 3"),
      quote: block.includes("blockquote"),
      list: document.queryCommandState("insertUnorderedList"),
    };

    setActiveFormats(next);
    return next;
  };

  const saveVisualSelection = () => {
    const editor = visualEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedVisualRangeRef.current = range.cloneRange();
      updateActiveFormats();
    }
  };

  const restoreVisualSelection = () => {
    const editor = visualEditorRef.current;
    if (!editor) return null;

    editor.focus();
    const selection = window.getSelection();
    if (!selection) return null;

    selection.removeAllRanges();
    const savedRange = savedVisualRangeRef.current;
    if (savedRange && editor.contains(savedRange.commonAncestorContainer)) {
      selection.addRange(savedRange);
      return savedRange;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.addRange(range);
    savedVisualRangeRef.current = range.cloneRange();
    return range;
  };

  const applyVisualFont = (fontName: string) => {
    const range = restoreVisualSelection();
    if (!range) return;

    const span = document.createElement("span");
    span.dataset.font = fontName;
    span.style.fontFamily = getFontFamily(fontName);

    if (range.collapsed) {
      span.textContent = "font styled text";
    } else {
      span.appendChild(range.extractContents());
    }

    unwrapNestedFontSpans(span);
    range.insertNode(span);
    range.selectNodeContents(span);
    range.collapse(false);
    saveVisualSelection();
    updateActiveFormats();
    syncVisualEditorToForm();
  };

  const applyVisualFormat = (mode: ContentFormatMode) => {
    restoreVisualSelection();
    const currentFormats = updateActiveFormats();

    if (mode === "bold" || mode === "italic") {
      document.execCommand(mode, false);
    } else if (mode === "list") {
      document.execCommand("insertUnorderedList", false);
    } else if (currentFormats[mode]) {
      document.execCommand("formatBlock", false, "p");
    } else {
      const value =
        mode === "h1"
          ? "h1"
          : mode === "h2"
            ? "h2"
            : mode === "h3"
              ? "h3"
              : "blockquote";
      document.execCommand("formatBlock", false, value);
    }

    saveVisualSelection();
    updateActiveFormats();
    syncVisualEditorToForm();
  };

  const cleanVisualFonts = () => {
    const editor = visualEditorRef.current;
    if (!editor) return;
    editor.querySelectorAll("span[data-font]").forEach((span) => {
      const parent = span.parentNode;
      if (!parent) return;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
    });
    updateActiveFormats();
    syncVisualEditorToForm();
  };

  const replaceSelectedContent = (formatted: string, start: number, end: number) => {
    const content = form.content;
    const nextContent = `${content.slice(0, start)}${formatted}${content.slice(end)}`;
    setForm((prev) => ({ ...prev, content: nextContent }));

    window.setTimeout(() => {
      contentRef.current?.focus();
      const nextCursor = start + formatted.length;
      contentRef.current?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const applyContentFont = (fontName: string) => {
    if (!CMS_FONT_OPTIONS.includes(fontName)) return;
    if (editorMode === "visual") {
      applyVisualFont(fontName);
      return;
    }

    const textarea = contentRef.current;
    const content = form.content;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;
    const selected = stripFontTags(content.slice(start, end) || "font styled text");
    replaceSelectedContent(`[font=${fontName}]${selected}[/font]`, start, end);
  };

  const applyContentFormat = (mode: ContentFormatMode) => {
    if (editorMode === "visual") {
      applyVisualFormat(mode);
      return;
    }

    const textarea = contentRef.current;
    const content = form.content;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;
    const selected = content.slice(start, end);
    const fallbackText =
      mode === "bold"
        ? "bold text"
        : mode === "italic"
          ? "italic text"
          : mode === "quote"
            ? "quote text"
            : mode === "list"
              ? "list item"
              : "Heading";
    const target = selected || fallbackText;
    const prefixLines = (prefix: string) =>
      target
        .split("\n")
        .map((line) => `${prefix}${line.replace(/^(#{1,3}|>|-)\s+/, "")}`)
        .join("\n");
    const formatted =
      mode === "bold"
        ? `**${target}**`
        : mode === "italic"
          ? `*${target}*`
          : mode === "h1"
            ? prefixLines("# ")
            : mode === "h2"
              ? prefixLines("## ")
              : mode === "h3"
                ? prefixLines("### ")
                : mode === "quote"
                  ? prefixLines("> ")
                  : prefixLines("- ");
    replaceSelectedContent(formatted, start, end);
  };

  const cleanSelectedFonts = () => {
    if (editorMode === "visual") {
      cleanVisualFonts();
      return;
    }

    const textarea = contentRef.current;
    const content = form.content;
    const start = textarea?.selectionStart ?? 0;
    const end = textarea?.selectionEnd ?? content.length;
    const selected = content.slice(start, end) || content;
    const cleaned = stripFontTags(selected);
    replaceSelectedContent(cleaned, selected ? start : 0, selected ? end : content.length);
  };

  const startEdit = (item: CmsEntry) => {
    setForm(mapEntryToForm(item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const method = form.id ? "PATCH" : "POST";
      const content = form.contentType === "short"
        ? form.content.trim() || form.title
        : editorMode === "visual"
          ? syncVisualEditorToForm()
          : form.content;
      const res = await fetch("/api/admin/cms", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          contentType: form.contentType,
          slug: form.slug,
          title: form.title,
          excerpt: form.excerpt,
          content,
          status: form.status,
          featuredImageUrl: form.contentType === "short" ? "" : form.featuredImageUrl,
          videoUrl: form.contentType === "short" ? normalizeExternalVideoUrl(form.videoUrl) : form.videoUrl,
          seoTitle: form.seoTitle,
          seoDescription: form.seoDescription,
          menuLabel: form.menuLabel,
          showInMenu: form.showInMenu,
          sortOrder: Number(form.sortOrder || 0),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save content");
      setItems(Array.isArray(data.items) ? data.items : []);
      resetForm(form.contentType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save content");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/cms", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete content");
      setItems(Array.isArray(data.items) ? data.items : []);
      if (form.id === id) resetForm(form.contentType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete content");
    } finally {
      setSaving(false);
    }
  };

  const copyItem = async (item: CmsEntry) => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: item.contentType,
          slug: buildCopySlug(item, items),
          title: buildCopyTitle(item.title),
          excerpt: item.excerpt ?? "",
          content: item.content,
          status: "draft",
          featuredImageUrl: item.featuredImageUrl ?? "",
          videoUrl: item.videoUrl ?? "",
          seoTitle: item.seoTitle ?? "",
          seoDescription: item.seoDescription ?? "",
          menuLabel: item.menuLabel ? buildCopyTitle(item.menuLabel) : "",
          showInMenu: false,
          sortOrder: item.sortOrder,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to copy content");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to copy content");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              <Globe2 className="h-3.5 w-3.5" />
              CMS Admin
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
              Website Pages, News And Shorts
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Create pages, news posts, and 9:16 video shorts.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {[
              ["Total", stats.total],
              ["Pages", stats.pages],
              ["News", stats.posts],
              ["Shorts", stats.shorts],
              ["Live", stats.published],
              ["Drafts", stats.drafts],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="text-xs text-slate-500 dark:text-slate-300">{label}</div>
                <div className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              {form.id ? "Edit Content" : "Create Content"}
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => resetForm("page")}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Page
              </button>
              <button
                type="button"
                onClick={() => resetForm("post")}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                News
              </button>
              <button
                type="button"
                onClick={() => resetForm("short")}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Short
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Type</span>
                <select
                  value={form.contentType}
                  onChange={(event) =>
                    setForm((prev) => {
                      const nextType = event.target.value as CmsContentType;
                      return {
                        ...prev,
                        contentType: nextType,
                        featuredImageUrl: nextType === "short" ? "" : prev.featuredImageUrl,
                        content: nextType === "short" ? prev.content || prev.title : prev.content,
                      };
                    })
                  }
                  className="w-full bg-transparent text-slate-950 outline-none dark:text-white"
                >
                  <option value="page">Page</option>
                  <option value="post">News Post</option>
                  <option value="short">Shorts Post</option>
                </select>
              </label>
              <label className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Status</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, status: event.target.value as CmsStatus }))
                  }
                  className="w-full bg-transparent text-slate-950 outline-none dark:text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Title
              </label>
              <input
                value={form.title}
                onChange={(event) => {
                  const title = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    title,
                    slug: prev.slug || slugify(title),
                  }));
                }}
                className="w-full rounded-md border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder={isShortForm ? "Short video title" : "About our services"}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Slug
              </label>
              <input
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))}
                className="w-full rounded-md border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="about-our-services"
              />
              {form.slug ? (
                <div className="mt-1 text-xs text-slate-500">
                  URL: {getPublicPath(form)}
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                {isShortForm ? "Caption" : "Excerpt"}
              </label>
              <textarea
                value={form.excerpt}
                onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
                rows={3}
                className="w-full rounded-md border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder={isShortForm ? "Short caption for previews." : "Short summary for SEO and previews."}
              />
            </div>

            {isShortForm ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Shorts Video Link
                </label>
                <input
                  value={form.videoUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, videoUrl: event.target.value }))}
                  className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  placeholder="Paste YouTube Shorts, Facebook Reel/video, or TikTok video link"
                />
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Shorts use this video link only. Do not add a featured image. Use a vertical 9:16 video link.
                </p>
                {shortPreview ? (
                  <p className="mt-2 break-all rounded-md border border-blue-100 bg-blue-50 px-2.5 py-2 text-xs text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                    {shortPreview.provider === "youtube" ? "YouTube watch URL" : "Embed preview URL"}:{" "}
                    {shortPreview.provider === "youtube" ? shortPreview.watchUrl : shortPreview.embedUrl}
                  </p>
                ) : null}
                {shortPreview?.provider === "youtube" ? (
                  <YouTubeApiPlayer
                    videoUrl={form.videoUrl}
                    title="Short video preview"
                    className="mt-3 aspect-[9/16] max-w-[220px] rounded-lg shadow-md"
                  />
                ) : shortPreviewUrl ? (
                  <div className="mt-3 max-w-[220px] overflow-hidden rounded-lg bg-black shadow-md">
                    <iframe
                      key={shortPreviewUrl}
                      src={shortPreviewUrl}
                      title="Short video preview"
                      className="aspect-[9/16] w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                ) : form.videoUrl.trim() ? (
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                    Preview is available for YouTube, Facebook, and full TikTok video URLs.
                  </div>
                ) : null}
              </div>
            ) : null}

            {!isShortForm ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Content
              </label>
              <div className="mb-2 flex flex-wrap gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950/50">
                <div className="mr-1 inline-flex rounded border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
                  {(["visual", "source"] as EditorMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        if (editorMode === "visual") syncVisualEditorToForm();
                        if (mode === "source") setActiveFormats(EMPTY_ACTIVE_FORMATS);
                        setEditorMode(mode);
                      }}
                      className={`rounded px-2.5 py-1.5 text-xs font-bold capitalize transition ${
                        editorMode === mode
                          ? "bg-blue-600 text-white"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <select
                  aria-label="Font family"
                  defaultValue=""
                  onChange={(event) => {
                    applyContentFont(event.target.value);
                    event.currentTarget.value = "";
                  }}
                  className="min-h-8 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none transition hover:border-blue-300 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="" disabled>
                    More fonts
                  </option>
                  {CMS_FONT_OPTIONS.map((fontName) => (
                    <option
                      key={fontName}
                      value={fontName}
                      style={{ fontFamily: getFontFamily(fontName) }}
                    >
                      {fontName}
                    </option>
                  ))}
                </select>
                {[
                  { label: "H1", icon: Heading1, mode: "h1" },
                  { label: "H2", icon: Heading2, mode: "h2" },
                  { label: "H3", icon: Heading3, mode: "h3" },
                  { label: "Bold", icon: Bold, mode: "bold" },
                  { label: "Italic", icon: Italic, mode: "italic" },
                  { label: "Quote", icon: Quote, mode: "quote" },
                  { label: "List", icon: List, mode: "list" },
                ].map((tool) => {
                  const Icon = tool.icon;
                  const mode = tool.mode as ContentFormatMode;
                  const isActive = editorMode === "visual" && activeFormats[mode];
                  return (
                    <button
                      key={tool.mode}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyContentFormat(mode)}
                      aria-pressed={isActive}
                      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-bold transition ${
                        isActive
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-300"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:text-blue-300"
                      }`}
                      title={tool.label}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tool.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={cleanSelectedFonts}
                  className="inline-flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                  title="Remove font tags from selected text"
                >
                  <Paintbrush className="h-3.5 w-3.5" />
                  Clean font
                </button>
              </div>
              {editorMode === "visual" ? (
                <div
                  ref={visualEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => {
                    syncVisualEditorToForm();
                    updateActiveFormats();
                  }}
                  onBlur={() => {
                    syncVisualEditorToForm();
                    setActiveFormats(EMPTY_ACTIVE_FORMATS);
                  }}
                  onKeyUp={saveVisualSelection}
                  onMouseUp={saveVisualSelection}
                  onClick={saveVisualSelection}
                  onFocus={saveVisualSelection}
                  className="min-h-72 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-950 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white [&_blockquote]:border-l-4 [&_blockquote]:border-blue-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_li]:ml-5 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc"
                />
              ) : (
                <textarea
                  ref={contentRef}
                  value={form.content}
                  onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                  rows={12}
                  className="w-full rounded-md border border-slate-200 px-4 py-3 text-sm leading-7 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  placeholder={
                    "Use the toolbar for headings, bold, italic, quote, and lists.\nUse blank lines for paragraphs."
                  }
                />
              )}
            </div>
            ) : null}

            {!isShortForm ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Featured Image URL
              </label>
              <input
                value={form.featuredImageUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, featuredImageUrl: event.target.value }))}
                className="w-full rounded-md border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="/uploads/page-cover.jpg"
              />
            </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={form.seoTitle}
                onChange={(event) => setForm((prev) => ({ ...prev, seoTitle: event.target.value }))}
                className="rounded-md border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="SEO title"
              />
              <input
                value={form.menuLabel}
                onChange={(event) => setForm((prev) => ({ ...prev, menuLabel: event.target.value }))}
                className="rounded-md border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="Menu label"
              />
            </div>

            <textarea
              value={form.seoDescription}
              onChange={(event) => setForm((prev) => ({ ...prev, seoDescription: event.target.value }))}
              rows={2}
              className="w-full rounded-md border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="SEO description"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="inline-flex items-center gap-3 rounded-md border border-slate-200 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.showInMenu}
                  onChange={(event) => setForm((prev) => ({ ...prev, showInMenu: event.target.checked }))}
                />
                Show in menu
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                className="rounded-md border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="Sort order"
              />
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {form.id ? "Save Content" : "Create Content"}
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["all", "page", "post", "short"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                    filter === item
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {item === "post" || item === "short" ? <Newspaper className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  {item === "all" ? "All" : item === "page" ? "Pages" : item === "post" ? "News" : "Shorts"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  placeholder="Search content"
                />
              </div>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-md border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                Loading CMS content...
              </div>
            ) : null}

            {!loading && filteredItems.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                No content found.
              </div>
            ) : null}

            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {item.contentType}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          item.status === "published"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.showInMenu ? (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                          Menu
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">{item.title}</h3>
                    <div className="mt-1 break-all text-sm text-blue-600 dark:text-blue-300">
                      {getPublicPath(item)}
                    </div>
                    {item.excerpt ? (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                        {item.excerpt}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.status === "published" ? (
                      <a
                        href={getPublicPath(item)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyItem(item)}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(item.id)}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
