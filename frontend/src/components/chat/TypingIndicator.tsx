
import { motion } from 'framer-motion';

export function TypingIndicator() {
  return (
    <div className="flex gap-3 flex-row p-4">
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-tr from-cyan-600 to-blue-500 text-white font-bold shrink-0">
        ✨
      </div>
      <div className="bg-[var(--color-bg-card)] text-[var(--color-text-primary)] border border-border-subtle max-w-[70%] px-4 py-3 rounded-[var(--radius-msg)] flex items-center gap-1">
        <motion.span 
          animate={{ y: [0, -5, 0] }} 
          transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} 
          className="w-1.5 h-1.5 bg-cyan-400 rounded-full inline-block" 
        />
        <motion.span 
          animate={{ y: [0, -5, 0] }} 
          transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} 
          className="w-1.5 h-1.5 bg-cyan-400 rounded-full inline-block" 
        />
        <motion.span 
          animate={{ y: [0, -5, 0] }} 
          transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} 
          className="w-1.5 h-1.5 bg-cyan-400 rounded-full inline-block" 
        />
      </div>
    </div>
  );
}
