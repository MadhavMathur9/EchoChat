import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import toast from 'react-hot-toast';
import type { MessageDTO, PresenceDTO, ErrorDTO } from '../types';

interface UseChatRoomOptions {
  roomId: string;
  userUuid: string;
  displayName: string;
  initialActiveCount?: number;
}

export function useChatRoom({ roomId, userUuid, displayName, initialActiveCount = 0 }: UseChatRoomOptions) {
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [participants, setParticipants] = useState<string[]>(displayName ? [displayName] : []);
  const [isConnected, setIsConnected] = useState(false);
  const [activeCount, setActiveCount] = useState(initialActiveCount);
  const [error, setError] = useState<string | null>(null);
  const [roomExpired, setRoomExpired] = useState(false);
  const clientRef = useRef<Client | null>(null);

  // Reset room state when roomId changes to prevent message leaks
  useEffect(() => {
    setMessages([]);
    setError(null);
    setRoomExpired(false);
    setIsConnected(false);
    setActiveCount(initialActiveCount);
    setParticipants(displayName ? [displayName] : []);
  }, [roomId, displayName, initialActiveCount]);

  useEffect(() => {
    if (!roomId || !userUuid || !displayName) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const brokerURL = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws`;
    
    const client = new Client({
      brokerURL,
      connectHeaders: { userId: userUuid, displayName, roomId },
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      reconnectDelay: 5000,
      onConnect: () => {
        setIsConnected(true);
        setError(null);

        client.subscribe(`/topic/room/${roomId}`, (frame) => {
          const msg: MessageDTO = JSON.parse(frame.body);
          setMessages(prev => [...prev, msg]);
          if (msg.senderName && msg.senderType !== 'GEMINI' && msg.senderName !== 'System') {
            setParticipants(prev => {
              if (prev.includes(msg.senderName)) return prev;
              return [...prev, msg.senderName];
            });
          }
        });

        client.subscribe(`/topic/room/${roomId}/presence`, (frame) => {
          const presence: PresenceDTO = JSON.parse(frame.body);
          if (presence.type === 'ROOM_EXPIRED') {
            setRoomExpired(true);
            return;
          }
          setActiveCount(presence.activeCount);

          if (presence.type === 'JOIN' && presence.senderName && presence.senderName !== 'System') {
            setParticipants(prev => {
              if (prev.includes(presence.senderName)) return prev;
              return [...prev, presence.senderName];
            });
          } else if (presence.type === 'LEAVE' && presence.senderName) {
            setParticipants(prev =>
              prev.filter(name => name !== presence.senderName || name === displayName)
            );
          }
        });

        client.subscribe(`/user/queue/errors`, (frame) => {
          const err: ErrorDTO = JSON.parse(frame.body);
          setError(err.message);
          toast.error(err.message);
        });

        // Ensure we count ourselves as online immediately, covering the case
        // where we miss our own 'join' broadcast during the connection handshake.
        setActiveCount(prev => Math.max(prev, 1));
      },
      onDisconnect: () => setIsConnected(false),
      onStompError: (frame) => {
          const msg = frame.headers['message'] ?? 'Connection error';
          setError(msg);
          toast.error(msg);
      },
      onWebSocketClose: () => setIsConnected(false),
    });

    client.activate();
    clientRef.current = client;

    const handleBeforeUnload = () => {
      if (client.active) {
        client.deactivate();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => { 
      window.removeEventListener('beforeunload', handleBeforeUnload);
      client.deactivate(); 
    };
  }, [roomId, userUuid, displayName]);

  const sendMessage = useCallback((content: string) => {
    if (!clientRef.current?.connected) return;
    clientRef.current.publish({
      destination: `/app/chat/${roomId}`,
      headers: { userId: userUuid, displayName },
      body: JSON.stringify({ content }),
    });
  }, [roomId, userUuid, displayName]);

  return { 
    messages, 
    setMessages, 
    sendMessage, 
    isConnected, 
    activeCount: isConnected ? Math.max(activeCount, 1) : activeCount, 
    error,
    roomExpired,
    participants,
  };
}
