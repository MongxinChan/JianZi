import { jianzi } from './EditorInstance';

export function initExporters() {
    // ============================================================
    // Open File (JSON)
    // ============================================================
    const jsonFileInput = document.getElementById('json-file-input') as HTMLInputElement;

    document.getElementById('open-file')?.addEventListener('click', () => {
        jsonFileInput?.click();
    });

    jsonFileInput?.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const json = reader.result as string;
            jianzi.loadJSON(json);
            // Sync canvas size inputs
            const opts = jianzi.getOptions();
            const wi = document.getElementById('canvas-width') as HTMLInputElement;
            const hi = document.getElementById('canvas-height') as HTMLInputElement;
            if (wi) wi.value = String(opts.width);
            if (hi) hi.value = String(opts.height);
        };
        reader.readAsText(file);
        (e.target as HTMLInputElement).value = '';
    });

    // ============================================================
    // Export — PNG
    // ============================================================
    document.getElementById('export-png')?.addEventListener('click', () => {
        try {
            const dataUrl = jianzi.exportImage();
            const link = document.createElement('a');
            link.download = `jianzi-${Date.now()}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            alert('导出失败，请检查控制台');
            console.error(e);
        }
    });

    // ============================================================
    // Export — PDF
    // ============================================================
    document.getElementById('export-pdf')?.addEventListener('click', () => {
        try {
            const jspdfAny = (window as any).jspdf;
            if (!jspdfAny) { alert('jsPDF 未加载，请检查网络连接'); return; }
            const { jsPDF } = jspdfAny;
            const opts = jianzi.getOptions();
            const doc = new jsPDF({ unit: 'px', format: [opts.width, opts.height], orientation: 'portrait' });
            const imgData = jianzi.exportImage();
            doc.addImage(imgData, 'PNG', 0, 0, opts.width, opts.height, undefined, 'FAST');
            doc.save(`jianzi-${Date.now()}.pdf`);
        } catch (e) {
            alert('PDF 导出失败，请检查控制台');
            console.error(e);
        }
    });

    // ============================================================
    // Export — JSON
    // ============================================================
    document.getElementById('export-json')?.addEventListener('click', () => {
        const json = jianzi.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `jianzi-${Date.now()}.json`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
}
