import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { trackEvent } from '../../lib/analytics';

interface ShareButtonsProps {
  url: string;
  title: string;
  imageUrl?: string;
  className?: string;
  incentiveText?: string;
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.48 2 2 5.82 2 10.5c0 4.21 3.74 7.74 8.79 8.4.34.07.81.22.93.52.1.27.07.68.03.95l-.15.91c-.05.27-.21 1.07.94.58 1.14-.49 6.17-3.63 8.42-6.22C22.85 13.55 22 12.11 22 10.5 22 5.82 17.52 2 12 2zm-3.09 11.15H7.07a.48.48 0 01-.48-.48V8.64c0-.27.22-.48.48-.48s.48.22.48.48v3.55h1.36c.27 0 .48.22.48.48s-.21.48-.48.48zm1.67-.48a.48.48 0 01-.96 0V8.64a.48.48 0 01.96 0v4.03zm4.2 0c0 .2-.12.37-.3.44a.47.47 0 01-.52-.1l-1.83-2.5v2.16a.48.48 0 01-.96 0V8.64c0-.2.12-.37.3-.44a.47.47 0 01.52.1l1.83 2.5V8.64a.48.48 0 01.96 0v4.03zm3.15-2.72a.48.48 0 010 .96h-1.36v.8h1.36a.48.48 0 010 .96h-1.84a.48.48 0 01-.48-.48V8.64c0-.27.22-.48.48-.48h1.84a.48.48 0 010 .96h-1.36v.83h1.36z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function appendUtm(baseUrl: string, medium: string): string {
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}utm_source=${encodeURIComponent(medium)}&utm_medium=social&utm_campaign=share`;
}

export function ShareButtons({ url, title, incentiveText, className = '' }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = (platform: string) => {
    trackEvent('share', { platform, url });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(appendUtm(url, 'copy_link'));
      setCopied(true);
      trackEvent('share', { platform: 'copy_link', url });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  };

  const shareTargets = [
    {
      name: 'LINE',
      href: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(appendUtm(url, 'line'))}`,
      color: '#06C755',
      icon: LineIcon,
    },
    {
      name: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(appendUtm(url, 'twitter'))}`,
      color: '#000000',
      icon: XIcon,
    },
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appendUtm(url, 'facebook'))}`,
      color: '#1877F2',
      icon: FacebookIcon,
    },
  ];

  return (
    <div className={className}>
      {incentiveText && (
        <p className="text-sm text-primary font-medium mb-3 text-center">{incentiveText}</p>
      )}
      <div className="flex items-center gap-3 justify-center">
      {shareTargets.map((target) => (
        <a
          key={target.name}
          href={target.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleShare(target.name.toLowerCase())}
          aria-label={`${target.name}でシェア`}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white transition-transform duration-200 hover:scale-110"
          style={{ backgroundColor: target.color }}
        >
          <target.icon className="w-5 h-5" />
        </a>
      ))}
      <button
        onClick={handleCopy}
        aria-label="リンクをコピー"
        className="w-11 h-11 rounded-full flex items-center justify-center border border-border bg-card text-foreground transition-transform duration-200 hover:scale-110"
      >
        {copied ? <Check className="w-5 h-5 text-accent-sage" /> : <Copy className="w-5 h-5" />}
      </button>
      {copied && (
        <span className="text-xs text-accent-sage font-medium animate-fade-in">
          コピーしました!
        </span>
      )}
      </div>
    </div>
  );
}
