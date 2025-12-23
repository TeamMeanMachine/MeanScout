<script lang="ts">
  import { page } from "$app/state";
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";
  import { openDialog } from "$lib/dialog";
  import CompMenuDialog from "$lib/dialogs/CompMenuDialog.svelte";
  import { ChartBarBigIcon, ListOrderedIcon, NotepadTextIcon, UserSearchIcon, UsersIcon } from "@lucide/svelte";

  let { data, children } = $props();

  const pageTitle = $derived(page.data.title || "");
  const title = $derived(pageTitle ? `${pageTitle} - ${data.compRecord.name}` : `${data.compRecord.name}`);

  const routeBase = $derived(`comp/${data.compRecord.id}`);

  const linkData = $derived([
    {
      route: routeBase,
      label: "Entries",
      Icon: NotepadTextIcon,
      css: getAnchorLabelClass("entries"),
    },
    {
      route: `${routeBase}/matches`,
      label: "Matches",
      Icon: ListOrderedIcon,
      css: getAnchorLabelClass("matches"),
    },
    {
      route: `${routeBase}/teams`,
      label: "Teams",
      Icon: UsersIcon,
      css: getAnchorLabelClass("teams"),
    },
    {
      route: `${routeBase}/ranks`,
      label: "Ranks",
      Icon: ChartBarBigIcon,
      css: getAnchorLabelClass("ranks"),
    },
    {
      route: `${routeBase}/scouts`,
      label: "Scouts",
      Icon: UserSearchIcon,
      css: getAnchorLabelClass("scouts"),
    },
  ]);

  function getAnchorLabelClass(matching: string) {
    return pageTitle.toLowerCase() == matching ? "font-bold underline" : "font-light";
  }
</script>

<Header
  title="{title} - MeanScout"
  heading={data.compRecord.name}
  onmenupressed={() => {
    openDialog(CompMenuDialog, { pageData: data });
  }}
>
  <div class="hidden max-w-(--breakpoint-lg) gap-2 text-sm text-nowrap lg:flex">
    {#each linkData as { route, label, Icon, css }}
      <Anchor {route} class="min-w-28 justify-center">
        <Icon class="text-theme" />
        <span class={css}>{label}</span>
      </Anchor>
    {/each}
  </div>
</Header>

{@render children()}

<div
  class="fixed bottom-0 left-0 right-0 z-20 w-full gap-0 overflow-x-auto border-t border-neutral-600 bg-neutral-800 text-nowrap lg:hidden"
  style="scrollbar-width:none"
>
  <div class="mx-auto flex max-w-lg gap-0 p-1 text-xs md:text-sm">
    {#each linkData as { route, label, Icon, css }}
      <Anchor {route} class="min-w-16 shrink grow basis-0 flex-col gap-1! py-1">
        <Icon class="text-theme" />
        <span class={css}>{label}</span>
      </Anchor>
    {/each}
  </div>
</div>
