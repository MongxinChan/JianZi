import { Editor, ImageDelta } from '@jianzi/core';
import './style.css';

import { jianzi } from './modules/EditorInstance';
import { initToolbar } from './modules/Toolbar';
import { initDropdowns } from './modules/Dropdowns';
import { initExporters } from './modules/Exporters';
import { initRightPanel } from './modules/RightPanel';
import { initFloatingToolbar } from './modules/FloatingToolbar';

// Initialize Editor UI modules
initToolbar();
initDropdowns();
initExporters();
initRightPanel();
initFloatingToolbar();

