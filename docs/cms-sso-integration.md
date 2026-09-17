# RBA → CMS SSO Integration Guide

This document explains how the Role-Based Access (RBA) portal and a target CMS can perform a lightweight SSO handshake for development and integration testing. It includes the payload schema, example code for the portal and the CMS, security considerations, and testing steps.

> Warning: The supplied examples are intended for demo/dev and local integration. For production you must validate origins, verify tokens server-side, and establish a secure server-side session before granting access.

## Overview

- The RBA portal signs the user in locally and builds a compact SSO payload containing user metadata and a temporary token.
- When a user clicks a linked system card (CMS), the portal opens the CMS URL and sends the payload to the CMS in two ways:
  1. As a URL parameter named `rbaSso` (base64-encoded JSON). This is a fallback for cases where `postMessage` cannot be delivered or if the CMS reads the param on load.
  2. Via `window.postMessage(payload)` to the newly opened window. The portal will retry posting periodically until the CMS acknowledges receipt.
- The CMS should accept the payload, validate it, create a local session (server-side), and optionally reply with an acknowledgement message (`{ type: 'rba-sso-ack' }`).

## Payload schema (example)

The portal sends a JSON object. Example fields (portal may include additional fields):

```json
{
  "type": "rba-sso",
  "source": "rba",
  "sentAt": 1690000000000,
  "token": "<temporary-token-or-random-string>",
  "user": {
    "id": "user-uuid",
    "name": "Jane Admin",
    "email": "jane@company.com",
    "username": "jane@company.com",
    "avatar": "JA",
    "department": "Operations",
    "role": "Admin",
    "is_active": 1,
    "is_staff": 1,
    "is_superuser": 1,
    "permissions": ["read","write","manage"],
    "systems": [ { "systemId": "system-a", "role": "admin" } ]
  }
}
```

Notes:
- `token` should be short-lived and verifiable by the CMS's server (preferably a signed JWT or HMAC-signed string). The example portal uses a lightweight opaque value for demos.
- Keep the data minimal — do not include secrets or long-lived credentials.

## Portal behavior (what we changed)

Location: `src/app/components/portal-home.tsx`

- For a particular system (e.g., `system-e`) the portal builds the SSO payload, sets a `rbaSso` query param using `encodeURIComponent(btoa(JSON.stringify(payload)))`, then attempts to open the CMS in a new window.
- If the popup is blocked, the portal falls back to `window.location.assign()` with the `rbaSso` query param.
- If the new window is opened, the portal sends the payload via `postMessage` immediately and retries every 300ms until the CMS responds with `{ type: 'rba-sso-ack' }` or a 6s timeout passes.

This hybrid approach maximizes compatibility across browsers and CMS implementations.

## CMS integration (example listener)

Add a small client-side snippet to the CMS that runs on page load. This snippet demonstrates how to accept the `postMessage` payload and reply with an acknowledgement. Replace the example session-creation logic with your secure, server-side flow.

```js
// Example: place in a script that runs early on page load
window.addEventListener('message', (ev) => {
  try {
    // Optional: check origin for security
    // if (ev.origin !== 'https://your-rba.example.com') return;

    const data = ev.data;
    if (!data || data.type !== 'rba-sso') return;

    // Validate payload structure
    console.info('RBA SSO payload received', data);

    // Example: store token locally (dev only)
    if (data.token) {
      try { localStorage.setItem('rba_sso_token', data.token); } catch (e) {}
    }

    // TODO: POST token to CMS server to create a secure session
    // fetch('/session/sso-login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ token: data.token, user: data.user }) })
    //   .then(() => { ev.source?.postMessage({ type: 'rba-sso-ack', status: 'ok' }, ev.origin); });

    // Notify the opener/window that we accepted the payload.
    try { ev.source?.postMessage({ type: 'rba-sso-ack', receivedAt: Date.now() }, '*'); } catch (e) {}
  } catch (e) {
    // ignore in demo
  }
});
```

### Fallback: reading the `rbaSso` URL param

If the CMS prefers to read the URL parameter instead of `postMessage`, decode it on load and process the payload:

```js
function tryReadRbaSsoParam() {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('rbaSso');
    if (!encoded) return null;
    const decoded = JSON.parse(atob(decodeURIComponent(encoded)));
    return decoded;
  } catch (e) {
    return null;
  }
}

const ssoFromParam = tryReadRbaSsoParam();
if (ssoFromParam) {
  // process as above
}
```

## Security checklist (production)

- Always run over HTTPS.
- Use a verifiable token: signed JWTs (with expiration) or an HMAC-signed opaque token the CMS server can verify with a shared secret.
- Validate `ev.origin` and only accept messages from trusted origins.
- Do not accept `postMessage`-only as the final authority for authentication — perform a server-side POST to your CMS backend that verifies the token and creates an authenticated server-side session (set cookie with Secure, HttpOnly, SameSite attributes).
- Limit the lifetime of tokens and rotate signing keys as needed.
- Log SSO attempts and failures for auditing.
- Avoid including sensitive or PII beyond what is necessary.

## Testing steps (manual)

1. Start the RBA server:

```bash
npm --prefix server run dev
```

2. Start the frontend dev server (from repository root):

```bash
npm run dev
```

3. Ensure the CMS target site is reachable locally (for example `http://localhost:5174/`). Add the listener snippet to the CMS page.

4. Sign into the RBA portal with a demo account (e.g., `admin@company.com`).

5. In the portal, click the CMS system card. The portal will open the CMS:
   - If the CMS accepts the `postMessage` payload and replies with an ack, the portal stops retrying.
   - If `postMessage` fails, the CMS should read the `rbaSso` URL param.

6. Verify the CMS created a session for the user (cookies, UI, server logs).

## Troubleshooting

- If nothing happens when clicking the CMS card:
  - Open browser devtools on the CMS window and check `console` for `RBA SSO payload received`.
  - Confirm the RBA portal opened a new window/tab (popup blocker may have blocked it; portal falls back to same-tab navigation).
  - Check localStorage for `rba_sso_token` (dev flow).
- If CMS reports invalid token:
  - Ensure token verification logic on the CMS server matches the signature method used by the portal.
  - Confirm token TTL and clock skew.
- If cross-origin errors appear:
  - Verify `ev.origin` handling and `postMessage` target origin. For development you can use `'*'` but production must use precise origins.

## Next steps / enhancements

- Implement a server-side SSO verification endpoint on the portal that issues short-lived signed tokens (JWT). CMS should POST token to its backend for verification and session creation.
- Add origin allowlist configuration to both apps.
- Optionally implement OAuth/OIDC for a robust production SSO solution.

---

If you want, I can:
- Add a simple CMS server endpoint example that verifies a token and sets a secure session cookie.
- Implement token signing on the portal (JWT) and verification on the CMS server (dev-only implementation).

Which would you like me to add next?