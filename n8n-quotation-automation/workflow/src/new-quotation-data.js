// Step 1 of the example: "new quotation data".
// All values below are FICTIONAL. In a real workflow, replace this Code node with
// a Webhook, CRM (HubSpot, Pipedrive), Google Sheets or database node that outputs the same fields.

const items = [
  { description: 'Brand identity package', quantity: 1, unitPrice: 1800 },
  { description: 'Landing page design (per page)', quantity: 2, unitPrice: 650 },
  { description: 'Project management (hours)', quantity: 12, unitPrice: 85 },
];

return [
  {
    json: {
      quotationNumber: 'QUO-2026-0042',
      issueDate: '2026-10-28',
      validUntil: '2026-11-27',
      currency: 'USD',
      taxRate: 0.1,
      paymentTerms: '50% on signature, 50% on delivery',
      seller: {
        name: 'Example Creative Agency',
        address: '10 Sample Road, Springfield',
        email: 'hello@example.com',
      },
      customer: {
        name: 'Sample Retail Ltd.',
        contact: 'Jane Doe (fictional)',
        address: '77 Demo Street, Testville',
        email: 'procurement@sample-retail.example',
      },
      items,
    },
  },
];
