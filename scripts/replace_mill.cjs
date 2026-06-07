const fs = require('fs');
const path = require('path');

const file = path.join('d:', 'MANPROSI TUBES', 'src', 'pages', 'MillDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('useModal')) {
  content = content.replace(
    "import { QrReader } from 'react-qr-reader';",
    "import { QrReader } from 'react-qr-reader';\nimport { useModal } from '../components/ModalProvider';"
  );
}

// Add hook inside component
if (!content.includes('const { showAlert, showConfirm } = useModal();')) {
  content = content.replace(
    "export default function MillDashboard({ user }) {",
    "export default function MillDashboard({ user }) {\n  const { showAlert, showConfirm } = useModal();"
  );
}

// Replace alert
content = content.replace(/alert\(/g, 'showAlert(');

// Replace confirm
content = content.replace(/window\.confirm\(/g, 'await showConfirm(');

// Make functions async
content = content.replace(
  'const handleTerimaBarang = () => {',
  'const handleTerimaBarang = async () => {'
);

fs.writeFileSync(file, content);
console.log('Done MillDashboard');
