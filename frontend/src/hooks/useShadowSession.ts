import { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSessionStore } from '../store/sessionStore';

export function useShadowSession() {
  const { uuid, displayName, setSession } = useSessionStore();

  useEffect(() => {
    let id = localStorage.getItem('userUuid');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('userUuid', id);
    }
    let name = localStorage.getItem('displayName');
    if (!name) {
      name = `User-${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem('displayName', name);
    }
    setSession({ uuid: id, displayName: name });
  }, [setSession]);

  const saveDisplayName = (name: string) => {
    localStorage.setItem('displayName', name);
    setSession({ displayName: name });
  };

  return { uuid, displayName, saveDisplayName, needsName: !displayName };
}
