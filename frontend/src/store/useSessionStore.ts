import { create } from 'zustand';

interface SessionState {
  uuid: string;
  displayName: string;
  setSession: (session: Partial<SessionState>) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  uuid: '',
  displayName: '',
  setSession: (session) => set((state) => ({ ...state, ...session })),
}));
