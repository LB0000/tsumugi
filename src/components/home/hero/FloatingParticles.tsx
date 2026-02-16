export function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-secondary/40 rounded-full hero-animate-float-particle"
          style={{
            left: `${10 + (i * 7)}%`,
            top: `${15 + (i % 4) * 20}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${4 + (i % 3)}s`,
          }}
        />
      ))}
    </div>
  );
}
