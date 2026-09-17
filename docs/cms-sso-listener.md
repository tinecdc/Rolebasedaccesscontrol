 # CMS SSO listener

Add this snippet to the CMS (target app) to accept the SSO payload posted from the RBA portal.

Place in an initialization script that runs on page load:

```js
// Accept SSO payload from the RBA portal
window.addEventListener('message', (ev) => {
  try {
    const data = ev.data;
    if (!data || data.type !== 'rba-sso') return;

    // Example: validate and sign the user in locally
    // data.user will contain id, name, email, avatar, department, role, token
    // Implement your own validation or session creation here.

    console.info('RBA SSO payload received', data);

    // Optionally store token locally
    if (data.token) {
      try {
        localStorage.setItem('rba_sso_token', data.token);
      } catch {}
    }

    // Notify opener that we've accepted the SSO payload
    try {
      ev.source?.postMessage({ type: 'rba-sso-ack', receivedAt: Date.now() }, '*');
    } catch {}
  } catch (e) {
    // ignore
  }
});
```

Notes:
- This is a simple example for demo/dev usage. For production, validate origin, verify the token, and establish a server-side session before acknowledging.
- If the CMS also supports reading `rbaSso` URL param, keep that as a fallback (the RBA portal sends both).