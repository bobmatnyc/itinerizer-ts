# Free Geocoding Services Evaluation for PDF Import
**Research Date:** 2025-12-18
**Purpose:** Evaluate free geocoding services for adding coordinates to locations during PDF import
**Use Case:** Geocoding hotel names, airport codes, landmarks from travel itineraries

---

## Executive Summary

**Recommended Solution:** **LocationIQ Free Tier**

**Rationale:**
- 5,000 requests/day meets typical usage needs
- 2 requests/second rate limit suitable for batch processing
- API-compatible with Nominatim (easy fallback/migration)
- Better developer experience with API key (no User-Agent hassles)
- Commercial usage allowed with attribution link
- Active commercial support and reliability

**Fallback Solution:** Nominatim (self-hosted or public API for development/testing)

---

## Detailed Service Comparison

### 1. Nominatim (OpenStreetMap)

**Pricing & Limits:**
- **Cost:** Free (donations encouraged)
- **Rate Limit:** 1 request/second (strictly enforced)
- **Daily Limit:** ~3,500 addresses/hour, ~84,000/day theoretical max
- **API Key:** None required

**Strengths:**
- Completely free with no registration
- Open source, can self-host for unlimited usage
- Powers official OpenStreetMap.org
- Serves 30 million queries/day on single server
- Good POI coverage (hotels, airports, landmarks via `layer=poi`)
- New entrance information feature for large structures (airports, malls)

**Weaknesses:**
- 1 req/sec limit too slow for batch processing
- Usage policy: "You must not implement auto-complete"
- Must provide valid User-Agent or Referer header
- Public API is "best effort" with no SLA
- Usage policy may change without notice
- Not suitable for commercial production use
- Address accuracy issues with house numbers (interpolation)

**Use Case Fit:**
- ❌ Too slow for PDF import workflows (1 req/sec = 60 locations/minute)
- ✅ Good for development/testing
- ✅ Good if self-hosted for unlimited usage

**Documentation:**
- [Nominatim Search API](https://nominatim.org/release-docs/latest/api/Search/)
- [Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)

---

### 2. Photon (Komoot)

**Pricing & Limits:**
- **Cost:** Free
- **Rate Limit:** "Fair use" policy - no specific limits documented
- **Daily Limit:** Unlimited (but extensive usage will be throttled)
- **API Key:** None required

**Strengths:**
- No API key required
- No documented hard rate limits
- Based on OpenStreetMap data
- Can self-host for unlimited usage

**Weaknesses:**
- Vague "fair use" policy creates uncertainty
- No SLA or guarantees for public API
- Throttling is arbitrary ("extensive usage will be throttled")
- Self-hosting requires 220GB disk space + 64GB RAM
- Less widely adopted than Nominatim

**Use Case Fit:**
- ⚠️ Uncertain rate limits make it risky for production
- ✅ Could work for moderate usage
- ❌ No clear definition of "fair use"

**Documentation:**
- [Photon API](https://photon.komoot.io/)
- [GitHub Repository](https://github.com/komoot/photon)

---

### 3. LocationIQ ⭐ **RECOMMENDED**

**Pricing & Limits:**
- **Cost:** Free tier (no credit card required)
- **Rate Limit:** 2 requests/second
- **Daily Limit:** 5,000 requests/day (some sources claim 10,000)
- **API Key:** Required (free registration)

**Strengths:**
- 5,000 req/day = 150,000/month sufficient for most use cases
- 2 req/sec = 120 locations/minute (good for batch processing)
- Commercial usage allowed with attribution link
- API-compatible with Nominatim (easy migration)
- Enhanced features over Nominatim (`normalizeaddress` parameter)
- Active commercial support and reliable infrastructure
- POI nearby feature for finding hotels, restaurants, etc.
- Multi-language support
- 10-100ms response times
- OpenStreetMap data with commercial hosting

**Weaknesses:**
- Requires API key registration
- Share Nominatim's OSM data limitations (accuracy ~12% for exact addresses)
- POI coverage not as comprehensive as Google Maps
- Accuracy issues in dense urban areas and rural regions

**Use Case Fit:**
- ✅ **Excellent for PDF import workflows**
- ✅ 2 req/sec handles batch processing well
- ✅ 5,000/day sufficient for typical daily imports
- ✅ Commercial-friendly terms
- ✅ Reliable hosted service

**Documentation:**
- [LocationIQ Geocoding API](https://locationiq.com/geocoding)
- [Pricing Page](https://locationiq.com/pricing)
- [API Documentation](https://docs.locationiq.com/)

---

### 4. OpenCage

**Pricing & Limits:**
- **Cost:** Free TRIAL only (not a free tier)
- **Rate Limit:** 1 request/second
- **Daily Limit:** 2,500 requests/day
- **API Key:** Required

**Strengths:**
- 2,500 req/day trial
- "Soft limits" - keeps working if you exceed limits occasionally
- Can store geocoded results permanently
- Established service since 2013
- Multiple data sources (not just OSM)

**Weaknesses:**
- **Free tier is TRIAL only** - not for production use
- "If you are regularly depending on our service, you are not testing"
- Must upgrade to paid plan ($50/month minimum) for regular use
- Only 1 req/sec rate limit

**Use Case Fit:**
- ❌ Trial tier not suitable for ongoing production use
- ✅ Good for testing during development
- ❌ Must pay $50/month for production

**Documentation:**
- [OpenCage Pricing](https://opencagedata.com/pricing)
- [API Documentation](https://opencagedata.com/api)

---

### 5. Geoapify

**Pricing & Limits:**
- **Cost:** Free tier (no credit card)
- **Rate Limit:** Varies by plan (up to 30 req/sec on paid plans)
- **Daily Limit:** 3,000 requests/day
- **API Key:** Required

**Strengths:**
- 3,000 req/day = 90,000/month
- No credit card required
- Forward, reverse, and batch geocoding
- Access to mapping and routing APIs on free tier
- "Soft limits" - usage spikes tolerated
- Can store results (must keep attributions)
- OpenStreetMap data

**Weaknesses:**
- Lower daily limit than LocationIQ (3,000 vs 5,000)
- Rate limit unclear for free tier
- Less established than LocationIQ

**Use Case Fit:**
- ✅ Good alternative to LocationIQ
- ⚠️ Lower daily limit may be constraining
- ✅ Batch geocoding support useful

**Documentation:**
- [Geoapify Pricing](https://www.geoapify.com/pricing/)
- [Geocoding API Documentation](https://apidocs.geoapify.com/docs/geocoding/)

---

## Data Quality Analysis

### POI Coverage (Hotels, Airports, Landmarks)

**All services use OpenStreetMap data**, so POI quality depends on OSM mapping completeness:

**Strengths:**
- Major cities: Good coverage comparable to paid services
- Airports: Generally well-mapped as they're prominent landmarks
- Hotels: Coverage varies by region (chain hotels better mapped)
- Landmarks: Tourist attractions typically well-documented

**Weaknesses:**
- Rural areas: Lower coverage and address completeness
- House numbers: Often interpolated, leading to ~12% accuracy
- POI completeness: Not as comprehensive as Google Maps
- Urban density: 2 streets off errors in dense cities
- Localization: Still needs improvement for non-English names

**Accuracy Benchmark:**
- LocationIQ/Nominatim: ~12% exact address accuracy (but correct street 88%+ of time)
- Major landmarks/airports: High accuracy
- Chain hotels with addresses: Good accuracy
- Independent hotels in rural areas: Variable quality

---

## Node.js/TypeScript Integration

### Recommended Libraries

#### 1. **node-geocoder** (Most Popular)

```bash
npm install node-geocoder
npm install @types/node-geocoder --save-dev
```

**Features:**
- Support for multiple providers (LocationIQ, Nominatim, OpenCage, etc.)
- TypeScript support via @types package
- Promise-based API
- Custom Nominatim server support
- 1.5k+ GitHub stars

**Example - LocationIQ:**

```typescript
import NodeGeocoder from 'node-geocoder';

const options = {
  provider: 'locationiq',
  apiKey: process.env.LOCATIONIQ_API_KEY,
  httpAdapter: 'https',
};

const geocoder = NodeGeocoder(options);

// Forward geocoding
async function geocodeLocation(query: string) {
  try {
    const results = await geocoder.geocode(query);

    if (results.length > 0) {
      const location = results[0];
      return {
        latitude: location.latitude,
        longitude: location.longitude,
        formattedAddress: location.formattedAddress,
        country: location.country,
        city: location.city,
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

// Usage examples
const hotel = await geocodeLocation('Marriott Marquis, New York, NY');
const airport = await geocodeLocation('JFK Airport, New York');
const landmark = await geocodeLocation('Eiffel Tower, Paris, France');
```

**Example - Nominatim (with custom server):**

```typescript
const options = {
  provider: 'openstreetmap',
  httpAdapter: 'https',
  osmServer: 'https://nominatim.openstreetmap.org', // or self-hosted
  email: 'your-email@example.com', // recommended for identification
};

const geocoder = NodeGeocoder(options);
```

---

#### 2. **universal-geocoder** (Modern, TypeScript-first)

```bash
npm install universal-geocoder
```

**Features:**
- TypeScript-first design
- Platform agnostic (Node.js, browser, React Native)
- Multiple provider support
- Cleaner API than node-geocoder

**Example:**

```typescript
import { UniversalGeocoder } from 'universal-geocoder';
import { LocationIQProvider } from 'universal-geocoder/provider/locationiq';

const provider = new LocationIQProvider({
  apiKey: process.env.LOCATIONIQ_API_KEY,
});

const geocoder = new UniversalGeocoder(provider);

async function geocodeAddress(address: string) {
  const results = await geocoder.geocode(address);

  return results.map(result => ({
    lat: result.coordinates.latitude,
    lon: result.coordinates.longitude,
    address: result.formattedAddress,
    country: result.country,
  }));
}
```

---

#### 3. **@goparrot/geocoder** (Advanced TypeScript)

```bash
npm install @goparrot/geocoder
```

**Features:**
- Full TypeScript support
- Multiple providers (LocationIQ, Nominatim, OpenCage, Photon, etc.)
- Consistent API across providers

**Example:**

```typescript
import { Geocoder, LocationIQProvider } from '@goparrot/geocoder';

const provider = new LocationIQProvider({
  apiKey: process.env.LOCATIONIQ_API_KEY,
});

const geocoder = new Geocoder(provider);

const results = await geocoder.geocode({
  address: 'Hilton Hotel, San Francisco, CA',
});

console.log(results[0].coordinates); // { latitude: 37.7749, longitude: -122.4194 }
```

---

### Rate Limiting Strategy for PDF Import

Since LocationIQ limits to 2 req/sec, implement rate limiting:

```typescript
import pLimit from 'p-limit';

// Limit to 2 concurrent requests (2 req/sec)
const limit = pLimit(2);

async function geocodeBatch(locations: string[]) {
  const promises = locations.map(location =>
    limit(() => geocodeLocation(location))
  );

  return await Promise.all(promises);
}

// With delay between requests to be safe
async function geocodeWithDelay(location: string, delayMs = 500) {
  await new Promise(resolve => setTimeout(resolve, delayMs));
  return geocodeLocation(location);
}
```

---

### Error Handling & Fallback Strategy

```typescript
type GeocoderProvider = 'locationiq' | 'nominatim' | 'geoapify';

class GeocodingService {
  private providers: Map<GeocoderProvider, any>;
  private currentProvider: GeocoderProvider = 'locationiq';

  constructor() {
    this.providers = new Map([
      ['locationiq', NodeGeocoder({
        provider: 'locationiq',
        apiKey: process.env.LOCATIONIQ_API_KEY,
      })],
      ['nominatim', NodeGeocoder({
        provider: 'openstreetmap',
        email: process.env.EMAIL,
      })],
      ['geoapify', NodeGeocoder({
        provider: 'geoapify',
        apiKey: process.env.GEOAPIFY_API_KEY,
      })],
    ]);
  }

  async geocode(query: string, retries = 2): Promise<GeocodedLocation | null> {
    const providers: GeocoderProvider[] = [
      this.currentProvider,
      'nominatim',
      'geoapify',
    ];

    for (const provider of providers) {
      try {
        const geocoder = this.providers.get(provider);
        if (!geocoder) continue;

        const results = await geocoder.geocode(query);

        if (results.length > 0) {
          return {
            latitude: results[0].latitude,
            longitude: results[0].longitude,
            formattedAddress: results[0].formattedAddress,
            provider,
          };
        }
      } catch (error) {
        console.warn(`Geocoding failed with ${provider}:`, error);

        // Rate limit exceeded - try next provider
        if (error.message?.includes('rate limit')) {
          continue;
        }

        // Retry with same provider
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.geocode(query, retries - 1);
        }
      }
    }

    return null;
  }
}
```

---

## Integration Example for PDF Import

```typescript
import { GeocodingService } from './services/geocoding.service';

interface LocationWithCoordinates {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  geocodingProvider?: string;
}

class PDFImportService {
  private geocodingService: GeocodingService;

  constructor() {
    this.geocodingService = new GeocodingService();
  }

  async enrichLocationsWithCoordinates(
    locations: Array<{ name: string; address?: string }>
  ): Promise<LocationWithCoordinates[]> {
    const enriched: LocationWithCoordinates[] = [];

    for (const location of locations) {
      // Try geocoding with name + address
      const query = location.address
        ? `${location.name}, ${location.address}`
        : location.name;

      const geocoded = await this.geocodingService.geocode(query);

      enriched.push({
        name: location.name,
        address: location.address,
        latitude: geocoded?.latitude,
        longitude: geocoded?.longitude,
        geocodingProvider: geocoded?.provider,
      });

      // Rate limiting: wait 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return enriched;
  }

  // Batch processing with progress tracking
  async enrichLocationsInBatches(
    locations: Array<{ name: string; address?: string }>,
    batchSize = 10
  ) {
    const results: LocationWithCoordinates[] = [];

    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);

      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(locations.length / batchSize)}`);

      const batchResults = await this.enrichLocationsWithCoordinates(batch);
      results.push(...batchResults);

      // Log progress
      const successCount = batchResults.filter(r => r.latitude && r.longitude).length;
      console.log(`Geocoded ${successCount}/${batch.length} locations in this batch`);
    }

    return results;
  }
}
```

---

## Gotchas and Limitations

### LocationIQ Specific

1. **Rate Limit Enforcement:**
   - 2 req/sec is enforced, exceeding returns 429 error
   - Implement retry logic with exponential backoff

2. **API Key Required:**
   - Must register (free, no credit card)
   - Store API key in environment variables
   - Don't commit API keys to git

3. **Attribution Required:**
   - Must include link to LocationIQ in your application
   - Example: "Powered by LocationIQ"

4. **Address Quality:**
   - Street names generally accurate
   - House numbers may be interpolated (~12% accuracy for exact addresses)
   - Chain hotels with full addresses work best

### Nominatim Specific

1. **User-Agent Required:**
   - Must set custom User-Agent or Referer header
   - Default http library User-Agent will be blocked
   - Include contact email in User-Agent for high volume

2. **Slow Rate Limit:**
   - 1 req/sec means 60 locations/minute max
   - Not suitable for batch processing without self-hosting

3. **Usage Policy:**
   - No auto-complete implementations
   - No systematic grid searches
   - Policy may change without notice

### General OSM Data Limitations

1. **POI Coverage:**
   - Not as comprehensive as Google Maps
   - Rural areas have lower quality
   - Independent hotels may not be mapped

2. **Address Format:**
   - International addresses vary in quality
   - Some regions better mapped than others
   - Always validate with sample data from your target regions

3. **Airport Codes:**
   - Search by full name works better than IATA codes
   - Example: "JFK Airport" better than "JFK"
   - Major international airports well-mapped

4. **Hotel Names:**
   - Chain hotels (Marriott, Hilton, Hyatt) generally well-mapped
   - Include city/country for disambiguation
   - Example: "Marriott Marquis, New York" better than just "Marriott Marquis"

---

## Cost Projection

### Expected Usage Scenarios

**Scenario 1: Light Usage**
- 20 PDF imports/month
- 10 locations per PDF
- 200 locations/month
- **Recommended:** LocationIQ Free (5,000/day = 150,000/month)
- **Cost:** $0/month

**Scenario 2: Moderate Usage**
- 100 PDF imports/month
- 15 locations per PDF
- 1,500 locations/month
- **Recommended:** LocationIQ Free
- **Cost:** $0/month

**Scenario 3: Heavy Usage**
- 500 PDF imports/month
- 20 locations per PDF
- 10,000 locations/month (333/day)
- **Recommended:** LocationIQ Free (within 5,000/day limit)
- **Cost:** $0/month

**Scenario 4: Very Heavy Usage**
- 1,000+ PDF imports/month
- 30,000+ locations/month (1,000+/day)
- **Recommended:** LocationIQ Paid ($49/month for 10,000/day)
- **Alternative:** Self-hosted Nominatim (server costs)
- **Cost:** $49-99/month

---

## Recommendation: Implementation Plan

### Phase 1: Development (Now)
1. **Use LocationIQ Free Tier**
   - Sign up for free API key (no credit card)
   - 5,000 requests/day sufficient for development and testing
   - 2 req/sec works well for batch processing

2. **Install node-geocoder**
   ```bash
   npm install node-geocoder @types/node-geocoder
   ```

3. **Implement Geocoding Service**
   - Create `src/services/geocoding.service.ts`
   - Add rate limiting (2 req/sec max)
   - Add error handling and logging
   - Add caching to avoid duplicate requests

4. **Environment Configuration**
   ```env
   LOCATIONIQ_API_KEY=your_api_key_here
   GEOCODING_PROVIDER=locationiq
   ```

### Phase 2: Testing
1. **Test with Sample Data**
   - Test hotel names from various regions
   - Test airport codes (IATA and full names)
   - Test landmarks and attractions
   - Measure accuracy and coverage

2. **Validate Results**
   - Check coordinates against known locations
   - Verify address formatting
   - Test edge cases (international addresses, special characters)

3. **Performance Testing**
   - Measure geocoding time per location
   - Test batch processing with rate limiting
   - Monitor API quota usage

### Phase 3: Production
1. **Monitor Usage**
   - Track daily request count
   - Log failed geocoding attempts
   - Monitor accuracy rates

2. **Fallback Strategy**
   - Implement Nominatim as backup provider
   - Cache successful geocoding results
   - Store raw address strings when geocoding fails

3. **Scale Planning**
   - If approaching 5,000 req/day limit:
     - Option A: Upgrade to LocationIQ paid ($49/month)
     - Option B: Self-host Nominatim
     - Option C: Implement multiple providers with load balancing

---

## References and Documentation

### LocationIQ
- [Geocoding API](https://locationiq.com/geocoding)
- [Pricing Page](https://locationiq.com/pricing)
- [API Documentation](https://docs.locationiq.com/)

### Nominatim
- [Nominatim Search API](https://nominatim.org/release-docs/latest/api/Search/)
- [Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- [Nominatim Wiki](https://wiki.openstreetmap.org/wiki/Nominatim)

### OpenCage
- [OpenCage Pricing](https://opencagedata.com/pricing)
- [API Documentation](https://opencagedata.com/api)

### Geoapify
- [Geoapify Pricing](https://www.geoapify.com/pricing/)
- [Geocoding API Documentation](https://apidocs.geoapify.com/docs/geocoding/)

### Photon
- [Photon API](https://photon.komoot.io/)
- [GitHub Repository](https://github.com/komoot/photon)

### Node.js Libraries
- [node-geocoder on npm](https://www.npmjs.com/package/node-geocoder)
- [universal-geocoder on npm](https://www.npmjs.com/package/universal-geocoder)
- [@goparrot/geocoder on GitHub](https://github.com/goparrot/geocoder)

### Comparison Articles
- [Geocoding APIs Compared: Pricing, Free Tiers & Terms](https://www.bitoff.org/geocoding-apis-comparison/)
- [Guide to Geocoding API Pricing (2025)](https://mapscaping.com/guide-to-geocoding-api-pricing/)
- [Top 7 Free Geocoding APIs for Developers (2025)](https://community.codenewbie.org/ramesh0089/top-7-free-geocoding-apis-every-developer-should-know-in-2025-b74)

---

## Conclusion

**LocationIQ free tier is the best choice** for adding coordinates to locations during PDF import:

✅ **5,000 requests/day** covers typical usage
✅ **2 req/sec** enables efficient batch processing
✅ **No credit card required** for free tier
✅ **Commercial usage allowed** with attribution
✅ **API-compatible with Nominatim** for easy migration
✅ **Good POI coverage** for hotels, airports, landmarks
✅ **Mature Node.js ecosystem** with multiple library options

**Implementation complexity:** Low (existing libraries available)
**Expected development time:** 1-2 days
**Ongoing cost:** $0/month (unless exceeding 5,000 req/day)

**Next steps:**
1. Sign up for LocationIQ free API key
2. Install `node-geocoder` library
3. Implement geocoding service with rate limiting
4. Test with sample PDF data
5. Monitor usage and accuracy
