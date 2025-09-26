<script lang="ts">
  import { page } from "$app/state";
</script>

<div class="flex flex-col gap-2">
  <h2 class="font-bold">Error</h2>
  <p>{page.error?.message || "Something went wrong!"}</p>
</div>
