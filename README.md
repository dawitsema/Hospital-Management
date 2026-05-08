# Hospital Appointment System

Production-ready hospital appointment platform built with **React (Vite)**, **Node.js (Express)**, and **MongoDB Atlas**. The system provides secure authentication, role-based access (`patient`, `doctor`, `admin`), and dashboards tailored to each role.

## Live deployment

- **Frontend (Vercel):** add your production URL
- **Backend (Render):** add your production URL
- **API health:** `<render-url>/api/health`

## How it works

1. **Authentication and authorization**
   - Users sign in with JWT-based authentication.
   - Access is controlled by role (`patient`, `doctor`, `admin`).

2. **Patient flow**
   - Patients register and sign in.
   - They select a doctor, date, and available slot to request an appointment.
   - They can view upcoming/past appointments and cancel or reschedule allowed bookings.

3. **Doctor flow**
   - Doctors define weekly availability windows.
   - Incoming requests can be approved, declined, rescheduled, or marked completed.
   - Doctors receive and manage relevant notifications.

4. **Admin flow**
   - Admins manage users and doctor accounts.
   - Admins monitor appointments and overall stats.
   - Admins can intervene in appointment status management when needed.

5. **Notifications**
   - The system notifies users for major appointment state changes (request, approval, decline, cancel, complete, reschedule).

6. **Localization**
   - Language switcher supports **English** and **Amharic**.

## API overview

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| GET | `/api/health` | No | Liveness check |
| POST | `/api/auth/register` | No | Create patient account; returns JWT |
| POST | `/api/auth/login` | No | Login; returns JWT |
| GET | `/api/me` | Yes | Current user profile |
| PATCH | `/api/me` | Yes | Update profile/password |
| GET | `/api/doctors` | No | List doctors |
| GET | `/api/appointments` | Yes | Patient: own; Doctor: assigned; Admin: all |
| POST | `/api/appointments` | Patient | Create appointment request |
| PATCH | `/api/appointments/:id` | Yes | Update appointment status/time |
| GET | `/api/notifications` | Yes | List notifications + unread count |
| PATCH | `/api/notifications/:id/read` | Yes | Mark one as read |
| POST | `/api/notifications/read-all` | Yes | Mark all as read |
| GET | `/api/users` | Admin | List users |
| POST | `/api/admin/doctors` | Admin | Create doctor account |

Send `Authorization: Bearer <token>` on protected routes.

## Environment configuration

### Server (`server/.env`)

- `MONGODB_URI` = MongoDB Atlas connection string
- `JWT_SECRET` = long random secret
- `CLIENT_ORIGIN` = your Vercel frontend URL
- `PORT` = provided by hosting platform or default local port

### Client (`client/.env`)

- `VITE_API_URL` = your Render backend base URL (no trailing slash)

## Tech stack

- **Frontend:** React, React Router, Vite
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Auth/Security:** JWT, bcrypt, CORS
- **Deployment:** Vercel + Render + MongoDB Atlas

## Developed by (Group Work)

1. Dawit Sema - ETS 0455/14  
2. Dawit Berhanu - ETS 0457/14  
3. Delal Mohammad - ETS 0482/14  
4. Eden Melaku - ETS 0496/14  
5. Eyerusalem Kidane - ETS 0574/14  
6. Gelila Nebiyu - ETS 0690/14
7. Hana Abiyu - ETS0728/14


## Academic context

- **Course:** Selected Topics in Software Engineering
- **Instructor:** GIZATE D.
- **University:** Addis Ababa Science and Technology University

## Project layout

- [`client/`](client/) - React SPA (Vite)
- [`server/`](server/) - Express API and MongoDB models

## License

Educational use.
