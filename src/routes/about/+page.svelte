<script lang="ts">
  import { sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";
  import { SquareArrowOutUpRightIcon } from "@lucide/svelte";

  const lastSurvey = localStorage.getItem("survey");
  const backLink = lastSurvey ? `survey/${lastSurvey}` : "";

  const tab = sessionStorageStore<"info" | "guides" | "prediction" | "qrfcode">("about-tab", "info");

  function getTabClass(matching: string) {
    return $tab == matching ? "font-bold" : "font-light";
  }
</script>

<Header title="About - MeanScout" heading="About MeanScout" {backLink} />

<div class="flex flex-col gap-6" style="view-transition-name:about">
  <div class="flex flex-wrap gap-2 text-sm">
    <Button onclick={() => ($tab = "info")} class={getTabClass("info")}>Info</Button>
    <Button onclick={() => ($tab = "guides")} class={getTabClass("guides")}>Guides</Button>
    <Button onclick={() => ($tab = "prediction")} class={getTabClass("prediction")}>Predictions</Button>
    <Button onclick={() => ($tab = "qrfcode")} class={getTabClass("qrfcode")}>QRF Codes</Button>
  </div>

  {#if $tab == "info"}
    <span>A highly configurable peer-to-peer FRC scouting web app.</span>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Features</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Full offline support (progressive web app)</li>
        <li>Lightweight mobile-first design</li>
        <li>Customizable fields: toggles, numbers, selectors, textfields, ratings, and timers</li>
        <li>Supports both match scouting and non-match (pit) scouting</li>
        <li>Configurable match schedules and team lists</li>
        <li>
          Pull schedules/teams from
          <a href="https://www.thebluealliance.com/" target="_blank">
            <span class="underline">The Blue Alliance</span>
            <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
          </a>
        </li>
        <li>Customizable data analysis (pick lists and expressions)</li>
        <li>Optional scout names and match prediction game</li>
        <li>Stores data locally, in the browser</li>
        <li>Export/share survey configs and scouting data via QRF codes or files</li>
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
        <li>FRC event keys - To get match schedules and participating teams for those events</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Additional notes</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>You don't have to use The Blue Alliance to use MeanScout</li>
        <li>
          Survey configuration and scouting data are stored as, and can be exported as, plaintext, so try not to put any
          sensitive data in those places
        </li>
        <li>
          This applies only to the version of the app deployed at
          <a href="https://meanscout.team2471.org" target="_blank">
            <span class="underline">https://meanscout.team2471.org</span>
            <SquareArrowOutUpRightIcon class="text-theme inline h-4 w-4" strokeWidth={3} />
          </a>
        </li>
        <li>Other versions/forks may have more or different online features</li>
      </ul>
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
      <h2 class="font-bold">Preparing for an event</h2>
      <ol class="ml-8 list-outside list-decimal space-y-1">
        <li>Create a new survey and give it a good name (e.g. PNW Champs 2024)</li>
        <li>Set up fields you need to scout</li>
        <li>Add match schedule data in the matches page</li>
        <li>If you don't have a match schedule, add teams in the teams page</li>
        <li>Choose whether to enable scout names and match prediction game (only works with a match schedule)</li>
      </ol>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Field notes</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Give each field a short, descriptive, and unique name</li>
        <li>Use groups to organize your fields (they don't have to just be "Auto" and "Teleop" either)</li>
        <li>Duplicate fields (and groups!) to quickly set up your survey</li>
        <li>Drag-and-drop organization is supported, but experimental</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Data analysis</h2>
      <ol class="ml-8 list-outside list-decimal space-y-1">
        <li>Create expressions that transform (multiply, convert) and summarize (average, sum) your data</li>
        <li>Entry expressions (aka computed fields) produce per-entry values</li>
        <li>Survey expressions combine those values across entries</li>
        <li>Create pick lists that pull from survey expressions with given weights</li>
        <li>View team rankings for each pick list (and expressions)</li>
      </ol>
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
        <li>In your survey's admin page, select one of your team's events (or manually enter any TBA event key)</li>
        <li>Pull match schedules and/or team info from the TBA event</li>
      </ol>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Exporting</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Export or copy analysis ranking results to other apps (e.g. Google Keep)</li>
        <li>Export survey configs and scouting data via QRF codes or files</li>
        <li>Scouting data can be exported from the survey's entries page (use filters if needed!)</li>
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
        <li>Once you've fully set up your survey on one device, export it to the rest</li>
        <li>Fill in the team setting on each device (highlights your team in match lists)</li>
        <li>Set a unique target on each device (definitely do this one!)</li>
        <li>If you can use QRF codes, make sure to pick a rear-facing camera</li>
      </ol>
    </div>
  {:else if $tab == "prediction"}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Optional prediction game</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Enabled if scout names are enabled, requires match schedule & scores from TBA</li>
        <li>Before each match, scouts can predict which alliance will win</li>
        <li>When setting up a new entry, scouts can easily view analysis for data on their device</li>
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
        <li>
          Scouts will have to talk to each other and compare data, ideas, opinions, etc. to make the best predictions
        </li>
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
  {/if}
</div>
