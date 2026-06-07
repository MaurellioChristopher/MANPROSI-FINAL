const fs = require('fs');
const path = require('path');

const file = path.join('d:', 'MANPROSI TUBES', 'src', 'pages', 'AgentDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('useModal')) {
  content = content.replace(
    "import { QrReader } from 'react-qr-reader';",
    "import { QrReader } from 'react-qr-reader';\nimport { useModal } from '../components/ModalProvider';"
  );
}

// Add hook inside component
if (!content.includes('const { showAlert } = useModal();')) {
  content = content.replace(
    "export default function AgentDashboard({ user }) {",
    "export default function AgentDashboard({ user }) {\n  const { showAlert } = useModal();"
  );
}

// Replace alert
content = content.replace(/alert\(/g, 'showAlert(');

fs.writeFileSync(file, content);
console.log('Done AgentDashboard');
