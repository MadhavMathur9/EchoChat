

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none bg-bg-base"
         style={{
           backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)',
           backgroundSize: '40px 40px'
         }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-transparent to-bg-base" />
    </div>
  );
}
