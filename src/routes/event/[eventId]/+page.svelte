<script lang="ts">
  let { data } = $props();
</script>

<div class="flex grow flex-col">
  <span>{data.event.name}</span>
  <span class="text-xs font-light">{data.event.id}</span>
</div>
