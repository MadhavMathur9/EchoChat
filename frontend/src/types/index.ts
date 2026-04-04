export interface MessageDTO {
  id: string;
  senderUuid: string;
  senderName: string;
  senderType: 'USER' | 'GEMINI';
  content: string;
  timestamp: string;
}

export interface PresenceDTO {
  type: 'JOIN' | 'LEAVE';
  senderName: string;
  activeCount: number;
}

export interface ErrorDTO {
  code: string;
  message: string;
}

export interface RoomMetadataResponse {
    roomId: string;
    displayName: string;
    isPrivate: boolean;
    maxUsers: number;
    activeCount: number;
}
