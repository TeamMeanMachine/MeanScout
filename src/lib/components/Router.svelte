<script lang="ts">
  import { mount, onMount, unmount } from "svelte";
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

  let {
    idb,
  }: {
    idb: IDBDatabase;
  } = $props();

  let target: HTMLDivElement;
  let currentPage: Record<string, any>;

  onMount(handleHashChange);
  onhashchange = handleHashChange;

  let surveyRecord = $state<any>();
  let entryRecord = $state<any>();

  $effect(() => {
    if (surveyRecord) {
      idb.transaction("surveys", "readwrite").objectStore("surveys").put($state.snapshot(surveyRecord));
    }
  });

  $effect(() => {
    if (entryRecord) {
      idb.transaction("entries", "readwrite").objectStore("entries").put($state.snapshot(entryRecord));
    }
  });

  function handleHashChange() {
    surveyRecord = undefined;
    entryRecord = undefined;

    const hash = location.hash.replace(/#\/?/, "").toLowerCase().trim().split("/");
    const page =
      hash[0] == "" || hash[0] == "settings" || hash[0] == "about" || hash[0] == "survey" || hash[0] == "entry"
        ? hash[0]
        : "";

    if (page == "") {
      getMainPage();
    } else if (page == "settings") {
      clearPage();
      currentPage = mount(SettingsPage, { target });
    } else if (page == "about") {
      clearPage();
      currentPage = mount(AboutPage, { target });
    } else if (page == "survey") {
      const id = Number(hash[1]);
      if (Number.isNaN(id)) return getMainPage();

      const transaction = idb.transaction(["surveys", "entries"]);
      transaction.onabort = () => getMainPage();

      const surveyRequest = transaction.objectStore("surveys").get(id);
      surveyRequest.onsuccess = () => {
        surveyRecord = surveyRequest.result;

        const entriesRequest = transaction.objectStore("entries").index("surveyId").getAll(surveyRecord.id);
        entriesRequest.onsuccess = () => {
          let entryRecords = entriesRequest.result;

          const subpage =
            hash[2] == "" ||
            hash[2] == "entries" ||
            hash[2] == "analysis" ||
            hash[2] == "matches" ||
            hash[2] == "teams" ||
            hash[2] == "fields" ||
            hash[2] == "options"
              ? hash[2]
              : "";

          clearPage();
          if (subpage == "") {
            currentPage = mount(SurveyPage, { target, props: { idb, surveyRecord, entryRecords } });
          } else if (subpage == "entries") {
            currentPage = mount(SurveyEntriesPage, { target, props: { idb, surveyRecord, entryRecords } });
          } else if (subpage == "analysis") {
            currentPage = mount(SurveyAnalysisPage, { target, props: { idb, surveyRecord, entryRecords } });
          } else if (subpage == "matches") {
            currentPage = mount(SurveyMatchesPage, { target, props: { idb, surveyRecord, entryRecords } });
          } else if (subpage == "teams") {
            currentPage = mount(SurveyTeamsPage, { target, props: { idb, surveyRecord, entryRecords } });
          } else if (subpage == "fields") {
            const entryCount = entryRecords.length;
            currentPage = mount(SurveyFieldsPage, { target, props: { idb, surveyRecord, entryCount } });
          } else if (subpage == "options") {
            currentPage = mount(SurveyOptionsPage, { target, props: { idb, surveyRecord } });
          }
        };
      };
    } else if (page == "entry") {
      const id = Number(hash[1]);
      if (Number.isNaN(id)) return getMainPage();

      const transaction = idb.transaction(["entries", "surveys"]);
      transaction.onabort = () => getMainPage();

      const entryRequest = transaction.objectStore("entries").get(id);
      entryRequest.onsuccess = () => {
        entryRecord = entryRequest.result;

        const surveyRequest = transaction.objectStore("surveys").get(entryRecord.surveyId);
        surveyRequest.onsuccess = () => {
          surveyRecord = surveyRequest.result;

          clearPage();
          currentPage = mount(EntryPage, { target, props: { idb, surveyRecord, entryRecord } });
        };
      };
    }
  }

  function getMainPage() {
    const surveysRequest = idb.transaction("surveys").objectStore("surveys").getAll();
    surveysRequest.onerror = () => mountMainPage();
    surveysRequest.onsuccess = () => mountMainPage(surveysRequest.result);
  }

  function mountMainPage(surveyRecords: IDBRecord<Survey>[] = []) {
    clearPage();
    currentPage = mount(MainPage, { target, props: { idb, surveyRecords } });
  }

  function clearPage() {
    currentPage && unmount(currentPage);
    window.scrollTo(0, 0);
  }
</script>

<div bind:this={target}></div>
