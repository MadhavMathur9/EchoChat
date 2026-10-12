import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';
import scrollbar from 'tailwind-scrollbar';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        elevated: 'var(--elevated)',
        border: 'var(--border)',
        burgundy: 'var(--burgundy)',
        pink: 'var(--pink)',
        red: 'var(--red)',
        blue: 'var(--blue)',
        yellow: 'var(--yellow)',
        green: 'var(--green)',
        text: {
          DEFAULT: 'var(--text)',
          1: 'var(--text)',
          2: 'var(--text-2)',
          3: 'var(--text-3)',
          primary: 'var(--text)',
          muted: 'var(--text-2)',
        },
        background: 'var(--bg)',
        foreground: 'var(--text)',
        card: {
          DEFAULT: 'var(--surface)',
          foreground: 'var(--text)',
        },
        popover: {
          DEFAULT: 'var(--surface)',
          foreground: 'var(--text)',
        },
        primary: {
          DEFAULT: 'var(--pink)',
          foreground: '#0E0609',
        },
        secondary: {
          DEFAULT: 'var(--elevated)',
          foreground: 'var(--text)',
        },
        muted: {
          DEFAULT: 'var(--elevated)',
          foreground: 'var(--text-2)',
        },
        accent: {
          DEFAULT: 'var(--pink)',
          foreground: '#0E0609',
          glow: '#FF5C9A',
          gemini: '#4F8EF7',
        },
        destructive: {
          DEFAULT: 'var(--red)',
          foreground: '#FFFFFF',
        },
        input: 'var(--border)',
        ring: 'var(--yellow)',
        'bg-base': 'var(--bg)',
        'bg-elevated': 'var(--elevated)',
        'bg-card': 'var(--surface)',
        'border-subtle': 'var(--border)',
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        msg: '14px',
        modal: '16px',
      },
      keyframes: {
        msgIn: {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        pulseRed: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        blobDrift1: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(30px, -20px) scale(1.08)' },
        },
        blobDrift2: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(-25px, 25px) scale(0.95)' },
        },
        blobDrift3: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(20px, 15px) scale(1.05)' },
        },
      },
      animation: {
        'msg-in': 'msgIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-red': 'pulseRed 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blob-1': 'blobDrift1 20s ease-in-out infinite',
        'blob-2': 'blobDrift2 24s ease-in-out infinite',
        'blob-3': 'blobDrift3 22s ease-in-out infinite',
      },
    },
  },
  plugins: [typography, scrollbar],
} satisfies Config;
