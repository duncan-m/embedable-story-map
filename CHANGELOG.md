# Changelog

All notable changes to `auto-story-map` are recorded here. The project follows [semantic versioning](https://semver.org). Before 1.0.0, a minor version can include breaking changes, and each one is listed with its upgrade steps.

## Unreleased

One upgrade step: if host code reads `view.filter.status` or the JSON `filter.status`, treat it as an array. Links with `?status=all` or one status need no change.

- New `storyMapToVsdx(view, { collapsedReleases, maxStories, now })` writes the internal map as a Visio file (`.vsdx`) to import into Lucidchart, Miro or Visio. It is one page laid out like the board, with release notes and impact, and a card per story showing its ID and title, plus shape data. Collapsed lanes show only their title and story count, and at most 200 of the most recently changed stories are included. Customer views and filtered views are refused. New exports `vsdxContentType` and type `StoryMapExportOptions`. See [Export the map](https://github.com/duncan-m/auto-story-map/blob/main/docs/story-map.md#export-the-map).
- New `story-map export --format vsdx [--output <file>] [--history <file>] [--collapsed <release IDs>] [--max-stories <n>] [<map.yaml>]` writes the same Visio file from the YAML file, without a host route. It validates the map first, always exports the internal view, and writes to `story-map.vsdx` by default, or to stdout with `--output -`. See [Export the map](https://github.com/duncan-m/auto-story-map/blob/main/docs/story-map.md#export-the-map).

- New `storyMapToCsv(view, { collapsedReleases, maxStories, now })` writes the internal map as CSV, with a row per story giving its activity, release, ID and title, in board order. A collapsed release is one row with its story count. It follows the same rules as the Visio export, quotes fields following RFC 4180, prefixes formula-looking fields with `'`, and starts with a UTF-8 byte order mark. New export `csvContentType`. `story-map export` accepts `--format csv`. See [Export as CSV](https://github.com/duncan-m/auto-story-map/blob/main/docs/story-map.md#export-as-csv).

- New `exportHref` prop on `StoryMapBoard`. On internal boards, an **Export** button to the right of the filters opens a menu linking to it with `format=vsdx` and `format=csv`, and `board.js` adds the lanes the viewer collapsed as `collapsed`. Customers never see the button. New `storyMapExportResponse(view, { format, collapsed, filename, maxStories, now })` returns the file and its download headers for a host route, throwing a `RangeError` for an unknown format. New exports `storyMapExportFormats` and types `StoryMapExportFormat`, `StoryMapExportResponse` and `StoryMapExportResponseOptions`. The example host serves `/story-map/export`. See [Download from the board](https://github.com/duncan-m/auto-story-map/blob/main/docs/story-map.md#download-from-the-board).

- **Breaking:** the board's status filter takes several choices. It is a list of checkboxes, one per status plus **Stalled**, in place of the dropdown. Active statuses are ticked by default, and the **All, including blocked and cut** choice is gone, because ticking every box does the same. **Stalled** is now just “Stalled”, and adds stalled stories to the other choices. Choices apply when the list closes with `board.js`, or with **Apply** without it. In the URL, `status` repeats once per choice, and `status=all` and single-status links still work. `StoryMapFilters.status` also takes an array. `filter.status` in the view, and in JSON responses, is now an array of choices, such as `["planned", "stalled"]`, instead of a single value, and is absent for the default. New type `StoryStatusFilter`. `board.js` exports `enhanceStoryMapMenus`, which closes the status and Export menus on Escape or a click elsewhere.

## 0.6.1

There is no 0.6.0 release. 0.6.1 follows 0.5.0.

No upgrade steps. Existing maps and history files stay valid. Mainly fixes from a code review of 0.5.0, several of them security fixes, plus new exports and a new board header.

- `getStoryMapForViewer` and `getStoryMapPage` group history events in linear time. They used to copy each story's growing list for every event, so a history with many events for one story took quadratic time: 100,000 events took over a minute and now take well under a second. Entry order is unchanged, including for events with the same timestamp.
- With history, the internal board's header says when the map was last updated and by whom, and which releases recent changes focused on, such as “Last updated 4 hours ago by Sam Patel. Recent changes focused on 0.6.1 (12 stories) and 0.5.0 (3 stories).” It replaces the map's `summary` there. Without history, and for customers, the header still shows the summary. Internal views carry the data in a new `recentUpdates` field. New export `recentUpdateDays` and type `StoryMapRecentUpdates`.
- `story-map init` titles the starter map “[App Name] Story Map”, such as “Field Ops Story Map”, instead of “Field ops story map”.
- Activity titles on the board are larger: `.esm-activity-title` is now `1.1rem`.
- `story-map history` and `story-map diff` read past versions of the map leniently, so a future format change that removes or renames a field or status no longer breaks them. Fields the format no longer has are ignored, and a story that no longer validates is left out of that version only. History used to skip every such version silently, losing its events and dates, and diff failed until the change merged.
- History now records each version it cannot read, because the map was missing or not valid YAML, in new optional `skipped` and `skippedCount` fields, and `story-map history` warns about them and still exits 0. `parseStoryMapHistory` accepts files with and without these fields. New type `SkippedStoryMapVersion`.
- When the diff's base drops anything, the summary starts with a note saying what, and `--format json` adds `baseDropped`.
- `story-map history` fits names to the history format, so `parseStoryMapHistory` always accepts the file it writes. Git author and committer names have no length limit, and a name over 120 characters used to produce a history file that failed to load. Names are trimmed and cut to 120 characters ending in “…”, and blocked or cut reasons to 500, counting characters rather than UTF-16 code units so emoji are never split. `parseStoryMapHistory` counts the same way, so it now accepts names of up to 120 emoji.
- New `getStoryMapPage(document, viewer, { canViewInternal, history, stalledAfterWeeks, now, searchParams })` projects the map for the viewer and then applies the filters from `searchParams`, so the safe order is the easy one. It returns the same as `filterStoryMapView(getStoryMapForViewer(...), readStoryMapFilters(searchParams), { now })`, which remain available. New type `StoryMapPageOptions`.
- New `storyMapResponseHeaders`: `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`, for every story map response.
- The example host and the integration guide use both. The guide has a new [Large maps](https://github.com/duncan-m/auto-story-map/blob/main/docs/story-map.md#large-maps) section with measured page sizes.
- CLI options no longer take the next option as their value. `story-map validate --plans --strict map.yaml` and `story-map history --map --allow-shallow` used to read `--strict` and `--allow-shallow` as paths. They now print `story-map: --plans needs a value` and the usage, and exit 2. Pass a value that starts with a hyphen as `--name=-value`. The same applies to `init --dir`.
- `--check-sources` and `--plans` no longer follow symbolic links out of the repository. A source or plan file that links outside is reported as pointing outside the repository through a symbolic link, and is not read. Links inside the repository still work.
- `--check-sources` reads heading anchors in linear time, so a Markdown heading full of unclosed `<`, `[` or trailing spaces can no longer stall validation. A 200 KB heading used to take about 14 seconds. Heading anchors are not checked in Markdown files over 5 MB, and the source is reported instead.
- `story-map diff` escapes `@` and `#` in text from the map, so pasting the summary into a PR does not mention people or teams, or link issues.
- `StoryMapBoard` no longer fails to render when given a `locale` or `timeZone` the runtime does not recognise, such as `timeZone="Nowhere/Nope"`. It uses `en-GB` or the server's time zone instead, and logs a warning once. The board also builds its date formatters once per render instead of once per date. Rendered markup is otherwise unchanged.
- `story-map init` no longer follows symbolic links out of the host repository. A link at `AGENTS.md`, the map, the guide or the workflow that points outside the chosen directory, or is broken, is refused with a message instead of being written through. It skips a read-only `AGENTS.md` that already has the story map section, and accepts in-repository names that start with two dots, such as `..docs`.
- Text output from `story-map validate` escapes line breaks and control characters in messages and paths, so map text cannot add lines that look like other diagnostics or send terminal escape codes.
- Validation locates problems in linear time. A map with many unknown or duplicate fields used to make validation quadratic.
- The diff's note about stories dropped from an older-format base shows each rejected ID as inline code, so an ID with backticks, links, mentions or line breaks cannot change the summary.
- The release workflow checks that the packed `package.json` matches the committed one and pins the npm registry, so a tampered tarball cannot redirect the publish.

## 0.5.0

No upgrade steps. Hosts with custom CSS for `.esm-release` should check the new toggle fits.

- Release lanes can be collapsed. Each release header has a chevron toggle (`.esm-collapse`, a labelled checkbox `.esm-collapse-input` whose value is the release ID) that hides the lane’s stories, summary and impact, leaving its title, the chevron to expand it and its story count on one line. It works without JavaScript through CSS `:has()`, and browsers without `:has()` do not show the toggle.
- The board shows the running version, author and licence in a footer, such as “Auto Story Map 0.5.0 · By Duncan Malcolm · Apache-2.0 licence”. Internal boards also link to the changelog, source code, licence and author. Pass `showVersion={false}` to `StoryMapBoard` to remove it. New exports `storyMapVersion` and `storyMapRepositoryUrl`.
- `board.js` remembers collapsed lanes per page in `localStorage`, so they stay collapsed when a filter reloads the page. New export `enhanceStoryMapReleases(root)` for pages that add a board after loading.

## 0.4.1

No upgrade steps. Nothing changes for hosts that do not load the new script.

- New optional browser script, `auto-story-map/board.js`. Load it with `<script type="module">` on the page that renders the board, and the filters apply as soon as they change: a select applies on change, search applies on Enter, the **Apply** button is hidden, and focus returns to the filter that was used. Without it, the filter form works as before. It also exports `enhanceStoryMapFilters(root)` for pages that add a board after loading.
- The **Apply** button has a new `esm-apply` class, and the filter form has an empty, visually hidden hint that the script fills in for screen reader users.
- The demo shows this library’s own story map instead of the builder estimates sample, loads `board.js`, and starts as **Super admin**. The sample moved to `test/fixtures/builder-estimates.yaml`.

## 0.4.0

Upgrade steps: [Upgrade to 0.4.0](https://github.com/duncan-m/auto-story-map/blob/main/docs/story-map.md#upgrade-to-040). Existing maps stay valid, but expect new validation warnings, mainly releases with no impact.

### Statuses

- **Breaking:** new `merged`, `blocked` and `cut` statuses, with an optional `statusReason` of up to 500 characters. `storyStatuses` and `StoryStatus` include them, so host code that handles every status needs three more cases. New `activeStoryStatuses`, `inactiveStoryStatuses` and `isActiveStatus`.
- `merged` means the work is on the default branch but not yet available to its users. It is active, has its own icon, label and `--esm-status-merged` colour, and appears in release progress, such as “2 of 5 stories shipped, 1 merged”. Customers see merged stories as in progress: new `customerStoryStatuses`, `customerStatus` and `CustomerStoryStatus`. `story-map diff` compares customer-facing statuses the same way, so in progress → merged is not a customer-facing change.
- **Breaking:** `filterStoryMapView` hides blocked and cut stories unless a status is given, and reports how many it hid in `filter.hidden`. Pass `status: "all"` (`?status=all`) for every story. The board’s status filter offers **Active**, **All, including blocked and cut**, and each status, and says how many stories are hidden with a link to show them. Boards rendered without `filterStoryMapView` hide them too, behind a **Show blocked and cut stories** checkbox that works without JavaScript.
- The customer view never includes blocked or cut stories, or activities and releases that only contain them.
- Story panels show the reason. `story-map history` records it on changes to blocked or cut, and the panel’s history list shows it.
- `story-map diff` has a **Blocked and cut** section, and a customer-facing story that becomes blocked or cut is listed as no longer visible.
- New `--esm-status-blocked` and `--esm-status-cut` colours, with icons and text labels.

### Release notes and impact

- Releases accept optional `notes` (plain text, up to 800 characters) and `impact` (up to 10 items with `metric`, `expected`, and optional `solves`, `actual` and `draft`). New `ReleaseImpact`, `releaseNotesMaxLength` and `releaseImpactMaxItems`.
- Validation warns about a release with active stories but no impact, and about a drafted impact item in a release with shipped stories.
- Internal boards show each release’s first impact item under its title, and the release title opens a panel with the notes, impact, progress and the release’s stories grouped by status. The internal view’s releases are `InternalReleaseLabel`s with `notes`, `impact` and `storyCounts`. The customer view is unchanged.
- `story-map diff` has a **Release notes and impact** section listing notes changes, added, changed, confirmed and removed impact items, and measured results being recorded. New `releaseDetails` on `StoryMapDiff`.
- Release notes and impact are not editable on the board. Agents and people change them in PRs.

### Stalled stories

- Internal boards flag stories that have been in progress for longer than 4 weeks: the card reads “In progress for 6 weeks”, the story panel says when the story became in progress and that it is stalled, and the status filter has a **Stalled** option (`?status=stalled`). The flag needs a history file and is never shown to customers.
- New optional map `settings.stalledAfterWeeks` (whole weeks, 0 to 104, 0 turns the flag off) and `defaultStalledAfterWeeks`. Hosts can override it with the `stalledAfterWeeks` option on `getStoryMapForViewer`, which also takes `now`.
- Internal stories have `inProgressSince` and `stalled`, and the internal view has `stalledAfterWeeks` when the flag is on. `StoryMapFilters.status` and `filter.status` accept `"stalled"`.
- `story-map diff` lists a changed threshold under **Settings**, with a new `stalledAfterWeeks` on `StoryMapDiff`.
- New `--esm-stalled` and `--esm-stalled-bg` colours.

### Last updated from Git

- `story-map history` records each current story’s last edit to any field, including notes, sources and moves, as `lastEdits` in the history file. New `StoryLastEdit` type. Older history files still parse.
- Story panels show “Last updated 3 days ago by Sam Patel” from the last edit, and fall back to `updatedBy` without it. Status changes and the **Changed** filter are unaffected.
- Edits authored by bots are credited to whoever merged them, in both the last edit and status history. Names ending in `[bot]` are bots. New `--bot-names` option on `story-map history`, and `botNames` on `buildStoryMapHistory`.
- `updatedBy` is now optional guidance. The guide and the `AGENTS.md` template ask agents to set it only when the commit author is not the person to credit.

### Validation

- Validation issues have a `severity` of `error` or `warning`. Warnings do not make a map invalid. The first warning is a blocked or cut story with no `statusReason`. New `storyMapWarnings(document)`.
- `story-map validate` prints warnings with `warning:`, emits `::warning` annotations with `--format github` and exits 0 when there are only warnings. Add `--strict` to fail on warnings.

## 0.3.0

Upgrade steps: [Upgrade to 0.3.0](https://github.com/duncan-m/auto-story-map/blob/main/docs/story-map.md#upgrade-to-030). The YAML format is unchanged.

### Board

- **Breaking:** the board is now a grid of activity tiles and coloured release lanes, with a story count per release. The markup and class names changed, so remove host CSS that targets `.esm-table`, `.esm-card-toggle` or `<details>`.
- Cards show only the story ID, title and status. Selecting a card opens a detail panel with the summary, activity and release. For internal viewers, the panel also shows the engineering overview, notes, linked sources and last editor. The panel uses the popover API and works without client-side JavaScript.
- New `filterStoryMapView` and `readStoryMapFilters` add a search box and status filter, submitted as a GET form. Use `preservedParams` to keep the host page’s own query parameters.
- New `theme` prop: `light` (default), `dark` or `auto`. All colours are `--esm-*` custom properties.
- Phones show each release lane as a stacked section.
- Engineering overview and source links in the story panel open in a new tab, with an icon and screen-reader text that say so.

### Access and validation

- New `canViewInternal` option on `getStoryMapForViewer` lets the host decide who sees the internal map. The default is unchanged: the `engineer` and `super-admin` roles.
- `parseStoryMap` throws `StoryMapValidationError`. Its `issues` give the path, message, line, column and containing item ID. Every problem is reported in one run, including reference checks when another field is invalid.
- `story-map validate` prints `file:line:column` and supports `--format github` for PR annotations.
- New `--check-sources` validator option checks that repository-relative sources exist and that Markdown `#heading` links match a heading. New `--plans <folder>` checks that story IDs mentioned in delivery plans exist in the map.
- The package ships `story-map.schema.json` (also exported as `auto-story-map/schema.json`) for editor autocomplete and inline checks.
- **Breaking:** `storyMapSchema` is now a Zod 4 schema.

### Reviewing changes

- New `story-map diff <base-ref>` prints a Markdown summary of a map change for the PR, starting with what signed-in customers will see. `diffStoryMaps` and `formatStoryMapDiff` expose the same comparison in code.

### Status history

- New `story-map history` reads the map’s Git history and records when each story was added and each status change, who made it and who merged it. Pass the result to `getStoryMapForViewer` as `history`.
- Internal cards show the time since the last change, such as “Shipped · 2 days ago”, and the story panel lists the full history. A new **Changed** filter shows stories added or changed in the last 1, 7, 14 or 30 days (`changed=7d`). The customer view never includes history.
- New `locale`, `timeZone` and `now` props on `StoryMapBoard`, and a `now` option on `filterStoryMapView`.

### Setup

- New `story-map init` command creates a starter map, the story map guide, an `AGENTS.md` section and a GitHub Actions workflow that validates the map and its sources and adds the change summary to each PR. It never overwrites existing files.
- The package is published to npm.

## 0.2.0

- Story cards expand to show their activity and release.
- A Markdown source with a heading fragment becomes the card’s **Engineering overview** link. New `sourceBaseUrl` prop resolves repository-relative sources.
- Documented the host upgrade path and the first-run workflow for agents.

## 0.1.0

- First release: the YAML format, validator CLI, audience projection for internal and all-users views, React board and stylesheet.
- Stories can record `updatedBy`, shown to internal viewers.
