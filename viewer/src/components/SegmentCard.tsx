import { Plane, Hotel, MapPin, Car, Activity, FileText } from 'lucide-react';
import type { Segment } from '../types';

interface SegmentCardProps {
  segment: Segment;
}

const SEGMENT_COLORS = {
  FLIGHT: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  HOTEL: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  TRANSFER: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  ACTIVITY: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  MEETING: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
  CUSTOM: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
};

const SEGMENT_ICONS = {
  FLIGHT: Plane,
  HOTEL: Hotel,
  TRANSFER: Car,
  ACTIVITY: Activity,
  MEETING: MapPin,
  CUSTOM: FileText,
};

function getSegmentTitle(segment: Segment): string {
  switch (segment.type) {
    case 'FLIGHT':
      return `${segment.origin.code} → ${segment.destination.code}`;
    case 'HOTEL':
      return segment.property.name;
    case 'ACTIVITY':
      return segment.name;
    case 'TRANSFER':
      return `${segment.pickupLocation.name} → ${segment.dropoffLocation.name}`;
    case 'CUSTOM':
      return segment.title;
    default:
      return 'Unknown';
  }
}

function getSegmentDetails(segment: Segment): string[] {
  const details: string[] = [];

  switch (segment.type) {
    case 'FLIGHT':
      details.push(`${segment.airline.name} ${segment.flightNumber}`);
      if (segment.cabin) details.push(segment.cabin);
      break;
    case 'HOTEL':
      if (segment.roomType) details.push(segment.roomType);
      if (segment.location.city) details.push(segment.location.city);
      break;
    case 'ACTIVITY':
      if (segment.location.city) details.push(segment.location.city);
      break;
    case 'TRANSFER':
      details.push(segment.transferType);
      break;
  }

  return details;
}

function formatDateTime(dateTime: string): string {
  const date = new Date(dateTime);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getSourceBadge(source: string): { icon: string; label: string; color: string } {
  switch (source) {
    case 'import':
      return { icon: '📄', label: 'Import', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
    case 'agent':
      return { icon: '🤖', label: 'Agent', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' };
    case 'manual':
      return { icon: '✍️', label: 'Manual', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
    default:
      return { icon: '❓', label: 'Unknown', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' };
  }
}

export function SegmentCard({ segment }: SegmentCardProps) {
  const Icon = SEGMENT_ICONS[segment.type];
  const colorClass = SEGMENT_COLORS[segment.type];
  const title = getSegmentTitle(segment);
  const details = getSegmentDetails(segment);
  const sourceBadge = getSourceBadge(segment.source);

  return (
    <div className={`p-4 border rounded-lg ${colorClass}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-3 flex-1">
          <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h3>
            {details.length > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {details.join(' • ')}
              </p>
            )}
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${sourceBadge.color}`}>
          {sourceBadge.icon} {sourceBadge.label}
        </span>
      </div>

      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
        <div>
          <span className="font-medium">Start:</span> {formatDateTime(segment.startDatetime)}
        </div>
        <div>
          <span className="font-medium">End:</span> {formatDateTime(segment.endDatetime)}
        </div>
      </div>

      {segment.notes && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
          {segment.notes}
        </p>
      )}

      {segment.inferred && segment.inferredReason && (
        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
          <span className="font-medium text-yellow-800 dark:text-yellow-200">Inferred:</span>{' '}
          <span className="text-yellow-700 dark:text-yellow-300">{segment.inferredReason}</span>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <span className={`
          px-2 py-0.5 text-xs font-medium rounded
          ${segment.status === 'CONFIRMED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
          ${segment.status === 'TENTATIVE' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : ''}
          ${segment.status === 'CANCELLED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : ''}
        `}>
          {segment.status}
        </span>
        <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
          {segment.type}
        </span>
      </div>
    </div>
  );
}
