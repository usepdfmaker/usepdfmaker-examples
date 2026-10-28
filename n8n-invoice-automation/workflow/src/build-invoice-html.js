// Step 2 of the example: build the HTML invoice from the incoming invoice data.
// Output field `invoiceHtml` is what the UsePDFMaker node converts to PDF.

const inv = $input.first().json;

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);

const money = (amount) => `${inv.currency} ${Number(amount).toFixed(2)}`;

const lines = inv.items.map((item) => ({
  ...item,
  amount: item.quantity * item.unitPrice,
}));

const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
const tax = subtotal * inv.taxRate;
const total = subtotal + tax;

const rows = lines
  .map(
    (line) => `
      <tr>
        <td>${esc(line.description)}</td>
        <td class="num">${esc(line.quantity)}</td>
        <td class="num">${money(line.unitPrice)}</td>
        <td class="num">${money(line.amount)}</td>
      </tr>`,
  )
  .join('');

const invoiceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Invoice ${esc(inv.invoiceNumber)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 13px; }
    header { display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; }
    h1 { margin: 0; font-size: 26px; letter-spacing: 1px; }
    .meta { text-align: right; line-height: 1.6; }
    .parties { display: flex; justify-content: space-between; margin: 24px 0; }
    .parties div { width: 48%; line-height: 1.5; }
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
    <div><h1>INVOICE</h1><div>${esc(inv.seller.name)}</div></div>
    <div class="meta">
      <div><strong>Invoice #:</strong> ${esc(inv.invoiceNumber)}</div>
      <div><strong>Issue date:</strong> ${esc(inv.issueDate)}</div>
      <div><strong>Due date:</strong> ${esc(inv.dueDate)}</div>
    </div>
  </header>

  <section class="parties">
    <div>
      <div class="label">From</div>
      <div>${esc(inv.seller.name)}</div>
      <div>${esc(inv.seller.address)}</div>
      <div>${esc(inv.seller.email)}</div>
    </div>
    <div>
      <div class="label">Bill to</div>
      <div>${esc(inv.customer.name)}</div>
      <div>${esc(inv.customer.address)}</div>
      <div>${esc(inv.customer.email)}</div>
    </div>
  </section>

  <table>
    <thead>
      <tr>
        <th>Description</th>
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
    <div><span>Tax (${(inv.taxRate * 100).toFixed(0)}%)</span><span>${money(tax)}</span></div>
    <div class="grand"><span>Total due</span><span>${money(total)}</span></div>
  </div>

  <footer>Sample invoice generated with fictional data. Payment terms: due within 30 days.</footer>
</body>
</html>`;

return [
  {
    json: {
      invoiceNumber: inv.invoiceNumber,
      subtotal,
      tax,
      total,
      invoiceHtml,
    },
  },
];
