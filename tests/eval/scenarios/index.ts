/**
 * Detailed conversation scenarios for AI quality evaluation
 * Each scenario represents a realistic multi-turn trip planning dialogue
 */

export interface ConversationTurn {
  message: string;
  expectedBehavior: 'ask_question' | 'add_segment' | 'search' | 'confirm' | 'provide_info';
  expectedTools?: string[]; // Tools that should be called
  minSegmentsAfter?: number; // Minimum segments expected after this turn
}

export interface EvalScenario {
  name: string;
  description: string;
  travelersCount: number;
  turns: ConversationTurn[];
  expectedFinalState: {
    minSegments: number;
    hasFlights: boolean;
    hasHotels: boolean;
    hasActivities: boolean;
    minQualityScore: number; // 0-100
  };
}

/**
 * Scenario 1: Complete Trip Planning
 * User provides all details upfront, AI should systematically add segments
 */
export const COMPLETE_TRIP_SCENARIO: EvalScenario = {
  name: 'Complete Trip Planning',
  description: 'User provides comprehensive trip details, AI adds all segments',
  travelersCount: 2,
  turns: [
    {
      message: "I want to plan a romantic 5-day trip to Paris from New York, departing May 15, 2025. We love art, food, and charming cafes. Budget is $5000 for both of us.",
      expectedBehavior: 'ask_question',
      expectedTools: [],
      minSegmentsAfter: 0,
    },
    {
      message: "We'd like to stay in the Marais district, visit the Louvre and Musée d'Orsay, and have at least one Michelin-starred dining experience.",
      expectedBehavior: 'search',
      expectedTools: ['search_flights', 'search_hotels'],
      minSegmentsAfter: 0,
    },
    {
      message: "Yes, please search for round-trip flights from JFK to CDG, departing May 15 and returning May 20, 2025.",
      expectedBehavior: 'search',
      expectedTools: ['search_flights'],
      minSegmentsAfter: 0,
    },
    {
      message: "Add the Air France direct flight AF007, departing May 15 at 7:30 PM, arriving May 16 at 9:00 AM. Economy class, $850 per person.",
      expectedBehavior: 'add_segment',
      expectedTools: ['add_flight'],
      minSegmentsAfter: 1,
    },
    {
      message: "Also add the return flight AF008 on May 20, departing at 11:00 AM, arriving at 2:00 PM in New York. Same price.",
      expectedBehavior: 'add_segment',
      expectedTools: ['add_flight'],
      minSegmentsAfter: 2,
    },
    {
      message: "Now search for boutique hotels in the Marais with good reviews, budget around $200-300 per night.",
      expectedBehavior: 'search',
      expectedTools: ['search_hotels'],
      minSegmentsAfter: 2,
    },
    {
      message: "Book Hotel du Marais for May 16-19 (3 nights), $250 per night, breakfast included.",
      expectedBehavior: 'add_segment',
      expectedTools: ['add_hotel'],
      minSegmentsAfter: 3,
    },
    {
      message: "Add a visit to the Louvre Museum on May 17, 9:00 AM - 1:00 PM. Pre-book tickets for 2 people at €17 each.",
      expectedBehavior: 'add_segment',
      expectedTools: ['add_activity'],
      minSegmentsAfter: 4,
    },
    {
      message: "Reserve dinner at Le Comptoir du Relais on May 17 at 7:30 PM. It's a bistro in Saint-Germain-des-Prés.",
      expectedBehavior: 'add_segment',
      expectedTools: ['add_activity'],
      minSegmentsAfter: 5,
    },
    {
      message: "Add Musée d'Orsay visit on May 18, 10:00 AM - 1:00 PM. Tickets €16 per person.",
      expectedBehavior: 'add_segment',
      expectedTools: ['add_activity'],
      minSegmentsAfter: 6,
    },
    {
      message: "What does my final itinerary look like?",
      expectedBehavior: 'provide_info',
      expectedTools: [],
      minSegmentsAfter: 6,
    },
  ],
  expectedFinalState: {
    minSegments: 6,
    hasFlights: true,
    hasHotels: true,
    hasActivities: true,
    minQualityScore: 70,
  },
};

/**
 * Scenario 2: Iterative Refinement
 * User starts vague, AI asks questions, gradually builds itinerary
 */
export const ITERATIVE_REFINEMENT_SCENARIO: EvalScenario = {
  name: 'Iterative Refinement',
  description: 'Vague start, AI asks questions to build complete itinerary',
  travelersCount: 1,
  turns: [
    {
      message: "I want to take a trip somewhere warm next month.",
      expectedBehavior: 'ask_question',
      expectedTools: [],
      minSegmentsAfter: 0,
    },
    {
      message: "I'm thinking Caribbean, maybe Jamaica or Barbados. I like beaches and water sports.",
      expectedBehavior: 'ask_question',
      expectedTools: [],
      minSegmentsAfter: 0,
    },
    {
      message: "Let's go with Jamaica. I'm flexible on dates but want 5-6 days. Budget is around $2000 total.",
      expectedBehavior: 'ask_question',
      expectedTools: [],
      minSegmentsAfter: 0,
    },
    {
      message: "Departing from Miami. June 10-16 works well.",
      expectedBehavior: 'search',
      expectedTools: ['search_flights'],
      minSegmentsAfter: 0,
    },
    {
      message: "Search for flights from Miami to Montego Bay for those dates.",
      expectedBehavior: 'search',
      expectedTools: ['search_flights'],
      minSegmentsAfter: 0,
    },
    {
      message: "Add the JetBlue flight B61801 on June 10, departing 8:30 AM, arriving 10:15 AM. Return flight B61802 on June 16 at 2:00 PM. $450 round trip.",
      expectedBehavior: 'add_segment',
      expectedTools: ['add_flight'],
      minSegmentsAfter: 1,
    },
    {
      message: "I prefer staying in Negril for the beaches. Mid-range resort with water sports access would be great.",
      expectedBehavior: 'search',
      expectedTools: ['search_hotels'],
      minSegmentsAfter: 1,
    },
    {
      message: "Book Negril Beach Resort for June 10-15 (5 nights), all-inclusive, $180 per night.",
      expectedBehavior: 'add_segment',
      expectedTools: ['add_hotel'],
      minSegmentsAfter: 2,
    },
    {
      message: "What water sports are available? I'm interested in snorkeling and maybe jet skiing.",
      expectedBehavior: 'search',
      expectedTools: ['search_activities'],
      minSegmentsAfter: 2,
    },
    {
      message: "Add a snorkeling tour at Coral Reef on June 12, 9:00 AM - 12:00 PM. $60 per person.",
      expectedBehavior: 'add_segment',
      expectedTools: ['add_activity'],
      minSegmentsAfter: 3,
    },
    {
      message: "Also add a sunset catamaran cruise on June 14, 5:00 PM - 8:00 PM. $75.",
      expectedBehavior: 'add_segment',
      expectedTools: ['add_activity'],
      minSegmentsAfter: 4,
    },
    {
      message: "Add transportation from Montego Bay airport to Negril on June 10 and back on June 16.",
      expectedBehavior: 'add_segment',
      expectedTools: ['add_transfer'],
      minSegmentsAfter: 5,
    },
    {
      message: "That looks perfect! Show me the complete itinerary.",
      expectedBehavior: 'provide_info',
      expectedTools: [],
      minSegmentsAfter: 5,
    },
  ],
  expectedFinalState: {
    minSegments: 5,
    hasFlights: true,
    hasHotels: true,
    hasActivities: true,
    minQualityScore: 60,
  },
};

/**
 * Scenario 3: Modification Flow
 * Start with existing itinerary, user requests changes
 */
export const MODIFICATION_FLOW_SCENARIO: EvalScenario = {
  name: 'Modification Flow',
  description: 'Modify existing itinerary with date changes and additions',
  travelersCount: 3,
  turns: [
    {
      message: "I have a family trip to Orlando planned for July 15-20, but we need to change it to July 22-27 instead. Can you update the dates?",
      expectedBehavior: 'confirm',
      expectedTools: [],
      minSegmentsAfter: 0,
    },
    {
      message: "Yes, please update all the dates to July 22-27, 2025.",
      expectedBehavior: 'add_segment',
      expectedTools: ['update_itinerary'],
      minSegmentsAfter: 0,
    },
    {
      message: "We also want to change our hotel. Instead of staying near Disney, we want to be near Universal Studios.",
      expectedBehavior: 'search',
      expectedTools: ['search_hotels'],
      minSegmentsAfter: 0,
    },
    {
      message: "Remove the old hotel and add Universal's Cabana Bay Beach Resort for July 22-26 (4 nights), $150 per night, family suite.",
      expectedBehavior: 'add_segment',
      expectedTools: ['remove_segment', 'add_hotel'],
      minSegmentsAfter: 1,
    },
    {
      message: "Add a day at Universal Studios on July 23, 9:00 AM - 8:00 PM. Three 1-day park tickets at $120 each.",
      expectedBehavior: 'add_segment',
      expectedTools: ['add_activity'],
      minSegmentsAfter: 2,
    },
    {
      message: "Also add Islands of Adventure on July 24, same hours and pricing.",
      expectedBehavior: 'add_segment',
      expectedTools: ['add_activity'],
      minSegmentsAfter: 3,
    },
    {
      message: "Do we still have our Magic Kingdom day planned? If so, when is it?",
      expectedBehavior: 'provide_info',
      expectedTools: [],
      minSegmentsAfter: 3,
    },
    {
      message: "Let's keep it but move it to July 25. Update that segment.",
      expectedBehavior: 'add_segment',
      expectedTools: ['update_segment'],
      minSegmentsAfter: 3,
    },
    {
      message: "Add a character breakfast at Chef Mickey's on July 26 at 9:00 AM. $45 per person.",
      expectedBehavior: 'add_segment',
      expectedTools: ['add_activity'],
      minSegmentsAfter: 4,
    },
    {
      message: "What are our flights? Do they need to be updated too?",
      expectedBehavior: 'provide_info',
      expectedTools: [],
      minSegmentsAfter: 4,
    },
    {
      message: "Yes, change the flights to match the new dates: depart July 22, return July 27.",
      expectedBehavior: 'add_segment',
      expectedTools: ['update_segment'],
      minSegmentsAfter: 4,
    },
    {
      message: "Show me the updated itinerary with all the changes.",
      expectedBehavior: 'provide_info',
      expectedTools: [],
      minSegmentsAfter: 4,
    },
  ],
  expectedFinalState: {
    minSegments: 4,
    hasFlights: true,
    hasHotels: true,
    hasActivities: true,
    minQualityScore: 55,
  },
};

/**
 * All scenarios for evaluation
 */
export const EVAL_SCENARIOS: EvalScenario[] = [
  COMPLETE_TRIP_SCENARIO,
  ITERATIVE_REFINEMENT_SCENARIO,
  MODIFICATION_FLOW_SCENARIO,
];
