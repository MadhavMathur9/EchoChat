import { useState, useEffect } from 'react';

export interface JoinedRoom {
  roomId: string;
  name: string;
  joinedAt: number;
}

export function useJoinedRooms() {
  const [joinedRooms, setJoinedRooms] = useState<JoinedRoom[]>(() => {
    try {
      const stored = localStorage.getItem('echochat_joined_rooms');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to parse joined rooms", e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('echochat_joined_rooms', JSON.stringify(joinedRooms));
  }, [joinedRooms]);

  const joinRoom = (roomId: string, name: string) => {
    setJoinedRooms(prev => {
      if (prev.some(r => r.roomId === roomId)) {
        return prev;
      }
      return [...prev, { roomId, name, joinedAt: Date.now() }];
    });
  };

  const leaveRoom = (roomId: string) => {
    setJoinedRooms(prev => prev.filter(r => r.roomId !== roomId));
  };

  return {
    joinedRooms,
    joinRoom,
    leaveRoom
  };
}
