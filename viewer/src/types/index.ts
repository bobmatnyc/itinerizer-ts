// Core types for the viewer application

export interface Location {
  name: string;
  city?: string;
  country?: string;
  code?: string;
  address?: string;
  type?: 'CITY' | 'AIRPORT' | 'HOTEL' | 'ATTRACTION' | 'OTHER';
}

export type SegmentType = 'FLIGHT' | 'HOTEL' | 'MEETING' | 'ACTIVITY' | 'TRANSFER' | 'CUSTOM';
export type SegmentSource = 'import' | 'agent' | 'manual';
export type SegmentStatus = 'TENTATIVE' | 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'COMPLETED';

export interface BaseSegment {
  id: string;
  type: SegmentType;
  status: SegmentStatus;
  startDatetime: string;
  endDatetime: string;
  travelerIds: string[];
  source: SegmentSource;
  sourceDetails?: {
    model?: string;
    mode?: string;
    confidence?: number;
    timestamp?: string;
  };
  notes?: string;
  metadata?: Record<string, unknown>;
  inferred?: boolean;
  inferredReason?: string;
}

export interface FlightSegment extends BaseSegment {
  type: 'FLIGHT';
  airline: {
    name: string;
    code: string;
  };
  flightNumber: string;
  origin: Location;
  destination: Location;
  cabin?: string;
}

export interface HotelSegment extends BaseSegment {
  type: 'HOTEL';
  property: {
    name: string;
  };
  location: Location;
  roomType?: string;
  checkInDate?: string;
  checkOutDate?: string;
}

export interface ActivitySegment extends BaseSegment {
  type: 'ACTIVITY';
  name: string;
  description?: string;
  location: Location;
}

export interface TransferSegment extends BaseSegment {
  type: 'TRANSFER';
  transferType: 'TAXI' | 'SHUTTLE' | 'PRIVATE' | 'PUBLIC' | 'RIDE_SHARE';
  pickupLocation: Location;
  dropoffLocation: Location;
}

export interface CustomSegment extends BaseSegment {
  type: 'CUSTOM';
  title: string;
  description?: string;
}

export type Segment = FlightSegment | HotelSegment | ActivitySegment | TransferSegment | CustomSegment;

export interface Itinerary {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  tripType?: 'LEISURE' | 'BUSINESS' | 'BLEISURE';
  status: 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  segments: Segment[];
  destinations: Location[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryListItem {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  tripType?: string;
  status: string;
  segmentCount: number;
  destinations: Location[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ModelConfig {
  name: string;
  maxTokens: number;
  costPerMillionInput: number;
  costPerMillionOutput: number;
  maxRecommendedFileSize: number;
}
