<script lang="ts">
  import { SquareArrowOutUpRightIcon } from "@lucide/svelte";
  import { sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Header from "$lib/components/Header.svelte";

  const backLink = sessionStorage.getItem("home") || "";

  const tab = sessionStorageStore<"info" | "guides" | "rooms" | "qrfcode" | "guesses">("about-tab", "info");
  tab.subscribe(() => window.scrollTo(0, 0));

  function getTabClass(matching: string) {
    return $tab == matching ? "font-bold" : "font-light";
  }
</script>

<Header title="About - MeanScout" heading="About" {backLink} class="max-w-(--breakpoint-sm)">
  <div class="hidden gap-2 text-sm md:flex">
    {@render links()}
  </div>
</Header>

{#snippet links()}
  <Button onclick={() => ($tab = "info")} class="text-nowrap {getTabClass('info')}">Info</Button>
  <Button onclick={() => ($tab = "guides")} class="text-nowrap {getTabClass('guides')}">Guides</Button>
  <Button onclick={() => ($tab = "rooms")} class="text-nowrap {getTabClass('rooms')}">Rooms</Button>
  <Button onclick={() => ($tab = "qrfcode")} class="text-nowrap {getTabClass('qrfcode')}">QRF Codes</Button>
  <Button onclick={() => ($tab = "guesses")} class="text-nowrap {getTabClass('guesses')}">Guesses</Button>
{/snippet}

{#snippet externalLink(label: string, url: `https://${string}`)}
  <a href={url} target="_blank">
    <span class="underline">{label}</span>
    <SquareArrowOutUpRightIcon class="inline h-4 w-4 text-theme" strokeWidth={3} />
  </a>
{/snippet}

<div class="mx-auto mt-[69px] mb-3 flex w-full max-w-(--breakpoint-sm) grow flex-col gap-6 p-3 text-pretty">
  <div class="flex flex-wrap gap-2 text-sm md:hidden">
    {@render links()}
  </div>

  {#if $tab == "info"}
    <div class="flex flex-col gap-2">
      <h2 class="text-xl font-bold">MeanScout</h2>
      <span>A highly configurable peer-to-peer FRC scouting web app.</span>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Full offline support (progressive web app)</li>
        <li>Lightweight mobile-first design</li>
        <li>Online and offline data transfer</li>
        <li>Supports {@render externalLink("The Blue Alliance", "https://www.thebluealliance.com/")}</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Configuration features</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Supports any number of match and non-match (pit) scouting forms</li>
        <li>Drag-and-drop field editor with toggles, numbers, selectors, textfields, ratings, and timers</li>
        <li>Data-driven rankings (pick lists and expressions)</li>
        <li>Editable pick lists: omit and reorder teams</li>
        <li>Add matches/teams/alliances from TBA (or manually)</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Data transfer features</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Stores data locally, in the browser</li>
        <li>Online transfer via room-based peer-to-peer connections</li>
        <li>Offline transfer via QRF codes and files</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Powered by</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>{@render externalLink("Svelte", "https://svelte.dev/")}</li>
        <li>{@render externalLink("The Blue Alliance", "https://www.thebluealliance.com/")}</li>
        <li>{@render externalLink("Cloudflare", "https://www.cloudflare.com/")}</li>
        <li>{@render externalLink("WebRTC", "https://webrtcforthecurious.com/")}</li>
        <li>{@render externalLink("jsQR", "https://github.com/cozmo/jsQR")}</li>
        <li>{@render externalLink("node-qrcode", "https://github.com/soldair/node-qrcode")}</li>
        <li>{@render externalLink("Zod", "https://zod.dev/")}</li>
        <li>{@render externalLink("SortableJS", "https://sortablejs.github.io/Sortable/")}</li>
        <li>
          {@render externalLink(
            "fractional-indexing-jittered",
            "https://github.com/TMeerhof/fractional-indexing-jittered",
          )}
        </li>
        <li>{@render externalLink("Tailwind CSS", "https://tailwindcss.com/")}</li>
        <li>{@render externalLink("Lucide", "https://lucide.dev/")}</li>
        <li>{@render externalLink("Fira Code", "https://github.com/tonsky/FiraCode")}</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Privacy</h2>
      <span>MeanScout itself is completely free of telemetry or any other form of usage analytics.</span>
      <span>
        However, you should read sections regarding end users in the
        {@render externalLink("privacy policy for Cloudflare", "https://www.cloudflare.com/privacypolicy/")}, which is
        used to host and deploy MeanScout.
      </span>
      <span>
        These sections on privacy apply only to the version of MeanScout deployed at
        {@render externalLink("https://meanscout.team2471.org", "https://meanscout.team2471.org")}. Other versions/forks
        may have more or different online features.
      </span>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Privacy - The Blue Alliance</h2>
      <span>If you use The Blue Alliance in MeanScout, here's everything automatically sent to them:</span>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Your API key (if used) - MeanScout supplies its own auth key, but you may want to use your own</li>
        <li>Your team number - To get events your team participates in</li>
        <li>Event keys - To get match schedules, participating teams, and playoff alliances for those events</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Privacy - Online rooms</h2>
      <span>If you join a room for online transfers, here's everything automatically sent from your device:</span>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Your name</li>
        <li>Your team number</li>
      </ul>
      <span>
        Cloudflare Workers (specifically, Durable Objects) are used to broker connections between everyone in a room.
        Your name/team number will be temporarily stored while you are connected. Scouting data and configs are sent
        directly between your devices using
        {@render externalLink("WebRTC", "https://webrtcforthecurios.com/")}, never touching Cloudflare's servers. You
        have manual control over when and which devices receive that data from you, as well as auto-send/auto-receive
        features.
      </span>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">FOSS</h2>
      <span>
        MeanScout is Free and Open Source Software.
        {@render externalLink("Visit MeanScout's GitHub repository", "https://github.com/TeamMeanMachine/MeanScout")}
        to browse the source code, provide feedback, and/or contribute to the project.
      </span>
      <span>&copy; 2020-2026 Aidan Linerud, Aran O'Day, FRC Team Mean Machine 2471</span>
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
        <li>Create a new comp and give it a good name (e.g. PNW Champs 2026)</li>
        <li>If you hook it to a TBA event, matches and teams are fetched for you</li>
        <li>You can manually add matches and teams at any time</li>
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
          {@render externalLink("Create an account and Read API Key", "https://www.thebluealliance.com/account/login")}
        </li>
        <li>Enter that API key, and your team number, in the settings page</li>
        <li>In your comp's config, select one of your team's events (or manually enter any TBA event key)</li>
        <li>Pull match schedules, team info, and playoff alliances from the TBA event</li>
      </ol>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Exporting</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Copy ranking results to other apps (e.g. Google Keep)</li>
        <li>Export configs and scouting data using online rooms, or QRF codes/files when offline</li>
        <li>Scouting data can be easily exported from entries page</li>
        <li>Online rooms work great on the same network, but using cellular data is very hit-or-miss</li>
        <li>If internet isn't available, or if online rooms don't seem to work, use QRF codes</li>
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
        <li>If you use online rooms, you can still do offline transfers</li>
      </ol>
    </div>
  {:else if $tab == "rooms"}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Online transfer via rooms</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Uses room-based peer-to-peer connections</li>
        <li>
          Scouting data and configs are securely transferred via
          {@render externalLink("WebRTC", "https://webrtcforthecurious.com/")}
        </li>
        <li>You can join a room by typing in a unique room id</li>
        <li>Anyone who uses the same exact id will join the same room</li>
        <li>Your selected scout name and team will identify yourself in the room</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Requesting/Receiving data</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Request data from specific people, or everyone active in the room</li>
        <li>Once you receive data, you can review the sent data before accepting it</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Sending data</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Send data to specific people, or everyone active in the room</li>
        <li>Easily handle incoming requests from people</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Advantages (compared to QRF codes)</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Near-instant transfer that handles much more data</li>
        <li>Does not require devices with good cameras</li>
        <li>Send to multiple devices in one step</li>
        <li>Option for automatic sending and/or receiving entries (enabled by default)</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Limitations</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Some competition venues may not have easily accessible internet</li>
        <li>Cell networks can be unstable</li>
        <li>
          Some networks may be too restricted to form WebRTC connections, either in the same network, or between
          different networks
        </li>
        <li>If someone's device loses connection to the room, they cannot receive requests or data</li>
        <li>Devices going to sleep/screen lock will likely disconnect from the room</li>
      </ul>
    </div>
  {:else if $tab == "qrfcode"}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Offline transfer via QRF codes</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Any amount of data can be transmitted in a QRF code</li>
        <li>Very useful when one or more devices can't connect to online rooms</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Limitations (compared to online rooms)</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>The more data to transfer, the longer it will take</li>
        <li>Transfer rate depends on camera quality, light conditions, etc.</li>
        <li>Transfer must happen within the same physical location</li>
        <li>An entire transfer can only send data from one device to another</li>
        <li>Scales poorly with more and more devices</li>
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <h2 class="font-bold">What's a QRF code?</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>A single QR code can only hold so much information</li>
        <li>
          QRF codes combine QR codes with a technology called
          {@render externalLink("fountain codes", "https://en.wikipedia.org/wiki/Fountain_code")}
        </li>
        <li>QR codes are generated endlessly, each containing randomly selected chunks of data</li>
        <li>When scanning a QRF code, original data is reassembled on the fly</li>
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

    <div>{@render externalLink("Learn more", "https://aidunlin.com/qrfcodes")}</div>
  {:else if $tab == "guesses"}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Guessing game</h2>
      <ul class="ml-8 list-outside list-disc space-y-1">
        <li>Before each match, scouts can predict which alliance will win</li>
        <li>Scouts can easily view rankings for teams playing that match on their device</li>
        <li>Match scores are pulled from TBA</li>
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
        <li>Unless you sync data between devices after every match, each device only has a portion of data</li>
        <li>Scouts should communicate and compare data, ideas, opinions, etc. to make the best guesses</li>
        <li>Point system encourages cooperation among scouts</li>
        <li>Come up with real-life prizes based on total points, and shout out your scouts!</li>
      </ul>
    </div>
  {/if}
</div>
