const fs = require('fs');
const path = require('path');

const file = path.join('d:', 'MANPROSI TUBES', 'src', 'components', 'AdminMap.jsx');
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('useModal')) {
  content = content.replace(
    "import { X, AlertTriangle } from 'lucide-react';",
    "import { X, AlertTriangle } from 'lucide-react';\nimport { useModal } from './ModalProvider';"
  );
}

// Add hook inside component
if (!content.includes('const { showAlert, showConfirm } = useModal();')) {
  content = content.replace(
    "export default function AdminMap({ farms, onClose, onRefresh }) {",
    "export default function AdminMap({ farms, onClose, onRefresh }) {\n  const { showAlert, showConfirm } = useModal();"
  );
}

// Replace alert
content = content.replace(/alert\(/g, 'showAlert(');

// Replace confirm
content = content.replace(/window\.confirm\(/g, 'await showConfirm(');

// Make functions async
content = content.replace(
  'const handleDeletePolygon = (farmId) => {',
  'const handleDeletePolygon = async (farmId) => {'
);

fs.writeFileSync(file, content);
console.log('Done AdminMap');
