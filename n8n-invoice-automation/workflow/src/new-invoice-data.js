// Step 1 of the example: "new invoice data".
//
// - Manual Trigger (no input data): uses the SAMPLE invoice below. All values are FICTIONAL, and the
//   invoice number starts with SAMPLE- so it cannot be mistaken for a real one.
// - Any other input (for example a Webhook): uses that payload. If the input has a `body` and no `items`,
//   the `body` is used. The payload is NOT replaced by the sample; step 2 validates it and fails on bad data.
//
// In production, the invoice number must come from your own system with persistent numbering.
// See README.md ("Invoice numbers").

const DEMO_INVOICE = {
  invoiceNumber: 'SAMPLE-2026-0001',
  issueDate: '2026-10-28',
  dueDate: '2026-11-27',
  currency: 'USD',
  taxRate: 0.2,
  seller: {
    name: 'Example Studio Ltd',
    address: '1 Sample Street, Springfield',
    email: 'billing@example.com',
  },
  customer: {
    name: 'Sample Client Co.',
    address: '42 Demo Avenue, Testville',
    email: 'accounts@sample-client.example',
  },
  items: [
    { description: 'Website design - homepage', quantity: 1, unitPrice: 1200 },
    { description: 'Monthly hosting (March)', quantity: 3, unitPrice: 49.5 },
    { description: 'SEO audit', quantity: 1, unitPrice: 350 },
  ],
};

const incoming = $input.first().json || {};
const isSample = Object.keys(incoming).length === 0;
const usesBody = !isSample && incoming.body !== undefined && incoming.items === undefined;
const payload = isSample ? DEMO_INVOICE : usesBody ? incoming.body : incoming;

if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
  throw new Error('Invoice input must be a JSON object. Received a different type.');
}

return [
  {
    json: { ...payload, isSample },
  },
];
