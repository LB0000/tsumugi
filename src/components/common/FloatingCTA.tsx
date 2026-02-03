import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { StyledButton } from './StyledButton';

interface FloatingCTAProps {
  targetId?: string;
  showAfterScroll?: number;
}

export function FloatingCTA({
  targetId = 'upload-section',
  showAfterScroll = 400,
}: FloatingCTAProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (isDismissed) return;

      const scrollY = window.scrollY;
      setIsVisible(scrollY > showAfterScroll);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showAfterScroll, isDismissed]);

  const handleClick = () => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="relative flex items-center gap-2 p-1 bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-lg">
        <button onClick={handleClick} className="flex-1">
          <StyledButton size="md" className="rounded-full">
            <Sparkles className="w-4 h-4" />
            今すぐ作品を作る
          </StyledButton>
        </button>
        <button
          onClick={handleDismiss}
          className="p-2 text-muted hover:text-foreground transition-colors"
          aria-label="閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
