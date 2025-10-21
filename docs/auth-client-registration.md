## Client Registration & Verification

- **Endpoints**
  - `POST /api/clients/register` (`server/src/routes/clients.js`) — handled by `registerClient` in `server/src/controllers/clientController.js`. Accepts:
    ```json
    {
      "clientType": "B2B",
      "basicInfo": {
        "fullName": "Aisha Daniels",
        "email": "aisha@example.com",
        "password": "Passw0rd!"
      },
      "companyInfo": {
        "companyName": "Daniels Trading Co",
        "companyPhone": "+9745550101",
        "businessType": "Retailer",
        "taxId": "123456789",
        "companyWebsite": "https://daniels.example"
      }
    }
  ```
    Emits `{ email, clientType, expiresAt, requiresVerification, previewCode? }` and creates a user with `role: 'client'`, `clientType`, `isEmailVerified: false`, plus a verification code (`server/src/models/VerificationCode.js`) with TTL and attempt limits.
  - `POST /api/auth/verify` (`server/src/routes/auth.js`) — handled in `server/src/controllers/authController.js`. Accepts `{ "email": "aisha@example.com", "code": "123456" }`. Validates against `VerificationCode`, respects expiry (`VERIFICATION_CODE_TTL_MINUTES`) and attempt lockouts (`VERIFICATION_MAX_ATTEMPTS`, `VERIFICATION_LOCK_MINUTES`), sets `user.isEmailVerified = true`, deletes the code, issues the JWT cookie, and returns `{ user }`.
  - `POST /api/auth/resend-code` (`server/src/routes/auth.js`) � issues a fresh code for an existing unverified account.
- **Validation**
  - Client payload validation lives in `server/src/validators/clientRegistration.js` (mirrors the schema in the request spec).
  - Verification payload validation leverages the updated `validateVerificationCode` in `server/src/validators/auth.js`.
- **Email pipeline**
  - SMTP transport + helper lives in `server/src/services/emailService.js`; configuration driven by the new `.env` keys (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, optional `SMTP_FROM`).
  - The actual email body is assembled in `sendClientVerificationEmail`, with TTL messaging driven by `VERIFICATION_CODE_TTL_MINUTES`.

## Auth & User Model Changes

- `server/src/models/User.js`
  - Added `email`, `clientType`, `company`, `profileImage`, `isEmailVerified`.
  - Exposes new fields via `toJSON`.
  - Ensures email uniqueness with a sparse index.
- `server/src/controllers/authController.js`
  - Login accepts either username **or** email (case-insensitive) using the relaxed login validator in `server/src/validators/auth.js`.
  - Exposes `resendVerificationCode` so clients can request another code via `/api/auth/resend-code`.
- `server/src/middleware/auth.js`
  - Always attaches active users and flags `req.requiresEmailVerification` when a client still needs to confirm their email.

## Admin Profile Enhancements

- **Validators**
  - `server/src/validators/user.js` now accepts `email`, `fullName`, `profileImage`, and `removeProfileImage`.
  - `server/src/validators/adminProfile.js` enforces `{ fullName, email, profileImage? }` for self-serve admin profile updates.
- **Controller / Routing**
  - `server/src/controllers/userController.js`
    - Accepts multipart requests (wired via `profileUpload.single('profileImage')` in `server/src/routes/users.js`).
    - Normalises email (lowercase + uniqueness check) and maps `fullName` → `name`.
    - Applies `validateAdminProfile` when an admin/super-admin updates their own profile.
    - Handles `removeProfileImage` toggle and new images (`profile/<filename>`).
  - `server/src/middleware/upload.js`
    - Added `profileUpload` (jpg/png/webp, size controlled by `PROFILE_UPLOAD_MAX_MB`) alongside the existing verification uploader.
- **Frontend**
  - `client/src/api/users.ts` accepts `FormData` payloads for profile updates.
  - `client/src/pages/UserSettingsPage.tsx` adds profile photo management, enforces email/full name inputs, and integrates with the new API contract.

## Frontend Client Flow

- `client/src/api/clients.ts` issues registration requests and exposes typed payload/response helpers.
- `client/src/api/auth.ts` adds `verifyEmail` and `resendVerificationCode`.
- `client/src/pages/ClientRegistrationPage.tsx` implements the multi-step registration wizard (client type → personal info → optional B2B company info → email verification) without altering the existing login/register UI.
- `client/src/router/AppRouter.tsx` wires `/clients/register` and `/verify-email`.
- `client/src/types/api.ts` extends `User` with `{ email, clientType, company, profileImage, isEmailVerified }`.

## Configuration Summary (`server/.env.example`)

```ini
PROFILE_UPLOAD_MAX_MB=5
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=bpd.claude@gmail.com
SMTP_PASSWORD=
SMTP_FROM="ULK Supply <bpd.claude@gmail.com>"
VERIFICATION_CODE_TTL_MINUTES=15
VERIFICATION_MAX_ATTEMPTS=5
VERIFICATION_LOCK_MINUTES=15
```

- `AUTH_TOKEN_TTL_SECONDS`, `AUTH_COOKIE_*` remain in use for post-verification JWT cookies.
- Update production secrets with valid SMTP credentials (App Password for Gmail recommended).

