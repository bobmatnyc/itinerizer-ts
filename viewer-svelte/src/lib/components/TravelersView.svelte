<script lang="ts">
  import type { Itinerary, Traveler } from '../types';
  import type { TripTravelerPreferences } from '$domain/types/traveler.js';
  import { apiClient } from '../api';
  import TravelerFormDialog from './TravelerFormDialog.svelte';
  import PreferencesFormDialog from './PreferencesFormDialog.svelte';

  let { itinerary = $bindable() }: { itinerary: Itinerary } = $props();

  // Type guard to check if travelers exist
  const travelers = $derived(itinerary.travelers || []);
  const tripPreferences = $derived(itinerary.tripPreferences || {});
  const hasTravelers = $derived(travelers.length > 0);
  const hasTripPreferences = $derived(Object.keys(tripPreferences).length > 0);

  // Dialog state
  let travelerDialogOpen = $state(false);
  let preferencesDialogOpen = $state(false);
  let editingTraveler = $state<Traveler | undefined>(undefined);

  // Open dialogs
  function openAddTraveler() {
    editingTraveler = undefined;
    travelerDialogOpen = true;
  }

  function openEditTraveler(traveler: Traveler) {
    editingTraveler = traveler;
    travelerDialogOpen = true;
  }

  function openEditPreferences() {
    preferencesDialogOpen = true;
  }

  // Save handlers
  async function handleSaveTraveler(data: Partial<Traveler>) {
    if (editingTraveler) {
      // Update existing traveler
      const updated = await apiClient.updateTraveler(itinerary.id, editingTraveler.id, data);
      itinerary = updated;
    } else {
      // Add new traveler
      const updated = await apiClient.addTraveler(itinerary.id, data);
      itinerary = updated;
    }
  }

  async function handleRemoveTraveler(travelerId: string) {
    if (!confirm('Are you sure you want to remove this traveler?')) return;

    const updated = await apiClient.deleteTraveler(itinerary.id, travelerId);
    itinerary = updated;
  }

  async function handleSavePreferences(data: Partial<TripTravelerPreferences>) {
    const updated = await apiClient.updateTripPreferences(itinerary.id, data);
    itinerary = updated;
  }

  function getTravelerTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ADULT: 'Adult',
      CHILD: 'Child',
      INFANT: 'Infant',
    };
    return labels[type] || type;
  }

  function getTravelStyleLabel(style?: string): string {
    if (!style) return 'Not specified';
    const labels: Record<string, string> = {
      luxury: 'Luxury',
      moderate: 'Moderate',
      budget: 'Budget',
      backpacker: 'Backpacker',
    };
    return labels[style] || style;
  }

  function getPaceLabel(pace?: string): string {
    if (!pace) return 'Not specified';
    const labels: Record<string, string> = {
      packed: 'Packed',
      balanced: 'Balanced',
      leisurely: 'Leisurely',
    };
    return labels[pace] || pace;
  }
</script>

<div class="travelers-view">
  <div class="travelers-content">
    <!-- Travelers Section -->
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Travelers</h2>
        <button class="btn-add" onclick={openAddTraveler}>
          + Add Traveler
        </button>
      </div>
      {#if hasTravelers}
        <div class="travelers-list">
          {#each travelers as traveler}
            <div class="traveler-card">
              <div class="traveler-header">
                <h3 class="traveler-name">
                  {traveler.firstName}
                  {traveler.lastName}
                </h3>
                <div class="traveler-actions">
                  <span class="traveler-type">{getTravelerTypeLabel(traveler.type)}</span>
                  <button class="btn-icon" onclick={() => openEditTraveler(traveler)} title="Edit">
                    ✏️
                  </button>
                  <button class="btn-icon" onclick={() => handleRemoveTraveler(traveler.id)} title="Remove">
                    🗑️
                  </button>
                </div>
              </div>
              {#if traveler.email}
                <p class="traveler-detail">
                  <span class="detail-label">Email:</span>
                  {traveler.email}
                </p>
              {/if}
              {#if traveler.phone}
                <p class="traveler-detail">
                  <span class="detail-label">Phone:</span>
                  {traveler.phone}
                </p>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <p class="empty-message">No travelers added yet</p>
      {/if}
    </div>

    <!-- Trip Preferences Section -->
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Trip Preferences</h2>
        <button class="btn-add" onclick={openEditPreferences}>
          {hasTripPreferences ? 'Edit Preferences' : '+ Add Preferences'}
        </button>
      </div>
      {#if hasTripPreferences}
        <div class="preferences-grid">
          {#if tripPreferences.origin}
            <div class="preference-item">
              <span class="preference-label">Origin</span>
              <span class="preference-value">{tripPreferences.origin}</span>
            </div>
          {/if}
          {#if tripPreferences.travelStyle}
            <div class="preference-item">
              <span class="preference-label">Travel Style</span>
              <span class="preference-value">{getTravelStyleLabel(tripPreferences.travelStyle)}</span>
            </div>
          {/if}
          {#if tripPreferences.pace}
            <div class="preference-item">
              <span class="preference-label">Pace</span>
              <span class="preference-value">{getPaceLabel(tripPreferences.pace)}</span>
            </div>
          {/if}
          {#if tripPreferences.interests && tripPreferences.interests.length > 0}
            <div class="preference-item full-width">
              <span class="preference-label">Interests</span>
              <div class="interests-list">
                {#each tripPreferences.interests as interest}
                  <span class="interest-tag">{interest}</span>
                {/each}
              </div>
            </div>
          {/if}
          {#if tripPreferences.dietaryRestrictions}
            <div class="preference-item full-width">
              <span class="preference-label">Dietary Restrictions</span>
              <span class="preference-value">{tripPreferences.dietaryRestrictions}</span>
            </div>
          {/if}
          {#if tripPreferences.mobilityRestrictions}
            <div class="preference-item full-width">
              <span class="preference-label">Mobility Restrictions</span>
              <span class="preference-value">{tripPreferences.mobilityRestrictions}</span>
            </div>
          {/if}
          {#if tripPreferences.accommodationPreference}
            <div class="preference-item">
              <span class="preference-label">Accommodation Preference</span>
              <span class="preference-value">{tripPreferences.accommodationPreference}</span>
            </div>
          {/if}
          {#if tripPreferences.activityPreferences && tripPreferences.activityPreferences.length > 0}
            <div class="preference-item full-width">
              <span class="preference-label">Activity Preferences</span>
              <div class="interests-list">
                {#each tripPreferences.activityPreferences as activity}
                  <span class="interest-tag">{activity}</span>
                {/each}
              </div>
            </div>
          {/if}
          {#if tripPreferences.avoidances && tripPreferences.avoidances.length > 0}
            <div class="preference-item full-width">
              <span class="preference-label">Things to Avoid</span>
              <div class="interests-list">
                {#each tripPreferences.avoidances as avoidance}
                  <span class="avoidance-tag">{avoidance}</span>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <p class="empty-message">No trip preferences set</p>
      {/if}
    </div>
  </div>
</div>

<!-- Dialogs -->
<TravelerFormDialog
  bind:open={travelerDialogOpen}
  traveler={editingTraveler}
  onSave={handleSaveTraveler}
  onCancel={() => {}}
/>

<PreferencesFormDialog
  bind:open={preferencesDialogOpen}
  preferences={tripPreferences}
  onSave={handleSavePreferences}
  onCancel={() => {}}
/>

<style>
  .travelers-view {
    height: 100%;
    overflow-y: auto;
    background-color: #fafafa;
  }

  .travelers-content {
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .section {
    background-color: #ffffff;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border: 1px solid #e5e7eb;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .btn-add {
    padding: 0.5rem 1rem;
    background-color: #3b82f6;
    color: #ffffff;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .btn-add:hover {
    background-color: #2563eb;
  }

  .travelers-list {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  .traveler-card {
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 1rem;
  }

  .traveler-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .traveler-name {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .traveler-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .traveler-type {
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
    background-color: #e5e7eb;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    text-transform: uppercase;
  }

  .btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    font-size: 1rem;
    opacity: 0.6;
    transition: opacity 0.15s;
  }

  .btn-icon:hover {
    opacity: 1;
  }

  .traveler-detail {
    font-size: 0.875rem;
    color: #4b5563;
    margin: 0.5rem 0 0 0;
  }

  .detail-label {
    font-weight: 500;
    color: #6b7280;
    margin-right: 0.5rem;
  }

  .preferences-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }

  .preference-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .preference-item.full-width {
    grid-column: 1 / -1;
  }

  .preference-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .preference-value {
    font-size: 1rem;
    color: #1f2937;
    font-weight: 500;
  }

  .interests-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .interest-tag {
    display: inline-block;
    padding: 0.375rem 0.75rem;
    background-color: #eff6ff;
    color: #1e40af;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid #bfdbfe;
  }

  .avoidance-tag {
    display: inline-block;
    padding: 0.375rem 0.75rem;
    background-color: #fef2f2;
    color: #991b1b;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid #fecaca;
  }

  .empty-message {
    color: #9ca3af;
    font-size: 0.875rem;
    text-align: center;
    padding: 2rem;
    font-style: italic;
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .travelers-content {
      padding: 1rem;
    }

    .travelers-list,
    .preferences-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
