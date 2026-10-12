import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Zap,
  Lock,
  Trash2,
  Send,
} from 'lucide-react';

function GithubIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

import { apiFetch } from '@/lib/api';
import { useJoinedRooms } from '@/hooks/useJoinedRooms';

// Rotating headline phrases (PRD L2)
const ROTATING_PHRASES = [
  'think with you.',
  'vanish on cue.',
  'scale with you.',
];

// Tech stack items (PRD L9)
const TECH_STACK = [
  'Spring Boot 3',
  'Java 21 Virtual Threads',
  'WebSocket & STOMP',
  'Redis Pub/Sub',
  'PostgreSQL',
  'Google Gemini AI',
  'React 19',
  'Tailwind CSS',
  'Framer Motion',
];

export function HomePage() {
  const navigate = useNavigate();
  const { joinedRooms } = useJoinedRooms();

  // Create room state
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [maxUsers, setMaxUsers] = useState(20);
  const [isCreating, setIsCreating] = useState(false);

  // Join room state
  const [joinRoomId, setJoinRoomId] = useState('');

  // Active public rooms count (PRD L3)
  const [publicRoomCount, setPublicRoomCount] = useState<number | null>(null);

  // Rotating headline index
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Scripted mock chat loop state (PRD L4)
  const [previewStep, setPreviewStep] = useState(0);

  // Interactive mini demo state in bento card (PRD L7)
  const [demoPrompt, setDemoPrompt] = useState('@gemini summarize why echochat is cool');
  const [demoResponse, setDemoResponse] = useState<string | null>(
    'EchoChat combines lightweight ephemeral rooms with live Google Gemini AI. Everything vanishes automatically after 10 minutes of inactivity!'
  );
  const [demoIsTyping, setDemoIsTyping] = useState(false);

  // Fetch public rooms count on mount
  useEffect(() => {
    apiFetch('/api/v1/rooms/public')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPublicRoomCount(data.length);
      })
      .catch(() => {});
  }, []);

  // Rotate headline every 3.5s
  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % ROTATING_PHRASES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Scripted mock preview loop (0: Human question, 1: Typing indicator, 2: Gemini reply)
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setPreviewStep(prev => (prev + 1) % 4);
    }, 3200);
    return () => clearInterval(stepInterval);
  }, []);

  const handleCreateRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isCreating) return;
    setIsCreating(true);

    try {
      let userUuid = localStorage.getItem('userUuid');
      if (!userUuid) {
        userUuid = crypto.randomUUID();
        localStorage.setItem('userUuid', userUuid);
      }

      const res = await apiFetch('/api/v1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: roomName.trim() || 'Anonymous Room',
          isPrivate,
          password: isPrivate ? password : null,
          maxUsers,
          creatorUuid: userUuid,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Room "${data.displayName}" created!`);
        navigate(`/room/${data.roomId}`);
      } else {
        toast.error('Failed to create room');
      }
    } catch {
      toast.error('Network error creating room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (joinRoomId.trim()) {
      navigate(`/room/${joinRoomId.trim()}`);
    }
  };

  const handleRunMiniDemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoPrompt.trim()) return;

    setDemoIsTyping(true);
    setDemoResponse(null);

    setTimeout(() => {
      setDemoIsTyping(false);
      setDemoResponse(
        `Gemini: Based on your question "${demoPrompt.replace('@gemini', '').trim()}", EchoChat provides sub-millisecond STOMP dispatch powered by Java 21 Virtual Threads!`
      );
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0E0609] text-[#FFF1F5] relative overflow-x-hidden select-none">
      {/* ========================================================
          1. TOP BAR
          ======================================================== */}
      <header className="relative w-full px-4 sm:px-8 py-4 flex justify-between items-center border-b border-[#3B1A27] bg-[#190B11]/85 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#9F1239] to-[#FF5C9A] flex items-center justify-center shadow-md shadow-[#9F1239]/30">
            <span className="text-white font-bold text-sm">#</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-[#FFF1F5]">
            EchoChat
          </span>

          {/* Top Badge: Live Rooms (PRD L3) */}
          <div className="ml-2 hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#251019] border border-[#3B1A27] text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F43F5E] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F43F5E]" />
            </span>
            <span className="font-medium text-[#C9A3B2]">
              {publicRoomCount !== null
                ? `${publicRoomCount} room${publicRoomCount === 1 ? '' : 's'} active now`
                : 'Live Rooms Active'}
            </span>
          </div>
        </div>

        {/* View Source Link */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/room')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[#C9A3B2] hover:text-[#FFF1F5] hover:bg-[#251019] transition-colors"
          >
            Lobby
          </button>
          <a
            href="https://github.com/MadhavMathur9/EchoChat"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[#251019] hover:bg-[#3B1A27] border border-[#3B1A27] text-[#FFF1F5] hover:text-[#FF5C9A] transition-all active:scale-95 shadow-sm"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>View Source</span>
          </a>
        </div>
      </header>

      {/* ========================================================
          2. HERO SECTION WITH HEADLINE & DUAL COLUMNS (L2, L4, L5)
          ======================================================== */}
      <section className="relative px-4 sm:px-8 pt-8 pb-16 sm:py-16 max-w-6xl mx-auto w-full z-10">
        {/* Top Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-4"
        >
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#9F1239]/20 border border-[#FF5C9A]/30 text-xs font-semibold text-[#FF5C9A] tracking-wide shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            Next-Gen Real-Time Chat with Google Gemini
          </span>
        </motion.div>

        {/* Headline (PRD L2) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="text-center max-w-3xl mx-auto mb-6"
        >
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl md:text-6xl tracking-tight leading-[1.15]">
            Chat rooms that{' '}
            <span className="inline-block relative">
              <AnimatePresence mode="wait">
                <motion.span
                  key={phraseIndex}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="bg-gradient-to-r from-[#FF5C9A] to-[#FACC15] bg-clip-text text-transparent inline-block font-extrabold"
                >
                  {ROTATING_PHRASES[phraseIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-[#C9A3B2] max-w-xl mx-auto leading-relaxed">
            Ephemeral spaces with zero sign-up. Speak freely with your team or summon Google Gemini into any room using{' '}
            <span className="text-yellow-400 font-mono font-semibold">@gemini</span>.
          </p>
        </motion.div>

        {/* Grid: Left Form Card (L5, L6) + Right Live Preview Mock Chat (L4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-8">
          {/* ==================== LEFT COLUMN: CREATE & JOIN CARDS ==================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="lg:col-span-5 space-y-4"
          >
            {/* Create Room Card (PRD L5) */}
            <div className="relative rounded-2xl bg-[#190B11]/90 backdrop-blur-xl border border-[#FF5C9A]/30 p-5 sm:p-6 shadow-2xl shadow-[#9F1239]/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#9F1239] to-[#FF5C9A] flex items-center justify-center text-white shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-sm text-[#FFF1F5]">Create a Room</h2>
                  <p className="text-[11px] text-[#8A6674]">Public or password protected</p>
                </div>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-semibold text-[#C9A3B2] block mb-1">
                    Room Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Brainstorm Space"
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    className="w-full bg-[#251019] border border-[#3B1A27] rounded-xl px-3 py-2 text-xs text-[#FFF1F5] placeholder-[#8A6674] focus:outline-none focus:border-[#FF5C9A]/60 focus:ring-2 focus:ring-[#FACC15]/40"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#251019] border border-[#3B1A27]">
                  <div className="flex items-center gap-2">
                    <Lock className={`w-3.5 h-3.5 ${isPrivate ? 'text-[#FF5C9A]' : 'text-[#8A6674]'}`} />
                    <span className="text-xs font-medium text-[#FFF1F5]">Private Room</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={e => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 accent-[#FF5C9A] cursor-pointer rounded"
                  />
                </div>

                {isPrivate && (
                  <div>
                    <label className="text-[11px] font-semibold text-[#C9A3B2] block mb-1">
                      Passcode
                    </label>
                    <input
                      type="password"
                      placeholder="Secret room password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required={isPrivate}
                      className="w-full bg-[#251019] border border-[#3B1A27] rounded-xl px-3 py-2 text-xs text-[#FFF1F5] placeholder-[#8A6674] focus:outline-none focus:border-[#FF5C9A]/60 focus:ring-2 focus:ring-[#FACC15]/40"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[#C9A3B2]">Max Users</label>
                  <select
                    value={maxUsers}
                    onChange={e => setMaxUsers(Number(e.target.value))}
                    className="bg-[#251019] border border-[#3B1A27] rounded-xl px-3 py-1.5 text-xs text-[#FFF1F5] focus:outline-none focus:border-[#FF5C9A]/60 focus:ring-1 focus:ring-[#FACC15]/40 cursor-pointer"
                  >
                    <option value={2}>2 Users</option>
                    <option value={5}>5 Users</option>
                    <option value={10}>10 Users</option>
                    <option value={20}>20 Users</option>
                    <option value={50}>50 Users</option>
                  </select>
                </div>

                {/* Primary CTA Button: brightest on page with soft pink glow (PRD L5) */}
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF5C9A] to-[#F43F5E] hover:shadow-[0_0_24px_rgba(255,92,154,0.45)] text-white text-xs font-bold transition-all active:scale-95 shadow-lg shadow-[#9F1239]/40 flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <span>{isCreating ? 'Creating Room...' : 'Create Room'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Join Room Card (PRD L6) */}
            <div className="rounded-2xl bg-[#190B11]/70 border border-[#3B1A27] p-4 space-y-3">
              <form onSubmit={handleJoinRoom} className="space-y-2">
                <label className="text-[11px] font-semibold text-[#C9A3B2] block">
                  Have an invite ID?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste Room ID..."
                    value={joinRoomId}
                    onChange={e => setJoinRoomId(e.target.value)}
                    className="flex-1 bg-[#251019] border border-[#3B1A27] rounded-xl px-3 py-1.5 text-xs text-[#FFF1F5] placeholder-[#8A6674] focus:outline-none focus:border-[#FF5C9A]/60"
                  />
                  <button
                    type="submit"
                    disabled={!joinRoomId.trim()}
                    className="px-4 py-1.5 rounded-xl bg-[#251019] hover:bg-[#3B1A27] border border-[#3B1A27] text-[#FFF1F5] hover:text-[#FF5C9A] text-xs font-semibold transition-all active:scale-95 disabled:opacity-40"
                  >
                    Join
                  </button>
                </div>
              </form>

              {/* Recent Rooms list for returning users (PRD L6) */}
              {joinedRooms.length > 0 && (
                <div className="pt-2 border-t border-[#3B1A27]/60">
                  <span className="text-[10px] font-semibold text-[#8A6674] uppercase tracking-wider block mb-1.5">
                    Recent Rooms
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-thin">
                    {joinedRooms.slice(0, 4).map(r => (
                      <button
                        key={r.roomId}
                        onClick={() => navigate(`/room/${r.roomId}`)}
                        className="px-2.5 py-1 rounded-lg bg-[#251019] hover:bg-[#3B1A27] border border-[#3B1A27] text-[11px] text-[#C9A3B2] hover:text-[#FFF1F5] transition-colors truncate max-w-[150px]"
                      >
                        # {r.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* ==================== RIGHT COLUMN: LIVE PRODUCT PREVIEW (PRD L4) ==================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="lg:col-span-7 relative"
          >
            {/* Floating chips (PRD L4) */}
            <div className="absolute -top-3 right-6 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#190B11]/90 border border-green-500/30 text-green-400 text-xs font-semibold shadow-lg shadow-black/40">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>3 online</span>
            </div>

            <div className="absolute -bottom-3 left-6 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#190B11]/90 border border-yellow-400/30 text-yellow-300 text-xs font-semibold shadow-lg shadow-black/40">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>AI Augmentation Active</span>
            </div>

            {/* Tilted Mock Chat Window */}
            <div className="rounded-2xl bg-[#190B11]/95 border border-[#3B1A27] shadow-2xl shadow-black/60 overflow-hidden transform lg:rotate-1 hover:rotate-0 transition-transform duration-500">
              {/* Window Header */}
              <div className="px-4 py-3 bg-[#190B11] border-b border-[#3B1A27] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
                  </div>
                  <span className="text-xs font-semibold text-[#FFF1F5] ml-2"># engineering-lounge</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-green-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>connected</span>
                </div>
              </div>

              {/* Message Feed Canvas */}
              <div className="p-4 space-y-3 min-h-[300px] flex flex-col justify-end chat-radial-glow select-text">
                {/* Scripted Message 1: Human User */}
                <div className="flex gap-2.5 items-end justify-start">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#9F1239] to-[#FF5C9A] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    A
                  </div>
                  <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tl-sm bg-[#251019] border border-[#3B1A27] text-xs">
                    <span className="text-[10px] font-semibold text-[#FF5C9A] block mb-0.5">Alex</span>
                    <p className="text-[#FFF1F5]">
                      Hey! How do Java virtual threads handle millions of concurrent connections?
                    </p>
                  </div>
                </div>

                {/* Scripted Message 2: Self mention */}
                <div className="flex gap-2.5 items-end justify-start flex-row-reverse">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#BE185D] to-[#F43F5E] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    M
                  </div>
                  <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm bg-gradient-to-r from-[#9F1239] to-[#BE185D] text-white text-xs shadow-md">
                    <p>
                      Let's check with AI: <span className="text-yellow-300 font-semibold font-mono">@gemini</span> explain virtual threads architecture
                    </p>
                  </div>
                </div>

                {/* Scripted Message 3: Gemini thinking / response based on loop step */}
                {previewStep >= 1 && previewStep < 2 && (
                  <div className="flex gap-2.5 items-end">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] flex items-center justify-center text-white shadow-sm shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-[#0F1424] border border-blue-500/35 px-3 py-2 rounded-2xl rounded-tl-sm text-xs text-[#7FB0FF] flex items-center gap-2">
                      <span>Gemini is thinking</span>
                      <span className="inline-flex gap-1">
                        <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" />
                        <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce delay-100" />
                        <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce delay-200" />
                      </span>
                    </div>
                  </div>
                )}

                {previewStep >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2.5 items-end"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] flex items-center justify-center text-white shadow-sm shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-[#0F1424] border border-blue-500/35 text-xs text-[#E2E8F0] shadow-[0_0_24px_rgba(79,142,247,0.12)]">
                      <span className="text-[11px] font-semibold text-[#7FB0FF] flex items-center gap-1 mb-1">
                        <Sparkles className="w-3 h-3 text-yellow-400" />
                        ✦ Gemini
                      </span>
                      <p className="leading-relaxed">
                        Virtual threads are lightweight threads managed directly by the JVM. Instead of 1:1 OS thread mapping, thousands of virtual threads share a small carrier thread pool. When I/O blocks, the virtual thread unmounts instantly, preserving system RAM!
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Mock Chat Input Footer */}
              <div className="p-3 bg-[#190B11] border-t border-[#3B1A27] flex items-center gap-2">
                <div className="flex-1 bg-[#251019] border border-[#3B1A27] rounded-xl px-3 py-1.5 text-xs text-[#8A6674] flex items-center justify-between">
                  <span>Type a message or use @gemini...</span>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400/60" />
                </div>
                <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-[#FF5C9A] to-[#F43F5E] flex items-center justify-center text-white">
                  <Send className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================
          3. BENEFITS BENTO GRID (PRD L7)
          ======================================================== */}
      <section className="relative px-4 sm:px-8 py-16 max-w-6xl mx-auto w-full border-t border-[#3B1A27]/60 z-10">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-semibold text-[#FF5C9A] uppercase tracking-wider block mb-1">
            Engineered for Precision
          </span>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#FFF1F5]">
            Everything a conversation needs. Nothing it doesn't.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bento Card 1: Large Card - Ask Gemini Anywhere with Mini Demo */}
          <div className="md:col-span-2 rounded-2xl bg-[#190B11]/80 border border-[#3B1A27] hover:border-[#FF5C9A]/40 p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6]/20 to-[#60A5FA]/20 border border-blue-500/30 flex items-center justify-center text-[#60A5FA]">
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                AI Signature Feature
              </span>
            </div>
            <h3 className="font-display font-bold text-lg text-[#FFF1F5] mb-1">
              Ask Gemini anywhere
            </h3>
            <p className="text-xs text-[#C9A3B2] max-w-lg mb-4 leading-relaxed">
              Type <span className="text-yellow-400 font-mono font-semibold">@gemini</span> in any conversation.
              The AI joins with real-time markdown, code formatting, and context-aware responses.
            </p>

            {/* Interactive Mini Demo inside card */}
            <form onSubmit={handleRunMiniDemo} className="mt-4 p-3 rounded-xl bg-[#251019] border border-[#3B1A27] space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={demoPrompt}
                  onChange={e => setDemoPrompt(e.target.value)}
                  className="flex-1 bg-[#190B11] border border-[#3B1A27] rounded-lg px-3 py-1.5 text-xs text-[#FFF1F5] focus:outline-none focus:border-[#FF5C9A]/60"
                  placeholder="@gemini ask something..."
                />
                <button
                  type="submit"
                  disabled={demoIsTyping}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#FF5C9A] to-[#F43F5E] text-white text-xs font-semibold hover:opacity-95 transition-all active:scale-95 disabled:opacity-50"
                >
                  {demoIsTyping ? 'Thinking...' : 'Try Demo'}
                </button>
              </div>

              {demoResponse && (
                <div className="p-2.5 rounded-lg bg-[#0F1424] border border-blue-500/30 text-[11px] text-[#E2E8F0] leading-relaxed">
                  <span className="text-[10px] font-bold text-[#7FB0FF] block mb-0.5">✦ Live Demo Output:</span>
                  {demoResponse}
                </div>
              )}
            </form>
          </div>

          {/* Bento Card 2: Medium Card - Instant Messaging */}
          <div className="rounded-2xl bg-[#190B11]/80 border border-[#3B1A27] hover:border-[#FF5C9A]/40 p-6 shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-[#9F1239]/20 border border-[#FF5C9A]/30 flex items-center justify-center text-[#FF5C9A] mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-[#FFF1F5] mb-1">
              Instant
            </h3>
            <p className="text-xs text-[#C9A3B2] leading-relaxed">
              Sub-millisecond WebSocket & STOMP dispatch over Java 21 Virtual Threads. Zero polling, zero lag, smooth real-time delivery.
            </p>
          </div>

          {/* Bento Card 3: Medium Card - Self Cleaning Rooms */}
          <div className="rounded-2xl bg-[#190B11]/80 border border-[#3B1A27] hover:border-[#FF5C9A]/40 p-6 shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-[#FFF1F5] mb-1">
              Vanishes when you leave
            </h3>
            <p className="text-xs text-[#C9A3B2] leading-relaxed">
              Ephemeral by design. Rooms dissolve and purge automatically after 10 minutes of complete inactivity. Nothing is stored forever.
            </p>
          </div>

          {/* Bento Card 4: Medium Card - Locked when needed */}
          <div className="md:col-span-2 rounded-2xl bg-[#190B11]/80 border border-[#3B1A27] hover:border-[#FF5C9A]/40 p-6 shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-[#9F1239]/20 border border-[#FF5C9A]/30 flex items-center justify-center text-[#FF5C9A] mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-[#FFF1F5] mb-1">
              Locked when you need it
            </h3>
            <p className="text-xs text-[#C9A3B2] leading-relaxed">
              Create password-protected rooms with a single toggle. Only users with the secret passcode and invite ID can join and read messages.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================
          4. HOW IT WORKS (PRD L8)
          ======================================================== */}
      <section className="relative px-4 sm:px-8 py-16 max-w-6xl mx-auto w-full border-t border-[#3B1A27]/60 z-10">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-semibold text-[#FF5C9A] uppercase tracking-wider block mb-1">
            Simple 3-Step Flow
          </span>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#FFF1F5]">
            How EchoChat Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              title: 'Create a Room',
              desc: 'Enter a room title, pick max capacity, and optionally check private to set a passcode.',
            },
            {
              step: '02',
              title: 'Share the ID',
              desc: 'Copy the unique room invite ID with 1 click and send it to your team or friends.',
            },
            {
              step: '03',
              title: 'Chat with Gemini',
              desc: 'Exchange instant messages or mention @gemini to get intelligent AI responses on demand.',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="relative p-6 rounded-2xl bg-[#190B11] border border-[#3B1A27] shadow-lg flex flex-col justify-between"
            >
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#9F1239]/20 border border-[#FF5C9A]/30 text-[#FF5C9A] text-xs font-bold mb-3">
                  {item.step}
                </span>
                <h3 className="font-display font-bold text-base text-[#FFF1F5] mb-1.5">
                  {item.title}
                </h3>
                <p className="text-xs text-[#C9A3B2] leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          5. TECH STRIP (PRD L9)
          ======================================================== */}
      <section className="relative py-8 bg-[#190B11]/50 border-y border-[#3B1A27] overflow-hidden z-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center gap-4 justify-between">
          <span className="text-xs font-semibold text-[#8A6674] uppercase tracking-wider shrink-0">
            Powered by modern architecture:
          </span>
          <div className="flex flex-wrap items-center gap-2 justify-center">
            {TECH_STACK.map(tech => (
              <span
                key={tech}
                className="px-3 py-1 rounded-full bg-[#251019] border border-[#3B1A27] text-[11px] font-medium text-[#C9A3B2]"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          6. FINAL CALL TO ACTION (PRD L10)
          ======================================================== */}
      <section className="relative px-4 sm:px-8 py-20 max-w-4xl mx-auto w-full text-center z-10">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#190B11] to-[#251019] border border-[#FF5C9A]/30 shadow-2xl shadow-[#9F1239]/20">
          <h2 className="font-display font-extrabold text-2xl sm:text-4xl text-[#FFF1F5] mb-3">
            Ready to start a conversation?
          </h2>
          <p className="text-xs sm:text-sm text-[#C9A3B2] max-w-md mx-auto mb-6 leading-relaxed">
            No signup. No tracking. Pure real-time chat with Google Gemini AI.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#FF5C9A] to-[#F43F5E] text-white text-xs font-bold hover:shadow-[0_0_24px_rgba(255,92,154,0.4)] transition-all active:scale-95 shadow-md"
            >
              Spin Up a Room
            </button>
            <button
              onClick={() => navigate('/room')}
              className="px-6 py-2.5 rounded-full bg-[#251019] hover:bg-[#3B1A27] border border-[#3B1A27] text-[#FFF1F5] text-xs font-bold transition-all active:scale-95"
            >
              Browse Public Lobby
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          7. FOOTER (PRD L10)
          ======================================================== */}
      <footer className="relative w-full py-6 px-4 sm:px-8 border-t border-[#3B1A27] bg-[#0E0609] text-center text-xs text-[#8A6674] z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} EchoChat. Built by Madhav Mathur.</p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/MadhavMathur9/EchoChat"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#FF5C9A] transition-colors flex items-center gap-1"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
            <span className="text-[#3B1A27]">•</span>
            <span>Google Gemini 1.5</span>
            <span className="text-[#3B1A27]">•</span>
            <span>Netlify Deployed</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
