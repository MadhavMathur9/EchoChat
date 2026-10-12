import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface TypingIndicatorProps {
  label?: string;
}

export function TypingIndicator({ label = 'Gemini is thinking' }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex gap-2.5 items-end px-4 py-2"
    >
      {/* Gemini AI Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-[#6F9BE0] to-[#9DBDF0] text-white shrink-0 shadow-[0_0_14px_rgba(127,168,232,0.3)] border border-[#9DBDF0]/40"
        aria-label="Gemini thinking"
      >
        <Sparkles className="w-4 h-4 text-white" />
      </div>

      {/* Bubble */}
      <div className="bg-[#1B2333] border border-[rgba(127,168,232,0.35)] px-3.5 py-2.5 rounded-2xl rounded-tl-sm shadow-[0_0_24px_rgba(127,168,232,0.08)] flex items-center gap-2">
        <span className="text-xs font-medium text-blue tracking-wide flex items-center gap-1">
          {label}
        </span>
        <div className="flex items-center gap-1 pl-1">
          <motion.span
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.7, delay: 0 }}
            className="w-1.5 h-1.5 bg-blue rounded-full inline-block"
          />
          <motion.span
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.7, delay: 0.2 }}
            className="w-1.5 h-1.5 bg-blue rounded-full inline-block"
          />
          <motion.span
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.7, delay: 0.4 }}
            className="w-1.5 h-1.5 bg-blue rounded-full inline-block"
          />
        </div>
      </div>
    </motion.div>
  );
}
