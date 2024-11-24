<script lang="ts">
  import { flushSync, mount, onMount, unmount, type Component } from "svelte";
  import { closeAllDialogs } from "$lib/dialog";
  import { objectStore, transaction } from "$lib/idb";
  import AboutPage from "$lib/pages/AboutPage.svelte";
  import EntryPage from "$lib/pages/EntryPage.svelte";
  import MainPage from "$lib/pages/MainPage.svelte";
  import SettingsPage from "$lib/pages/SettingsPage.svelte";
  import SurveyAnalysisPage from "$lib/pages/SurveyAnalysisPage.svelte";
  import SurveyEntriesPage from "$lib/pages/SurveyEntriesPage.svelte";
  import SurveyFieldsPage from "$lib/pages/SurveyFieldsPage.svelte";
  import SurveyMatchesPage from "$lib/pages/SurveyMatchesPage.svelte";
  import SurveyOptionsPage from "$lib/pages/SurveyOptionsPage.svelte";
  import SurveyPage from "$lib/pages/SurveyPage.svelte";
  import SurveyTeamsPage from "$lib/pages/SurveyTeamsPage.svelte";
  import type { Survey } from "$lib/survey";
  import { z } from "zod";
  import { modeStore, targetStore } from "$lib/settings";
  import Anchor from "./Anchor.svelte";
  import Icon from "./Icon.svelte";
  import type { Heading } from "$lib";

  const idbIdSchema = z.coerce.number().int().positive();
  const pageSchema = z.enum(["", "settings", "about", "survey", "entry"]).default("");
  const surveyPageSchema = z.enum(["", "entries", "analysis", "matches", "teams", "fields", "options"]).default("");

  let target: HTMLDivElement;
  let currentPage: Record<string, any>;
  let backLink = $state<string | undefined>();
  let heading = $state<Heading>("MeanScout");

  let surveyRecord = $state<any>();
  let entryRecord = $state<any>();

  $effect(() => {
    if (surveyRecord) {
      objectStore("surveys", "readwrite").put($state.snapshot(surveyRecord));
    }
  });

  $effect(() => {
    if (entryRecord) {
      objectStore("entries", "readwrite").put($state.snapshot(entryRecord));
    }
  });

  onMount(handleHashChange);
  onhashchange = handleHashChange;

  function handleHashChange() {
    closeAllDialogs();

    surveyRecord = undefined;
    entryRecord = undefined;

    const hashUrl = new URL(location.href.replace("#/", ""));
    const segments = hashUrl.pathname.split("/").slice(1);

    const { success, data: page } = pageSchema.safeParse(segments[0]);

    if (!success || page == "") {
      return getMainPage();
    }

    if (page == "settings") {
      return loadPage(SettingsPage, {
        title: "Settings - MeanScout",
        backLink: "",
        heading: "Settings",
      });
    }

    if (page == "about") {
      return loadPage(AboutPage, {
        title: "About - MeanScout",
        backLink: "",
        heading: "About MeanScout",
      });
    }

    if (page == "survey") {
      const { success, data: surveyId } = idbIdSchema.safeParse(segments[1]);
      if (!success) {
        return getMainPage();
      }

      getSurveyPageData(surveyId, (entryRecords) => {
        const { success, data: surveyPage } = surveyPageSchema.safeParse(segments[2]);

        if (!success || surveyPage == "") {
          return loadPage(SurveyPage, {
            surveyRecord,
            entryRecords,
            title: `${surveyRecord.name} - MeanScout`,
            backLink: "",
            heading: surveyRecord.name,
          });
        }

        if (surveyPage == "entries") {
          return loadPage(SurveyEntriesPage, {
            surveyRecord,
            entryRecords,
            title: `Entries - ${surveyRecord.name} - MeanScout`,
            backLink: `survey/${surveyRecord.id}`,
            heading: [
              { type: "sm", text: surveyRecord.name },
              { type: "h1", text: "Entries" },
            ],
          });
        }

        if (surveyPage == "analysis") {
          return loadPage(SurveyAnalysisPage, {
            surveyRecord,
            entryRecords,
            title: `Analysis - ${surveyRecord.name} - MeanScout`,
            backLink: `survey/${surveyRecord.id}`,
            heading: [
              { type: "sm", text: surveyRecord.name },
              { type: "h1", text: "Analysis" },
            ],
          });
        }

        if (surveyPage == "matches") {
          return loadPage(SurveyMatchesPage, {
            surveyRecord,
            entryRecords,
            title: `Matches - ${surveyRecord.name} - MeanScout`,
            backLink: `survey/${surveyRecord.id}`,
            heading: [
              { type: "sm", text: surveyRecord.name },
              { type: "h1", text: "Matches" },
            ],
          });
        }

        if (surveyPage == "teams") {
          return loadPage(SurveyTeamsPage, {
            surveyRecord,
            entryRecords,
            title: `Teams - ${surveyRecord.name} - MeanScout`,
            backLink: `survey/${surveyRecord.id}`,
            heading: [
              { type: "sm", text: surveyRecord.name },
              { type: "h1", text: "Teams" },
            ],
          });
        }

        if (surveyPage == "fields") {
          const entryCount = entryRecords.length;
          return loadPage(SurveyFieldsPage, {
            surveyRecord,
            entryCount,
            title: `Fields - ${surveyRecord.name} - MeanScout`,
            backLink: `survey/${surveyRecord.id}`,
            heading: [
              { type: "sm", text: surveyRecord.name },
              { type: "h1", text: "Fields" },
            ],
          });
        }

        if (surveyPage == "options") {
          return loadPage(SurveyOptionsPage, {
            surveyRecord,
            title: `Options - ${surveyRecord.name} - MeanScout`,
            backLink: `survey/${surveyRecord.id}`,
            heading: [
              { type: "sm", text: surveyRecord.name },
              { type: "h1", text: "Options" },
            ],
          });
        }
      });

      return;
    }

    if (page == "entry") {
      const { success, data: entryId } = idbIdSchema.safeParse(segments[1]);
      if (!success) {
        return getMainPage();
      }

      getEntryPageData(entryId, () => {
        loadPage(EntryPage, {
          surveyRecord,
          entryRecord,
          title: `Draft - ${surveyRecord.name} - MeanScout`,
          backLink: `survey/${surveyRecord.id}`,
          heading: [
            { type: "sm", text: surveyRecord.name },
            { type: "h1", text: "Draft" },
          ],
        });
      });

      return;
    }
  }

  function getMainPage() {
    const surveysRequest = objectStore("surveys").getAll();
    surveysRequest.onerror = () => mountMainPage();
    surveysRequest.onsuccess = () => mountMainPage(surveysRequest.result);
  }

  function mountMainPage(surveyRecords: IDBRecord<Survey>[] = []) {
    loadPage(MainPage, {
      surveyRecords,
      title: "MeanScout",
    });
  }

  function getSurveyPageData(surveyId: number, onsuccess: (entryRecords: any[]) => void) {
    const surveyTransaction = transaction(["surveys", "entries"]);
    surveyTransaction.onabort = () => getMainPage();
    const surveyRequest = surveyTransaction.objectStore("surveys").get(surveyId);
    surveyRequest.onsuccess = () => {
      surveyRecord = surveyRequest.result;
      const entriesRequest = surveyTransaction.objectStore("entries").index("surveyId").getAll(surveyRecord.id);
      entriesRequest.onsuccess = () => onsuccess(entriesRequest.result);
    };
  }

  function getEntryPageData(entryId: number, onsuccess: () => void) {
    const entryTransaction = transaction(["entries", "surveys"]);
    entryTransaction.onabort = () => getMainPage();
    const entryRequest = entryTransaction.objectStore("entries").get(entryId);
    entryRequest.onsuccess = () => {
      entryRecord = entryRequest.result;
      const surveyRequest = entryTransaction.objectStore("surveys").get(entryRecord.surveyId);
      surveyRequest.onsuccess = () => {
        surveyRecord = surveyRequest.result;
        onsuccess();
      };
    };
  }

  function loadPage<Props extends Record<string, any>>(
    page: Component<Props>,
    props: Props & { title: string; backLink?: string; heading?: Heading },
  ) {
    if (currentPage) {
      unmount(currentPage);
      window.scrollTo(0, 0);
    }

    document.title = props.title;
    backLink = props.backLink;
    heading = props.heading ?? "MeanScout";

    delete (props as any).title;
    delete (props as any).backLink;
    delete (props as any).heading;

    currentPage = mount(page, { target, props });
    flushSync();
  }
</script>

<header class="flex min-h-11 items-center gap-3">
  {#if backLink === undefined}
    <img src="./logo.svg" alt="" width="25" height="25" />
  {:else}
    <Anchor route={backLink}>
      <Icon name="arrow-left" />
    </Anchor>
  {/if}

  <div class="flex grow flex-col">
    {#if typeof heading == "string"}
      <h1 class="font-bold">{heading}</h1>
    {:else}
      {#each heading as { type, text }}
        {#if type == "h1"}
          <h1 class="font-bold">{text}</h1>
        {:else if type == "sm"}
          <small>{text}</small>
        {/if}
      {/each}
    {/if}
  </div>

  <div class="flex flex-col text-right">
    {#if $modeStore == "admin"}
      <small>Admin</small>
    {/if}
    <small class="font-bold capitalize text-theme">{$targetStore}</small>
  </div>
</header>

<div bind:this={target} class="flex flex-col gap-6"></div>
