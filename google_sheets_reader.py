import pandas as pd
import os
from dotenv import load_dotenv
from postgres_db import PostgresDB


class GoogleSheetsReader:
    """
    Read data from Google Sheets and write to PostgreSQL database.
    Uses service account authentication for API access.
    """
    
    def __init__(self, credentials_path=None, db=None):
        """
        Initialize Google Sheets reader.
        
        Args:
            credentials_path: Path to Google Sheets service account JSON credentials
            db: PostgresDB instance (optional, will create from env if not provided)
        """
        load_dotenv()
        
        self.credentials_path = credentials_path or os.getenv('GOOGLE_SHEETS_CREDENTIALS_PATH')
        self.db = db or PostgresDB.from_env()
        
        if not self.credentials_path:
            raise ValueError(
                "Google Sheets credentials path not provided. "
                "Set GOOGLE_SHEETS_CREDENTIALS_PATH environment variable or pass credentials_path parameter."
            )
    
    def read_sheet(self, spreadsheet_url, sheet_name=None, gid=None, range_name=None):
        """
        Read data from a Google Sheet.
        
        Args:
            spreadsheet_id: The spreadsheet ID from the URL (e.g., '1W8x7EpzBTCkLTwf0-6vkhBbQc7nK_j-bvOKzn6CjyQo')
            sheet_name: Name of the sheet to read (optional)
            gid: Sheet GID (optional, used if sheet_name not provided)
            range_name: Specific range to read (e.g., 'Sheet1!A1:Z100')
            
        Returns:
            pandas DataFrame with the sheet data
        """
        try:
            import gspread
            from google.oauth2.service_account import Credentials
        except ImportError:
            raise ImportError(
                "gspread and google-auth libraries are required. "
                "Install them with: pip install gspread google-auth"
            )
        
        # Authenticate with Google Sheets API
        scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
        creds = Credentials.from_service_account_file(self.credentials_path, scopes=scope)
        client = gspread.authorize(creds)


        # Extract ID and GID from URL
        spreadsheet_id = self._extract_spreadsheet_id(spreadsheet_url)
        gid = self._extract_gid(spreadsheet_url)

        # Open the spreadsheet
        spreadsheet = client.open_by_key(spreadsheet_id)
        
        # Select the worksheet
        if range_name:
            worksheet = spreadsheet.worksheet(range_name.split('!')[0])
            data = worksheet.get(range_name.split('!')[1] if '!' in range_name else None)
        elif sheet_name:
            worksheet = spreadsheet.worksheet(sheet_name)
            data = worksheet.get_all_records()
        elif gid:
            # Find worksheet by GID
            worksheet = spreadsheet.get_worksheet_by_id(int(gid))
            data = worksheet.get_all_records()
        else:
            # Use first worksheet
            worksheet = spreadsheet.sheet1
            data = worksheet.get_all_records()
        
        # Convert to DataFrame
        df = pd.DataFrame(data)
        
        return df

    def _extract_spreadsheet_id(self, url):
        """
        Extract spreadsheet ID from a Google Sheets URL.
        
        Args:
            url: Full Google Sheets URL
            
        Returns:
            Spreadsheet ID string
        """
        import re
        match = re.search(r'/d/([a-zA-Z0-9-_]+)', url)
        if match:
            return match.group(1)
        raise ValueError("Could not extract spreadsheet ID from URL")


    def _extract_gid(self, url):
        """
        Extract GID from a Google Sheets URL.
        
        Args:
            url: Full Google Sheets URL
            
        Returns:
            GID string or None
        """
        import re
        match = re.search(r'gid=(\d+)', url)
        if match:
            return match.group(1)
        return None


if __name__ == "__main__":
    # Example usage
    url = "https://docs.google.com/spreadsheets/d/1W8x7EpzBTCkLTwf0-6vkhBbQc7nK_j-bvOKzn6CjyQo/edit?pli=1&gid=0#gid=0"
    
    # Extract ID and GID from URL
    spreadsheet_id = GoogleSheetsReader._extract_spreadsheet_id(url)
    gid = GoogleSheetsReader._extract_gid(url)
    
    # Create reader and sync
    reader = GoogleSheetsReader()
    df = reader.read_sheet(url)
    print(df)

