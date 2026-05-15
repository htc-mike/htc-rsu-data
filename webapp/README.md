# HTC Race Admin Web Application

A modern web application for running club administrators to manage and analyze race data, registrations, and analytics.

## Features

- **Races Management**: View all races and their details
- **Events**: Browse events within each race
- **Registrations**: Search and view all registrations across races
- **Analytics Dashboard**: Visual insights with charts for revenue, registrations, and race performance

## Tech Stack

### Backend
- Flask (Python web framework)
- PostgreSQL database
- psycopg2 for database connectivity

### Frontend
- React 18 with Vite
- TailwindCSS for styling
- React Router for navigation
- Recharts for data visualization
- Lucide React for icons

## Prerequisites

- Python 3.8+
- Node.js 18+
- PostgreSQL database with htc schema
- Database configuration file at `C:\projects\config\db_config.json`

## Setup Instructions

### 1. Backend Setup

Navigate to the backend directory:

```bash
cd webapp/backend
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Start the Flask API server:

```bash
python app.py
```

The backend API will run on `http://localhost:5000`

### 2. Frontend Setup

Navigate to the frontend directory:

```bash
cd webapp/frontend
```

Install Node.js dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Races
- `GET /api/races` - Get all races
- `GET /api/races/:race_id` - Get specific race details
- `GET /api/races/:race_id/events` - Get events for a race

### Registrations
- `GET /api/registrations` - Get all registrations
- `GET /api/events/:event_id/registrations` - Get registrations for a specific event

### Analytics
- `GET /api/analytics/summary` - Get overall summary statistics
- `GET /api/analytics/race-revenue` - Get revenue data by race
- `GET /api/analytics/registrations-over-time` - Get registration trends over time

### Donations
- `GET /api/donations` - Get recent donations

## Database Configuration

The application expects a database configuration file at `C:\projects\config\db_config.json` with the following format:

```json
{
  "host": "your_host",
  "port": 5432,
  "database": "your_database",
  "user": "your_username",
  "password": "your_password"
}
```

## Project Structure

```
webapp/
├── backend/
│   ├── app.py              # Flask API server
│   └── requirements.txt    # Python dependencies
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── Navigation.jsx
    │   ├── pages/
    │   │   ├── Races.jsx
    │   │   ├── RaceDetail.jsx
    │   │   ├── Registrations.jsx
    │   │   └── Analytics.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── postcss.config.js
```

## Usage

1. Start the backend server (terminal 1)
2. Start the frontend development server (terminal 2)
3. Open `http://localhost:3000` in your browser
4. Navigate using the top navigation bar:
   - **Races**: View and browse all races
   - **Registrations**: Search and view all registrations
   - **Analytics**: View dashboard with charts and statistics

## Development

### Building for Production

To build the frontend for production:

```bash
cd webapp/frontend
npm run build
```

The built files will be in the `dist` directory.

### Linting

```bash
npm run lint
```

## Notes

- The frontend is configured with a proxy to forward API requests to the backend
- TailwindCSS lint warnings are expected until dependencies are installed
- The application uses CORS to allow cross-origin requests between frontend and backend
