# Generate PDF invoices automatically with n8n and UsePDFMaker

A small, importable [n8n](https://n8n.io) workflow that turns invoice data into a PDF:

```
New invoice data → HTML invoice template → UsePDFMaker HTML to PDF → PDF (binary output)
```

## The business problem

Small businesses and freelancers often create invoices by copying a previous file and editing it by hand. Totals, tax, and invoice numbers are easy to get wrong, and the work repeats for every client. This workflow builds the invoice from structured data, calculates the totals in code, and produces a consistent PDF that can be emailed or stored.

Everything in this example uses **fictional data**. No real customer, company, or credential is included.

## What is in this repo

| Path | What it is |
|---|---|
| `workflow/usepdfmaker-invoice-to-pdf.json` | Importable n8n workflow (4 nodes) |
| `workflow/src/` | The two Code-node scripts (invoice data, HTML template). Edit these, then rebuild. |
| `samples/invoice-sample.html` | The HTML the template produces for the fictional invoice |
| `scripts/build-workflow.mjs` | Regenerates the workflow JSON from `workflow/src/` |
| `TUTORIAL.md` | Step-by-step setup and the optional email extension |

## Requirements

- An n8n instance that supports community nodes (self-hosted or cloud, depending on your plan)
- The community node **`n8n-nodes-usepdfmaker`** (published on npm, currently 1.0.14)
- A UsePDFMaker API key from the [dashboard](https://app.usepdfmaker.com/dashboard). Conversions use credits from your plan.

## Quick start

1. In n8n, install the community node: **Settings → Community Nodes → Install**, then enter `n8n-nodes-usepdfmaker`.
2. Import `workflow/usepdfmaker-invoice-to-pdf.json`: **Workflows → Import from File**.
3. Create a **UsePDFMaker API** credential with your API key and attach it to the **UsePDFMaker** node.
4. Click **Execute workflow**. Open the **UsePDFMaker** node output and download the binary field **`data`** (`output.pdf`).

The full walkthrough is in [TUTORIAL.md](TUTORIAL.md).

## How it works

| Node | Type | Role |
|---|---|---|
| Manual Trigger | `n8n-nodes-base.manualTrigger` | Starts the run. Swap for a Webhook or a spreadsheet/CRM trigger in production. |
| New Invoice Data | Code | Fictional invoice: number, dates, seller, customer, line items, tax rate |
| Build Invoice HTML | Code | Escapes values, computes subtotal, tax and total, and renders a print-ready A4 HTML invoice |
| UsePDFMaker | `n8n-nodes-usepdfmaker.usePdfMaker` (operation `htmlToPdf`) | Converts `$json.invoiceHtml` to PDF and returns the PDF as binary `data` |

## Limitations

- The published node supports HTML, URL and document conversion. This example uses only **HTML to PDF**.
- The published node does not expose async or batch conversion.
- The workflow does not send email or store files. Both are optional extensions covered in the tutorial.
- The Code nodes have been run locally. The workflow has **not** been run end to end in n8n against the live API with a real key. See [Testing status](../README.md#testing-status).

## Re-generate

```bash
node scripts/build-workflow.mjs   # rebuild the JSON from workflow/src/ (Node 18+, no dependencies)
```

## Get started with UsePDFMaker

Create an account and get an API key at [app.usepdfmaker.com](https://app.usepdfmaker.com/register). Read the [HTML to PDF guide](https://usepdfmaker.com/convert/html-to-pdf) for the full HTML-to-PDF options.

## License

The UsePDFMaker community node is MIT licensed (see the `LICENSE` file in its repository). This example is licensed under the [MIT License](../LICENSE).
