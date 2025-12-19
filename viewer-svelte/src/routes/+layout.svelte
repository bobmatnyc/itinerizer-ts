<script lang="ts">
  import '../app.postcss';

  let { children } = $props();
</script>

<!-- Full height layout without extra wrapper -->
<div class="h-full bg-minimal-bg">
  {@render children()}
</div>
