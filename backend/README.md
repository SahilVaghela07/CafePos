# Odoo Cafe POS - Backend

This folder contains the REST API server and real-time WebSocket server for the Odoo Cafe POS system.

## Proposed Directory Structure
- `/src`
  - `/config`: Database connection and environment variables.
  - `/controllers`: Request handlers for Auth, Products, Categories, Orders, Promotions, and Reports.
  - `/models`: Database schema definitions (SQLite).
  - `/routes`: Express route definitions.
  - `/middleware`: Authentication (JWT) and error handling.
  - `server.js`: Server entrypoint.
- `/data`: SQLite database storage file.
