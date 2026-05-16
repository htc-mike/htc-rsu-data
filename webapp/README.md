# HTC Race Admin Web Application

A modern web application for running club administrators to manage and analyze race data, registrations, and analytics. Part of the RSU HTC Data Sync project.

## Features

- **Races Management**: View all races and their details
- **Events**: Browse events within each race
- **Registrations**: Search and view all registrations across races
- **Analytics Dashboard**: Visual insights with charts for revenue, registrations, and race performance
- **Google OAuth Authentication**: Secure authentication via Supabase
- **Responsive Design**: Mobile-friendly interface

## Architecture

```
┌─────────────────┐              ┌──────────────────┐
│   React App     │◄────────────►│   Supabase       │
│  (Webapp)       │   Direct DB  │   PostgreSQL    │
└─────────────────┘              └──────────────────┘

┌─────────────────┐              ┌──────────────────┐
│   React App     │◄────────────►│   Supabase Auth  │
│  (Webapp)       │   OAuth      │  (Google OAuth)  │
└─────────────────┘              └──────────────────┘
```

## Tech Stack

### Frontend
- React 18 with Vite
- TailwindCSS for styling
- React Router for navigation (with basename for GitHub Pages)
- Recharts for data visualization
- Lucide React for icons
- Supabase for authentication (Google OAuth)
- Supabase client for direct database access

## Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Supabase project with Google OAuth configured
- Database connection via environment variables

## Setup Instructions

### Frontend Setup

Navigate to the frontend directory:

```bash
cd webapp/frontend
```

Install Node.js dependencies:

```bash
npm install
```

Configure environment variables in `.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

Start the development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Authentication

The web application uses Google OAuth via Supabase for authentication:

1. **Supabase Configuration**:
   - Go to Supabase Dashboard → Authentication
   - Enable Google OAuth provider
   - Configure redirect URIs for local development and production

2. **Local Development**:
   - Redirect URI: `http://localhost:3000/auth/callback`

3. **Production (GitHub Pages)**:
   - Redirect URI: `https://htc-mike.github.io/htc-rsu-data/auth/callback`

4. **OAuth Flow**:
   - Static HTML callback handler (`/auth/callback.html`) handles OAuth response
   - Token stored in localStorage
   - React app reads token from localStorage to establish session

## Deployment

### GitHub Pages Deployment

The web application is automatically deployed to GitHub Pages via GitHub Actions:

**Workflow**: `.github/workflows/deploy.yml`

**Configuration**:
- Base path: `/htc-rsu-data/` for GitHub Pages subdirectory
- OAuth callback: `/htc-rsu-data/auth/callback`

**Deployment URL**: https://htc-mike.github.io/htc-rsu-data/

**Manual Deployment**:
```bash
cd webapp/frontend
npm run build
```

The built files in `dist/` can be manually deployed to any static hosting service.

## Project Structure

```
webapp/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navigation.jsx
│   │   │   └── Login.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Races.jsx
│   │   │   ├── RaceDetail.jsx
│   │   │   ├── Registrations.jsx
│   │   │   └── Analytics.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── supabaseClient.js
│   │   └── index.css
│   ├── public/
│   │   └── auth/
│   │       └── callback.html  # OAuth callback handler
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
```

## Usage

### Local Development
1. Start the frontend development server:
   ```bash
   cd webapp/frontend
   npm run dev
   ```
2. Open `http://localhost:3000` in your browser
3. Sign in with Google OAuth
4. Navigate using the top navigation bar:
   - **Races**: View and browse all races
   - **Registrations**: Search and view all registrations
   - **Analytics**: View dashboard with charts and statistics

### Production
1. Access the deployed application at https://htc-mike.github.io/htc-rsu-data/
2. Sign in with Google OAuth
3. Navigate using the top navigation bar

## Development

### Building for Production

```bash
cd webapp/frontend
npm run build
```

The built files will be in the `dist` directory.

### Linting

```bash
npm run lint
```

## Integration with Data Sync

The web application reads from the same PostgreSQL database that the data sync engine (`rsu_htc_data.py`) populates:

- **Data Sync Engine**: Runs on schedule via GitHub Actions to sync data from RunSignUp API
- **Web Application**: Displays the synced data in a user-friendly interface

The database schema (`htc` schema) is shared between both components.

## Troubleshooting

### OAuth Callback Issues
- Ensure redirect URIs are correctly configured in Supabase
- Check that the callback HTML file is deployed to the correct path
- Verify localStorage is accessible in your browser

### Database Connection Issues
- Ensure Supabase credentials are correctly configured in `.env`
- Check that Supabase project is active and accessible
- Verify Supabase client configuration in `supabaseClient.js`

### GitHub Pages Issues
- Verify base path in `vite.config.js` matches repository name
- Check GitHub Pages settings for correct source branch
- Ensure workflow has permission to deploy to Pages

## Notes

- OAuth callback uses a static HTML file to handle the redirect on GitHub Pages
- The application uses Supabase for authentication and direct database access
- TailwindCSS lint warnings are expected until dependencies are installed
- The frontend connects directly to Supabase for both authentication and data
