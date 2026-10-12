import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Check, Copy, Sparkles } from 'lucide-react';
import type { MessageDTO } from '../../types';
import { Avatar } from './Avatar';

interface MessageBubbleProps {
  message: MessageDTO;
  isSelf: boolean;
  showAvatarAndName?: boolean;
}

function CodeSnippet({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-xl border border-blue-500/25 bg-[#070B14] overflow-hidden text-xs font-mono shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0B111E] border-b border-blue-500/20 text-[#8A9DBE]">
        <span className="font-semibold uppercase tracking-wider text-[10px]">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-blue-500/10 hover:text-blue-200 transition-colors active:scale-95 text-[11px]"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-blue-100/90 leading-relaxed font-mono text-[12px] scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Deterministic sender name hue from warm/pink/burgundy palette
const senderColors = [
  'text-[#FF5C9A]',
  'text-[#F43F5E]',
  'text-[#FB7185]',
  'text-[#FDA4AF]',
  'text-[#F472B6]',
  'text-[#E879F9]',
];

function getSenderColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return senderColors[Math.abs(hash) % senderColors.length];
}

export const MessageBubble = memo(({ message, isSelf, showAvatarAndName = true }: MessageBubbleProps) => {
  const isGemini = message.senderType === 'GEMINI';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`flex gap-2.5 items-end ${isSelf ? 'flex-row-reverse justify-start' : 'flex-row justify-start'}`}
    >
      {/* Avatar or spacer for grouping */}
      {!isSelf && (
        <div className="w-8 shrink-0 flex justify-center mb-0.5">
          {showAvatarAndName ? (
            <Avatar senderType={message.senderType} name={message.senderName} />
          ) : (
            <div className="w-8" aria-hidden="true" />
          )}
        </div>
      )}

      {/* Bubble container */}
      <div
        className={`max-w-[75%] sm:max-w-[65%] px-3.5 py-2.5 text-sm transition-all ${
          isGemini
            ? 'bg-[#0F1424] border border-blue-500/35 text-[#E2E8F0] shadow-[0_0_24px_rgba(79,142,247,0.12)] rounded-2xl rounded-tl-sm'
            : isSelf
            ? 'bg-gradient-to-r from-[#9F1239] to-[#BE185D] text-white rounded-2xl rounded-tr-sm shadow-md'
            : 'bg-[#251019] border border-[#3B1A27] text-[#FFF1F5] rounded-2xl rounded-tl-sm shadow-sm'
        }`}
      >
        {/* Sender Name */}
        {!isSelf && showAvatarAndName && (
          <div className="flex items-center gap-1.5 mb-1.5">
            {isGemini ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-[#7FB0FF] tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                Gemini
              </span>
            ) : (
              <span className={`text-[12px] font-semibold tracking-wide ${getSenderColor(message.senderName)}`}>
                {message.senderName}
              </span>
            )}
          </div>
        )}

        {/* Message Content */}
        <div className="break-words leading-relaxed">
          {isGemini ? (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:text-white prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match && !String(children).includes('\n');
                    if (isInline) {
                      return (
                        <code
                          className="bg-[#162038] text-blue-200 px-1.5 py-0.5 rounded text-xs font-mono border border-blue-500/30"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    const codeString = String(children).replace(/\n$/, '');
                    return <CodeSnippet language={match ? match[1] : ''} code={codeString} />;
                  },
                  a({ href, children }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7FB0FF] hover:text-blue-300 underline underline-offset-2"
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`text-[10px] mt-1.5 font-medium select-none ${
            isSelf
              ? 'text-white/70 text-right'
              : isGemini
              ? 'text-[#8A9DBE] text-left'
              : 'text-[#8A6674] text-left'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
});
