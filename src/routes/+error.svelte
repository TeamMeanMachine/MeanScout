<script lang="ts">
  import { page } from "$app/state";
</script>

<header class="flex min-h-11 items-center gap-3">
  <img src="./logo.svg" alt="" width="25" height="25" />
  <h1 class="font-bold">MeanScout</h1>
</header>

<div class="flex flex-col gap-3">
  <h2>Error</h2>
  <p>Something went wrong!</p>
  <p>Message: {page.error?.message}</p>
</div>
