interface Cancelable {
  cancel: () => void;
}

export function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) & Cancelable {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = null;
  };

  return debounced;
}

export function throttle<T extends (...args: Parameters<T>) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastRun >= limit) {
      lastRun = now;
      func(...args);
    }
  };
}
