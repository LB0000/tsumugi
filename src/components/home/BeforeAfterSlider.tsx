import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  initialPosition?: number;
  className?: string;
}

function BeforeAfterSliderBase({
  beforeImage,
  afterImage,
  beforeLabel = 'Before',
  afterLabel = 'After',
  initialPosition = 50,
  className = ''
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(percentage);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  }, [isDragging, updatePosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    updatePosition(e.touches[0].clientX);
  }, [updatePosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    updatePosition(e.touches[0].clientX);
  }, [isDragging, updatePosition]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 5;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPosition(prev => Math.max(0, prev - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPosition(prev => Math.min(100, prev + step));
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl select-none cursor-ew-resize group ${className}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="slider"
      aria-label="Before/After比較スライダー"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* After Image (Background) */}
      <img
        src={afterImage}
        alt={afterLabel}
        className="w-full h-full object-cover"
        draggable={false}
      />

      {/* Before Image (Clipped) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 -translate-x-1/2 pointer-events-none"
        style={{ left: `${position}%` }}
      >
        {/* Vertical Line */}
        <div className="absolute inset-0 bg-white shadow-lg" />

        {/* Handle Circle */}
        <div className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-12 h-12 rounded-full
          bg-gradient-to-br from-secondary to-secondary/80
          border-4 border-white
          shadow-xl
          flex items-center justify-center
          transition-transform duration-200
          ${isDragging ? 'scale-110' : 'group-hover:scale-105'}
        `}>
          <ChevronLeft className="w-4 h-4 text-white -mr-1" />
          <ChevronRight className="w-4 h-4 text-white -ml-1" />
        </div>
      </div>

      {/* Before Label */}
      <div className={`
        absolute top-4 left-4 px-3 py-1.5
        bg-foreground/80 backdrop-blur-sm
        text-white text-xs font-medium
        rounded-full
        transition-opacity duration-300
        ${position < 15 ? 'opacity-0' : 'opacity-100'}
      `}>
        {beforeLabel}
      </div>

      {/* After Label */}
      <div className={`
        absolute top-4 right-4 px-3 py-1.5
        bg-secondary/90 backdrop-blur-sm
        text-white text-xs font-medium
        rounded-full
        transition-opacity duration-300
        ${position > 85 ? 'opacity-0' : 'opacity-100'}
      `}>
        {afterLabel}
      </div>

      {/* Corner Accents */}
      <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-white/50 rounded-tl-lg pointer-events-none" />
      <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-white/50 rounded-tr-lg pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-white/50 rounded-bl-lg pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-white/50 rounded-br-lg pointer-events-none" />
    </div>
  );
}

export const BeforeAfterSlider = memo(BeforeAfterSliderBase);
