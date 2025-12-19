import { chromium } from 'playwright';

(async () => {
  console.log('Starting browser automation to debug Svelte viewer...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text });
    console.log(`[CONSOLE ${type.toUpperCase()}] ${text}`);
  });

  // Capture network requests
  const networkRequests = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('itineraries') || url.includes('localhost:3001')) {
      networkRequests.push({
        method: request.method(),
        url: url,
        headers: request.headers()
      });
      console.log(`[NETWORK REQUEST] ${request.method()} ${url}`);
    }
  });

  // Capture network responses
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('itineraries') || url.includes('localhost:3001')) {
      const status = response.status();
      console.log(`[NETWORK RESPONSE] ${status} ${url}`);
      try {
        const body = await response.text();
        console.log(`[RESPONSE BODY] ${body.substring(0, 200)}...`);
      } catch (e) {
        console.log(`[RESPONSE BODY] Could not read body: ${e.message}`);
      }
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
    console.log(error.stack);
  });

  try {
    console.log('\n--- Navigating to http://localhost:5173 ---\n');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 10000 });

    // Wait a bit for any async operations
    await page.waitForTimeout(2000);

    // Check the DOM
    console.log('\n--- Checking DOM Structure ---\n');

    // Look for itinerary-related elements
    const itineraryElements = await page.locator('[data-testid*="itinerary"], [class*="itinerary"], .itinerary-card, .itinerary-list').count();
    console.log(`Found ${itineraryElements} itinerary-related elements`);

    // Check for empty state or loading indicators
    const emptyState = await page.locator('text=/no itineraries|empty|loading/i').count();
    console.log(`Found ${emptyState} empty/loading state indicators`);

    // Get page content
    const bodyText = await page.locator('body').innerText();
    console.log(`\nPage text content (first 500 chars):\n${bodyText.substring(0, 500)}`);

    // Check for specific elements
    const h1Text = await page.locator('h1').allTextContents();
    console.log(`\nH1 elements: ${JSON.stringify(h1Text)}`);

    // Get the HTML structure
    const mainContent = await page.locator('body').innerHTML();
    console.log(`\n--- HTML Structure (first 1000 chars) ---\n${mainContent.substring(0, 1000)}`);

    // Take screenshot
    console.log('\n--- Taking screenshot ---\n');
    await page.screenshot({ path: '/Users/masa/Projects/itinerizer-ts/debug-screenshot.png', fullPage: true });
    console.log('Screenshot saved to: /Users/masa/Projects/itinerizer-ts/debug-screenshot.png');

    // Check localStorage and sessionStorage
    const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));
    console.log(`\nLocalStorage: ${localStorage}`);

    // Check if fetch is being called
    const fetchCalls = await page.evaluate(() => {
      return window.performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('itineraries'))
        .map(entry => ({
          name: entry.name,
          duration: entry.duration,
          transferSize: entry.transferSize
        }));
    });
    console.log(`\nFetch calls to itineraries API: ${JSON.stringify(fetchCalls, null, 2)}`);

    console.log('\n--- Summary ---');
    console.log(`Console messages: ${consoleMessages.length}`);
    console.log(`Network requests: ${networkRequests.length}`);
    console.log(`Itinerary elements found: ${itineraryElements}`);

    // Keep browser open for 5 seconds to observe
    console.log('\nKeeping browser open for 5 seconds for observation...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n--- ERROR OCCURRED ---');
    console.error(error.message);
    console.error(error.stack);
    await page.screenshot({ path: '/Users/masa/Projects/itinerizer-ts/debug-error-screenshot.png' });
    console.log('Error screenshot saved to: /Users/masa/Projects/itinerizer-ts/debug-error-screenshot.png');
  } finally {
    await browser.close();
    console.log('\n--- Browser closed ---');
  }
})();
