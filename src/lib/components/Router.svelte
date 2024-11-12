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
      return getMainPage();
    }

    if (page == "settings") {
      return loadPage(SettingsPage, {
        title: "Settings - MeanScout",
      });
    }

    if (page == "about") {
      return loadPage(AboutPage, {
        title: "About - MeanScout",
      });
    }

    if (page == "survey") {
      const { success, data: surveyId } = idbIdSchema.safeParse(hash[1]);
      if (!success) {
        return getMainPage();
      }

      getSurveyPageData(surveyId, (entryRecords) => {
        const { success, data: surveyPage } = surveyPageSchema.safeParse(hash[2]);

        if (!success || surveyPage == "") {
          return loadPage(SurveyPage, {
            surveyRecord,
            entryRecords,
            title: `${surveyRecord.name} - MeanScout`,
          });
        }

        if (surveyPage == "entries") {
          return loadPage(SurveyEntriesPage, {
            surveyRecord,
            entryRecords,
            title: `Entries - ${surveyRecord.name} - MeanScout`,
          });
        }

        if (surveyPage == "analysis") {
          return loadPage(SurveyAnalysisPage, {
            surveyRecord,
            entryRecords,
            title: `Analysis - ${surveyRecord.name} - MeanScout`,
          });
        }

        if (surveyPage == "matches") {
          return loadPage(SurveyMatchesPage, {
            surveyRecord,
            entryRecords,
            title: `Matches - ${surveyRecord.name} - MeanScout`,
          });
        }

        if (surveyPage == "teams") {
          return loadPage(SurveyTeamsPage, {
            surveyRecord,
            entryRecords,
            title: `Teams - ${surveyRecord.name} - MeanScout`,
          });
        }

        if (surveyPage == "fields") {
          const entryCount = entryRecords.length;
          return loadPage(SurveyFieldsPage, {
            surveyRecord,
            entryCount,
            title: `Fields - ${surveyRecord.name} - MeanScout`,
          });
        }

        if (surveyPage == "options") {
          return loadPage(SurveyOptionsPage, {
            surveyRecord,
            title: `Options - ${surveyRecord.name} - MeanScout`,
          });
        }
      });

      return;
    }

    if (page == "entry") {
      const { success, data: entryId } = idbIdSchema.safeParse(hash[1]);
      if (!success) {
        return getMainPage();
      }

      getEntryPageData(entryId, () => {
        loadPage(EntryPage, {
          surveyRecord,
          entryRecord,
          title: `Draft - ${surveyRecord.name} - MeanScout`,
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

  function loadPage<Props extends Record<string, any>>(page: Component<Props>, props: Props & { title: string }) {
    if (currentPage) {
      unmount(currentPage);
      window.scrollTo(0, 0);
    }

    document.title = props.title;
    delete (props as any).title;
    currentPage = mount(page, { target, props });
    flushSync();
  }
</script>

<div bind:this={target}></div>
