# Generate PDF reports from Node.js with the UsePDFMaker API

A small Node.js script that builds an HTML sales report from data, sends it to the UsePDFMaker HTML-to-PDF API, and saves the PDF. It uses only built-in Node.js features, so there is nothing to install.

```
Report data → HTML template (in code) → POST /convert → PDF file
```

Everything in this example uses **fictional data**.

## The business problem

Backend applications often need to produce PDF reports: monthly sales summaries, account statements, delivery notes, or client reports. Building PDFs in code with a low-level library means writing layout logic by hand. This example shows a simpler approach. Keep the layout in HTML and CSS, and let a rendering API produce the PDF.

## Requirements

- Node.js 18 or newer
- A UsePDFMaker API key from the [dashboard](https://app.usepdfmaker.com/dashboard)

No npm packages are needed.

## Quick start

```bash
# macOS / Linux
export USEPDFMAKER_API_KEY="your_api_key_here"
node src/generate-report.mjs

# Windows PowerShell
$env:USEPDFMAKER_API_KEY = "your_api_key_here"
node src\generate-report.mjs
```

The PDF is written to `output/monthly-sales-report.pdf`.

The script reads the key from the `USEPDFMAKER_API_KEY` environment variable and never stores it in the code. Do not commit a real key. `.env.example` shows the variable name only.

## How it works

| Step | Code |
|---|---|
| Build the HTML | `buildReportHtml()` in `src/generate-report.mjs` |
| Send it | `POST https://api.usepdfmaker.com/convert` with the header `X-API-KEY` and a multipart field `files` containing `report.html` |
| Check the result | Failed requests throw an error with the HTTP status and body. A successful response is a PDF, and the script checks for the `%PDF` header. |
| Save | Writes the bytes to `output/` |

The API request matches the documented HTML-to-PDF example on the [HTML to PDF page](https://usepdfmaker.com/convert/html-to-pdf).

## Adapt it to your application

- Replace the `report` object with data from your database or an internal API.
- Edit the CSS inside `buildReportHtml()` to match your branding. The `@page` rule controls page size and margins.
- Call `htmlToPdf()` from your own route or job, and send the bytes back as `application/pdf` or attach them to an email.

## Limitations

- This example uses the synchronous conversion endpoint. For very large documents or batch jobs, check the API documentation for the async and batch options before you design your system around this.
- The example does not handle retries. Add them in production if your workload needs them.
- The script has been checked for syntax and for its missing-key error path. It has **not** been run end to end with a real API key. See [Testing status](../README.md#testing-status).

## Files

| Path | What it is |
|---|---|
| `src/generate-report.mjs` | The script |
| `package.json` | Scripts only. No dependencies. |
| `.env.example` | Shows the environment variable name. Copy it to `.env` only if you load env files, and never commit `.env`. |

## Get started with UsePDFMaker

Create an account and get an API key at [app.usepdfmaker.com](https://app.usepdfmaker.com/dashboard). Read the [HTML to PDF guide](https://usepdfmaker.com/convert/html-to-pdf) for the full options.

## License

This example is licensed under the [MIT License](../LICENSE).
