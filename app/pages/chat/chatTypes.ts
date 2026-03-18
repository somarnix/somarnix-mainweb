export type PresenceInfo = {
  status: string | null;
  lastActiveAt: string | null;
};

export type Participant = {
  id: number | null;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  avatarBorderUrl?: string | null;
  presence?: PresenceInfo;
};

export type ConversationSummary = {
  id: number;
  orderId: number;
  orderNumber: string;
  state: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageFromAdmin: boolean;
  lastMessageType?: "text" | "sticker" | "emoji" | null;
  lastStickerPath?: string | null;
  buyer: Participant & { id: number; email: string };
  seller: Participant;
  unreadCount: number;
};

export type ConversationDetail = {
  id: number;
  orderId: number;
  orderNumber: string;
  topic: string;
  lastMessageAt: string | null;
  buyer: Participant & { id: number; email: string };
  seller: Participant;
};

export type MessageReaction = {
  emoji: string;
  count: number;
  reacted: boolean;
};

export type ChatMessage = {
  id: number;
  senderId: number;
  body: string;
  attachmentUrl: string | null;
  createdAt: string | null;
  isAdmin: boolean;
  type: "text" | "sticker" | "emoji";
  stickerPath: string | null;
  deletedAt: string | null;
  deletedBy?: number | null;
  buyerSeenAt?: string | null;
  sellerSeenAt?: string | null;
  isPinned: boolean;
  editedAt: string | null;
  editedBy?: number | null;
  sender: {
    name: string | null;
    email: string;
    avatarUrl: string | null;
    avatarBorderUrl?: string | null;
  };
  reactions: MessageReaction[];
};

export type StickerPack = {
  id: string;
  label: string;
  cover?: string | null;
  stickers: string[];
};
