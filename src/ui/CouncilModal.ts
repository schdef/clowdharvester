import { AudioManager } from '../audio/AudioManager';
import { GameState } from '../core/GameState';
import { CouncilEngine, CouncilSessionResult } from '../core/CouncilEngine';
import { t, onLanguageChange } from '../i18n/i18n';
import { SummaryModal } from './SummaryModal';

export type CouncilModalMode = 'session' | 'dossier';

export class CouncilModal {
  private static instance: CouncilModal;
  private containerElement: HTMLElement | null = null;
  private isVisible = false;
  private mode: CouncilModalMode = 'dossier';
  private sessionWeek: number = 4;
  private sessionPhase: 'bidding' | 'revealing' | 'results' = 'bidding';
  private playerBidShares = 5;
  private playerBidPrice = 25;
  private lastSessionResult: CouncilSessionResult | null = null;
  private onSessionCompleteCallback: (() => void) | null = null;

  private constructor() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    onLanguageChange(() => {
      if (this.isVisible) this.render();
    });
  }

  public static getInstance(): CouncilModal {
    if (!CouncilModal.instance) {
      CouncilModal.instance = new CouncilModal();
    }
    return CouncilModal.instance;
  }

  public mount(container: HTMLElement): void {
    this.containerElement = container;
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  public open(mode: CouncilModalMode = 'dossier', week: number = 4, onComplete?: () => void): void {
    this.mode = mode;
    this.sessionWeek = week;
    this.isVisible = true;
    this.onSessionCompleteCallback = onComplete ?? null;

    const gs = GameState.getInstance();
    const ce = gs.getCouncilEngine();

    if (mode === 'session') {
      if (ce.isSessionCompleted(week)) {
        // If already completed, jump to results
        const history = ce.getSessionHistory();
        this.lastSessionResult = history.find((h) => h.week === week) ?? null;
        this.sessionPhase = 'results';
      } else {
        this.sessionPhase = 'bidding';
        // Auto-initialize player bid to reasonable defaults within budget
        const playerCredits = gs.getData().credits;
        this.playerBidShares = Math.min(10, Math.max(1, Math.floor(playerCredits / 30) || 1));
        this.playerBidPrice = Math.min(playerCredits, Math.max(10, Math.floor(playerCredits / (this.playerBidShares || 1))));
      }
      AudioManager.getInstance().playCouncilGavel();
    } else {
      AudioManager.getInstance().playUiClick();
    }

    this.render();
  }

  public close(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    AudioManager.getInstance().playUiClick();
    if (this.containerElement) {
      this.containerElement.innerHTML = '';
    }
    if (this.onSessionCompleteCallback) {
      const cb = this.onSessionCompleteCallback;
      this.onSessionCompleteCallback = null;
      cb();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isVisible) {
      // Do not allow escaping out of an active uncompleted Council session
      if (this.mode === 'session' && this.sessionPhase === 'bidding') {
        return;
      }
      this.close();
    }
  }

  private render(): void {
    if (!this.containerElement || !this.isVisible) return;

    if (this.mode === 'dossier') {
      this.renderDossier();
    } else {
      if (this.sessionPhase === 'bidding') {
        this.renderBidding();
      } else if (this.sessionPhase === 'revealing') {
        this.renderRevealing();
      } else {
        this.renderResults();
      }
    }
  }

  /**
   * Dossier Mode: Schedule, Current Standings, Rival Profiles
   */
  private renderDossier(): void {
    const gs = GameState.getInstance();
    const data = gs.getData();
    const ce = gs.getCouncilEngine();
    const rankings = ce.calculateRankings(data.region);

    this.containerElement!.innerHTML = `
      <div id="council-dossier-backdrop" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in font-mono pointer-events-auto">
        <div id="council-dossier-card" class="w-full max-w-xl max-h-[88vh] overflow-y-auto flex flex-col bg-slate-900 border border-indigo-700/60 rounded-xl shadow-2xl">
          
          <!-- Header -->
          <div class="px-4 py-3 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-b border-indigo-800/60 flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-xl">🏛️</span>
              <div>
                <h2 class="text-sm sm:text-base font-bold text-indigo-200 tracking-wide">${t('council.dossierTitle')}</h2>
                <p class="text-[11px] text-slate-400">${t('council.totalShares')} • ${t('council.sharesToAuction')}</p>
              </div>
            </div>
            <button id="btn-council-close" class="text-slate-400 hover:text-slate-200 text-lg px-2 py-1 rounded bg-slate-800/80 border border-slate-700">✕</button>
          </div>

          <!-- Body Scrollable -->
          <div class="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            
            <!-- Schedule Section -->
            <div class="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
              <h3 class="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <span>📅</span>
                <span>${t('council.scheduleTitle')}</span>
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                ${CouncilEngine.SESSIONS.map((w, idx) => {
                  const isDone = ce.isSessionCompleted(w);
                  const isCurrent = data.week === w;
                  const borderCol = isCurrent ? 'border-amber-500 bg-amber-950/30' : isDone ? 'border-emerald-800/60 bg-emerald-950/20' : 'border-slate-700/60 bg-slate-900/60';
                  const statusBadge = isDone
                    ? `<span class="text-emerald-400">✓ ${t('council.completed')}</span>`
                    : isCurrent
                    ? `<span class="text-amber-400 animate-pulse">● ${t('council.activeNow')}</span>`
                    : `<span class="text-slate-400">⏳ ${t('council.upcoming')}</span>`;

                  return `
                    <div class="p-2.5 rounded border ${borderCol} flex flex-col justify-between">
                      <div class="font-bold text-slate-200">${t(`council.session${idx + 1}`)}</div>
                      <div class="text-[10px] text-slate-400 mt-1">${statusBadge}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Standings Table -->
            <div class="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
              <h3 class="text-xs font-bold text-sky-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <span>📊</span>
                <span>${t('summary.rankHeader')} & ${t('summary.sharesHeader')}</span>
              </h3>
              <div class="space-y-1.5">
                ${rankings.map((r) => {
                  const isPlayer = r.participantId === 'player';
                  const rowBg = isPlayer ? 'bg-indigo-950/70 border-indigo-700/80 text-indigo-100 font-semibold' : 'bg-slate-900/70 border-slate-800 text-slate-300';
                  const auroraBadge = r.auroraShares > 0 ? `<span class="ml-1 text-pink-400" title="${t('council.auroraBonus')}">✨+${r.auroraShares}</span>` : '';
                  const starsStr = r.stars > 0 ? '⭐'.repeat(r.stars) : '—';

                  return `
                    <div class="flex items-center justify-between p-2 rounded border ${rowBg}">
                      <div class="flex items-center space-x-2">
                        <span class="w-5 text-center font-bold text-amber-400">#${r.rank}</span>
                        <span>${this.getRivalAvatar(r.participantId)}</span>
                        <span>${r.name}</span>
                        ${auroraBadge}
                      </div>
                      <div class="flex items-center space-x-3 text-right">
                        <div>
                          <span class="text-amber-300 font-bold text-xs">${r.totalShares}</span>
                          <span class="text-slate-400 text-[10px]"> / 30</span>
                        </div>
                        <div class="text-emerald-400 font-mono text-[11px] w-16 text-right">${r.credits} CR</div>
                        <div class="text-[11px] w-12 text-center text-amber-300">${starsStr}</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Rival Intel Cards -->
            <div class="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
              <h3 class="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <span>🕵️</span>
                <span>${t('auction.rivalIntel')}</span>
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div class="p-2 rounded bg-slate-900/80 border border-slate-700/60">
                  <div class="font-bold text-amber-400 flex items-center space-x-1">
                    <span>⚡</span>
                    <span>${t('council.rivals.daredevil')}</span>
                  </div>
                  <p class="text-[10px] text-slate-400 mt-1">${t('council.rivals.daredevilDesc')}</p>
                </div>
                <div class="p-2 rounded bg-slate-900/80 border border-slate-700/60">
                  <div class="font-bold text-cyan-400 flex items-center space-x-1">
                    <span>📐</span>
                    <span>${t('council.rivals.calculator')}</span>
                  </div>
                  <p class="text-[10px] text-slate-400 mt-1">${t('council.rivals.calculatorDesc')}</p>
                </div>
                <div class="p-2 rounded bg-slate-900/80 border border-slate-700/60">
                  <div class="font-bold text-pink-400 flex items-center space-x-1">
                    <span>🔬</span>
                    <span>${t('council.rivals.tracker')}</span>
                  </div>
                  <p class="text-[10px] text-slate-400 mt-1">${t('council.rivals.trackerDesc')}</p>
                </div>
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div class="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
            <button id="btn-council-dossier-close" class="px-4 py-2 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 font-bold transition">
              ${t('council.continueSeason')}
            </button>
          </div>

        </div>
      </div>
    `;

    const backdrop = document.getElementById('council-dossier-backdrop');
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    document.getElementById('btn-council-close')?.addEventListener('click', () => this.close());
    document.getElementById('btn-council-dossier-close')?.addEventListener('click', () => this.close());
  }

  /**
   * Bidding Screen for Weeks 4, 8, 12
   */
  private renderBidding(): void {
    const gs = GameState.getInstance();
    const data = gs.getData();
    const ce = gs.getCouncilEngine();
    const sessionNum = ce.getSessionNumber(this.sessionWeek) ?? 1;
    const playerCredits = data.credits;

    const totalCommitment = this.playerBidShares * this.playerBidPrice;
    const isAffordable = totalCommitment <= playerCredits && totalCommitment > 0;

    this.containerElement!.innerHTML = `
      <div id="council-bidding-backdrop" class="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in font-mono pointer-events-auto">
        <div id="council-bidding-card" class="w-full max-w-xl max-h-[88vh] overflow-y-auto flex flex-col bg-slate-900 border border-indigo-600 rounded-xl shadow-2xl">
          
          <!-- Header -->
          <div class="px-4 py-3 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-b border-indigo-800/80 flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-2xl">🏛️</span>
              <div>
                <h2 class="text-base font-bold text-indigo-200 tracking-wide">${t('council.title')}</h2>
                <p class="text-[11px] text-amber-300 font-semibold">${t('council.session')} ${sessionNum} / 3 • ${t('header.week')} ${this.sessionWeek} • 10 ${t('summary.sharesHeader')}</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-[10px] text-slate-400">${t('council.availableCredits')}</div>
              <div class="text-emerald-400 font-bold text-sm">${playerCredits} CR</div>
            </div>
          </div>

          <!-- Body Scrollable -->
          <div class="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            
            <!-- Instructions Banner -->
            <div class="bg-indigo-950/50 border border-indigo-800/60 rounded-lg p-3 text-indigo-200 flex items-start space-x-2.5">
              <span class="text-lg">📜</span>
              <p class="text-[11px] leading-relaxed">
                ${t('council.instructions')}
              </p>
            </div>

            <!-- Bidding Controls Card -->
            <div class="bg-slate-800/80 border border-slate-700 rounded-lg p-4 space-y-4">
              <div class="flex items-center justify-between border-b border-slate-700 pb-2">
                <span class="font-bold text-slate-200 text-sm">${t('council.yourBids')}</span>
                <span class="text-xs text-amber-400 font-semibold">10 ${t('council.sharesToAuction')}</span>
              </div>

              <!-- Slider 1: Requested Shares -->
              <div class="space-y-1.5">
                <div class="flex justify-between items-center text-xs">
                  <span class="text-slate-300">${t('council.requestedShares')}:</span>
                  <span id="label-shares-val" class="font-bold text-amber-300 text-sm">${this.playerBidShares} / 10</span>
                </div>
                <div class="flex items-center space-x-3">
                  <button id="btn-shares-dec" class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm">-</button>
                  <input id="range-shares" type="range" min="1" max="10" value="${this.playerBidShares}" class="flex-1 accent-amber-400 cursor-pointer">
                  <button id="btn-shares-inc" class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm">+</button>
                </div>
              </div>

              <!-- Slider 2: Bid Price per Share -->
              <div class="space-y-1.5">
                <div class="flex justify-between items-center text-xs">
                  <span class="text-slate-300">${t('council.bidPerShare')}:</span>
                  <span id="label-price-val" class="font-bold text-emerald-400 text-sm">${this.playerBidPrice} CR</span>
                </div>
                <div class="flex items-center space-x-3">
                  <button id="btn-price-dec" class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm">-5</button>
                  <input id="range-price" type="range" min="5" max="${Math.max(100, Math.min(250, playerCredits))}" step="5" value="${this.playerBidPrice}" class="flex-1 accent-emerald-400 cursor-pointer">
                  <button id="btn-price-inc" class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm">+5</button>
                </div>
              </div>

              <!-- Total Commitment Summary -->
              <div class="p-3 rounded-lg ${isAffordable ? 'bg-slate-900/80 border-slate-700' : 'bg-rose-950/40 border-rose-800'} border flex items-center justify-between">
                <div>
                  <span class="text-slate-400">${t('council.totalCommitment')}:</span>
                  <div class="text-xs text-slate-400 mt-0.5">${this.playerBidShares} × ${this.playerBidPrice} CR</div>
                </div>
                <div class="text-right">
                  <div class="text-base font-bold ${isAffordable ? 'text-amber-300' : 'text-rose-400'}">${totalCommitment} CR</div>
                  ${!isAffordable ? `<div class="text-[10px] text-rose-400">⚠️ ${t('harbor.noCredits')}</div>` : ''}
                </div>
              </div>

            </div>

            <!-- Active Rivals Preview -->
            <div class="space-y-1.5">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">${t('auction.rivalBidders')} (${t(`regions.${data.region}`)})</span>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                ${ce.getActiveBidders(data.region).filter((b) => b.type !== 'player').map((rival) => `
                  <div class="p-2 rounded bg-slate-800/80 border border-slate-700/60 flex items-center space-x-2">
                    <span class="text-lg">${this.getRivalAvatar(rival.id)}</span>
                    <div class="overflow-hidden">
                      <div class="font-semibold text-slate-200 truncate">${rival.name}</div>
                      <div class="text-[10px] text-amber-400">${rival.sharesWon + rival.auroraShares} ${t('summary.sharesHeader')}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

          </div>

          <!-- Footer Action -->
          <div class="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
            <button id="btn-pass-bid" class="px-3 py-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition">
              ${t('council.passBid')}
            </button>
            <button 
              id="btn-submit-council-bid" 
              class="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              ${!isAffordable ? 'disabled' : ''}
            >
              🔨 ${t('council.submitBid')}
            </button>
          </div>

        </div>
      </div>
    `;

    this.bindBiddingEvents(playerCredits);
  }

  private bindBiddingEvents(playerCredits: number): void {
    const rangeShares = document.getElementById('range-shares') as HTMLInputElement | null;
    const rangePrice = document.getElementById('range-price') as HTMLInputElement | null;
    const labelShares = document.getElementById('label-shares-val');
    const labelPrice = document.getElementById('label-price-val');
    const submitBtn = document.getElementById('btn-submit-council-bid') as HTMLButtonElement | null;

    const updateControls = () => {
      if (rangeShares) rangeShares.value = this.playerBidShares.toString();
      if (rangePrice) rangePrice.value = this.playerBidPrice.toString();
      if (labelShares) labelShares.textContent = `${this.playerBidShares} / 10`;
      if (labelPrice) labelPrice.textContent = `${this.playerBidPrice} CR`;

      const total = this.playerBidShares * this.playerBidPrice;
      const affordable = total <= playerCredits && total > 0;
      if (submitBtn) submitBtn.disabled = !affordable;
    };

    rangeShares?.addEventListener('input', (e) => {
      this.playerBidShares = parseInt((e.target as HTMLInputElement).value, 10);
      updateControls();
    });

    rangePrice?.addEventListener('input', (e) => {
      this.playerBidPrice = parseInt((e.target as HTMLInputElement).value, 10);
      updateControls();
    });

    document.getElementById('btn-shares-dec')?.addEventListener('click', () => {
      this.playerBidShares = Math.max(1, this.playerBidShares - 1);
      updateControls();
    });

    document.getElementById('btn-shares-inc')?.addEventListener('click', () => {
      this.playerBidShares = Math.min(10, this.playerBidShares + 1);
      updateControls();
    });

    document.getElementById('btn-price-dec')?.addEventListener('click', () => {
      this.playerBidPrice = Math.max(5, this.playerBidPrice - 5);
      updateControls();
    });

    document.getElementById('btn-price-inc')?.addEventListener('click', () => {
      this.playerBidPrice = Math.min(playerCredits, this.playerBidPrice + 5);
      updateControls();
    });

    document.getElementById('btn-pass-bid')?.addEventListener('click', () => {
      this.playerBidShares = 0;
      this.playerBidPrice = 0;
      this.executeCouncilAuction();
    });

    const backdrop = document.getElementById('council-bidding-backdrop');
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    submitBtn?.addEventListener('click', () => {
      this.executeCouncilAuction();
    });
  }

  private executeCouncilAuction(): void {
    const gs = GameState.getInstance();
    const ce = gs.getCouncilEngine();
    const region = gs.getData().region;

    AudioManager.getInstance().playCouncilGavel();

    // Execute auction in engine
    this.lastSessionResult = ce.executeSession(
      this.sessionWeek,
      { bidPerShare: this.playerBidPrice, requestedShares: this.playerBidShares },
      region
    );

    // Sync GameState
    const playerResult = this.lastSessionResult.bids.find((b) => b.participantId === 'player');
    if (playerResult && playerResult.sharesWon > 0) {
      gs.addCouncilShares(playerResult.sharesWon);
      gs.deductCredits(playerResult.totalCost);
      AudioManager.getInstance().playShareWon();
    }

    this.sessionPhase = 'revealing';
    this.render();

    // After reveal delay, show results
    setTimeout(() => {
      if (this.isVisible && this.sessionPhase === 'revealing') {
        this.sessionPhase = 'results';
        this.render();
      }
    }, 2200);
  }

  /**
   * Dramatic Envelope Opening / Reveal Screen
   */
  private renderRevealing(): void {
    const res = this.lastSessionResult;
    if (!res) return;

    this.containerElement!.innerHTML = `
      <div class="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in font-mono pointer-events-auto">
        <div class="w-full max-w-md max-h-[88vh] overflow-y-auto bg-slate-900 border border-amber-600/80 rounded-xl shadow-2xl p-6 text-center space-y-4">
          <div class="text-4xl animate-bounce">⚖️</div>
          <h2 class="text-lg font-bold text-amber-300 tracking-wider">${t('council.revealTitle')}</h2>
          <p class="text-xs text-slate-300">${t('council.revealingEnvelopes')}</p>
          <div class="flex justify-center space-x-2 py-4">
            <div class="w-3 h-3 rounded-full bg-amber-400 animate-ping"></div>
            <div class="w-3 h-3 rounded-full bg-indigo-400 animate-ping delay-100"></div>
            <div class="w-3 h-3 rounded-full bg-pink-400 animate-ping delay-200"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Results Screen after Bids have been resolved
   */
  private renderResults(): void {
    const res = this.lastSessionResult;
    if (!res) return;

    const isWeek12 = this.sessionWeek === 12;
    const playerBid = res.bids.find((b) => b.participantId === 'player');
    const playerWon = (playerBid?.sharesWon ?? 0) > 0;

    this.containerElement!.innerHTML = `
      <div id="council-results-backdrop" class="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in font-mono pointer-events-auto">
        <div id="council-results-card" class="w-full max-w-xl max-h-[88vh] overflow-y-auto flex flex-col bg-slate-900 border border-emerald-600/80 rounded-xl shadow-2xl">
          
          <!-- Header -->
          <div class="px-4 py-3 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-b border-emerald-800/80 flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-2xl">${playerWon ? '🎉' : '🏛️'}</span>
              <div>
                <h2 class="text-base font-bold text-emerald-300 tracking-wide">${t('council.sharesWonNotice')}</h2>
                <p class="text-[11px] text-slate-400">${t('council.session')} ${res.sessionNumber} • ${res.sharesDistributed} / 10 ${t('summary.sharesHeader')}</p>
              </div>
            </div>
            <div class="px-2.5 py-1 rounded bg-slate-800 text-amber-300 font-bold text-xs border border-slate-700">
              ${t('header.week')} ${res.week}
            </div>
          </div>

          <!-- Body Scrollable -->
          <div class="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            
            <!-- Bids Table -->
            <div class="bg-slate-800/70 border border-slate-700 rounded-lg p-3 space-y-2">
              <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <span>🔨</span>
                <span>${t('council.bidsOverview')}</span>
              </h3>
              <div class="space-y-1.5">
                ${res.bids.map((bid) => {
                  const isP = bid.participantId === 'player';
                  const rowBg = isP ? 'bg-indigo-950/70 border-indigo-700 text-indigo-100 font-bold' : 'bg-slate-900/60 border-slate-800 text-slate-300';
                  const wonBadge = bid.sharesWon > 0
                    ? `<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">+${bid.sharesWon} 🏛️</span>`
                    : `<span class="text-slate-500">0</span>`;

                  return `
                    <div class="flex items-center justify-between p-2 rounded border ${rowBg}">
                      <div class="flex items-center space-x-2">
                        <span>${this.getRivalAvatar(bid.participantId)}</span>
                        <span>${bid.name}</span>
                      </div>
                      <div class="flex items-center space-x-3 text-right">
                        <div class="text-slate-400 text-[11px]">${bid.bidPerShare > 0 ? `${bid.bidPerShare} CR/Anteil` : t('council.noBid')}</div>
                        <div class="w-20 text-right">${wonBadge}</div>
                        <div class="text-emerald-400 text-[11px] w-16 text-right">${bid.totalCost > 0 ? `-${bid.totalCost} CR` : '0 CR'}</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Current Council Standings -->
            <div class="bg-slate-800/70 border border-slate-700 rounded-lg p-3">
              <h3 class="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <span>🏆</span>
                <span>${t('council.currentStandings')}</span>
              </h3>
              <div class="space-y-1.5">
                ${res.rankings.map((rk) => {
                  const isP = rk.participantId === 'player';
                  const rowBg = isP ? 'bg-indigo-950/70 border-indigo-600 text-indigo-100 font-bold' : 'bg-slate-900/60 border-slate-800 text-slate-300';
                  const starsStr = rk.stars > 0 ? '⭐'.repeat(rk.stars) : '—';
                  const auroraBadge = rk.auroraShares > 0 ? `<span class="text-pink-400 text-[10px]">✨+${rk.auroraShares}</span>` : '';

                  return `
                    <div class="flex items-center justify-between p-2 rounded border ${rowBg}">
                      <div class="flex items-center space-x-2">
                        <span class="w-5 text-center font-bold text-amber-400">#${rk.rank}</span>
                        <span>${this.getRivalAvatar(rk.participantId)}</span>
                        <span>${rk.name}</span>
                        ${auroraBadge}
                      </div>
                      <div class="flex items-center space-x-3 text-right">
                        <div>
                          <span class="text-amber-300 font-bold text-xs">${rk.totalShares}</span>
                          <span class="text-slate-400 text-[10px]"> / 30</span>
                        </div>
                        <div class="text-emerald-400 text-[11px] w-16 text-right">${rk.credits} CR</div>
                        <div class="text-[11px] w-12 text-center text-amber-300">${starsStr}</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

          </div>

          <!-- Footer Action -->
          <div class="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
            ${isWeek12 ? `
              <button id="btn-to-summary" class="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg transition">
                🏆 ${t('council.toSummary')}
              </button>
            ` : `
              <button id="btn-council-continue" class="px-5 py-2.5 rounded-lg bg-indigo-900 hover:bg-indigo-800 text-indigo-100 font-bold text-xs uppercase tracking-wider shadow transition">
                ✈️ ${t('council.continueSeason')}
              </button>
            `}
          </div>

        </div>
      </div>
    `;

    const resultsBackdrop = document.getElementById('council-results-backdrop');
    resultsBackdrop?.addEventListener('click', (e) => {
      if (e.target === resultsBackdrop) this.close();
    });

    document.getElementById('btn-to-summary')?.addEventListener('click', () => {
      this.close();
      SummaryModal.getInstance().open();
    });

    document.getElementById('btn-council-continue')?.addEventListener('click', () => {
      this.close();
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
