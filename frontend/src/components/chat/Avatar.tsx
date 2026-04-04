

export function Avatar({ senderType, name }: { senderType: 'USER' | 'GEMINI', name: string }) {
  if (senderType === 'GEMINI') {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-tr from-cyan-600 to-blue-500 text-white font-bold shrink-0">
        ✨
      </div>
    );
  }
  
  // Just use first letter
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-accent text-white font-bold shrink-0">
      {initial}
    </div>
  );
}
