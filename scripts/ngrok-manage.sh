#!/bin/bash
# Itinerizer Ngrok Tunnel Management Script

TUNNEL_NAME="itinerizer"
DOMAIN="tripbot.ngrok.io"
PORT="5176"

function show_status() {
    echo "=== Ngrok Tunnel Status ==="
    echo ""

    if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
        echo "Ngrok API: RUNNING"
        echo ""
        curl -s http://localhost:4040/api/tunnels | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if not data['tunnels']:
        print('No active tunnels')
    else:
        for t in data['tunnels']:
            print(f\"✓ {t['public_url']} -> {t['config']['addr']}\")
            if 'metrics' in t:
                print(f\"  Connections: {t['metrics']['conns']['count']}\")
                print(f\"  HTTP Requests: {t['metrics']['http']['count']}\")
except Exception as e:
    print(f'Error parsing tunnels: {e}')
"
    else
        echo "Ngrok API: NOT RUNNING"
        echo "No active tunnels"
    fi

    echo ""
    echo "=== Viewer-Svelte Status ==="
    if lsof -i :$PORT > /dev/null 2>&1; then
        echo "✓ SvelteKit server running on port $PORT"
    else
        echo "✗ No server running on port $PORT"
        echo "  Start with: cd viewer-svelte && npm run dev"
    fi
}

function start_tunnel() {
    echo "Starting $TUNNEL_NAME tunnel..."

    # Check if server is running
    if ! lsof -i :$PORT > /dev/null 2>&1; then
        echo "WARNING: No server running on port $PORT"
        echo "Start viewer-svelte first: cd viewer-svelte && npm run dev"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    # Kill existing ngrok processes
    pkill -f ngrok > /dev/null 2>&1
    sleep 1

    # Start tunnel in background
    ngrok start $TUNNEL_NAME > /dev/null 2>&1 &

    # Wait for tunnel to start
    echo -n "Waiting for tunnel to initialize"
    for i in {1..10}; do
        sleep 1
        echo -n "."
        if curl -s http://localhost:4040/api/tunnels | grep -q "$DOMAIN"; then
            echo " ✓"
            echo ""
            echo "Tunnel started successfully!"
            show_status
            return 0
        fi
    done

    echo " ✗"
    echo "ERROR: Tunnel failed to start"
    echo "Check logs with: curl http://localhost:4040/api/tunnels"
    return 1
}

function stop_tunnel() {
    echo "Stopping ngrok tunnels..."
    pkill -f ngrok
    sleep 1
    echo "Done"
}

function restart_tunnel() {
    stop_tunnel
    echo ""
    start_tunnel
}

function show_logs() {
    if [ -f ~/Library/Logs/ngrok-itinerizer.log ]; then
        tail -50 ~/Library/Logs/ngrok-itinerizer.log
    else
        echo "No log file found (LaunchAgent not configured)"
        echo ""
        echo "Current API status:"
        curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -m json.tool || echo "Ngrok not running"
    fi
}

function test_tunnel() {
    echo "Testing tunnel..."
    echo ""

    if ! curl -s http://localhost:4040/api/tunnels | grep -q "$DOMAIN"; then
        echo "✗ Tunnel not running"
        echo "  Start with: $0 start"
        exit 1
    fi

    echo "Ngrok tunnel: ✓ Running"
    echo ""

    echo "Testing public endpoint..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN 2>/dev/null)

    if [ "$RESPONSE" = "401" ]; then
        echo "Public endpoint: ✓ Responding (401 - auth required)"
    elif [ "$RESPONSE" = "200" ]; then
        echo "Public endpoint: ✓ Responding (200 OK)"
    else
        echo "Public endpoint: ? Unexpected response ($RESPONSE)"
    fi

    echo ""
    echo "Full URL: https://$DOMAIN"
    echo "Credentials: user:travel2025!"
}

# Main command handler
case "$1" in
    start)
        start_tunnel
        ;;
    stop)
        stop_tunnel
        ;;
    restart)
        restart_tunnel
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    test)
        test_tunnel
        ;;
    *)
        echo "Itinerizer Ngrok Tunnel Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|test}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the itinerizer ngrok tunnel"
        echo "  stop    - Stop all ngrok tunnels"
        echo "  restart - Restart the tunnel"
        echo "  status  - Show tunnel and server status"
        echo "  logs    - Show recent logs"
        echo "  test    - Test tunnel connectivity"
        echo ""
        echo "Quick reference:"
        echo "  Tunnel: $DOMAIN -> localhost:$PORT"
        echo "  Config: ~/Library/Application Support/ngrok/ngrok.yml"
        echo "  Auth: user:travel2025!"
        exit 1
        ;;
esac
