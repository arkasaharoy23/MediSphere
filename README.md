# MediSphere

A healthcare ecosystem connecting Patients, Doctors, Hospitals, Diagnostic Labs, Pharmacies, Ambulance services, and Administrators through one secure platform.

MediSphere is not a single-purpose booking app — it's a full multi-role healthcare network, with real identity verification, encrypted sensitive data, and location-aware matching between patients and nearby care providers.

## Core idea

Every account starts by proving who it is. Doctors, hospitals, labs, pharmacies, and ambulances all submit government-issued documents and registration numbers at signup, which an administrator reviews and approves before that account gains full access. Patients get immediate access, since no professional verification applies to them.

## Features by role

**Patient** — profile with medical essentials (blood group, emergency contact), location-aware doctor search and appointment booking, Emergency SOS (shares live location, auto-matches the nearest verified ambulance and hospital), medical records timeline (prescriptions and lab reports in one place).

**Doctor** — manage incoming appointment requests (confirm, decline, mark completed), issue structured prescriptions to patients they've actually treated, view a patient roster built from real appointment history.

**Hospital, Lab, Pharmacy, Ambulance** — registration and admin verification are fully built; role-specific dashboards are in progress.

**Admin** — review and approve/reject every provider type individually, manage all accounts across every role (search, filter, suspend/reactivate), and a live analytics dashboard (account counts and verification breakdowns).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+, native modules) |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose) |
| Authentication | Firebase Authentication (email/password + Google) |
| File storage | Cloudinary (private delivery for KYC documents, public for profile photos) |
| Geolocation | Browser Geolocation API + MongoDB geospatial queries |
| Charts | Chart.js |

## Security notes

- Passwords are never touched by this codebase — Firebase owns authentication entirely.
- Phone numbers and government ID/license numbers are encrypted at rest (AES-256-GCM), with a separate one-way hash used only for duplicate-detection.
- KYC documents are stored with private Cloudinary delivery — viewing one requires a signed, time-limited URL generated on request, not a permanent public link.
- Every sensitive backend route is protected by Firebase token verification and role-based authorization middleware.

## Project structure

```
client/
  pages/        HTML pages, organized by role
  js/           Vanilla JS, organized by role, plus shared utils/services/components
  css/          Base styles, layout, reusable components, and per-page styles
  public/       Static assets (logo, fonts)
server/
  config/       Environment, database, Firebase, Cloudinary setup
  controllers/  Request handlers
  models/       Mongoose schemas
  routes/       Express route definitions
  middleware/   Auth guards, rate limiting, error handling
  services/     Cloudinary upload logic
  utils/        Encryption, response helpers, async error wrapping
  scripts/      One-off admin utilities
```

## Getting started

**1. Clone and install**

```bash
cd server
npm install
```

**2. Environment variables**

Copy `.env.example` to `.env` in the project root and fill in real values for MongoDB, Firebase, and Cloudinary. Generate `ENCRYPTION_KEY` and `HASH_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run that twice for two different values. **Do not change these after real data exists** — doing so makes existing encrypted fields permanently unreadable.

Also fill in your real Firebase web app config inside `client/js/config/firebase.js`.

**3. Run the backend**

```bash
cd server
npm run dev
```

**4. Run the frontend**

Serve the `client/` folder with a static file server (e.g. VS Code's Live Server extension). Opening files directly via `file://` will break the ES module imports used throughout.

**5. Create an admin account**

There's no public sign-up path for Admin, by design. Create a user manually in Firebase Console → Authentication, copy its UID, then run:

```bash
node scripts/createAdmin.js <firebase-uid> <email> <phone>
```

## License

MIT — see `LICENSE`.