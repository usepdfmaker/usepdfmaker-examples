// Step 2 of the example: build the HTML quotation from the incoming quotation data.
// Output field `quotationHtml` is what the UsePDFMaker node converts to PDF.

const q = $input.first().json;

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);

const money = (amount) => `${q.currency} ${Number(amount).toFixed(2)}`;

const lines = q.items.map((item) => ({
  ...item,
  amount: item.quantity * item.unitPrice,
}));

const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
const tax = subtotal * q.taxRate;
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

const quotationHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Quotation ${esc(q.quotationNumber)}</title>
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
    .terms { margin-top: 32px; line-height: 1.5; }
    footer { margin-top: 40px; font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <header>
    <div><h1>QUOTATION</h1><div>${esc(q.seller.name)}</div></div>
    <div class="meta">
      <div><strong>Quotation #:</strong> ${esc(q.quotationNumber)}</div>
      <div><strong>Issue date:</strong> ${esc(q.issueDate)}</div>
      <div><strong>Valid until:</strong> ${esc(q.validUntil)}</div>
    </div>
  </header>

  <section class="parties">
    <div>
      <div class="label">From</div>
      <div>${esc(q.seller.name)}</div>
      <div>${esc(q.seller.address)}</div>
      <div>${esc(q.seller.email)}</div>
    </div>
    <div>
      <div class="label">Prepared for</div>
      <div>${esc(q.customer.name)}</div>
      <div>Attn: ${esc(q.customer.contact)}</div>
      <div>${esc(q.customer.address)}</div>
      <div>${esc(q.customer.email)}</div>
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
    <div><span>Tax (${(q.taxRate * 100).toFixed(0)}%)</span><span>${money(tax)}</span></div>
    <div class="grand"><span>Estimated total</span><span>${money(total)}</span></div>
  </div>

  <section class="terms">
    <div class="label">Payment terms</div>
    <div>${esc(q.paymentTerms)}</div>
  </section>

  <footer>Sample quotation generated with fictional data. Prices are estimates and valid until the date shown.</footer>
</body>
</html>`;

return [
  {
    json: {
      quotationNumber: q.quotationNumber,
      subtotal,
      tax,
      total,
      quotationHtml,
    },
  },
];
