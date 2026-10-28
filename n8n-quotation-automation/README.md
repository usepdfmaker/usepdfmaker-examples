# Automated PDF quotation generation with n8n and UsePDFMaker

A small, importable [n8n](https://n8n.io) workflow that turns quotation data into a client-ready PDF:

```
New quotation data → HTML quotation template → UsePDFMaker HTML to PDF → PDF (binary output)
```

## The business problem

Sales teams often write quotes by hand in a spreadsheet or copy a previous document and edit it. That takes time, invites mistakes in totals and tax, and delays the reply to a prospect. This workflow shows how to build the quote from structured data, so every quote has the same layout and the totals are calculated, not typed.

Everything in this example uses **fictional data**. No real customer, company, or credential is included.

## What is in this folder

| Path | What it is |
|---|---|
| `workflow/usepdfmaker-quotation-to-pdf.json` | Importable n8n workflow (4 nodes) |
| `workflow/src/` | The two Code-node scripts (quotation data and HTML template). Edit these, then rebuild. |
| `samples/quotation-sample.html` | The HTML the template produces for the fictional quotation |
| `scripts/build-workflow.mjs` | Regenerates the workflow JSON from `workflow/src/` |

## Requirements

- An n8n instance that supports community nodes (self-hosted or cloud, depending on your plan)
- The community node **`n8n-nodes-usepdfmaker`** (published on npm)
- A UsePDFMaker API key from the [dashboard](https://app.usepdfmaker.com/dashboard). Conversions use credits from your plan.

## Quick start

1. In n8n, install the community node: **Settings → Community Nodes → Install**, then enter `n8n-nodes-usepdfmaker`.
2. Import `workflow/usepdfmaker-quotation-to-pdf.json`: **Workflows → Import from File**.
3. Create a **UsePDFMaker API** credential with your API key and attach it to the **UsePDFMaker** node.
4. Click **Execute workflow**. Open the **UsePDFMaker** node output and download the binary field **`data`** (`output.pdf`).

## How it works

| Node | Type | Role |
|---|---|---|
| Manual Trigger | `n8n-nodes-base.manualTrigger` | Starts the run. Swap for a Webhook (for example from your CRM) in production. |
| New Quotation Data | Code | Fictional quotation: number, validity date, seller, customer, line items, tax rate, payment terms |
| Build Quotation HTML | Code | Escapes values, computes subtotal, tax and total, and renders a print-ready A4 HTML quotation |
| UsePDFMaker | `n8n-nodes-usepdfmaker.usePdfMaker` (operation `htmlToPdf`) | Converts `$json.quotationHtml` to PDF and returns the PDF as binary `data` |

## Adapt it to your process

- **Data source:** replace the first Code node with a CRM, spreadsheet or database node that outputs the same fields.
- **Template:** edit `workflow/src/build-quotation-html.js` (logo, colors, legal text). Then run `node scripts/build-workflow.mjs`.
- **Delivery:** add an email node after UsePDFMaker to send the quote to the customer. This is not included in the example.

## Limitations

- The published node supports HTML, URL and document conversion. This example uses only **HTML to PDF**.
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
