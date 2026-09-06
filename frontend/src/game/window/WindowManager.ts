import { WindowLevel } from './WindowTypes';
import type { WindowEntry } from './WindowTypes';

export type EscapeFallback = () => boolean;

export class WindowManager {
  private windows: Map<string, WindowEntry> = new Map();
  private seq = 0;
  private fallbackHandler: EscapeFallback | null = null;
  private listeners: Set<() => void> = new Set();

  public register(entry: WindowEntry): void {
    const existing = this.windows.get(entry.id);
    const order = existing?.order ?? ++this.seq;
    const level = entry.level ?? existing?.level ?? WindowLevel.BASE;

    this.windows.set(entry.id, {
      ...existing,
      ...entry,
      level,
      order,
    });
    this.notify();
  }

  public update(id: string, partial: Partial<WindowEntry>): void {
    const existing = this.windows.get(id);
    if (!existing) return;
    this.windows.set(id, {
      ...existing,
      ...partial,
    });
    this.notify();
  }

  public unregister(id: string): void {
    if (this.windows.delete(id)) {
      this.notify();
    }
  }

  public getWindows(): WindowEntry[] {
    return Array.from(this.windows.values()).sort((a, b) => {
      const levelDiff = (b.level ?? WindowLevel.BASE) - (a.level ?? WindowLevel.BASE);
      if (levelDiff !== 0) return levelDiff;
      return (b.order ?? 0) - (a.order ?? 0);
    });
  }

  public getTopWindow(): WindowEntry | null {
    const sorted = this.getWindows();
    return sorted.length > 0 ? sorted[0] : null;
  }

  public hasActiveWindows(): boolean {
    return this.windows.size > 0;
  }

  public setFallbackHandler(handler: EscapeFallback | null): () => void {
    this.fallbackHandler = handler;
    return () => {
      if (this.fallbackHandler === handler) {
        this.fallbackHandler = null;
      }
    };
  }

  public handleEscape(): boolean {
    const top = this.getTopWindow();
    if (top) {
      if (top.closeOnEscape === false) {
        return true;
      }
      if (typeof top.onClose === 'function') {
        top.onClose();
        return true;
      }
    }

    if (this.fallbackHandler) {
      return this.fallbackHandler();
    }

    return false;
  }

  public clear(): void {
    this.windows.clear();
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        void err;
      }
    }
  }
}

export const windowManager = new WindowManager();
