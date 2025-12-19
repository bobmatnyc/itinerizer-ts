import { Calendar, MapPin } from 'lucide-react';
import type { ItineraryListItem } from '../types';

interface ItineraryListProps {
  itineraries: ItineraryListItem[];
  onSelect: (id: string) => void;
  selectedId?: string;
}

export function ItineraryList({ itineraries, onSelect, selectedId }: ItineraryListProps) {
  if (itineraries.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        No itineraries found. Import a PDF to get started.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {itineraries.map((itinerary) => (
        <button
          key={itinerary.id}
          onClick={() => onSelect(itinerary.id)}
          className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
            selectedId === itinerary.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {itinerary.title}
          </h3>

          {itinerary.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
              {itinerary.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            {itinerary.startDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(itinerary.startDate).toLocaleDateString()}
              </div>
            )}
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {itinerary.segmentCount} segments
            </div>
          </div>

          {itinerary.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {itinerary.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
