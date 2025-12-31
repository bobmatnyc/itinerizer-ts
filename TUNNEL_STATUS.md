# Ngrok Tunnel Status

**Status:** ✓ ACTIVE

**Configuration:**
- Public URL: https://tripbot.ngrok.io
- Local Port: 5176 (viewer-svelte dev server)
- Tunnel Name: itinerizer
- Management Script: `scripts/ngrok-manage.sh`

**Access Details:**
- URL: https://tripbot.ngrok.io
- HTTP Auth: user:travel2025!

**Quick Commands:**
```bash
# Check status
bash scripts/ngrok-manage.sh status

# Restart tunnel
bash scripts/ngrok-manage.sh restart

# Test connectivity
bash scripts/ngrok-manage.sh test

# View logs
bash scripts/ngrok-manage.sh logs
```

**Last Updated:** 2025-12-29
**Verified:** Tunnel is active and responding with 302 redirects to /login (expected behavior)

**Configuration File:** `~/Library/Application Support/ngrok/ngrok.yml`
```yaml
itinerizer:
  proto: http
  addr: 5176
  domain: tripbot.ngrok.io
  metadata: "Itinerizer Travel Itinerary Manager"
```
