import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react';
import { ArrowUp, Sparkles, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  members?: string[];
  mentionToInsert?: string | null;
  onMentionInserted?: () => void;
}

interface MentionItem {
  id: string;
  name: string;
  label: string;
  description: string;
  isAi: boolean;
}

export function ChatInput({
  onSendMessage,
  disabled,
  members = [],
  mentionToInsert,
  onMentionInserted,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Insert mention triggered from external actions (like clicking participant in sidebar)
  useEffect(() => {
    if (mentionToInsert) {
      setText(prev => {
        const trimmed = prev.trim();
        const addition = `@${mentionToInsert} `;
        return trimmed ? `${trimmed} ${addition}` : addition;
      });
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = textareaRef.current.value.length;
          textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
      }, 0);
      onMentionInserted?.();
    }
  }, [mentionToInsert, onMentionInserted]);

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
            className="absolute bottom-full mb-2 left-0 w-72 max-w-full rounded-xl bg-surface border border-border shadow-2xl shadow-black/60 overflow-hidden z-30"
          >
            <div className="p-2 border-b border-border bg-elevated/60 text-[11px] font-semibold text-text-2 uppercase tracking-wider flex items-center justify-between">
              <span>Mentions</span>
              <span className="text-[10px] text-text-3 lowercase font-normal">tab or enter to pick</span>
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
                          ? 'bg-blue/20 text-blue'
                          : 'bg-elevated text-text'
                        : 'text-text hover:bg-elevated/70'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        item.isAi
                          ? 'bg-gradient-to-br from-[#6F9BE0] to-[#9DBDF0] text-white shadow-sm'
                          : 'bg-sage text-text text-xs'
                      }`}
                    >
                      {item.isAi ? <Sparkles className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold ${item.isAi ? 'text-blue' : 'text-text'}`}>
                          {item.label}
                        </span>
                        {item.isAi && (
                          <span className="text-[9px] bg-blue/15 text-blue px-1 py-0.2 rounded font-mono">
                            AI
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-3 truncate leading-tight">
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

      {/* Gemini Active Badge preview (@mention chip style) */}
      <AnimatePresence>
        {hasGeminiMention && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="mb-2 flex items-center gap-2"
          >
            <span className="inline-flex items-center gap-1.5 text-xs text-gold bg-[rgba(227,185,79,0.15)] border border-gold/30 px-2.5 py-1 rounded-full font-medium shadow-sm">
              <Sparkles className="w-3 h-3 text-gold" />
              <span>AI Active</span>
              <span className="text-[10px] text-gold/80">— Gemini will join this discussion</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input container */}
      <div className="flex items-end gap-2 bg-surface border border-border rounded-2xl p-1.5 focus-within:border-terracotta focus-within:ring-2 focus-within:ring-gold/40 transition-all shadow-inner">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Message, or type @gemini to ask AI..."
          disabled={disabled}
          aria-label="Message input"
          className="flex-1 bg-transparent border-none focus:outline-none px-3 py-2 text-sm text-text placeholder-text-3 min-w-0 resize-none max-h-32 leading-relaxed"
        />

        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          aria-label="Send message"
          className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-on-terracotta bg-terracotta hover:bg-[#E28B65] active:bg-[#C56842] disabled:bg-elevated disabled:text-text-3 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0 shadow-md shadow-black/20"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
