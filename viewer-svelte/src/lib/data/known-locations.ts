/**
 * Known airports and cities with geographic coordinates
 * Used for location detection in chat messages
 */

export interface AirportInfo {
  name: string;
  city: string;
  lat: number;
  lon: number;
}

export interface CityInfo {
  lat: number;
  lon: number;
  country: string;
}

/**
 * Known airport codes with coordinates
 * Maps IATA 3-letter codes to airport information
 */
export const KNOWN_AIRPORTS: Record<string, { lat: number; lng: number; city: string }> = {
  'JFK': { lat: 40.6413, lng: -73.7781, city: 'New York JFK' },
  'LAX': { lat: 33.9425, lng: -118.4081, city: 'Los Angeles' },
  'NRT': { lat: 35.7720, lng: 140.3929, city: 'Tokyo Narita' },
  'HND': { lat: 35.5494, lng: 139.7798, city: 'Tokyo Haneda' },
  'SFO': { lat: 37.6213, lng: -122.3790, city: 'San Francisco' },
  'ORD': { lat: 41.9742, lng: -87.9073, city: 'Chicago O\'Hare' },
  'LHR': { lat: 51.4700, lng: -0.4543, city: 'London Heathrow' },
  'CDG': { lat: 49.0097, lng: 2.5479, city: 'Paris Charles de Gaulle' },
  'DXB': { lat: 25.2532, lng: 55.3657, city: 'Dubai' },
  'SIN': { lat: 1.3644, lng: 103.9915, city: 'Singapore Changi' },
  'ICN': { lat: 37.4602, lng: 126.4407, city: 'Seoul Incheon' },
  'BKK': { lat: 13.6900, lng: 100.7501, city: 'Bangkok Suvarnabhumi' },
  'HKG': { lat: 22.3080, lng: 113.9185, city: 'Hong Kong' },
  'SYD': { lat: -33.9399, lng: 151.1753, city: 'Sydney' },
  'MEL': { lat: -37.6690, lng: 144.8410, city: 'Melbourne' },
  'YVR': { lat: 49.1967, lng: -123.1815, city: 'Vancouver' },
  'YYZ': { lat: 43.6777, lng: -79.6248, city: 'Toronto Pearson' },
  'AMS': { lat: 52.3105, lng: 4.7683, city: 'Amsterdam Schiphol' },
  'FRA': { lat: 50.0379, lng: 8.5622, city: 'Frankfurt' },
  'MUC': { lat: 48.3538, lng: 11.7861, city: 'Munich' },
  'FCO': { lat: 41.8003, lng: 12.2389, city: 'Rome Fiumicino' },
  'MAD': { lat: 40.4983, lng: -3.5676, city: 'Madrid' },
  'BCN': { lat: 41.2974, lng: 2.0833, city: 'Barcelona' },
};

/**
 * Known cities with coordinates
 * Maps city names to geographic coordinates and country
 */
export const KNOWN_CITIES: Record<string, { lat: number; lng: number }> = {
  // Japan
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'Yokohama': { lat: 35.4437, lng: 139.6380 },
  'Kyoto': { lat: 35.0116, lng: 135.7681 },
  'Osaka': { lat: 34.6937, lng: 135.5023 },
  // USA
  'New York': { lat: 40.7128, lng: -74.0060 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  'Chicago': { lat: 41.8781, lng: -87.6298 },
  'Miami': { lat: 25.7617, lng: -80.1918 },
  'Las Vegas': { lat: 36.1699, lng: -115.1398 },
  'Seattle': { lat: 47.6062, lng: -122.3321 },
  'Boston': { lat: 42.3601, lng: -71.0589 },
  'Washington': { lat: 38.9072, lng: -77.0369 },
  'Denver': { lat: 39.7392, lng: -104.9903 },
  // Canada
  'Vancouver': { lat: 49.2827, lng: -123.1207 },
  'Toronto': { lat: 43.6532, lng: -79.3832 },
  'Montreal': { lat: 45.5017, lng: -73.5673 },
  // Western Europe
  'London': { lat: 51.5074, lng: -0.1278 },
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Amsterdam': { lat: 52.3676, lng: 4.9041 },
  'Berlin': { lat: 52.5200, lng: 13.4050 },
  'Frankfurt': { lat: 50.1109, lng: 8.6821 },
  'Munich': { lat: 48.1351, lng: 11.5820 },
  'Vienna': { lat: 48.2082, lng: 16.3738 },
  'Zurich': { lat: 47.3769, lng: 8.5417 },
  'Brussels': { lat: 50.8503, lng: 4.3517 },
  // Southern Europe
  'Rome': { lat: 41.9028, lng: 12.4964 },
  'Milan': { lat: 45.4642, lng: 9.1900 },
  'Venice': { lat: 45.4408, lng: 12.3155 },
  'Florence': { lat: 43.7696, lng: 11.2558 },
  'Barcelona': { lat: 41.3851, lng: 2.1734 },
  'Madrid': { lat: 40.4168, lng: -3.7038 },
  'Lisbon': { lat: 38.7223, lng: -9.1393 },
  'Athens': { lat: 37.9838, lng: 23.7275 },
  // Central/Eastern Europe
  'Prague': { lat: 50.0755, lng: 14.4378 },
  'Budapest': { lat: 47.4979, lng: 19.0402 },
  'Warsaw': { lat: 52.2297, lng: 21.0122 },
  'Krakow': { lat: 50.0647, lng: 19.9450 },
  // Croatia & Balkans (cities only, not countries)
  'Zagreb': { lat: 45.8150, lng: 15.9819 },
  'Dubrovnik': { lat: 42.6507, lng: 18.0944 },
  'Split': { lat: 43.5081, lng: 16.4402 },
  'Pula': { lat: 44.8666, lng: 13.8496 },
  'Zadar': { lat: 44.1194, lng: 15.2314 },
  'Rijeka': { lat: 45.3271, lng: 14.4422 },
  'Ljubljana': { lat: 46.0569, lng: 14.5058 },
  'Bled': { lat: 46.3683, lng: 14.1146 },
  // Nordic
  'Stockholm': { lat: 59.3293, lng: 18.0686 },
  'Copenhagen': { lat: 55.6761, lng: 12.5683 },
  'Oslo': { lat: 59.9139, lng: 10.7522 },
  'Helsinki': { lat: 60.1699, lng: 24.9384 },
  'Reykjavik': { lat: 64.1466, lng: -21.9426 },
  // Middle East & Africa
  'Dubai': { lat: 25.2048, lng: 55.2708 },
  'Abu Dhabi': { lat: 24.4539, lng: 54.3773 },
  'Istanbul': { lat: 41.0082, lng: 28.9784 },
  'Tel Aviv': { lat: 32.0853, lng: 34.7818 },
  'Cairo': { lat: 30.0444, lng: 31.2357 },
  'Marrakech': { lat: 31.6295, lng: -7.9811 },
  'Cape Town': { lat: -33.9249, lng: 18.4241 },
  // Asia
  'Singapore': { lat: 1.3521, lng: 103.8198 },
  'Hong Kong': { lat: 22.3193, lng: 114.1694 },
  'Seoul': { lat: 37.5665, lng: 126.9780 },
  'Bangkok': { lat: 13.7563, lng: 100.5018 },
  'Taipei': { lat: 25.0330, lng: 121.5654 },
  'Shanghai': { lat: 31.2304, lng: 121.4737 },
  'Beijing': { lat: 39.9042, lng: 116.4074 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
  'Bali': { lat: -8.4095, lng: 115.1889 },
  'Phuket': { lat: 7.8804, lng: 98.3923 },
  'Hanoi': { lat: 21.0278, lng: 105.8342 },
  'Ho Chi Minh': { lat: 10.8231, lng: 106.6297 },
  // Oceania
  'Sydney': { lat: -33.8688, lng: 151.2093 },
  'Melbourne': { lat: -37.8136, lng: 144.9631 },
  'Auckland': { lat: -36.8485, lng: 174.7633 },
  'Queenstown': { lat: -45.0312, lng: 168.6626 },
  // Central/South America
  'Mexico City': { lat: 19.4326, lng: -99.1332 },
  'Cancun': { lat: 21.1619, lng: -86.8515 },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
  'Buenos Aires': { lat: -34.6037, lng: -58.3816 },
  'Lima': { lat: -12.0464, lng: -77.0428 },
  'Bogota': { lat: 4.7110, lng: -74.0721 },
  // Caribbean
  'Havana': { lat: 23.1136, lng: -82.3666 },
  'San Juan': { lat: 18.4655, lng: -66.1057 },
  // Hawaii (islands/cities only)
  'Honolulu': { lat: 21.3069, lng: -157.8583 },
  'Maui': { lat: 20.7984, lng: -156.3319 },
  'Kona': { lat: 19.6400, lng: -155.9969 },
  'Hilo': { lat: 19.7074, lng: -155.0847 },
  'Kauai': { lat: 22.0964, lng: -159.5261 },
};
