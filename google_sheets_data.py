from google_sheets_reader import GoogleSheetsReader
from postgres_db import PostgresDB
import pandas as pd

def main():
    # Your Google Sheet URL
    register_2025 = "https://docs.google.com/spreadsheets/d/11UcY5yXI30zKHo-1YUherJTVdHHiDZL8eUbZtDhpCpQ/edit?gid=0#gid=0"
    register_2026 = "https://docs.google.com/spreadsheets/d/1W8x7EpzBTCkLTwf0-6vkhBbQc7nK_j-bvOKzn6CjyQo/edit?pli=1&gid=0#gid=0"

    write_register(register_2026)

def write_register(url):
    reader = GoogleSheetsReader()
    df = reader.read_sheet(url)

    db = PostgresDB.from_env()

    # cols = ','.join([f'{c} varchar' for c in df.columns])
    # print(f"\nColumns: {cols}")

    # print(f"\nData preview:")
    print(f"\nTotal rows: {len(df)}")

    df.rename(columns={
        "Number": "number", 
        "Date": "trans_date", 
        "To/From": "to_from", 
        "Description": "description", 
        "Deposit": "deposit", 
        "Withdrawal": "withdrawal", 
        "": "note", 
        "Balance": "balance", 
        "Bank Balance": "bank_balance", 
        "Statement Balance": "statement_balance", 
        "Outstanding Checks": "outstanding_checks"
    }, inplace=True)

    df['trans_date'] = pd.to_datetime(df['trans_date'], format='%m/%d/%y')
    max_date = df['trans_date'].max()
    df['trans_year'] = max_date.year
    print(f"Year: {max_date.year}")

    # Clean currency columns: remove $ and commas, convert to numeric
    currency_columns = ['deposit', 'balance', 'bank_balance', 'statement_balance', 'outstanding_checks']
    for col in currency_columns:
        if col in df.columns:
            df[col] = df[col].astype(str).str.replace('$', '', regex=False).str.replace(',', '', regex=False)
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # Select only the columns we want to insert
    columns_to_insert = ['number', 'trans_date', 'to_from', 'description', 'deposit', 'withdrawal', 'note', 'balance', 'bank_balance', 'statement_balance', 'outstanding_checks', 'trans_year']
    df = df[columns_to_insert]

    # Insert data into database
    sql = f"DELETE FROM htc.check_register_raw WHERE trans_year = {max_date.year}"
    db.execute(sql)
    db.insert_df(df, 'htc.check_register_raw')


if __name__ == "__main__":
    main()
