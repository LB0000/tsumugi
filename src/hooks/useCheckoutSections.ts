import { useState, useEffect } from 'react';

export type CheckoutSection = 'gift' | 'shipping' | 'payment';

/**
 * チェックアウトページのセクション追跡を提供するカスタムフック
 *
 * IntersectionObserver を使用して、現在表示されているセクションを検出します。
 */
export function useCheckoutSections() {
  const [activeSection, setActiveSection] = useState<CheckoutSection>('gift');

  useEffect(() => {
    const sectionIds: CheckoutSection[] = ['gift', 'shipping', 'payment'];
    const observers: IntersectionObserver[] = [];

    for (const id of sectionIds) {
      const element = document.getElementById(id);
      if (!element) continue;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { rootMargin: '-20% 0px -60% 0px' },
      );

      observer.observe(element);
      observers.push(observer);
    }

    return () => {
      for (const observer of observers) {
        observer.disconnect();
      }
    };
  }, []);

  return { activeSection };
}
