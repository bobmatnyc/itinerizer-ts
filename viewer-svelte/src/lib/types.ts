// Core types for the viewer application

export interface Location {
  name: string;
  city?: string;
  country?: string;
  code?: string;
  address?: string;
  type?: 'CITY' | 'AIRPORT' | 'HOTEL' | 'ATTRACTION' | 'OTHER';
  coordinates?: {
    latitude: number;
    longitude: number;
  };
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

export interface Traveler {
  id: string;
  type: 'ADULT' | 'CHILD' | 'INFANT';
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  passportNumber?: string;
  passportExpiry?: string;
  passportCountry?: string;
}

export interface TripTravelerPreferences {
  travelStyle?: 'luxury' | 'moderate' | 'budget' | 'backpacker';
  pace?: 'packed' | 'balanced' | 'leisurely';
  interests?: string[];
  budgetFlexibility?: number;
  dietaryRestrictions?: string;
  mobilityRestrictions?: string;
  origin?: string;
  accommodationPreference?: string;
  activityPreferences?: string[];
  avoidances?: string[];
}

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
  travelers?: Traveler[];
  tripPreferences?: TripTravelerPreferences;
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
  travelerCount?: number;
  destinations?: Location[];
  tags?: string[];
  createdAt?: string;
  updatedAt: string;
}

export interface ModelConfig {
  name: string;
  maxTokens: number;
  costPerMillionInput: number;
  costPerMillionOutput: number;
  maxRecommendedFileSize: number;
}

// Chat types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
  imageUrl?: string;
}

export interface StructuredQuestion {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'scale' | 'date_range' | 'text';
  question: string;
  context?: string;
  options?: QuestionOption[];
  scale?: {
    min: number;
    max: number;
    step?: number;
    minLabel?: string;
    maxLabel?: string;
  };
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
  };
}

export interface AgentResponse {
  message: string;
  structuredQuestions?: StructuredQuestion[];
  itineraryUpdated?: boolean;
  segmentsModified?: string[];
}

// Token usage data
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

// Cost data
export interface CostData {
  input: number;
  output: number;
  total: number;
}

// Stream event types
export type ChatStreamEvent =
  | { type: 'connected'; sessionId: string }
  | { type: 'text'; content: string }
  | { type: 'tool_call'; name: string; arguments: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: unknown; success: boolean }
  | { type: 'structured_questions'; questions: StructuredQuestion[] }
  | { type: 'done'; itineraryUpdated: boolean; segmentsModified?: string[]; tokens?: TokenUsage; cost?: CostData }
  | { type: 'error'; message: string; retryable?: boolean };
