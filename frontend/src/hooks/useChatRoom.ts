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
  const [isConnected, setIsConnected] = useState(false);
  const [activeCount, setActiveCount] = useState(initialActiveCount);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (initialActiveCount > 0) {
      setActiveCount(prev => Math.max(prev, initialActiveCount));
    }
  }, [initialActiveCount]);

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
        });

        client.subscribe(`/topic/room/${roomId}/presence`, (frame) => {
          const presence: PresenceDTO = JSON.parse(frame.body);
          setActiveCount(presence.activeCount);
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
    error 
  };
}
