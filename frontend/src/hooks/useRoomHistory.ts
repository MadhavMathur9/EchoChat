import { useEffect, useState } from 'react';
import type { MessageDTO } from '../types';
import { apiFetch } from '../lib/api';

export function useRoomHistory(roomId: string | undefined) {
    const [history, setHistory] = useState<MessageDTO[]>([]);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        setHistory([]);
        if (!roomId) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        apiFetch(`/api/v1/rooms/${roomId}/history`)
            .then(res => {
                if (res.ok) return res.json();
                throw new Error("Failed to load history");
            })
            .then(data => {
                if (!cancelled && Array.isArray(data)) {
                    setHistory(data);
                }
            })
            .catch(err => {
                if (!cancelled) console.error(err);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [roomId]);
    
    return { history, loading };
}
