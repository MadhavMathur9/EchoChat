import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { apiFetch } from '@/lib/api';

export function HomePage() {
  const navigate = useNavigate();
  
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [maxUsers, setMaxUsers] = useState(20);
  
  const [joinRoomId, setJoinRoomId] = useState('');

  const handleCreateRoom = async () => {
    try {
      let userUuid = localStorage.getItem('userUuid');
      if (!userUuid) {
        userUuid = crypto.randomUUID(); // Native browser UUID generator
        localStorage.setItem('userUuid', userUuid);
      }

      const res = await apiFetch('/api/v1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: roomName || 'Anonymous Room',
          isPrivate,
          password: isPrivate ? password : null,
          maxUsers: maxUsers,
          creatorUuid: userUuid
        })
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/room/${data.roomId}`);
      } else {
        toast.error("Failed to create room");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  const handleJoinRoom = () => {
    if (joinRoomId.trim()) {
      navigate(`/room/${joinRoomId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden flex flex-col bg-bg-base relative">
      {/* Ambient background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-[0.06]" 
          style={{ background: 'radial-gradient(circle, oklch(0.62 0.17 260), transparent 70%)' }} />
        <div className="absolute top-1/2 -right-48 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, oklch(0.62 0.17 260), transparent 70%)' }} />
        <div className="absolute -bottom-24 left-1/3 w-80 h-80 rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, oklch(0.7 0.15 200), transparent 70%)' }} />
        {/* Dot grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" className="text-text-primary" />
        </svg>
      </div>

      {/* Navbar */}
      <header className="relative w-full px-8 py-5 flex justify-between items-center border-b border-border-subtle bg-bg-base/80 backdrop-blur-sm z-10">
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2"
        >
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <span className="text-bg-base font-bold text-xs">#</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-text-primary">EchoChat</span>
        </motion.div>
        <motion.a 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          href="https://github.com/MadhavMathur9/EchoChat" 
          target="_blank" 
          rel="noreferrer"
          className="text-xs font-medium text-text-muted hover:text-accent transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-border-subtle"
        >
          View Source ↗
        </motion.a>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 flex flex-col lg:flex-row w-full max-w-7xl mx-auto items-center p-8 lg:p-16 gap-12 lg:gap-24 z-10">
        
        {/* Left: Product Pitch */}
        <div className="flex-1 space-y-8 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 text-xs font-mono text-accent border border-accent/20 bg-accent/5 px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Real-time · AI-Augmented · Ephemeral
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.08] text-text-primary">
              Chat rooms that<br />
              <span className="text-accent">think with you.</span>
            </h1>
            <p className="text-base text-text-muted mt-5 max-w-lg leading-relaxed">
              High-performance real-time messaging on Spring Boot WebSockets, 
              distributed via Redis, with Google Gemini woven directly into conversations.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 gap-3 pt-2"
          >
            {[
              { label: 'Stack', title: 'Spring Boot 3', sub: 'Virtual Threads · STOMP' },
              { label: 'State', title: 'Redis + Postgres', sub: 'Distributed presence' },
              { label: 'AI', title: 'Google Gemini', sub: '@gemini in any room' },
              { label: 'Security', title: 'Private Rooms', sub: 'Password gated · Invite ID' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.07 }}
                className="border border-border-subtle bg-bg-elevated/60 backdrop-blur-sm p-4 rounded-xl hover:border-accent/20 transition-colors group"
              >
                <div className="font-mono text-[10px] text-accent mb-1.5 uppercase tracking-widest group-hover:text-accent transition-colors">{item.label}</div>
                <div className="font-semibold text-sm text-text-primary">{item.title}</div>
                <div className="text-xs text-text-muted mt-0.5">{item.sub}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Right: Actions */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full lg:w-[400px] shrink-0 space-y-4"
        >
          {/* Create Room Block */}
          <Card className="shadow-2xl bg-bg-card border-border-subtle">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Create a Room</CardTitle>
              <CardDescription className="text-xs">Start a new ephemeral workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Room name"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                className="bg-bg-elevated border-border-subtle text-sm h-9"
              />
              <div className="flex items-center space-x-2.5">
                <Checkbox id="private-room" checked={isPrivate} onCheckedChange={(checked) => setIsPrivate(checked === true)} />
                <label
                  htmlFor="private-room"
                  className="text-sm font-medium leading-none cursor-pointer text-text-muted hover:text-text-primary transition-colors"
                >
                  Private (password protected)
                </label>
              </div>
              
              {isPrivate && (
                <Input
                  placeholder="Password (min 6 chars)"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-bg-elevated border-border-subtle text-sm h-9"
                />
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">Max Users</label>
                <Select value={maxUsers.toString()} onValueChange={v => setMaxUsers(Number(v))}>
                  <SelectTrigger className="bg-bg-elevated border-border-subtle h-9 text-sm">
                    <SelectValue placeholder="Select max users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Users</SelectItem>
                    <SelectItem value="5">5 Users</SelectItem>
                    <SelectItem value="10">10 Users</SelectItem>
                    <SelectItem value="20">20 Users</SelectItem>
                    <SelectItem value="50">50 Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleCreateRoom} className="w-full bg-accent hover:bg-accent/90 text-bg-base font-semibold rounded-full h-10 transition-all active:scale-[0.98]">
                Create Room
              </Button>
            </CardFooter>
          </Card>

          {/* Join Room Block */}
          <Card className="bg-bg-elevated/40 border-border-subtle">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-medium text-text-muted mb-3">Have an invite ID?</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste Room ID..."
                  value={joinRoomId}
                  onChange={e => setJoinRoomId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
                  className="bg-bg-base border-border-subtle text-sm h-9"
                />
                <Button onClick={handleJoinRoom} className="bg-accent hover:bg-accent/90 text-bg-base rounded-full h-9 px-5 text-sm shrink-0 transition-all active:scale-[0.98]">
                  Join
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </main>
    </div>
  );
}
