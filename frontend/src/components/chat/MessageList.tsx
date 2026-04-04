import { useRef, useEffect } from 'react';
import type { MessageDTO } from '../../types';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: MessageDTO[];
  currentUserUuid: string | null;
}

export function MessageList({ messages, currentUserUuid }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-thin scrollbar-thumb-violet-800 scrollbar-track-transparent">
      {messages.map(msg => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isSelf={msg.senderUuid === currentUserUuid}
        />
      ))}
      <div ref={bottomRef} aria-hidden />
    </div>
  );
}
