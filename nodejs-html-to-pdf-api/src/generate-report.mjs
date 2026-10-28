// Generates a PDF sales report from fictional data using the UsePDFMaker HTML-to-PDF API.
//
// Requirements: Node.js 18+ (uses the built-in fetch, FormData and Blob). No npm packages.
// Usage:        USEPDFMAKER_API_KEY=<your_api_key> node src/generate-report.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_URL = 'https://api.usepdfmaker.com/convert';
const apiKey = process.env.USEPDFMAKER_API_KEY;

if (!apiKey) {
  console.error('Missing USEPDFMAKER_API_KEY. Set it in your environment. Never commit the key.');
  process.exit(1);
}

// Fictional data. In a real application this would come from your database or an API.
const report = {
  title: 'Monthly sales report',
  period: 'October 2026',
  company: 'Example Shop Ltd. (fictional)',
  regions: [
    { name: 'North', orders: 412, revenue: 38250.0 },
    { name: 'South', orders: 287, revenue: 26110.5 },
    { name: 'West', orders: 355, revenue: 31740.25 },
  ],
};

const esc = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);

const money = (n) => `USD ${n.toFixed(2)}`;

function buildReportHtml(data) {
  const totalOrders = data.regions.reduce((sum, r) => sum + r.orders, 0);
  const totalRevenue = data.regions.reduce((sum, r) => sum + r.revenue, 0);

  const rows = data.regions
    .map(
      (r) => `
      <tr>
        <td>${esc(r.name)}</td>
        <td class="num">${r.orders}</td>
        <td class="num">${money(r.revenue)}</td>
        <td class="num">${money(r.revenue / r.orders)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${esc(data.title)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 13px; }
    h1 { margin: 0 0 4px; font-size: 24px; }
    .sub { color: #666; margin-bottom: 24px; }
    .kpis { display: flex; gap: 16px; margin-bottom: 24px; }
    .kpi { flex: 1; border: 1px solid #ddd; padding: 12px; border-radius: 4px; }
    .kpi .v { font-size: 20px; font-weight: bold; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 6px; border-bottom: 1px solid #ddd; text-align: left; }
    th { background: #f3f3f3; font-size: 12px; text-transform: uppercase; }
    .num { text-align: right; white-space: nowrap; }
    tfoot td { font-weight: bold; border-top: 2px solid #1a1a1a; }
    footer { margin-top: 40px; font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <h1>${esc(data.title)}</h1>
  <div class="sub">${esc(data.company)} &middot; ${esc(data.period)}</div>

  <div class="kpis">
    <div class="kpi">Orders<div class="v">${totalOrders}</div></div>
    <div class="kpi">Revenue<div class="v">${money(totalRevenue)}</div></div>
    <div class="kpi">Average order<div class="v">${money(totalRevenue / totalOrders)}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Region</th>
        <th class="num">Orders</th>
        <th class="num">Revenue</th>
        <th class="num">Average order</th>
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
    <tfoot>
      <tr>
        <td>Total</td>
        <td class="num">${totalOrders}</td>
        <td class="num">${money(totalRevenue)}</td>
        <td class="num">${money(totalRevenue / totalOrders)}</td>
      </tr>
    </tfoot>
  </table>

  <footer>Generated with fictional data.</footer>
</body>
</html>`;
}

async function htmlToPdf(html) {
  const form = new FormData();
  // The file field name must be "files". The filename ends in .html so the API routes it to the HTML converter.
  form.append('files', new Blob([html], { type: 'text/html' }), 'report.html');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey },
    body: form,
  });

  if (!res.ok) {
    // Error responses are JSON, e.g. { "error": "..." }. Include the body to make failures easy to debug.
    const detail = await res.text();
    throw new Error(`UsePDFMaker returned HTTP ${res.status}: ${detail}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const html = buildReportHtml(report);
  const pdf = await htmlToPdf(html);

  // Sanity check: a valid PDF starts with the bytes "%PDF".
  if (pdf.subarray(0, 4).toString('latin1') !== '%PDF') {
    throw new Error('Response is not a PDF');
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = join(here, '..', 'output');
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, 'monthly-sales-report.pdf');
  await writeFile(outPath, pdf);

  console.log(`Saved ${outPath} (${pdf.length} bytes)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
