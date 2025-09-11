# Login Troubleshooting Guide for Richard Roach

## ✅ WORKING CREDENTIALS CONFIRMED

The following login credentials have been **verified to work** via direct API testing:

- **Email**: `richard.roach@gmail.com` OR `Richard.Roach@Gmail.com`
- **Password**: `T1PAdmin1234!`
- **User ID**: `user-mike-001`
- **Status**: ACTIVE

## 🎯 CORRECT LOGIN ENDPOINT

**The ONLY working endpoint is:**
```
POST http://localhost:3000/api/auth/authenticate
```

**Request Body:**
```json
{
  "email": "richard.roach@gmail.com",
  "password": "T1PAdmin1234!"
}
```

**Expected Response:**
```json
{
  "message": "Authentication successful",
  "user": {
    "id": "user-mike-001",
    "username": "richard.roach@gmail.com", 
    "email": "richard.roach@gmail.com",
    "roles": ["Observer"],
    "person": {
      "id": "person-mike-001",
      "firstName": "Richard",
      "lastName": "Roach"
    }
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

## ❌ ENDPOINTS THAT DON'T WORK

These endpoints will **NOT work** with your credentials:

1. **`/auth/login`** - Does not exist (404 error)
2. **`/api/auth/login`** - Expects Keycloak tokens or demo credentials only
3. **Any other variation** - Will not authenticate with password

## 🔍 TROUBLESHOOTING YOUR ISSUE

If you're still getting "invalid email or password" errors, check:

### 1. **Are you using the correct endpoint?**
- ❌ Wrong: `POST /auth/login` 
- ❌ Wrong: `POST /api/auth/login`
- ✅ Correct: `POST /api/auth/authenticate`

### 2. **Are you using the correct request format?**
- ❌ Wrong: `{"username": "...", "password": "..."}`
- ❌ Wrong: `{"keycloakToken": "..."}`
- ✅ Correct: `{"email": "richard.roach@gmail.com", "password": "T1PAdmin1234!"}`

### 3. **Frontend Application Issue?**
If you're using a web interface, it might be configured to call the wrong endpoint. Check:
- Browser Developer Tools → Network tab → See what API call is being made
- Look for the actual HTTP request being sent
- Verify it's calling `/api/auth/authenticate` with email/password

### 4. **Different Login Method?**
The system has multiple login methods:
- **Keycloak SSO** (requires configuration)
- **Demo Login** (requires AUTH_BYPASS=true)
- **Password Authentication** ← This is what works for you

Make sure you're using the password authentication method.

## 🧪 QUICK TEST

Run this command to verify the backend is working:

```bash
curl -X POST http://localhost:3000/api/auth/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email":"richard.roach@gmail.com","password":"T1PAdmin1234!"}'
```

**Expected Result**: Should return status 200 with user data and tokens.

## 🔧 SERVER REQUIREMENTS

Make sure the server is running with:
```bash
cd backend-node
npm run dev
```

Server should show:
```
Server listening at http://localhost:3000
```

## 📞 NEXT STEPS

If you're still having issues:

1. **Tell me exactly how you're trying to log in:**
   - Web browser interface? 
   - API client like Postman?
   - Mobile app?
   - Command line?

2. **Share the exact error message you're seeing**

3. **Check the browser/client network requests** to see what endpoint is being called

The authentication system is working correctly - we just need to identify why you're not reaching the correct endpoint.