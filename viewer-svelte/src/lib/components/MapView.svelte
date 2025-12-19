<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import type { Itinerary, Segment } from '$lib/types';

  let { itinerary }: { itinerary: Itinerary } = $props();

  let mapContainer = $state<HTMLDivElement | null>(null);
  let map: any = null;
  let L: any = null;

  // Helper to get segment title
  function getSegmentTitle(segment: Segment): string {
    switch (segment.type) {
      case 'FLIGHT':
        return `${segment.airline.name} ${segment.flightNumber}`;
      case 'HOTEL':
        return segment.property.name;
      case 'ACTIVITY':
        return segment.name;
      case 'TRANSFER':
        return `Transfer: ${segment.transferType}`;
      case 'CUSTOM':
        return segment.title;
      default:
        return 'Unknown';
    }
  }

  // Helper to get all locations from a segment
  function getSegmentLocations(segment: Segment): Array<{ lat: number; lng: number; name: string }> {
    const locs: Array<{ lat: number; lng: number; name: string }> = [];

    switch (segment.type) {
      case 'FLIGHT':
        if (segment.origin.coordinates) {
          locs.push({
            lat: segment.origin.coordinates.latitude,
            lng: segment.origin.coordinates.longitude,
            name: segment.origin.name
          });
        }
        if (segment.destination.coordinates) {
          locs.push({
            lat: segment.destination.coordinates.latitude,
            lng: segment.destination.coordinates.longitude,
            name: segment.destination.name
          });
        }
        break;
      case 'HOTEL':
      case 'ACTIVITY':
        if (segment.location.coordinates) {
          locs.push({
            lat: segment.location.coordinates.latitude,
            lng: segment.location.coordinates.longitude,
            name: segment.location.name
          });
        }
        break;
      case 'TRANSFER':
        if (segment.pickupLocation.coordinates) {
          locs.push({
            lat: segment.pickupLocation.coordinates.latitude,
            lng: segment.pickupLocation.coordinates.longitude,
            name: segment.pickupLocation.name
          });
        }
        if (segment.dropoffLocation.coordinates) {
          locs.push({
            lat: segment.dropoffLocation.coordinates.latitude,
            lng: segment.dropoffLocation.coordinates.longitude,
            name: segment.dropoffLocation.name
          });
        }
        break;
    }

    return locs;
  }

  // Extract unique locations from segments
  let locations = $derived.by(() => {
    const locMap = new Map<string, { lat: number; lng: number; name: string; segments: Segment[] }>();

    itinerary.segments.forEach((segment) => {
      const segmentLocs = getSegmentLocations(segment);

      segmentLocs.forEach((loc) => {
        const key = `${loc.lat},${loc.lng}`;

        if (!locMap.has(key)) {
          locMap.set(key, {
            lat: loc.lat,
            lng: loc.lng,
            name: loc.name,
            segments: []
          });
        }
        locMap.get(key)!.segments.push(segment);
      });
    });

    return Array.from(locMap.values());
  });

  // Get route points in chronological order (first location of each segment)
  let routePoints = $derived.by(() => {
    return itinerary.segments
      .map(s => {
        const locs = getSegmentLocations(s);
        if (locs.length > 0) {
          return {
            lat: locs[0].lat,
            lng: locs[0].lng,
            title: getSegmentTitle(s),
            datetime: s.startDatetime
          };
        }
        return null;
      })
      .filter((p): p is { lat: number; lng: number; title: string; datetime: string } => p !== null)
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  });

  onMount(async () => {
    if (!browser) return;

    // Dynamically import Leaflet to avoid SSR issues
    L = await import('leaflet');

    // Import Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Initialize map
    if (locations.length > 0) {
      const centerLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
      const centerLng = locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;

      map = L.map(mapContainer).setView([centerLat, centerLng], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // Add markers for each location
      locations.forEach((loc, index) => {
        const marker = L.marker([loc.lat, loc.lng]).addTo(map);

        const popupContent = `
          <div style="min-width: 200px;">
            <strong>${loc.name}</strong>
            <div style="margin-top: 8px; font-size: 0.875rem;">
              ${loc.segments.map(s => `<div>• ${getSegmentTitle(s)}</div>`).join('')}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
      });

      // Draw route lines between consecutive points
      if (routePoints.length > 1) {
        const latlngs = routePoints.map(p => [p.lat, p.lng]);

        L.polyline(latlngs, {
          color: '#3b82f6',
          weight: 3,
          opacity: 0.7,
          smoothFactor: 1
        }).addTo(map);

        // Add arrow decorators for direction (simple approach)
        for (let i = 0; i < routePoints.length - 1; i++) {
          const start = routePoints[i];
          const end = routePoints[i + 1];

          // Calculate midpoint
          const midLat = (start.lat + end.lat) / 2;
          const midLng = (start.lng + end.lng) / 2;

          // Add a small circle at midpoint to indicate direction
          L.circleMarker([midLat, midLng], {
            radius: 4,
            fillColor: '#3b82f6',
            color: '#ffffff',
            weight: 1,
            fillOpacity: 1
          }).addTo(map);
        }
      }

      // Fit bounds to show all markers
      if (locations.length > 0) {
        const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });
</script>

<div class="map-view">
  {#if locations.length === 0}
    <div class="map-empty">
      <p>No locations with coordinates found in this itinerary</p>
    </div>
  {:else}
    <div bind:this={mapContainer} class="map-container"></div>
  {/if}
</div>

<style>
  .map-view {
    height: 100%;
    width: 100%;
    position: relative;
  }

  .map-container {
    height: 100%;
    width: 100%;
  }

  .map-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background-color: #f9fafb;
  }

  .map-empty p {
    color: #6b7280;
    font-size: 0.875rem;
  }

  /* Override Leaflet default styles for better integration */
  :global(.leaflet-container) {
    font-family: inherit;
  }

  :global(.leaflet-popup-content-wrapper) {
    border-radius: 0.5rem;
  }

  :global(.leaflet-popup-content) {
    margin: 0.75rem;
  }
</style>
