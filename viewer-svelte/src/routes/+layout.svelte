<script lang="ts">
  import '../app.postcss';
  import HealthStatusBanner from '$lib/components/HealthStatusBanner.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import { healthStore } from '$lib/stores/health.svelte';
  import { onMount, onDestroy } from 'svelte';

  let { children } = $props();

  // Start health monitoring when app mounts
  onMount(() => {
    healthStore.start();
  });

  // Stop health monitoring when app unmounts (cleanup)
  onDestroy(() => {
    healthStore.stop();
  });
</script>

<!-- Health status banner (fixed at top when offline) -->
<HealthStatusBanner />

<!-- Toast notifications -->
<ToastContainer />

<!-- Confirmation modal -->
<ConfirmModal />

<!-- Full height layout without extra wrapper -->
<div class="h-full bg-minimal-bg">
  {@render children()}
</div>
