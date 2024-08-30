<script lang="ts">
  let {
    style = "solid",
    name,
  }: {
    style?: string;
    name: string;
  } = $props();
</script>

<i class="fa-{style} fa-{name} fa-fw text-xl/6 text-theme"></i>
