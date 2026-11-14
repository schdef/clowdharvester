import { AudioManager } from '../audio/AudioManager';
import { t, onLanguageChange } from '../i18n/i18n';

/**
 * Cloud Harvesters - TutorialModal
 * Features Balo 🎈 the friendly weather balloon advisor.
 * Provides a 6-step interactive onboarding walkthrough with
 * Neo-Pastell visuals, keyboard shortcuts, and dark-mode styling.
 */
export class TutorialModal {
  private static instance: TutorialModal;
  private currentStep = 1;
  private readonly totalSteps = 6;
  private isVisible = false;
  private containerElement: HTMLElement | null = null;
  private readonly storageKey = 'cloud_harvesters_tutorial_seen';

  private constructor() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    onLanguageChange(() => {
      if (this.isVisible) this.render();
    });
  }

  public static getInstance(): TutorialModal {
    if (!TutorialModal.instance) {
      TutorialModal.instance = new TutorialModal();
    }
    return TutorialModal.instance;
  }

  public mount(container: HTMLElement): void {
    this.containerElement = container;
  }

  public checkAutoOpen(): void {
    const hasSeen = localStorage.getItem(this.storageKey);
    if (!hasSeen) {
      // Delay opening slightly to let scenes initialize
      window.setTimeout(() => {
        this.open(1);
      }, 700);
    }
  }

  public open(step = 1): void {
    this.currentStep = Math.max(1, Math.min(this.totalSteps, step));
    this.isVisible = true;
    AudioManager.getInstance().playUiClick();
    this.render();
  }

  public close(): void {
    this.isVisible = false;
    localStorage.setItem(this.storageKey, 'true');
    AudioManager.getInstance().playUiClick();
    if (this.containerElement) {
      this.containerElement.innerHTML = '';
    }
  }

  public next(): void {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      AudioManager.getInstance().playUiClick();
      this.render();
    } else {
      // Finish tutorial with a celebratory chime!
      AudioManager.getInstance().playAuctionBell();
      this.close();
    }
  }

  public prev(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      AudioManager.getInstance().playUiClick();
      this.render();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isVisible) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault();
      this.next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.prev();
    }
  }

  private renderBaloSvg(): string {
    return `
      <div class="relative w-20 h-20 shrink-0 animate-bounce duration-1000 flex items-center justify-center">
        <svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-[0_8px_16px_rgba(244,114,182,0.35)]">
          <defs>
            <radialGradient id="baloGradient" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stop-color="#FED7AA" />
              <stop offset="40%" stop-color="#FB923C" />
              <stop offset="100%" stop-color="#EA580C" />
            </radialGradient>
            <linearGradient id="goggleGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#38BDF8" />
              <stop offset="100%" stop-color="#0284C7" />
            </linearGradient>
          </defs>

          <!-- Balloon Body -->
          <circle cx="50" cy="46" r="38" fill="url(#baloGradient)" />

          <!-- Cute Navigator Aviator Goggles on Top of Head -->
          <g>
            <!-- Strap -->
            <rect x="14" y="24" width="72" height="6" rx="3" fill="#78350F" />
            <!-- Left Lens -->
            <circle cx="36" cy="27" r="11" fill="#F59E0B" />
            <circle cx="36" cy="27" r="8" fill="url(#goggleGradient)" />
            <circle cx="33" cy="24" r="3" fill="#FFFFFF" opacity="0.8" />
            <!-- Right Lens -->
            <circle cx="64" cy="27" r="11" fill="#F59E0B" />
            <circle cx="64" cy="27" r="8" fill="url(#goggleGradient)" />
            <circle cx="61" cy="24" r="3" fill="#FFFFFF" opacity="0.8" />
            <!-- Bridge -->
            <rect x="44" y="25" width="12" height="4" rx="2" fill="#D97706" />
          </g>

          <!-- Kawaii Big Eyes -->
          <circle cx="38" cy="48" r="5" fill="#0F172A" />
          <circle cx="36" cy="46" r="2" fill="#FFFFFF" />
          <circle cx="62" cy="48" r="5" fill="#0F172A" />
          <circle cx="60" cy="46" r="2" fill="#FFFFFF" />

          <!-- Rosy Cheeks -->
          <circle cx="30" cy="56" r="5" fill="#FDA4AF" opacity="0.75" />
          <circle cx="70" cy="56" r="5" fill="#FDA4AF" opacity="0.75" />

          <!-- Happy Smile -->
          <path d="M 44 56 Q 50 63 56 56" stroke="#0F172A" stroke-width="2.5" fill="none" stroke-linecap="round" />

          <!-- Balloon Tie / Knot -->
          <polygon points="46,84 54,84 50,88" fill="#C2410C" />

          <!-- Little Hanging Basket Ropes & Basket -->
          <line x1="44" y1="87" x2="40" y2="95" stroke="#FDE68A" stroke-width="1.5" />
          <line x1="56" y1="87" x2="60" y2="95" stroke="#FDE68A" stroke-width="1.5" />
          <rect x="38" y="94" width="24" height="6" rx="2" fill="#78350F" />
        </svg>
      </div>
    `;
  }

  private renderStepContent(): string {
    switch (this.currentStep) {
      case 1:
        return `
          <div class="space-y-4">
            <p class="text-sm text-slate-300 leading-relaxed">
              ${t('tutorial.step1.lead')}
            </p>
            <p class="text-xs text-slate-400">
              ${t('tutorial.step1.text')}
            </p>
            <div class="space-y-2 pt-1">
              <div class="p-2.5 rounded-xl border border-cyan-500/40 bg-slate-800/60 text-xs text-sky-200 flex items-start space-x-2">
                <span class="text-base">❄️</span>
                <div>
                  <span class="font-bold text-cyan-300">${t('tutorial.step1.highLead')}</span>
                  <span class="text-slate-300 ml-1">${t('tutorial.step1.highSub')}</span>
                </div>
              </div>
              <div class="p-2.5 rounded-xl border border-blue-500/40 bg-slate-800/60 text-xs text-blue-200 flex items-start space-x-2">
                <span class="text-base">💧</span>
                <div>
                  <span class="font-bold text-blue-300">${t('tutorial.step1.midLead')}</span>
                  <span class="text-slate-300 ml-1">${t('tutorial.step1.midSub')}</span>
                </div>
              </div>
              <div class="p-2.5 rounded-xl border border-amber-500/40 bg-slate-800/60 text-xs text-amber-200 flex items-start space-x-2">
                <span class="text-base">⚡</span>
                <div>
                  <span class="font-bold text-amber-300">${t('tutorial.step1.lowLead')}</span>
                  <span class="text-slate-300 ml-1">${t('tutorial.step1.lowSub')}</span>
                </div>
              </div>
            </div>
          </div>
        `;

      case 2:
        return `
          <div class="space-y-4">
            <p class="text-sm text-slate-300 leading-relaxed">
              ${t('tutorial.step2.lead')}
            </p>
            <div class="p-3 rounded-xl border border-slate-700/80 bg-slate-800/40 space-y-2">
              <div class="flex items-center space-x-3 text-xs text-slate-300">
                <span class="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-sky-400 font-mono font-bold">1</span>
                <span>${t('tutorial.step2.instruction1')}</span>
              </div>
              <div class="flex items-center space-x-3 text-xs text-slate-300">
                <span class="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-sky-400 font-mono font-bold">2</span>
                <span>${t('tutorial.step2.instruction2')}</span>
              </div>
              <div class="flex items-center space-x-3 text-xs text-slate-300">
                <span class="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-sky-400 font-mono font-bold">3</span>
                <span>${t('tutorial.step2.instruction3')}</span>
              </div>
            </div>
            <p class="text-xs text-amber-300/90 bg-amber-950/40 p-2.5 rounded-lg border border-amber-800/40">
              ${t('tutorial.step2.tip')}
            </p>
          </div>
        `;

      case 3:
        return `
          <div class="space-y-3.5">
            <p class="text-sm text-slate-300 leading-relaxed">
              ${t('tutorial.step3.lead')}
            </p>
            <div class="grid grid-cols-3 gap-2">
              <div class="p-2.5 rounded-xl border border-cyan-500/50 bg-cyan-950/40 text-center">
                <div class="text-lg">❄️</div>
                <div class="text-xs font-bold text-cyan-300 mt-1">${t('drillHeads.ice')}</div>
                <div class="text-[10px] font-mono text-cyan-200/80 mt-0.5">${t('tutorial.step3.keyPrefix')} [Q]</div>
                <div class="text-[10px] text-slate-400 mt-1">${t('zones.high')}</div>
              </div>
              <div class="p-2.5 rounded-xl border border-blue-500/50 bg-blue-950/40 text-center">
                <div class="text-lg">💧</div>
                <div class="text-xs font-bold text-blue-300 mt-1">${t('drillHeads.fog')}</div>
                <div class="text-[10px] font-mono text-blue-200/80 mt-0.5">${t('tutorial.step3.keyPrefix')} [W]</div>
                <div class="text-[10px] text-slate-400 mt-1">${t('zones.mid')}</div>
              </div>
              <div class="p-2.5 rounded-xl border border-amber-500/50 bg-amber-950/40 text-center">
                <div class="text-lg">⚡</div>
                <div class="text-xs font-bold text-amber-300 mt-1">${t('drillHeads.charge')}</div>
                <div class="text-[10px] font-mono text-amber-200/80 mt-0.5">${t('tutorial.step3.keyPrefix')} [E]</div>
                <div class="text-[10px] text-slate-400 mt-1">${t('zones.low')}</div>
              </div>
            </div>
            <div class="p-2.5 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-200 text-xs">
              ${t('tutorial.step3.warning')}
            </div>
          </div>
        `;

      case 4:
        return `
          <div class="space-y-4">
            <p class="text-sm text-slate-300 leading-relaxed">
              ${t('tutorial.step4.lead')}
            </p>
            <p class="text-xs text-slate-300 leading-relaxed">
              ${t('tutorial.step4.text')}
            </p>
            <div class="p-3 rounded-xl border border-slate-700/80 bg-slate-800/50 space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-slate-400">${t('tutorial.step4.feature1Label')}</span>
                <span class="text-emerald-400 font-bold font-mono">${t('tutorial.step4.feature1Value')}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">${t('tutorial.step4.feature2Label')}</span>
                <span class="text-sky-300 font-mono">${t('tutorial.step4.feature2Value')}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-400">${t('tutorial.step4.feature3Label')}</span>
                <span class="text-amber-300 font-mono font-bold">${t('tutorial.step4.feature3Value')}</span>
              </div>
            </div>
            <p class="text-xs text-sky-300/90 bg-sky-950/40 p-2.5 rounded-lg border border-sky-800/40">
              ${t('tutorial.step4.tip')}
            </p>
          </div>
        `;

      case 5:
        return `
          <div class="space-y-4">
            <p class="text-sm text-slate-300 leading-relaxed">
              ${t('tutorial.step5.lead')}
            </p>
            <p class="text-xs text-slate-300 leading-relaxed">
              ${t('tutorial.step5.text')}
            </p>
            <div class="space-y-2">
              <div class="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-xs text-amber-200 flex items-center justify-between">
                <span class="font-bold flex items-center space-x-1.5">
                  <span>🔥</span>
                  <span>${t('sonar.veryHot')}</span>
                </span>
                <span class="text-slate-300 font-mono">${t('tutorial.step5.hotDesc')}</span>
              </div>
              <div class="p-2 rounded-lg bg-sky-950/40 border border-sky-800/40 text-xs text-sky-200 flex items-center justify-between">
                <span class="font-bold flex items-center space-x-1.5">
                  <span>⚡</span>
                  <span>${t('sonar.warmer')}</span>
                </span>
                <span class="text-slate-300 font-mono">${t('tutorial.step5.warmerDesc')}</span>
              </div>
              <div class="p-2 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs text-slate-300 flex items-center justify-between">
                <span class="font-bold flex items-center space-x-1.5">
                  <span>❄️</span>
                  <span>${t('sonar.colder')}</span>
                </span>
                <span class="text-slate-400 font-mono">${t('tutorial.step5.colderDesc')}</span>
              </div>
            </div>
          </div>
        `;

      case 6:
        return `
          <div class="space-y-4">
            <p class="text-sm text-slate-300 leading-relaxed">
              ${t('tutorial.step6.lead')}
            </p>
            <p class="text-xs text-slate-300 leading-relaxed">
              ${t('tutorial.step6.text')}
            </p>
            <div class="p-3 rounded-xl border border-amber-600/40 bg-amber-950/30 space-y-2 text-xs">
              <div class="flex items-center space-x-2 text-amber-300 font-semibold">
                <span>🔨</span>
                <span>${t('tutorial.step6.auctionHeader')}</span>
              </div>
              <p class="text-slate-300 text-[11px] leading-relaxed">
                ${t('tutorial.step6.auctionText')}
              </p>
            </div>
            <p class="text-xs text-emerald-300 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/40">
              ${t('tutorial.step6.tip')}
            </p>
          </div>
        `;

      default:
        return '';
    }
  }

  public render(): void {
    if (!this.containerElement || !this.isVisible) return;

    this.containerElement.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
        <!-- Tutorial Card Container (Strict Dark Mode Compliance) -->
        <div class="relative w-full max-w-lg rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl p-6 flex flex-col space-y-5 text-slate-200">
          
          <!-- Top Header with Balo & Close Button -->
          <div class="flex items-start justify-between border-b border-slate-800 pb-4">
            <div class="flex items-center space-x-3.5">
              ${this.renderBaloSvg()}
              <div>
                <div class="flex items-center space-x-2">
                  <h3 class="text-base font-bold text-amber-300 tracking-wide">
                    ${t('tutorial.advisor')}
                  </h3>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/40">
                    ${t('tutorial.advisorRole')}
                  </span>
                </div>
                <p class="text-xs text-slate-400 mt-0.5">
                  ${t('tutorial.step')} ${this.currentStep} ${t('tutorial.of')} ${this.totalSteps}
                </p>
              </div>
            </div>

            <!-- Close Button -->
            <button 
              id="tutorial-btn-close" 
              class="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700/60 transition cursor-pointer"
              title="${t('tutorial.close')}"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Step Progress Dots Bar -->
          <div class="flex items-center justify-between gap-1.5">
            ${Array.from({ length: this.totalSteps }, (_, i) => {
              const stepNum = i + 1;
              const isPast = stepNum < this.currentStep;
              const isCurrent = stepNum === this.currentStep;
              let dotClass = 'bg-slate-800 border-slate-700 text-slate-500';
              if (isCurrent) {
                dotClass = 'bg-amber-500 border-amber-400 text-slate-950 font-bold shadow-[0_0_10px_rgba(245,158,11,0.5)]';
              } else if (isPast) {
                dotClass = 'bg-emerald-600 border-emerald-500 text-slate-100';
              }
              return `
                <div class="flex-1 h-2 rounded-full border transition-all duration-300 ${dotClass}"></div>
              `;
            }).join('')}
          </div>

          <!-- Main Interactive Content Body -->
          <div class="min-h-[220px] flex flex-col justify-center">
            ${this.renderStepContent()}
          </div>

          <!-- Footer Navigation Bar -->
          <div class="flex items-center justify-between pt-3 border-t border-slate-800">
            <!-- Back Button -->
            <button 
              id="tutorial-btn-prev" 
              class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition text-xs font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              ${this.currentStep === 1 ? 'disabled' : ''}
            >
              ${t('tutorial.prev')}
            </button>

            <!-- Keyboard shortcut hint -->
            <span class="text-[10px] text-slate-500 hidden sm:inline-block font-mono">
              ${t('tutorial.shortcutHint')}
            </span>

            <!-- Next / Finish Button -->
            <button 
              id="tutorial-btn-next" 
              class="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)] transition text-xs cursor-pointer"
            >
              ${this.currentStep === this.totalSteps ? t('tutorial.finish') : t('tutorial.next')}
            </button>
          </div>

        </div>
      </div>
    `;

    // Attach click listeners
    const closeBtn = document.getElementById('tutorial-btn-close');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const prevBtn = document.getElementById('tutorial-btn-prev');
    if (prevBtn) prevBtn.addEventListener('click', () => this.prev());

    const nextBtn = document.getElementById('tutorial-btn-next');
    if (nextBtn) nextBtn.addEventListener('click', () => this.next());
  }
}
