<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { DialogExports } from "$lib/dialog";
  import { cameraStore } from "$lib/settings";

  let cameras = $state<{ id: string; name: string }[]>([]);
  let error = $state("");

  export const { onopen }: DialogExports = {
    async onopen(open) {
      let devices: MediaDeviceInfo[];

      try {
        devices = await navigator.mediaDevices.enumerateDevices();
      } catch (e) {
        error = "Could not get cameras";
        return open();
      }

      cameras = devices
        .filter((device) => device.kind == "videoinput")
        .map((device, index) => ({ id: device.deviceId, name: device.label.trim() || `camera ${index + 1}` }))
        .toSorted((a, b) => a.name.localeCompare(b.name, "en"));

      open();
    },
  };
</script>

<span>Pick camera</span>

<div class="flex flex-col gap-1">
  <Button onclick={() => ($cameraStore = "")} classes="capitalize">
    {#if $cameraStore == ""}
      <Icon name="circle-dot" />
      <strong>Default</strong>
    {:else}
      <Icon style="regular" name="circle" />
      Default
    {/if}
  </Button>

  {#each cameras as camera}
    <Button onclick={() => ($cameraStore = camera.id)} classes="capitalize">
      {#if $cameraStore == camera.id}
        <Icon name="circle-dot" />
        <strong>{camera.name}</strong>
      {:else}
        <Icon style="regular" name="circle" />
        {camera.name}
      {/if}
    </Button>
  {/each}
</div>

{#if error}
  <span>{error}</span>
{/if}
