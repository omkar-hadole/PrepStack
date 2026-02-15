# PrepStack

A quiz and assessment platform.

## Setup

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables:
    - Copy `.env.example` to `.env`.
    - Update `.env` with your values.

## Running

1.  Start the database (MongoDB).
2.  Seed the admin user (first time only):
    ```bash
    npm run seed
    ```
3.  Start the application:
    ```bash
    npm start
    ```
    The app will run at `http://localhost:3000` (or your configured PORT).

## Production

-   Ensure `NODE_ENV` is set to `production`.
-   Use a process manager like PM2.
-   Set strict firewall rules.
