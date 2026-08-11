export class BottomNavComponent {
  constructor(container, onTabChange) {
    this.container = container;
    this.onTabChange = onTabChange;
    this.activeTab = 'analyze';
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <nav class="fixed bottom-0 left-0 right-0 z-50">
        <div class="flex gap-2 border-t border-[#312f2f] bg-[#222020] px-4 pb-6 pt-2 shadow-2xl justify-around max-w-xl mx-auto">
          <button class="nav-item flex flex-1 flex-col items-center justify-end gap-1 rounded-full text-white cursor-pointer py-1" data-tab="analyze" id="nav-analyze">
            <div class="text-white flex h-7 items-center justify-center">
              <span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1;">scan</span>
            </div>
            <p class="text-white text-[10px] font-medium leading-normal tracking-[0.015em]">解析</p>
          </button>
          <button class="nav-item flex flex-1 flex-col items-center justify-end gap-1 text-[#ada9a9] cursor-pointer py-1 hover:text-white" data-tab="history" id="nav-history">
            <div class="flex h-7 items-center justify-center">
              <span class="material-symbols-outlined text-xl">history</span>
            </div>
            <p class="text-[10px] font-medium leading-normal tracking-[0.015em]">履歴</p>
          </button>
          <button class="nav-item flex flex-1 flex-col items-center justify-end gap-1 text-[#ada9a9] cursor-pointer py-1 hover:text-white" data-tab="settings" id="nav-settings">
            <div class="flex h-7 items-center justify-center">
              <span class="material-symbols-outlined text-xl">settings</span>
            </div>
            <p class="text-[10px] font-medium leading-normal tracking-[0.015em]">設定</p>
          </button>
        </div>
      </nav>
    `;

    const navButtons = this.container.querySelectorAll('.nav-item');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.setActiveTab(tab);
        if (typeof this.onTabChange === 'function') {
          this.onTabChange(tab);
        }
      });
    });
  }

  setActiveTab(tabName) {
    this.activeTab = tabName;
    const navButtons = this.container.querySelectorAll('.nav-item');
    navButtons.forEach((btn) => {
      const isSelected = btn.getAttribute('data-tab') === tabName;
      if (isSelected) {
        btn.className = 'nav-item flex flex-1 flex-col items-center justify-end gap-1 rounded-full text-white cursor-pointer py-1';
        const iconContainer = btn.querySelector('div');
        const pTag = btn.querySelector('p');
        if (iconContainer) iconContainer.className = 'text-white flex h-7 items-center justify-center';
        if (pTag) pTag.className = 'text-white text-[10px] font-medium leading-normal tracking-[0.015em]';
      } else {
        btn.className = 'nav-item flex flex-1 flex-col items-center justify-end gap-1 text-[#ada9a9] cursor-pointer py-1 hover:text-white';
        const iconContainer = btn.querySelector('div');
        const pTag = btn.querySelector('p');
        if (iconContainer) iconContainer.className = 'text-[#ada9a9] flex h-7 items-center justify-center';
        if (pTag) pTag.className = 'text-[#ada9a9] text-[10px] font-medium leading-normal tracking-[0.015em]';
      }
    });
  }
}
