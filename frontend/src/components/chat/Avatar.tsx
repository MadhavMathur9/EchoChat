import { Sparkles } from 'lucide-react';

interface AvatarProps {
  senderType: 'USER' | 'GEMINI';
  name: string;
  size?: 'sm' | 'md';
}

// Deterministic gradient from username
const userGradients = [
  'from-[#9F1239] to-[#FF5C9A]',
  'from-[#BE185D] to-[#F43F5E]',
  'from-[#881337] to-[#BE185D]',
  'from-[#E11D48] to-[#FB7185]',
  'from-[#9F1239] to-[#E11D48]',
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
        className={`${dim} rounded-full flex items-center justify-center bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] text-white shrink-0 shadow-[0_0_14px_rgba(79,142,247,0.35)] border border-blue-400/40 relative`}
        title="Google Gemini AI"
        aria-label="Gemini AI Avatar"
      >
        <Sparkles className="w-4 h-4 text-white" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400 border border-[#0E0609]" />
      </div>
    );
  }

  const initial = (name || '?').charAt(0).toUpperCase();
  const grad = getGradient(name || 'User');

  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center bg-gradient-to-br ${grad} text-white font-semibold shrink-0 shadow-sm border border-white/10`}
      title={name}
      aria-label={`${name}'s avatar`}
    >
      <span className="drop-shadow-sm">{initial}</span>
    </div>
  );
}
