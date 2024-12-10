<script lang="ts">
  import Button from "$lib/components/Button.svelte";

  let tab = $state<"guides" | "info">("guides");
</script>

<div class="flex flex-wrap gap-2">
  <Button onclick={() => (tab = "guides")} class={tab == "guides" ? "font-bold" : "font-light"}>Guides</Button>
  <Button onclick={() => (tab = "info")} class={tab == "info" ? "font-bold" : "font-light"}>Info</Button>
</div>

{#if tab == "guides"}
  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Target setting</h2>
    <ul class="ml-8 list-outside list-disc space-y-1">
      <li>Remind your scouts which team/alliance they should scout</li>
      <li>When used with TBA match data, automatically inputs team values for you</li>
    </ul>
  </div>

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Mode setting</h2>
    <ul class="ml-8 list-outside list-disc space-y-1">
      <li>Simplify MeanScout's UI for scouts</li>
      <li>Hide survey config menus/controls from scouts</li>
    </ul>
  </div>

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Preparing for an event</h2>
    <ol class="ml-8 list-outside list-decimal space-y-1">
      <li>Create a new survey and give it a good name (e.g. PNW Champs 2024)</li>
      <li>Set up fields you need to scout</li>
      <li>Add match schedule data in the matches page</li>
      <li>If you don't have a match schedule, add teams in the teams page</li>
    </ol>
  </div>

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Field notes</h2>
    <ul class="ml-8 list-outside list-disc space-y-1">
      <li>Give each field a short, descriptive, and unique name</li>
      <li>Make sure to add some values for your selector fields!</li>
      <li>Use group to organize your fields</li>
      <li>Duplicate fields (and groups!) to quickly set up your survey</li>
    </ul>
  </div>

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Data analysis</h2>
    <ol class="ml-8 list-outside list-decimal space-y-1">
      <li>Analysis tools are availabe in your survey's analysis page</li>
      <li>Create expressions that transform (multiply, convert) and summarize (average, sum) your data</li>
      <li>Build pick lists using those expressions with given weights</li>
      <li>View the best teams for each pick list (and even expressions)</li>
    </ol>
  </div>

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">The Blue Alliance</h2>
    <ol class="ml-8 list-outside list-decimal space-y-1">
      <li>
        <a href="https://www.thebluealliance.com/" target="_blank">
          <span class="underline">Create an account and Read API Key</span>
          <i class="fa-solid fa-up-right-from-square text-theme"></i>
        </a>
      </li>
      <li>
        Enter that API key, and your team number, in MeanScout's <a href="#/settings" class="underline">settings page</a
        >
      </li>
      <li>
        In your survey's options page, select one of your team's upcoming (or recent) events (or enter any valid TBA
        event key)
      </li>
      <li>In either your survey's matches page or teams page, get the corresponding data from TBA</li>
    </ol>
  </div>

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Exporting</h2>
    <ul class="ml-8 list-outside list-disc space-y-1">
      <li>Export survey config or scouting data via QR codes or files</li>
      <li>Export scouting data from survey's entries page (use filters if needed!)</li>
      <li>If you can't use QR codes, you'll have to manually share data as files between devices</li>
      <li>
        In that case, you can use Quick Share (Android), AirDrop (Apple), USB, email, messaging, smoke signals, or
        whatever works for you
      </li>
    </ul>
  </div>
{:else if tab == "info"}
  <span>A lightweight FRC scouting web app built with SvelteKit.</span>

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Features</h2>
    <ul class="ml-8 list-outside list-disc space-y-1">
      <li>Full offline support (progressive web app)</li>
      <li>Lightweight mobile-first design</li>
      <li>
        Color theme variants for <span class="text-red">red alliance</span>,
        <span class="text-blue">blue alliance</span>, and <span class="text-orange">pit scouting</span>
      </li>
      <li>Customizable fields: toggles, numbers, selectors, textfields, ratings, and timers</li>
      <li>Options for scouting matches and pits</li>
      <li>Data analysis (pick lists and expressions)</li>
      <li>Configurable match schedules and team lists</li>
      <li>Stores data locally, in the browser</li>
      <li>Export/share survey configs and scouting data via QR codes or files</li>
    </ul>
  </div>

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Powered by</h2>
    <ul class="ml-8 list-outside list-disc space-y-1">
      <li>
        <a href="https://svelte.dev/" target="_blank">
          <span class="underline">SvelteKit</span>
          <i class="fa-solid fa-up-right-from-square text-theme"></i>
        </a>
      </li>
      <li>
        <a href="https://tailwindcss.com/" target="_blank">
          <span class="underline">Tailwind CSS</span>
          <i class="fa-solid fa-up-right-from-square text-theme"></i>
        </a>
      </li>
      <li>
        <a href="https://fontawesome.com/" target="_blank">
          <span class="underline">Font Awesome</span>
          <i class="fa-solid fa-up-right-from-square text-theme"></i>
        </a>
      </li>
      <li>
        <a href="https://github.com/tonsky/FiraCode" target="_blank">
          <span class="underline">Fira Code</span>
          <i class="fa-solid fa-up-right-from-square text-theme"></i>
        </a>
      </li>
      <li>
        <a href="https://www.thebluealliance.com/" target="_blank">
          <span class="underline">The Blue Alliance</span>
          <i class="fa-solid fa-up-right-from-square text-theme"></i>
        </a>
      </li>
    </ul>
  </div>

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Privacy</h2>
    <span>
      Here's all the information that can be automatically sent from your device, where it's sent to, and why:
    </span>
    <ul class="ml-8 list-outside list-disc space-y-1">
      <li>TBA API key - The Blue Alliance - To get event data from TBA</li>
      <li>Your team number - The Blue Alliance - To get events your team participates in</li>
      <li>FRC event keys - The Blue Alliance - To get match schedules and participating teams for those events</li>
    </ul>
  </div>

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">Additional notes</h2>
    <ul class="ml-8 list-outside list-disc space-y-1">
      <li>You don't have to use The Blue Alliance to use MeanScout</li>
      <li>All data you put into MeanScout is stored locally, in the browser you use</li>
      <li>
        All survey configuration and scouting data can be locally exported, so try not to put any sensitive data in
        those places
      </li>
      <li>
        This applies only to the official version of the app, deployed at
        <a href="https://meanscout.team2471.org" target="_blank">
          <span class="underline">https://meanscout.team2471.org</span>
          <i class="fa-solid fa-up-right-from-square text-theme"></i>
        </a>. Other versions/forks may have more or different online features.
      </li>
    </ul>
  </div>

  <div class="flex flex-col gap-2">
    <h2 class="font-bold">FOSS</h2>
    <span>
      MeanScout is Free and Open Source Software.
      <a href="https://github.com/TeamMeanMachine/MeanScout" target="_blank">
        <span class="underline">Visit MeanScout's GitHub repository</span>
        <i class="fa-solid fa-up-right-from-square text-theme"></i>
      </a>
      to browse the source code, provide feedback, and/or contribute to the project.
    </span>
    <span>&copy; 2020-2024 Aidan Linerud, Aran O'Day, FRC Team Mean Machine 2471</span>
  </div>
{/if}

<span class="mb-6">With all that said, happy scouting!</span>
