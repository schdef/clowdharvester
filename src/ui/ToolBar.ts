import { AudioManager } from '../audio/AudioManager';
import { t, onLanguageChange } from '../i18n/i18n';

export type ToolType = 'scan' | 'drill' | 'pipe' | 'tank' | 'sell';

export interface ToolDefinition {
  id: ToolType;
  key: string;
  icon: string;
  nameKey: string;
  descKey: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    id: 'scan',
    key: '1',
    icon: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 3"/></svg>`,
    nameKey: 'tools.scan',
    descKey: 'tools.scanDesc',
  },
  {
    id: 'drill',
    key: '2',
    icon: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v14M8 12l4 4 4-4M12 22l-2-6h4l-2 6z"/></svg>`,
    nameKey: 'tools.drill',
    descKey: 'tools.drillDesc',
  },
  {
    id: 'pipe',
    key: '3',
    icon: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6a2 2 0 0 0 2-2V4M12 20v-4a2 2 0 0 1 2-2h6"/></svg>`,
    nameKey: 'tools.pipe',
    descKey: 'tools.pipeDesc',
  },
  {
    id: 'tank',
    key: '4',
    icon: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="10" rx="7" ry="8"/><path d="M12 18v4M9 22h6"/></svg>`,
    nameKey: 'tools.tank',
    descKey: 'tools.tankDesc',
  },
  {
    id: 'sell',
    key: '5',
    icon: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M14.8 9A2 2 0 0 0 13 8h-2a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-2a2 2 0 0 1-1.8-1M12 6v2m0 8v2"/></svg>`,
    nameKey: 'tools.sell',
    descKey: 'tools.sellDesc',
  },
];

export class ToolBar {
  private activeTool: ToolType = 'drill';
  private listeners: Set<(tool: ToolType) => void> = new Set();
  private containerElement: HTMLElement | null = null;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    onLanguageChange(() => this.render());
  }

  public mount(container: HTMLElement): void {
    this.containerElement = container;
    this.render();
  }

  public getActiveTool(): ToolType {
    return this.activeTool;
  }

  public selectTool(tool: ToolType): void {
    if (this.activeTool === tool) return;
    this.activeTool = tool;
    AudioManager.getInstance().playUiClick();
    this.render();
    this.listeners.forEach((fn) => fn(this.activeTool));
  }

  public onToolChange(callback: (tool: ToolType) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key;
    const match = TOOLS.find((t) => t.key === key);
    if (match) {
      this.selectTool(match.id);
    }
  }

  public render(): void {
    if (!this.containerElement) return;

    this.containerElement.innerHTML = `
      <div class="grid grid-cols-5 gap-2 w-full max-w-lg mx-auto p-1.5 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl">
        ${TOOLS.map((tool) => {
          const isActive = this.activeTool === tool.id;
          const activeClasses = isActive
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.25)] scale-[1.02]'
            : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-transparent';

          return `
            <button
              type="button"
              data-tool="${tool.id}"
              class="flex flex-col items-center justify-center min-h-[52px] py-1 px-1 rounded-xl border transition-all duration-150 select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400/50 ${activeClasses}"
              title="${t(tool.nameKey)}: ${t(tool.descKey)} [${tool.key}]"
              aria-label="${t(tool.nameKey)}"
            >
              <div class="relative">
                ${tool.icon}
                <span class="absolute -top-1.5 -right-2 text-[10px] font-mono px-1 rounded bg-slate-950/80 text-slate-400 border border-slate-800 leading-none">
                  ${tool.key}
                </span>
              </div>
              <span class="text-[11px] font-medium tracking-tight mt-0.5 truncate max-w-full">
                ${t(tool.nameKey)}
              </span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    // Attach click listeners to buttons
    const buttons = this.containerElement.querySelectorAll<HTMLButtonElement>('button[data-tool]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const toolId = btn.getAttribute('data-tool') as ToolType;
        if (toolId) this.selectTool(toolId);
      });
    });
  }
}
