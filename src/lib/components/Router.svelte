<script lang="ts">
  import { mount, onMount, unmount } from "svelte";
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

  const idbIdSchema = z.coerce.number().int().positive();
  const pageSchema = z.enum(["", "settings", "about", "survey", "entry"]).default("");
  const surveyPageSchema = z.enum(["", "entries", "analysis", "matches", "teams", "fields", "options"]).default("");

  let target: HTMLDivElement;
  let currentPage: Record<string, any>;

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

    const hash = location.hash.replace(/#\/?/, "").toLowerCase().trim().split("/");

    const { success, data: page } = pageSchema.safeParse(hash[0]);

    if (!success || page == "") {
      getMainPage();
      return;
    }

    if (page == "settings") {
      clearPage();
      currentPage = mount(SettingsPage, { target });
      document.title = "Settings - MeanScout";
      return;
    }

    if (page == "about") {
      clearPage();
      currentPage = mount(AboutPage, { target });
      document.title = "About - MeanScout";
      return;
    }

    if (page == "survey") {
      const { success, data: surveyId } = idbIdSchema.safeParse(hash[1]);
      if (!success) {
        getMainPage();
        return;
      }

      getSurveyPageData(surveyId, (entryRecords) => {
        clearPage();

        const { success, data: surveyPage } = surveyPageSchema.safeParse(hash[2]);

        if (!success || surveyPage == "") {
          currentPage = mount(SurveyPage, { target, props: { surveyRecord, entryRecords } });
          document.title = `${surveyRecord.name} - MeanScout`;
          return;
        }

        if (surveyPage == "entries") {
          currentPage = mount(SurveyEntriesPage, { target, props: { surveyRecord, entryRecords } });
          document.title = `Entries - ${surveyRecord.name} - MeanScout`;
          return;
        }

        if (surveyPage == "analysis") {
          currentPage = mount(SurveyAnalysisPage, { target, props: { surveyRecord, entryRecords } });
          document.title = `Analysis - ${surveyRecord.name} - MeanScout`;
          return;
        }

        if (surveyPage == "matches") {
          currentPage = mount(SurveyMatchesPage, { target, props: { surveyRecord, entryRecords } });
          document.title = `Matches - ${surveyRecord.name} - MeanScout`;
          return;
        }

        if (surveyPage == "teams") {
          currentPage = mount(SurveyTeamsPage, { target, props: { surveyRecord, entryRecords } });
          document.title = `Teams - ${surveyRecord.name} - MeanScout`;
          return;
        }

        if (surveyPage == "fields") {
          const entryCount = entryRecords.length;
          currentPage = mount(SurveyFieldsPage, { target, props: { surveyRecord, entryCount } });
          document.title = `Fields - ${surveyRecord.name} - MeanScout`;
          return;
        }

        if (surveyPage == "options") {
          currentPage = mount(SurveyOptionsPage, { target, props: { surveyRecord } });
          document.title = `Options - ${surveyRecord.name} - MeanScout`;
          return;
        }
      });

      return;
    }

    if (page == "entry") {
      const { success, data: entryId } = idbIdSchema.safeParse(hash[1]);
      if (!success) {
        getMainPage();
        return;
      }

      getEntryPageData(entryId, () => {
        clearPage();
        currentPage = mount(EntryPage, { target, props: { surveyRecord, entryRecord } });
        document.title = `Draft - ${surveyRecord.name} - MeanScout`;
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
    clearPage();
    currentPage = mount(MainPage, { target, props: { surveyRecords } });
    document.title = "MeanScout";
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

  function clearPage() {
    currentPage && unmount(currentPage);
    window.scrollTo(0, 0);
  }
</script>

<div bind:this={target}></div>
