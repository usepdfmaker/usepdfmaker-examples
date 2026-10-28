"""Generate a PDF sales report from fictional data with the UsePDFMaker HTML-to-PDF API.

Requirements: Python 3.9+ and the `requests` package (see requirements.txt).
Usage:        USEPDFMAKER_API_KEY=<your_api_key> python generate_report.py
"""

import html
import os
import sys
from pathlib import Path

import requests

API_URL = "https://api.usepdfmaker.com/convert"
OUTPUT_PATH = Path(__file__).resolve().parent / "output" / "monthly-sales-report.pdf"

# Fictional data. In a real application this would come from your database or an API.
REPORT = {
    "title": "Monthly sales report",
    "period": "October 2026",
    "company": "Example Shop Ltd. (fictional)",
    "regions": [
        {"name": "North", "orders": 412, "revenue": 38250.00},
        {"name": "South", "orders": 287, "revenue": 26110.50},
        {"name": "West", "orders": 355, "revenue": 31740.25},
    ],
}


def money(value: float) -> str:
    return f"USD {value:,.2f}"


def build_report_html(data: dict) -> str:
    total_orders = sum(r["orders"] for r in data["regions"])
    total_revenue = sum(r["revenue"] for r in data["regions"])

    rows = "".join(
        f"""
      <tr>
        <td>{html.escape(r["name"])}</td>
        <td class="num">{r["orders"]}</td>
        <td class="num">{money(r["revenue"])}</td>
        <td class="num">{money(r["revenue"] / r["orders"])}</td>
      </tr>"""
        for r in data["regions"]
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{html.escape(data["title"])}</title>
  <style>
    @page {{ size: A4; margin: 18mm; }}
    body {{ font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 13px; }}
    h1 {{ margin: 0 0 4px; font-size: 24px; }}
    .sub {{ color: #666; margin-bottom: 24px; }}
    .kpis {{ display: flex; gap: 16px; margin-bottom: 24px; }}
    .kpi {{ flex: 1; border: 1px solid #ddd; padding: 12px; border-radius: 4px; }}
    .kpi .v {{ font-size: 20px; font-weight: bold; margin-top: 4px; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ padding: 8px 6px; border-bottom: 1px solid #ddd; text-align: left; }}
    th {{ background: #f3f3f3; font-size: 12px; text-transform: uppercase; }}
    .num {{ text-align: right; white-space: nowrap; }}
    tfoot td {{ font-weight: bold; border-top: 2px solid #1a1a1a; }}
    footer {{ margin-top: 40px; font-size: 11px; color: #666; }}
  </style>
</head>
<body>
  <h1>{html.escape(data["title"])}</h1>
  <div class="sub">{html.escape(data["company"])} &middot; {html.escape(data["period"])}</div>

  <div class="kpis">
    <div class="kpi">Orders<div class="v">{total_orders}</div></div>
    <div class="kpi">Revenue<div class="v">{money(total_revenue)}</div></div>
    <div class="kpi">Average order<div class="v">{money(total_revenue / total_orders)}</div></div>
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
    <tbody>{rows}
    </tbody>
    <tfoot>
      <tr>
        <td>Total</td>
        <td class="num">{total_orders}</td>
        <td class="num">{money(total_revenue)}</td>
        <td class="num">{money(total_revenue / total_orders)}</td>
      </tr>
    </tfoot>
  </table>

  <footer>Generated with fictional data.</footer>
</body>
</html>"""


def html_to_pdf(document: str, api_key: str) -> bytes:
    response = requests.post(
        API_URL,
        headers={"X-API-KEY": api_key},
        # The field name must be "files". The filename ends in .html so the API routes it to the HTML converter.
        files={"files": ("report.html", document.encode("utf-8"), "text/html")},
        timeout=120,
    )
    if response.status_code != 200:
        # Error responses are JSON, e.g. {"error": "..."}. Include the body to make failures easy to debug.
        raise RuntimeError(f"UsePDFMaker returned HTTP {response.status_code}: {response.text}")
    return response.content


def main() -> int:
    api_key = os.environ.get("USEPDFMAKER_API_KEY")
    if not api_key:
        print("Missing USEPDFMAKER_API_KEY. Set it in your environment. Never commit the key.", file=sys.stderr)
        return 1

    pdf = html_to_pdf(build_report_html(REPORT), api_key)

    # Sanity check: a valid PDF starts with the bytes "%PDF".
    if not pdf.startswith(b"%PDF"):
        raise RuntimeError("Response is not a PDF")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_bytes(pdf)
    print(f"Saved {OUTPUT_PATH} ({len(pdf)} bytes)")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, requests.RequestException) as err:
        print(err, file=sys.stderr)
        sys.exit(1)
