<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import { SquareArrowOutUpRightIcon } from "@lucide/svelte";

  const backLink = sessionStorage.getItem("home") || "";

  const tab = sessionStorageStore<"info" | "guides" | "guesses" | "qrfcode">("about-tab", "info");
  tab.subscribe(() => window.scrollTo(0, 0));

  function getTabClass(matching: string) {
    return $tab == matching ? "font-bold" : "font-light";
  }
</script>

<Header title="About - MeanScout" heading="About" {backLink}>
  <div class="hidden gap-2 text-sm md:flex">
    {@render links()}
  </div>
</Header>

{#snippet links()}
  <Button onclick={() => ($tab = "info")} class="text-nowrap {getTabClass('info')}">Info</Button>
  <Button onclick={() => ($tab = "guides")} class="text-nowrap {getTabClass('guides')}">Guides</Button>
  <Button onclick={() => ($tab = "guesses")} class="text-nowrap {getTabClass('guesses')}">Guesses</Button>
  <Button onclick={() => ($tab = "qrfcode")} class="text-nowrap {getTabClass('qrfcode')}">QRF Codes</Button>
{/snippet}

<div class="mx-auto mt-[69px] mb-3 flex w-full max-w-(--breakpoint-sm) grow flex-col gap-6 p-3 text-pretty">
  <div class="flex flex-wrap gap-2 text-sm md:hidden">
    {@render links()}
  </div>

  {#if $tab == "info"}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">MeanScout</h2>
      <span>A highly configurable peer-to-peer FRC scouting web app.</span>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Features</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Full offline support (progressive web app)</li>
        <li>Lightweight mobile-first design</li>
        <li>Customizable fields: toggles, numbers, selectors, textfields, ratings, and timers</li>
        <li>Supports any number of match and non-match (pit) scouting forms</li>
        <li>Data-driven rankings (pick lists and expressions)</li>
        <li>Editable pick lists: omit and reorder teams</li>
        <li>Optional scout names and match guessing game</li>
        <li>Stores data locally, in the browser</li>
        <li>Export/share survey configs and scouting data via QRF codes or files</li>
        <li>
          Pull matches/teams/alliances from
          <a href="https://www.thebluealliance.com/" target="_blank">
            <span class="underline">The Blue Alliance</span>
            <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
          </a>
        </li>
        <li>Or, manually set them up as needed</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Powered by</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>
          <a href="https://svelte.dev/" target="_blank">
            <span class="underline">Svelte</span>
            <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
          </a>
        </li>
        <li>
          <a href="https://www.thebluealliance.com/" target="_blank">
            <span class="underline">The Blue Alliance</span>
            <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
          </a>
        </li>
        <li>
          <a href="https://github.com/cozmo/jsQR" target="_blank">
            <span class="underline">jsQR</span>
            <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
          </a>
        </li>
        <li>
          <a href="https://github.com/soldair/node-qrcode" target="_blank">
            <span class="underline">node-qrcode</span>
            <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
          </a>
        </li>
        <li>
          <a href="https://zod.dev/" target="_blank">
            <span class="underline">Zod</span>
            <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
          </a>
        </li>
        <li>
          <a href="https://sortablejs.github.io/Sortable/" target="_blank">
            <span class="underline">SortableJS</span>
            <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
          </a>
        </li>
        <li>
          <a href="https://github.com/TMeerhof/fractional-indexing-jittered" target="_blank">
            <span class="underline">fractional-indexing-jittered</span>
            <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
          </a>
        </li>
        <li>
          <a href="https://tailwindcss.com/" target="_blank">
            <span class="underline">Tailwind CSS</span>
            <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
          </a>
        </li>
        <li>
          <a href="https://lucide.dev/" target="_blank">
            <span class="underline">Lucide</span>
            <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
          </a>
        </li>
        <li>
          <a href="https://github.com/tonsky/FiraCode" target="_blank">
            <span class="underline">Fira Code</span>
            <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
          </a>
        </li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Privacy</h2>
      <span>
        If you use The Blue Alliance in MeanScout, here's all the data that can be automatically sent from your device:
      </span>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Your API key - MeanScout supplies its own auth key, but you may want to use your own</li>
        <li>Your team number - To get events your team participates in</li>
        <li>Event keys - To get match schedules, participating teams, and playoff alliances for those events</li>
      </ul>
      <span>MeanScout itself is completely free of telemetry or any other form of usage analytics.</span>
      <span>
        However, you should read sections regarding end users in the
        <a href="https://www.cloudflare.com/privacypolicy/" target="_blank">
          <span class="underline">privacy policy for Cloudflare</span>
          <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
        </a>, which is used to host and deploy MeanScout.
      </span>
      <span>
        This applies only to the version of MeanScout deployed at
        <a href="https://meanscout.team2471.org" target="_blank">
          <span class="underline">https://meanscout.team2471.org</span>
          <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
        </a>. Other versions/forks may have more or different online features.
      </span>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">FOSS</h2>
      <span>
        MeanScout is Free and Open Source Software.
        <a href="https://github.com/TeamMeanMachine/MeanScout" target="_blank">
          <span class="underline">Visit MeanScout's GitHub repository</span>
          <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
        </a>
        to browse the source code, provide feedback, and/or contribute to the project.
      </span>
      <span>&copy; 2020-2025 Aidan Linerud, Aran O'Day, FRC Team Mean Machine 2471</span>
    </div>
  {:else if $tab == "guides"}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Target setting</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Remind your scouts which team/alliance they should scout</li>
        <li>When used with TBA match data, automatically inputs team values for you</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Comps</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Event-wide config data</li>
        <li>Contains matches, participating teams, alliances</li>
        <li>Multiple surveys are created within a comp</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Surveys</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Config data for specific forms within one comp</li>
        <li>Contains fields, and for match surveys, contains ranks (pick lists and expressions)</li>
        <li>Fields are specific customizable inputs within a survey's form</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Entries</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Actual scouting data recorded by your team</li>
        <li>Entries are tied to surveys they're based on</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Preparing for an event</h2>
      <ol class="ml-8 list-outside list-decimal space-y-1">
        <li>Create a new comp and give it a good name (e.g. PNW Champs 2024)</li>
        <li>If you hook it to a TBA event, matches and teams are fetched for you</li>
        <li>You can manually add matches and teams at any time</li>
        <li>Choose whether to enable scout names and match guessing game (only works with a match schedule)</li>
      </ol>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Creating surveys</h2>
      <ol class="ml-8 list-outside list-decimal space-y-1">
        <li>Create match or pit (no match) surveys</li>
        <li>You can make as many surveys as you need for various purposes</li>
        <li>Set up fields you need to scout</li>
        <li>Create data-driven rankings</li>
      </ol>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Field notes</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Give each field a short, descriptive, and unique name</li>
        <li>Use groups to organize your fields (they don't have to just be "Auto" and "Teleop" either)</li>
        <li>Duplicate fields (and groups!) to quickly set up your survey</li>
        <li>Drag-and-drop organization is supported</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Data-driven rankings</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Create expressions that transform and aggregate your data</li>
        <li>Entry expressions act like derived/computed fields</li>
        <li>Aggregate expressions combine data across matches</li>
        <li>Create pick lists that pull from expressions and fields with given weights</li>
        <li>Once you have data, you can view team rankings for pick lists and expressions</li>
        <li>Rankings are also available for your numeric fields (numbers, toggles, ratings, timers)</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Alliance selection</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>You can add teams to playoff alliances from any ranking list</li>
        <li>Alliance teams can be displayed after remaining teams</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">The Blue Alliance</h2>
      <ol class="ml-8 list-outside list-decimal space-y-1">
        <li>MeanScout supplies its own Read API key, but you may want to use your own</li>
        <li>
          <a href="https://www.thebluealliance.com/account/login" target="_blank">
            <span class="underline">Create an account and Read API Key</span>
            <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
          </a>
        </li>
        <li>
          Enter that API key, and your team number, in the <a href="#/settings" class="underline">settings page</a>
        </li>
        <li>In your comp's config, select one of your team's events (or manually enter any TBA event key)</li>
        <li>Pull match schedules, team info, and playoff alliances from the TBA event</li>
      </ol>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Exporting</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Copy ranking results to other apps (e.g. Google Keep)</li>
        <li>Export configs and scouting data via QRF codes or files</li>
        <li>Scouting data can be easily exported from entries page</li>
        <li>If you can't use QRF codes, you'll have to manually share data as files between devices</li>
        <li>
          In that case, you can use Quick Share (Android + Windows), AirDrop (Apple), USB, email, messaging, smoke
          signals, or whatever works for you
        </li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Multiple devices</h2>
      <ol class="ml-8 list-outside list-decimal space-y-1">
        <li>Once you've fully set up your comp and surveys on one device, export it to the rest</li>
        <li>Fill in the team setting on each device (highlights your team in match lists)</li>
        <li>Set a target on each device, ensuring each target is at least covered by one scout per match</li>
        <li>If you can use QRF codes, make sure to pick a rear-facing camera</li>
      </ol>
    </div>
  {:else if $tab == "guesses"}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Optional guessing game</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Enabled if scout names are enabled, requires match schedule & scores from TBA</li>
        <li>Before each match, scouts can predict which alliance will win</li>
        <li>Scouts can easily view rankings for teams playing that match on their device</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Points</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Points for guessing correctly will be increased if more scouts vote for the same alliance</li>
        <li>1 extra point to correct scouts for every correct scout</li>
        <li>1 point for only 1 correct scout, 6 points each for all 6 correct scouts</li>
        <li>Scouts that don't guess or guess incorrectly won't lose points, but won't gain any either</li>
        <li>Tied matches don't count towards points</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Adjusted Points</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Adjusted points multiply scout's points by their accuracy with guessing right</li>
        <li>
          Gives scouts with less matches and higher accuracy a chance to contend with scouts who have more matches and
          lower accuracy
        </li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Cooperation</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>
          Unless you manually sync data between all your devices every match, each device only has small portion of data
        </li>
        <li>Scouts will have to talk to each other and compare data, ideas, opinions, etc. to make the best guesses</li>
        <li>Point system encourages cooperation among scouts</li>
        <li>Come up with real-life prizes based on total points, like candy!</li>
      </ul>
    </div>
  {:else if $tab == "qrfcode"}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">What's a QRF code?</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>A single QR code can only hold so much information</li>
        <li>
          QRF codes combine QR codes with a technology called
          <a href="https://en.wikipedia.org/wiki/Fountain_code" target="_blank">
            <span class="underline">fountain codes</span>
            <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
          </a>
        </li>
        <li>Any amount of data can be transmitted from endlessly generating QR codes</li>
        <li>Each QR code contains and combines randomly selected chunks of data</li>
        <li>When scanning a QRF code in MeanScout, the app reassembles the original data on the fly</li>
        <li>You can scan QRF codes with a regular QR code scanner, but you probably can't do much with it</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Why is it called a "fountain" code?</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Let's say you want to fill up a bucket with water from a fountain</li>
        <li>You don't care about which molecules of water go in your bucket</li>
        <li>You just need enough water to fill it up</li>
      </ul>
    </div>

    <a href="https://aidunlin.com/qrfcodes" target="_blank" class="self-start">
      <span class="underline">Learn more</span>
      <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
    </a>
  {/if}
</div>
