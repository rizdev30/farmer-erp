# Farmer ERP Security Measures & Data Protection Guidelines

This document outlines the security protocols, architecture decisions, and active measures taken to protect the Farmer ERP application and sensitive farmer data from unauthorized access, data breaches, and other cyber threats.

## 1. Authentication & Route Protection (Zero Trust Approach)

### Case Study: Direct URL Bypass Prevention
**Threat:** Unauthorized users attempting to access sensitive application data by directly pasting URLs (e.g., `/dashboard/procurement`) into their browser, bypassing the login screen.
**Solution Implemented:**
- Replaced the standard routing checks with a robust, centrally configured Next.js middleware using `proxy.ts`.
- Implemented a **mandatory session validation check** on all protected routes before any data is fetched or rendered.
- **Logic:** Whenever a user requests a protected route, the middleware intercepts the request and verifies the existence and validity of the user's authentication token.
- **Action:** If the token is missing, expired, or invalid, the system immediately halts the request and forces a server-side HTTP redirect to the `/login` page.
- **Result:** Application pages and data are strictly inaccessible without a verified active session. No unauthorized user can view the UI structure or data.

## 2. Role-Based Access Control (RBAC)
- **Hierarchical Access:** The system employs a strict hierarchical authorization model (L1 to L4, plus Super Admin roles).
- **Data Segregation:** Users can only view and modify data (such as procurement records or farmer profiles) that fall within their authorized jurisdiction. For instance, L2 agents cannot access Super Admin agent management dashboards.
- **Double Validation:** Unauthorized actions are blocked both visually at the UI level (buttons hidden/disabled) and securely at the API level (endpoints reject unauthorized requests with 403 Forbidden).

## 3. Data Validation & Integrity
- **Strict Input Validation:** Crucial fields (State, Company, Promoter, PAN/GST) are enforced as mandatory at the schema level during registration and procurement. This prevents the creation of incomplete, anomalous, or malicious "ghost" records.
- **Sanitization:** All user inputs from the mobile and desktop interfaces are sanitized before database insertion to prevent Cross-Site Scripting (XSS) and Database Injection attacks.

## 4. Farmer Data Privacy (PII Protection)
- **Data Minimization:** Only necessary data required for procurement and identity management is collected from the farmers.
- **Secure Identity Management:** Unifying farmer and trader identity management ensures that sensitive business details (PAN/GST) are structured and governed by strict access rules.
- **State-Specific Isolation:** Procurement slips and data are segmented by state and company, ensuring that data does not bleed across regional boundaries unauthorized.

## 5. Infrastructure & Application Security
- **Spam & Bot Protection:** Integration of Google reCAPTCHA (v2) on public-facing forms to prevent automated bot attacks and credential stuffing.
- **Environment Segregation:** All sensitive keys (Database URIs, JWT Secrets, API keys) are stored in secure `.env` files and never exposed to the client-side browser.
- **Next.js Server-Side Security:** Utilizing Server Components and Server Actions ensures that sensitive database queries and business logic never ship to the user's browser.

---

## 6. Security Checklist for Future Enhancements
To ensure continued safety, monitor and apply the following measures if they are not yet fully covered:

- [ ] **Rate Limiting:** Implement API rate limiting (especially on `/login` and password reset routes) to prevent brute-force attacks.
- [ ] **Session Expiration & Inactivity:** Enforce absolute session timeouts (e.g., requiring a new login every 24 hours) and idle timeouts (logging out users after 30 minutes of inactivity).
- [ ] **Multi-Factor Authentication (MFA):** Introduce SMS or Authenticator App-based 2FA for high-level accounts (Super Admins, L4).
- [ ] **Audit Logging:** Implement comprehensive audit trails that log *who* accessed, modified, or exported specific farmer records and *when*.
- [ ] **Database Encryption at Rest:** Verify with the database provider that all farmer PII is encrypted on the storage disks.
- [ ] **Dependency Audits:** Regularly run `npm audit` to patch known vulnerabilities in Next.js, React, or third-party libraries.
