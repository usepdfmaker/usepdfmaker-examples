# UsePDFMaker Examples

Practical examples for generating PDFs with the [UsePDFMaker](https://usepdfmaker.com) HTML-to-PDF API. Each example solves a common business task: you write the document in HTML and CSS, send it to the API, and receive a PDF.

All examples use **fictional data** and read the API key from an environment variable or an n8n credential. No real customer, company, or credential is included.

## Examples

| Example | Tool | Business use case |
|---|---|---|
| [n8n-invoice-automation](n8n-invoice-automation/) | n8n | Create invoices from structured data instead of editing copies by hand. Totals and tax are calculated in the workflow. |
| [n8n-quotation-automation](n8n-quotation-automation/) | n8n | Produce client-ready quotations from CRM or sheet data, with consistent layout and calculated totals. |
| [n8n-ecommerce-order-pdf](n8n-ecommerce-order-pdf/) | n8n | Generate a printable order confirmation with SKUs, shipping, tax and total from order data. |
| [nodejs-html-to-pdf-api](nodejs-html-to-pdf-api/) | Node.js | Generate PDF reports from a backend application. No npm packages are required. |
| [python-html-to-pdf-api](python-html-to-pdf-api/) | Python | Generate PDF reports from a Python application or data job. One dependency (`requests`). |

## Directory structure

```
usepdfmaker-examples/
├── README.md
├── LICENSE
├── .gitignore
├── n8n-invoice-automation/
│   ├── README.md
│   ├── TUTORIAL.md
│   ├── samples/invoice-sample.html
│   ├── scripts/build-workflow.mjs
│   ├── workflow/
│   │   ├── usepdfmaker-invoice-to-pdf.json      # importable into n8n
│   │   └── src/                                  # Code-node sources
├── n8n-quotation-automation/
│   ├── README.md
│   ├── samples/quotation-sample.html
│   ├── scripts/build-workflow.mjs
│   └── workflow/ (usepdfmaker-quotation-to-pdf.json, src/)
├── n8n-ecommerce-order-pdf/
│   ├── README.md
│   ├── samples/order-sample.html
│   ├── scripts/build-workflow.mjs
│   └── workflow/ (usepdfmaker-order-to-pdf.json, src/)
├── nodejs-html-to-pdf-api/
│   ├── README.md
│   ├── package.json
│   ├── .env.example
│   └── src/generate-report.mjs
└── python-html-to-pdf-api/
    ├── README.md
    ├── requirements.txt
    ├── .env.example
    └── generate_report.py
```

## Requirements

- For the n8n examples: an n8n instance that supports community nodes, and the community node [`n8n-nodes-usepdfmaker`](https://www.npmjs.com/package/n8n-nodes-usepdfmaker)
- For the Node.js example: Node.js 18 or newer
- For the Python example: Python 3.9 or newer
- For all examples: a UsePDFMaker API key

## Get started with UsePDFMaker

1. [Create an account](https://app.usepdfmaker.com/register) and open the [dashboard](https://app.usepdfmaker.com/dashboard) to get an API key.
2. Read the [API documentation](https://usepdfmaker.com/docs) for all endpoints and options.
3. Read the [HTML to PDF guide](https://usepdfmaker.com/convert/html-to-pdf) for the request format used in the code examples.
4. For n8n, see the [UsePDFMaker n8n integration page](https://usepdfmaker.com/integrations/n8n).

Conversions use credits from your plan. Check the dashboard for current limits and pricing.

## Security notes

- Keep API keys out of source code and out of commits. The Node.js and Python examples read `USEPDFMAKER_API_KEY` from the environment. Use `.env.example` only as a template.
- The `.gitignore` files exclude `.env`, generated `output/` folders, and virtual environments.
- The HTML templates escape dynamic values (`esc()` in the n8n Code nodes, `html.escape` in Python, and the escaping helper in Node.js). If you add your own fields, escape them too.
- Do not put full card numbers, passwords, or other sensitive payment data into generated documents.

## Testing status

This section describes what has and has not been checked. No example has been run end to end against the live UsePDFMaker API from this repository.

**Checked locally:**

- The n8n workflow JSON files parse and are regenerated from their Code-node sources with the `scripts/build-workflow.mjs` scripts.
- The Code nodes of the three n8n examples run with a stub input and produce complete HTML documents. The totals match hand calculations.
- `node --check` passes for the Node.js script. Running it without an API key exits with a clear error.
- `py_compile` passes for the Python script. Its HTML builder produces a complete document. Running it without an API key exits with a clear error (checked in a virtual environment with `requests` installed).
- The Node.js HTML builder was checked in isolation and produced a complete document.

**Live API checks:**

- An unauthenticated request to the conversion endpoint returns HTTP 401, which confirms the endpoint is reachable and requires a key. No conversion was performed and no credits were used.

**Not checked:**

- No authenticated conversion has been run for any example. No API key was available to the test run, so the generated PDFs have not been produced or inspected.
- The n8n workflows have not been imported into n8n and run.

Run each example once with your own API key before you rely on it.

## Contributing

Issues and suggestions are welcome. Please do not include real API keys, customer data, or private documents in issues or pull requests.

## License

The code and documentation in this repository are licensed under the [MIT License](LICENSE), Copyright (c) 2026 JustFlow Solutions LTD. This license applies to this examples repository only. It does not change the license of the UsePDFMaker product or its API.
