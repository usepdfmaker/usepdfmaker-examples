// Helpers shared by scripts/build-workflow.mjs and the tests.
// They compose the Code-node scripts exactly as the build writes them, and they run them outside n8n
// with stubs for $input, $() and helpers. This is a local check, not an n8n run.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readSource = (...parts) => readFileSync(join(root, ...parts), 'utf8');

// Async function constructor: n8n runs Code nodes as async bodies, so top-level await works there too.
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// The shared library is pasted in front of each node script, because n8n Code nodes cannot import modules.
export function composeCodeNode(fileName) {
  return `${readSource('workflow', 'src', 'lib', 'invoice-core.js')}\n${readSource('workflow', 'src', fileName)}`;
}

// Runs Code-node source. `input` is the array of input items. `nodeOutputs` maps node names to their output items.
// `helpers` stands in for the node helpers n8n exposes to Code nodes (for example getBinaryDataBuffer).
export async function runCodeNode(jsCode, { input = [], nodeOutputs = {}, helpers = {} } = {}) {
  const $ = (nodeName) => ({
    first: () => {
      if (!(nodeName in nodeOutputs)) throw new Error(`No recorded output for node "${nodeName}"`);
      return nodeOutputs[nodeName][0];
    },
  });
  const $input = {
    first: () => input[0],
    all: () => input,
  };
  return await new AsyncFunction('$input', '$', 'helpers', jsCode)($input, $, helpers);
}

// Loads the shared library by itself, so unit tests can call its functions directly.
export function loadInvoiceCore() {
  const source = readSource('workflow', 'src', 'lib', 'invoice-core.js');
  return new Function(
    `${source}
return {
  INVOICE_LIMITS, validateInvoice, buildInvoiceModel, escapeHtml, invoiceFileName, nameInvoicePdf,
  formatMoney, formatScaled, roundHalfUpDivide,
};`,
  )();
}
