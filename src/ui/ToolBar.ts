import { AudioManager } from '../audio/AudioManager';
import { t, onLanguageChange } from '../i18n/i18n';
import { DrillHeadType } from '../core/ProbePhysics';

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

export interface DrillHeadOption {
  id: DrillHeadType;
  keyNum: string;
  nameKey: string;
  symbol: string;
  zoneKey: string;
  colorClass: string;
  borderClass: string;
}

export const DRILL_HEADS: DrillHeadOption[] = [
  {
    id: 'ice',
    keyNum: '1',
    nameKey: 'drillHeads.ice',
    symbol: '❄',
    zoneKey: 'zones.highShort',
    colorClass: 'text-cyan-300',
    borderClass: 'border-cyan-500/60 bg-cyan-950/60',
  },
  {
    id: 'fog',
    keyNum: '2',
    nameKey: 'drillHeads.fog',
    symbol: '💧',
    zoneKey: 'zones.midShort',
    colorClass: 'text-blue-300',
    borderClass: 'border-blue-500/60 bg-blue-950/60',
  },
  {
    id: 'charge',
    keyNum: '3',
    nameKey: 'drillHeads.charge',
    symbol: '⚡',
    zoneKey: 'zones.lowShort',
    colorClass: 'text-amber-300',
    borderClass: 'border-amber-500/60 bg-amber-950/60',
  },
];

export class ToolBar {
  private activeTool: ToolType = 'drill';
  private activeDrillHead: DrillHeadType = 'fog';
  private toolListeners: Set<(tool: ToolType) => void> = new Set();
  private headListeners: Set<(head: DrillHeadType) => void> = new Set();
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

  public getActiveDrillHead(): DrillHeadType {
    return this.activeDrillHead;
  }

  public selectTool(tool: ToolType): void {
    if (this.activeTool === tool && tool === 'drill') {
      // Clicking Slot 2 while drill is already active cycles drill heads
      this.cycleDrillHead();
      return;
    }

    this.activeTool = tool;
    AudioManager.getInstance().playUiClick();
    this.render();
    this.toolListeners.forEach((fn) => fn(this.activeTool));
  }

  public selectDrillHead(head: DrillHeadType): void {
    if (this.activeDrillHead === head && this.activeTool === 'drill') return;
    this.activeDrillHead = head;
    this.activeTool = 'drill';
    AudioManager.getInstance().playUiClick();
    this.render();
    this.headListeners.forEach((fn) => fn(this.activeDrillHead));
    this.toolListeners.forEach((fn) => fn(this.activeTool));
  }

  public cycleDrillHead(): void {
    const sequence: DrillHeadType[] = ['fog', 'ice', 'charge'];
    const nextIdx = (sequence.indexOf(this.activeDrillHead) + 1) % sequence.length;
    this.selectDrillHead(sequence[nextIdx]);
  }

  public onToolChange(callback: (tool: ToolType) => void): () => void {
    this.toolListeners.add(callback);
    return () => {
      this.toolListeners.delete(callback);
    };
  }

  public onDrillHeadChange(callback: (head: DrillHeadType) => void): () => void {
    this.headListeners.add(callback);
    return () => {
      this.headListeners.delete(callback);
    };
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key;

    // Keys 1, 2, 3 switch drill heads when drill tool is selected
    if (this.activeTool === 'drill') {
      if (key === '1') {
        this.selectDrillHead('ice');
        return;
      }
      if (key === '2') {
        this.selectDrillHead('fog');
        return;
      }
      if (key === '3') {
        this.selectDrillHead('charge');
        return;
      }
    }

    // Direct shortcuts Q, W, E for drill heads at any time
    if (key.toLowerCase() === 'q') {
      this.selectDrillHead('ice');
      return;
    }
    if (key.toLowerCase() === 'w') {
      this.selectDrillHead('fog');
      return;
    }
    if (key.toLowerCase() === 'e') {
      this.selectDrillHead('charge');
      return;
    }

    // Standard 1-5 toolbar slot selection
    const match = TOOLS.find((t) => t.key === key);
    if (match) {
      this.selectTool(match.id);
    }
  }

  public render(): void {
    if (!this.containerElement) return;

    const currentHead = DRILL_HEADS.find((h) => h.id === this.activeDrillHead) ?? DRILL_HEADS[1];

    this.containerElement.innerHTML = `
      <div class="flex flex-col space-y-2 w-full max-w-lg mx-auto select-none">
        <!-- Sub-Selector Bar for Drill Heads (Slot 2 options: Eisbohrer, Nebelfänger, Ladungsspitze) -->
        <div class="flex items-center justify-between gap-1.5 px-2 py-1 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-800 text-xs ${this.activeTool === 'drill' ? 'opacity-100' : 'opacity-70'}">
          <span class="text-[10px] uppercase font-mono tracking-wider text-slate-400 pl-1">
            ${t('tools.head')}
          </span>
          <div class="flex items-center gap-1 flex-1 justify-end">
            ${DRILL_HEADS.map((head) => {
              const isSelected = this.activeDrillHead === head.id;
              const pillClasses = isSelected
                ? `${head.borderClass} ${head.colorClass} shadow-[0_0_8px_rgba(56,178,172,0.3)] font-semibold`
                : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70';

              return `
                <button
                  type="button"
                  data-head="${head.id}"
                  class="flex items-center space-x-1 px-2 py-1 rounded-lg border text-[11px] transition-all cursor-pointer focus:outline-none ${pillClasses}"
                  title="${t(head.nameKey)} (${t(head.zoneKey)}) [${t('tools.key')} ${head.keyNum}]"
                >
                  <span>${head.symbol}</span>
                  <span class="truncate">${t(head.nameKey)}</span>
                  <span class="text-[9px] font-mono opacity-60 ml-0.5">${head.keyNum}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Main 5-Slot Toolbar -->
        <div class="grid grid-cols-5 gap-2 w-full p-1.5 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl">
          ${TOOLS.map((tool) => {
            const isActive = this.activeTool === tool.id;
            let activeClasses = isActive
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.25)] scale-[1.02]'
              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-transparent';

            // Show current drill head symbol on slot 2
            const label = tool.id === 'drill' 
              ? `${currentHead.symbol} ${t(tool.nameKey)}`
              : t(tool.nameKey);

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
                  ${label}
                </span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Attach click listeners to main tool buttons
    const toolButtons = this.containerElement.querySelectorAll<HTMLButtonElement>('button[data-tool]');
    toolButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const toolId = btn.getAttribute('data-tool') as ToolType;
        if (toolId) this.selectTool(toolId);
      });
    });

    // Attach click listeners to drill head sub-selector buttons
    const headButtons = this.containerElement.querySelectorAll<HTMLButtonElement>('button[data-head]');
    headButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const headId = btn.getAttribute('data-head') as DrillHeadType;
        if (headId) this.selectDrillHead(headId);
      });
    });
  }
}
