# Tutorial: generate a PDF invoice with n8n and UsePDFMaker

In this tutorial you import a small n8n workflow. It builds an HTML invoice from invoice data and converts it to a PDF with the UsePDFMaker community node.

Time: about 15 minutes, excluding account setup.

> All invoice data in the example is fictional. Replace it with your own data when you adapt the workflow.

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
2. Four nodes appear:

   | Node | What it does |
   |---|---|
   | **Manual Trigger** | Starts the run when you click Execute |
   | **New Invoice Data** | Code node with fictional invoice data (number, dates, seller, customer, line items, tax rate) |
   | **Build Invoice HTML** | Code node that escapes the values, calculates subtotal, tax and total, and builds an A4 HTML invoice |
   | **UsePDFMaker** | Converts `invoiceHtml` to PDF using the **HTML to PDF** operation |

3. Open the **UsePDFMaker** node. The credential field shows a placeholder. Select your **UsePDFMaker API** credential from Step 2.

## Step 4: Run it

1. Click **Execute workflow**.
2. Open the output of the **UsePDFMaker** node.
3. Open the **Binary** tab. The field is named **`data`**, and the file is `output.pdf` (`application/pdf`).
4. Download the file and open it. You should see invoice `INV-2026-0001` with a subtotal of USD 1,698.50, tax of USD 339.70, and a total of **USD 2,038.20**.

If you want to check the HTML before converting, open the **Build Invoice HTML** output or the local copy in `samples/invoice-sample.html`.

## Step 5: Adapt it to your data

1. Replace **New Invoice Data** with a real source. Common options:
   - **Webhook** trigger, receiving JSON from your shop or form
   - **Google Sheets** or **Airtable** node that reads one invoice row
   - Your CRM or database node
2. Keep the same field names (`invoiceNumber`, `issueDate`, `dueDate`, `currency`, `taxRate`, `seller`, `customer`, `items`). Or update `workflow/src/build-invoice-html.js` to match your fields.
3. Edit the HTML and CSS in `build-invoice-html.js` to match your branding. Keep the `esc()` helper so user-supplied text is escaped.

## Optional extension A: email the PDF

This extension uses a standard n8n email node. It is **not** included in the importable workflow and was **not tested** in this example.

1. Add a **Send Email** node (or **Gmail**) after **UsePDFMaker**.
2. Set the recipient, subject, and body.
3. Add the PDF as an attachment from the binary field `data`. The exact field name depends on the node version. Check the attachment option in your node's UI.

## Optional extension B: trigger from a webhook

1. Replace **Manual Trigger** with a **Webhook** node (HTTP method POST).
2. Send invoice JSON to the webhook URL, using the same field names as **New Invoice Data**.
3. Make sure the **Build Invoice HTML** node reads the webhook body as its input. You may need to map `body.*` fields in the first Code node.

## Limitations to know

- The published node (v1.0.14) provides HTML, URL and document conversion. This tutorial uses **HTML to PDF** only.
- The published node does not include async or batch conversion. For very large jobs, check the current UsePDFMaker documentation before you design around them.
- Each conversion uses credits from your plan.
- Fonts and external assets (images, stylesheets) depend on what the converter can load. Embed or inline them when possible.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Credential not found" or the node does not run | The credential was not selected on the UsePDFMaker node |
| 401 or authentication error | The API key is wrong or was rotated. Create a new key in the dashboard and update the credential |
| "UsePDFMaker convert response is neither PDF bytes nor JSON with pdf_url" | The API returned an unexpected body. Retry, and check the account's status and credits |
| The PDF has no styling | A `<style>` block was stripped or the CSS was changed. Compare with `samples/invoice-sample.html` |
