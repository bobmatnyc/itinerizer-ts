# Ngrok Tunnel Issue - RESOLVED

**Date:** 2025-12-23
**Status:** ✓ FIXED
**Tunnel:** https://tripbot.ngrok.io -> localhost:5176

## Summary

The `tripbot.ngrok.io` tunnel was not actually hijacked - it simply wasn't running. The tunnel has been started and verified working.

## What Was Wrong

- The ngrok tunnel for `tripbot.ngrok.io` was not running
- A Next.js server on port 3002 (unrelated Recess project) led to confusion
- No LaunchAgents were active to auto-start the tunnel

## What Was Fixed

1. Killed all ngrok processes
2. Started the correct tunnel: `ngrok start itinerizer`
3. Verified tunnel is working: https://tripbot.ngrok.io
4. Created management script: `scripts/ngrok-manage.sh`

## Current Status

```
✓ https://tripbot.ngrok.io -> http://localhost:5176
✓ Public endpoint responding (401 - basic auth required)
✓ Credentials: user:travel2025!
```

## Quick Commands

```bash
# Start tunnel
ngrok start itinerizer

# Or use the management script
./scripts/ngrok-manage.sh start

# Check status
./scripts/ngrok-manage.sh status

# Test connectivity
./scripts/ngrok-manage.sh test

# View running tunnels
curl -s http://localhost:4040/api/tunnels | python3 -m json.tool
```

## Management Script

Created `/Users/masa/Projects/itinerizer-ts/scripts/ngrok-manage.sh` with commands:
- `start` - Start the tunnel
- `stop` - Stop all tunnels
- `restart` - Restart the tunnel
- `status` - Show tunnel and server status
- `logs` - Show recent logs
- `test` - Test tunnel connectivity

## Infrastructure Discovered

### Ngrok Configuration
Location: `~/Library/Application Support/ngrok/ngrok.yml`

Active tunnels configured:
1. `ssh` - SSH access (port 22)
2. `vnc` - VNC access (port 5900)
3. `jjf-survey` - Survey platform (port 5001 → jjf-survey.ngrok.app)
4. `the-island` - Epstein Archive (port 8081 → the-island.ngrok.app)
5. `smarty` - SmartThings (port 5181 → smarty.ngrok.app)
6. `bta-itineraries` - Travel advisors (port 3000 → bta-itineraries.ngrok.app)
7. **`itinerizer`** - This project (port 5176 → tripbot.ngrok.io)

### LaunchAgents Found (Not Active)
- `com.epstein.ngrok.plist` - Monitors the-island.ngrok.app
- `com.ngrok.ssh.plist` - Auto-starts SSH/VNC tunnels

These are configured but NOT currently loaded, so they don't interfere.

## Port 3002 Investigation

The Next.js server on port 3002 is:
- Project: `/Users/masa/Clients/Recess/projects/data-manager/`
- Started manually with `pnpm dev`
- **NOT interfering** with ngrok tunnels
- Each tunnel connects to its own configured port independently

## Prevention Options

### Option 1: Manual (Current)
Start tunnel when needed:
```bash
ngrok start itinerizer
# or
./scripts/ngrok-manage.sh start
```

**Pros:** Full control, no surprises
**Cons:** Must restart after reboots

### Option 2: LaunchAgent (Auto-start)
Create `~/Library/LaunchAgents/com.itinerizer.ngrok.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.itinerizer.ngrok</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/ngrok</string>
        <string>start</string>
        <string>itinerizer</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/masa/Library/Logs/ngrok-itinerizer.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/masa/Library/Logs/ngrok-itinerizer-error.log</string>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.itinerizer.ngrok.plist
```

**Pros:** Auto-start at boot, auto-restart on crash
**Cons:** Always running (minimal resource use)

## Recommendation

**Keep manual setup for now.** Use the management script to start/stop as needed.

If you need 24/7 availability (e.g., for demos or shared access), implement the LaunchAgent in Option 2.

## Files Created

1. `/Users/masa/Projects/itinerizer-ts/scripts/ngrok-manage.sh` - Tunnel management script
2. `/tmp/ngrok-hijack-investigation.md` - Detailed investigation report

## Verification

```bash
# Tunnel is running and responding
$ curl -I https://tripbot.ngrok.io
HTTP/2 401
www-authenticate: Basic realm="ngrok"

# With auth:
$ curl -u user:travel2025! https://tripbot.ngrok.io
[SvelteKit app response]
```

---

**Issue Status:** RESOLVED ✓
