<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import {
    animationStore,
    cameraStore,
    modes,
    modeStore,
    targets,
    targetStore,
    tbaAuthKeyStore,
    teamStore,
  } from "$lib/settings";
  import { tbaAuthKeyIsValid } from "$lib/tba";
  import { onMount } from "svelte";

  const lastSurvey = localStorage.getItem("survey");
  const backLink = lastSurvey ? `survey/${lastSurvey}` : "";

  let modeInput = $state($modeStore);
  let targetInput = $state($targetStore);
  let cameraInput = $state($cameraStore);
  let teamInput = $state($teamStore);
  let tbaAuthKeyInput = $state($tbaAuthKeyStore);
  let animationInput = $state($animationStore);

  let cameras = $state<{ id: string; name: string }[]>([]);
  let noCamera = $state(false);

  let error = $state("");

  let unsavedChanges = $derived.by(() => {
    return (
      modeInput != $modeStore ||
      targetInput != $targetStore ||
      cameraInput != $cameraStore ||
      teamInput.trim() != $teamStore ||
      tbaAuthKeyInput.trim() != $tbaAuthKeyStore ||
      animationInput != $animationStore
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

    $modeStore = modeInput;
    $targetStore = targetInput;
    $cameraStore = cameraInput;
    $teamStore = teamInput;
    $tbaAuthKeyStore = tbaAuthKeyInput;
    $animationStore = animationInput;
  }

  function revert() {
    error = "";

    modeInput = $modeStore;
    targetInput = $targetStore;
    cameraInput = $cameraStore;
    teamInput = $teamStore;
    tbaAuthKeyInput = $tbaAuthKeyStore;
    animationInput = $animationStore;
  }
</script>

<Header title="Settings - MeanScout" heading="Settings" {backLink} />

<div class="flex flex-col gap-6" style="view-transition-name:settings">
  <label class="flex flex-wrap items-center gap-2">
    <Icon name={$modeStore == "admin" ? "lock-open" : "lock"} />
    <div class="flex grow flex-col">
      Mode
      <small>Scout mode limits menus/controls</small>
    </div>
    <select bind:value={modeInput} class="bg-neutral-800 p-2 capitalize text-theme">
      {#each modes as mode}
        <option>{mode}</option>
      {/each}
    </select>
  </label>

  <hr class="border-neutral-500" />

  {#if modeInput == "admin"}
    <label class="flex flex-wrap items-center gap-2">
      <Icon name="bullseye" />
      <div class="flex grow flex-col">
        Target
        <small>Which robot you're scouting</small>
      </div>
      <select bind:value={targetInput} class="bg-neutral-800 p-2 capitalize text-theme">
        {#each targets as target}
          <option>{target}</option>
        {/each}
      </select>
    </label>

    <label class="flex flex-wrap items-center gap-2">
      <Icon name="camera" />
      <div class="flex grow flex-col">
        Camera
        <small>Used to scan QRF codes</small>
      </div>
      {#if cameras.length}
        <select bind:value={cameraInput} class="bg-neutral-800 p-2 capitalize text-theme">
          <option value="">Select</option>
          {#each cameras as { id, name }}
            <option value={id}>{name}</option>
          {/each}
        </select>
      {:else if noCamera}
        <span>No camera</span>
      {:else}
        <div><i class="fa-solid fa-sync fa-spin"></i></div>
      {/if}
    </label>

    <label class="flex flex-wrap items-center gap-2">
      <Icon name="user-group" />
      <div class="flex grow flex-col">
        Your team
        <small>Used w/ TBA data, upcoming match views</small>
      </div>
      <input bind:value={teamInput} class="w-32 bg-neutral-800 p-2 text-theme" />
    </label>

    <label class="flex flex-wrap items-center gap-2">
      <Icon name="key" />
      <div class="flex grow flex-col">
        Auth key
        <small>From TBA</small>
      </div>
      <input bind:value={tbaAuthKeyInput} class="bg-neutral-800 p-2 text-theme" />
    </label>

    <label class="flex flex-wrap items-center gap-2">
      <Icon name="arrows-up-down-left-right" />
      <div class="flex grow flex-col">
        Animations
        <small>They're fancy!</small>
      </div>
      <select bind:value={animationInput} class="bg-neutral-800 p-2 text-theme">
        <option value="none">None</option>
        <option value="full">Full</option>
      </select>
    </label>

    <hr class="border-neutral-500" />
  {/if}

  <div class="flex flex-wrap gap-3">
    <Button onclick={save} disabled={!unsavedChanges}>
      <Icon name="floppy-disk" />
      Save
    </Button>
    <Button onclick={revert} disabled={!unsavedChanges}>
      <Icon name="arrow-rotate-left" />
      Revert
    </Button>
  </div>

  {#if error}
    <span class="text-wrap">Error: {error}</span>
  {/if}
</div>
