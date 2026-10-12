import { motion } from 'framer-motion';

export function AnimatedBackground() {
  return (
    <div
      className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-[#0E0609]"
      aria-hidden="true"
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Blob 1: Burgundy (Top-Left) */}
      <motion.div
        animate={{
          x: [0, 35, -20, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.12, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full opacity-[0.22] blur-[100px] will-change-transform"
        style={{
          background: 'radial-gradient(circle, #9F1239 0%, rgba(159, 18, 57, 0) 70%)',
        }}
      />

      {/* Blob 2: Pink (Center / Form area) */}
      <motion.div
        animate={{
          x: [0, -40, 25, 0],
          y: [0, 35, -25, 0],
          scale: [1, 0.92, 1.08, 1],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.16] blur-[120px] will-change-transform"
        style={{
          background: 'radial-gradient(circle, #FF5C9A 0%, rgba(255, 92, 154, 0) 70%)',
        }}
      />

      {/* Blob 3: Blue (Gemini signature, Bottom-Right) */}
      <motion.div
        animate={{
          x: [0, 25, -30, 0],
          y: [0, -20, 30, 0],
          scale: [1, 1.06, 0.96, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -bottom-24 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.14] blur-[110px] will-change-transform"
        style={{
          background: 'radial-gradient(circle, #4F8EF7 0%, rgba(79, 142, 247, 0) 70%)',
        }}
      />

      {/* Noise grain texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
      />
    </div>
  );
}
