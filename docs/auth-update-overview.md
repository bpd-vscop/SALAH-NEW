## What Changed

- Added a dedicated client sign-up process that asks people to pick **Consumer (C2B)** or **Business (B2B)** before creating an account.
- Business clients now have one extra screen to fill in company name plus optional contact details (phone, business type, tax ID, website).
- New verification emails are sent with a 6-digit code so brand-new clients must confirm their email before they can log in.
- Added a dedicated `/verify-email` page and router entry so unverified clients finish the process before seeing their account.
- Admins can now update their profile picture, full name, and email from the existing settings screen.
- The avatar in the admin header now shows that profile picture (and falls back to the first letter if no photo is set).
- Email is now required during the legacy signup flow; usernames are generated automatically for storefront clients, keeping manual username entry for staff/admin tooling only.

## How It Works

1. **Client registration**
   - Frontend path: `/clients/register`. The wizard calls `POST /api/clients/register`.
   - The server stores the user with `isEmailVerified=false`, saves any company info, and generates a code kept in the new `VerificationCode` collection.
   - An email is sent using the SMTP details from `.env` (or `.env.example`), telling the user to enter the 6-digit code.
2. **Email verification**
   - The code expires after the minutes set in `VERIFICATION_CODE_TTL_MINUTES` (default 15 minutes).
   - Each wrong attempt is counted; after `VERIFICATION_MAX_ATTEMPTS` tries, the code locks until the number of minutes in `VERIFICATION_LOCK_MINUTES` passes.
   - `/api/auth/resend-code` regenerates the code on demand (used by the verification page).
   - `POST /api/auth/verify` checks the code, marks the user as verified, and drops a signed auth cookie.
3. **Login behaviour**
   - Logins now accept either the username or the email.
   - Unverified clients receive a session but are redirected to `/verify-email` until they submit a valid code.
   - Verified clients fall through to `/account`, staff go to `/admin`.
4. **Admin profile updates**
   - The settings page (`/admin/settings`) uploads the new photo with `FormData`.
   - The server saves images into `server/uploads/profile/` and records the relative path in MongoDB.
   - Removing a photo just clears the stored filename.

## Things You Can Change

- **SMTP sender**: edit `SMTP_FROM`, `SMTP_USER`, and `SMTP_PASSWORD` in `.env`. Use an app password if Gmail blocks normal passwords.
- **Verification timing**: adjust `VERIFICATION_CODE_TTL_MINUTES`, `VERIFICATION_MAX_ATTEMPTS`, and `VERIFICATION_LOCK_MINUTES` to suit your policy.
- **Upload sizes**:
  - Increase `PROFILE_UPLOAD_MAX_MB` if you expect large profile photos.
  - `UPLOAD_MAX_MB` still controls verification document uploads.
- **Client flow wording**: update `client/src/pages/ClientRegistrationPage.tsx` if you want different copy or extra fields.
- **Email template**: tweak the message in `server/src/services/emailService.js` to match your branding.

## Where to Look

- Frontend wizard: `client/src/pages/ClientRegistrationPage.tsx`
- Verification page: `client/src/pages/VerifyEmailPage.tsx`
- Client API helpers: `client/src/api/clients.ts` and `client/src/api/auth.ts` (includes resend + verify)
- User settings screen: `client/src/pages/UserSettingsPage.tsx`
- Backend controller logic: `server/src/controllers/clientController.js` and `server/src/controllers/authController.js`
- Verification storage: `server/src/models/VerificationCode.js`
- Email sending: `server/src/services/emailService.js`
- New environment keys documented in `server/.env.example`
