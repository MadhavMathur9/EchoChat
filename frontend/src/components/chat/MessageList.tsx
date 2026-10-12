import { useRef, useEffect, useState, type UIEvent } from 'react';
import { ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MessageDTO } from '../../types';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: MessageDTO[];
  currentUserUuid: string | null;
}

function formatDateSeparator(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function isSameCalendarDay(d1: string, d2: string): boolean {
  return new Date(d1).toDateString() === new Date(d2).toDateString();
}

export function MessageList({ messages, currentUserUuid }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessagesCount = useRef(messages.length);

  // Detect user scroll position
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const scrolledUp = distanceToBottom > 120;
    setIsScrolledUp(scrolledUp);

    if (!scrolledUp) {
      setUnreadCount(0);
    }
  };

  // Handle new incoming messages
  useEffect(() => {
    const newCount = messages.length - prevMessagesCount.current;
    if (newCount > 0) {
      if (isScrolledUp) {
        setUnreadCount(prev => prev + newCount);
      } else {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Initial load or history replacement
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
    prevMessagesCount.current = messages.length;
  }, [messages.length, isScrolledUp]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsScrolledUp(false);
    setUnreadCount(0);
  };

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        aria-live="polite"
        className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent select-text"
      >
        <div className="flex flex-col">
          {messages.map((msg, index) => {
            const prevMsg = index > 0 ? messages[index - 1] : null;

            // Check if day changed
            const showDateSeparator = !prevMsg || !isSameCalendarDay(prevMsg.timestamp, msg.timestamp);

            // Grouping: same sender and within 5 minutes
            const isSameSender = prevMsg && prevMsg.senderUuid === msg.senderUuid && prevMsg.senderType === msg.senderType;
            const isWithinFiveMinutes = prevMsg && Math.abs(new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()) <= 5 * 60 * 1000;
            const isContinuation = isSameSender && isWithinFiveMinutes && !showDateSeparator;

            const isSelf = msg.senderUuid === currentUserUuid;

            return (
              <div key={msg.id || `${msg.timestamp}-${index}`}>
                {/* Date separator */}
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-4">
                    <div className="px-3 py-1 rounded-full bg-elevated border border-border text-[11px] font-medium text-text-2 shadow-sm tracking-wide">
                      {formatDateSeparator(msg.timestamp)}
                    </div>
                  </div>
                )}

                {/* Message Bubble with dynamic grouping spacing */}
                <div className={isContinuation ? 'mt-1' : index === 0 ? '' : 'mt-3.5'}>
                  <MessageBubble
                    message={msg}
                    isSelf={isSelf}
                    showAvatarAndName={!isContinuation}
                  />
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} aria-hidden="true" />
        </div>
      </div>

      {/* Floating Scroll to Bottom Button */}
      <AnimatePresence>
        {isScrolledUp && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-4 right-6 z-20"
          >
            <button
              onClick={scrollToBottom}
              aria-label="Scroll to bottom"
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-full bg-elevated text-text border border-border shadow-lg shadow-black/40 hover:bg-surface transition-all active:scale-95 text-xs font-medium"
            >
              <ArrowDown className="w-3.5 h-3.5 text-terracotta" />
              <span>Latest</span>
              {unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-burgundy text-text text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
