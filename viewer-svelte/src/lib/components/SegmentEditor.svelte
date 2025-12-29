<script lang="ts">
  import type { Segment, SegmentType, Location } from '$lib/types';
  import { modal } from '$lib/stores/modal.svelte';

  let {
    segment,
    onSave,
    onCancel,
    onDelete
  }: {
    segment: Segment | null;
    onSave: (data: Partial<Segment>) => void;
    onCancel: () => void;
    onDelete?: () => void;
  } = $props();

  // Form state - initialize with defaults, will be set by $effect
  let type = $state<SegmentType>('ACTIVITY');
  let startDatetime = $state('');
  let endDatetime = $state('');
  let notes = $state('');
  let status = $state<'TENTATIVE' | 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'COMPLETED'>('CONFIRMED');

  // Flight fields
  let flightAirlineName = $state('');
  let flightAirlineCode = $state('');
  let flightNumber = $state('');
  let flightOriginName = $state('');
  let flightOriginCode = $state('');
  let flightDestName = $state('');
  let flightDestCode = $state('');
  let flightCabin = $state('');

  // Hotel fields
  let hotelName = $state('');
  let hotelCity = $state('');
  let hotelCountry = $state('');
  let hotelAddress = $state('');
  let roomType = $state('');

  // Activity fields
  let activityName = $state('');
  let activityDescription = $state('');
  let activityLocationName = $state('');
  let activityCity = $state('');
  let activityCountry = $state('');

  // Transfer fields
  let transferType = $state<'TAXI' | 'SHUTTLE' | 'PRIVATE' | 'PUBLIC' | 'RIDE_SHARE'>('TAXI');
  let pickupLocationName = $state('');
  let pickupCity = $state('');
  let dropoffLocationName = $state('');
  let dropoffCity = $state('');

  // Custom fields
  let customTitle = $state('');
  let customDescription = $state('');

  let validationError = $state<string | null>(null);

  // Initialize form from segment
  $effect(() => {
    if (segment) {
      type = segment.type;
      startDatetime = formatDateTimeForInput(segment.startDatetime);
      endDatetime = formatDateTimeForInput(segment.endDatetime);
      notes = segment.notes || '';
      status = segment.status;

      switch (segment.type) {
        case 'FLIGHT':
          flightAirlineName = segment.airline.name;
          flightAirlineCode = segment.airline.code;
          flightNumber = segment.flightNumber;
          flightOriginName = segment.origin.name;
          flightOriginCode = segment.origin.code || '';
          flightDestName = segment.destination.name;
          flightDestCode = segment.destination.code || '';
          flightCabin = segment.cabin || '';
          break;
        case 'HOTEL':
          hotelName = segment.property.name;
          hotelCity = segment.location.city || '';
          hotelCountry = segment.location.country || '';
          hotelAddress = segment.location.address || '';
          roomType = segment.roomType || '';
          break;
        case 'ACTIVITY':
          activityName = segment.name;
          activityDescription = segment.description || '';
          activityLocationName = segment.location.name;
          activityCity = segment.location.city || '';
          activityCountry = segment.location.country || '';
          break;
        case 'TRANSFER':
          transferType = segment.transferType;
          pickupLocationName = segment.pickupLocation.name;
          pickupCity = segment.pickupLocation.city || '';
          dropoffLocationName = segment.dropoffLocation.name;
          dropoffCity = segment.dropoffLocation.city || '';
          break;
        case 'CUSTOM':
          customTitle = segment.title;
          customDescription = segment.description || '';
          break;
      }
    }
  });

  function formatDateTimeForInput(dateTime: string): string {
    // Convert ISO string to datetime-local format
    const date = new Date(dateTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function validateAndBuildSegment(): Partial<Segment> | null {
    validationError = null;

    // Common validation
    if (!startDatetime || !endDatetime) {
      validationError = 'Start and end times are required';
      return null;
    }

    if (new Date(endDatetime) < new Date(startDatetime)) {
      validationError = 'End time must be after start time';
      return null;
    }

    const baseSegment = {
      ...(segment?.id ? { id: segment.id } : {}),
      type,
      status,
      startDatetime: new Date(startDatetime).toISOString(),
      endDatetime: new Date(endDatetime).toISOString(),
      notes: notes || undefined,
      travelerIds: segment?.travelerIds || [],
      source: segment?.source || ('manual' as const),
    };

    switch (type) {
      case 'FLIGHT':
        if (!flightAirlineName || !flightNumber || !flightOriginName || !flightDestName) {
          validationError = 'Airline, flight number, origin, and destination are required';
          return null;
        }
        return {
          ...baseSegment,
          type: 'FLIGHT',
          airline: {
            name: flightAirlineName,
            code: flightAirlineCode || flightAirlineName.substring(0, 2).toUpperCase(),
          },
          flightNumber,
          origin: {
            name: flightOriginName,
            code: flightOriginCode || undefined,
          },
          destination: {
            name: flightDestName,
            code: flightDestCode || undefined,
          },
          cabin: flightCabin || undefined,
        };

      case 'HOTEL':
        if (!hotelName) {
          validationError = 'Hotel name is required';
          return null;
        }
        return {
          ...baseSegment,
          type: 'HOTEL',
          property: {
            name: hotelName,
          },
          location: {
            name: hotelName,
            city: hotelCity || undefined,
            country: hotelCountry || undefined,
            address: hotelAddress || undefined,
          },
          roomType: roomType || undefined,
        };

      case 'ACTIVITY':
        if (!activityName || !activityLocationName) {
          validationError = 'Activity name and location are required';
          return null;
        }
        return {
          ...baseSegment,
          type: 'ACTIVITY',
          name: activityName,
          description: activityDescription || undefined,
          location: {
            name: activityLocationName,
            city: activityCity || undefined,
            country: activityCountry || undefined,
          },
        };

      case 'TRANSFER':
        if (!pickupLocationName || !dropoffLocationName) {
          validationError = 'Pickup and dropoff locations are required';
          return null;
        }
        return {
          ...baseSegment,
          type: 'TRANSFER',
          transferType,
          pickupLocation: {
            name: pickupLocationName,
            city: pickupCity || undefined,
          },
          dropoffLocation: {
            name: dropoffLocationName,
            city: dropoffCity || undefined,
          },
        };

      case 'CUSTOM':
        if (!customTitle) {
          validationError = 'Title is required';
          return null;
        }
        return {
          ...baseSegment,
          type: 'CUSTOM',
          title: customTitle,
          description: customDescription || undefined,
        };

      default:
        validationError = 'Invalid segment type';
        return null;
    }
  }

  function handleSave() {
    const segmentData = validateAndBuildSegment();
    if (segmentData) {
      onSave(segmentData);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;

    const confirmed = await modal.confirm({
      title: 'Delete Segment',
      message: 'Are you sure you want to delete this segment?',
      confirmText: 'Delete',
      destructive: true
    });

    if (confirmed) {
      onDelete();
    }
  }
</script>

<div class="segment-editor">
  <div class="editor-header">
    <h3 class="editor-title">
      {segment ? 'Edit Segment' : 'New Segment'}
    </h3>
  </div>

  {#if validationError}
    <div class="error-message">{validationError}</div>
  {/if}

  <div class="editor-form">
    <!-- Common fields -->
    <div class="form-row">
      <div class="form-group">
        <label for="startDatetime">Start Time</label>
        <input
          id="startDatetime"
          type="datetime-local"
          bind:value={startDatetime}
          required
        />
      </div>
      <div class="form-group">
        <label for="endDatetime">End Time</label>
        <input
          id="endDatetime"
          type="datetime-local"
          bind:value={endDatetime}
          required
        />
      </div>
    </div>

    <div class="form-group">
      <label for="status">Status</label>
      <select id="status" bind:value={status}>
        <option value="TENTATIVE">Tentative</option>
        <option value="CONFIRMED">Confirmed</option>
        <option value="WAITLISTED">Waitlisted</option>
        <option value="CANCELLED">Cancelled</option>
        <option value="COMPLETED">Completed</option>
      </select>
    </div>

    <!-- Type-specific fields -->
    {#if type === 'FLIGHT'}
      <div class="form-section">
        <h4>Flight Details</h4>
        <div class="form-row">
          <div class="form-group">
            <label for="flightAirlineName">Airline Name</label>
            <input
              id="flightAirlineName"
              type="text"
              bind:value={flightAirlineName}
              placeholder="United Airlines"
              required
            />
          </div>
          <div class="form-group">
            <label for="flightAirlineCode">Airline Code</label>
            <input
              id="flightAirlineCode"
              type="text"
              bind:value={flightAirlineCode}
              placeholder="UA"
            />
          </div>
        </div>
        <div class="form-group">
          <label for="flightNumber">Flight Number</label>
          <input
            id="flightNumber"
            type="text"
            bind:value={flightNumber}
            placeholder="123"
            required
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="flightOriginName">Origin</label>
            <input
              id="flightOriginName"
              type="text"
              bind:value={flightOriginName}
              placeholder="San Francisco"
              required
            />
          </div>
          <div class="form-group">
            <label for="flightOriginCode">Origin Code</label>
            <input
              id="flightOriginCode"
              type="text"
              bind:value={flightOriginCode}
              placeholder="SFO"
            />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="flightDestName">Destination</label>
            <input
              id="flightDestName"
              type="text"
              bind:value={flightDestName}
              placeholder="New York"
              required
            />
          </div>
          <div class="form-group">
            <label for="flightDestCode">Destination Code</label>
            <input
              id="flightDestCode"
              type="text"
              bind:value={flightDestCode}
              placeholder="JFK"
            />
          </div>
        </div>
        <div class="form-group">
          <label for="flightCabin">Cabin Class</label>
          <input
            id="flightCabin"
            type="text"
            bind:value={flightCabin}
            placeholder="Economy"
          />
        </div>
      </div>
    {:else if type === 'HOTEL'}
      <div class="form-section">
        <h4>Hotel Details</h4>
        <div class="form-group">
          <label for="hotelName">Hotel Name</label>
          <input
            id="hotelName"
            type="text"
            bind:value={hotelName}
            placeholder="Grand Hotel"
            required
          />
        </div>
        <div class="form-group">
          <label for="hotelAddress">Address</label>
          <input
            id="hotelAddress"
            type="text"
            bind:value={hotelAddress}
            placeholder="123 Main St"
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="hotelCity">City</label>
            <input
              id="hotelCity"
              type="text"
              bind:value={hotelCity}
              placeholder="Paris"
            />
          </div>
          <div class="form-group">
            <label for="hotelCountry">Country</label>
            <input
              id="hotelCountry"
              type="text"
              bind:value={hotelCountry}
              placeholder="France"
            />
          </div>
        </div>
        <div class="form-group">
          <label for="roomType">Room Type</label>
          <input
            id="roomType"
            type="text"
            bind:value={roomType}
            placeholder="Deluxe King"
          />
        </div>
      </div>
    {:else if type === 'ACTIVITY'}
      <div class="form-section">
        <h4>Activity Details</h4>
        <div class="form-group">
          <label for="activityName">Activity Name</label>
          <input
            id="activityName"
            type="text"
            bind:value={activityName}
            placeholder="City Tour"
            required
          />
        </div>
        <div class="form-group">
          <label for="activityDescription">Description</label>
          <textarea
            id="activityDescription"
            bind:value={activityDescription}
            placeholder="Optional description..."
            rows="3"
          ></textarea>
        </div>
        <div class="form-group">
          <label for="activityLocationName">Location Name</label>
          <input
            id="activityLocationName"
            type="text"
            bind:value={activityLocationName}
            placeholder="Eiffel Tower"
            required
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="activityCity">City</label>
            <input
              id="activityCity"
              type="text"
              bind:value={activityCity}
              placeholder="Paris"
            />
          </div>
          <div class="form-group">
            <label for="activityCountry">Country</label>
            <input
              id="activityCountry"
              type="text"
              bind:value={activityCountry}
              placeholder="France"
            />
          </div>
        </div>
      </div>
    {:else if type === 'TRANSFER'}
      <div class="form-section">
        <h4>Transfer Details</h4>
        <div class="form-group">
          <label for="transferType">Transfer Type</label>
          <select id="transferType" bind:value={transferType}>
            <option value="TAXI">Taxi</option>
            <option value="SHUTTLE">Shuttle</option>
            <option value="PRIVATE">Private Transfer</option>
            <option value="PUBLIC">Public Transport</option>
            <option value="RIDE_SHARE">Ride Share</option>
          </select>
        </div>
        <div class="form-group">
          <label for="pickupLocationName">Pickup Location</label>
          <input
            id="pickupLocationName"
            type="text"
            bind:value={pickupLocationName}
            placeholder="Airport"
            required
          />
        </div>
        <div class="form-group">
          <label for="pickupCity">Pickup City</label>
          <input
            id="pickupCity"
            type="text"
            bind:value={pickupCity}
            placeholder="Paris"
          />
        </div>
        <div class="form-group">
          <label for="dropoffLocationName">Dropoff Location</label>
          <input
            id="dropoffLocationName"
            type="text"
            bind:value={dropoffLocationName}
            placeholder="Hotel"
            required
          />
        </div>
        <div class="form-group">
          <label for="dropoffCity">Dropoff City</label>
          <input
            id="dropoffCity"
            type="text"
            bind:value={dropoffCity}
            placeholder="Paris"
          />
        </div>
      </div>
    {:else if type === 'CUSTOM'}
      <div class="form-section">
        <h4>Custom Segment</h4>
        <div class="form-group">
          <label for="customTitle">Title</label>
          <input
            id="customTitle"
            type="text"
            bind:value={customTitle}
            placeholder="Meeting, Event, etc."
            required
          />
        </div>
        <div class="form-group">
          <label for="customDescription">Description</label>
          <textarea
            id="customDescription"
            bind:value={customDescription}
            placeholder="Optional description..."
            rows="3"
          ></textarea>
        </div>
      </div>
    {/if}

    <!-- Notes (common) -->
    <div class="form-group">
      <label for="notes">Notes</label>
      <textarea
        id="notes"
        bind:value={notes}
        placeholder="Optional notes..."
        rows="2"
      ></textarea>
    </div>
  </div>

  <!-- Actions -->
  <div class="editor-actions">
    <div class="actions-left">
      {#if segment && onDelete}
        <button
          class="minimal-button delete-button"
          onclick={handleDelete}
          type="button"
        >
          Delete
        </button>
      {/if}
    </div>
    <div class="actions-right">
      <button
        class="minimal-button"
        onclick={onCancel}
        type="button"
      >
        Cancel
      </button>
      <button
        class="minimal-button primary"
        onclick={handleSave}
        type="button"
      >
        Save
      </button>
    </div>
  </div>
</div>

<style>
  .segment-editor {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .editor-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .editor-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .error-message {
    margin: 1rem 1.5rem;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .editor-form {
    padding: 1.5rem;
  }

  .form-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .form-section h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1rem 0;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  input[type='text'],
  input[type='datetime-local'],
  select,
  textarea {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    color: #1f2937;
    transition: all 0.2s;
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  textarea {
    resize: vertical;
    font-family: inherit;
  }

  .editor-actions {
    display: flex;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .actions-left,
  .actions-right {
    display: flex;
    gap: 0.5rem;
  }

  .minimal-button.primary {
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .minimal-button.primary:hover:not(:disabled) {
    background-color: #2563eb;
    border-color: #2563eb;
  }

  .delete-button {
    color: #dc2626;
    border-color: #fecaca;
  }

  .delete-button:hover:not(:disabled) {
    background-color: #fef2f2;
    border-color: #fca5a5;
  }
</style>
