# Authentication System Test Checklist

This checklist provides a comprehensive manual testing guide for the TIP Platform authentication system.

## Pre-Test Setup

### 1. Environment Preparation
- [ ] Docker is running
- [ ] Services are up: `docker-compose up -d postgres mailhog redis`
- [ ] Backend dependencies installed: `npm install`
- [ ] Database migrations applied: `npx prisma db push`
- [ ] Backend server running: `npm run dev`
- [ ] MailHog accessible at http://localhost:8025

### 2. Test Data Preparation
- [ ] Clean database state (optional: reset for fresh test)
- [ ] Admin user exists or can be created
- [ ] Test email addresses ready (use + addressing for Gmail)

---

## 🔐 Core Authentication Tests

### A. User Registration Flow

#### Test 1: Valid Registration
- [ ] Navigate to registration page (`/auth/register`)
- [ ] Fill form with valid data:
  - First Name: `Test`
  - Last Name: `User`
  - Email: `testuser+reg1@yourdomain.com`
  - Organization: `Test Org`
  - Position: `Tester`
  - Password: `TestPass123!`
- [ ] Submit form
- [ ] **Expected**: Success message, registration confirmation
- [ ] **Expected**: Email sent (check MailHog at http://localhost:8025)

#### Test 2: Password Validation
- [ ] Try weak passwords:
  - `weak` ❌
  - `12345678` ❌
  - `password` ❌
  - `Password` ❌
  - `Password123` (no special char) ❌
- [ ] **Expected**: Validation errors for all weak passwords

#### Test 3: Duplicate Email Prevention
- [ ] Try registering with same email as Test 1
- [ ] **Expected**: Error message about existing email

### B. Email Verification Flow

#### Test 4: Email Verification
- [ ] Open MailHog (http://localhost:8025)
- [ ] Find verification email for Test 1 user
- [ ] Click verification link
- [ ] **Expected**: Email verified confirmation
- [ ] **Expected**: Status changes to "pending approval"

#### Test 5: Invalid Verification Token
- [ ] Try invalid verification URL: `/auth/verify-email?token=invalid`
- [ ] **Expected**: Error message about invalid/expired token

### C. Admin Approval Flow

#### Test 6: Admin Dashboard Access
- [ ] Try accessing `/admin` without login
- [ ] **Expected**: Redirect to login or access denied
- [ ] Login as admin user
- [ ] Access `/admin/registrations`
- [ ] **Expected**: See pending registration from Test 1

#### Test 7: Registration Approval
- [ ] In admin dashboard, find Test 1 user
- [ ] Click "Approve" button
- [ ] **Expected**: Status changes to approved
- [ ] **Expected**: Welcome email sent (check MailHog)

#### Test 8: Registration Rejection
- [ ] Register another test user (Test 2)
- [ ] Verify email
- [ ] In admin dashboard, reject the user
- [ ] **Expected**: Status changes to rejected
- [ ] **Expected**: Rejection email sent (check MailHog)

### D. Login Authentication

#### Test 9: Successful Login
- [ ] Navigate to login page (`/auth/login`)
- [ ] Login with approved user credentials (Test 1)
- [ ] **Expected**: Successful login, redirected to dashboard
- [ ] **Expected**: User menu shows user info

#### Test 10: Login Security
- [ ] Try login with unverified user ❌
- [ ] Try login with rejected user ❌
- [ ] Try login with wrong password ❌
- [ ] Try login with non-existent email ❌
- [ ] **Expected**: All should fail with appropriate messages

#### Test 11: Session Management
- [ ] Login successfully
- [ ] Refresh browser
- [ ] **Expected**: Still logged in
- [ ] Logout
- [ ] **Expected**: Redirected to login page
- [ ] Try accessing protected page
- [ ] **Expected**: Redirected to login

---

## 🛡️ Security Tests

### E. Input Validation & Sanitization

#### Test 12: XSS Prevention
- [ ] Try registering with malicious input:
  - Email: `<script>alert('xss')</script>@test.com`
  - Name: `<img src=x onerror=alert(1)>`
- [ ] **Expected**: Input sanitized or rejected

#### Test 13: SQL Injection Prevention
- [ ] Try registration with SQL injection:
  - Name: `'; DROP TABLE users; --`
  - Email: `test'; DELETE FROM users; --@test.com`
- [ ] **Expected**: Input sanitized, no database errors

### F. Rate Limiting & Abuse Prevention

#### Test 14: Registration Rate Limiting
- [ ] Make multiple rapid registration attempts
- [ ] **Expected**: Rate limiting kicks in (429 status or similar)

#### Test 15: Login Rate Limiting
- [ ] Make multiple failed login attempts
- [ ] **Expected**: Account lockout or rate limiting

### G. Data Privacy & Security

#### Test 16: Password Security
- [ ] Check database: passwords should be hashed (bcrypt)
- [ ] **Expected**: No plain text passwords in database
- [ ] Passwords should not appear in logs

#### Test 17: Session Security
- [ ] Check session tokens are properly secured
- [ ] **Expected**: HttpOnly cookies or secure token handling
- [ ] Sessions should expire appropriately

---

## 🌐 Integration Tests

### H. Keycloak SSO Integration

#### Test 18: Keycloak Login (if configured)
- [ ] Try Keycloak SSO login option
- [ ] **Expected**: Redirects to Keycloak, returns with user data
- [ ] User should be created/updated in database

#### Test 19: Dual Authentication Support
- [ ] Test switching between email/password and SSO
- [ ] **Expected**: Both methods work seamlessly

### I. Email System Integration

#### Test 20: Email Templates
- [ ] Verify each email template renders correctly:
  - [ ] Verification email
  - [ ] Welcome email
  - [ ] Pending approval email
  - [ ] Rejection email
  - [ ] Admin notification
- [ ] **Expected**: Professional formatting, all variables populated

#### Test 21: Email Delivery
- [ ] Check MailHog for all email types
- [ ] **Expected**: All emails delivered successfully
- [ ] Verify email headers and content

---

## 🚀 Performance Tests

### J. Load & Performance

#### Test 22: Concurrent Registrations
- [ ] Multiple users register simultaneously
- [ ] **Expected**: All handled correctly without conflicts

#### Test 23: Database Performance
- [ ] Large number of registration records
- [ ] **Expected**: Admin dashboard loads quickly
- [ ] Pagination works correctly

---

## 📱 User Experience Tests

### K. Frontend Integration

#### Test 24: Form Validation
- [ ] Real-time validation on registration form
- [ ] **Expected**: Immediate feedback on invalid inputs
- [ ] Password strength indicator works

#### Test 25: Error Handling
- [ ] Network errors during registration
- [ ] Server errors during login
- [ ] **Expected**: User-friendly error messages

#### Test 26: Mobile Responsiveness
- [ ] Test on mobile device/responsive view
- [ ] **Expected**: Forms work well on mobile
- [ ] Navigation accessible

#### Test 27: Accessibility
- [ ] Test with screen reader
- [ ] Tab navigation works
- [ ] **Expected**: WCAG compliance features work

---

## ✅ Test Completion Summary

### Results Summary
- **Total Tests**: ___/27
- **Passed**: ___
- **Failed**: ___
- **Critical Issues**: ___
- **Minor Issues**: ___

### Critical Issues (must fix before production)
- [ ]
- [ ]

### Minor Issues (should fix)
- [ ]
- [ ]

### Notes
```
Add any additional observations, performance notes, or recommendations here.
```

---

## 🔧 Automated Test Execution

### Quick Test Run
```bash
# Run the automated test suite
cd backend-node
chmod +x run-auth-tests.sh
./run-auth-tests.sh
```

### Manual Service Start
```bash
# Start services manually
docker-compose up -d postgres mailhog redis
cd backend-node
npm run dev

# In another terminal, run tests
node test-authentication.js
```

### Test Environment URLs
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Admin Dashboard**: http://localhost:5173/admin
- **MailHog (Email)**: http://localhost:8025
- **Database**: localhost:5433

---

**Testing completed on**: _______________
**Tested by**: _______________
**Environment**: _______________
**Overall Status**: ⭕ Pass / ❌ Fail / ⚠️ Issues Found