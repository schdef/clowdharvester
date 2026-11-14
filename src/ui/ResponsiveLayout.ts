/**
 * Cloud Harvesters - Responsive Layout Controller
 * Manages device orientation, desktop widescreen detection (>= 1024px),
 * and dynamic canvas container scaling.
 */

export type LayoutMode = 'desktop' | 'mobile';

export class ResponsiveLayout {
  private static instance: ResponsiveLayout;
  private currentMode: LayoutMode = 'mobile';
  private listeners: Set<(mode: LayoutMode) => void> = new Set();
  private resizeDebounceTimer: number | null = null;

  private constructor() {
    this.currentMode = this.calculateMode();
    window.addEventListener('resize', this.handleResize.bind(this));
    window.addEventListener('orientationchange', this.handleResize.bind(this));
  }

  public static getInstance(): ResponsiveLayout {
    if (!ResponsiveLayout.instance) {
      ResponsiveLayout.instance = new ResponsiveLayout();
    }
    return ResponsiveLayout.instance;
  }

  private calculateMode(): LayoutMode {
    return window.innerWidth >= 1024 ? 'desktop' : 'mobile';
  }

  private handleResize(): void {
    if (this.resizeDebounceTimer !== null) {
      window.clearTimeout(this.resizeDebounceTimer);
    }

    this.resizeDebounceTimer = window.setTimeout(() => {
      const newMode = this.calculateMode();
      if (newMode !== this.currentMode) {
        this.currentMode = newMode;
        this.notifyListeners();
      }
    }, 100);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.currentMode));
  }

  public getMode(): LayoutMode {
    return this.currentMode;
  }

  public isDesktop(): boolean {
    return this.currentMode === 'desktop';
  }

  public isMobile(): boolean {
    return this.currentMode === 'mobile';
  }

  public onLayoutChange(callback: (mode: LayoutMode) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}
