import { jianzi } from './EditorInstance';

export function initDropdowns() {
    // ============================================================
    // Dropdown menus (open / close)
    // ============================================================
    function setupDropdown(triggerID: string, menuID: string) {
        const trigger = document.getElementById(triggerID);
        const menu = document.getElementById(menuID);
        if (!trigger || !menu) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const opening = !menu.classList.contains('open');
            // Close all dropdowns first
            document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
            if (opening) menu.classList.add('open');
        });
    }

    setupDropdown('action-menu-trigger', 'action-menu');
    setupDropdown('export-menu-trigger', 'export-menu');

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    });

    // ============================================================
    // Clear Canvas (Action Menu)
    // ============================================================
    document.getElementById('clear-canvas')?.addEventListener('click', () => {
        if (confirm('确定要清空画布吗？')) jianzi.clear();
    });
}
