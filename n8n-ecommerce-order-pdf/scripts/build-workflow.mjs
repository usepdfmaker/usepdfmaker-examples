// Generates workflow/usepdfmaker-order-to-pdf.json from the Code-node sources in workflow/src/.
// Usage: node scripts/build-workflow.mjs   (Node 18+, no dependencies)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (name) => readFileSync(join(root, 'workflow', 'src', name), 'utf8');

const workflow = {
  name: 'UsePDFMaker - E-commerce order HTML to PDF (example)',
  nodes: [
    {
      parameters: {},
      id: '8b3e1c30-0000-4000-8000-000000000001',
      name: 'Manual Trigger',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [0, 300],
    },
    {
      parameters: { jsCode: readSrc('new-order-data.js') },
      id: '8b3e1c30-0000-4000-8000-000000000002',
      name: 'New Order Data',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [240, 300],
    },
    {
      parameters: { jsCode: readSrc('build-order-html.js') },
      id: '8b3e1c30-0000-4000-8000-000000000003',
      name: 'Build Order HTML',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [480, 300],
    },
    {
      parameters: {
        operation: 'htmlToPdf',
        html: '={{ $json.orderHtml }}',
        options: {},
      },
      id: '8b3e1c30-0000-4000-8000-000000000004',
      name: 'UsePDFMaker',
      type: 'n8n-nodes-usepdfmaker.usePdfMaker',
      typeVersion: 1,
      position: [720, 300],
      // Placeholder only. Import, then select your own "UsePDFMaker API" credential in n8n.
      credentials: {
        usePdfMakerApi: {
          id: 'REPLACE_WITH_YOUR_CREDENTIAL_ID',
          name: 'UsePDFMaker API account',
        },
      },
    },
  ],
  connections: {
    'Manual Trigger': {
      main: [[{ node: 'New Order Data', type: 'main', index: 0 }]],
    },
    'New Order Data': {
      main: [[{ node: 'Build Order HTML', type: 'main', index: 0 }]],
    },
    'Build Order HTML': {
      main: [[{ node: 'UsePDFMaker', type: 'main', index: 0 }]],
    },
  },
  active: false,
  settings: { executionOrder: 'v1' },
  pinData: {},
  meta: {
    templateCredsSetupCompleted: false,
    description:
      'Fictional e-commerce order data -> HTML order document -> UsePDFMaker HTML-to-PDF -> PDF binary output (field "data").',
  },
};

const outPath = join(root, 'workflow', 'usepdfmaker-order-to-pdf.json');
writeFileSync(outPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log(`Wrote ${outPath}`);
