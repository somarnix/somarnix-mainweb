"use client";

import { ChatPage } from "./ChatPage";

interface ChatConversationPageProps {
  orderId: number | string;
  onNavigate: (page: string) => void;
  onOpenOrderDetail?: (orderId: number) => void;
}

export function ChatConversationPage({
  orderId,
  onNavigate,
  onOpenOrderDetail,
}: ChatConversationPageProps) {
  const numericOrderId =
    typeof orderId === "number" ? orderId : Number(orderId);
  const initialOrderId = Number.isNaN(numericOrderId) ? null : numericOrderId;

  return (
    <ChatPage
      onNavigate={onNavigate}
      initialOrderId={initialOrderId}
      onOpenOrderDetail={onOpenOrderDetail}
      hideList
    />
  );
}
