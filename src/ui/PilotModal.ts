import { t, onLanguageChange } from '../i18n/i18n';
import { GameState } from '../core/GameState';
import { AudioManager } from '../audio/AudioManager';

export class PilotModal {
  private static instance: PilotModal;
  private containerElement: HTMLElement | null = null;
  private isOpen = false;
  private nameChangeCallbacks: Array<(newName: string) => void> = [];

  private constructor() {
    onLanguageChange(() => {
      if (this.isOpen) {
        this.render();
      }
    });
  }

  public static getInstance(): PilotModal {
    if (!PilotModal.instance) {
      PilotModal.instance = new PilotModal();
    }
    return PilotModal.instance;
  }

  public mount(container: HTMLElement): void {
    this.containerElement = container;
  }

  public onNameChange(callback: (newName: string) => void): void {
    this.nameChangeCallbacks.push(callback);
  }

  public open(): void {
    this.isOpen = true;
    this.render();
    setTimeout(() => {
      const input = document.getElementById('input-pilot-name') as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  }

  public close(): void {
    this.isOpen = false;
    if (this.containerElement) {
      this.containerElement.innerHTML = '';
    }
  }

  public getIsOpen(): boolean {
    return this.isOpen;
  }

  public render(): void {
    if (!this.containerElement || !this.isOpen) return;

    const currentName = GameState.getInstance().getPlayerName();

    this.containerElement.innerHTML = `
      <div id="pilot-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in select-none pointer-events-auto">
        <div class="relative w-full max-w-sm max-h-[88vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 flex flex-col space-y-4">
          
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div class="flex items-center space-x-2">
              <span class="text-2xl">✈️</span>
              <div>
                <h2 class="text-sm font-bold text-sky-200 tracking-wide">${t('profile.title')}</h2>
                <p class="text-[11px] text-slate-400 mt-0.5">${t('profile.subtitle')}</p>
              </div>
            </div>
            <button 
              id="btn-pilot-close" 
              class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 flex items-center justify-center transition cursor-pointer text-xs"
              title="${t('profile.cancel')}"
            >
              ✕
            </button>
          </div>

          <!-- Body / Form -->
          <div class="space-y-3">
            <div>
              <label for="input-pilot-name" class="block text-xs font-semibold text-slate-300 mb-1.5">
                ${t('profile.nameLabel')}
              </label>
              <input 
                id="input-pilot-name" 
                type="text" 
                maxlength="18" 
                value="${currentName}" 
                placeholder="${t('profile.placeholder')}" 
                class="w-full px-3 py-2 rounded-lg bg-slate-800 text-slate-100 border border-slate-600 focus:outline-none focus:border-sky-400 font-mono text-sm transition"
              />
              <p id="pilot-name-error" class="text-[11px] text-rose-400 mt-1 hidden"></p>
            </div>
            <p class="text-[11px] text-slate-400 leading-relaxed">
              ${t('profile.infoText')}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
            <button 
              id="btn-pilot-cancel" 
              class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              ${t('profile.cancel')}
            </button>
            <button 
              id="btn-pilot-save" 
              class="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-slate-100 border border-sky-400 text-xs font-bold transition cursor-pointer shadow-md"
            >
              ${t('profile.save')}
            </button>
          </div>

        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    const backdrop = document.getElementById('pilot-modal-backdrop');
    const closeBtn = document.getElementById('btn-pilot-close');
    const cancelBtn = document.getElementById('btn-pilot-cancel');
    const saveBtn = document.getElementById('btn-pilot-save');
    const input = document.getElementById('input-pilot-name') as HTMLInputElement | null;
    const errorEl = document.getElementById('pilot-name-error');

    const handleClose = () => {
      AudioManager.getInstance().playUiClick();
      this.close();
    };

    const handleSave = () => {
      if (!input) return;
      const raw = input.value.trim();
      if (!raw) {
        if (errorEl) {
          errorEl.textContent = t('profile.errorEmpty');
          errorEl.classList.remove('hidden');
        }
        input.focus();
        return;
      }
      if (raw.length > 18) {
        if (errorEl) {
          errorEl.textContent = t('profile.errorLength');
          errorEl.classList.remove('hidden');
        }
        input.focus();
        return;
      }

      AudioManager.getInstance().playUiClick();
      GameState.getInstance().setPlayerName(raw);
      this.nameChangeCallbacks.forEach((cb) => cb(raw));

      const pilotBadgeEl = document.getElementById('header-pilot-name');
      if (pilotBadgeEl) {
        pilotBadgeEl.textContent = raw;
      }

      this.close();
    };

    closeBtn?.addEventListener('click', handleClose);
    cancelBtn?.addEventListener('click', handleClose);
    saveBtn?.addEventListener('click', handleSave);

    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        handleClose();
      }
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (errorEl) {
        errorEl.classList.add('hidden');
      }
    });
  }
}
