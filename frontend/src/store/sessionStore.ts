import { create } from 'zustand';

interface SessionState {
  uuid: string | null;
  displayName: string | null;
  setSession: (session: { uuid?: string | null; displayName?: string | null }) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  uuid: null,
  displayName: null,
  setSession: (session) => set((state) => ({ ...state, ...session })),
}));
