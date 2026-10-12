import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Client } from '@stomp/stompjs';
import { useParams, useNavigate } from 'react-router-dom';
import {
  X,
  Plus,
  Search,
  Copy,
  Check,
  Lock,
  Globe,
  Users,
  Menu,
  Info,
  Clock,
  LogOut,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShadowSession } from '../hooks/useShadowSession';
import { useChatRoom } from '../hooks/useChatRoom';
import { useRoomHistory } from '../hooks/useRoomHistory';
import { useJoinedRooms } from '../hooks/useJoinedRooms';
import { MessageList } from '../components/chat/MessageList';
import { ChatInput } from '../components/chat/ChatInput';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import type { RoomMetadataResponse, MessageDTO } from '../types';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';

// Deterministic room gradient cycling through palette pairs:
// #D9774F to #E88CA5, #2E5A44 to #5FBF8A, #8C2F45 to #D9774F, #E3B94F to #D9774F, #7FA8E8 to #2E5A44
const roomGradientPairs = [
  'from-[#D9774F] to-[#E88CA5]', // Terracotta to Rose
  'from-[#2E5A44] to-[#5FBF8A]', // Sage to Online
  'from-[#8C2F45] to-[#D9774F]', // Burgundy to Terracotta
  'from-[#E3B94F] to-[#D9774F]', // Gold to Terracotta
  'from-[#7FA8E8] to-[#2E5A44]', // Blue to Sage
];

function getRoomGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return roomGradientPairs[Math.abs(hash) % roomGradientPairs.length];
}

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { uuid, displayName, saveDisplayName } = useShadowSession();

  // Name editing in header
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(displayName || '');

  useEffect(() => {
    setEditNameValue(displayName || '');
  }, [displayName]);

  const handleSaveEditName = () => {
    if (editNameValue.trim().length >= 2) {
      saveDisplayName(editNameValue.trim());
      toast.success('Display name updated');
    } else {
      setEditNameValue(displayName || '');
    }
    setIsEditingName(false);
  };

  const [metadata, setMetadata] = useState<RoomMetadataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Joined rooms & discovery
  const { joinedRooms, joinRoom, leaveRoom } = useJoinedRooms();
  const [joinId, setJoinId] = useState('');
  const [publicRooms, setPublicRooms] = useState<RoomMetadataResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'joined' | 'discover'>('joined');
  const [leavingRoomId, setLeavingRoomId] = useState<string | null>(null);

  // Modals & Panels
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Create room modal form states
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomIsPrivate, setNewRoomIsPrivate] = useState(false);
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [newRoomMaxUsers, setNewRoomMaxUsers] = useState(20);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const handleLeaveRoom = useCallback(
    (idToLeave: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setLeavingRoomId(idToLeave);
      setTimeout(() => {
        leaveRoom(idToLeave);
        setLeavingRoomId(null);
        if (idToLeave === roomId) {
          navigate('/room');
        }
      }, 200);
    },
    [leaveRoom, roomId, navigate]
  );

  const handleCreateRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isCreatingRoom) return;
    setIsCreatingRoom(true);

    try {
      const res = await apiFetch('/api/v1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: newRoomName.trim() || 'Anonymous Room',
          isPrivate: newRoomIsPrivate,
          password: newRoomIsPrivate ? newRoomPassword : null,
          maxUsers: newRoomMaxUsers,
          creatorUuid: uuid || 'unknown',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewRoomName('');
        setNewRoomPassword('');
        setNewRoomIsPrivate(false);
        setIsCreateModalOpen(false);
        toast.success(`Room "${data.displayName || 'New Room'}" created!`);
        navigate(`/room/${data.roomId}`);
      } else {
        toast.error('Failed to create room. Please try again.');
      }
    } catch {
      toast.error('Network error creating room.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Fetch public rooms initially and refresh every 30s
  const fetchPublicRooms = useCallback(() => {
    apiFetch('/api/v1/rooms/public')
      .then(res => res.json())
      .then(data => setPublicRooms(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchPublicRooms();
    const interval = setInterval(fetchPublicRooms, 30000);
    return () => clearInterval(interval);
  }, [fetchPublicRooms]);

  // Subscribe to global room expiry events
  const globalClientRef = useRef<Client | null>(null);
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const brokerURL = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws`;

    const client = new Client({
      brokerURL,
      connectHeaders: { userId: uuid || 'anon', displayName: displayName || 'anon', roomId: '__global__' },
      reconnectDelay: 10000,
      onConnect: () => {
        client.subscribe('/topic/rooms/expired', frame => {
          const data = JSON.parse(frame.body);
          if (data.type === 'ROOM_EXPIRED') {
            const expiredRoomId = data.senderName;
            leaveRoom(expiredRoomId);
            setPublicRooms(prev => prev.filter(r => r.roomId !== expiredRoomId));
          }
        });
      },
    });

    client.activate();
    globalClientRef.current = client;
    return () => {
      client.deactivate();
    };
  }, [uuid, displayName, leaveRoom]);

  const { history } = useRoomHistory(isAuthorized ? roomId : undefined);
  const { messages, sendMessage, isConnected, activeCount, roomExpired, participants } = useChatRoom({
    roomId: isAuthorized ? roomId! : '',
    userUuid: uuid || '',
    displayName: displayName || '',
    initialActiveCount: metadata?.activeCount || 0,
  });

  const [mentionToInsert, setMentionToInsert] = useState<string | null>(null);

  // Combine all known room members from presence events, incoming messages, history, and yourself
  const allMembers = useMemo(() => {
    const set = new Set<string>();
    if (displayName && displayName.trim()) set.add(displayName.trim());
    participants.forEach(p => {
      if (p && p.trim()) set.add(p.trim());
    });
    history.forEach(m => {
      if (m.senderType !== 'GEMINI' && m.senderName && m.senderName !== 'System') {
        set.add(m.senderName.trim());
      }
    });
    return Array.from(set);
  }, [displayName, participants, history]);

  const otherParticipants = useMemo(() => {
    return allMembers.filter(m => m !== displayName);
  }, [allMembers, displayName]);

  // When room expires, cleanup
  useEffect(() => {
    if (roomExpired && roomId) {
      leaveRoom(roomId);
      setPublicRooms(prev => prev.filter(r => r.roomId !== roomId));
      setMetadata(null);
      setError('This room has expired and was automatically cleaned up.');
      toast.error('This room has expired.');
    }
  }, [roomExpired, roomId, leaveRoom]);

  const [allMessages, setAllMessages] = useState<MessageDTO[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear room message state when switching rooms to prevent chats leaking into each other
  useEffect(() => {
    setAllMessages([]);
    setMentionToInsert(null);
    setIsAiTyping(false);
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
  }, [roomId]);

  useEffect(() => {
    const combined = [...history, ...messages];
    const seen = new Set<string>();
    const unique: MessageDTO[] = [];
    for (const msg of combined) {
      const key = msg.id || `${msg.timestamp}-${msg.senderUuid}-${msg.content}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(msg);
      }
    }
    setAllMessages(unique);
  }, [history, messages]);

  // Clear AI typing indicator when Gemini replies
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderType === 'GEMINI') {
        setIsAiTyping(false);
        if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      }
    }
  }, [messages]);

  // Fetch current room metadata
  useEffect(() => {
    let cancelled = false;

    if (!roomId) {
      setMetadata(null);
      setError(null);
      setIsAuthorized(false);
      return;
    }

    setMetadata(null);
    setError(null);
    setIsAuthorized(false);

    apiFetch(`/api/v1/rooms/${roomId}`)
      .then(res => {
        if (!res.ok) throw new Error('Room not found');
        return res.json();
      })
      .then(data => {
        if (cancelled) return;
        setMetadata(data);
        if (!data.isPrivate) {
          setIsAuthorized(true);
          joinRoom(roomId, data.displayName);
        } else {
          setIsAuthorized(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        leaveRoom(roomId);
        setError('This room does not exist or has expired.');
      });

    return () => {
      cancelled = true;
    };
  }, [roomId, joinRoom, leaveRoom]);

  const handleValidatePassword = async () => {
    try {
      const res = await apiFetch(`/api/v1/rooms/${roomId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthorized(true);
        if (metadata) {
          joinRoom(roomId!, metadata.displayName);
        }
        toast.success('Joined private room');
      } else {
        toast.error('Incorrect room password');
      }
    } catch {
      toast.error('Validation failed. Please try again.');
    }
  };

  const handleSend = (text: string) => {
    if (text.includes('@gemini')) {
      setIsAiTyping(true);
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      // Graceful timeout after 20s if Gemini does not respond
      aiTimeoutRef.current = setTimeout(() => {
        setIsAiTyping(false);
      }, 20000);
    }
    sendMessage(text);
  };

  const handleCopyInvite = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopiedInvite(true);
      toast.success('Invite ID copied to clipboard!');
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  const handleJoinById = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) {
      const target = joinId.trim();
      setJoinId('');
      setIsMobileSidebarOpen(false);
      navigate(`/room/${target}`);
    }
  };

  const filteredPublicRooms = publicRooms.filter(r =>
    r.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-bg overflow-hidden p-2 sm:p-3 md:p-4 gap-3 select-none">
      {/* ========================================================
          1. UNIFIED LEFT SIDEBAR (Your Rooms + Discover)
          ======================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 sm:w-80 bg-surface border-r border-border flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:rounded-2xl lg:border lg:shadow-2xl shadow-black/20 ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-border flex items-center justify-between shrink-0">
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-terracotta flex items-center justify-center shadow-md">
              <span className="text-on-terracotta font-bold text-xs">#</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-base text-text group-hover:text-terracotta transition-colors leading-tight">
                EchoChat
              </h1>
              <span className="text-[10px] text-text-3 tracking-wide block">Real-time AI Rooms</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              aria-label="Create new room"
              className="w-8 h-8 rounded-lg bg-elevated hover:bg-surface border border-border flex items-center justify-center text-terracotta hover:text-text transition-all active:scale-95 shadow-sm"
              title="Create Room"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close sidebar"
              className="lg:hidden w-8 h-8 rounded-lg text-text-3 hover:text-text flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Toggle: Your Rooms vs Discover */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <div className="grid grid-cols-2 p-1 bg-elevated rounded-xl border border-border text-xs font-medium">
            <button
              onClick={() => setSidebarTab('joined')}
              className={`py-1.5 px-3 rounded-lg transition-all ${
                sidebarTab === 'joined'
                  ? 'bg-sage text-text shadow-sm font-semibold'
                  : 'text-text-2 hover:text-text'
              }`}
            >
              Your Rooms ({joinedRooms.length})
            </button>
            <button
              onClick={() => setSidebarTab('discover')}
              className={`py-1.5 px-3 rounded-lg transition-all ${
                sidebarTab === 'discover'
                  ? 'bg-sage text-text shadow-sm font-semibold'
                  : 'text-text-2 hover:text-text'
              }`}
            >
              Discover
            </button>
          </div>
        </div>

        {/* Search Bar for Discover */}
        {sidebarTab === 'discover' && (
          <div className="px-3 pb-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
              <input
                type="text"
                placeholder="Search public rooms..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-elevated border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-text placeholder-text-3 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-gold/40"
              />
            </div>
          </div>
        )}

        {/* Room List Content */}
        <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {sidebarTab === 'joined' ? (
            /* Joined Rooms Tab */
            <div className="space-y-1">
              <AnimatePresence initial={false}>
                {joinedRooms.map(r => {
                  const isActive = roomId === r.roomId;
                  const isLeaving = leavingRoomId === r.roomId;
                  const grad = getRoomGradient(r.name);

                  return (
                    <motion.div
                      key={r.roomId}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => {
                        if (!isLeaving) {
                          setIsMobileSidebarOpen(false);
                          navigate(`/room/${r.roomId}`);
                        }
                      }}
                      className={`group relative p-2.5 rounded-xl cursor-pointer flex items-center gap-2.5 transition-all ${
                        isActive
                          ? 'bg-sage/25 border-l-4 border-terracotta border-y border-r border-border shadow-sm'
                          : 'hover:bg-elevated border border-transparent hover:border-border/60'
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-text text-xs font-bold shrink-0 shadow-sm`}
                      >
                        <span className="drop-shadow-sm">{r.name.substring(0, 2).toUpperCase()}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h2
                          className={`text-xs font-semibold truncate ${
                            isActive ? 'text-text font-bold' : 'text-text-2 group-hover:text-text'
                          }`}
                        >
                          {r.name}
                        </h2>
                        <span className="text-[10px] text-text-3 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-online inline-block" />
                          Joined
                        </span>
                      </div>

                      {/* Leave Room Button */}
                      <button
                        onClick={e => handleLeaveRoom(r.roomId, e)}
                        aria-label={`Leave ${r.name}`}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-text-3 hover:text-text hover:bg-burgundy/25 transition-all active:scale-95"
                        title="Leave Room"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {joinedRooms.length === 0 && (
                <div className="p-6 text-center text-text-3 text-xs space-y-2">
                  <Globe className="w-6 h-6 mx-auto opacity-40 text-terracotta" />
                  <p>No joined rooms yet.</p>
                  <p className="text-[11px] text-text-3/80">
                    Switch to Discover to browse public rooms or create your own.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Discover Tab */
            <div className="space-y-1">
              {filteredPublicRooms.map(r => {
                const isActive = roomId === r.roomId;
                const grad = getRoomGradient(r.displayName);

                return (
                  <div
                    key={r.roomId}
                    onClick={() => {
                      setIsMobileSidebarOpen(false);
                      navigate(`/room/${r.roomId}`);
                    }}
                    className={`p-2.5 rounded-xl cursor-pointer flex items-center gap-2.5 transition-all ${
                      isActive
                        ? 'bg-sage/25 border-l-4 border-terracotta border-y border-r border-border'
                        : 'hover:bg-elevated border border-transparent hover:border-border/60'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-text text-xs font-bold shrink-0 shadow-sm`}
                    >
                      <span className="drop-shadow-sm">{r.displayName.substring(0, 2).toUpperCase()}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="text-xs font-semibold truncate text-text">{r.displayName}</h2>
                      <div className="flex items-center gap-2 text-[10px] text-text-3">
                        <span className="flex items-center gap-1 text-online">
                          <span className="w-1.5 h-1.5 rounded-full bg-online" />
                          {r.roomId === roomId ? activeCount : r.activeCount} online
                        </span>
                        <span>•</span>
                        <span>max {r.maxUsers}</span>
                      </div>
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 text-text-3" />
                  </div>
                );
              })}

              {filteredPublicRooms.length === 0 && (
                <div className="p-6 text-center text-text-3 text-xs">
                  <p>No public rooms found.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Join by ID Input at Sidebar Bottom */}
        <div className="p-3 border-t border-border bg-surface shrink-0">
          <form onSubmit={handleJoinById} className="space-y-1.5">
            <label className="text-[10px] font-semibold text-text-3 uppercase tracking-wider block">
              Join by Invite ID
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Paste room ID..."
                value={joinId}
                onChange={e => setJoinId(e.target.value)}
                className="flex-1 bg-elevated border border-border rounded-xl px-2.5 py-1 text-xs text-text placeholder-text-3 focus:outline-none focus:border-terracotta"
              />
              <button
                type="submit"
                disabled={!joinId.trim()}
                className="px-3 py-1 rounded-xl bg-terracotta text-on-terracotta text-xs font-semibold hover:bg-[#E28B65] active:bg-[#C56842] disabled:bg-elevated disabled:text-text-3 transition-all"
              >
                Join
              </button>
            </div>
          </form>
        </div>
      </aside>

      {/* Backdrop for Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* ========================================================
          2. MAIN CHAT AREA
          ======================================================== */}
      <main className="flex-1 flex flex-col min-w-0 bg-surface rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/20 relative">
        {/* Loading State */}
        {roomId && !metadata && !error ? (
          <div className="flex-1 flex items-center justify-center bg-bg">
            <div className="flex flex-col items-center gap-3 text-text-2">
              <div className="w-8 h-8 rounded-full border-2 border-terracotta/30 border-t-terracotta animate-spin" />
              <p className="text-xs font-medium">Entering room...</p>
            </div>
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-bg">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-burgundy/20 border border-burgundy/40 flex items-center justify-center text-3xl shadow-lg">
              🧹
            </div>
            <h2 className="text-xl font-bold font-display text-text mb-2">Room Unavailable</h2>
            <p className="text-xs text-text-2 max-w-sm mb-6 leading-relaxed">{error}</p>
            <button
              onClick={() => navigate('/room')}
              className="px-6 py-2.5 rounded-full bg-terracotta text-on-terracotta text-xs font-semibold hover:bg-[#E28B65] active:bg-[#C56842] transition-all shadow-md"
            >
              Back to Rooms
            </button>
          </div>
        ) : roomId && metadata?.isPrivate && !isAuthorized ? (
          /* Password Protected Room Prompt */
          <div className="flex-1 flex items-center justify-center p-4 bg-bg">
            <div className="w-full max-w-sm p-6 rounded-2xl bg-surface border border-border shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-terracotta/15 border border-terracotta/30 flex items-center justify-center mx-auto text-terracotta">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-text">Private Room</h2>
                <p className="text-xs text-text-2 mt-1">{metadata.displayName}</p>
              </div>
              <input
                type="password"
                placeholder="Enter room password..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleValidatePassword()}
                className="w-full bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-sm text-text placeholder-text-3 focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-gold/40"
                autoFocus
              />
              <button
                onClick={handleValidatePassword}
                className="w-full py-2.5 rounded-xl bg-terracotta text-on-terracotta text-xs font-semibold hover:bg-[#E28B65] active:bg-[#C56842] transition-all shadow-md"
              >
                Unlock Room
              </button>
            </div>
          </div>
        ) : !roomId ? (
          /* No Room Selected (Lobby) */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-bg">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-elevated border border-border flex items-center justify-center text-3xl shadow-lg">
              💬
            </div>
            <h2 className="text-xl font-bold font-display text-text mb-2">Welcome to EchoChat</h2>
            <p className="text-xs text-text-2 max-w-sm mb-6 leading-relaxed">
              Select a room from the left sidebar or create a new public or private room to chat in real time with Gemini AI.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2 rounded-full bg-terracotta text-on-terracotta text-xs font-semibold hover:bg-[#E28B65] active:bg-[#C56842] transition-all shadow-md"
              >
                Create Room
              </button>
              <button
                onClick={() => setSidebarTab('discover')}
                className="px-5 py-2 rounded-full bg-elevated hover:bg-surface border border-border text-text text-xs font-semibold transition-all active:scale-95"
              >
                Browse Public Rooms
              </button>
            </div>
          </div>
        ) : (
          /* Active Chat Room View */
          <>
            {/* Header */}
            <header className="px-4 py-3 border-b border-border bg-surface flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile sidebar toggle */}
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  aria-label="Open rooms menu"
                  className="lg:hidden p-1.5 rounded-lg text-text-2 hover:text-text hover:bg-elevated transition-colors"
                >
                  <Menu className="w-4 h-4" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-bold text-sm sm:text-base text-text truncate">
                      {metadata?.displayName}
                    </h2>
                    {metadata?.isPrivate && (
                      <span className="p-0.5 rounded bg-burgundy/25 text-rose" title="Private Room">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Presence & Connection status */}
                  <div className="flex items-center gap-2 text-[11px] text-text-2">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        {isConnected && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-online opacity-75" />
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-2 w-2 ${
                            isConnected ? 'bg-online' : 'bg-burgundy'
                          }`}
                        />
                      </span>
                      <span>{isConnected ? `${activeCount} online` : 'Connecting...'}</span>
                    </div>

                    <span className="text-border">•</span>

                    {/* Display name editor */}
                    {isEditingName ? (
                      <input
                        autoFocus
                        value={editNameValue}
                        onChange={e => setEditNameValue(e.target.value)}
                        onBlur={handleSaveEditName}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEditName()}
                        className="bg-elevated text-text px-1.5 py-0.5 rounded text-[11px] border border-terracotta outline-none w-24"
                      />
                    ) : (
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="hover:text-text transition-colors flex items-center gap-1 group"
                        title="Click to change your display name"
                      >
                        <span className="text-text-3">as</span>
                        <span className="font-medium underline decoration-dotted underline-offset-2">
                          {displayName}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2">
                {/* Copy Invite ID Button with visual confirmation */}
                <button
                  onClick={handleCopyInvite}
                  aria-label="Copy Invite ID"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 border ${
                    copiedInvite
                      ? 'bg-online/15 border-online/30 text-online'
                      : 'bg-elevated border-border text-text hover:bg-surface'
                  }`}
                >
                  {copiedInvite ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-online" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-terracotta" />
                      <span className="hidden sm:inline">Copy Invite ID</span>
                      <span className="sm:hidden">Copy</span>
                    </>
                  )}
                </button>

                {/* Toggle Room Info Panel Button */}
                <button
                  onClick={() => setIsInfoPanelOpen(prev => !prev)}
                  aria-label="Toggle room information"
                  className={`p-1.5 rounded-full transition-all border ${
                    isInfoPanelOpen
                      ? 'bg-sage/30 border-terracotta/40 text-terracotta'
                      : 'bg-elevated border-border text-text-3 hover:text-text'
                  }`}
                  title="Room Info"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Message Area: flat --bg, no doodles (PRD Step 3) */}
            <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden bg-bg chat-canvas select-text">
              {allMessages.length === 0 ? (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-10 select-none">
                  <div className="w-14 h-14 mb-4 rounded-2xl bg-sage/20 border border-sage/40 flex items-center justify-center shadow-lg text-sage">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-display font-bold text-text mb-1">
                    No messages yet
                  </h3>
                  <p className="text-xs text-text-2 max-w-sm mb-5 leading-relaxed">
                    Say hello to the room, or mention{' '}
                    <span className="text-gold font-mono font-semibold">@gemini</span> to get instant AI answers.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-md">
                    {[
                      '@gemini explain virtual threads simply',
                      '@gemini summarize key points of this chat',
                      'Hello everyone! 👋',
                    ].map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => handleSend(suggestion)}
                        className="px-3 py-1.5 rounded-full bg-elevated hover:bg-surface border border-border text-text text-xs transition-all active:scale-95"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <MessageList key={roomId} messages={allMessages} currentUserUuid={uuid} />
              )}

              {/* Gemini Thinking Indicator */}
              {isAiTyping && <TypingIndicator />}
            </div>

            {/* Input Bar */}
            <footer className="p-3 border-t border-border bg-surface shrink-0">
              <ChatInput
                onSendMessage={handleSend}
                disabled={!isConnected}
                members={allMembers}
                mentionToInsert={mentionToInsert}
                onMentionInserted={() => setMentionToInsert(null)}
              />
            </footer>
          </>
        )}
      </main>

      {/* ========================================================
          3. COLLAPSIBLE RIGHT ROOM INFO PANEL
          ======================================================== */}
      <AnimatePresence>
        {roomId && metadata && isInfoPanelOpen && (
          <motion.aside
            initial={{ opacity: 0, width: 0, x: 20 }}
            animate={{ opacity: 1, width: 280, x: 0 }}
            exit={{ opacity: 0, width: 0, x: 20 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="hidden xl:flex flex-col bg-surface border border-border rounded-2xl overflow-hidden shrink-0 shadow-2xl shadow-black/20"
          >
            {/* Header */}
            <div className="p-3.5 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-terracotta" />
                <h3 className="font-display font-bold text-xs text-text uppercase tracking-wider">
                  Room Info
                </h3>
              </div>
              <button
                onClick={() => setIsInfoPanelOpen(false)}
                className="text-text-3 hover:text-text p-1 rounded-md transition-colors"
                title="Hide Info"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs scrollbar-thin">
              {/* Room details card */}
              <div className="p-3 rounded-xl bg-elevated border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-text-3 text-[11px]">Room Name</span>
                  <span className="font-semibold text-text truncate max-w-[130px]">
                    {metadata.displayName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-3 text-[11px]">Type</span>
                  <span className="text-text flex items-center gap-1 font-medium">
                    {metadata.isPrivate ? (
                      <>
                        <Lock className="w-3 h-3 text-rose" /> Private
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3 text-online" /> Public
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-3 text-[11px]">Capacity</span>
                  <span className="text-text font-medium">
                    {activeCount} / {metadata.maxUsers} max
                  </span>
                </div>
              </div>

              {/* Ephemeral room notice */}
              <div className="p-3 rounded-xl bg-elevated border border-border space-y-1.5">
                <div className="flex items-center gap-1.5 text-gold font-semibold text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Ephemeral Room</span>
                </div>
                <p className="text-[11px] text-text-2 leading-relaxed">
                  Self-cleaning: this room automatically dissolves after 10 minutes of complete inactivity.
                </p>
              </div>

              {/* Members section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-terracotta" />
                    <span>Participants ({Math.max(activeCount, allMembers.length)})</span>
                  </span>
                  <span className="text-[10px] text-online font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-online animate-pulse" />
                    {activeCount} online
                  </span>
                </div>

                <div className="space-y-1.5 max-h-52 overflow-y-auto scrollbar-thin pr-0.5">
                  {/* Current User */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-elevated/80 border border-border/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-online animate-pulse shrink-0" />
                      <span className="text-xs font-medium text-text truncate">
                        {displayName}
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sage/30 text-online font-semibold shrink-0">
                      You
                    </span>
                  </div>

                  {/* Other participants */}
                  {otherParticipants.map(name => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-2 rounded-lg bg-elevated/50 hover:bg-elevated border border-border/60 transition-all group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-online shrink-0" />
                        <span className="text-xs font-medium text-text truncate" title={name}>
                          {name}
                        </span>
                      </div>
                      <button
                        onClick={() => setMentionToInsert(name)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold text-gold bg-gold/15 hover:bg-gold/25 transition-all active:scale-95 shrink-0"
                        title={`Mention @${name}`}
                      >
                        @{name}
                      </button>
                    </div>
                  ))}

                  {/* If activeCount exceeds named members */}
                  {activeCount > allMembers.length && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-elevated/30 border border-dashed border-border/50 text-text-3">
                      <div className="w-2 h-2 rounded-full bg-online/70 shrink-0" />
                      <span className="text-[11px] truncate">
                        +{activeCount - allMembers.length} other participant{activeCount - allMembers.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {otherParticipants.length === 0 && activeCount <= 1 && (
                    <p className="text-[11px] text-text-3 italic px-1 pt-1">
                      No other participants yet. Share the invite ID to chat!
                    </p>
                  )}
                </div>
              </div>

              {/* Invite ID section */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider block">
                  Invite ID
                </span>
                <div className="p-2 rounded-lg bg-bg border border-border font-mono text-[11px] text-text-2 break-all select-all flex items-center justify-between gap-1">
                  <span className="truncate">{roomId}</span>
                  <button
                    onClick={handleCopyInvite}
                    className="p-1 rounded text-terracotta hover:bg-elevated"
                    title="Copy"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Leave room action */}
              <div className="pt-2">
                <button
                  onClick={e => handleLeaveRoom(roomId, e)}
                  className="w-full py-2 px-3 rounded-xl bg-burgundy/20 hover:bg-burgundy border border-burgundy/40 text-text hover:text-text transition-all flex items-center justify-center gap-2 text-xs font-medium active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Leave Room</span>
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ========================================================
          4. CREATE ROOM MODAL
          ======================================================== */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="relative w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl shadow-black/50 z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-terracotta flex items-center justify-center text-on-terracotta shadow-md">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base text-text">Create New Room</h2>
                    <p className="text-[11px] text-text-3">Public or password-protected room</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-lg text-text-3 hover:text-text hover:bg-elevated transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                {/* Room Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text">Room Name</label>
                  <input
                    type="text"
                    placeholder="e.g. AI Brainstorming, Dev Chat"
                    value={newRoomName}
                    onChange={e => setNewRoomName(e.target.value)}
                    required
                    className="w-full bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-xs text-text placeholder-text-3 focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-gold/40"
                  />
                </div>

                {/* Privacy Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-elevated border border-border">
                  <div className="flex items-center gap-2.5">
                    <Lock className={`w-4 h-4 ${newRoomIsPrivate ? 'text-rose' : 'text-text-3'}`} />
                    <div>
                      <p className="text-xs font-semibold text-text">Private Room</p>
                      <p className="text-[10px] text-text-3">Require a password to join</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={newRoomIsPrivate}
                    onChange={e => setNewRoomIsPrivate(e.target.checked)}
                    className="w-4 h-4 accent-terracotta cursor-pointer rounded"
                  />
                </div>

                {/* Password field if private */}
                {newRoomIsPrivate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5"
                  >
                    <label className="text-xs font-semibold text-text">Room Password</label>
                    <input
                      type="password"
                      placeholder="Set a secret passcode..."
                      value={newRoomPassword}
                      onChange={e => setNewRoomPassword(e.target.value)}
                      required={newRoomIsPrivate}
                      className="w-full bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-xs text-text placeholder-text-3 focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-gold/40"
                    />
                  </motion.div>
                )}

                {/* Max Users Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text">Max Participants</label>
                  <select
                    value={newRoomMaxUsers}
                    onChange={e => setNewRoomMaxUsers(Number(e.target.value))}
                    className="w-full bg-elevated border border-border rounded-xl px-3.5 py-2.5 text-xs text-text focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-gold/40 cursor-pointer"
                  >
                    <option value={2}>2 Users (Direct 1-on-1)</option>
                    <option value={5}>5 Users (Small Group)</option>
                    <option value={10}>10 Users (Team)</option>
                    <option value={20}>20 Users (Standard)</option>
                    <option value={50}>50 Users (Large Room)</option>
                  </select>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isCreatingRoom}
                  className="w-full py-2.5 rounded-xl bg-terracotta text-on-terracotta text-xs font-semibold hover:bg-[#E28B65] active:bg-[#C56842] transition-all active:scale-95 shadow-lg shadow-black/30 mt-2 disabled:bg-elevated disabled:text-text-3"
                >
                  {isCreatingRoom ? 'Creating Room...' : 'Create & Join Room'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
