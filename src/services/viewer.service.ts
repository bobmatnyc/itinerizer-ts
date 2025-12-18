/**
 * Viewer service for rendering itineraries in multiple formats
 * @module services/viewer
 */

import type { Itinerary } from '../domain/types/itinerary.js';
import type { Segment } from '../domain/types/segment.js';
import type {
  ItineraryDay,
  ItineraryMetadata,
  ItineraryStats,
  ItineraryView,
  SegmentView,
  ViewerConfig,
  ViewerOutput,
  ViewerPlugin,
  ViewerType,
} from '../domain/types/viewer.js';
import { DEFAULT_VIEWER_CONFIG } from '../domain/types/viewer.js';

/**
 * Service for rendering itineraries with extensible viewer plugins
 */
export class ViewerService {
  private plugins: Map<ViewerType, ViewerPlugin> = new Map();

  /**
   * Register a viewer plugin
   * @param plugin - Plugin to register
   */
  registerPlugin(plugin: ViewerPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Get registered plugin
   * @param type - Viewer type
   */
  getPlugin(type: ViewerType): ViewerPlugin | undefined {
    return this.plugins.get(type);
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): ViewerPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Transform itinerary to view model
   * @param itinerary - Source itinerary
   * @returns View model for rendering
   */
  transformToView(itinerary: Itinerary): ItineraryView {
    const days = this.groupSegmentsByDay(itinerary);
    const stats = this.calculateStats(itinerary);
    const metadata = this.extractMetadata(itinerary);

    return {
      id: itinerary.id,
      title: itinerary.title,
      description: itinerary.description,
      dateRange: this.formatDateRange(itinerary.startDate, itinerary.endDate),
      durationDays: this.calculateDuration(itinerary.startDate, itinerary.endDate),
      destinations: itinerary.destinations.map((d) => d.city || d.name),
      tripType: itinerary.tripType,
      status: itinerary.status,
      days,
      metadata,
      stats,
    };
  }

  /**
   * Render itinerary using specified viewer
   * @param itinerary - Source itinerary
   * @param config - Viewer configuration
   * @returns Rendered output
   */
  async render(
    itinerary: Itinerary,
    config: Partial<ViewerConfig> = {}
  ): Promise<ViewerOutput> {
    const fullConfig = { ...DEFAULT_VIEWER_CONFIG, ...config };
    const plugin = this.plugins.get(fullConfig.type);

    if (!plugin) {
      throw new Error(`No viewer plugin registered for type: ${fullConfig.type}`);
    }

    if (!plugin.supportedFormats.includes(fullConfig.format)) {
      throw new Error(
        `Viewer ${fullConfig.type} does not support format: ${fullConfig.format}`
      );
    }

    const view = this.transformToView(itinerary);
    return plugin.render(view, fullConfig);
  }

  /**
   * Group segments by day
   */
  private groupSegmentsByDay(itinerary: Itinerary): ItineraryDay[] {
    const dayMap = new Map<string, ItineraryDay>();
    const startDate = new Date(itinerary.startDate);

    // Initialize all days in the trip
    const duration = this.calculateDuration(itinerary.startDate, itinerary.endDate);
    for (let i = 0; i < duration; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = this.toDateKey(date);

      dayMap.set(dateKey, {
        dayNumber: i + 1,
        date,
        dateFormatted: this.formatDate(date),
        title: `Day ${i + 1}`,
        segments: [],
        locations: [],
      });
    }

    // Assign segments to days
    for (const segment of itinerary.segments) {
      const segmentDate = new Date(segment.startDatetime);
      const dateKey = this.toDateKey(segmentDate);

      let day = dayMap.get(dateKey);
      if (!day) {
        // Segment outside trip range - create a day for it
        const dayNumber = Math.floor(
          (segmentDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
        ) + 1;
        day = {
          dayNumber,
          date: segmentDate,
          dateFormatted: this.formatDate(segmentDate),
          title: `Day ${dayNumber}`,
          segments: [],
          locations: [],
        };
        dayMap.set(dateKey, day);
      }

      const segmentView = this.transformSegment(segment);
      day.segments.push(segmentView);

      // Track locations
      if (segmentView.location && !day.locations.includes(segmentView.location)) {
        day.locations.push(segmentView.location);
      }
    }

    // Sort days and segments within days
    const days = Array.from(dayMap.values())
      .filter((day) => day.segments.length > 0) // Only include days with segments
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const day of days) {
      day.segments.sort(
        (a, b) =>
          new Date(a.raw.startDatetime).getTime() -
          new Date(b.raw.startDatetime).getTime()
      );

      // Generate day title from locations
      if (day.locations.length > 0) {
        day.title = `Day ${day.dayNumber}: ${day.locations.join(' → ')}`;
      }
    }

    return days;
  }

  /**
   * Transform segment to view model
   */
  private transformSegment(segment: Segment): SegmentView {
    const typeConfig = this.getSegmentTypeConfig(segment);
    const details = this.extractSegmentDetails(segment);
    const title = this.generateSegmentTitle(segment);
    const summary = this.generateSegmentSummary(segment);
    const location = this.extractSegmentLocation(segment);

    return {
      id: segment.id,
      type: segment.type,
      title,
      summary,
      timeRange: this.formatTimeRange(segment.startDatetime, segment.endDatetime),
      location,
      details,
      status: segment.status,
      icon: typeConfig.icon,
      cssClass: typeConfig.cssClass,
      raw: segment,
    };
  }

  /**
   * Get segment type configuration
   */
  private getSegmentTypeConfig(segment: Segment): { icon: string; cssClass: string } {
    const configs: Record<string, { icon: string; cssClass: string }> = {
      FLIGHT: { icon: '✈️', cssClass: 'segment-flight' },
      HOTEL: { icon: '🏨', cssClass: 'segment-hotel' },
      ACTIVITY: { icon: '🎯', cssClass: 'segment-activity' },
      TRANSFER: { icon: '🚗', cssClass: 'segment-transfer' },
      MEETING: { icon: '💼', cssClass: 'segment-meeting' },
      CUSTOM: { icon: '📌', cssClass: 'segment-custom' },
    };
    return configs[segment.type] || { icon: '📍', cssClass: 'segment-default' };
  }

  /**
   * Extract segment details as bullet points
   */
  private extractSegmentDetails(segment: Segment): string[] {
    const details: string[] = [];

    switch (segment.type) {
      case 'FLIGHT': {
        const flight = segment as Segment & { type: 'FLIGHT' };
        if (flight.airline?.name) details.push(`Airline: ${flight.airline.name}`);
        if (flight.flightNumber) details.push(`Flight: ${flight.flightNumber}`);
        if (flight.origin?.name) details.push(`From: ${flight.origin.name} (${flight.origin.code || ''})`);
        if (flight.destination?.name) details.push(`To: ${flight.destination.name} (${flight.destination.code || ''})`);
        if (flight.cabin) details.push(`Cabin: ${flight.cabin}`);
        if (flight.seatPreference) details.push(`Seat: ${flight.seatPreference}`);
        break;
      }
      case 'HOTEL': {
        const hotel = segment as Segment & { type: 'HOTEL' };
        if (hotel.property?.name) details.push(`Property: ${hotel.property.name}`);
        if (hotel.location?.name) details.push(`Location: ${hotel.location.name}`);
        if (hotel.roomType) details.push(`Room: ${hotel.roomType}`);
        if (hotel.confirmationNumber) details.push(`Confirmation: ${hotel.confirmationNumber}`);
        break;
      }
      case 'ACTIVITY': {
        const activity = segment as Segment & { type: 'ACTIVITY' };
        if (activity.name) details.push(`Activity: ${activity.name}`);
        if (activity.location?.name) details.push(`Location: ${activity.location.name}`);
        if (activity.description) details.push(activity.description);
        break;
      }
      case 'TRANSFER': {
        const transfer = segment as Segment & { type: 'TRANSFER' };
        if (transfer.transferType) details.push(`Type: ${transfer.transferType}`);
        if (transfer.pickupLocation?.name) details.push(`Pickup: ${transfer.pickupLocation.name}`);
        if (transfer.dropoffLocation?.name) details.push(`Dropoff: ${transfer.dropoffLocation.name}`);
        if (transfer.provider?.name) details.push(`Provider: ${transfer.provider.name}`);
        break;
      }
      case 'MEETING': {
        const meeting = segment as Segment & { type: 'MEETING' };
        if (meeting.meetingTitle) details.push(`Meeting: ${meeting.meetingTitle}`);
        if (meeting.location?.name) details.push(`Location: ${meeting.location.name}`);
        if (meeting.organizer) details.push(`Organizer: ${meeting.organizer}`);
        break;
      }
    }

    // Add notes if present
    if (segment.notes) {
      details.push(`Notes: ${segment.notes}`);
    }

    return details;
  }

  /**
   * Generate segment title
   */
  private generateSegmentTitle(segment: Segment): string {
    switch (segment.type) {
      case 'FLIGHT': {
        const flight = segment as Segment & { type: 'FLIGHT' };
        const route = [flight.origin?.code, flight.destination?.code]
          .filter(Boolean)
          .join(' → ');
        return route || `${flight.airline?.name || 'Flight'} ${flight.flightNumber || ''}`.trim();
      }
      case 'HOTEL': {
        const hotel = segment as Segment & { type: 'HOTEL' };
        return hotel.property?.name || 'Accommodation';
      }
      case 'ACTIVITY': {
        const activity = segment as Segment & { type: 'ACTIVITY' };
        return activity.name || 'Activity';
      }
      case 'TRANSFER': {
        const transfer = segment as Segment & { type: 'TRANSFER' };
        const route = [transfer.pickupLocation?.name, transfer.dropoffLocation?.name]
          .filter(Boolean)
          .join(' → ');
        return route || `${transfer.transferType || 'Transfer'}`;
      }
      case 'MEETING': {
        const meeting = segment as Segment & { type: 'MEETING' };
        return meeting.meetingTitle || 'Meeting';
      }
      default:
        return segment.type;
    }
  }

  /**
   * Generate segment summary
   */
  private generateSegmentSummary(segment: Segment): string {
    const time = this.formatTimeRange(segment.startDatetime, segment.endDatetime);

    switch (segment.type) {
      case 'FLIGHT': {
        const flight = segment as Segment & { type: 'FLIGHT' };
        return `${flight.airline?.code || ''} ${flight.flightNumber || ''} at ${time}`.trim();
      }
      case 'HOTEL': {
        const hotel = segment as Segment & { type: 'HOTEL' };
        const nights = this.calculateNights(segment.startDatetime, segment.endDatetime);
        return `${nights} night${nights !== 1 ? 's' : ''} at ${hotel.property?.name || 'hotel'}`;
      }
      case 'ACTIVITY':
        return time;
      case 'TRANSFER':
        return time;
      case 'MEETING':
        return time;
      default:
        return time;
    }
  }

  /**
   * Extract primary location from segment
   */
  private extractSegmentLocation(segment: Segment): string | undefined {
    switch (segment.type) {
      case 'FLIGHT': {
        const flight = segment as Segment & { type: 'FLIGHT' };
        return flight.destination?.city || flight.destination?.name;
      }
      case 'HOTEL': {
        const hotel = segment as Segment & { type: 'HOTEL' };
        return hotel.location?.city || hotel.location?.name;
      }
      case 'ACTIVITY': {
        const activity = segment as Segment & { type: 'ACTIVITY' };
        return activity.location?.city || activity.location?.name;
      }
      case 'TRANSFER': {
        const transfer = segment as Segment & { type: 'TRANSFER' };
        return transfer.dropoffLocation?.city || transfer.dropoffLocation?.name;
      }
      case 'MEETING': {
        const meeting = segment as Segment & { type: 'MEETING' };
        return meeting.location?.city || meeting.location?.name;
      }
      default:
        return undefined;
    }
  }

  /**
   * Calculate statistics
   */
  private calculateStats(itinerary: Itinerary): ItineraryStats {
    const segments = itinerary.segments;
    return {
      totalSegments: segments.length,
      flights: segments.filter((s) => s.type === 'FLIGHT').length,
      hotels: segments.filter((s) => s.type === 'HOTEL').length,
      activities: segments.filter((s) => s.type === 'ACTIVITY').length,
      transfers: segments.filter((s) => s.type === 'TRANSFER').length,
      meetings: segments.filter((s) => s.type === 'MEETING').length,
      custom: segments.filter((s) => s.type === 'CUSTOM').length,
    };
  }

  /**
   * Extract metadata
   */
  private extractMetadata(itinerary: Itinerary): ItineraryMetadata {
    return {
      travelerCount: itinerary.travelers.length,
      travelerNames: itinerary.travelers.map(
        (t) => `${t.firstName} ${t.lastName}`.trim()
      ),
      tags: itinerary.tags,
      createdAt: this.formatDateTime(itinerary.createdAt),
      updatedAt: this.formatDateTime(itinerary.updatedAt),
      version: itinerary.version,
    };
  }

  /**
   * Helper: Format date range
   */
  private formatDateRange(start: Date, end: Date): string {
    const startStr = this.formatDate(new Date(start));
    const endStr = this.formatDate(new Date(end));
    return `${startStr} - ${endStr}`;
  }

  /**
   * Helper: Format single date
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Helper: Format date and time
   */
  private formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  /**
   * Helper: Format time range
   */
  private formatTimeRange(start: Date, end: Date): string {
    const startTime = new Date(start).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    const endTime = new Date(end).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${startTime} - ${endTime}`;
  }

  /**
   * Helper: Calculate duration in days
   */
  private calculateDuration(start: Date, end: Date): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  }

  /**
   * Helper: Calculate nights
   */
  private calculateNights(start: Date, end: Date): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  }

  /**
   * Helper: Convert date to key string
   */
  private toDateKey(date: Date): string {
    return date.toISOString().split('T')[0] || '';
  }
}
