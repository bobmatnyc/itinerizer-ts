/**
 * Visualization Store - Svelte 5 Runes-based state management
 * Manages map and calendar visualizations with history tracking
 */

// Types
export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  type: 'flight' | 'hotel' | 'activity' | 'transfer' | 'origin' | 'destination';
}

export interface MapVisualizationData {
  markers: MapMarker[];
  polylines?: Array<{ points: Array<{ lat: number; lng: number }>; color?: string }>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date
  end: string;   // ISO date
  type: string;
}

export interface CalendarVisualizationData {
  events: CalendarEvent[];
  viewRange?: { start: string; end: string };
}

export interface Visualization {
  id: string;
  type: 'map' | 'calendar';
  timestamp: Date;
  label: string;
  data: MapVisualizationData | CalendarVisualizationData;
}

interface VisualizationState {
  current: Visualization | null;
  history: Visualization[];
  isPaneVisible: boolean;
  isPaneCollapsed: boolean;
}

// Store implementation using Svelte 5 runes
function createVisualizationStore() {
  let state = $state<VisualizationState>({
    current: null,
    history: [],
    isPaneVisible: false,
    isPaneCollapsed: false
  });

  return {
    // Reactive getters
    get current() {
      return state.current;
    },
    get history() {
      return state.history;
    },
    get isPaneVisible() {
      return state.isPaneVisible;
    },
    get isPaneCollapsed() {
      return state.isPaneCollapsed;
    },

    // Actions
    addVisualization(
      type: 'map' | 'calendar',
      data: MapVisualizationData | CalendarVisualizationData,
      label: string
    ) {
      const visualization: Visualization = {
        id: crypto.randomUUID(),
        type,
        timestamp: new Date(),
        label,
        data
      };

      state.current = visualization;
      state.history = [...state.history, visualization];
      state.isPaneVisible = true;
    },

    setCurrentVisualization(id: string) {
      const visualization = state.history.find(v => v.id === id);
      if (visualization) {
        state.current = visualization;
        state.isPaneVisible = true;
      }
    },

    togglePaneVisibility() {
      state.isPaneVisible = !state.isPaneVisible;
    },

    togglePaneCollapsed() {
      state.isPaneCollapsed = !state.isPaneCollapsed;
    },

    clearHistory() {
      state.history = [];
      state.current = null;
    }
  };
}

// Singleton store instance
export const visualizationStore = createVisualizationStore();

// Helper functions

/**
 * Extract visualization data from a tool result
 */
export function extractVisualizationFromToolResult(
  toolName: string,
  result: unknown
): { type: 'map' | 'calendar'; data: MapVisualizationData | CalendarVisualizationData; label: string } | null {
  if (!result || typeof result !== 'object') {
    return null;
  }

  // Handle map visualizations
  if (toolName.includes('map') || toolName.includes('location') || toolName.includes('route')) {
    const mapData = extractMapDataFromToolResult(result);
    if (mapData) {
      return {
        type: 'map',
        data: mapData,
        label: `Map: ${toolName}`
      };
    }
  }

  // Handle calendar visualizations
  if (toolName.includes('calendar') || toolName.includes('schedule') || toolName.includes('timeline')) {
    const calendarData = extractCalendarDataFromToolResult(result);
    if (calendarData) {
      return {
        type: 'calendar',
        data: calendarData,
        label: `Calendar: ${toolName}`
      };
    }
  }

  return null;
}

/**
 * Check if an object has valid coordinates
 */
export function hasCoordinates(obj: any): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Check for lat/lng or latitude/longitude
  const hasLatLng =
    (typeof obj.lat === 'number' && typeof obj.lng === 'number') ||
    (typeof obj.latitude === 'number' && typeof obj.longitude === 'number');

  // Check for coordinates object
  const hasCoordinatesObj =
    obj.coordinates &&
    typeof obj.coordinates === 'object' &&
    (typeof obj.coordinates.lat === 'number' && typeof obj.coordinates.lng === 'number');

  return hasLatLng || hasCoordinatesObj;
}

/**
 * Extract map data from a segment or any object with location data
 */
export function extractMapDataFromSegment(segment: any): MapVisualizationData {
  const markers: MapMarker[] = [];
  const polylines: Array<{ points: Array<{ lat: number; lng: number }>; color?: string }> = [];

  if (!segment || typeof segment !== 'object') {
    return { markers, polylines };
  }

  // Helper to normalize coordinates
  const normalizeCoords = (obj: any): { lat: number; lng: number } | null => {
    if (typeof obj.lat === 'number' && typeof obj.lng === 'number') {
      return { lat: obj.lat, lng: obj.lng };
    }
    if (typeof obj.latitude === 'number' && typeof obj.longitude === 'number') {
      return { lat: obj.latitude, lng: obj.longitude };
    }
    if (obj.coordinates && typeof obj.coordinates === 'object') {
      return normalizeCoords(obj.coordinates);
    }
    return null;
  };

  // Helper to create marker
  const createMarker = (coords: { lat: number; lng: number }, label: string, type: MapMarker['type']): MapMarker => ({
    lat: coords.lat,
    lng: coords.lng,
    label,
    type
  });

  // Extract origin/destination for flights
  if (segment.type === 'flight' || segment.segmentType === 'flight') {
    if (segment.origin && hasCoordinates(segment.origin)) {
      const coords = normalizeCoords(segment.origin);
      if (coords) {
        markers.push(createMarker(coords, segment.origin.name || 'Origin', 'origin'));
      }
    }
    if (segment.destination && hasCoordinates(segment.destination)) {
      const coords = normalizeCoords(segment.destination);
      if (coords) {
        markers.push(createMarker(coords, segment.destination.name || 'Destination', 'destination'));
      }
    }

    // Add polyline for flight path
    if (markers.length === 2) {
      polylines.push({
        points: [
          { lat: markers[0].lat, lng: markers[0].lng },
          { lat: markers[1].lat, lng: markers[1].lng }
        ],
        color: '#3b82f6' // Blue for flights
      });
    }
  }

  // Extract hotel location
  if (segment.type === 'hotel' || segment.segmentType === 'hotel') {
    if (segment.location && hasCoordinates(segment.location)) {
      const coords = normalizeCoords(segment.location);
      if (coords) {
        markers.push(createMarker(coords, segment.name || 'Hotel', 'hotel'));
      }
    }
  }

  // Extract activity location
  if (segment.type === 'activity' || segment.segmentType === 'activity') {
    if (segment.location && hasCoordinates(segment.location)) {
      const coords = normalizeCoords(segment.location);
      if (coords) {
        markers.push(createMarker(coords, segment.name || 'Activity', 'activity'));
      }
    }
  }

  // Extract transfer locations
  if (segment.type === 'transfer' || segment.segmentType === 'transfer') {
    const points: Array<{ lat: number; lng: number }> = [];

    if (segment.from && hasCoordinates(segment.from)) {
      const coords = normalizeCoords(segment.from);
      if (coords) {
        markers.push(createMarker(coords, segment.from.name || 'From', 'transfer'));
        points.push(coords);
      }
    }
    if (segment.to && hasCoordinates(segment.to)) {
      const coords = normalizeCoords(segment.to);
      if (coords) {
        markers.push(createMarker(coords, segment.to.name || 'To', 'transfer'));
        points.push(coords);
      }
    }

    // Add polyline for transfer route
    if (points.length === 2) {
      polylines.push({
        points,
        color: '#10b981' // Green for transfers
      });
    }
  }

  return { markers, polylines: polylines.length > 0 ? polylines : undefined };
}

/**
 * Extract map data from a tool result
 */
function extractMapDataFromToolResult(result: any): MapVisualizationData | null {
  // Check if result has segment-like structure
  if (result.segment) {
    return extractMapDataFromSegment(result.segment);
  }

  // Check if result IS a segment
  if (hasCoordinates(result) || result.type || result.segmentType) {
    return extractMapDataFromSegment(result);
  }

  // Check for array of segments
  if (Array.isArray(result.segments)) {
    const allMarkers: MapMarker[] = [];
    const allPolylines: Array<{ points: Array<{ lat: number; lng: number }>; color?: string }> = [];

    for (const segment of result.segments) {
      const data = extractMapDataFromSegment(segment);
      allMarkers.push(...data.markers);
      if (data.polylines) {
        allPolylines.push(...data.polylines);
      }
    }

    if (allMarkers.length > 0) {
      return {
        markers: allMarkers,
        polylines: allPolylines.length > 0 ? allPolylines : undefined
      };
    }
  }

  return null;
}

/**
 * Extract calendar data from a tool result
 */
function extractCalendarDataFromToolResult(result: any): CalendarVisualizationData | null {
  const events: CalendarEvent[] = [];

  // Check for events array
  if (Array.isArray(result.events)) {
    for (const event of result.events) {
      if (event.start && event.title) {
        events.push({
          id: event.id || crypto.randomUUID(),
          title: event.title,
          start: event.start,
          end: event.end || event.start,
          type: event.type || 'event'
        });
      }
    }
  }

  // Check for segments with dates
  if (Array.isArray(result.segments)) {
    for (const segment of result.segments) {
      if (segment.startDate || segment.date) {
        events.push({
          id: segment.id || crypto.randomUUID(),
          title: segment.name || segment.title || 'Event',
          start: segment.startDate || segment.date,
          end: segment.endDate || segment.startDate || segment.date,
          type: segment.type || segment.segmentType || 'segment'
        });
      }
    }
  }

  if (events.length === 0) {
    return null;
  }

  // Calculate view range
  const dates = events.flatMap(e => [new Date(e.start), new Date(e.end)]);
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  return {
    events,
    viewRange: {
      start: minDate.toISOString(),
      end: maxDate.toISOString()
    }
  };
}
