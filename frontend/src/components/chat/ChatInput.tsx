import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';
interface ChatInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [text, setText] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  const isAskingGemini = text.trim().startsWith('@gemini');

  return (
    <div className="w-full">
      {isAskingGemini && (
        <div className="text-xs text-accent mb-2 flex items-center gap-1 font-semibold">
          AI Augmentation Active...
        </div>
      )}
      <div className="flex items-center gap-2 bg-bg-base border border-border-subtle rounded-full p-1.5 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all shadow-sm">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message (use @gemini to ask AI)..."
          className="flex-1 bg-transparent border-none focus:outline-none px-4 text-sm min-w-0"
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="bg-accent hover:bg-accent/90 text-bg-base w-9 h-9 rounded-full flex items-center justify-center font-semibold disabled:opacity-50 transition-all active:scale-[0.98] shrink-0"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
