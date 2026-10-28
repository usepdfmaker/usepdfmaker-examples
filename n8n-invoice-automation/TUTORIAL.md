# Tutorial: generate a PDF invoice with n8n and UsePDFMaker

In this tutorial you import a small n8n workflow. It checks invoice data, builds an HTML invoice, converts it to a PDF with the UsePDFMaker community node, and names the PDF after the invoice number.

Time: about 20 minutes, excluding account setup.

> **Educational example.** All invoice data is fictional and marked as a sample. The workflow is not a production accounting system. Read the [README](README.md#production-requirements) before you adapt it to real invoices.

## What you need

- An n8n instance (self-hosted or cloud) that allows community nodes
- A UsePDFMaker API key from the [dashboard](https://app.usepdfmaker.com/dashboard)
- The files in this folder (`workflow/usepdfmaker-invoice-to-pdf.json`)

## Step 1: Install the UsePDFMaker community node

1. Open n8n and go to **Settings → Community Nodes**.
2. Select **Install** and enter the package name: `n8n-nodes-usepdfmaker`.
3. Confirm and wait for the installation to finish. A **UsePDFMaker** node should appear in the node picker.

Self-hosted alternative: from your n8n custom nodes directory, run `npm install n8n-nodes-usepdfmaker`, then restart n8n.

## Step 2: Get an API key and create a credential

1. Sign in at the [UsePDFMaker dashboard](https://app.usepdfmaker.com/dashboard) and copy your API key.
2. In n8n, go to **Credentials → Create credential** and choose **UsePDFMaker API**.
3. Paste the key into **API Key** and save.

Keep the key out of workflow exports, screenshots, and posts. The credential is stored in n8n and is not part of the workflow JSON.

## Step 3: Import the workflow

1. In n8n, go to **Workflows → Import from File** and choose `workflow/usepdfmaker-invoice-to-pdf.json`.
2. Five nodes appear:

   | Node | What it does |
   |---|---|
   | **Manual Trigger** | Starts the demo run when you click Execute |
   | **New Invoice Data** | With no input: the fictional SAMPLE invoice `SAMPLE-2026-0001`. With input (for example a Webhook): that data. |
   | **Build Invoice HTML** | Validates all fields, calculates the line amounts, subtotal, tax and total in whole cents, and builds the A4 HTML invoice. Stops with an error if the data is invalid. |
   | **UsePDFMaker** | Converts `invoiceHtml` to PDF using the **HTML to PDF** operation |
   | **Name PDF File** | Renames the PDF to `<invoiceNumber>.pdf` (for the demo: `SAMPLE-2026-0001.pdf`) |

3. Open the **UsePDFMaker** node. The credential field shows a placeholder. Select your **UsePDFMaker API** credential from Step 2.

## Step 4: Run the demo

1. Click **Execute workflow**.
2. Open the output of the **Name PDF File** node.
3. Open the **Binary** tab. The field is named **`data`**, the file is `SAMPLE-2026-0001.pdf`, and the type is `application/pdf`.
4. Download the file and open it. The download should be named `SAMPLE-2026-0001.pdf`. If it is named `output.pdf` or `output (1).pdf`, the browser is showing the name n8n stored for the file. See [PDF file name](README.md#pdf-file-name) and [Verification in n8n](README.md#verification-in-n8n). You should see the sample invoice `SAMPLE-2026-0001`, with a subtotal of USD 1698.50, tax of USD 339.70 (20%), and a total of **USD 2038.20**.

To check the HTML before conversion, open the output of **Build Invoice HTML**, or open the copy in `samples/invoice-sample.html`.

> The demo run was checked once in a real n8n instance (all five nodes, a live conversion, and the downloaded `SAMPLE-2026-0001.pdf`). If your total differs from the numbers above, check the **Build Invoice HTML** output first.

## Step 5: Adapt it to your data

1. Replace **Manual Trigger** with a real source, for example:
   - A **Webhook** node (POST). Send invoice JSON to the webhook URL. The data can be in the webhook body. **New Invoice Data** reads the `body` field when it is present and there is no `items` field at the top level.
   - A **Google Sheets** or **Airtable** node that reads one invoice row, or your CRM or database node.
2. Keep the field names: `invoiceNumber`, `issueDate`, `dueDate`, `currency`, `taxRate`, `seller`, `customer`, `items`. The rules for each field are in the [README](README.md#input-data).
3. **Invoice numbers.** The number you send is used as is, after validation. It must be unique, and this workflow does not check that. Production integrations must generate numbers from a persistent sequence and prevent duplicates. See the [README](README.md#invoice-numbers).
4. **Edit the design.** Change the HTML and CSS in `workflow/src/build-invoice-html.js` to match your branding. Keep the `esc` helper (it is `escapeHtml` from the shared library), so user-supplied text is escaped.
5. **Rebuild the workflow JSON** after editing anything in `workflow/src/`, then re-import it:

   ```bash
   node scripts/build-workflow.mjs
   node --test tests/invoice-core.test.mjs tests/workflow.test.mjs
   ```

   Edit `workflow/src/lib/invoice-core.js` only if you change validation or money rules, and update the tests to match.

## Step 6: Get notified when a run fails (not tested)

The example does not implement production error notifications. A failed run stops at the node that failed, and it does not run the rest of the workflow. n8n can send failures to an error workflow. This setup has **not been tested** in this example:

1. Create a new workflow with an **Error Trigger** node, and connect it to the node you want to use to alert you (for example **Send Email**, or a Slack or chat node). Activate this workflow.
2. Open the **Invoice** workflow, then **Workflow settings**. Set **Error workflow** to the error workflow you created. Save.
3. The alert includes the failed node name and the error message. Validation errors (for example `Invoice validation failed: items[1].quantity must be greater than 0`) start with that text, so you can tell them apart from API errors.

## Failed PDF generation and retries

- **Validation failure** (in **Build Invoice HTML**): fix the input data and run again. Nothing was sent to UsePDFMaker.
- **UsePDFMaker failure** (for example an invalid key, no credits, or a network error): check the credential and the account's status, then run again. Retrying the node gives the same invoice number, because the number comes from the input data and is not generated again.
- **Missing PDF output** (in **Name PDF File**): the UsePDFMaker node returned no binary `data`. Open the UsePDFMaker node output and check for an error or an empty response, then run again.

To retry automatically (not tested), set **Settings → Retry On Fail** on the **UsePDFMaker** node. A retry runs the same node with the same input, so the invoice number is preserved. Do not change the invoice number between retries.

## Optional extension A: email the PDF

This extension uses a standard n8n email node. It is **not** included in the importable workflow and was **not tested** in this example.

1. Add a **Send Email** node (or **Gmail**) after **Name PDF File**.
2. Set the recipient, subject, and body.
3. Add the PDF as an attachment from the binary field `data`. The exact field name depends on the node version. Check the attachment option in your node's UI.

## Optional extension B: trigger from a webhook

This extension is covered by Step 5. It has **not been tested** in n8n. Test it with fictional data first, and check that the webhook requires authentication before you expose it.

## Limitations to know

- The published node (v1.0.14) provides HTML, URL and document conversion. This tutorial uses **HTML to PDF** only.
- The published node does not include async or batch conversion. For very large jobs, check the current UsePDFMaker documentation before you design around them.
- Each conversion uses credits from your plan.
- Money supports 2 decimal places in the invoice currency. Currencies with a different number of minor units are not handled.
- Fonts and external assets (images, stylesheets) depend on what the converter can load. Embed or inline them when possible.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Invoice validation failed: ...` in **Build Invoice HTML** | One or more input fields are invalid. The message lists each problem. Fix the data and run again. |
| "Credential not found" or the node does not run | The credential was not selected on the UsePDFMaker node |
| 401 or authentication error | The API key is wrong or was rotated. Create a new key in the dashboard and update the credential |
| "UsePDFMaker convert response is neither PDF bytes nor JSON with pdf_url" | The API returned an unexpected body. Retry, and check the account's status and credits |
| `no binary property "data"` in **Name PDF File** | UsePDFMaker did not return a PDF. Check the **UsePDFMaker** node output for an error |
| The PDF has no styling | A `<style>` block was stripped or the CSS was changed. Compare with `samples/invoice-sample.html` |
| The demo shows a different invoice number or total | The **New Invoice Data** or **Build Invoice HTML** node was edited, or the workflow JSON was not rebuilt. Run `node scripts/build-workflow.mjs --check`. |
