# Swagger Metrics

Short description of what the system is.

Swagger Metrics is a lightweight web dashboard and API proxy project for viewing MLM network, sales, user, code, upline, and downline data.

## Overview

This system provides a browser-based dashboard for checking network activity and related MLM data through organized pages. It includes frontend pages in `public/` and serverless API routes in `api/` that forward requests to upstream One Grinders Guild API endpoints.

The project was created to make API data easier to access, inspect, and present from one simple interface instead of manually calling each endpoint.

## Features

- Dashboard-style navigation for users, codes, sales, uplines, downlines, personal accounts, and network activity.
- API proxy routes for connecting the frontend to external MLM endpoints.
- Binary downline lookup with support for account hash generation.
- Supabase sales upload page and Supabase browser configuration.
- Static frontend pages that can be served locally or deployed through Vercel.
- Local proxy server option for development.

## System Purpose

The system solves the problem of manually checking multiple MLM-related API endpoints and responses. It brings the data into a single dashboard interface, making it easier to review user records, sales information, account relationships, and network structure.

## Technologies Used

- HTML
- CSS
- JavaScript
- Node.js
- Vercel Serverless Functions
- Express.js
- Supabase JavaScript Client
- SweetAlert2
- SheetJS / XLSX

## Installation

1. Clone or download the project.
2. Open the project folder.
3. Configure Supabase values if needed:

   ```js
   window.__APP_CONFIG__ = {
     SUPABASE_URL: 'https://YOUR_PROJECT_REF.supabase.co',
     SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
   };
   ```

4. For local static frontend testing, serve the `public/` folder with a local server:

   ```bash
   cd public
   python -m http.server 8000
   ```

5. For the optional local proxy server, install dependencies inside the `proxy/` folder:

   ```bash
   cd proxy
   npm install
   node server.js
   ```

6. For Vercel deployment, set the required environment variables:

   ```bash
   SUPABASE_URL
   SUPABASE_ANON_KEY
   ```

## Usage

After installation, open the local frontend in a browser:

```bash
http://localhost:8000
```

Use the sidebar to navigate between dashboard pages such as Sales, User, Codes, Binary Downline, Sponsored Downline, Unilevel Downline, User Upline, Personal Accounts, Network Activity, and MLM Swagger.

When deployed on Vercel, the frontend can call the API routes under `/api/`, such as:

```bash
/api/binaryDownline
/api/sales
/api/users
/api/codes
```

## Screenshots

Optional screenshots of the system can be added here.

## Author

Najeeb C. Mapantas
