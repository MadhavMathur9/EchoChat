import { Sparkles } from 'lucide-react';

interface AvatarProps {
  senderType: 'USER' | 'GEMINI';
  name: string;
  size?: 'sm' | 'md';
}

// User gradient pairs cycling through palette tokens
const userGradients = [
  'from-[#D9774F] to-[#E88CA5]', // Terracotta to Rose
  'from-[#2E5A44] to-[#5FBF8A]', // Sage to Online
  'from-[#8C2F45] to-[#D9774F]', // Burgundy to Terracotta
  'from-[#E3B94F] to-[#D9774F]', // Gold to Terracotta
];

function getGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return userGradients[Math.abs(hash) % userGradients.length];
}

export function Avatar({ senderType, name, size = 'md' }: AvatarProps) {
  const dim = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-xs';

  if (senderType === 'GEMINI') {
    return (
      <div
        className={`${dim} rounded-full flex items-center justify-center bg-gradient-to-br from-[#6F9BE0] to-[#9DBDF0] text-white shrink-0 shadow-[0_0_14px_rgba(127,168,232,0.3)] border border-[#9DBDF0]/40`}
        title="Google Gemini AI"
        aria-label="Gemini AI Avatar"
      >
        <Sparkles className="w-4 h-4 text-white" />
      </div>
    );
  }

  const initial = (name || '?').charAt(0).toUpperCase();
  const grad = getGradient(name || 'User');

  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center bg-gradient-to-br ${grad} text-text font-semibold shrink-0 shadow-sm border border-border/40`}
      title={name}
      aria-label={`${name}'s avatar`}
    >
      <span className="drop-shadow-sm">{initial}</span>
    </div>
  );
}
