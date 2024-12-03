<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { cameraStore, modes, modeStore, targets, targetStore, tbaAuthKeyStore, teamStore } from "$lib/settings";
  import { tbaAuthKeyIsValid } from "$lib/tba";

  let modeInput = $state($modeStore);
  let targetInput = $state($targetStore);
  let cameraInput = $state($cameraStore);
  let teamInput = $state($teamStore);
  let tbaAuthKeyInput = $state($tbaAuthKeyStore);

  let cameras = $state<{ id: string; name: string }[]>([]);

  let error = $state("");

  let unsavedChanges = $derived.by(() => {
    return (
      modeInput != $modeStore ||
      targetInput != $targetStore ||
      cameraInput != $cameraStore ||
      teamInput.trim() != $teamStore ||
      tbaAuthKeyInput.trim() != $tbaAuthKeyStore
    );
  });

  navigator.mediaDevices
    .enumerateDevices()
    .then((devices) => {
      cameras = devices
        .filter((device) => device.kind == "videoinput" && device.label.trim())
        .map((device) => ({ id: device.deviceId, name: device.label.trim() }))
        .toSorted((a, b) => a.name.localeCompare(b.name, "en"));
    })
    .catch(() => (error = "Could not get cameras"));

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
  }

  function revert() {
    error = "";

    modeInput = $modeStore;
    targetInput = $targetStore;
    cameraInput = $cameraStore;
    teamInput = $teamStore;
    tbaAuthKeyInput = $tbaAuthKeyStore;
  }
</script>

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
      <small>Used to scan QR codes</small>
    </div>
    {#if cameras.length}
      <select bind:value={cameraInput} class="bg-neutral-800 p-2 capitalize text-theme">
        <option value="">Default</option>
        {#each cameras as { id, name }}
          <option value={id}>{name}</option>
        {/each}
      </select>
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
