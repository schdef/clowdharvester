import { AudioManager } from '../audio/AudioManager';
import { GameState } from '../core/GameState';
import { t, onLanguageChange } from '../i18n/i18n';

export class SummaryModal {
  private static instance: SummaryModal;
  private containerElement: HTMLElement | null = null;
  private isVisible = false;
  private onNextSeasonCallback: (() => void) | null = null;

  private constructor() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    onLanguageChange(() => {
      if (this.isVisible) this.render();
    });
  }

  public static getInstance(): SummaryModal {
    if (!SummaryModal.instance) {
      SummaryModal.instance = new SummaryModal();
    }
    return SummaryModal.instance;
  }

  public mount(container: HTMLElement): void {
    this.containerElement = container;
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  public open(onNextSeason?: () => void): void {
    this.isVisible = true;
    this.onNextSeasonCallback = onNextSeason ?? null;
    AudioManager.getInstance().playShareWon();
    this.render();
  }

  public close(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    AudioManager.getInstance().playUiClick();
    if (this.containerElement) {
      this.containerElement.innerHTML = '';
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isVisible) {
      // Keep modal open until user explicitly clicks Next Season
    }
  }

  private render(): void {
    if (!this.containerElement || !this.isVisible) return;

    const gs = GameState.getInstance();
    const data = gs.getData();
    const ce = gs.getCouncilEngine();
    const rankings = ce.calculateRankings(data.region);

    const playerEntry = rankings.find((r) => r.participantId === 'player') ?? {
      rank: 4,
      totalShares: 0,
      credits: data.credits,
      stars: 0,
    };

    const earnedStars = playerEntry.stars;
    const isQualified = earnedStars >= 1;

    // Record stars in GameState if not recorded yet
    gs.recordSeasonStars(earnedStars);

    const nextRegion = GameState.getRegionForSeason(data.season + 1);

    this.containerElement.innerHTML = `
      <div id="summary-modal-backdrop" class="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in font-mono pointer-events-auto">
        <div id="summary-modal-card" class="w-full max-w-xl max-h-[88vh] overflow-y-auto flex flex-col bg-slate-900 border border-amber-500/80 rounded-xl shadow-2xl">
          
          <!-- Header Banner -->
          <div class="px-5 py-4 bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border-b border-amber-600/60 text-center">
            <div class="text-3xl mb-1">${earnedStars === 3 ? '🏆' : earnedStars >= 1 ? '✨' : '🎗️'}</div>
            <h2 class="text-base sm:text-lg font-bold text-amber-300 tracking-wide">${t('summary.title')}</h2>
            <p class="text-xs text-slate-300 mt-0.5">
              ${t('header.season')} ${data.season} (${t(`regions.${data.region}`)}) • ${t('summary.subtitle')}
            </p>
          </div>

          <!-- Body Scrollable -->
          <div class="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            
            <!-- Outcome Card -->
            <div class="p-3.5 rounded-lg border ${earnedStars === 3 ? 'bg-amber-950/40 border-amber-600/80 text-amber-200' : earnedStars >= 1 ? 'bg-indigo-950/40 border-indigo-600/80 text-indigo-200' : 'bg-slate-800/60 border-slate-700 text-slate-300'}">
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-bold text-sm text-slate-100">
                  ${t(`summary.rank${playerEntry.rank}Title`)}
                </span>
                <span class="text-base text-amber-400 font-bold tracking-widest">
                  ${earnedStars > 0 ? '⭐'.repeat(earnedStars) : '0 ★'}
                </span>
              </div>
              <p class="text-[11px] leading-relaxed text-slate-300">
                ${t(`summary.rank${playerEntry.rank}Desc`)}
              </p>
            </div>

            <!-- Rankings Table -->
            <div class="bg-slate-800/80 border border-slate-700 rounded-lg p-3 space-y-2">
              <div class="flex items-center justify-between pb-1.5 border-b border-slate-700">
                <span class="font-bold text-slate-200 uppercase tracking-wider text-[11px]">${t('summary.rankHeader')} & ${t('summary.participantHeader')}</span>
                <span class="text-[10px] text-amber-400 font-medium">${t('summary.tieBreakerNotice')}</span>
              </div>

              <div class="space-y-1.5">
                ${rankings.map((r) => {
                  const isPlayer = r.participantId === 'player';
                  const rowBg = isPlayer
                    ? 'bg-indigo-950/80 border-indigo-600 text-indigo-100 font-bold'
                    : 'bg-slate-900/70 border-slate-800 text-slate-300';
                  
                  const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : '🎗️';
                  const starStr = r.stars > 0 ? '⭐'.repeat(r.stars) : '—';
                  const auroraBadge = r.auroraShares > 0 ? `<span class="text-pink-400 text-[10px] ml-1">✨+${r.auroraShares}</span>` : '';

                  return `
                    <div class="flex items-center justify-between p-2 rounded border ${rowBg}">
                      <div class="flex items-center space-x-2">
                        <span class="w-6 text-center text-sm">${medal}</span>
                        <span>${this.getRivalAvatar(r.participantId)}</span>
                        <span>${r.name}</span>
                        ${auroraBadge}
                      </div>
                      <div class="flex items-center space-x-3 text-right">
                        <div>
                          <span class="text-amber-300 font-bold text-xs">${r.totalShares}</span>
                          <span class="text-slate-400 text-[10px]"> ${t('summary.sharesHeader')}</span>
                        </div>
                        <div class="text-emerald-400 font-mono text-[11px] w-16 text-right">${r.credits} CR</div>
                        <div class="text-[11px] w-14 text-center text-amber-300">${starStr}</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Campaign Progress & Next Region Info -->
            <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700 space-y-1.5">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-slate-300">
                  ${isQualified ? '🚀 ' + t('summary.regionUnlocked') : '🔄 ' + t('summary.retrySeasonBtn')}
                </span>
                <span class="text-amber-300 font-bold">
                  ${t(`regions.${nextRegion}`)}
                </span>
              </div>
              <p class="text-[11px] text-slate-400">
                ${t('summary.noGameOver')}
              </p>
            </div>

          </div>

          <!-- Footer Action -->
          <div class="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
            <button 
              id="btn-start-next-season" 
              class="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg transition"
            >
              🚀 ${isQualified ? t('summary.nextSeasonBtn') : t('summary.retrySeasonBtn')}
            </button>
          </div>

        </div>
      </div>
    `;

    const backdrop = document.getElementById('summary-modal-backdrop');
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    document.getElementById('btn-start-next-season')?.addEventListener('click', () => {
      this.close();
      if (isQualified) {
        gs.startNextSeason(1000);
      } else {
        gs.resetSeason(1000);
      }
      if (this.onNextSeasonCallback) {
        this.onNextSeasonCallback();
      }
    });
  }

  private getRivalAvatar(id: string): string {
    switch (id) {
      case 'player': return '🧑‍✈️';
      case 'daredevil': return '⚡';
      case 'calculator': return '📐';
      case 'tracker': return '🔬';
      default: return '👤';
    }
  }
}
