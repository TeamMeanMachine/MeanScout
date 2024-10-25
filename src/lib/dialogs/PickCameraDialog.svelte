<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { cameraStore } from "$lib/settings";

  let dialog: ReturnType<typeof Dialog>;

  let cameras = $state<{ id: string; name: string }[] | undefined>();
  let error = $state("");

  function open() {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        cameras = devices
          .filter((device) => device.kind == "videoinput")
          .map((device, index) => ({ id: device.deviceId, name: device.label.trim() || `camera ${index + 1}` }))
          .toSorted((a, b) => a.name.localeCompare(b.name, "en"));
      })
      .catch((e) => (error = e.toString()))
      .finally(() => dialog.open());
  }

  function onclose() {
    cameras = undefined;
    error = "";
  }
</script>

<Button onclick={open}>
  <Icon name="camera" />
  Pick camera
</Button>

<Dialog bind:this={dialog} {onclose}>
  <span>Pick camera</span>

  {#if cameras}
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
  {/if}

  {#if error}
    <span>{error}</span>
  {/if}
</Dialog>
