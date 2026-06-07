const fs = require('fs');
const path = require('path');

const file = path.join('d:', 'MANPROSI TUBES', 'src', 'pages', 'AdminDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('useModal')) {
  content = content.replace(
    "import { AlertTriangle, Map, Database, CheckCircle, XCircle } from 'lucide-react';",
    "import { AlertTriangle, Map, Database, CheckCircle, XCircle } from 'lucide-react';\nimport { useModal } from '../components/ModalProvider';"
  );
}

// Add hook inside component
if (!content.includes('const { showAlert, showConfirm } = useModal();')) {
  content = content.replace(
    "export default function AdminDashboard() {",
    "export default function AdminDashboard() {\n  const { showAlert, showConfirm } = useModal();"
  );
}

// Replace alert
content = content.replace(/alert\(/g, 'showAlert(');

// Replace confirm
content = content.replace(/window\.confirm\(/g, 'await showConfirm(');

// Make functions async
content = content.replace(
  'const resetSystemData = () => {',
  'const resetSystemData = async () => {'
);

fs.writeFileSync(file, content);
console.log('Done AdminDashboard');
