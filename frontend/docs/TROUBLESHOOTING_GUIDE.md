# Troubleshooting Guide - Better Transition Management System

## Quick Reference

### Emergency Contacts
- **System Administrator**: [Contact Info TBD]
- **Development Team**: [Contact Info TBD]  
- **Help Desk**: [Contact Info TBD]
- **On-Call Support**: [Contact Info TBD]

### Critical System Status
- **Frontend URL**: http://localhost:5173 (Development)
- **Backend API**: http://localhost:3000/api
- **Database**: PostgreSQL via Prisma ORM
- **Health Check**: http://localhost:3000/health

---

## Common Issues and Solutions

### 1. Login and Authentication Issues

#### Problem: Cannot login to system
**Symptoms:**
- Login page loads but credentials rejected
- Authentication errors displayed
- Redirected back to login page

**Troubleshooting Steps:**
1. **Verify User Account Status**
   - Check if account is active (not deactivated/suspended)
   - Verify security clearance has not expired
   - Confirm PIV card status is valid

2. **Check System Status**
   - Visit health check endpoint: `/health`
   - Verify frontend and backend are running
   - Check network connectivity

3. **Clear Browser Data**
   ```bash
   # Clear browser cache and cookies
   - Chrome: Ctrl+Shift+Delete
   - Firefox: Ctrl+Shift+Delete  
   - Safari: Cmd+Option+E
   ```

4. **Contact Administrator**
   - If issue persists, contact system administrator
   - Provide username and timestamp of failed attempts
   - Include any error messages displayed

#### Problem: "Session expired" errors
**Symptoms:**
- Logged in but get session expired messages
- Intermittent authentication failures

**Solution:**
1. **Refresh Browser**: F5 or Ctrl+R
2. **Re-login**: Logout completely and login again
3. **Check Token Expiration**: Contact administrator if frequent

---

### 2. Transition Creation Issues

#### Problem: "New Team Member Transition" button not visible
**Symptoms:**
- Button missing from dashboard
- Access denied when trying to create transitions

**Troubleshooting Steps:**
1. **Verify User Role**
   - Confirm user has Program Manager or Director role
   - Check role assignments in User Management
   - Contact administrator for role verification

2. **Check Page Load**
   - Refresh dashboard page
   - Wait for page to fully load (check loading indicators)
   - Verify no JavaScript errors in browser console

3. **Browser Console Check**
   ```bash
   # Open browser developer tools
   - Chrome/Firefox: F12
   - Safari: Cmd+Option+I
   # Check Console tab for errors
   ```

#### Problem: Transition creation fails with validation errors
**Symptoms:**
- Form shows validation error messages
- Cannot submit transition form
- Red error indicators on form fields

**Common Validation Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| "Contract name is required" | Empty contract name field | Enter 1-255 character name |
| "Contract number already exists" | Duplicate contract number | Use unique contract number |
| "End date must be after start date" | Invalid date range | Select end date after start date |
| "Contract number is required" | Empty contract number | Enter 1-100 character number |

**Solution Steps:**
1. **Review All Fields**: Ensure all required fields completed
2. **Check Date Logic**: End date must be after start date
3. **Unique Contract Number**: Verify contract number not already used
4. **Field Length Limits**: Respect character limits shown

#### Problem: Transition form submission hangs or fails
**Symptoms:**
- Form submits but no response
- Loading spinner continues indefinitely
- Network errors displayed

**Troubleshooting Steps:**
1. **Check Network Connection**
   ```bash
   # Test API connectivity
   curl http://localhost:3000/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

2. **Check Backend Status**
   - Verify backend server running on port 3000
   - Check backend logs for errors
   - Confirm database connectivity

3. **Browser Network Tab**
   - Open Developer Tools > Network tab
   - Attempt form submission
   - Look for failed API calls (red status codes)
   - Check response details for error messages

4. **Retry Submission**
   - Wait 30 seconds and retry
   - If still failing, save form data and contact support

---

### 3. Navigation and Page Load Issues

#### Problem: Pages loading slowly (>3 seconds)
**Symptoms:**
- Extended loading times
- Page elements load gradually
- User experience degradation

**Performance Troubleshooting:**
1. **Browser Performance**
   - Close unnecessary browser tabs
   - Clear browser cache
   - Disable browser extensions temporarily

2. **Network Check**
   ```bash
   # Test network latency
   ping localhost
   # Check specific endpoints
   curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5173
   ```

3. **System Resources**
   - Check available memory and CPU
   - Close resource-intensive applications
   - Restart browser if memory usage high

4. **Contact Administrator**
   - Report consistent slow performance
   - Include browser type, version, and timing details

#### Problem: Search functionality not working
**Symptoms:**
- Search returns no results
- Search field not responsive
- Filter options not applying

**Troubleshooting Steps:**
1. **Verify Search Syntax**
   - Use simple search terms initially
   - Avoid special characters
   - Try partial matches

2. **Check Data Availability**
   - Confirm transitions/data exist
   - Try browsing without search filters
   - Verify user has access to search results

3. **Clear Search Filters**
   - Remove all applied filters
   - Reset to default view
   - Re-apply filters one at a time

---

### 4. Data Display and UI Issues

#### Problem: "Objects are not valid as a React child" error
**Symptoms:**
- White screen or partial page load
- Error message in browser console
- Specific sections not rendering

**This is a Known Fixed Issue:**
- **Root Cause**: Object serialization in React components
- **Fix Applied**: Updated milestone rendering in Enhanced Transition details
- **File**: `EnhancedTransitionDetailPage.tsx:302`
- **Solution**: Changed from rendering objects to object properties

**If Error Persists:**
1. **Hard Refresh**: Ctrl+Shift+R or Cmd+Shift+R
2. **Clear Cache**: Force reload without cache
3. **Check Browser Console**: Look for specific error details
4. **Report to Development**: Include full error message and steps to reproduce

#### Problem: Missing or incorrect data displayed
**Symptoms:**
- Empty sections where data should appear
- Outdated information shown
- Data inconsistencies

**Troubleshooting Steps:**
1. **Refresh Data**
   - Hard refresh page (Ctrl+Shift+R)
   - Navigate away and back to page
   - Check for data update indicators

2. **Verify Data Source**
   - Check if data exists in system
   - Confirm user permissions to view data
   - Look for filter settings affecting display

3. **API Response Check**
   ```bash
   # Check API endpoints directly
   curl http://localhost:3000/api/transitions
   curl http://localhost:3000/api/business-operations
   ```

---

### 5. Backend and Database Issues

#### Problem: API endpoints returning 500 errors
**Symptoms:**
- Server error messages
- Failed API calls in network tab
- Blank pages or error screens

**Troubleshooting Steps:**
1. **Check Backend Server Status**
   ```bash
   # Verify server is running
   curl http://localhost:3000/health
   
   # Check server logs
   npm run dev  # If running in development
   ```

2. **Database Connectivity**
   ```bash
   # Test database connection
   npx prisma db push --accept-data-loss
   
   # Generate Prisma client
   npx prisma generate
   ```

3. **Environment Variables**
   - Verify `.env` file exists and contains correct settings
   - Check database connection string
   - Confirm all required environment variables set

4. **Restart Services**
   ```bash
   # Restart backend server
   npm run dev
   
   # Reset database if needed (development only)
   npx prisma migrate reset
   ```

#### Problem: Database connection failures
**Symptoms:**
- "Unable to connect to database" errors
- API calls failing with database errors
- Data not persisting

**Solution Steps:**
1. **Check Database Service**
   - Verify PostgreSQL service running
   - Check database server status
   - Confirm connection credentials

2. **Connection String**
   ```bash
   # Verify connection string format
   DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
   ```

3. **Database Reset** (Development Only)
   ```bash
   # Reset database and re-seed
   npx prisma migrate reset
   npx prisma db seed
   ```

---

### 6. User Management and Security Issues

#### Problem: User invitation emails not sending
**Symptoms:**
- Users report not receiving invitation emails
- Invitation process appears to complete but no email

**Current Status:**
- **Email Service**: Not yet implemented (placeholder TODO)
- **Workaround**: Manual user setup required

**Solution:**
1. **Direct User Setup**: Contact administrator for manual account creation
2. **Alternative Communication**: Use secure channels to share invitation details
3. **Implementation Pending**: Email service integration planned

#### Problem: Security clearance or PIV validation errors
**Symptoms:**
- User access denied due to clearance issues
- PIV card validation failures
- Security compliance warnings

**Troubleshooting Steps:**
1. **Verify Clearance Status**
   - Check clearance expiration date
   - Confirm clearance level appropriate for role
   - Update clearance information if renewed

2. **PIV Card Validation**
   - Verify PIV card not expired
   - Check PIV status in user profile
   - Contact security administrator for PIV issues

3. **Update Security Information**
   - Navigate to User Management
   - Update security clearance details
   - Confirm PIV card expiration date

---

### 7. Testing and Development Issues

#### Problem: Cypress E2E tests failing
**Symptoms:**
- Test suite failures
- Cypress unable to connect to application
- Tests timing out

**Troubleshooting Steps:**
1. **Verify Application Running**
   ```bash
   # Ensure frontend running on port 5173
   npm run dev
   
   # Verify backend running on port 3000
   cd ../backend-node && npm run dev
   ```

2. **Update Cypress Configuration**
   ```bash
   # Check cypress.config.ts baseUrl
   baseUrl: 'http://localhost:5173'  # Should match frontend port
   ```

3. **Run Tests Manually**
   ```bash
   # Open Cypress test runner
   npm run test:e2e:open
   
   # Run headless tests
   npm run test:e2e:headless
   ```

4. **Debug Test Failures**
   - Review test output for specific failures
   - Check application state during test execution
   - Verify test data and mocks

---

## System Health Monitoring

### Health Check Endpoints
- **Frontend**: http://localhost:5173 (Development)
- **Backend**: http://localhost:3000/health
- **API Status**: http://localhost:3000/api/transitions (should return data)

### Performance Metrics
- **Page Load Time**: Target <3 seconds
- **API Response Time**: Target <2 seconds
- **Search Response**: Target <2 seconds

### Log Locations
- **Frontend Logs**: Browser Developer Tools Console
- **Backend Logs**: Terminal running `npm run dev`
- **Database Logs**: PostgreSQL logs (location varies by setup)

---

## Emergency Procedures

### System Down Scenarios

#### Complete System Outage
1. **Immediate Actions**
   - Check power and network connectivity
   - Verify server status
   - Contact system administrator

2. **Communication**
   - Notify affected users
   - Provide estimated recovery time
   - Use alternative communication channels

3. **Recovery Steps**
   - Follow disaster recovery plan
   - Restore from backups if necessary
   - Validate system functionality before reopening

#### Data Loss or Corruption
1. **Stop All Operations**
   - Immediately halt user access
   - Prevent further data writes
   - Assess extent of data loss

2. **Recovery Process**
   - Restore from most recent clean backup
   - Validate data integrity
   - Test system functionality thoroughly

3. **Post-Recovery**
   - Document incident and resolution
   - Update backup procedures if needed
   - Communicate resolution to stakeholders

### Security Incidents

#### Suspected Unauthorized Access
1. **Immediate Response**
   - Lock affected accounts
   - Change system passwords
   - Review access logs

2. **Investigation**
   - Document all findings
   - Preserve evidence
   - Contact security team

3. **Recovery**
   - Patch security vulnerabilities
   - Update security procedures
   - Notify appropriate authorities if required

---

## Getting Help

### Self-Service Resources
1. **Documentation**: Check API documentation and user workflows
2. **Browser Console**: Look for error messages and details
3. **Network Tab**: Check for failed API calls
4. **Health Check**: Verify system status via health endpoint

### Support Escalation
1. **Level 1 - Basic Issues**: User documentation and troubleshooting guide
2. **Level 2 - System Issues**: Contact system administrator
3. **Level 3 - Complex Issues**: Engage development team
4. **Level 4 - Critical Issues**: Emergency response procedures

### When Contacting Support
**Include the Following Information:**
- User role and permissions
- Exact error messages
- Steps to reproduce the issue
- Browser type and version
- Timestamp of the issue
- Screenshots if applicable

### Support Response Times
- **Critical Issues**: 1 hour response
- **High Priority**: 4 hours response  
- **Medium Priority**: 1 business day
- **Low Priority**: 3 business days

---

**Last Updated:** August 29, 2025  
**Document Version:** 1.0  
**Review Frequency:** Monthly