import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

function createContainer(innerHTML: string): HTMLDivElement {
  const div = document.createElement('div');
  div.innerHTML = innerHTML;
  document.body.appendChild(div);
  return div;
}

describe('useFocusTrap', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses the first focusable element on mount', () => {
    container = createContainer('<button id="btn1">First</button><button id="btn2">Second</button>');

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref);
    });

    expect(document.activeElement).toBe(container.querySelector('#btn1'));
  });

  it('does nothing when enabled is false', () => {
    container = createContainer('<button id="btn1">First</button>');
    const externalButton = document.createElement('button');
    externalButton.id = 'external';
    document.body.appendChild(externalButton);
    externalButton.focus();

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref, { enabled: false });
    });

    expect(document.activeElement).toBe(externalButton);
  });

  it('calls onEscape when Escape key is pressed', () => {
    container = createContainer('<button id="btn1">First</button>');
    const onEscape = vi.fn();

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref, { onEscape });
    });

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    container.dispatchEvent(event);

    expect(onEscape).toHaveBeenCalledOnce();
  });

  it('wraps focus from last to first on Tab', () => {
    container = createContainer('<button id="btn1">First</button><button id="btn2">Second</button>');

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref);
    });

    // Focus the last element
    const btn2 = container.querySelector<HTMLElement>('#btn2')!;
    btn2.focus();
    expect(document.activeElement).toBe(btn2);

    // Simulate Tab on last element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    Object.defineProperty(tabEvent, 'shiftKey', { value: false });
    // We need to spy on preventDefault
    const preventSpy = vi.spyOn(tabEvent, 'preventDefault');
    container.dispatchEvent(tabEvent);

    expect(preventSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(container.querySelector('#btn1'));
  });

  it('wraps focus from first to last on Shift+Tab', () => {
    container = createContainer('<button id="btn1">First</button><button id="btn2">Second</button>');

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref);
    });

    // btn1 is already focused
    expect(document.activeElement).toBe(container.querySelector('#btn1'));

    // Simulate Shift+Tab on first element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
    const preventSpy = vi.spyOn(tabEvent, 'preventDefault');
    container.dispatchEvent(tabEvent);

    expect(preventSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(container.querySelector('#btn2'));
  });

  it('restores focus to previously focused element on unmount', () => {
    const externalButton = document.createElement('button');
    externalButton.id = 'external';
    document.body.appendChild(externalButton);
    externalButton.focus();

    container = createContainer('<button id="btn1">First</button>');

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref);
    });

    expect(document.activeElement).toBe(container.querySelector('#btn1'));

    unmount();

    expect(document.activeElement).toBe(externalButton);
  });

  it('skips disabled elements', () => {
    container = createContainer('<button id="btn1" disabled>Disabled</button><button id="btn2">Enabled</button>');

    renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useFocusTrap(ref);
    });

    expect(document.activeElement).toBe(container.querySelector('#btn2'));
  });
});
