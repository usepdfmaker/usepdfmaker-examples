// Regenerates workflow/usepdfmaker-invoice-to-pdf.json and samples/invoice-sample.html from workflow/src/.
// Usage:
//   node scripts/build-workflow.mjs           write both files
//   node scripts/build-workflow.mjs --check   fail if either file differs from its sources (no changes written)
// Node 18+, no dependencies.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeCodeNode, runCodeNode } from './lib/code-nodes.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

const workflow = {
  name: 'UsePDFMaker - Invoice HTML to PDF (example)',
  nodes: [
    {
      parameters: {},
      id: '6f1c0a10-0000-4000-8000-000000000001',
      name: 'Manual Trigger',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [0, 300],
    },
    {
      parameters: { jsCode: composeCodeNode('new-invoice-data.js') },
      id: '6f1c0a10-0000-4000-8000-000000000002',
      name: 'New Invoice Data',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [240, 300],
    },
    {
      parameters: { jsCode: composeCodeNode('build-invoice-html.js') },
      id: '6f1c0a10-0000-4000-8000-000000000003',
      name: 'Build Invoice HTML',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [480, 300],
    },
    {
      parameters: {
        operation: 'htmlToPdf',
        html: '={{ $json.invoiceHtml }}',
        options: {},
      },
      id: '6f1c0a10-0000-4000-8000-000000000004',
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
    {
      parameters: { jsCode: composeCodeNode('name-pdf-file.js') },
      id: '6f1c0a10-0000-4000-8000-000000000005',
      name: 'Name PDF File',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [960, 300],
    },
  ],
  connections: {
    'Manual Trigger': {
      main: [[{ node: 'New Invoice Data', type: 'main', index: 0 }]],
    },
    'New Invoice Data': {
      main: [[{ node: 'Build Invoice HTML', type: 'main', index: 0 }]],
    },
    'Build Invoice HTML': {
      main: [[{ node: 'UsePDFMaker', type: 'main', index: 0 }]],
    },
    UsePDFMaker: {
      main: [[{ node: 'Name PDF File', type: 'main', index: 0 }]],
    },
  },
  active: false,
  settings: { executionOrder: 'v1' },
  pinData: {},
  meta: {
    templateCredsSetupCompleted: false,
    description:
      'Fictional sample invoice data -> validation and totals -> HTML template -> UsePDFMaker HTML-to-PDF -> PDF named after the invoice number (binary field "data").',
  },
};

// Renders the sample by running the same two Code nodes that the Manual Trigger runs.
async function renderSampleHtml() {
  const newItems = await runCodeNode(composeCodeNode('new-invoice-data.js'), { input: [{ json: {} }] });
  const buildItems = await runCodeNode(composeCodeNode('build-invoice-html.js'), {
    input: newItems,
    nodeOutputs: { 'New Invoice Data': newItems },
  });
  return buildItems[0].json.invoiceHtml + '\n';
}

const outputs = {
  [join(root, 'workflow', 'usepdfmaker-invoice-to-pdf.json')]: JSON.stringify(workflow, null, 2) + '\n',
  [join(root, 'samples', 'invoice-sample.html')]: await renderSampleHtml(),
};

if (checkOnly) {
  let stale = false;
  for (const [path, expected] of Object.entries(outputs)) {
    const actual = readFileSync(path, 'utf8');
    if (actual !== expected) {
      stale = true;
      console.error(`STALE: ${path} does not match its sources. Run: node scripts/build-workflow.mjs`);
    } else {
      console.log(`OK: ${path}`);
    }
  }
  process.exit(stale ? 1 : 0);
}

for (const [path, content] of Object.entries(outputs)) {
  writeFileSync(path, content, 'utf8');
  console.log(`Wrote ${path}`);
}
