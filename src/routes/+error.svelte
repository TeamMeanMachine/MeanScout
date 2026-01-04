<script lang="ts">
  import { HomeIcon } from "@lucide/svelte";
  import { page } from "$app/state";
  import Anchor from "$lib/components/Anchor.svelte";
</script>

<header class="flex min-h-11 items-center gap-3">
  <img src="./logo.svg" alt="" width="25" height="25" />
  <h1 class="font-bold">MeanScout</h1>
</header>

<div class="flex flex-col gap-2">
  <h2 class="font-bold">Error</h2>
  <p>{page.error?.message || "Something went wrong!"}</p>
</div>

<Anchor route="" class="self-start"><HomeIcon class="text-theme" />Home</Anchor>
