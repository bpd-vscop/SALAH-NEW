# Email Verification System - Complete Guide

## Overview

This document describes the complete email verification system for SALAH application, including setup, features, and troubleshooting.

## Features Implemented

### ✅ Core Features

1. **6-Digit Email Verification Code**
   - Random 6-digit codes (100000-999999)
   - 15-minute expiration (configurable)
   - Secure storage in MongoDB

2. **Security Features**
   - Rate limiting: Maximum 5 attempts per code
   - Account lockout: 15 minutes after failed attempts
   - Automatic cleanup of expired codes
   - Password-protected SMTP connection

3. **User Experience**
   - Resend code functionality with 60-second cooldown
   - Preview codes in development mode
   - Clear error messages
   - Email verification page with clean UI

4. **15-Day Unverified Account Cleanup**
   - Automatic deletion of unverified accounts after 15 days
   - Runs every 24 hours
   - Keeps database clean from abandoned registrations

5. **Re-Login Verification Flow**
   - Unverified users attempting to login receive a new verification code
   - Automatic redirect to verification page
   - Preserves user data for 15 days

## System Architecture

### Backend Components

#### 1. Models
- **[User.js](../server/src/models/User.js)** - User schema with `isEmailVerified` flag and `accountCreated` timestamp
- **[VerificationCode.js](../server/src/models/VerificationCode.js)** - Stores codes with expiration, attempts, and lockout

#### 2. Services
- **[emailService.js](../server/src/services/emailService.js)** - Sends emails using Nodemailer
- **[verificationCodeService.js](../server/src/services/verificationCodeService.js)** - Generates and manages codes
- **[cleanupService.js](../server/src/services/cleanupService.js)** - Removes expired accounts (NEW)

#### 3. Controllers
- **[authController.js](../server/src/controllers/authController.js)** - Handles verification and resend
- **[clientController.js](../server/src/controllers/clientController.js)** - Client registration with email verification

#### 4. Routes
- `POST /api/clients/register` - Register new client (sends verification email)
- `POST /api/auth/verify-registration` - Verify email with code
- `POST /api/auth/resend-verification` - Resend verification code
- `POST /api/auth/login` - Login (resends verification if unverified)

### Frontend Components

- **[VerifyEmailPage.tsx](../client/src/pages/VerifyEmailPage.tsx)** - Verification UI
- **[LoginPage.tsx](../client/src/pages/LoginPage.tsx)** - Handles registration and login
- **[AuthProvider.tsx](../client/src/context/AuthProvider.tsx)** - Auth state management

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

**Nodemailer** is now installed (v7.0.9).

### 2. Configure Gmail SMTP

#### Step 1: Enable 2-Step Verification
1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification" if not already enabled

#### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. App name: "SALAH Email Verification"
3. Click "Create"
4. Copy the 16-character password (e.g., `xxxx xxxx xxxx xxxx`)

#### Step 3: Update .env File

Edit `server/.env` and replace the placeholder:

```env
SMTP_PASSWORD=your-gmail-app-password-here
```

With your actual app password (remove spaces):

```env
SMTP_PASSWORD=xxxxxxxxxxxxxxxx
```

### 3. Environment Variables

All email verification settings in `server/.env`:

```env
# Email verification / SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=bpd.claude@gmail.com
SMTP_PASSWORD=xxxxxxxxxxxxxxxx
SMTP_FROM="SALAH <bpd.claude@gmail.com>"
VERIFICATION_CODE_TTL_MINUTES=15
VERIFICATION_MAX_ATTEMPTS=5
VERIFICATION_LOCK_MINUTES=15
UNVERIFIED_ACCOUNT_EXPIRY_DAYS=15
```

### 4. Start the Server

```bash
cd server
npm run dev
```

You should see:
```
Server listening on port 5000
[Cleanup] Service started. Running every 24 hours.
```

## User Flow

### Registration Flow

1. **User registers** → `POST /api/clients/register`
   - User data saved with `isEmailVerified: false`
   - 6-digit code generated
   - Email sent to user
   - Response: `{ email, clientType, expiresAt, requiresVerification: true, previewCode? }`

2. **User receives email** with code

3. **User enters code** → `POST /api/auth/verify-registration`
   - Code validated (expiration, attempts, lockout)
   - On success: `isEmailVerified: true`, user logged in
   - On failure: Increment attempts, lock if >= 5

4. **User can resend** → `POST /api/auth/resend-verification`
   - New code generated
   - New email sent
   - 60-second cooldown on frontend

### Re-Login Flow (Unverified User)

1. **Unverified user tries to login** → `POST /api/auth/login`
   - Password validated
   - If `isEmailVerified: false`:
     - New verification code generated
     - Email sent
     - Returns 403 with verification data
     - Frontend redirects to `/verify-email`

2. **User verifies email** → Same as step 3 above

### Account Expiration

- **Every 24 hours**, cleanup service runs
- Deletes accounts where:
  - `role === 'client'`
  - `isEmailVerified === false`
  - `accountCreated < 15 days ago`

## Email Template

Users receive an email like:

```
Subject: Verify your SALAH account

Hi [Full Name],

Thanks for registering with SALAH.

123456

This code expires in 15 minutes.

If you did not request this code, you can safely ignore this message.
```

## Security Considerations

### ✅ Implemented

- Codes expire after 15 minutes
- Maximum 5 attempts before lockout
- 15-minute lockout after failed attempts
- SMTP password not in version control
- HTTPS for production email sending
- Rate limiting on frontend (60-second resend cooldown)

### 🔒 Best Practices

1. **Never commit .env files** - Use `.env.example` as template
2. **Use strong app passwords** - Rotate periodically
3. **Monitor email sending** - Check for abuse
4. **Use HTTPS in production** - Set `SMTP_SECURE=true` for port 465

## Troubleshooting

### Issue 1: "Unable to send verification email"

**Cause**: Missing or invalid `SMTP_PASSWORD`

**Fix**:
1. Check `server/.env` has `SMTP_PASSWORD` set
2. Verify app password is correct (no spaces)
3. Check Gmail hasn't revoked the app password

### Issue 2: Emails not arriving

**Possible causes**:
- Email in spam folder
- Gmail blocking: Check https://myaccount.google.com/notifications
- SMTP credentials invalid
- Firewall blocking port 587

**Fix**:
1. Check spam folder
2. Test SMTP connection:
   ```javascript
   // Add to server startup temporarily
   const { getTransporter } = require('./services/emailService');
   getTransporter().verify((error, success) => {
     console.log(error ? error : 'SMTP ready');
   });
   ```

### Issue 3: "Too many failed attempts"

**Cause**: User entered wrong code 5 times

**Fix**:
1. Wait 15 minutes for lockout to expire
2. Click "Resend code" to get a new code
3. Or delete the VerificationCode record from MongoDB

### Issue 4: Account deleted after 15 days

**Expected behavior** - User must recreate account

**Prevention**: Complete email verification within 15 days

## Configuration Options

### Adjust Code Expiration

Default: 15 minutes

```env
VERIFICATION_CODE_TTL_MINUTES=30  # Change to 30 minutes
```

### Adjust Maximum Attempts

Default: 5 attempts

```env
VERIFICATION_MAX_ATTEMPTS=3  # Change to 3 attempts
```

### Adjust Lockout Duration

Default: 15 minutes

```env
VERIFICATION_LOCK_MINUTES=30  # Change to 30 minutes
```

### Adjust Account Expiration

Default: 15 days

```env
UNVERIFIED_ACCOUNT_EXPIRY_DAYS=30  # Change to 30 days
```

### Cleanup Service Frequency

Default: Every 24 hours

Edit `server/src/server.js`:
```javascript
startCleanupService(12); // Run every 12 hours
```

## Testing

### Development Mode

In development (`NODE_ENV !== 'production'`), the server returns `previewCode` in responses so you can test without checking email:

```json
{
  "email": "user@example.com",
  "expiresAt": "2025-01-20T12:00:00.000Z",
  "requiresVerification": true,
  "previewCode": "123456"
}
```

### Production Mode

Set `NODE_ENV=production` to hide preview codes.

## Alternative SMTP Providers

If Gmail doesn't work, consider:

### SendGrid (Recommended)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.com
SMTP_PASSWORD=your-mailgun-smtp-password
```

## Files Modified/Created

### Created
- `server/src/services/cleanupService.js` - Cleanup service
- `docs/email-verification-complete-guide.md` - This document

### Modified
- `server/package.json` - Added nodemailer dependency
- `server/.env` - Added SMTP_PASSWORD and UNVERIFIED_ACCOUNT_EXPIRY_DAYS
- `server/.env.example` - Added UNVERIFIED_ACCOUNT_EXPIRY_DAYS
- `server/src/server.js` - Added cleanup service startup
- `server/src/controllers/authController.js` - Updated login to resend verification
- `client/src/api/http.ts` - Fixed error details passing
- `client/src/context/AuthProvider.tsx` - Updated login error handling
- `client/src/pages/LoginPage.tsx` - Added verification redirect on login

## Next Steps

1. **Configure SMTP password** in `server/.env`
2. **Test registration flow** with a real email
3. **Test re-login flow** with unverified account
4. **Monitor server logs** for cleanup service
5. **Consider upgrading to SendGrid/AWS SES** for production

## Support

For issues or questions, check:
- Server logs: `npm run dev` output
- Browser console: Network tab for API errors
- MongoDB: Check VerificationCode collection
