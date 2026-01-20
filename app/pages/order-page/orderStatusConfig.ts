import type { OrderStatus } from "@/lib/order-status";

type Language = "en" | "km";

type StatusCopy = Record<OrderStatus, { en: string; km: string }>;

const STATUS_TEXT: StatusCopy = {
  pending: {
    en: "Order is Preparing",
    km: "ការបញ្ជាទិញកំពុងត្រៀម",
  },
  approved: {
    en: "Approved",
    km: "បានអនុម័ត",
  },
  delivering: {
    en: "Delivering",
    km: "កំពុងដឹកជញ្ជូន",
  },
  completed: {
    en: "Completed",
    km: "បានបញ្ចប់",
  },
  cancelled: {
    en: "Cancelled",
    km: "បានបោះបង់",
  },
  resolution: {
    en: "Resolution",
    km: "ដោះស្រាយបញ្ហា",
  },
};

export const ORDER_STATUS_TABS: Array<{
  key: OrderStatus;
  labelEn: string;
  labelKm: string;
}> = [
  { key: "pending", labelEn: "Order is Preparing", labelKm: STATUS_TEXT.pending.km },
  { key: "approved", labelEn: "Approve", labelKm: STATUS_TEXT.approved.km },
  { key: "delivering", labelEn: "Delivering", labelKm: STATUS_TEXT.delivering.km },
  { key: "completed", labelEn: "Complete", labelKm: STATUS_TEXT.completed.km },
  { key: "cancelled", labelEn: "Cancelled", labelKm: STATUS_TEXT.cancelled.km },
  { key: "resolution", labelEn: "Resolution", labelKm: STATUS_TEXT.resolution.km },
];

export function getStatusLabel(status: OrderStatus, language: Language): string {
  const labels = STATUS_TEXT[status];
  if (!labels) return status;
  return language === "km" ? labels.km : labels.en;
}
