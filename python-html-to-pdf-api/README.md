# Generate PDF reports from Python with the UsePDFMaker API

A small Python script that builds an HTML sales report from data, sends it to the UsePDFMaker HTML-to-PDF API, and saves the PDF.

```
Report data → HTML template (in code) → POST /convert → PDF file
```

Everything in this example uses **fictional data**.

## The business problem

Python back ends and data jobs often end with a report that someone has to read or sign: a monthly summary, a client statement, an audit pack. Generating these PDFs with low-level drawing code is slow to write and hard to change. This example keeps the layout in HTML and CSS, which is easy to edit, and uses an API to render the PDF.

## Requirements

- Python 3.9 or newer
- The `requests` package (listed in `requirements.txt`)
- A UsePDFMaker API key from the [dashboard](https://app.usepdfmaker.com/dashboard)

## Quick start

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS / Linux: source .venv/bin/activate
pip install -r requirements.txt

# macOS / Linux
export USEPDFMAKER_API_KEY="your_api_key_here"
python generate_report.py

# Windows PowerShell
$env:USEPDFMAKER_API_KEY = "your_api_key_here"
python generate_report.py
```

The PDF is written to `output/monthly-sales-report.pdf`.

The script reads the key from the `USEPDFMAKER_API_KEY` environment variable. Do not commit a real key. `.env.example` shows the variable name only.

## How it works

| Step | Code |
|---|---|
| Build the HTML | `build_report_html()` in `generate_report.py` (values are escaped with `html.escape`) |
| Send it | `requests.post` to `https://api.usepdfmaker.com/convert` with the header `X-API-KEY` and a file field `files` |
| Check the result | Non-200 responses raise an error that includes the body. The script checks that the response starts with `%PDF`. |
| Save | Writes the bytes to `output/` |

The request matches the documented Python example on the [HTML to PDF page](https://usepdfmaker.com/convert/html-to-pdf).

## Adapt it to your application

- Replace `REPORT` with rows from your database, a CSV file, or an API.
- Edit the CSS in `build_report_html()` for your branding. The `@page` rule controls page size and margins.
- Call `html_to_pdf()` from a web framework view or a scheduled job, then return the bytes or attach them to an email.

## Limitations

- This example uses the synchronous conversion endpoint. For very large documents or batch jobs, check the API documentation for the async and batch options.
- There are no retries. Add them in production if your workload needs them.
- The script has been checked for syntax, its HTML output has been generated and checked locally (no PDF was rendered), and its missing-key error path has been run. It has **not** been run end to end with a real API key. See [Testing status](../README.md#testing-status).

## Files

| Path | What it is |
|---|---|
| `generate_report.py` | The script |
| `requirements.txt` | One dependency: `requests` |
| `.env.example` | Shows the environment variable name only |

## Get started with UsePDFMaker

Create an account and get an API key at [app.usepdfmaker.com](https://app.usepdfmaker.com/dashboard). Read the [HTML to PDF guide](https://usepdfmaker.com/convert/html-to-pdf) for the full options.

## License

This example is licensed under the [MIT License](../LICENSE).
