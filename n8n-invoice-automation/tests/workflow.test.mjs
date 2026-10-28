// Tests the generated workflow JSON: node wiring, the Code-node scripts run in order, and the sample HTML.
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeCodeNode, runCodeNode } from '../scripts/lib/code-nodes.mjs';
import { createFakeN8nBinaryStore, SAMPLE_PDF_BYTES } from './support/n8n-binary-fake.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflow = JSON.parse(readFileSync(join(root, 'workflow', 'usepdfmaker-invoice-to-pdf.json'), 'utf8'));
const node = (name) => workflow.nodes.find((n) => n.name === name);
const jsCode = (name) => node(name).parameters.jsCode;

// Runs the first two Code nodes, from the Manual Trigger (or a custom input) on.
async function runPipeline(input = [{ json: {} }]) {
  const newItems = await runCodeNode(jsCode('New Invoice Data'), { input });
  const buildItems = await runCodeNode(jsCode('Build Invoice HTML'), {
    input: newItems,
    nodeOutputs: { 'New Invoice Data': newItems },
  });
  return { newItems, buildItems };
}

// Runs the Name PDF File node on a UsePDFMaker output item, with the binary helpers of the given store.
async function runNamer(binaryItem, invoiceNumber, store = createFakeN8nBinaryStore()) {
  return runCodeNode(jsCode('Name PDF File'), {
    input: [binaryItem],
    nodeOutputs: { 'Build Invoice HTML': [{ json: { invoiceNumber } }] },
    helpers: store.helpersFor(binaryItem),
  });
}

function externalInvoice(overrides = {}) {
  return {
    body: {
      invoiceNumber: 'WEB-000123',
      issueDate: '2026-10-28',
      dueDate: '2026-11-27',
      currency: 'EUR',
      taxRate: 0.19,
      seller: { name: 'Shop Ltd', address: 'Main 1', email: 'shop@example.com' },
      customer: { name: 'Jane <b>Doe</b>', address: 'Road 2', email: 'jane@example.com' },
      items: [{ description: 'Widget & cable', quantity: 2, unitPrice: 9.99 }],
      ...overrides,
    },
  };
}

// Returns the captured group of a regex in the HTML, failing the test if it is absent.
function text(page, pattern) {
  const match = page.match(pattern);
  assert.ok(match, `pattern not found: ${pattern}`);
  return match[1];
}

function html(buildItems) {
  return buildItems[0].json.invoiceHtml;
}

test('workflow wiring: Manual Trigger -> New -> Build -> UsePDFMaker -> Name PDF File', () => {
  assert.deepEqual(
    workflow.nodes.map((n) => n.name),
    ['Manual Trigger', 'New Invoice Data', 'Build Invoice HTML', 'UsePDFMaker', 'Name PDF File'],
  );
  assert.equal(workflow.connections['Manual Trigger'].main[0][0].node, 'New Invoice Data');
  assert.equal(workflow.connections['New Invoice Data'].main[0][0].node, 'Build Invoice HTML');
  assert.equal(workflow.connections['Build Invoice HTML'].main[0][0].node, 'UsePDFMaker');
  assert.equal(workflow.connections['UsePDFMaker'].main[0][0].node, 'Name PDF File');
  assert.equal(node('UsePDFMaker').parameters.html, '={{ $json.invoiceHtml }}');
});

test('the workflow JSON embeds the current sources (no stale copies)', () => {
  assert.equal(jsCode('New Invoice Data'), composeCodeNode('new-invoice-data.js'));
  assert.equal(jsCode('Build Invoice HTML'), composeCodeNode('build-invoice-html.js'));
  assert.equal(jsCode('Name PDF File'), composeCodeNode('name-pdf-file.js'));
});

test('demo: Manual Trigger input produces the SAMPLE invoice and its totals', async () => {
  const { newItems, buildItems } = await runPipeline();
  assert.equal(newItems[0].json.isSample, true);
  const out = buildItems[0].json;
  assert.equal(out.invoiceNumber, 'SAMPLE-2026-0001');
  assert.equal(out.isSample, true);
  assert.equal(out.subtotal, 'USD 1698.50');
  assert.equal(out.tax, 'USD 339.70');
  assert.equal(out.total, 'USD 2038.20');
});

test('external input from a webhook body is used, not the sample', async () => {
  const { newItems, buildItems } = await runPipeline([{ json: externalInvoice() }]);
  assert.equal(newItems[0].json.isSample, false);
  const out = buildItems[0].json;
  assert.equal(out.invoiceNumber, 'WEB-000123');
  assert.equal(out.currency, 'EUR');
  assert.equal(out.isSample, false);
  assert.equal(out.subtotal, 'EUR 19.98');
  assert.equal(out.tax, 'EUR 3.80');
  assert.equal(out.total, 'EUR 23.78');
});

test('external input that is not valid fails explicitly and does not fall back to the sample', async () => {
  await assert.rejects(
    runPipeline([{ json: externalInvoice({ items: [] }) }]),
    (error) => error.name === 'InvoiceValidationError' && /at least one line item/.test(error.message),
  );
  await assert.rejects(
    runPipeline([{ json: { body: { invoiceNumber: 'X' } } }]),
    (error) => error.name === 'InvoiceValidationError' && /issueDate/.test(error.message),
  );
});

test('external input cannot claim to be the sample invoice', async () => {
  const { buildItems } = await runPipeline([{ json: { ...externalInvoice().body, isSample: true } }]);
  assert.equal(buildItems[0].json.isSample, false);
  assert.doesNotMatch(buildItems[0].json.invoiceHtml, /SAMPLE INVOICE/);
});

test('non-object input is rejected', async () => {
  await assert.rejects(
    runPipeline([{ json: { body: 'just text', items: undefined } }]),
    /Invoice input must be a JSON object|invoice data must be a JSON object/,
  );
});

test('HTML built from external data escapes user-controlled values', async () => {
  const { buildItems } = await runPipeline([{ json: externalInvoice() }]);
  const page = html(buildItems);
  assert.match(page, /Jane &lt;b&gt;Doe&lt;\/b&gt;/);
  assert.match(page, /Widget &amp; cable/);
  assert.doesNotMatch(page, /<b>Doe<\/b>/);
  assert.doesNotMatch(page, /<script/i);
});

test('HTML tax label shows fractional rates without rounding them', async () => {
  const { buildItems } = await runPipeline([{ json: externalInvoice({ taxRate: 0.075 }) }]);
  assert.match(html(buildItems), /<span>Tax \(7\.5%\)<\/span>/);
});

test('HTML footer payment terms match the due date', async () => {
  const { buildItems } = await runPipeline([{ json: externalInvoice({ dueDate: '2026-12-15' }) }]);
  assert.match(html(buildItems), /Payment is due on 2026-12-15, 48 days after the issue date\./);
});

test('displayed totals in the HTML reconcile with each other', async () => {
  const { buildItems } = await runPipeline([
    {
      json: externalInvoice({
        taxRate: 0.0725,
        items: [
          { description: 'a', quantity: 3.333, unitPrice: 19.99 },
          { description: 'b', quantity: 7, unitPrice: 0.15 },
          { description: 'c', quantity: 0.5, unitPrice: 1.01 },
        ],
      }),
    },
  ]);
  const page = html(buildItems);
  const cents = (value) => {
    const match = value.match(/^EUR (\d+)\.(\d{2})$/);
    assert.ok(match, `not an amount: ${value}`);
    return BigInt(match[1]) * 100n + BigInt(match[2]);
  };
  const lineAmounts = [...page.matchAll(/<td class="num">(EUR [\d.]+)<\/td>\s*<\/tr>/g)].map((m) => cents(m[1]));
  const subtotal = cents(text(page, /<span>Subtotal<\/span><span>([^<]+)<\/span>/));
  const tax = cents(text(page, /<span>Tax \([^)]*\)<\/span><span>([^<]+)<\/span>/));
  const total = cents(text(page, /<span>Total due<\/span><span>([^<]+)<\/span>/));

  assert.equal(lineAmounts.length, 3);
  assert.equal(lineAmounts.reduce((sum, value) => sum + value, 0n), subtotal);
  assert.equal(subtotal + tax, total);
});

test('the sample PDF is named SAMPLE-2026-0001.pdf, with the bytes and MIME type unchanged', async () => {
  const { buildItems } = await runPipeline();
  const store = createFakeN8nBinaryStore();
  const original = store.usePdfMakerItem(SAMPLE_PDF_BYTES);
  assert.equal(store.downloadName(original.binary.data), 'output.pdf');

  const [result] = await runNamer(original, buildItems[0].json.invoiceNumber, store);
  assert.equal(result.json.fileName, 'SAMPLE-2026-0001.pdf');
  assert.equal(store.downloadName(result.binary.data), 'SAMPLE-2026-0001.pdf');
  assert.equal(store.downloadMimeType(result.binary.data), 'application/pdf');
  assert.ok(store.readBytes(result.binary.data).equals(SAMPLE_PDF_BYTES));
});

test('an external invoice PDF is named after its invoice number', async () => {
  const { buildItems } = await runPipeline([{ json: externalInvoice() }]);
  const store = createFakeN8nBinaryStore();
  const [result] = await runNamer(store.usePdfMakerItem(SAMPLE_PDF_BYTES), buildItems[0].json.invoiceNumber, store);
  assert.equal(result.json.fileName, 'WEB-000123.pdf');
  assert.equal(store.downloadName(result.binary.data), 'WEB-000123.pdf');
});

test('a missing UsePDFMaker binary output fails the run explicitly', async () => {
  await assert.rejects(runNamer({ json: { error: 'x' } }, 'INV-1'), /no binary property "data"/);
});

test('the committed sample HTML matches a fresh run of the sources', async () => {
  const sample = readFileSync(join(root, 'samples', 'invoice-sample.html'), 'utf8');
  const { buildItems } = await runPipeline();
  assert.equal(sample, buildItems[0].json.invoiceHtml + '\n');
});
