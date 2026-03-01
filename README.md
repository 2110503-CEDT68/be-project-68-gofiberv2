# Restaurant Reservation API

A simple backend API for a restaurant reservation system. It runs on Node.js and Express, and hooks into MongoDB to handle the data. 

with some solid security middleware (Helmet, CORS, rate limiting, XSS/NoSQL injection protection) and Swagger for API docs.

## Structure

```text
$ tree ./
be-project-68-gofiberv2
├── config/
│   └── db.js
├── controllers/
│   ├── auth.js
│   ├── reservations.js
│   └── restaurants.js
├── middleware/
│   └── auth.js
├── models/
│   ├── Reservations.js
│   ├── Restaurants.js
│   └── User.js
├── routes/
│   ├── auth.js
│   ├── reservations.js
│   └── restaurants.js
├── package-lock.json
├── package.json
└── server.js
```

## Getting Started

First, install the dependencies. You'll also need to make sure your environment variables are set up in `config/config.env`.

```bash
npm install
```

Then, you can fire up the dev server:

```bash
npm run dev
```

## API Overview

Keeping it high-level, the API is secured with JWT Bearer tokens and is split into three main areas:

- **`/api/v1/auth`**: Everything related to user access (registering, logging in, and getting your token).
- **`/api/v1/restaurants`**: The core restaurant data (finding places, adding new ones, updating details).
- **`/api/v1/reservations`**: Where the actual bookings happen (creating a reservation, viewing your bookings, or canceling).

If you want to poke around the exact endpoints, just run the server and hit `/api-docs` to see the Swagger UI (heads up: it is locked behind basic auth!).
