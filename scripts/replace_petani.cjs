const fs = require('fs');
const path = require('path');

const file = path.join('d:', 'MANPROSI TUBES', 'src', 'pages', 'PetaniDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('useModal')) {
  content = content.replace(
    "import { syncFromSupabase, syncToSupabase } from '../lib/syncHelper';",
    "import { syncFromSupabase, syncToSupabase } from '../lib/syncHelper';\nimport { useModal } from '../components/ModalProvider';"
  );
}

// Add hook inside component
if (!content.includes('const { showAlert, showConfirm, showPrompt } = useModal();')) {
  content = content.replace(
    "export default function PetaniDashboard({ user }) {",
    "export default function PetaniDashboard({ user }) {\n  const { showAlert, showConfirm, showPrompt } = useModal();"
  );
}

// Replace alert
content = content.replace(/alert\(/g, 'showAlert(');

// Replace confirm (handling both window.confirm and confirm)
content = content.replace(/window\.confirm\(/g, 'await showConfirm(');

// We need to ensure functions with await showConfirm are async
content = content.replace(
  'const handleSelesaikanSiklus = (cycleId) => {',
  'const handleSelesaikanSiklus = async (cycleId) => {'
);
content = content.replace(
  'const handleCatatPanen = (cycleId) => {',
  'const handleCatatPanen = async (cycleId) => {'
);

// Replace prompt
content = content.replace(/prompt\(/g, 'await showPrompt(');

fs.writeFileSync(file, content);
console.log('Done PetaniDashboard');
