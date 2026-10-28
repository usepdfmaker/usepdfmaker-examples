// Step 2 of the example: build the HTML order document from the incoming order data.
// Output field `orderHtml` is what the UsePDFMaker node converts to PDF.

const order = $input.first().json;

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);

const money = (amount) => `${order.currency} ${Number(amount).toFixed(2)}`;

const lines = order.items.map((item) => ({
  ...item,
  amount: item.quantity * item.unitPrice,
}));

const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
const tax = subtotal * order.taxRate;
const total = subtotal + tax + order.shippingFee;

const rows = lines
  .map(
    (line) => `
      <tr>
        <td>${esc(line.sku)}</td>
        <td>${esc(line.description)}</td>
        <td class="num">${esc(line.quantity)}</td>
        <td class="num">${money(line.unitPrice)}</td>
        <td class="num">${money(line.amount)}</td>
      </tr>`,
  )
  .join('');

const orderHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Order ${esc(order.orderNumber)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 13px; }
    header { border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; }
    h1 { margin: 0; font-size: 24px; letter-spacing: 1px; }
    .info { display: flex; justify-content: space-between; margin: 20px 0; line-height: 1.6; }
    .info div { width: 48%; }
    .label { font-weight: bold; text-transform: uppercase; font-size: 11px; color: #666; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 6px; border-bottom: 1px solid #ddd; text-align: left; }
    th { background: #f3f3f3; font-size: 12px; text-transform: uppercase; }
    .num { text-align: right; white-space: nowrap; }
    .totals { margin-top: 16px; margin-left: auto; width: 45%; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { font-weight: bold; font-size: 15px; border-top: 2px solid #1a1a1a; margin-top: 4px; padding-top: 8px; }
    footer { margin-top: 40px; font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <header>
    <h1>ORDER CONFIRMATION</h1>
    <div>Order #: ${esc(order.orderNumber)} &nbsp;|&nbsp; Date: ${esc(order.orderDate)}</div>
  </header>

  <section class="info">
    <div>
      <div class="label">Customer</div>
      <div>${esc(order.customer.name)}</div>
      <div>${esc(order.customer.email)}</div>
      <div>${esc(order.customer.address)}</div>
    </div>
    <div>
      <div class="label">Delivery</div>
      <div>${esc(order.shippingMethod)}</div>
      <div class="label" style="margin-top:12px">Payment</div>
      <div>${esc(order.paymentMethod)}</div>
    </div>
  </section>

  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>Item</th>
        <th class="num">Qty</th>
        <th class="num">Unit price</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${money(subtotal)}</span></div>
    <div><span>Shipping</span><span>${money(order.shippingFee)}</span></div>
    <div><span>Tax (${(order.taxRate * 100).toFixed(0)}%)</span><span>${money(tax)}</span></div>
    <div class="grand"><span>Order total</span><span>${money(total)}</span></div>
  </div>

  <footer>Sample order generated with fictional data. Keep this document for your records.</footer>
</body>
</html>`;

return [
  {
    json: {
      orderNumber: order.orderNumber,
      subtotal,
      tax,
      total,
      orderHtml,
    },
  },
];
