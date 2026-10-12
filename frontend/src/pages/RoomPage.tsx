import { useEffect, useState, useCallback, useRef } from 'react';
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
import type { RoomMetadataResponse } from '../types';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';

// Deterministic room gradient cycling through PRD 7.6 pairs:
const roomGradientPairs = [
  'from-[#FF5C9A] to-[#F43F5E]',
  'from-[#9F1239] to-[#FF5C9A]',
  'from-[#FACC15] to-[#F43F5E]',
  'from-[#3B82F6] to-[#9F1239]',
  'from-[#F43F5E] to-[#FACC15]',
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
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
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
  const { messages, sendMessage, isConnected, activeCount, roomExpired } = useChatRoom({
    roomId: isAuthorized ? roomId! : '',
    userUuid: uuid || '',
    displayName: displayName || '',
    initialActiveCount: metadata?.activeCount || 0,
  });

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

  const [allMessages, setAllMessages] = useState(history);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAllMessages([...history, ...messages]);
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
    if (!roomId) {
      setMetadata(null);
      setError(null);
      setIsAuthorized(false);
      return;
    }

    setIsLoadingMetadata(true);
    setError(null);

    apiFetch(`/api/v1/rooms/${roomId}`)
      .then(res => {
        if (!res.ok) throw new Error('Room not found');
        return res.json();
      })
      .then(data => {
        setMetadata(data);
        if (!data.isPrivate) {
          setIsAuthorized(true);
          joinRoom(roomId, data.displayName);
        } else {
          setIsAuthorized(false);
        }
      })
      .catch(() => {
        leaveRoom(roomId);
        setError('This room does not exist or has expired.');
      })
      .finally(() => {
        setIsLoadingMetadata(false);
      });
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
    <div className="flex h-screen bg-[#0E0609] overflow-hidden p-2 sm:p-3 md:p-4 gap-3 select-none">
      {/* ========================================================
          1. UNIFIED LEFT SIDEBAR (Your Rooms + Discover)
          ======================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 sm:w-80 bg-[#190B11] border-r border-[#3B1A27] flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:rounded-2xl lg:border lg:shadow-2xl lg:shadow-[#9F1239]/10 ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-[#3B1A27] flex items-center justify-between shrink-0">
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#9F1239] to-[#FF5C9A] flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xs">#</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-base text-[#FFF1F5] group-hover:text-[#FF5C9A] transition-colors leading-tight">
                EchoChat
              </h1>
              <span className="text-[10px] text-[#8A6674] tracking-wide block">Real-time AI Rooms</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              aria-label="Create new room"
              className="w-8 h-8 rounded-lg bg-[#251019] hover:bg-[#3B1A27] border border-[#3B1A27] flex items-center justify-center text-[#FF5C9A] hover:text-[#FFF1F5] transition-all active:scale-95 shadow-sm"
              title="Create Room"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close sidebar"
              className="lg:hidden w-8 h-8 rounded-lg text-[#8A6674] hover:text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Toggle: Your Rooms vs Discover */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <div className="grid grid-cols-2 p-1 bg-[#251019] rounded-xl border border-[#3B1A27] text-xs font-medium">
            <button
              onClick={() => setSidebarTab('joined')}
              className={`py-1.5 px-3 rounded-lg transition-all ${
                sidebarTab === 'joined'
                  ? 'bg-gradient-to-r from-[#9F1239] to-[#BE185D] text-white shadow-sm font-semibold'
                  : 'text-[#C9A3B2] hover:text-[#FFF1F5]'
              }`}
            >
              Your Rooms ({joinedRooms.length})
            </button>
            <button
              onClick={() => setSidebarTab('discover')}
              className={`py-1.5 px-3 rounded-lg transition-all ${
                sidebarTab === 'discover'
                  ? 'bg-gradient-to-r from-[#9F1239] to-[#BE185D] text-white shadow-sm font-semibold'
                  : 'text-[#C9A3B2] hover:text-[#FFF1F5]'
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
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A6674]" />
              <input
                type="text"
                placeholder="Search public rooms..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#251019] border border-[#3B1A27] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#FFF1F5] placeholder-[#8A6674] focus:outline-none focus:border-[#FF5C9A]/50 focus:ring-1 focus:ring-[#FACC15]/40"
              />
            </div>
          </div>
        )}

        {/* Room List Content */}
        <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin scrollbar-thumb-[#3B1A27] scrollbar-track-transparent">
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
                          ? 'bg-[#9F1239]/25 border-l-4 border-[#FF5C9A] border-y border-r border-[#3B1A27] shadow-sm'
                          : 'hover:bg-[#251019] border border-transparent hover:border-[#3B1A27]/60'
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}
                      >
                        <span className="drop-shadow-sm">{r.name.substring(0, 2).toUpperCase()}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h2
                          className={`text-xs font-semibold truncate ${
                            isActive ? 'text-[#FFF1F5]' : 'text-[#C9A3B2] group-hover:text-[#FFF1F5]'
                          }`}
                        >
                          {r.name}
                        </h2>
                        <span className="text-[10px] text-[#8A6674] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          Joined
                        </span>
                      </div>

                      {/* Leave Room Button */}
                      <button
                        onClick={e => handleLeaveRoom(r.roomId, e)}
                        aria-label={`Leave ${r.name}`}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[#8A6674] hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-all active:scale-95"
                        title="Leave Room"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {joinedRooms.length === 0 && (
                <div className="p-6 text-center text-[#8A6674] text-xs space-y-2">
                  <Globe className="w-6 h-6 mx-auto opacity-40 text-[#FF5C9A]" />
                  <p>No joined rooms yet.</p>
                  <p className="text-[11px] text-[#8A6674]/80">
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
                        ? 'bg-[#9F1239]/25 border-l-4 border-[#FF5C9A] border-y border-r border-[#3B1A27]'
                        : 'hover:bg-[#251019] border border-transparent hover:border-[#3B1A27]/60'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}
                    >
                      <span className="drop-shadow-sm">{r.displayName.substring(0, 2).toUpperCase()}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="text-xs font-semibold truncate text-[#FFF1F5]">{r.displayName}</h2>
                      <div className="flex items-center gap-2 text-[10px] text-[#8A6674]">
                        <span className="flex items-center gap-1 text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          {r.roomId === roomId ? activeCount : r.activeCount} online
                        </span>
                        <span>•</span>
                        <span>max {r.maxUsers}</span>
                      </div>
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 text-[#8A6674]" />
                  </div>
                );
              })}

              {filteredPublicRooms.length === 0 && (
                <div className="p-6 text-center text-[#8A6674] text-xs">
                  <p>No public rooms found.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Join by ID Input at Sidebar Bottom */}
        <div className="p-3 border-t border-[#3B1A27] bg-[#190B11] shrink-0">
          <form onSubmit={handleJoinById} className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#8A6674] uppercase tracking-wider block">
              Join by Invite ID
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Paste room ID..."
                value={joinId}
                onChange={e => setJoinId(e.target.value)}
                className="flex-1 bg-[#251019] border border-[#3B1A27] rounded-xl px-2.5 py-1 text-xs text-[#FFF1F5] placeholder-[#8A6674] focus:outline-none focus:border-[#FF5C9A]/50"
              />
              <button
                type="submit"
                disabled={!joinId.trim()}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#FF5C9A] to-[#F43F5E] text-white text-xs font-semibold disabled:opacity-40 hover:opacity-95 transition-all active:scale-95"
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
      <main className="flex-1 flex flex-col min-w-0 bg-[#190B11] rounded-2xl border border-[#3B1A27] overflow-hidden shadow-2xl shadow-[#9F1239]/10 relative">
        {/* Loading State */}
        {isLoadingMetadata ? (
          <div className="flex-1 flex items-center justify-center bg-[#0E0609]">
            <div className="flex flex-col items-center gap-3 text-[#C9A3B2]">
              <div className="w-8 h-8 rounded-full border-2 border-[#FF5C9A]/30 border-t-[#FF5C9A] animate-spin" />
              <p className="text-xs font-medium">Entering room...</p>
            </div>
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#0E0609]">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-[#9F1239]/20 border border-[#9F1239]/40 flex items-center justify-center text-3xl shadow-lg">
              🧹
            </div>
            <h2 className="text-xl font-bold font-display text-[#FFF1F5] mb-2">Room Unavailable</h2>
            <p className="text-xs text-[#C9A3B2] max-w-sm mb-6 leading-relaxed">{error}</p>
            <button
              onClick={() => navigate('/room')}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#FF5C9A] to-[#F43F5E] text-white text-xs font-semibold hover:opacity-95 transition-all active:scale-95 shadow-md"
            >
              Back to Rooms
            </button>
          </div>
        ) : roomId && metadata?.isPrivate && !isAuthorized ? (
          /* Password Protected Room Prompt */
          <div className="flex-1 flex items-center justify-center p-4 bg-[#0E0609]">
            <div className="w-full max-w-sm p-6 rounded-2xl bg-[#190B11] border border-[#3B1A27] shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#9F1239]/20 border border-[#FF5C9A]/30 flex items-center justify-center mx-auto text-[#FF5C9A]">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-[#FFF1F5]">Private Room</h2>
                <p className="text-xs text-[#C9A3B2] mt-1">{metadata.displayName}</p>
              </div>
              <input
                type="password"
                placeholder="Enter room password..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleValidatePassword()}
                className="w-full bg-[#251019] border border-[#3B1A27] rounded-xl px-3.5 py-2.5 text-sm text-[#FFF1F5] placeholder-[#8A6674] focus:outline-none focus:border-[#FF5C9A]/50 focus:ring-2 focus:ring-[#FACC15]/40"
                autoFocus
              />
              <button
                onClick={handleValidatePassword}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF5C9A] to-[#F43F5E] text-white text-xs font-semibold hover:opacity-95 transition-all active:scale-95 shadow-md shadow-[#9F1239]/30"
              >
                Unlock Room
              </button>
            </div>
          </div>
        ) : !roomId ? (
          /* No Room Selected (Lobby) */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#0E0609]">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-[#251019] border border-[#3B1A27] flex items-center justify-center text-3xl shadow-lg">
              💬
            </div>
            <h2 className="text-xl font-bold font-display text-[#FFF1F5] mb-2">Welcome to EchoChat</h2>
            <p className="text-xs text-[#C9A3B2] max-w-sm mb-6 leading-relaxed">
              Select a room from the left sidebar or create a new public or private room to chat in real time with Gemini AI.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-[#FF5C9A] to-[#F43F5E] text-white text-xs font-semibold hover:opacity-95 transition-all active:scale-95 shadow-md"
              >
                Create Room
              </button>
              <button
                onClick={() => setSidebarTab('discover')}
                className="px-5 py-2 rounded-full bg-[#251019] hover:bg-[#3B1A27] border border-[#3B1A27] text-[#FFF1F5] text-xs font-semibold transition-all active:scale-95"
              >
                Browse Public Rooms
              </button>
            </div>
          </div>
        ) : (
          /* Active Chat Room View */
          <>
            {/* Header */}
            <header className="px-4 py-3 border-b border-[#3B1A27] bg-[#190B11] flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile sidebar toggle */}
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  aria-label="Open rooms menu"
                  className="lg:hidden p-1.5 rounded-lg text-[#C9A3B2] hover:text-[#FFF1F5] hover:bg-[#251019] transition-colors"
                >
                  <Menu className="w-4 h-4" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-bold text-sm sm:text-base text-[#FFF1F5] truncate">
                      {metadata?.displayName}
                    </h2>
                    {metadata?.isPrivate && (
                      <span className="p-0.5 rounded bg-[#9F1239]/30 text-[#FF5C9A]" title="Private Room">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Presence & Connection status */}
                  <div className="flex items-center gap-2 text-[11px] text-[#C9A3B2]">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        {isConnected && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-2 w-2 ${
                            isConnected ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                      </span>
                      <span>{isConnected ? `${activeCount} online` : 'Connecting...'}</span>
                    </div>

                    <span className="text-[#3B1A27]">•</span>

                    {/* Display name editor */}
                    {isEditingName ? (
                      <input
                        autoFocus
                        value={editNameValue}
                        onChange={e => setEditNameValue(e.target.value)}
                        onBlur={handleSaveEditName}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEditName()}
                        className="bg-[#251019] text-[#FFF1F5] px-1.5 py-0.5 rounded text-[11px] border border-[#FF5C9A]/40 outline-none w-24"
                      />
                    ) : (
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="hover:text-[#FFF1F5] transition-colors flex items-center gap-1 group"
                        title="Click to change your display name"
                      >
                        <span className="text-[#8A6674]">as</span>
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
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : 'bg-[#251019] border-[#3B1A27] text-[#FFF1F5] hover:bg-[#3B1A27]'
                  }`}
                >
                  {copiedInvite ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#FF5C9A]" />
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
                      ? 'bg-[#9F1239]/20 border-[#FF5C9A]/30 text-[#FF5C9A]'
                      : 'bg-[#251019] border-[#3B1A27] text-[#8A6674] hover:text-[#FFF1F5]'
                  }`}
                  title="Room Info"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Message Area with PRD subtle radial glow (no doodle pattern!) */}
            <div className="flex-1 flex flex-col relative overflow-hidden chat-radial-glow select-text">
              {allMessages.length === 0 ? (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-10 select-none">
                  <div className="w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br from-[#9F1239]/20 to-[#FF5C9A]/20 border border-[#FF5C9A]/30 flex items-center justify-center shadow-lg">
                    <Sparkles className="w-6 h-6 text-[#FF5C9A]" />
                  </div>
                  <h3 className="text-base font-display font-bold text-[#FFF1F5] mb-1">
                    No messages yet
                  </h3>
                  <p className="text-xs text-[#C9A3B2] max-w-sm mb-5 leading-relaxed">
                    Say hello to the room, or mention{' '}
                    <span className="text-yellow-400 font-mono font-semibold">@gemini</span> to get instant AI answers.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-md">
                    {[
                      '@gemini explain quantum computing simply',
                      '@gemini what are Java virtual threads?',
                      'Hello everyone! 👋',
                    ].map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => handleSend(suggestion)}
                        className="px-3 py-1.5 rounded-full bg-[#251019] hover:bg-[#3B1A27] border border-[#3B1A27] text-[#FFF1F5] text-xs transition-all active:scale-95"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <MessageList messages={allMessages} currentUserUuid={uuid} />
              )}

              {/* Gemini Thinking Indicator */}
              {isAiTyping && <TypingIndicator />}
            </div>

            {/* Input Bar */}
            <footer className="p-3 border-t border-[#3B1A27] bg-[#190B11] shrink-0">
              <ChatInput
                onSendMessage={handleSend}
                disabled={!isConnected}
                members={displayName ? [displayName] : []}
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
            className="hidden xl:flex flex-col bg-[#190B11] border border-[#3B1A27] rounded-2xl overflow-hidden shrink-0 shadow-2xl shadow-[#9F1239]/10"
          >
            {/* Header */}
            <div className="p-3.5 border-b border-[#3B1A27] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#FF5C9A]" />
                <h3 className="font-display font-bold text-xs text-[#FFF1F5] uppercase tracking-wider">
                  Room Info
                </h3>
              </div>
              <button
                onClick={() => setIsInfoPanelOpen(false)}
                className="text-[#8A6674] hover:text-white p-1 rounded-md transition-colors"
                title="Hide Info"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs scrollbar-thin">
              {/* Room details card */}
              <div className="p-3 rounded-xl bg-[#251019] border border-[#3B1A27] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#8A6674] text-[11px]">Room Name</span>
                  <span className="font-semibold text-[#FFF1F5] truncate max-w-[130px]">
                    {metadata.displayName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8A6674] text-[11px]">Type</span>
                  <span className="text-[#FFF1F5] flex items-center gap-1 font-medium">
                    {metadata.isPrivate ? (
                      <>
                        <Lock className="w-3 h-3 text-[#FF5C9A]" /> Private
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3 text-green-400" /> Public
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8A6674] text-[11px]">Capacity</span>
                  <span className="text-[#FFF1F5] font-medium">
                    {activeCount} / {metadata.maxUsers} max
                  </span>
                </div>
              </div>

              {/* Ephemeral room notice */}
              <div className="p-3 rounded-xl bg-[#251019] border border-[#3B1A27] space-y-1.5">
                <div className="flex items-center gap-1.5 text-yellow-400 font-semibold text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Ephemeral Room</span>
                </div>
                <p className="text-[11px] text-[#C9A3B2] leading-relaxed">
                  Self-cleaning: this room automatically dissolves after 10 minutes of complete inactivity.
                </p>
              </div>

              {/* Members section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-[#8A6674] uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#FF5C9A]" />
                    <span>Active Now ({activeCount})</span>
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#251019]/60 border border-[#3B1A27]/60">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-[#FFF1F5] truncate">
                      {displayName} (You)
                    </span>
                  </div>
                  {activeCount > 1 && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#251019]/40 border border-[#3B1A27]/40 text-[#8A6674]">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs truncate">
                        +{activeCount - 1} other participant{activeCount > 2 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Invite ID section */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-[#8A6674] uppercase tracking-wider block">
                  Invite ID
                </span>
                <div className="p-2 rounded-lg bg-[#0E0609] border border-[#3B1A27] font-mono text-[11px] text-[#C9A3B2] break-all select-all flex items-center justify-between gap-1">
                  <span className="truncate">{roomId}</span>
                  <button
                    onClick={handleCopyInvite}
                    className="p-1 rounded text-[#FF5C9A] hover:bg-[#3B1A27]"
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
                  className="w-full py-2 px-3 rounded-xl bg-[#251019] hover:bg-red-950/40 border border-[#3B1A27] hover:border-red-500/40 text-red-400 hover:text-red-300 transition-all flex items-center justify-center gap-2 text-xs font-medium active:scale-95"
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
              className="relative w-full max-w-md bg-[#190B11] border border-[#FF5C9A]/30 rounded-2xl p-6 shadow-2xl shadow-[#9F1239]/30 z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[#3B1A27] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#9F1239] to-[#FF5C9A] flex items-center justify-center text-white shadow-md">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base text-[#FFF1F5]">Create New Room</h2>
                    <p className="text-[11px] text-[#8A6674]">Public or password-protected room</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-lg text-[#8A6674] hover:text-white hover:bg-[#251019] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                {/* Room Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#FFF1F5]">Room Name</label>
                  <input
                    type="text"
                    placeholder="e.g. AI Brainstorming, Dev Chat"
                    value={newRoomName}
                    onChange={e => setNewRoomName(e.target.value)}
                    required
                    className="w-full bg-[#251019] border border-[#3B1A27] rounded-xl px-3.5 py-2.5 text-xs text-[#FFF1F5] placeholder-[#8A6674] focus:outline-none focus:border-[#FF5C9A]/60 focus:ring-2 focus:ring-[#FACC15]/40"
                  />
                </div>

                {/* Privacy Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#251019] border border-[#3B1A27]">
                  <div className="flex items-center gap-2.5">
                    <Lock className={`w-4 h-4 ${newRoomIsPrivate ? 'text-[#FF5C9A]' : 'text-[#8A6674]'}`} />
                    <div>
                      <p className="text-xs font-semibold text-[#FFF1F5]">Private Room</p>
                      <p className="text-[10px] text-[#8A6674]">Require a password to join</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={newRoomIsPrivate}
                    onChange={e => setNewRoomIsPrivate(e.target.checked)}
                    className="w-4 h-4 accent-[#FF5C9A] cursor-pointer rounded"
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
                    <label className="text-xs font-semibold text-[#FFF1F5]">Room Password</label>
                    <input
                      type="password"
                      placeholder="Set a secret passcode..."
                      value={newRoomPassword}
                      onChange={e => setNewRoomPassword(e.target.value)}
                      required={newRoomIsPrivate}
                      className="w-full bg-[#251019] border border-[#3B1A27] rounded-xl px-3.5 py-2.5 text-xs text-[#FFF1F5] placeholder-[#8A6674] focus:outline-none focus:border-[#FF5C9A]/60 focus:ring-2 focus:ring-[#FACC15]/40"
                    />
                  </motion.div>
                )}

                {/* Max Users Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#FFF1F5]">Max Participants</label>
                  <select
                    value={newRoomMaxUsers}
                    onChange={e => setNewRoomMaxUsers(Number(e.target.value))}
                    className="w-full bg-[#251019] border border-[#3B1A27] rounded-xl px-3.5 py-2.5 text-xs text-[#FFF1F5] focus:outline-none focus:border-[#FF5C9A]/60 focus:ring-2 focus:ring-[#FACC15]/40 cursor-pointer"
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
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF5C9A] to-[#F43F5E] text-white text-xs font-semibold hover:opacity-95 transition-all active:scale-95 shadow-lg shadow-[#9F1239]/40 mt-2 disabled:opacity-50"
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
