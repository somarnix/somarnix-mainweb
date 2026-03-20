export const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

export function getYearMonthKey(value?: string | null): { year: string; month: string } {
  const raw = String(value || "").trim();
  if (!raw) return { year: "", month: "" };

  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return { year, month: `${year}-${month}` };
  }

  const match = raw.match(/(\d{4})-(\d{2})/);
  if (match) {
    return { year: match[1], month: `${match[1]}-${match[2]}` };
  }

  return { year: "", month: "" };
}
