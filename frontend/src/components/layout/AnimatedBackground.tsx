import { motion } from 'framer-motion';

export function AnimatedBackground() {
  return (
    <div
      className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-bg"
      aria-hidden="true"
    >

      {/* Blob 1: Terracotta (#D9774F) Top-Left */}
      <motion.div
        animate={{
          x: [0, 35, -20, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full opacity-[0.18] blur-[120px] will-change-transform"
        style={{
          background: 'radial-gradient(circle, var(--terracotta) 0%, transparent 70%)',
        }}
      />

      {/* Blob 2: Rose (#E88CA5) Center */}
      <motion.div
        animate={{
          x: [0, -40, 25, 0],
          y: [0, 35, -25, 0],
          scale: [1, 0.94, 1.06, 1],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.15] blur-[130px] will-change-transform"
        style={{
          background: 'radial-gradient(circle, var(--rose) 0%, transparent 70%)',
        }}
      />

      {/* Blob 3: Burgundy (#8C2F45) Mid-Bottom */}
      <motion.div
        animate={{
          x: [0, 30, -15, 0],
          y: [0, -25, 25, 0],
          scale: [1, 1.05, 0.95, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -bottom-24 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.15] blur-[110px] will-change-transform"
        style={{
          background: 'radial-gradient(circle, var(--burgundy) 0%, transparent 70%)',
        }}
      />

      {/* Blob 4: Small Blue (#7FA8E8) Bottom-Right near preview */}
      <motion.div
        animate={{
          x: [0, -25, 20, 0],
          y: [0, 20, -25, 0],
          scale: [1, 1.08, 0.92, 1],
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-10 -right-20 w-[420px] h-[420px] rounded-full opacity-[0.12] blur-[100px] will-change-transform"
        style={{
          background: 'radial-gradient(circle, var(--blue) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
