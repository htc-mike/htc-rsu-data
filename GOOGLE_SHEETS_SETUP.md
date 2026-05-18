# Google Sheets to PostgreSQL Setup Guide

This module allows you to read data from Google Sheets and write it to your PostgreSQL database.

## Prerequisites

1. Google Account with access to the target spreadsheet
2. PostgreSQL database configured (already set up in your project)

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Create Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create service account credentials:
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in service account details (e.g., name: "sheets-reader")
   - Click "Create and Continue"
5. Create and download the JSON key file:
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Select "JSON" and click "Create"
   - Save the downloaded JSON file securely (rename it to `google_sheets_credentials.json`)

### 3. Share the Google Sheet with Service Account

1. Open your service account JSON file and find the `client_email` field
2. Open your Google Sheet
3. Click "Share" button
4. Enter the service account email address
5. Give it "Editor" permissions
6. Click "Send"

### 4. Configure Environment Variables

Add the following line to your `.env` file:

```
GOOGLE_SHEETS_CREDENTIALS_PATH=path/to/your/google_sheets_credentials.json
```

For example:
```
GOOGLE_SHEETS_CREDENTIALS_PATH=./google_sheets_credentials.json
```

## Usage

### Basic Usage

```python
from google_sheets_reader import GoogleSheetsReader, extract_spreadsheet_id, extract_gid

# Your Google Sheet URL
url = "https://docs.google.com/spreadsheets/d/1W8x7EpzBTCkLTwf0-6vkhBbQc7nK_j-bvOKzn6CjyQo/edit?pli=1&gid=0#gid=0"

# Extract ID and GID from URL
spreadsheet_id = extract_spreadsheet_id(url)
gid = extract_gid(url)

# Initialize the reader
reader = GoogleSheetsReader()

# Sync the sheet to PostgreSQL (creates table if needed)
df = reader.sync_sheet_to_postgres(
    spreadsheet_id=spreadsheet_id,
    table_name="google_sheet_data",
    gid=gid,
    truncate=True  # Set to False to append instead of replace
)
```

### Advanced Options

```python
from google_sheets_reader import GoogleSheetsReader
from postgres_db import PostgresDB

# Use custom database instance
db = PostgresDB.from_env()
reader = GoogleSheetsReader(db=db)

# Read specific sheet by name
df = reader.read_sheet(
    spreadsheet_id="your-sheet-id",
    sheet_name="Sheet2"
)

# Read specific range
df = reader.read_sheet(
    spreadsheet_id="your-sheet-id",
    range_name="Sheet1!A1:Z100"
)

# Write to database without truncating
reader.write_to_postgres(df, "my_table", truncate=False)
```

## Running the Example

```bash
python example_google_sheets_sync.py
```

## Notes

- The module uses service account authentication for Google Sheets API
- Table columns are automatically created based on the sheet headers
- All columns are created as VARCHAR type
- Use `truncate=True` to replace existing data, or `truncate=False` to append
- The module uses your existing PostgreSQL configuration from `.env`
