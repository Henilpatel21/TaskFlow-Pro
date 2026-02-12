# TaskFlow Pro - Setup Guide

This project comes with an automated setup script to get you up and running quickly.

## 🚀 Quick Start

1.  **Clone the repository** (if you haven't already).
2.  **Run the setup script**:
    ```bash
    node setup.js
    ```
    This script will:
    - Install all dependencies for the root, client, and server.
    - Create `.env` files for both client and server automatically.
    - create a `.vscode` folder with recommended extensions.
    - Prompt you for your MongoDB URI (or use the default local URI).
    - Generate secure JWT secrets for you.

3.  **Start the application**:
    ```bash
    npm run dev
    ```
    This command concurrently starts the backend server (default port 5000) and the React frontend (default port 5173).

## 🛠️ Manual Setup (If script fails)

If for some reason the script doesn't work, here are the manual steps:

1.  **Install Dependencies**:
    ```bash
    npm install
    npm install --prefix server
    npm install --prefix client
    ```

2.  **Configure Server Environment**:
    - Create `server/.env` based on `server/.env.example` (or `setup.js` defaults).
    - Ensure `MONGODB_URI` is correct.

3.  **Configure Client Environment**:
    - Create `client/.env` based on `client/.env.example`.

4.  **Run**:
    ```bash
    npm run dev
    ```
