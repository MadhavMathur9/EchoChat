import { useEffect, useState } from 'react';
import type { MessageDTO } from '../types';
import { apiFetch } from '../lib/api';

export function useRoomHistory(roomId: string | undefined) {
    const [history, setHistory] = useState<MessageDTO[]>([]);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (!roomId) return;
        setLoading(true);
        apiFetch(`/api/v1/rooms/${roomId}/history`)
            .then(res => {
                if (res.ok) return res.json();
                throw new Error("Failed to load history");
            })
            .then(data => setHistory(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [roomId]);
    
    return { history, loading };
}
