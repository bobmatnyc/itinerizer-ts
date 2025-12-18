/**
 * Viewer types for extensible itinerary visualization
 * @module domain/types/viewer
 */

import type { Itinerary } from './itinerary.js';
import type { Segment } from './segment.js';

/**
 * Available viewer types - extensible for future views
 */
export type ViewerType = 'hierarchical' | 'calendar' | 'map' | 'timeline' | 'print';

/**
 * Viewer output format
 */
export type ViewerOutputFormat = 'html' | 'json' | 'markdown';

/**
 * Configuration for viewer rendering
 */
export interface ViewerConfig {
  /** Viewer type to use */
  type: ViewerType;
  /** Output format */
  format: ViewerOutputFormat;
  /** Include inline styles */
  inlineStyles?: boolean;
  /** Theme (light/dark) */
  theme?: 'light' | 'dark';
  /** Collapsible sections */
  collapsible?: boolean;
  /** Show segment details */
  showDetails?: boolean;
  /** Group segments by day */
  groupByDay?: boolean;
  /** Include map data (for map view) */
  includeMapData?: boolean;
  /** Custom CSS path */
  customCss?: string;
}

/**
 * Day grouping for hierarchical view
 */
export interface ItineraryDay {
  /** Day number (1-indexed) */
  dayNumber: number;
  /** Date for this day */
  date: Date;
  /** Formatted date string */
  dateFormatted: string;
  /** Day title/summary */
  title: string;
  /** Segments for this day */
  segments: SegmentView[];
  /** Locations visited this day */
  locations: string[];
}

/**
 * Segment view model for rendering
 */
export interface SegmentView {
  /** Original segment ID */
  id: string;
  /** Segment type */
  type: Segment['type'];
  /** Display title */
  title: string;
  /** Short summary */
  summary: string;
  /** Time range formatted */
  timeRange: string;
  /** Location name */
  location?: string;
  /** Detailed content (bullet points) */
  details: string[];
  /** Status badge */
  status: string;
  /** Icon identifier */
  icon: string;
  /** CSS class for styling */
  cssClass: string;
  /** Raw segment data */
  raw: Segment;
}

/**
 * Itinerary view model for rendering
 */
export interface ItineraryView {
  /** Original itinerary ID */
  id: string;
  /** Trip title */
  title: string;
  /** Trip description/summary */
  description?: string;
  /** Date range formatted */
  dateRange: string;
  /** Duration in days */
  durationDays: number;
  /** Main destinations */
  destinations: string[];
  /** Trip type badge */
  tripType?: string;
  /** Status badge */
  status: string;
  /** Days with segments */
  days: ItineraryDay[];
  /** Metadata for display */
  metadata: ItineraryMetadata;
  /** Statistics */
  stats: ItineraryStats;
}

/**
 * Metadata extracted for display
 */
export interface ItineraryMetadata {
  /** Total travelers */
  travelerCount: number;
  /** Traveler names */
  travelerNames: string[];
  /** Tags */
  tags: string[];
  /** Created date formatted */
  createdAt: string;
  /** Last updated formatted */
  updatedAt: string;
  /** Version number */
  version: number;
}

/**
 * Statistics for the itinerary
 */
export interface ItineraryStats {
  /** Total segments */
  totalSegments: number;
  /** Flights count */
  flights: number;
  /** Hotels count */
  hotels: number;
  /** Activities count */
  activities: number;
  /** Transfers count */
  transfers: number;
  /** Meetings count */
  meetings: number;
  /** Custom segments count */
  custom: number;
}

/**
 * Rendered viewer output
 */
export interface ViewerOutput {
  /** Output content (HTML, JSON, or Markdown) */
  content: string;
  /** Content type */
  contentType: string;
  /** Viewer type used */
  viewerType: ViewerType;
  /** Associated CSS (if separate) */
  css?: string;
  /** Associated JavaScript (if separate) */
  js?: string;
  /** Metadata about the render */
  metadata: {
    generatedAt: Date;
    itineraryId: string;
    segmentCount: number;
    dayCount: number;
  };
}

/**
 * Viewer plugin interface - implement this to add new viewer types
 */
export interface ViewerPlugin {
  /** Unique plugin identifier */
  readonly id: ViewerType;
  /** Plugin display name */
  readonly name: string;
  /** Plugin description */
  readonly description: string;
  /** Supported output formats */
  readonly supportedFormats: ViewerOutputFormat[];

  /**
   * Render the itinerary
   * @param view - Processed itinerary view model
   * @param config - Viewer configuration
   * @returns Rendered output
   */
  render(view: ItineraryView, config: ViewerConfig): Promise<ViewerOutput>;
}

/**
 * Default viewer configuration
 */
export const DEFAULT_VIEWER_CONFIG: ViewerConfig = {
  type: 'hierarchical',
  format: 'html',
  inlineStyles: true,
  theme: 'light',
  collapsible: true,
  showDetails: true,
  groupByDay: true,
};
