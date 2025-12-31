#!/usr/bin/env node
/**
 * Test script for email import webhook
 * Simulates inbound.new webhook with sample booking emails
 */

// Sample flight confirmation email
const flightEmailPayload = {
  event: 'email.received',
  timestamp: new Date().toISOString(),
  email: {
    id: 'test-flight-001',
    messageId: '<flight-confirmation@united.com>',
    from: 'confirmations@united.com',
    to: ['user@example.com'],
    subject: 'Your United Airlines Flight Confirmation - UA123',
    receivedAt: new Date().toISOString(),
    parsedData: {
      from: {
        address: 'confirmations@united.com',
        name: 'United Airlines'
      },
      to: [
        {
          address: 'user@example.com',
          name: 'Test User'
        }
      ],
      subject: 'Your United Airlines Flight Confirmation - UA123',
      textBody: `
FLIGHT CONFIRMATION

Confirmation Number: ABC123XYZ
Booking Reference: UA-2024-001

FLIGHT DETAILS
Flight: UA123
Date: January 15, 2025
Departure: San Francisco (SFO) at 8:00 AM
Arrival: New York (JFK) at 4:30 PM
Terminal: Depart from Terminal 3, Arrive at Terminal 4

PASSENGER
Name: John Doe
Seat: 12A
Cabin: Economy

TOTAL PAID: $450.00 USD

Thank you for choosing United Airlines.
      `.trim(),
      htmlBody: '<html><body>FLIGHT CONFIRMATION...</body></html>',
      attachments: [],
      headers: {
        'message-id': '<flight-confirmation@united.com>',
        'date': new Date().toISOString(),
      },
      date: new Date().toISOString(),
    }
  }
};

// Sample hotel confirmation email
const hotelEmailPayload = {
  event: 'email.received',
  timestamp: new Date().toISOString(),
  email: {
    id: 'test-hotel-002',
    messageId: '<reservation@marriott.com>',
    from: 'reservations@marriott.com',
    to: ['user@example.com'],
    subject: 'Your Marriott Hotel Reservation Confirmation',
    receivedAt: new Date().toISOString(),
    parsedData: {
      from: {
        address: 'reservations@marriott.com',
        name: 'Marriott Hotels'
      },
      to: [
        {
          address: 'user@example.com',
          name: 'Test User'
        }
      ],
      subject: 'Your Marriott Hotel Reservation Confirmation',
      textBody: `
RESERVATION CONFIRMATION

Confirmation Number: HOTEL456789
Property: Marriott Marquis Times Square
Address: 1535 Broadway, New York, NY 10036

CHECK-IN: January 15, 2025 at 3:00 PM
CHECK-OUT: January 18, 2025 at 11:00 AM

ROOM DETAILS
Room Type: Deluxe King Room
Number of Rooms: 1
Guests: 2 Adults

RATE SUMMARY
Room Rate: $299.00/night x 3 nights
Taxes & Fees: $89.70
Total: $986.70 USD

We look forward to welcoming you!
      `.trim(),
      htmlBody: '<html><body>RESERVATION CONFIRMATION...</body></html>',
      attachments: [],
      headers: {
        'message-id': '<reservation@marriott.com>',
        'date': new Date().toISOString(),
      },
      date: new Date().toISOString(),
    }
  }
};

// Sample activity booking email
const activityEmailPayload = {
  event: 'email.received',
  timestamp: new Date().toISOString(),
  email: {
    id: 'test-activity-003',
    messageId: '<booking@viator.com>',
    from: 'bookings@viator.com',
    to: ['user@example.com'],
    subject: 'Statue of Liberty Tour - Booking Confirmation',
    receivedAt: new Date().toISOString(),
    parsedData: {
      from: {
        address: 'bookings@viator.com',
        name: 'Viator'
      },
      to: [
        {
          address: 'user@example.com',
          name: 'Test User'
        }
      ],
      subject: 'Statue of Liberty Tour - Booking Confirmation',
      textBody: `
TOUR BOOKING CONFIRMED

Voucher Number: VIA-2025-12345
Tour: Statue of Liberty and Ellis Island Tour

DATE: January 16, 2025
TIME: 10:00 AM - 2:00 PM
DURATION: 4 hours

MEETING POINT:
Battery Park, near the Castle Clinton National Monument
1 Battery Park, New York, NY 10004

INCLUDED:
- Ferry tickets to Liberty Island and Ellis Island
- Audio guide
- Access to the pedestal

PARTICIPANTS: 2 Adults

TOTAL PAID: $89.00 USD

Important: Please arrive 15 minutes before departure.
      `.trim(),
      htmlBody: '<html><body>TOUR BOOKING CONFIRMED...</body></html>',
      attachments: [],
      headers: {
        'message-id': '<booking@viator.com>',
        'date': new Date().toISOString(),
      },
      date: new Date().toISOString(),
    }
  }
};

/**
 * Send test webhook
 */
async function sendWebhook(payload, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${description}`);
  console.log('='.repeat(60));

  const API_URL = process.env.VITE_API_URL || 'http://localhost:5176';
  const INBOUND_API_KEY = process.env.INBOUND_API_KEY || 'test-key-12345';

  try {
    const response = await fetch(`${API_URL}/api/v1/import/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': INBOUND_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    console.log(`\nStatus: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ SUCCESS - Email imported successfully');
      if (result.segments && result.segments.length > 0) {
        console.log(`   📌 Added ${result.segments.length} segment(s) to itinerary ${result.itineraryId}`);
      }
      if (result.confidence) {
        console.log(`   🎯 Confidence: ${(result.confidence * 100).toFixed(0)}%`);
      }
      if (result.summary) {
        console.log(`   📝 Summary: ${result.summary}`);
      }
    } else {
      console.log('\n❌ FAILED');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('Email Import Webhook Test Suite');
  console.log('='.repeat(60));
  console.log(`API URL: ${process.env.VITE_API_URL || 'http://localhost:5176'}`);
  console.log(`API Key: ${process.env.INBOUND_API_KEY ? '***' + process.env.INBOUND_API_KEY.slice(-4) : 'test-key-12345'}`);

  // Test 1: Flight confirmation
  await sendWebhook(flightEmailPayload, 'Flight Confirmation Email');

  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Hotel confirmation
  await sendWebhook(hotelEmailPayload, 'Hotel Reservation Email');

  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Activity booking
  await sendWebhook(activityEmailPayload, 'Activity Booking Email');

  console.log('\n' + '='.repeat(60));
  console.log('Test suite complete');
  console.log('='.repeat(60));
}

// Run tests
main().catch(console.error);
