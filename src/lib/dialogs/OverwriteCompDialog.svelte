<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { schemaVersion, sessionStorageStore, type Match, type Team } from "$lib";
  import { type Comp } from "$lib/comp";
  import Button from "$lib/components/Button.svelte";
  import QRCodeReader from "$lib/components/QRCodeReader.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { idb } from "$lib/idb";
  import { cameraStore } from "$lib/settings";
  import { Undo2Icon } from "@lucide/svelte";

  let {
    compRecord,
  }: {
    compRecord: Comp;
  } = $props();

  const tab = sessionStorageStore<"qrfcode" | "file">("import-data-tab", $cameraStore ? "qrfcode" : "file");

  let files = $state<FileList | undefined>();
  let importedComp = $state<Comp | undefined>();

  let changes = $state<{
    name: boolean;
    tbaEventKey: boolean;
    matches: boolean;
    matchesEdited: number;
    teams: boolean;
    teamsEdited: number;
    scouts: boolean;
  }>({
    name: false,
    tbaEventKey: false,
    matches: false,
    matchesEdited: 0,
    teams: false,
    teamsEdited: 0,
    scouts: false,
  });

  let error = $state("");

  export const { onconfirm }: DialogExports = {
    async onconfirm() {
      if (error || !importedComp) {
        return;
      }

      const request = idb.put("comps", { ...$state.snapshot(importedComp), modified: new Date() });

      request.onerror = () => {
        error = "Could not overwrite comp";
      };

      request.onsuccess = () => {
        invalidateAll();
        closeDialog();
      };
    },
  };

  async function onchange() {
    if (!files?.length) {
      return;
    }

    onread(await files[0].text());
  }

  function onread(data: string) {
    retry();

    let json: {
      version: number;
      comps?: Comp[];
    };

    try {
      json = JSON.parse(data);
    } catch (e) {
      console.error("JSON failed to parse imported data:", data);
      error = "JSON failed to parse";
      return;
    }

    if (json.version < schemaVersion) {
      error = "Outdated version";
      return;
    } else if (json.version > schemaVersion) {
      error = "Unsupported version";
      return;
    }

    const jsonComp = json.comps?.find((c) => c.id == compRecord.id);

    if (!jsonComp) {
      error = "No matching comp found";
      return;
    }

    if (jsonComp.name != compRecord.name) {
      changes.name = true;
    }

    if (jsonComp.tbaEventKey != compRecord.tbaEventKey) {
      changes.tbaEventKey = true;
    }

    const matches = new Map<number, Match>();

    for (const match of compRecord.matches) {
      matches.set(match.number, match);
    }

    for (const importedMatch of jsonComp.matches) {
      const existingMatch = matches.get(importedMatch.number);

      if (existingMatch) {
        if (
          importedMatch.red1 != existingMatch.red1 ||
          importedMatch.red2 != existingMatch.red2 ||
          importedMatch.red3 != existingMatch.red3 ||
          importedMatch.blue1 != existingMatch.blue1 ||
          importedMatch.blue2 != existingMatch.blue2 ||
          importedMatch.blue3 != existingMatch.blue3 ||
          (importedMatch.redScore !== undefined && importedMatch.redScore != existingMatch.redScore) ||
          (importedMatch.blueScore !== undefined && importedMatch.blueScore != existingMatch.blueScore)
        ) {
          existingMatch.red1 = importedMatch.red1;
          existingMatch.red2 = importedMatch.red2;
          existingMatch.red3 = importedMatch.red3;
          existingMatch.blue1 = importedMatch.blue1;
          existingMatch.blue2 = importedMatch.blue2;
          existingMatch.blue3 = importedMatch.blue3;

          if (importedMatch.redScore !== undefined) {
            existingMatch.redScore = importedMatch.redScore;
          }

          if (importedMatch.blueScore !== undefined) {
            existingMatch.blueScore = importedMatch.blueScore;
          }

          changes.matches = true;
          changes.matchesEdited++;
          matches.set(importedMatch.number, existingMatch);
        }
      } else {
        changes.matches = true;
        matches.set(importedMatch.number, importedMatch);
      }
    }

    const teams = new Map<string, Team>();

    for (const team of compRecord.teams) {
      teams.set(team.number, team);
    }

    for (const importedTeam of jsonComp.teams) {
      const existingTeam = teams.get(importedTeam.number);

      if (existingTeam) {
        if (importedTeam.name != existingTeam.name) {
          changes.teams = true;
          changes.teamsEdited++;
          existingTeam.name = importedTeam.name;
          teams.set(importedTeam.number, existingTeam);
        }
      } else {
        changes.teams = true;
        teams.set(importedTeam.number, importedTeam);
      }
    }

    const comp: Comp = {
      id: compRecord.id,
      name: jsonComp.name,
      matches: matches
        .values()
        .toArray()
        .toSorted((a, b) => a.number - b.number),
      teams: teams
        .values()
        .toArray()
        .toSorted((a, b) => a.number.localeCompare(b.number, "en", { numeric: true })),
      created: compRecord.created,
      modified: compRecord.modified,
    };

    if (jsonComp.tbaEventKey || compRecord.tbaEventKey) {
      if (jsonComp.tbaEventKey != compRecord.tbaEventKey) {
        changes.tbaEventKey = true;
      }

      comp.tbaEventKey = jsonComp.tbaEventKey || compRecord.tbaEventKey;
    }

    const scouts = new Set<string>();

    for (const scout of compRecord.scouts || []) {
      scouts.add(scout);
    }

    for (const scout of jsonComp.scouts || []) {
      if (!scouts.has(scout)) {
        changes.scouts = true;
      }

      scouts.add(scout);
    }

    if (scouts.size) {
      comp.scouts = scouts
        .values()
        .toArray()
        .toSorted((a, b) => a.localeCompare(b));
    }

    if (
      changes.name ||
      changes.tbaEventKey ||
      changes.matches ||
      changes.matchesEdited ||
      changes.teams ||
      changes.teamsEdited ||
      changes.scouts
    ) {
      importedComp = comp;
    } else {
      error = "No changes found";
    }
  }

  function retry() {
    error = "";
    importedComp = undefined;
    changes = {
      name: false,
      tbaEventKey: false,
      matches: false,
      matchesEdited: 0,
      teams: false,
      teamsEdited: 0,
      scouts: false,
    };
  }
</script>

<span>Overwrite "{compRecord.name}"</span>

{#if $cameraStore}
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "qrfcode")} class={$tab == "qrfcode" ? "font-bold" : "font-light"}>QRF code</Button>
    <Button onclick={() => ($tab = "file")} class={$tab == "file" ? "font-bold" : "font-light"}>File</Button>
  </div>
{/if}

{#if $tab == "qrfcode" && $cameraStore}
  {#if importedComp}
    <Button onclick={retry}>
      <Undo2Icon class="text-theme" />
      Retry
    </Button>
  {:else}
    <QRCodeReader {onread} />
  {/if}
{:else}
  <input
    type="file"
    accept=".json,.txt"
    bind:files
    {onchange}
    class="file:text-theme file:mr-3 file:border-none file:bg-neutral-800 file:p-2"
  />
{/if}

{#if importedComp}
  <div class="grid grid-cols-3 gap-1">
    <div class="text-sm font-light">Data</div>
    <div class="text-sm font-light">Existing</div>
    <div class="text-sm font-light">Imported</div>

    {#if changes.name}
      <div>Name</div>
      <div>{compRecord.name}</div>
      <div>{importedComp.name}</div>
    {/if}

    {#if changes.tbaEventKey}
      <div>TBA Event Key</div>
      <div>{compRecord.tbaEventKey || "-"}</div>
      <div>{importedComp.tbaEventKey || "-"}</div>
    {/if}

    {#if changes.matches}
      <div>Matches</div>
      <div>{compRecord.matches.length || "-"}</div>
      <div>
        {importedComp.matches.length || "-"}
        {#if changes.matchesEdited}
          ({changes.matchesEdited} edited)
        {/if}
      </div>
    {/if}

    {#if changes.teams}
      <div>Teams</div>
      <div>{compRecord.teams.length || "-"}</div>
      <div>
        {importedComp.teams.length || "-"}
        {#if changes.teamsEdited}
          ({changes.teamsEdited} edited)
        {/if}
      </div>
    {/if}

    {#if importedComp.scouts?.length != compRecord.scouts?.length}
      <div>Scouts</div>
      <div>{compRecord.scouts?.length || "-"}</div>
      <div>{importedComp.scouts?.length || "-"}</div>
    {/if}
  </div>
{/if}

{#if error}
  <span>{error}</span>
{/if}
