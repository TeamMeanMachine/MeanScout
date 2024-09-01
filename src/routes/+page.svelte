<script lang="ts">
  import { persistStorage } from "$lib";
  import Header from "$lib/components/Header.svelte";
  import { migrateIDB } from "$lib/migrate";
  import type { ComponentProps } from "svelte";
  import "../app.css";
  import AboutPage from "./about/AboutPage.svelte";
  import EntryPage from "./entry/EntryPage.svelte";
  import MainPage from "./main/MainPage.svelte";
  import SettingsPage from "./settings/SettingsPage.svelte";
  import SurveyPage from "./survey/SurveyPage.svelte";
  import SurveyAnalysisPage from "./survey/analysis/SurveyAnalysisPage.svelte";
  import SurveyEntriesPage from "./survey/entries/SurveyEntriesPage.svelte";
  import SurveyFieldsPage from "./survey/fields/SurveyFieldsPage.svelte";
  import SurveyMatchesPage from "./survey/matches/SurveyMatchesPage.svelte";
  import SurveyOptionsPage from "./survey/options/SurveyOptionsPage.svelte";
  import SurveyTeamsPage from "./survey/teams/SurveyTeamsPage.svelte";

  let idbError = $state("");
  let idb: IDBDatabase;

  type CurrentPage =
    | undefined
    | { page: ""; props: ComponentProps<MainPage> }
    | { page: "settings"; props: ComponentProps<SettingsPage> }
    | { page: "about"; props: ComponentProps<AboutPage> }
    | { page: "survey"; subpage: ""; props: ComponentProps<SurveyPage> }
    | { page: "survey"; subpage: "entries"; props: ComponentProps<SurveyEntriesPage> }
    | { page: "survey"; subpage: "analysis"; props: ComponentProps<SurveyAnalysisPage> }
    | { page: "survey"; subpage: "fields"; props: ComponentProps<SurveyFieldsPage> }
    | { page: "survey"; subpage: "matches"; props: ComponentProps<SurveyMatchesPage> }
    | { page: "survey"; subpage: "teams"; props: ComponentProps<SurveyTeamsPage> }
    | { page: "survey"; subpage: "options"; props: ComponentProps<SurveyOptionsPage> }
    | { page: "entry"; props: ComponentProps<EntryPage> };

  let current = $state<CurrentPage>();

  $effect(() => {
    if (current?.page == "survey" || current?.page == "entry") {
      idb.transaction("surveys", "readwrite").objectStore("surveys").put($state.snapshot(current.props.surveyRecord));
    }
  });

  $effect(() => {
    if (current?.page == "entry") {
      idb.transaction("entries", "readwrite").objectStore("entries").put($state.snapshot(current.props.entryRecord));
    }
  });

  function setMainPage() {
    const surveysRequest = idb.transaction("surveys").objectStore("surveys").getAll();

    surveysRequest.onerror = () => {
      current = {
        page: "",
        props: { idb, surveyRecords: [] },
      };
    };

    surveysRequest.onsuccess = () => {
      const surveyRecords = surveysRequest.result ?? [];
      current = {
        page: "",
        props: { idb, surveyRecords },
      };
    };
  }

  function setSettingsPage() {
    current = {
      page: "settings",
      props: {},
    };
  }

  function setAboutPage() {
    current = {
      page: "about",
      props: {},
    };
  }

  function setSurveyPage(
    id: number,
    subpage: "" | "entries" | "analysis" | "fields" | "matches" | "teams" | "options",
  ) {
    const surveyRequest = idb.transaction("surveys").objectStore("surveys").get(id);
    surveyRequest.onerror = () => setMainPage();

    surveyRequest.onsuccess = () => {
      const surveyRecord = surveyRequest.result;
      if (!surveyRecord) return setMainPage();

      if (subpage == "" || subpage == "entries" || subpage == "analysis" || subpage == "matches") {
        const entriesRequest = idb
          .transaction("entries")
          .objectStore("entries")
          .index("surveyId")
          .getAll(surveyRecord.id);

        entriesRequest.onerror = () => {
          current = {
            page: "survey",
            subpage,
            props: { idb, surveyRecord, entryRecords: [] },
          };
        };

        entriesRequest.onsuccess = () => {
          const entryRecords = entriesRequest.result ?? [];
          current = {
            page: "survey",
            subpage,
            props: { idb, surveyRecord, entryRecords },
          };
        };
      } else if (subpage == "fields") {
        const entryCountRequest = idb
          .transaction("entries")
          .objectStore("entries")
          .index("surveyId")
          .count(surveyRecord.id);

        entryCountRequest.onerror = () => {
          current = {
            page: "survey",
            subpage,
            props: { idb, surveyRecord, entryCount: 0 },
          };
        };

        entryCountRequest.onsuccess = () => {
          current = {
            page: "survey",
            subpage,
            props: { idb, surveyRecord, entryCount: entryCountRequest.result },
          };
        };
      } else {
        current = {
          page: "survey",
          subpage,
          props: { idb, surveyRecord },
        };
      }
    };
  }

  function setEntryPage(id: number) {
    const getTransaction = idb.transaction(["surveys", "entries"]);
    getTransaction.onerror = () => setMainPage();

    const surveyStore = getTransaction.objectStore("surveys");
    const entryStore = getTransaction.objectStore("entries");

    const entryRequest = entryStore.get(id);
    entryRequest.onerror = () => setMainPage();

    entryRequest.onsuccess = () => {
      const entryRecord = entryRequest.result;
      if (!entryRecord) return setMainPage();

      const surveyRequest = surveyStore.get(entryRecord.surveyId);
      surveyRequest.onerror = () => setMainPage();

      surveyRequest.onsuccess = () => {
        const surveyRecord = surveyRequest.result;
        if (!surveyRecord) return setMainPage();

        current = {
          page: "entry",
          props: { idb, surveyRecord, entryRecord },
        };
      };
    };
  }

  function handleHashChange() {
    const hash = location.hash.replace(/#\/?/, "").toLowerCase().trim().split("/");
    const page =
      hash[0] == "" || hash[0] == "settings" || hash[0] == "about" || hash[0] == "survey" || hash[0] == "entry"
        ? hash[0]
        : "";

    if (page == "") {
      setMainPage();
    } else if (page == "settings") {
      setSettingsPage();
    } else if (page == "about") {
      setAboutPage();
    } else if (page == "survey") {
      const subpage =
        hash[2] == "" ||
        hash[2] == "entries" ||
        hash[2] == "analysis" ||
        hash[2] == "fields" ||
        hash[2] == "matches" ||
        hash[2] == "teams" ||
        hash[2] == "options"
          ? hash[2]
          : "";
      const id = Number(hash[1]);
      if (Number.isNaN(id)) return setMainPage();
      setSurveyPage(id, subpage);
    } else if (page == "entry") {
      const id = Number(hash[1]);
      if (Number.isNaN(id)) return setMainPage();
      setEntryPage(id);
    }
  }

  function openIDB() {
    const latestVersion = 8;

    const request = indexedDB.open("MeanScout", latestVersion);
    request.onerror = () => (idbError = `${request.error?.message}`);
    request.onupgradeneeded = (e) => migrateIDB(request, e.oldVersion, latestVersion);

    request.onsuccess = () => {
      if (!request.result) {
        idbError = "Could not open IDB";
        return;
      }

      idb = request.result;
      handleHashChange();
      onhashchange = handleHashChange;
    };
  }

  persistStorage();
  openIDB();
</script>

{#if idbError}
  <Header />
  <div class="flex flex-col gap-3 p-3">
    <h2>Error</h2>
    <p>
      MeanScout was unable to access IndexedDB. Double check that your device/browser supports it, and that you haven't
      removed the permission to access it.
    </p>
    <p>Error: {idbError}</p>
  </div>
{:else if current?.page == ""}
  <MainPage {...current.props} />
{:else if current?.page == "settings"}
  <SettingsPage {...current.props} />
{:else if current?.page == "about"}
  <AboutPage {...current.props} />
{:else if current?.page == "survey"}
  {#if current.subpage == ""}
    <SurveyPage {...current.props} />
  {:else if current.subpage == "entries"}
    <SurveyEntriesPage {...current.props} />
  {:else if current.subpage == "analysis"}
    <SurveyAnalysisPage {...current.props} />
  {:else if current.subpage == "fields"}
    <SurveyFieldsPage {...current.props} />
  {:else if current.subpage == "matches"}
    <SurveyMatchesPage {...current.props} />
  {:else if current.subpage == "teams"}
    <SurveyTeamsPage {...current.props} />
  {:else if current.subpage == "options"}
    <SurveyOptionsPage {...current.props} />
  {/if}
{:else if current?.page == "entry"}
  <EntryPage {...current.props} />
{/if}
