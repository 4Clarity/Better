# AI Planning Security Documentation

## Overview

The AI Planning feature implements comprehensive security measures to protect sensitive transition planning data and ensure only authorized users can access AI capabilities.

---

## Security Features Implemented

### 1. Authentication & Authorization ✅

**Location**: `/backend-python/src/security/auth.py`

#### Role-Based Access Control (RBAC)

Only users with the following roles can access AI Planning:
- Program Manager
- Transition Manager
- Administrator
- System Admin

```python
from src.security import verify_program_manager

@app.post("/api/ai-planning/endpoint")
async def endpoint(user_id: str = Depends(verify_program_manager)):
    # Only authorized users reach this point
    ...
```

#### Authentication Methods Supported

1. **Development Mode** (Auth Bypass)
   ```http
   x-auth-bypass: true
   x-user-id: dev-user
   ```
   ⚠️ **Only for development! Disabled in production.**

2. **Header-Based Authentication** (from Keycloak)
   ```http
   x-user-id: user-123
   x-user-email: user@example.com
   x-user-roles: Program Manager, Administrator
   ```

3. **JWT Bearer Token** (Future)
   ```http
   Authorization: Bearer <jwt-token>
   ```
   📝 **Planned**: Full JWT validation in production

#### Session Ownership Verification

Users can only access their own planning sessions:

```python
verify_session_ownership(session_user_id, requesting_user_id)
# Raises 403 if user doesn't own session
```

---

### 2. Input Validation & Sanitization ✅

**Location**: `/backend-python/src/security/validation.py`

#### Injection Attack Prevention

All user input is scanned for dangerous patterns:
- SQL injection: `DROP`, `UNION SELECT`, etc.
- XSS: `<script>`, `javascript:`, event handlers
- Path traversal: `../`
- Encoded characters: `\x`, `%`

```python
from src.security import sanitize_string

answer = sanitize_string(user_input, "question_answer")
# Raises 400 if dangerous patterns detected
```

#### Data Type Validation

Answers are validated against question types:

```python
from src.security import validate_response_answer

# For "text" question
validate_response_answer("answer text", "text")

# For "number" question
validate_response_answer("42", "number")  # Converts to int

# For "date" question
validate_response_answer("2025-01-15", "date")  # Validates format

# For "multi_select" question
validate_response_answer(["Option A", "Option B"], "multi_select")
```

#### Length Limits

- **Strings**: 10,000 characters max
- **Lists**: 1,000 items max
- **Recursion**: Protected against deeply nested objects

#### ID Format Validation

```python
# UUID validation
validate_uuid("123e4567-e89b-12d3-a456-426614174000", "session ID")

# Transition ID validation (alphanumeric + hyphens)
validate_transition_id("trans-123-abc")
```

---

### 3. Audit Logging ✅

**Location**: `/backend-python/src/security/audit.py`

#### All Security-Relevant Events Logged

**Session Events**:
- `session_created`
- `session_accessed`
- `session_updated`
- `session_completed`
- `session_cancelled`
- `session_deleted`

**Response Events**:
- `responses_submitted`
- `responses_validated`

**Recommendation Events**:
- `recommendations_generated`
- `recommendations_updated`
- `recommendations_accepted`
- `recommendations_rejected`

**Security Events**:
- `auth_success`
- `auth_failure`
- `authorization_denied`
- `invalid_input_detected`
- `rate_limit_exceeded`

**AI Events**:
- `ai_generation_started`
- `ai_generation_completed`
- `ai_generation_failed`
- `fallback_used`

#### Audit Log Format

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "event_type": "session_created",
  "user_id": "user-123",
  "severity": "info",
  "session_id": "sess-456",
  "transition_id": "trans-789",
  "details": {
    "transition_type": "Contract",
    "execution_mode": "DirectLLM"
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0..."
}
```

#### Usage Example

```python
from src.security import log_session_created, log_auth_failure

# Log successful session creation
log_session_created(
    user_id="user-123",
    session_id="sess-456",
    transition_id="trans-789",
    transition_type="Contract",
    execution_mode="DirectLLM",
    ip_address=request.client.host
)

# Log authentication failure
log_auth_failure(
    user_id="unknown",
    reason="Invalid credentials",
    ip_address=request.client.host
)
```

---

### 4. Rate Limiting 🚧

**Status**: Placeholder implemented, requires Redis for production

#### Current Implementation

```python
from src.security import check_rate_limit

check_rate_limit(user_id, "create_session", limit=100, window=3600)
# Returns True (placeholder - always allows)
```

#### Production Implementation (TODO)

```python
import redis
from datetime import datetime

redis_client = redis.Redis(host='redis', port=6379)

def check_rate_limit(user_id: str, action: str, limit: int, window: int):
    key = f"rate_limit:{user_id}:{action}"
    current = redis_client.get(key)

    if current and int(current) >= limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    pipe = redis_client.pipeline()
    pipe.incr(key)
    pipe.expire(key, window)
    pipe.execute()

    return True
```

**Recommended Limits**:
- Session creation: 10 per hour per user
- Question submission: 50 per hour per user
- Recommendation generation: 20 per hour per user

---

## Security Best Practices

### 1. Development vs Production

**Development**:
```python
# .env
AUTH_BYPASS_ENABLED=true
ENVIRONMENT=development
```

**Production**:
```python
# .env
AUTH_BYPASS_ENABLED=false
ENVIRONMENT=production
JWT_SECRET_KEY=<random-32-byte-key>
JWT_ALGORITHM=HS256
```

### 2. HTTPS Only

All AI Planning endpoints must be served over HTTPS in production.

```nginx
# Traefik configuration
server {
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api/ai-planning/ {
        proxy_pass http://backend-python:8888;
    }
}
```

### 3. CORS Configuration

Restrict allowed origins:

```python
# main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tip.yourdomain.com",  # Production frontend
        "http://localhost:5173"  # Development only
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"]
)
```

### 4. Audit Log Retention

Store audit logs for compliance:

```python
# Configure separate audit log file
audit_handler = logging.FileHandler('/var/log/ai-planning/audit.log')
audit_handler.setFormatter(logging.Formatter('%(message)s'))
audit_logger.addHandler(audit_handler)

# Rotate logs (use logrotate or Python logging)
# Keep 90 days for compliance
```

### 5. Secrets Management

**Never commit secrets!**

```bash
# Use environment variables
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export JWT_SECRET_KEY=$(openssl rand -hex 32)

# Or use secrets management
# AWS Secrets Manager
# HashiCorp Vault
# Kubernetes Secrets
```

---

## Threat Model

### Threats Mitigated

| Threat | Mitigation | Status |
|--------|-----------|--------|
| Unauthorized Access | RBAC with role checking | ✅ |
| Session Hijacking | Session ownership verification | ✅ |
| SQL Injection | Input sanitization & Prisma ORM | ✅ |
| XSS Attacks | HTML/JS pattern blocking | ✅ |
| Path Traversal | Directory traversal detection | ✅ |
| DoS (Large Inputs) | Length limits on all inputs | ✅ |
| DoS (Rate Abuse) | Rate limiting (needs Redis) | 🚧 |
| Data Breach | Audit logging for detection | ✅ |
| Privilege Escalation | Role verification on each request | ✅ |
| CSRF | SameSite cookies + CORS | ⚠️ |
| Man-in-Middle | HTTPS enforcement | ⚠️ |

**Legend**:
- ✅ Implemented
- 🚧 Partial (placeholder)
- ⚠️ Infrastructure (Traefik/reverse proxy)

### Threats Requiring Additional Work

1. **CSRF Protection**
   - Add CSRF tokens to forms
   - Use SameSite cookie attribute
   - Implement Double Submit Cookie pattern

2. **Rate Limiting**
   - Deploy Redis for distributed rate limiting
   - Implement sliding window algorithm
   - Monitor for abuse patterns

3. **JWT Validation**
   - Implement full JWT decode & validation
   - Verify signature with public key
   - Check expiration and claims

---

## Compliance

### Data Protection

**GDPR Compliance**:
- ✅ Audit logs track all data access
- ✅ User ID tracked for data access requests
- ✅ Planning sessions can be deleted
- 📝 TODO: Implement data export endpoint
- 📝 TODO: Implement data deletion endpoint

**Example**:
```python
@app.delete("/api/ai-planning/user/{user_id}/data")
async def delete_user_data(
    user_id: str,
    requesting_user_id: str = Depends(verify_admin)
):
    """Delete all AI planning data for a user (GDPR right to erasure)."""
    await prisma.ai_planning_sessions.delete_many(
        where={"created_by": user_id}
    )
    log_audit_event(
        AuditEventType.USER_DATA_DELETED,
        user_id=requesting_user_id,
        details={"deleted_user": user_id}
    )
    return {"status": "deleted"}
```

### NIST Cybersecurity Framework

**Alignment**:
- **Identify**: Role-based access control
- **Protect**: Input validation, auth, encryption
- **Detect**: Audit logging, anomaly detection
- **Respond**: Error handling, graceful degradation
- **Recover**: Session recovery, fallback templates

---

## Security Testing

### 1. Unit Tests for Security Functions

```bash
# Run security tests
docker-compose exec backend-python python -m pytest /app/src/security/tests/ -v
```

### 2. Penetration Testing

**Test Cases**:
1. Attempt SQL injection in all input fields
2. Attempt XSS in text responses
3. Try accessing other users' sessions
4. Attempt to bypass role checks
5. Test rate limiting effectiveness
6. Try path traversal in IDs

**Tools**:
- OWASP ZAP
- Burp Suite
- SQLMap
- XSStrike

### 3. Security Scan

```bash
# Dependency vulnerability scan
pip install safety
safety check --file requirements.txt

# Code security scan
pip install bandit
bandit -r /app/src/
```

---

## Incident Response

### Detection

Monitor audit logs for:
- Multiple `auth_failure` events
- Multiple `authorization_denied` events
- Multiple `invalid_input_detected` events
- `rate_limit_exceeded` events

### Response Procedure

1. **Immediate**: Block IP if pattern detected
2. **Investigate**: Review audit logs for scope
3. **Notify**: Alert security team and affected users
4. **Remediate**: Patch vulnerability if found
5. **Document**: Record incident in security log

### Example Alert

```python
# Set up alerting on suspicious patterns
if (
    count(auth_failure, user_id, last_10_minutes) > 5
    or count(invalid_input_detected, ip_address, last_10_minutes) > 10
):
    send_security_alert(
        severity="HIGH",
        message=f"Potential attack from {ip_address}",
        details={...}
    )
```

---

## Security Roadmap

### Phase 1: Current (Implemented) ✅
- Role-based access control
- Input validation and sanitization
- Audit logging
- Session ownership verification

### Phase 2: Short-term (Next Sprint) 🎯
- [ ] Implement Redis-based rate limiting
- [ ] Add JWT validation
- [ ] Implement CSRF protection
- [ ] Set up automated security scanning in CI/CD
- [ ] Create GDPR data export/deletion endpoints

### Phase 3: Mid-term (Next Quarter) 📅
- [ ] Deploy WAF (Web Application Firewall)
- [ ] Implement anomaly detection on audit logs
- [ ] Add encryption at rest for sensitive data
- [ ] Conduct professional penetration test
- [ ] Implement security training for team

### Phase 4: Long-term (Ongoing) 🔄
- [ ] Regular security audits
- [ ] Vulnerability disclosure program
- [ ] Bug bounty program
- [ ] SOC 2 compliance
- [ ] ISO 27001 certification

---

## References

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **OWASP API Security**: https://owasp.org/www-project-api-security/
- **NIST Cybersecurity Framework**: https://www.nist.gov/cyberframework
- **CIS Controls**: https://www.cisecurity.org/controls/
- **GDPR**: https://gdpr.eu/
- **FastAPI Security**: https://fastapi.tiangolo.com/tutorial/security/

---

## Contact

For security concerns or to report vulnerabilities:
- **Email**: security@yourdomain.com
- **Bug Bounty**: https://hackerone.com/yourdomain
- **PGP Key**: [Link to public key]

**Do not disclose security vulnerabilities in public issues!**
