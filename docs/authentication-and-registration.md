# Authentication & Registration Updates

## Client Registration

`POST /api/auth/register`

Request body schema:

```json
{
  "clientType": "B2B" | "C2B",
  "basicInfo": {
    "fullName": "string (min 2, max 120)",
    "email": "string (email)",
    "password": "string (min 8, max 128)"
  },
  "companyInfo": {
    "companyName": "string (required when clientType = 'B2B')",
    "companyAddress": "string (required when clientType = 'B2B')",
    "companyPhone": "string (optional)"
  },
  "guestCart": [
    {
      "productId": "string",
      "quantity": "integer > 0"
    }
  ]
}
```

Response:

```json
{
  "user": { /* sanitized user */ },
  "requiresVerification": true,
  "verification": {
    "email": "string",
    "expiresAt": "ISO timestamp"
  }
}
```

Notes:

* B2B registrations must provide `companyInfo.companyName` and `companyInfo.companyAddress`.
* `requiresVerification` indicates the account cannot access protected APIs until email verification succeeds.

## Email Verification

`POST /api/auth/verify`

Request body:

```json
{
  "email": "string (email)",
  "code": "string (exactly 6 digits)"
}
```

Successful response:

```json
{
  "message": "Account verified successfully.",
  "user": { /* sanitized user */ }
}
```

Error responses:

* `400` → `{ "error": "Invalid verification code." }`
* `400` → `{ "error": "Verification code expired. Please request a new code." }`
* `429` → `{ "error": "Too many failed attempts. Please request a new verification code." }`

Verification codes expire after 15 minutes. Submitting a valid code marks the account as verified and removes any existing verification record.

## Authentication

`POST /api/auth/login` now accepts:

```json
{
  "email": "string (email)",
  "password": "string",
  "guestCart": [ { "productId": "string", "quantity": "integer" } ]
}
```

When the authenticated user is an unverified client, the response includes `"requiresVerification": true`. In that state, protected API calls respond with `401` until verification succeeds.

## Admin Profile Management

Profile updates use the existing users API:

* `PUT /api/users/:id` accepts partial updates for:
  * `name` (full name)
  * `email`
  * `profileImageUrl`
  * `role`
  * `status`
  * `password`

Profile images upload via `POST /api/uploads/profile-image` (multipart field `file`). Accepted file types: PNG, JPG/JPEG, WEBP. Default size limit: `PROFILE_UPLOAD_MAX_MB` (5 MB).

## Configuration

The following environment variables configure email delivery and upload limits:

| Variable | Description | Default |
| --- | --- | --- |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `bpd.claude@gmail.com` |
| `SMTP_PASSWORD` / `SMTP_PASS` | SMTP password or app password | _empty_ |
| `SMTP_SECURE` | Set to `true` for SMTPS | `false` |
| `EMAIL_SENDER` | From address used in emails | value of `SMTP_USER` |
| `PROFILE_UPLOAD_MAX_MB` | Max profile image size in MB | `5` |
| `UPLOAD_MAX_MB` | Max verification document size in MB | `10` |

Set these variables in the server environment (or `.env`) before deployment. Gmail accounts require an application-specific password when 2FA is enabled.

