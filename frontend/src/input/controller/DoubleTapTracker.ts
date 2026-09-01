export class DoubleTapTracker {
  private lastKey: string | null = null;
  private lastTime = 0;
  private thresholdMs: number;

  constructor(thresholdMs = 300) {
    this.thresholdMs = thresholdMs;
  }

  public isDoubleTap(key: string, now: number = Date.now()): boolean {
    const isDouble = this.lastKey === key && (now - this.lastTime) < this.thresholdMs;
    if (isDouble) {
      this.lastKey = null;
      this.lastTime = 0;
      return true;
    }
    this.lastKey = key;
    this.lastTime = now;
    return false;
  }

  public reset(): void {
    this.lastKey = null;
    this.lastTime = 0;
  }
}
