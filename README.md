# RSU HTC Data Sync

Automated data synchronization system for RunSignUp (RSU) race data to a PostgreSQL database, deployed via GitHub Actions, with a web application for data visualization and management.

## Overview

This project synchronizes race event data from RunSignUp's API to a PostgreSQL database. It supports:
- Race events and event details
- User registrations
- Donations and donation periods
- User memberships
- Race results (optional)

The system consists of:
- **Data Sync Engine**: Automated synchronization via GitHub Actions
- **Web Application**: React frontend with direct Supabase database access for data visualization and management

The data sync is designed to run automatically on a schedule (daily at 6:00 and 18:00 UTC) via GitHub Actions, with manual trigger capability.

## Architecture

```
┌─────────────────┐    OAuth2    ┌──────────────────┐
│  RunSignUp API  │◄────────────►│   RSU OAuth2      │
└─────────────────┘              └──────────────────┘
                                          │
                                          ▼
┌─────────────────┐              ┌──────────────────┐
│  PostgreSQL DB  │◄────────────►│   RSU API        │
│  (htc.config)   │              │   RSU Data       │
└─────────────────┘              └──────────────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │ rsu_htc_data.py  │
                                │  (Main Script)   │
                                └──────────────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │  GitHub Actions  │
                                │   (Scheduled)    │
                                └──────────────────┘

┌─────────────────┐              ┌──────────────────┐
│   React App     │◄────────────►│   Supabase       │
│  (Webapp)       │   Direct DB  │   PostgreSQL    │
└─────────────────┘              └──────────────────┘
```

## Components

### Core Files

#### `rsu_htc_data.py`
Main entry point for data synchronization. Coordinates the sync process:
- Initializes database connection via `PostgresDB.from_env()`
- Creates `RSU_Data` instance with database connection
- Controls which data types to refresh via configuration flags
- Calls specific update functions for each data type

**Configuration Flags:**
- `REFRESH_EVENTS` - Sync race events (default: False)
- `REFRESH_REGISTRATIONS` - Sync user registrations (default: False)
- `REFRESH_DONATIONS` - Sync donations (default: False)
- `REFRESH_MEMBERS` - Sync user memberships (default: False)
- `REFRESH_RESULTS` - Sync race results (default: False)
- `RACE_ID` - Limit sync to specific race ID (default: None)

#### `postgres_db.py`
Database abstraction layer for PostgreSQL connections using psycopg2.

**Key Features:**
- `from_env()` class method - Initialize from environment variables
- Supports Supabase via `SUPABASE_DB_URL` (Supavisor connection string)
- Falls back to local database via `LOCAL_DB_*` variables
- Automatic SSL mode for Supabase hosts
- Connection string parsing for Supabase connection pooler

**Environment Variables:**
- `SUPABASE_DB_URL` - Supavisor connection string (recommended for Supabase)
- `LOCAL_DB_HOST` - Local database host (fallback)
- `LOCAL_DB_PORT` - Local database port (fallback)
- `LOCAL_DB_NAME` - Local database name (fallback)
- `LOCAL_DB_USER` - Local database user (fallback)
- `LOCAL_DB_PASSWORD` - Local database password (fallback)

#### `rsu_oauth2.py`
OAuth2 authentication handler for RunSignUp API.

**Key Features:**
- PKCE (Proof Key for Code Exchange) flow support
- Token refresh automatic when expired
- Database-based configuration storage (via `htc.config` table)
- Fallback to file-based configuration (legacy)
- Manages access tokens and refresh tokens

**Configuration Storage:**
- Database: `htc.config` table with `system='rsu'`
- Keys: `client_id`, `client_secret`, `access_token`, `refresh_token`, `token_type`, `token_expires_at`, `use_pkce`, `use_test_env`

#### `rsu_api.py`
RunSignUp API client wrapper.

**Key Features:**
- Wraps `RunSignUpOAuth2` for authentication
- Provides high-level API methods
- Supports both OAuth2 instance injection and automatic creation
- Passes database connection to OAuth2 handler

#### `rsu_data.py`
Data synchronization orchestration layer.

**Key Features:**
- Coordinates API calls for different data types
- Manages data transformation between RSU and database formats
- Provides methods for:
  - `get_race_events()` - Fetch race events
  - `get_user_registrations()` - Fetch user registrations
  - `get_donation_periods()` - Fetch donation periods
  - `get_donations()` - Fetch donations
  - `get_user_members()` - Fetch user memberships
  - `get_results()` - Fetch race results

### Web Application

#### `webapp/frontend/`
React application for data visualization and management with direct Supabase database access.

**Key Components:**
- `App.jsx` - Main application with routing
- `Navigation.jsx` - Top navigation bar
- `Races.jsx` - Race listing and details
- `RaceDetail.jsx` - Individual race information
- `Registrations.jsx` - Registration search and view
- `Analytics.jsx` - Dashboard with charts and statistics

**Tech Stack:**
- React 18 with Vite
- TailwindCSS for styling
- React Router for navigation
- Recharts for data visualization
- Lucide React for icons
- Supabase for authentication (Google OAuth)
- Supabase client for direct database access

### Database Schema

#### `htc.config` Table
Stores configuration data, including RSU OAuth credentials.

```sql
CREATE TABLE htc.config (
    system VARCHAR(50),
    key VARCHAR(50),
    value TEXT,
    PRIMARY KEY (system, key)
);
```

**RSU Configuration Entries:**
- `client_id` - RunSignUp OAuth client ID
- `client_secret` - RunSignUp OAuth client secret
- `access_token` - Current OAuth access token
- `refresh_token` - OAuth refresh token
- `token_type` - Token type (typically "Bearer")
- `token_expires_at` - Token expiration timestamp
- `use_pkce` - Whether to use PKCE flow (true/false)
- `use_test_env` - Whether to use test environment (true/false)

#### Data Tables
- `htc.races` - Race information
- `htc.events` - Event details within races
- `htc.users` - User information
- `htc.registrations` - User registrations for events
- `htc.donation_periods` - Donation campaign periods
- `htc.donations` - Individual donation records
- `htc.memberships` - User membership information
- `htc.results` - Race results

### GitHub Actions Workflow

#### `.github/workflows/data-sync.yml`
Automated workflow for scheduled data synchronization.

**Schedule:**
- Runs daily at 6:00 and 18:00 UTC
- Manual trigger available via workflow_dispatch

**Steps:**
1. Checkout code
2. Set up Python 3.11
3. Install dependencies from `requirements.txt`
4. Run `rsu_htc_data.py` with `SUPABASE_DB_URL` environment variable

**Required Secrets:**
- `SUPABASE_DB_URL` - Supavisor connection string for Supabase database

#### `.github/workflows/deploy.yml`
Automated workflow for deploying the web application to GitHub Pages.

**Triggers:**
- Push to main branch
- Manual trigger

**Steps:**
1. Checkout code
2. Set up Node.js
3. Install frontend dependencies
4. Build frontend
5. Deploy to GitHub Pages

**Configuration:**
- Base path: `/htc-rsu-data/` for GitHub Pages subdirectory
- OAuth callback: `/htc-rsu-data/auth/callback`

## Setup Instructions

### Prerequisites

1. PostgreSQL database (Supabase recommended)
2. RunSignUp OAuth application credentials
3. Python 3.11+
4. GitHub account (for GitHub Actions)

### Local Setup

#### Data Sync Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/htc-mike/htc-rsu-data.git
   cd htc-rsu-data
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   Create `.env` file:
   ```env
   SUPABASE_DB_URL=postgresql://postgres.YOUR_PROJECT_ID:YOUR_PASSWORD@aws-0-YOUR-REGION.pooler.supabase.com:6543/postgres
   ```

4. **Migrate RSU OAuth config to database:**
   Run the migration script (one-time):
   ```bash
   python migrate_rsu_config.py
   ```
   This loads your RSU client credentials from a JSON file into the `htc.config` table.

5. **Run the sync script:**
   ```bash
   python rsu_htc_data.py
   ```

#### Web Application Setup

1. **Frontend setup:**
   ```bash
   cd webapp/frontend
   npm install
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`

2. **Configure frontend environment:**
   Create `webapp/frontend/.env`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

### GitHub Actions Setup

1. **Fork/Clone the repository to GitHub**

2. **Add GitHub Secrets:**
   - Go to repository Settings → Secrets and variables → Actions
   - Add `SUPABASE_DB_URL` with your Supavisor connection string

3. **Enable GitHub Actions:**
   - Actions should be enabled automatically
   - The workflow will run on schedule (6:00 and 18:00 UTC)
   - Manual trigger available via Actions tab

### Supabase Setup

1. **Create Supabase project:**
   - Go to https://supabase.com
   - Create a new project

2. **Enable Connection Pooling:**
   - Go to Settings → Database → Connection Pooling
   - Enable Supavisor
   - Copy the "Transaction mode" connection string

3. **Create database schema:**
   - Run the SQL to create `htc.config` table
   - Create data tables as needed

4. **Get connection string:**
   - Use the Supavisor connection string for both local and GitHub Actions

## Troubleshooting

### Connection Issues

**"Network is unreachable" (IPv6):**
- Your Supabase database host may be IPv6-only
- Solution: Use Supavisor connection string (IPv4-compatible)

**"Tenant or user not found":**
- Incorrect connection string
- Solution: Verify your Supabase connection string from dashboard

**"Connection timed out":**
- Wrong IP address or network restrictions
- Solution: Use Supavisor connection string

### OAuth Issues

**Token expired:**
- The system automatically refreshes tokens
- Check `htc.config` table for `token_expires_at`

**Authentication failed:**
- Verify OAuth credentials in `htc.config` table
- Ensure `client_id` and `client_secret` are correct

### GitHub Actions Issues

**Workflow fails:**
- Check Actions logs for specific error
- Verify `SUPABASE_DB_URL` secret is set correctly
- Ensure workflow is using latest code

**Schedule not running:**
- Check workflow schedule settings
- Verify cron expression is correct
- Manual trigger available for testing

## Development

### Adding New Data Types

1. Add API method in `rsu_data.py`
2. Add update function in `rsu_htc_data.py`
3. Add configuration flag
4. Create/update database table
5. Test locally before deploying

### Database Migration

Use `migrate_rsu_config.py` to migrate configuration from file to database:
```bash
python migrate_rsu_config.py
```

## Dependencies

See `requirements.txt`:
- `psycopg2-binary==2.9.9` - PostgreSQL adapter
- `pandas==2.2.0` - Data manipulation
- `requests==2.31.0` - HTTP requests
- `python-dotenv==1.0.0` - Environment variables
- `python-dateutil==2.8.2` - Date parsing

## License

[Your License Here]

## Support

For issues or questions:
1. Check this README
2. Review GitHub Actions logs
3. Check Supabase dashboard
4. Verify environment variables
