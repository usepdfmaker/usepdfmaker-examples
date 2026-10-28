# Generate PDF invoices automatically with n8n and UsePDFMaker

A small, importable [n8n](https://n8n.io) workflow that turns invoice data into a PDF:

```
Invoice data → validate and calculate → HTML invoice → UsePDFMaker HTML to PDF → rename PDF → PDF (binary output)
```

## The business problem

Small businesses and freelancers often create invoices by copying a previous file and editing it by hand. Totals, tax, and invoice numbers are easy to get wrong, and the work repeats for every client. This workflow checks the invoice data, calculates the totals in code, and produces a consistent PDF that can be emailed or stored.

This is an **educational example**, not a production accounting system. It shows the pattern. It does not replace a system that issues legally valid invoices. Read [Production requirements](#production-requirements) and [Known limitations](#known-limitations) before you adapt it.

Everything in the example uses **fictional data**. No real customer, company, or credential is included.

## What is in this folder

| Path | What it is |
|---|---|
| `workflow/usepdfmaker-invoice-to-pdf.json` | Importable n8n workflow (5 nodes). Generated. Do not edit by hand. |
| `workflow/src/new-invoice-data.js` | Code node 1: demo invoice, or the input from a trigger such as a Webhook |
| `workflow/src/build-invoice-html.js` | Code node 2: validates the data, calculates the totals, renders the HTML |
| `workflow/src/name-pdf-file.js` | Code node 4: names the PDF after the invoice number |
| `workflow/src/lib/invoice-core.js` | Shared validation, money, escaping and file-name logic. It is pasted into each Code node at build time. |
| `samples/invoice-sample.html` | The HTML the demo produces. Generated. |
| `scripts/build-workflow.mjs` | Regenerates the JSON and the sample from `workflow/src/`. `--check` verifies they are current. |
| `scripts/lib/code-nodes.mjs` | Helpers that compose and run the Code-node scripts locally (used by the build and tests) |
| `tests/` | Dependency-free tests for Node's built-in test runner |
| `TUTORIAL.md` | Step-by-step setup, the adaptation guide, and the error-workflow setup |

## Status: what is demo, what is tested, what is not

This example was run once in a real n8n instance with a live UsePDFMaker API key (not included in this repository). Its results are listed below. Each claim is limited to what was checked.

**Demo functionality** (for learning and the Manual Trigger run)
- Manual Trigger runs the fictional **SAMPLE** invoice `SAMPLE-2026-0001`. The invoice number is marked as a sample.
- The demo PDF is named `SAMPLE-2026-0001.pdf`.

**Verified in a real n8n instance** (one manual test run, by the maintainer)
- All five workflow nodes ran successfully.
- UsePDFMaker API authentication and HTML-to-PDF conversion succeeded.
- The invoice calculations were correct for the demo data.
- The PDF downloaded as `SAMPLE-2026-0001.pdf`, and its content and layout were checked visually.
- A negative `unitPrice` was rejected by validation with a clear error. The demo price was then restored to `1200`.

**Tested locally** (`node --test tests/invoice-core.test.mjs tests/workflow.test.mjs`, 49 tests, run on Node.js v24.18.0)
- Validation of every input field, including invalid quantities, prices, tax rates, currencies, dates and invoice numbers.
- Rounding and exact totals, including decimal edge cases.
- HTML escaping of user-controlled text, and the fractional tax-rate labels.
- The file naming step: the name, MIME type, PDF bytes, metadata, missing binary data, and repeated runs. The download behaviour was checked against a model of n8n's storage, not against n8n itself.
- Generated files match their sources (`node scripts/build-workflow.mjs --check`).

The tests run the same Code-node scripts that the workflow contains, in plain Node.js, with stubs for `$input`, `$()` and the node helpers.

**Not tested** (no test has been run for these; check them yourself before relying on them)
- Webhook input (the code path exists, but no run with a webhook has been recorded).
- Error workflows, failure notifications and retries (see the setup steps in the tutorial).
- Email delivery or any other extension in the tutorial.
- Multiple invoices, concurrent runs, or duplicate invoice numbers.
- Other n8n versions, other binary data modes, and other PDF converter behaviour.

## Requirements

- An n8n instance that supports community nodes (self-hosted or cloud, depending on your plan)
- The community node **`n8n-nodes-usepdfmaker`** (published on npm, currently 1.0.14)
- A UsePDFMaker API key from the [dashboard](https://app.usepdfmaker.com/dashboard). Conversions use credits from your plan.

## Quick start

1. In n8n, install the community node: **Settings → Community Nodes → Install**, then enter `n8n-nodes-usepdfmaker`.
2. Import `workflow/usepdfmaker-invoice-to-pdf.json`: **Workflows → Import from File**.
3. Create a **UsePDFMaker API** credential with your API key and attach it to the **UsePDFMaker** node.
4. Click **Execute workflow**. Open the **Name PDF File** node output and download the binary field **`data`** (`SAMPLE-2026-0001.pdf`).

The full walkthrough is in [TUTORIAL.md](TUTORIAL.md).

## How it works

| Node | Type | Role |
|---|---|---|
| Manual Trigger | `n8n-nodes-base.manualTrigger` | Starts the demo run. Replace it with a Webhook or a CRM/spreadsheet trigger in production. |
| New Invoice Data | Code | With no input data: the SAMPLE invoice. With input (for example a Webhook): that payload, read from `body` when present. |
| Build Invoice HTML | Code | Validates all fields (stops with a clear error if one is wrong), calculates the totals in minor units, and renders the HTML |
| UsePDFMaker | `n8n-nodes-usepdfmaker.usePdfMaker` (operation `htmlToPdf`) | Converts `$json.invoiceHtml` to PDF and returns the PDF as binary `data` |
| Name PDF File | Code | Stores the same PDF bytes again under `<invoiceNumber>.pdf` and keeps the MIME type. See [PDF file name](#pdf-file-name). |

## Input data

The invoice is a JSON object with these fields. All amounts are in the currency given by `currency`.

| Field | Required | Rules |
|---|---|---|
| `invoiceNumber` | yes | Letters, digits, `.`, `_`, `-`. Starts with a letter or digit. At most 40 characters. See [Invoice numbers](#invoice-numbers). |
| `issueDate` | yes | Real calendar date, `YYYY-MM-DD` |
| `dueDate` | yes | Real calendar date, `YYYY-MM-DD`, on or after `issueDate` |
| `currency` | yes | Three letters, for example `USD` or `EUR`. Stored in upper case. |
| `taxRate` | yes | A number from 0 to 1 (`0.2` = 20%). At most 2 decimal places in percent (`0.075` = 7.5% is valid, `0.07125` is not). |
| `seller.name` | yes | Text, 1 to 200 characters |
| `seller.address`, `seller.email` | no | Text (address at most 300 characters). Email must look like an address. |
| `customer.name` | yes | Text, 1 to 200 characters |
| `customer.address`, `customer.email` | no | As for the seller |
| `items` | yes | Array of 1 to 200 lines |
| `items[].description` | yes | Text, 1 to 200 characters |
| `items[].quantity` | yes | Number greater than 0 and at most 10000, with at most 3 decimal places |
| `items[].unitPrice` | yes | Number from 0 to 1000000, with at most 2 decimal places |

Numbers must be JSON numbers. Strings such as `"2"` are rejected. Values that are `NaN`, `Infinity`, negative, or have too many decimal places are rejected. The workflow never rounds a value silently before validation.

## Money and rounding

- All money is kept as whole minor units (cents). The code uses BigInt, so nothing is summed in floating point.
- **Line amount** = quantity × unit price, rounded half up to the cent.
- **Subtotal** = sum of the line amounts.
- **Tax** = subtotal × tax rate, rounded half up to the cent. Tax is charged on the subtotal, not per line.
- **Total** = subtotal + tax.
- The HTML prints these same values, so the printed line amounts, subtotal, tax and total reconcile exactly.

Real invoices may need a different policy, for example per-line tax or a rule set by a tax authority. Check that with your accountant.

## Invoice numbers

- The demo uses `SAMPLE-2026-0001`. It is fictional and clearly marked as a sample on the PDF.
- A real integration supplies `invoiceNumber` in its input. The workflow validates the format and uses the number on the HTML and in the file name.
- **This workflow does not guarantee uniqueness.** It has no database, so it cannot detect a number that was already used.
- **Production integrations must implement persistent invoice numbering and duplicate prevention**, for example a sequence stored in your database, with the number reserved in a transaction before the PDF is created. Do not generate numbers in this Code node.

## Errors and failed PDFs

- **Validation failures** stop the run in **Build Invoice HTML**. The error message starts with `Invoice validation failed:` and lists every problem found, for example `items[1].quantity must be greater than 0; currency must be a three-letter ISO-style code`. Nothing is sent to UsePDFMaker.
- **Failed PDF generation** (the UsePDFMaker node fails, for example because of an authentication error, no credits, or a network error) stops the run there. No PDF is produced, and the Name PDF File node does not run.
- **Missing PDF output** (the UsePDFMaker node returns no binary `data`) stops the run in **Name PDF File** with an explicit error.

The example does **not** implement production error notifications. The tutorial describes how to attach an n8n error workflow ([Step 6](TUTORIAL.md#step-6-get-notified-when-a-run-fails)). That setup has not been tested.

**Retries must preserve the original invoice number.** A retry re-runs the failed node with the data it received, so the invoice number stays the same. Do not regenerate the number on retry. If you add a retry (**Settings → Retry On Fail** on the UsePDFMaker node), a retry can only create the same invoice again. The duplicate-prevention rule above still applies to the source of the number.

## PDF file name

n8n stores a binary file's name when the file is stored. In filesystem binary mode, the browser download uses that stored name, not the `fileName` field of the item. The UsePDFMaker node stores the PDF as `output.pdf`, so changing only the `fileName` field showed the new name in the panel but downloaded `output.pdf`.

The **Name PDF File** node therefore reads the PDF bytes with `helpers.getBinaryDataBuffer` and stores them again with `helpers.prepareBinaryData(bytes, '<invoiceNumber>.pdf', 'application/pdf')`. The PDF bytes and MIME type do not change. The download name is checked locally against a model of n8n's storage (see `tests/support/n8n-binary-fake.mjs`). The real browser download still has to be checked in n8n (see [Verification in n8n](#verification-in-n8n)).

The UsePDFMaker node is not changed. It cannot know the invoice number.

## Verification in n8n

Verified once, in a real n8n instance with a live UsePDFMaker API key (the key is not part of this repository):

1. All five nodes ran successfully.
2. The UsePDFMaker API authenticated, and the HTML-to-PDF conversion succeeded.
3. The invoice calculations were correct for the demo data.
4. The Binary **Download** produced `SAMPLE-2026-0001.pdf`. The PDF content and layout were checked visually.
5. A negative `unitPrice` was rejected by validation.

Not yet checked in n8n: a second run with the same data, a Webhook input, error workflows, retries, and other n8n versions or binary modes. If a download shows `output.pdf` or `output (1).pdf` for a future version, check the n8n version and the binary mode (**Settings → Binary data**).

## Re-generate and test

```bash
node scripts/build-workflow.mjs            # rebuild the workflow JSON and the sample HTML from workflow/src/
node scripts/build-workflow.mjs --check    # fail if the generated files do not match their sources
node --test tests/invoice-core.test.mjs tests/workflow.test.mjs   # run the tests (no dependencies; run on Node.js v24.18.0)
```

## Production requirements

Before you use this pattern for real invoices, you need:

- **Persistent invoice numbering** with duplicate prevention (see above).
- **Authentication** on any Webhook that accepts invoice data. Anyone who can reach an unauthenticated webhook can create invoices.
- **Storage and audit**: where the PDF goes, how long it is kept, and a record of each invoice that was issued.
- **Tax and legal rules** for your country: required fields, tax calculation, rounding, numbering and retention.
- **Credential handling** in n8n only. Never put an API key in the workflow JSON or in screenshots.
- **Testing with your own data** in your own n8n instance, including a failed-PDF run and the error workflow.
- **Review of the HTML template** for your branding and legal text, and a PDF check of its layout.

## Known limitations

- The published node supports HTML, URL and document conversion. This example uses only **HTML to PDF**.
- The published node does not expose async or batch conversion.
- Amounts support up to 2 decimal places in the currency. Currencies with no minor unit (for example JPY) or 3 decimal places (for example KWD) are not handled. Their amounts are validated as 2-decimal amounts.
- The workflow does not send email or store files. Both are optional extensions covered in the tutorial.
- The workflow does not prevent duplicate invoice numbers, and the invoice numbers are not stored anywhere.
- Input is validated but the data is not checked against a customer or product catalogue.
- A file name that is a reserved name on Windows (such as `CON`) is not changed. Choose invoice numbers that avoid such names.
- The HTML template uses only built-in fonts and inline CSS. Fonts or images from external URLs depend on what the converter can load.
- Persistent invoice numbering, duplicate prevention and production error notifications are **not implemented**. The workflow does not check whether an invoice number was used before.
- Only one real n8n run has been recorded (see [Verification in n8n](#verification-in-n8n)). Webhook input, error workflows, retries and other n8n versions are untested.
- See [Status](#status-what-is-demo-what-is-tested-what-is-not) for what is verified and what is not.
