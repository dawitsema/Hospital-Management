# Hospital Appointment System

Full-stack coursework project: **React (Vite)** SPA, **Node.js (Express)** REST API, **MongoDB** (Mongoose), and **GitHub** for version control. Includes **JWT authentication**, **role-based access** (`patient`, `doctor`, `admin`), and **dashboards** for each role.

## Prerequisites

- Node.js 20+ recommended
- MongoDB running locally or a MongoDB Atlas URI

## Quick start

### 1. API (server)

```bash
cd server
cp .env.example .env
# Edit .env: set MONGODB_URI and JWT_SECRET
npm install
npm run seed   # optional: demo users + sample appointment
npm run dev
```

API listens on **http://localhost:5000** by default.

### 2. Web app (client)

In a second terminal:

```bash
cd client
cp .env.example .env
# Leave VITE_API_URL empty to use the Vite dev proxy to :5000
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` to the API.

### 3. Demo accounts (after `npm run seed`)

| Role    | Email                   | Password      |
| ------- | ------------------------- | ------------- |
| Admin   | `admin@hospital.test`     | `password123` |
| Doctor  | `dr.smith@hospital.test`  | `password123` |
| Doctor  | `dr.jones@hospital.test`  | `password123` |
| Patient | `patient@hospital.test`   | `password123` |

New **patient** accounts can also be created from the **Register** screen (always created as `patient`).

## Demo script (for report or presentation)

1. Run seed, start API and client as above.
2. Sign in as **patient** → request an appointment (Mon–Sat, future slot in Addis clinic hours); it stays **pending** until approved.
3. Sign in as **dr.smith** (doctor) → **Approve** or **Decline** pending requests; for confirmed visits, mark **completed** or **cancel**. Check the notification bell.
4. Sign in as **admin** → **Users** / **Appointments** tabs; admins can also approve or decline pending requests. Notifications fire for both sides on key changes.

## API overview

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| GET | `/api/health` | No | Liveness check |
| POST | `/api/auth/register` | No | Create patient account; returns JWT |
| POST | `/api/auth/login` | No | Login; returns JWT |
| GET | `/api/me` | Yes | Current user profile |
| PATCH | `/api/me` | Yes | Update `name` and/or `newPassword` (requires `currentPassword` when changing password) |
| GET | `/api/doctors` | No | List doctors (for booking) |
| GET | `/api/appointments` | Yes | Patient: own; Doctor: assigned; Admin: all |
| POST | `/api/appointments` | Patient | Request booking → `pending` (Addis clinic hours, no past slots, overlap check) |
| PATCH | `/api/appointments/:id` | Yes | Doctor/Admin: approve (`scheduled`) / decline (`rejected`); status updates notify patient & doctor |
| GET | `/api/notifications` | Yes | List notifications + `unreadCount` |
| PATCH | `/api/notifications/:id/read` | Yes | Mark one notification read |
| POST | `/api/notifications/read-all` | Yes | Mark all read |
| GET | `/api/users` | Admin | List users |
| POST | `/api/admin/doctors` | Admin | Create doctor account (email, password, name, optional specialty) |

Send `Authorization: Bearer <token>` on protected routes.

## Security notes (for documentation)

- Passwords hashed with **bcryptjs**; JWT signed with **HS256** using `JWT_SECRET`.
- **CORS** restricted to `CLIENT_ORIGIN` (default `http://localhost:5173`).
- Public registration creates **patients only**; staff roles come from seeding or future admin tooling.

## GitHub / CI

Push this repository to GitHub. CI (`.github/workflows/ci.yml`) runs **server lint** and **client production build** on push and pull requests.

## Project layout

- [`client/`](client/) — React SPA (Vite)
- [`server/`](server/) — Express API, Mongoose models, seed script

## License

Educational use.
