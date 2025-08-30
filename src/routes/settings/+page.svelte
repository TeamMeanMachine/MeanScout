<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import { cameraStore, targets, targetStore, tbaAuthKeyStore, teamStore } from "$lib/settings";
  import { tbaAuthKeyIsValid } from "$lib/tba";
  import { CameraIcon, CrosshairIcon, KeyIcon, LoaderIcon, SaveIcon, Undo2Icon, UsersIcon } from "@lucide/svelte";
  import { onMount } from "svelte";

  const backLink = localStorage.getItem("home") || "";

  let targetInput = $state($targetStore);
  let cameraInput = $state($cameraStore);
  let teamInput = $state($teamStore);
  let tbaAuthKeyInput = $state($tbaAuthKeyStore);

  let cameras = $state<{ id: string; name: string }[]>([]);
  let noCamera = $state(false);

  let error = $state("");

  let unsavedChanges = $derived.by(() => {
    return (
      targetInput != $targetStore ||
      cameraInput != $cameraStore ||
      teamInput.trim() != $teamStore ||
      tbaAuthKeyInput.trim() != $tbaAuthKeyStore
    );
  });

  onMount(() => localStorage.setItem("init", "init"));

  requestCameras().catch(() => (noCamera = true));

  async function requestCameras() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    stream.getTracks().forEach((track) => track.stop());

    const devices = await navigator.mediaDevices.enumerateDevices();

    cameras = devices
      .filter((device) => device.kind == "videoinput" && device.label.trim())
      .map((device) => ({ id: device.deviceId, name: device.label.trim() }))
      .toSorted((a, b) => a.name.localeCompare(b.name, "en"));

    if (cameras.length == 0) {
      throw new Error("No camera");
    }
  }

  async function save() {
    error = "";

    teamInput = teamInput.trim();
    if (teamInput && !/^\d{1,5}[A-Z]?$/.test(teamInput)) {
      error = "Invalid team";
      return;
    }

    tbaAuthKeyInput = tbaAuthKeyInput.trim();
    if (tbaAuthKeyInput != $tbaAuthKeyStore) {
      if (tbaAuthKeyInput && !(await tbaAuthKeyIsValid(tbaAuthKeyInput))) {
        error = "Bad auth key";
        return;
      }
    }

    $targetStore = targetInput;
    $cameraStore = cameraInput;
    $teamStore = teamInput;
    $tbaAuthKeyStore = tbaAuthKeyInput;
  }

  function revert() {
    error = "";

    targetInput = $targetStore;
    cameraInput = $cameraStore;
    teamInput = $teamStore;
    tbaAuthKeyInput = $tbaAuthKeyStore;
  }
</script>

<Header title="Settings - MeanScout" heading="Settings" {backLink} />

<div class="flex flex-col gap-6">
  <hr class="border-neutral-500" />

  <label class="flex flex-wrap items-center gap-2">
    <CrosshairIcon class="text-theme" />
    <div class="flex grow flex-col">
      Target
      <span class="text-xs font-light">Which robot you're scouting</span>
    </div>
    <select bind:value={targetInput} class="text-theme bg-neutral-800 p-2 capitalize">
      {#each targets as target}
        <option>{target}</option>
      {/each}
    </select>
  </label>

  <label class="flex flex-wrap items-center gap-2">
    <CameraIcon class="text-theme" />
    <div class="flex grow flex-col">
      Camera
      <span class="text-xs font-light">Used to scan QRF codes</span>
    </div>
    {#if cameras.length}
      <select bind:value={cameraInput} class="text-theme bg-neutral-800 p-2 capitalize">
        <option value="">Select</option>
        {#each cameras as { id, name }}
          <option value={id}>{name}</option>
        {/each}
      </select>
    {:else if noCamera}
      <span class="text-sm font-light">No camera</span>
    {:else}
      <LoaderIcon class="text-theme animate-spin" />
    {/if}
  </label>

  <label class="flex flex-wrap items-center gap-2">
    <UsersIcon class="text-theme" />
    <div class="flex grow flex-col">
      Your team
      <span class="text-xs font-light">Used w/ TBA data, upcoming match views</span>
    </div>
    <input bind:value={teamInput} class="text-theme w-32 bg-neutral-800 p-2" />
  </label>

  <label class="flex flex-wrap items-center gap-2">
    <KeyIcon class="text-theme" />
    <div class="flex grow flex-col">
      Custom TBA auth key
      <span class="text-xs font-light">You may want to use your own</span>
    </div>
    <input bind:value={tbaAuthKeyInput} class="text-theme bg-neutral-800 p-2" />
  </label>

  <hr class="border-neutral-500" />

  <div class="flex flex-wrap gap-3">
    <Button onclick={save} disabled={!unsavedChanges}>
      <SaveIcon class="text-theme" />
      Save
    </Button>
    <Button onclick={revert} disabled={!unsavedChanges}>
      <Undo2Icon class="text-theme" />
      Revert
    </Button>
  </div>

  {#if error}
    <span class="text-wrap">Error: {error}</span>
  {/if}
</div>
