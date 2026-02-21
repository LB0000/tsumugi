import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * ダイアログ等のコンテナ内にフォーカスを閉じ込めるフック
 *
 * - マウント時: コンテナ内最初のフォーカス可能要素にフォーカス
 * - Tab/Shift+Tab: コンテナ内でフォーカスを循環
 * - Escape: onEscape コールバック（onOpenChange(false) 等）を呼び出す
 * - アンマウント時: 元のフォーカスに復帰
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  options: { enabled?: boolean; onEscape?: () => void } = {},
): void {
  const { enabled = true, onEscape } = options;
  const previouslyFocusedRef = useRef<Element | null>(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    // Save previously focused element
    previouslyFocusedRef.current = document.activeElement;

    // Focus first focusable element
    const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && onEscapeRef.current) {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);

      // Restore focus
      const prev = previouslyFocusedRef.current;
      if (prev instanceof HTMLElement) {
        prev.focus();
      }
    };
  }, [containerRef, enabled]);
}
