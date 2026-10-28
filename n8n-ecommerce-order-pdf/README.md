# E-commerce order PDFs with n8n and UsePDFMaker

A small, importable [n8n](https://n8n.io) workflow that turns an order into a PDF order confirmation:

```
New order data → HTML order document → UsePDFMaker HTML to PDF → PDF (binary output)
```

## The business problem

Online shops often send order confirmations as plain emails with no printable record, or they export orders one at a time by hand for warehouse packing slips and customer records. This workflow shows how to generate a consistent PDF order document from order data, with SKUs, quantities, shipping, tax and total, ready to attach to an email, store, or print.

Everything in this example uses **fictional data**. No real customer, store, payment detail, or credential is included.

## What is in this folder

| Path | What it is |
|---|---|
| `workflow/usepdfmaker-order-to-pdf.json` | Importable n8n workflow (4 nodes) |
| `workflow/src/` | The two Code-node scripts (order data and HTML template). Edit these, then rebuild. |
| `samples/order-sample.html` | The HTML the template produces for the fictional order |
| `scripts/build-workflow.mjs` | Regenerates the workflow JSON from `workflow/src/` |

## Requirements

- An n8n instance that supports community nodes (self-hosted or cloud, depending on your plan)
- The community node **`n8n-nodes-usepdfmaker`** (published on npm)
- A UsePDFMaker API key from the [dashboard](https://app.usepdfmaker.com/dashboard). Conversions use credits from your plan.

## Quick start

1. In n8n, install the community node: **Settings → Community Nodes → Install**, then enter `n8n-nodes-usepdfmaker`.
2. Import `workflow/usepdfmaker-order-to-pdf.json`: **Workflows → Import from File**.
3. Create a **UsePDFMaker API** credential with your API key and attach it to the **UsePDFMaker** node.
4. Click **Execute workflow**. Open the **UsePDFMaker** node output and download the binary field **`data`** (`output.pdf`).

## How it works

| Node | Type | Role |
|---|---|---|
| Manual Trigger | `n8n-nodes-base.manualTrigger` | Starts the run. In production, use a Shopify, WooCommerce or webhook trigger. |
| New Order Data | Code | Fictional order: order number, date, customer, SKU lines, shipping fee, tax rate, delivery and payment labels |
| Build Order HTML | Code | Escapes values, computes subtotal, shipping, tax and total, and renders a print-ready A4 HTML order document |
| UsePDFMaker | `n8n-nodes-usepdfmaker.usePdfMaker` (operation `htmlToPdf`) | Converts `$json.orderHtml` to PDF and returns the PDF as binary `data` |

## Adapt it to your store

- **Trigger:** replace the first Code node with your store's order webhook or a node for your platform. The fields must match `workflow/src/new-order-data.js`.
- **Template:** edit `workflow/src/build-order-html.js` (logo, store details, return policy). Then run `node scripts/build-workflow.mjs`.
- **Delivery:** add an email or storage node after UsePDFMaker. This is not included in the example.

## Limitations

- The published node supports HTML, URL and document conversion. This example uses only **HTML to PDF**.
- The example does not include payment data. Do not put full card numbers or other sensitive payment data into order documents.
- The workflow does not send email or store files. Both are left to you.
- The Code nodes have been run locally. The workflow has **not** been run end to end in n8n against the live API with a real key. See [Testing status](../README.md#testing-status).

## Rebuild

```bash
node scripts/build-workflow.mjs   # Node 18+, no dependencies
```

## Get started with UsePDFMaker

Create an account and get an API key at [app.usepdfmaker.com](https://app.usepdfmaker.com/dashboard). Read the [HTML to PDF guide](https://usepdfmaker.com/convert/html-to-pdf) for the full HTML-to-PDF options.

## License

The UsePDFMaker community node is MIT licensed. This example is licensed under the [MIT License](../LICENSE). The UsePDFMaker community node is separately MIT licensed.
