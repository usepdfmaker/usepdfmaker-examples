// Generates workflow/usepdfmaker-quotation-to-pdf.json from the Code-node sources in workflow/src/.
// Usage: node scripts/build-workflow.mjs   (Node 18+, no dependencies)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (name) => readFileSync(join(root, 'workflow', 'src', name), 'utf8');

const workflow = {
  name: 'UsePDFMaker - Quotation HTML to PDF (example)',
  nodes: [
    {
      parameters: {},
      id: '7a2d0b20-0000-4000-8000-000000000001',
      name: 'Manual Trigger',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [0, 300],
    },
    {
      parameters: { jsCode: readSrc('new-quotation-data.js') },
      id: '7a2d0b20-0000-4000-8000-000000000002',
      name: 'New Quotation Data',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [240, 300],
    },
    {
      parameters: { jsCode: readSrc('build-quotation-html.js') },
      id: '7a2d0b20-0000-4000-8000-000000000003',
      name: 'Build Quotation HTML',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [480, 300],
    },
    {
      parameters: {
        operation: 'htmlToPdf',
        html: '={{ $json.quotationHtml }}',
        options: {},
      },
      id: '7a2d0b20-0000-4000-8000-000000000004',
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
      main: [[{ node: 'New Quotation Data', type: 'main', index: 0 }]],
    },
    'New Quotation Data': {
      main: [[{ node: 'Build Quotation HTML', type: 'main', index: 0 }]],
    },
    'Build Quotation HTML': {
      main: [[{ node: 'UsePDFMaker', type: 'main', index: 0 }]],
    },
  },
  active: false,
  settings: { executionOrder: 'v1' },
  pinData: {},
  meta: {
    templateCredsSetupCompleted: false,
    description:
      'Fictional quotation data -> HTML template -> UsePDFMaker HTML-to-PDF -> PDF binary output (field "data").',
  },
};

const outPath = join(root, 'workflow', 'usepdfmaker-quotation-to-pdf.json');
writeFileSync(outPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log(`Wrote ${outPath}`);
