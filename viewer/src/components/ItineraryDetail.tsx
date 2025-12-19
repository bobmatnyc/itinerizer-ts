import { Calendar, MapPin, Tag } from 'lucide-react';
import type { Itinerary } from '../types';
import { SegmentCard } from './SegmentCard';

interface ItineraryDetailProps {
  itinerary: Itinerary;
}

export function ItineraryDetail({ itinerary }: ItineraryDetailProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {itinerary.title}
        </h1>

        {itinerary.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-4">{itinerary.description}</p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          {itinerary.startDate && itinerary.endDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(itinerary.startDate).toLocaleDateString()} -{' '}
                {new Date(itinerary.endDate).toLocaleDateString()}
              </span>
            </div>
          )}

          {itinerary.destinations.length > 0 && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{itinerary.destinations.map((d) => d.city || d.name).join(', ')}</span>
            </div>
          )}

          {itinerary.tripType && (
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <span>{itinerary.tripType}</span>
            </div>
          )}
        </div>

        {itinerary.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {itinerary.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Segments ({itinerary.segments.length})
        </h2>

        <div className="space-y-3">
          {itinerary.segments.map((segment) => (
            <SegmentCard key={segment.id} segment={segment} />
          ))}
        </div>
      </div>
    </div>
  );
}
