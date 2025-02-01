<script lang="ts">
  let {
    style = "solid",
    name,
    color = "theme",
  }: {
    style?: string;
    name: string;
    color?: string;
  } = $props();
</script>

<i class="fa-{style} fa-{name} fa-fw text-xl/6 text-{color}"></i>
