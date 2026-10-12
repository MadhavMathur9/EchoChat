import { create } from 'zustand';

interface SessionState {
  uuid: string | null;
  displayName: string | null;
  setSession: (session: { uuid?: string | null; displayName?: string | null }) => void;
}

const getInitialUuid = (): string => {
  try {
    let id = localStorage.getItem('userUuid');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('userUuid', id);
    }
    return id;
  } catch {
    return 'anon-' + Math.floor(1000 + Math.random() * 9000);
  }
};

const getInitialDisplayName = (): string => {
  try {
    let name = localStorage.getItem('displayName');
    if (!name) {
      name = `User-${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem('displayName', name);
    }
    return name;
  } catch {
    return 'User-' + Math.floor(1000 + Math.random() * 9000);
  }
};

export const useSessionStore = create<SessionState>((set) => ({
  uuid: getInitialUuid(),
  displayName: getInitialDisplayName(),
  setSession: (session) => set((state) => ({ ...state, ...session })),
}));
