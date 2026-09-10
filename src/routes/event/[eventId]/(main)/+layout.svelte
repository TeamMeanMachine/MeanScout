<script lang="ts">
  import {
    ChartBarBigIcon,
    ListOrderedIcon,
    NotepadTextIcon,
    PodiumIcon,
    UserSearchIcon,
    UsersIcon,
  } from "@lucide/svelte";
  import { page } from "$app/state";
  import type { RouteId } from "$app/types";
  import Anchor from "$lib/components/Anchor.svelte";
  import Header from "$lib/components/Header.svelte";
  import { Dialog } from "$lib/dialog";
  import EventMenuDialog from "$lib/dialogsBeta/EventMenuDialog.svelte";

  let { data, children } = $props();

  const pageTitle = $derived(page.data.title || "");
  const title = $derived(pageTitle ? `${pageTitle} - ${data.event.name}` : data.event.name);

  const routeBase = $derived(`event/${data.event.id}`);

  const linkData = $derived([
    {
      route: routeBase,
      label: "Entries",
      Icon: NotepadTextIcon,
      css: getAnchorLabelClass("/event/[eventId]", { exact: true }),
    },
    {
      route: `${routeBase}/matches`,
      label: "Matches",
      Icon: ListOrderedIcon,
      css: getAnchorLabelClass("/event/[eventId]/(main)/matches"),
    },
    {
      route: `${routeBase}/teams`,
      label: "Teams",
      Icon: UsersIcon,
      css: getAnchorLabelClass("/event/[eventId]/(main)/teams"),
    },
    {
      route: `${routeBase}/stats`,
      label: "Stats",
      Icon: ChartBarBigIcon,
      css: getAnchorLabelClass("/event/[eventId]/(main)/stats"),
    },
    {
      route: `${routeBase}/playoffs`,
      label: "Playoffs",
      Icon: PodiumIcon,
      css: getAnchorLabelClass("/event/[eventId]/(main)/playoffs"),
    },
    {
      route: `${routeBase}/scouts`,
      label: "Scouts",
      Icon: UserSearchIcon,
      css: getAnchorLabelClass("/event/[eventId]/(main)/scouts"),
    },
  ]);

  function getAnchorLabelClass(matching: RouteId, options?: { exact?: boolean | undefined }) {
    const isMatch = options?.exact ? page.route.id == matching : page.route.id?.includes(matching);
    return isMatch ? "font-bold underline" : "font-light";
  }
</script>

<Header
  title="{title} - MeanScout"
  heading={data.event.name}
  onmenupressed={() => Dialog.open(EventMenuDialog, { event: data.event })}
>
  <div class="hidden max-w-(--breakpoint-lg) gap-2 text-sm text-nowrap lg:flex">
    {#each linkData as { route, label, Icon, css }}
      <Anchor {route} class={["justify-center", label != "Home" && "min-w-28"]}>
        <Icon class="text-theme" />
        {#if label != "Home"}
          <span class={css}>{label}</span>
        {/if}
      </Anchor>
    {/each}
  </div>
</Header>

{@render children()}

<div
  class="fixed right-0 bottom-0 left-0 z-20 w-full gap-0 overflow-x-auto border-t border-neutral-600 bg-neutral-800 text-nowrap lg:hidden"
  style="scrollbar-width:none"
>
  <div class="mx-auto flex max-w-2xl gap-0 p-1 text-xs tracking-tighter sm:text-sm sm:tracking-normal">
    {#each linkData as { route, label, Icon, css }}
      <Anchor {route} class="shrink grow basis-0 flex-col gap-1! py-1">
        <Icon class="text-theme" />
        {#if label}
          <span class={css}>{label}</span>
        {/if}
      </Anchor>
    {/each}
  </div>
</div>
