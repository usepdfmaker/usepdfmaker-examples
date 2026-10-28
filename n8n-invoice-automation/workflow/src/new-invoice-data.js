// Step 1 of the example: "new invoice data".
// All values below are FICTIONAL. In a real workflow, replace this Code node with
// a Webhook, Google Sheets, Airtable, CRM or database node that outputs the same fields.

const items = [
  { description: 'Website design - homepage', quantity: 1, unitPrice: 1200 },
  { description: 'Monthly hosting (March)', quantity: 3, unitPrice: 49.5 },
  { description: 'SEO audit', quantity: 1, unitPrice: 350 },
];

return [
  {
    json: {
      invoiceNumber: 'INV-2026-0001',
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
      items,
    },
  },
];
