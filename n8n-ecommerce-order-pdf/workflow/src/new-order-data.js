// Step 1 of the example: "new order data".
// All values below are FICTIONAL. In a real workflow, replace this Code node with
// a Shopify, WooCommerce, Stripe or webhook trigger that outputs the same fields.

const items = [
  { sku: 'MUG-BLU-01', description: 'Ceramic mug, blue (350 ml)', quantity: 2, unitPrice: 14.0 },
  { sku: 'TEE-M-BLK', description: 'Cotton T-shirt, black, size M', quantity: 1, unitPrice: 22.5 },
  { sku: 'STK-PACK-5', description: 'Sticker pack (5 designs)', quantity: 3, unitPrice: 4.0 },
];

return [
  {
    json: {
      orderNumber: 'ORD-2026-00317',
      orderDate: '2026-10-28',
      currency: 'USD',
      taxRate: 0.08,
      shippingFee: 5.9,
      paymentMethod: 'Card (sample data, masked)',
      shippingMethod: 'Standard shipping, 3-5 business days',
      customer: {
        name: 'Sample Shopper',
        email: 'shopper@sample-mail.example',
        address: '5 Example Lane, Testville, TS 12345',
      },
      items,
    },
  },
];
