import ReactMarkdown from 'react-markdown';
import { memo } from 'react';
import { motion } from 'framer-motion';
import type { MessageDTO } from '../../types';
import { Avatar } from './Avatar';

interface MessageBubbleProps {
  message: MessageDTO;
  isSelf: boolean;
}

// Deterministic color from name — cycles through pleasing accent hues
const senderColors = [
  'text-sky-400', 'text-emerald-400', 'text-violet-400',
  'text-amber-400', 'text-rose-400', 'text-teal-400', 'text-indigo-400',
];
function senderColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return senderColors[Math.abs(hash) % senderColors.length];
}

export const MessageBubble = memo(({ message, isSelf }: MessageBubbleProps) => {
  const isGemini = message.senderType === 'GEMINI';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className={`flex gap-3 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <Avatar senderType={message.senderType} name={message.senderName} />
      <div className={`
        max-w-[70%] px-4 py-2.5 rounded-2xl
        ${isGemini
          ? 'bg-bg-elevated border-l-2 border-accent/60 border border-border-subtle text-text-primary'
          : isSelf
            ? 'bg-accent text-bg-base font-medium rounded-tr-sm'
            : 'bg-bg-card text-text-primary border border-border-subtle rounded-tl-sm'
        }
      `}>
        {!isSelf && (
          <p className={`text-[11px] font-semibold mb-1 tracking-wide ${isGemini ? 'text-accent' : senderColor(message.senderName)}`}>
            {isGemini ? '✦ Gemini' : message.senderName}
          </p>
        )}
        <div className={`text-sm leading-relaxed break-words ${isGemini ? 'prose prose-sm dark:prose-invert max-w-none prose-p:leading-snug prose-p:my-1' : ''}`}>
          {isGemini ? (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          ) : (
            <p>{message.content}</p>
          )}
        </div>
        <p className={`text-[10px] mt-1.5 opacity-40 ${isSelf ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
});
