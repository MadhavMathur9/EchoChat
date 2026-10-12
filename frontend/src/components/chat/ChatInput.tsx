import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react';
import { ArrowUp, Sparkles, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  members?: string[];
}

interface MentionItem {
  id: string;
  name: string;
  label: string;
  description: string;
  isAi: boolean;
}

export function ChatInput({ onSendMessage, disabled, members = [] }: ChatInputProps) {
  const [text, setText] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Available mentions: Gemini AI + room members
  const mentionOptions: MentionItem[] = [
    {
      id: 'gemini',
      name: 'gemini',
      label: '@gemini',
      description: 'Ask Google Gemini AI with live web/chat knowledge',
      isAi: true,
    },
    ...members
      .filter(m => m.toLowerCase() !== 'gemini' && m.trim().length > 0)
      .map(m => ({
        id: m,
        name: m,
        label: `@${m}`,
        description: 'Room participant',
        isAi: false,
      })),
  ];

  const filteredMentions = mentionOptions.filter(item =>
    item.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Check if cursor is right after an '@'
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const queryAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Valid mention query if no spaces
      if (!queryAfterAt.includes(' ')) {
        setMentionQuery(queryAfterAt);
        setShowMentionMenu(true);
        setSelectedIndex(0);
        return;
      }
    }
    setShowMentionMenu(false);
  };

  const insertMention = (item: MentionItem) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBeforeCursor = text.slice(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const prefix = text.slice(0, lastAtIndex);
      const suffix = text.slice(cursor);
      const inserted = `${prefix}@${item.name} `;
      setText(inserted + suffix);
      setShowMentionMenu(false);

      // Focus back to textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = inserted.length;
          textareaRef.current.selectionEnd = inserted.length;
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredMentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentions[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSendMessage(text.trim());
      setText('');
      setShowMentionMenu(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // Auto-resize textarea up to 5 lines (~120px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const hasGeminiMention = text.includes('@gemini');

  return (
    <div className="w-full relative">
      {/* Mention Autocomplete Dropdown Popup */}
      <AnimatePresence>
        {showMentionMenu && filteredMentions.length > 0 && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-0 w-72 max-w-full rounded-xl bg-[#190B11] border border-[#3B1A27] shadow-2xl shadow-black/60 overflow-hidden z-30"
          >
            <div className="p-2 border-b border-[#3B1A27] bg-[#251019]/60 text-[11px] font-semibold text-[#C9A3B2] uppercase tracking-wider flex items-center justify-between">
              <span>Mentions</span>
              <span className="text-[10px] text-[#8A6674] lowercase font-normal">tab or enter to pick</span>
            </div>
            <div className="max-h-48 overflow-y-auto p-1 scrollbar-thin">
              {filteredMentions.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => insertMention(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2.5 transition-colors ${
                      isSelected
                        ? item.isAi
                          ? 'bg-blue-900/30 text-blue-200'
                          : 'bg-[#9F1239]/30 text-pink-200'
                        : 'text-[#FFF1F5] hover:bg-[#251019]'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        item.isAi
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm'
                          : 'bg-[#9F1239] text-white text-xs'
                      }`}
                    >
                      {item.isAi ? <Sparkles className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold ${item.isAi ? 'text-yellow-400' : 'text-[#FFF1F5]'}`}>
                          {item.label}
                        </span>
                        {item.isAi && (
                          <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded font-mono">
                            AI
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8A6674] truncate leading-tight">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gemini Active Badge preview */}
      <AnimatePresence>
        {hasGeminiMention && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="mb-2 flex items-center gap-2"
          >
            <span className="inline-flex items-center gap-1.5 text-xs text-yellow-300 bg-yellow-400/10 border border-yellow-400/25 px-2.5 py-1 rounded-full font-medium shadow-sm">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              <span>AI Active</span>
              <span className="text-[10px] text-yellow-400/70">— Gemini will join this discussion</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input container */}
      <div className="flex items-end gap-2 bg-[#190B11] border border-[#3B1A27] rounded-2xl p-1.5 focus-within:border-[#FF5C9A]/50 focus-within:ring-2 focus-within:ring-[#FACC15]/40 transition-all shadow-inner">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Message, or type @gemini to ask AI..."
          disabled={disabled}
          aria-label="Message input"
          className="flex-1 bg-transparent border-none focus:outline-none px-3 py-2 text-sm text-[#FFF1F5] placeholder-[#8A6674] min-w-0 resize-none max-h-32 leading-relaxed"
        />

        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          aria-label="Send message"
          className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-white bg-gradient-to-r from-[#FF5C9A] to-[#F43F5E] hover:opacity-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0 shadow-md shadow-[#9F1239]/20"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
