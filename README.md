# Short Pick Calculator

A simple Excel/CSV-based dashboard for tracking:

- short pick percentage
- SKU item performance
- picker performance
- false short pick percentage
- not found item percentage
- location analysis

## Features

- Upload Excel (.xlsx/.xls) or CSV exports
- Auto-detect field mappings for common labels
- Manual column mapping for custom exports
- Live summary cards
- SKU, picker, and location breakdown tables
- Sample Excel template download

## How to use

1. Open the app in a browser.
2. Click "Choose Excel or CSV file".
3. Select your export.
4. Map the columns if needed.
5. Review the summary and breakdown tables.

## Run locally

You can open `index.html` directly in a browser, or run a simple local server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Files

- `index.html` – dashboard layout
- `styles.css` – styling
- `app.js` – import logic and calculations

## Shareable link

This project is ready to be hosted as a static web page. When enabled in GitHub Pages, the app can be opened from a browser link that can be shared in Microsoft Teams, SharePoint, or other portals.

Example link format after enabling GitHub Pages:

```text
https://<your-user>.github.io/short-pick-calculator/
```




































































