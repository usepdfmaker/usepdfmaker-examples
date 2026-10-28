// Unit tests for workflow/src/lib/invoice-core.js. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadInvoiceCore } from '../scripts/lib/code-nodes.mjs';
import { createFakeN8nBinaryStore, SAMPLE_PDF_BYTES } from './support/n8n-binary-fake.mjs';

const core = loadInvoiceCore();

function invoice(overrides = {}) {
  return {
    invoiceNumber: 'INV-2026-0001',
    issueDate: '2026-10-28',
    dueDate: '2026-11-27',
    currency: 'USD',
    taxRate: 0.2,
    seller: { name: 'Example Studio Ltd', address: '1 Sample Street', email: 'billing@example.com' },
    customer: { name: 'Sample Client Co.', address: '42 Demo Avenue', email: 'accounts@sample-client.example' },
    items: [{ description: 'Service', quantity: 1, unitPrice: 100 }],
    ...overrides,
  };
}

function withItems(items) {
  return invoice({ items });
}

// Returns the validation messages for an invalid invoice, and fails the test if it is accepted.
function rejects(raw) {
  try {
    core.validateInvoice(raw);
  } catch (error) {
    assert.equal(error.name, 'InvoiceValidationError');
    return error.errors;
  }
  assert.fail('expected the invoice to be rejected');
}

function errorsMentioning(raw, fragment) {
  const errors = rejects(raw);
  assert.ok(
    errors.some((message) => message.includes(fragment)),
    `no error mentions "${fragment}". Errors: ${JSON.stringify(errors)}`,
  );
}

const money = (raw) => core.buildInvoiceModel(core.validateInvoice(raw));

test('normal invoice: line amounts, subtotal, tax and total', () => {
  const model = money(invoice());
  assert.equal(model.lines[0].amount, 'USD 100.00');
  assert.equal(model.subtotal, 'USD 100.00');
  assert.equal(model.tax, 'USD 20.00');
  assert.equal(model.total, 'USD 120.00');
});

test('sample invoice totals from the fictional demo data', () => {
  const model = money(
    invoice({
      items: [
        { description: 'Website design - homepage', quantity: 1, unitPrice: 1200 },
        { description: 'Monthly hosting (March)', quantity: 3, unitPrice: 49.5 },
        { description: 'SEO audit', quantity: 1, unitPrice: 350 },
      ],
    }),
  );
  assert.equal(model.lines[1].amount, 'USD 148.50');
  assert.equal(model.subtotal, 'USD 1698.50');
  assert.equal(model.tax, 'USD 339.70');
  assert.equal(model.total, 'USD 2038.20');
});

test('rounding: half-up on a line amount (0.01 x 1.5 = 0.015 becomes 0.02)', () => {
  const model = money(withItems([{ description: 'x', quantity: 1.5, unitPrice: 0.01 }]));
  assert.equal(model.lines[0].amount, 'USD 0.02');
});

test('rounding: half-up on tax (subtotal 0.10 x 15% = 0.015 becomes 0.02)', () => {
  const model = money(invoice({ taxRate: 0.15, items: [{ description: 'x', quantity: 1, unitPrice: 0.1 }] }));
  assert.equal(model.tax, 'USD 0.02');
  assert.equal(model.total, 'USD 0.12');
});

test('rounding: a tiny tax rounds to zero and the total still reconciles', () => {
  const model = money(invoice({ taxRate: 0.07, items: [{ description: 'x', quantity: 1, unitPrice: 0.01 }] }));
  assert.equal(model.subtotalMinor + model.taxMinor, model.totalMinor);
  assert.equal(model.tax, 'USD 0.00');
});

test('rounding: 0.1 + 0.2 style sums are exact in minor units', () => {
  const model = money(
    withItems([
      { description: 'a', quantity: 1, unitPrice: 0.1 },
      { description: 'b', quantity: 1, unitPrice: 0.2 },
    ]),
  );
  assert.equal(model.subtotal, 'USD 0.30');
  assert.equal(model.subtotalMinor, 30n);
});

test('quantity with three decimals is multiplied exactly', () => {
  const model = money(withItems([{ description: 'hours', quantity: 2.333, unitPrice: 30 }]));
  assert.equal(model.lines[0].quantity, '2.333');
  assert.equal(model.lines[0].amount, 'USD 69.99');
});

test('invalid quantities are rejected', () => {
  errorsMentioning(withItems([{ description: 'x', quantity: 0, unitPrice: 1 }]), 'items[0].quantity must be greater than 0');
  errorsMentioning(withItems([{ description: 'x', quantity: -1, unitPrice: 1 }]), 'items[0].quantity must be greater than 0');
  errorsMentioning(withItems([{ description: 'x', quantity: NaN, unitPrice: 1 }]), 'items[0].quantity must be a finite number');
  errorsMentioning(withItems([{ description: 'x', quantity: Infinity, unitPrice: 1 }]), 'items[0].quantity must be a finite number');
  errorsMentioning(withItems([{ description: 'x', quantity: '2', unitPrice: 1 }]), 'items[0].quantity must be a finite number');
  errorsMentioning(withItems([{ description: 'x', quantity: 1.0004, unitPrice: 1 }]), 'at most 3 decimal places');
  errorsMentioning(withItems([{ description: 'x', quantity: 10001, unitPrice: 1 }]), 'at most 10000');
});

test('invalid unit prices are rejected', () => {
  errorsMentioning(withItems([{ description: 'x', quantity: 1, unitPrice: -0.01 }]), 'items[0].unitPrice must be at least 0');
  errorsMentioning(withItems([{ description: 'x', quantity: 1, unitPrice: NaN }]), 'items[0].unitPrice must be a finite number');
  errorsMentioning(withItems([{ description: 'x', quantity: 1, unitPrice: Infinity }]), 'items[0].unitPrice must be a finite number');
  errorsMentioning(withItems([{ description: 'x', quantity: 1, unitPrice: '10' }]), 'items[0].unitPrice must be a finite number');
  errorsMentioning(withItems([{ description: 'x', quantity: 1, unitPrice: 1.005 }]), 'at most 2 decimal places');
  errorsMentioning(withItems([{ description: 'x', quantity: 1, unitPrice: 1000001 }]), 'at most 1000000');
});

test('a unit price of zero is allowed', () => {
  const model = money(withItems([{ description: 'free sample', quantity: 2, unitPrice: 0 }]));
  assert.equal(model.total, 'USD 0.00');
});

test('invalid tax rates are rejected', () => {
  errorsMentioning(invoice({ taxRate: -0.1 }), 'taxRate must be at least 0');
  errorsMentioning(invoice({ taxRate: 1.5 }), 'taxRate must be at most 1');
  errorsMentioning(invoice({ taxRate: NaN }), 'taxRate must be a finite number');
  errorsMentioning(invoice({ taxRate: Infinity }), 'taxRate must be a finite number');
  errorsMentioning(invoice({ taxRate: '0.2' }), 'taxRate must be a finite number');
  errorsMentioning(invoice({ taxRate: 0.07125 }), 'at most 2 decimal places in percent');
  errorsMentioning(invoice({ taxRate: undefined }), 'taxRate must be a finite number');
});

test('valid fractional tax rates are accepted', () => {
  assert.equal(money(invoice({ taxRate: 0 })).tax, 'USD 0.00');
  assert.equal(money(invoice({ taxRate: 1 })).tax, 'USD 100.00');
  assert.equal(money(invoice({ taxRate: 0.075 })).taxPercent, '7.5');
  assert.equal(money(invoice({ taxRate: 0.0725 })).taxPercent, '7.25');
  assert.equal(money(invoice({ taxRate: 0.05 })).taxPercent, '5');
});

test('empty items are rejected', () => {
  errorsMentioning(withItems([]), 'at least one line item');
  errorsMentioning(invoice({ items: undefined }), 'at least one line item');
  errorsMentioning(invoice({ items: 'not an array' }), 'at least one line item');
});

test('too many items are rejected', () => {
  const items = Array.from({ length: 201 }, () => ({ description: 'x', quantity: 1, unitPrice: 1 }));
  errorsMentioning(withItems(items), 'at most 200 line items');
});

test('missing required fields are reported together', () => {
  const errors = rejects({ items: [{ quantity: 1, unitPrice: 1 }] });
  for (const fragment of [
    'invoiceNumber is required',
    'issueDate must be a real date',
    'dueDate must be a real date',
    'currency must be',
    'taxRate must be a finite number',
    'items[0].description is required',
    'seller must be an object',
    'customer must be an object',
  ]) {
    assert.ok(errors.some((message) => message.includes(fragment)), `missing "${fragment}" in ${JSON.stringify(errors)}`);
  }
});

test('currency must be a three-letter code and is normalized to upper case', () => {
  assert.equal(money(invoice({ currency: 'eur' })).currency, 'EUR');
  errorsMentioning(invoice({ currency: 'US' }), 'currency must be a three-letter');
  errorsMentioning(invoice({ currency: 'US1' }), 'currency must be a three-letter');
  errorsMentioning(invoice({ currency: 'USDT' }), 'currency must be a three-letter');
  errorsMentioning(invoice({ currency: 123 }), 'currency must be a three-letter');
});

test('dates must be real calendar dates and dueDate cannot precede issueDate', () => {
  errorsMentioning(invoice({ issueDate: '2026-02-30' }), 'issueDate must be a real date');
  errorsMentioning(invoice({ issueDate: '28/10/2026' }), 'issueDate must be a real date');
  errorsMentioning(invoice({ dueDate: '2026-13-01' }), 'dueDate must be a real date');
  errorsMentioning(invoice({ dueDate: '2026-10-01' }), 'dueDate must be the same as or later than issueDate');
});

test('payment terms text is derived from the dates', () => {
  assert.equal(
    money(invoice({ dueDate: '2026-11-27' })).paymentTerms,
    'Payment is due on 2026-11-27, 30 days after the issue date.',
  );
  assert.equal(
    money(invoice({ dueDate: '2026-10-29' })).paymentTerms,
    'Payment is due on 2026-10-29, 1 day after the issue date.',
  );
  assert.equal(
    money(invoice({ dueDate: '2026-10-28' })).paymentTerms,
    'Payment is due on the issue date.',
  );
});

test('invoice number validation', () => {
  for (const good of ['INV-2026-0001', 'A', '2026.10_28', 'SAMPLE-2026-0001', 'x'.repeat(40)]) {
    assert.equal(money(invoice({ invoiceNumber: good })).invoiceNumber, good);
  }
  for (const bad of ['', '   ', '../etc', 'a/b', 'a\\b', 'INV 1', '-INV', '.hidden', 'x'.repeat(41), 'Ä1', 'a;b', 'a<b']) {
    errorsMentioning(invoice({ invoiceNumber: bad }), 'invoiceNumber');
  }
  errorsMentioning(invoice({ invoiceNumber: 42 }), 'invoiceNumber must be a string');
  errorsMentioning(invoice({ invoiceNumber: 'INV\u0000' }), 'invoiceNumber');
});

test('text fields reject control characters and excessive length', () => {
  errorsMentioning(invoice({ customer: { name: 'Bad\u0007Name' } }), 'customer.name contains control characters');
  errorsMentioning(invoice({ customer: { name: 'x'.repeat(201) } }), 'customer.name must be at most 200 characters');
});

test('email addresses are optional but must look like an address when given', () => {
  assert.equal(money(invoice({ customer: { name: 'No Email Co.' } })).customer.email, '');
  errorsMentioning(invoice({ customer: { name: 'Bad Email', email: 'not-an-email' } }), 'customer.email is not a valid email');
});

test('HTML is escaped in user-controlled text', () => {
  const model = money(
    invoice({
      customer: { name: '<script>alert("x")</script> & Co.' },
      items: [{ description: `<img src=x onerror='boom'>`, quantity: 1, unitPrice: 1 }],
    }),
  );
  assert.equal(core.escapeHtml(model.customer.name), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Co.');
  assert.equal(core.escapeHtml(model.lines[0].description), '&lt;img src=x onerror=&#39;boom&#39;&gt;');
  assert.equal(core.escapeHtml(null), '');
  assert.equal(core.escapeHtml(0), '0');
});

test('PDF file name is the validated invoice number with .pdf', () => {
  assert.equal(core.invoiceFileName('INV-2026-0001'), 'INV-2026-0001.pdf');
  assert.equal(core.invoiceFileName('SAMPLE-2026-0001'), 'SAMPLE-2026-0001.pdf');
});

test('PDF file name sanitizing removes unsafe characters', () => {
  assert.equal(core.invoiceFileName('a/b\\c:d*e?f'), 'a_b_c_d_e_f.pdf');
  assert.equal(core.invoiceFileName('..hidden'), 'hidden.pdf');
  assert.throws(() => core.invoiceFileName('..'), /empty after sanitizing/);
  assert.throws(() => core.invoiceFileName(''), /empty after sanitizing/);
});

test('renaming: the download name changes from output.pdf to the invoice number', async () => {
  const store = createFakeN8nBinaryStore();
  const original = store.usePdfMakerItem(SAMPLE_PDF_BYTES);
  assert.equal(store.downloadName(original.binary.data), 'output.pdf');

  const result = await core.nameInvoicePdf(original, 'SAMPLE-2026-0001', store.helpersFor(original));
  assert.equal(result.json.fileName, 'SAMPLE-2026-0001.pdf');
  assert.equal(result.binary.data.fileName, 'SAMPLE-2026-0001.pdf');
  assert.equal(store.downloadName(result.binary.data), 'SAMPLE-2026-0001.pdf');
});

test('regression: changing only the fileName field does not change the download name', () => {
  // This was the earlier behaviour of the Name PDF File node. The stored name still wins.
  const store = createFakeN8nBinaryStore();
  const original = store.usePdfMakerItem(SAMPLE_PDF_BYTES).binary.data;
  const renamedFieldOnly = { ...original, fileName: 'SAMPLE-2026-0001.pdf' };
  assert.equal(store.downloadName(renamedFieldOnly), 'output.pdf');
});

test('renaming: MIME type and extension are kept', async () => {
  const store = createFakeN8nBinaryStore();
  const original = store.usePdfMakerItem(SAMPLE_PDF_BYTES);
  const result = await core.nameInvoicePdf(original, 'INV-2026-0001', store.helpersFor(original));
  assert.equal(result.binary.data.mimeType, 'application/pdf');
  assert.equal(store.downloadMimeType(result.binary.data), 'application/pdf');
  assert.equal(result.binary.data.fileExtension, 'pdf');
});

test('renaming: the PDF bytes are identical after the rename', async () => {
  const store = createFakeN8nBinaryStore();
  const original = store.usePdfMakerItem(SAMPLE_PDF_BYTES);
  const result = await core.nameInvoicePdf(original, 'INV-2026-0001', store.helpersFor(original));
  assert.ok(store.readBytes(result.binary.data).equals(SAMPLE_PDF_BYTES));
});

test('renaming: stored metadata and the item agree on the file name', async () => {
  const store = createFakeN8nBinaryStore();
  const original = store.usePdfMakerItem(SAMPLE_PDF_BYTES);
  const result = await core.nameInvoicePdf(original, 'INV-2026-0001', store.helpersFor(original));
  assert.equal(store.storedMetadata(result.binary.data).fileName, result.binary.data.fileName);
  assert.equal(result.binary.data.fileName, result.json.fileName);
});

test('renaming: works for inline binary data (default binary mode)', async () => {
  const item = {
    json: {},
    binary: { data: { data: SAMPLE_PDF_BYTES.toString('base64'), mimeType: 'application/pdf', fileName: 'output.pdf' } },
  };
  const store = createFakeN8nBinaryStore();
  const result = await core.nameInvoicePdf(item, 'INV-2026-0001', store.helpersFor(item));
  assert.equal(result.binary.data.fileName, 'INV-2026-0001.pdf');
  assert.ok(store.readBytes(result.binary.data).equals(SAMPLE_PDF_BYTES));
});

test('renaming: a repeated run gives the same name and does not change the input item', async () => {
  const store = createFakeN8nBinaryStore();
  const original = store.usePdfMakerItem(SAMPLE_PDF_BYTES);
  const before = JSON.stringify(original);
  const first = await core.nameInvoicePdf(original, 'SAMPLE-2026-0001', store.helpersFor(original));
  const second = await core.nameInvoicePdf(original, 'SAMPLE-2026-0001', store.helpersFor(original));
  assert.equal(first.binary.data.fileName, 'SAMPLE-2026-0001.pdf');
  assert.equal(second.binary.data.fileName, 'SAMPLE-2026-0001.pdf');
  assert.equal(store.downloadName(second.binary.data), 'SAMPLE-2026-0001.pdf');
  assert.equal(JSON.stringify(original), before);
});

test('renaming fails clearly when the binary output is missing', async () => {
  const store = createFakeN8nBinaryStore();
  await assert.rejects(core.nameInvoicePdf({ json: {} }, 'INV-1', store.helpersFor({})), /no binary property "data"/);
  await assert.rejects(core.nameInvoicePdf({ json: {}, binary: {} }, 'INV-1', store.helpersFor({})), /no binary property "data"/);
  await assert.rejects(core.nameInvoicePdf(undefined, 'INV-1', store.helpersFor({})), /no binary property "data"/);
  assert.equal(store.storeCalls, 0);
});

test('renaming fails when the binary data is not a PDF', async () => {
  const store = createFakeN8nBinaryStore();
  const item = store.usePdfMakerItem(Buffer.from('<html>not a pdf</html>'));
  await assert.rejects(
    core.nameInvoicePdf(item, 'INV-1', store.helpersFor(item)),
    /does not contain PDF bytes/,
  );
  assert.equal(store.storeCalls, 1);
});

test('displayed figures reconcile exactly with each other', () => {
  const model = money(
    invoice({
      taxRate: 0.0725,
      items: [
        { description: 'a', quantity: 3.333, unitPrice: 19.99 },
        { description: 'b', quantity: 7, unitPrice: 0.15 },
        { description: 'c', quantity: 0.5, unitPrice: 1.01 },
      ],
    }),
  );
  const lineSum = model.lines.reduce((sum, line) => sum + line.amountMinor, 0n);
  assert.equal(lineSum, model.subtotalMinor);
  assert.equal(model.subtotalMinor + model.taxMinor, model.totalMinor);
  assert.equal(model.taxMinor, core.roundHalfUpDivide(model.subtotalMinor * 725n, 10000n));
});
