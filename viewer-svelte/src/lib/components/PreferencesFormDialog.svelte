<script lang="ts">
  import type { TripTravelerPreferences } from '$domain/types/traveler.js';

  let {
    open = $bindable(false),
    preferences,
    onSave,
    onCancel
  }: {
    open: boolean;
    preferences?: TripTravelerPreferences;
    onSave: (data: Partial<TripTravelerPreferences>) => Promise<void>;
    onCancel: () => void;
  } = $props();

  // Form state
  let origin = $state(preferences?.origin || '');
  let travelStyle = $state(preferences?.travelStyle || '');
  let pace = $state(preferences?.pace || '');
  let dietaryRestrictions = $state(preferences?.dietaryRestrictions || '');
  let mobilityRestrictions = $state(preferences?.mobilityRestrictions || '');
  let accommodationPreference = $state(preferences?.accommodationPreference || '');

  // Multi-select interests
  let selectedInterests = $state<Set<string>>(new Set(preferences?.interests || []));
  let selectedActivities = $state<Set<string>>(new Set(preferences?.activityPreferences || []));
  let selectedAvoidances = $state<Set<string>>(new Set(preferences?.avoidances || []));

  let saving = $state(false);
  let error = $state<string | null>(null);

  // Available options
  const interestOptions = [
    'Food & Wine',
    'History & Culture',
    'Nature & Wildlife',
    'Beaches & Water Sports',
    'Nightlife & Entertainment',
    'Shopping',
    'Art & Museums',
    'Adventure Sports',
    'Relaxation & Wellness',
    'Photography'
  ];

  const activityOptions = [
    'Museums',
    'Hiking',
    'Beaches',
    'Fine Dining',
    'Local Markets',
    'Nightclubs',
    'Spa & Wellness',
    'Water Sports',
    'City Tours',
    'Wine Tasting'
  ];

  const avoidanceOptions = [
    'Crowds',
    'Long Walks',
    'Early Mornings',
    'Late Nights',
    'Spicy Food',
    'Heights',
    'Water Activities',
    'Insects'
  ];

  function toggleInterest(interest: string) {
    if (selectedInterests.has(interest)) {
      selectedInterests.delete(interest);
    } else {
      selectedInterests.add(interest);
    }
    selectedInterests = new Set(selectedInterests);
  }

  function toggleActivity(activity: string) {
    if (selectedActivities.has(activity)) {
      selectedActivities.delete(activity);
    } else {
      selectedActivities.add(activity);
    }
    selectedActivities = new Set(selectedActivities);
  }

  function toggleAvoidance(avoidance: string) {
    if (selectedAvoidances.has(avoidance)) {
      selectedAvoidances.delete(avoidance);
    } else {
      selectedAvoidances.add(avoidance);
    }
    selectedAvoidances = new Set(selectedAvoidances);
  }

  async function handleSubmit() {
    saving = true;
    error = null;

    try {
      const data: Partial<TripTravelerPreferences> = {};

      if (origin.trim()) data.origin = origin.trim();
      if (travelStyle) data.travelStyle = travelStyle as any;
      if (pace) data.pace = pace as any;
      if (dietaryRestrictions.trim()) data.dietaryRestrictions = dietaryRestrictions.trim();
      if (mobilityRestrictions.trim()) data.mobilityRestrictions = mobilityRestrictions.trim();
      if (accommodationPreference) data.accommodationPreference = accommodationPreference;
      if (selectedInterests.size > 0) data.interests = Array.from(selectedInterests);
      if (selectedActivities.size > 0) data.activityPreferences = Array.from(selectedActivities);
      if (selectedAvoidances.size > 0) data.avoidances = Array.from(selectedAvoidances);

      await onSave(data);
      open = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save preferences';
    } finally {
      saving = false;
    }
  }

  function handleCancel() {
    open = false;
    onCancel();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  }

  // Reset form when dialog opens/closes
  $effect(() => {
    if (open) {
      origin = preferences?.origin || '';
      travelStyle = preferences?.travelStyle || '';
      pace = preferences?.pace || '';
      dietaryRestrictions = preferences?.dietaryRestrictions || '';
      mobilityRestrictions = preferences?.mobilityRestrictions || '';
      accommodationPreference = preferences?.accommodationPreference || '';
      selectedInterests = new Set(preferences?.interests || []);
      selectedActivities = new Set(preferences?.activityPreferences || []);
      selectedAvoidances = new Set(preferences?.avoidances || []);
      error = null;
    }
  });
</script>

{#if open}
  <div class="dialog-overlay" onclick={handleBackdropClick}>
    <div class="dialog">
      <h2 class="dialog-title">Edit Trip Preferences</h2>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div class="form-section">
          <h3 class="section-title">Travel Details</h3>

          <div class="form-field">
            <label for="origin">Origin</label>
            <input
              id="origin"
              type="text"
              bind:value={origin}
              placeholder="Where are you traveling from?"
            />
          </div>

          <div class="form-row">
            <div class="form-field">
              <label for="travelStyle">Travel Style</label>
              <select id="travelStyle" bind:value={travelStyle}>
                <option value="">Not specified</option>
                <option value="luxury">Luxury</option>
                <option value="moderate">Moderate</option>
                <option value="budget">Budget</option>
                <option value="backpacker">Backpacker</option>
              </select>
            </div>

            <div class="form-field">
              <label for="pace">Pace</label>
              <select id="pace" bind:value={pace}>
                <option value="">Not specified</option>
                <option value="packed">Packed (lots of activities)</option>
                <option value="balanced">Balanced</option>
                <option value="leisurely">Leisurely (relaxed)</option>
              </select>
            </div>
          </div>

          <div class="form-field">
            <label for="accommodation">Accommodation Preference</label>
            <select id="accommodation" bind:value={accommodationPreference}>
              <option value="">Not specified</option>
              <option value="hotel">Hotel</option>
              <option value="resort">Resort</option>
              <option value="airbnb">Airbnb/Vacation Rental</option>
              <option value="hostel">Hostel</option>
              <option value="boutique">Boutique Hotel</option>
            </select>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Interests</h3>
          <div class="checkbox-grid">
            {#each interestOptions as interest}
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedInterests.has(interest)}
                  onchange={() => toggleInterest(interest)}
                />
                <span>{interest}</span>
              </label>
            {/each}
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Activity Preferences</h3>
          <div class="checkbox-grid">
            {#each activityOptions as activity}
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedActivities.has(activity)}
                  onchange={() => toggleActivity(activity)}
                />
                <span>{activity}</span>
              </label>
            {/each}
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Things to Avoid</h3>
          <div class="checkbox-grid">
            {#each avoidanceOptions as avoidance}
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedAvoidances.has(avoidance)}
                  onchange={() => toggleAvoidance(avoidance)}
                />
                <span>{avoidance}</span>
              </label>
            {/each}
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Special Requirements</h3>

          <div class="form-field">
            <label for="dietary">Dietary Restrictions</label>
            <input
              id="dietary"
              type="text"
              bind:value={dietaryRestrictions}
              placeholder="e.g., Vegetarian, Gluten-free, Vegan"
            />
          </div>

          <div class="form-field">
            <label for="mobility">Mobility/Accessibility Needs</label>
            <input
              id="mobility"
              type="text"
              bind:value={mobilityRestrictions}
              placeholder="e.g., Wheelchair accessible, Limited walking"
            />
          </div>
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn-cancel" onclick={handleCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" class="btn-save" disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .dialog {
    background-color: #ffffff;
    border-radius: 0.5rem;
    padding: 1.5rem;
    max-width: 700px;
    width: 100%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    max-height: 90vh;
    overflow-y: auto;
  }

  .dialog-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1.5rem 0;
  }

  .error-message {
    background-color: #fef2f2;
    color: #991b1b;
    padding: 0.75rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .form-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .form-section:last-of-type {
    border-bottom: none;
  }

  .section-title {
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 1rem 0;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .form-field {
    margin-bottom: 1rem;
  }

  .form-field label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .form-field input,
  .form-field select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 1rem;
    color: #1f2937;
  }

  .form-field input:focus,
  .form-field select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .checkbox-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.5rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #374151;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
    cursor: pointer;
  }

  .dialog-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .btn-cancel,
  .btn-save {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-cancel {
    background-color: #ffffff;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-cancel:hover:not(:disabled) {
    background-color: #f9fafb;
  }

  .btn-save {
    background-color: #3b82f6;
    color: #ffffff;
    border: 1px solid #3b82f6;
  }

  .btn-save:hover:not(:disabled) {
    background-color: #2563eb;
  }

  .btn-cancel:disabled,
  .btn-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .form-row {
      grid-template-columns: 1fr;
    }

    .checkbox-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
