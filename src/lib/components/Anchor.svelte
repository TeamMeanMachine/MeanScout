<script lang="ts" generics="T extends RouteId = RouteId">
  import { resolve } from "$app/paths";
  import type { RouteId, RouteParams } from "$app/types";
  import type { HTMLAnchorAttributes } from "svelte/elements";

  type RouteWithParams = {
    [T in RouteId]: RouteParams<T> extends Record<string, never>
      ? { to: T; params?: undefined }
      : { to: T; params: RouteParams<T> };
  };

  let {
    href: hrefOverride,
    to = undefined,
    params = undefined,
    route = "",
    class: classes,
    children,
    ...args
  }: {
    route?: string;
  } & (RouteWithParams[T] | { to?: undefined; params?: undefined }) &
    HTMLAnchorAttributes = $props();

  const href = $derived.by(() => {
    if (hrefOverride) return hrefOverride;
    if (to) return resolve(to as any, params);
    return `/#/${route.replace("#/", "")}`;
  });
</script>

<a {href} class={["flex items-center gap-2 bg-neutral-800 p-2", classes]} {...args}>
  {@render children?.()}
</a>
