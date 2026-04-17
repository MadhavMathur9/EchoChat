import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShadowSession } from '../hooks/useShadowSession';
import { useChatRoom } from '../hooks/useChatRoom';
import { useRoomHistory } from '../hooks/useRoomHistory';
import { useJoinedRooms } from '../hooks/useJoinedRooms';
import { MessageList } from '../components/chat/MessageList';
import { ChatInput } from '../components/chat/ChatInput';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import type { RoomMetadataResponse } from '../types';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { apiFetch } from '@/lib/api';

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { uuid, displayName, saveDisplayName } = useShadowSession();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(displayName || '');

  useEffect(() => {
    setEditNameValue(displayName || '');
  }, [displayName]);

  const handleSaveEditName = () => {
    if (editNameValue.trim().length >= 2) {
      saveDisplayName(editNameValue.trim());
    } else {
      setEditNameValue(displayName || '');
    }
    setIsEditingName(false);
  };
  
  const [metadata, setMetadata] = useState<RoomMetadataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  const { joinedRooms, joinRoom, leaveRoom } = useJoinedRooms();
  const [joinId, setJoinId] = useState('');
  const [publicRooms, setPublicRooms] = useState<RoomMetadataResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [leavingRoomId, setLeavingRoomId] = useState<string | null>(null);

  const handleLeaveRoom = useCallback((idToLeave: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLeavingRoomId(idToLeave);
    setTimeout(() => {
      leaveRoom(idToLeave);
      setLeavingRoomId(null);
      if (idToLeave === roomId) {
        navigate('/room');
      }
    }, 200); // reduced timeout for quicker exit
  }, [leaveRoom, roomId, navigate]);

  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomIsPrivate, setNewRoomIsPrivate] = useState(false);
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [newRoomMaxUsers, setNewRoomMaxUsers] = useState(20);
  
  const handleCreateRoom = async () => {
    try {
      const res = await apiFetch('/api/v1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: newRoomName || 'Anonymous Room',
          isPrivate: newRoomIsPrivate,
          password: newRoomIsPrivate ? newRoomPassword : null,
          maxUsers: newRoomMaxUsers,
          creatorUuid: uuid || 'unknown'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setNewRoomName('');
        setNewRoomPassword('');
        setNewRoomIsPrivate(false);
        navigate(`/room/${data.roomId}`);
      } else {
        toast.error("Failed to create room");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  useEffect(() => {
    apiFetch('/api/v1/rooms/public')
      .then(res => res.json())
      .then(data => setPublicRooms(data))
      .catch(console.error);
  }, []);

  const { history } = useRoomHistory(isAuthorized ? roomId : undefined);
  const { messages, sendMessage, isConnected, activeCount } = useChatRoom({
    roomId: isAuthorized ? roomId! : '',
    userUuid: uuid || '',
    displayName: displayName || '',
    initialActiveCount: metadata?.activeCount || 0
  });

  const [allMessages, setAllMessages] = useState(history);
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Sync history and incoming messages
  useEffect(() => {
    setAllMessages([...history, ...messages]);
  }, [history, messages]);
  
  // Basic @gemini optimistic typing state
  useEffect(() => {
    if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.senderType === 'GEMINI') {
            setIsAiTyping(false);
        }
    }
  }, [messages]);

  useEffect(() => {
    if (!roomId) return;
    // Fetch room metadata
    apiFetch(`/api/v1/rooms/${roomId}`)
      .then(res => {
        if (!res.ok) throw new Error("Room not found");
        return res.json();
      })
      .then(data => {
        setMetadata(data);
        if (!data.isPrivate) {
          setIsAuthorized(true);
          joinRoom(roomId, data.displayName);
        }
      })
      .catch(() => {
        leaveRoom(roomId);
        setError("This room was auto cleaned and there is nothing to look here.");
      });
  }, [roomId, navigate]);

  const handleValidatePassword = async () => {
    try {
      const res = await apiFetch(`/api/v1/rooms/${roomId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        setIsAuthorized(true);
        if (metadata) {
          joinRoom(roomId!, metadata.displayName);
        }
      } else {
        toast.error("Invalid password");
      }
    } catch {
      toast.error("Validation failed");
    }
  };

  const handleSend = (text: string) => {
      if (text.startsWith('@gemini')) {
          setIsAiTyping(true);
      }
      sendMessage(text);
  };

  const handleCopyInvite = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      toast.success("Invite ID copied!");
    }
  };


  
  if (roomId && !metadata && !error) return (
    <div className="flex h-screen items-center justify-center bg-bg-base">
      <div className="flex flex-col items-center gap-4 text-text-muted">
        <div className="w-10 h-10 rounded-xl border-2 border-accent/30 border-t-accent animate-spin" />
        <p className="text-sm font-medium">Loading room...</p>
      </div>
    </div>
  );

  if (roomId && metadata?.isPrivate && !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-bg-base relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, oklch(0.62 0.17 260), transparent 70%)' }} />
        </div>
        <Card className="relative w-full max-w-sm shadow-2xl border-border-subtle bg-bg-card/90 backdrop-blur-md">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-accent text-xl">&#128274;</span>
            </div>
            <CardTitle className="text-lg">Private Room</CardTitle>
            <p className="text-sm text-text-muted mt-1">{metadata.displayName}</p>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleValidatePassword()}
              className="bg-bg-elevated border-border-subtle h-10"
              autoFocus
            />
            <Button
              onClick={handleValidatePassword}
              className="w-full bg-accent hover:bg-accent/90 text-bg-base font-semibold rounded-full h-10 transition-all active:scale-[0.98]"
            >
              Enter Room
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredPublicRooms = publicRooms.filter(r => r.displayName.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden p-4 gap-4">
      
      {/* Left Column: Public Rooms & Create */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex w-72 flex-col border border-border-subtle bg-bg-elevated shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-accent/10"
      >
        <div 
          onClick={() => navigate('/')}
          className="p-4 border-b border-border-subtle shrink-0 cursor-pointer hover:bg-bg-base transition-colors flex items-center gap-2 group"
        >
          <div className="w-6 h-6 rounded bg-accent flex items-center justify-center shrink-0">
            <span className="text-bg-base font-bold text-[10px]">#</span>
          </div>
          <h2 className="font-bold text-lg text-text-primary group-hover:text-accent transition-colors">EchoChat</h2>
        </div>
        
        <div className="p-3 shrink-0">
          <Input 
            placeholder="Search public rooms..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-bg-base border-border-subtle text-xs h-8"
          />
        </div>
        
        <ScrollArea className="flex-1 p-2 min-h-0">
          {filteredPublicRooms.map(r => (
            <div 
              key={r.roomId}
              onClick={() => navigate(`/room/${r.roomId}`)}
              className="p-3 rounded-xl mb-1 cursor-pointer transition-all flex items-center gap-3 hover:bg-bg-base border border-transparent"
            >
              <Avatar className="w-10 h-10 shrink-0 border border-border-subtle group-hover:border-accent/30 transition-colors">
                <AvatarFallback className="font-semibold bg-bg-base text-text-primary">{r.displayName.substring(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate text-text-primary group-hover:text-accent transition-colors">{r.displayName}</h4>
                <p className="text-xs truncate text-text-muted">
                  {r.roomId === roomId ? activeCount : r.activeCount} online
                </p>
              </div>
            </div>
          ))}
          {filteredPublicRooms.length === 0 && (
            <div className="text-center p-4 text-text-muted text-sm">No public rooms found.</div>
          )}
        </ScrollArea>

        {/* Create Room Section - Overlapping with rounded top */}
        <div className="p-4 border-t border-border-subtle bg-bg-card shrink-0 relative z-10 -mt-2 rounded-t-2xl shadow-[0_-8px_30px_-5px_rgba(0,0,0,0.4)]">
          <h3 className="text-xs font-semibold text-text-primary mb-3">Create New Room</h3>
          <div className="flex flex-col gap-3">
            <Input 
              placeholder="Room name..." 
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              className="bg-bg-elevated border-border-subtle text-xs h-8"
            />
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="inline-private" 
                checked={newRoomIsPrivate} 
                onCheckedChange={(checked) => setNewRoomIsPrivate(checked === true)} 
                className="w-4 h-4"
              />
              <label
                htmlFor="inline-private"
                className="text-[11px] font-medium leading-none cursor-pointer text-text-muted hover:text-text-primary transition-colors"
              >
                Private (password)
              </label>
            </div>
            
            {newRoomIsPrivate && (
              <Input
                placeholder="Password"
                type="password"
                value={newRoomPassword}
                onChange={e => setNewRoomPassword(e.target.value)}
                className="bg-bg-elevated border-border-subtle text-xs h-8"
              />
            )}

            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-text-muted">Max Users</label>
              <Select value={newRoomMaxUsers.toString()} onValueChange={v => setNewRoomMaxUsers(Number(v))}>
                <SelectTrigger className="w-[80px] bg-bg-elevated border-border-subtle h-7 text-[10px]">
                  <SelectValue placeholder="Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2" className="text-[10px]">2</SelectItem>
                  <SelectItem value="5" className="text-[10px]">5</SelectItem>
                  <SelectItem value="10" className="text-[10px]">10</SelectItem>
                  <SelectItem value="20" className="text-[10px]">20</SelectItem>
                  <SelectItem value="50" className="text-[10px]">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleCreateRoom} className="w-full h-8 text-xs bg-accent hover:bg-accent/90 text-bg-base rounded-full transition-all active:scale-[0.98] mt-1">
              Create
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Middle Column: Chat */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex flex-col relative min-w-0 bg-bg-card rounded-2xl border border-border-subtle overflow-hidden shadow-2xl shadow-accent/10"
      >
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-bg-card">
            <div className="w-20 h-20 mb-6 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center shadow-inner relative overflow-hidden group">
              <span className="text-4xl drop-shadow-sm">🧹</span>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">Room Auto Cleaned</h2>
            <p className="text-sm text-text-muted max-w-sm mt-2 leading-relaxed">{error}</p>
            <Button onClick={() => { window.location.href = '/room'; }} className="mt-6 bg-accent hover:bg-accent/90 text-bg-base font-semibold rounded-full px-8 h-10 transition-all active:scale-[0.98]">
              OK
            </Button>
          </div>
        ) : !roomId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-bg-card">
            <div className="w-20 h-20 mb-6 rounded-3xl bg-bg-elevated border border-border-subtle flex items-center justify-center shadow-inner relative overflow-hidden group">
              <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-4xl opacity-50 drop-shadow-sm">💭</span>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">Your Chatspace is Empty</h2>
            <p className="text-sm text-text-muted max-w-sm mt-2 leading-relaxed">
              Select a room from your list on the right, or join a public room from the discover tab on the left to start chatting.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between px-5 py-3 border-b border-border-subtle bg-bg-card/80 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <span className="text-text-muted text-xl">#</span>
                    {metadata?.displayName}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                      <div className={`relative flex items-center justify-center w-2 h-2`}>
                        {isConnected && <span className="absolute w-full h-full rounded-full bg-green-500 animate-ping opacity-60" />}
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-500'}`} />
                      </div>
                      <span>{isConnected ? `${activeCount} online` : 'Disconnected'}</span>
                    </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {isEditingName ? (
                  <Input
                    autoFocus
                    className="bg-bg-elevated text-sm text-text-primary focus:outline-none w-32 h-8 border-border-subtle"
                    value={editNameValue}
                    onChange={e => setEditNameValue(e.target.value)}
                    onBlur={handleSaveEditName}
                    onKeyDown={e => e.key === 'Enter' && handleSaveEditName()}
                  />
                ) : (
                  <div 
                    className="text-sm font-medium text-text-muted hover:text-text-primary cursor-pointer transition flex items-center gap-2 px-3 py-1.5 rounded hover:bg-bg-elevated"
                    onClick={() => setIsEditingName(true)}
                  >
                    <span className="opacity-50">as</span> {displayName}
                  </div>
                )}
                <Button onClick={handleCopyInvite} className="bg-accent hover:bg-accent/90 text-bg-base rounded-full text-xs h-8 px-4">
                  Copy Invite ID
                </Button>
              </div>
            </header>

            <div className="flex-1 flex flex-col relative overflow-hidden bg-chat-doodle">
              {allMessages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-14 h-14 mb-5 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <span className="text-2xl">📡</span>
                  </div>
                  <h3 className="text-base font-bold text-text-primary">No messages yet</h3>
                  <p className="text-sm text-text-muted max-w-xs mt-2 leading-relaxed">
                    Say something, or start with <span className="text-accent font-mono text-xs">@gemini</span> to bring in AI.
                  </p>
                </div>
              ) : (
                <MessageList messages={allMessages} currentUserUuid={uuid} />
              )}
              {isAiTyping && <TypingIndicator />}
            </div>
            <div className="p-4 shrink-0 bg-bg-card">
              <ChatInput onSendMessage={handleSend} disabled={!isConnected} />
            </div>
          </>
        )}
      </motion.div>

      {/* Right Column: Joined Rooms */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="hidden xl:flex w-72 flex-col border border-border-subtle bg-bg-elevated shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-accent/10"
      >
        <div className="p-4 border-b border-border-subtle shrink-0">
          <h2 className="font-bold text-lg text-text-primary">Your Rooms</h2>
        </div>
        <ScrollArea className="flex-1 p-2 min-h-0">
          <AnimatePresence initial={false}>
            {joinedRooms.map(r => {
              const isActive = roomId === r.roomId;
              const isLeaving = leavingRoomId === r.roomId;
              return (
                <motion.div
                  key={r.roomId}
                  layout
                  initial={{ opacity: 0, x: 16, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 32, scale: 0.88 }}
                  transition={{
                    duration: isLeaving ? 0.15 : 0.25,
                    ease: [0.4, 0, 0.2, 1],
                    layout: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
                  }}
                  onClick={() => !isLeaving && navigate(`/room/${r.roomId}`)}
                  className={`group p-3 rounded-xl mb-1 cursor-pointer flex items-center gap-3 transition-colors duration-150 ${
                    isLeaving 
                      ? 'bg-red-600 text-white shadow-lg pointer-events-none' 
                      : isActive 
                        ? 'bg-accent text-bg-base shadow-md' 
                        : 'text-text-primary hover:bg-bg-base border border-transparent hover:border-border-subtle'
                  }`}
                >
                  <Avatar className={`w-8 h-8 shrink-0 transition-colors duration-150 ${isActive && !isLeaving ? 'border border-bg-base/20' : isLeaving ? 'border border-white/20' : 'border border-border-subtle'}`}>
                    <AvatarFallback className={`text-xs font-semibold transition-colors duration-150 ${
                      isLeaving ? 'bg-red-700 text-white' :
                      isActive ? 'bg-bg-base/20 text-bg-base' : 'bg-bg-base text-text-muted'
                    }`}>{r.name.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-sm truncate transition-colors duration-150 ${isLeaving ? 'text-white' : isActive ? 'text-bg-base' : 'text-text-primary'}`}>{r.name}</h4>
                  </div>
                  <button
                    onClick={(e) => handleLeaveRoom(r.roomId, e)}
                    className={`opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-full transition-all shrink-0 active:scale-90 focus:outline-none ${
                      isActive ? 'text-red-200 hover:text-white hover:bg-red-500/80' : 'text-text-muted hover:text-red-500 hover:bg-red-500/10'
                    }`}
                    title="Leave room"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {joinedRooms.length === 0 && (
            <div className="text-center p-4 text-text-muted text-sm">You haven't joined any rooms yet.</div>
          )}
        </ScrollArea>
        <div className="p-4 border-t border-border-subtle bg-bg-card shrink-0">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Join by ID</h3>
          <div className="flex gap-2">
            <Input 
              placeholder="Paste invite ID..." 
              value={joinId}
              onChange={e => setJoinId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && joinId && navigate(`/room/${joinId}`)}
              className="bg-bg-elevated border-border-subtle text-xs h-8"
            />
            <Button size="sm" onClick={() => joinId && navigate(`/room/${joinId}`)} className="h-8 text-xs bg-accent hover:bg-accent/90 text-bg-base rounded-full px-4">Join</Button>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
