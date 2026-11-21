# Using the story map

The product shows the map at `/story-map`. The source is `product/story-map.yaml`. Change the file in the same PR as a feature or delivery decision that affects the map. Reviewers can see exactly which stories moved, which changed status and which became visible to other users.

## Populate the first map

Run this workflow in the host product repository when `product/story-map.yaml` is missing, still contains the builder estimates demo, or is the starter map from `npx story-map init` (its summary begins “Starter map”). Use the sample YAML for its structure and replace the demo content with evidence from the host product. If the host product already has its own map, follow the editing rules below.

1. **Find the primary user journey.** Read the product README, user documentation, key screens or routes, and end-to-end tests. Check available delivery plans, release notes, and agreed issues for scope and status. Identify who uses the product, what they are trying to accomplish, and where that journey starts and ends. If the journey is unclear, ask the product owner which workflow to map first.
2. **Draft the map structure.** If `product/story-map.yaml` is missing, run `npx story-map init` to create a starter map, or create the file by hand starting with the [schema comment](#check-the-map-as-you-edit). Replace the starter content. Use `version: 1`, a product-specific `id`, a `title` in the form “[App Name] Story Map”, such as “Acme Story Map”, `visibility: internal`, and the `activities`, `releases`, and `stories` lists. Give each activity and release a stable `id` and a short `title`. Order activities by the steps the user takes and releases by the documented delivery order. If a story has no confirmed release, group it under an internal release such as `unassigned` with the title “Release unassigned” and flag it for review.
3. **Write the first set of stories.** Start with the outcomes needed to cover the primary journey. Give each story a stable `id`, an outcome-focused `title`, and the `activity` and `release` IDs it belongs to. Use `planned` for agreed work awaiting implementation, `in-progress` when there is evidence work has started, `merged` when the work is on the default branch but not yet available to its users, and `shipped` when the intended users can use it. Use [`blocked` or `cut`](#blocked-and-cut-stories) only with evidence, and give the reason in `statusReason`. Flag uncertain statuses for review. For each release with stories, draft its expected [`impact`](#release-notes-and-impact) from the evidence and mark each item `draft: true`. Cite supporting docs or tests in `sources`. When a Markdown section explains the implementation, use its [heading link](#link-an-engineering-overview) as the first Markdown reference with a fragment. Set `updatedBy` only to credit someone other than the commit author, such as the person you are drafting the map for. Add customer-facing copy only after approval.
4. **Validate and hand off.** Run `npx --no-install story-map validate --check-sources product/story-map.yaml` from the host repo. Resolve validation errors and review the activity and release order against the evidence. If the host renders the React board, start the host app, open a card as an engineer, and follow its overview link where one is configured. Check the signed-in customer view when customer-facing content is enabled. In the PR or handoff, list the journey covered, the main sources, and any unresolved scope, release, or status decisions.

## Upgrade to 0.4.0

These steps work from 0.3.0. Existing maps stay valid, but expect new validation warnings.

1. From your host repo, run `npm install auto-story-map@0.4.1` (0.4.1 adds an optional script and nothing else) and commit the dependency and lockfile changes together. React hosts should load the updated `auto-story-map/styles.css`.
2. Story statuses now include [`merged`](#merged-and-shipped), [`blocked` and `cut`](#blocked-and-cut-stories). If host code switches over every value of `storyStatuses` or `StoryStatus`, add cases for all three. `activeStoryStatuses` lists planned, in progress, merged and shipped. Customers see merged stories as in progress, so the customer view’s statuses are `customerStoryStatuses`.
3. `filterStoryMapView` now hides blocked and cut stories when no status is given, and records how many it hid in `filter.hidden`. Pass `status: "all"`, or `?status=all` in the URL, to include them. Boards rendered without `filterStoryMapView` hide them too, with a **Show blocked and cut stories** checkbox above the grid.
4. The customer view never includes blocked or cut stories. Check that customer-facing stories you plan to block or cut are ones customers can stop seeing.
5. Validation now has warnings as well as errors. Warnings, such as a blocked story with no `statusReason`, are printed but do not fail validation. Add `--strict` to the CI step to fail on warnings. Each issue in `StoryMapValidationError.issues` now has `severity: "error"`.
6. Add styles for the new statuses if the host overrides status colours: `--esm-status-merged`, `--esm-status-blocked` and `--esm-status-cut`, and `--esm-stalled` and `--esm-stalled-bg` for the stalled warning.
7. Releases accept optional [`notes` and `impact`](#release-notes-and-impact). The validator warns about each release with active stories but no impact, so expect new warnings on existing maps. Add impact, or ask an agent to draft it, before turning on `--strict`.
8. In the internal view, each release is now an `InternalReleaseLabel` with `notes`, `impact` and `storyCounts`. Release titles on internal boards are buttons that open a release panel. Check any host CSS that targets `.esm-release-name`.
9. Hosts with a history file now see [stalled stories](#flag-stalled-stories) flagged after 4 weeks in progress. Set `settings.stalledAfterWeeks` in the map, or pass `stalledAfterWeeks` to `getStoryMapForViewer`, to change the threshold or turn it off with `0`. The status filter accepts `stalled`, so the type of `StoryMapFilters.status` and `filter.status` now includes `"stalled"`. Pass the same `now` to `getStoryMapForViewer` as to `filterStoryMapView` and the board if the host fixes the time.
10. Rebuild the history file with this version so story panels show “Last updated 3 days ago by …” from Git. Older history files still load, and the panel then falls back to `updatedBy`. `updatedBy` is now optional guidance: update your `AGENTS.md` section from `node_modules/auto-story-map/templates/AGENTS.md`, which no longer asks agents to set it on every edit. If bots author map changes under names that do not end in `[bot]`, pass them to `story-map history` with `--bot-names`.
11. `init` does not update a guide you already copied, so compare `docs/story-map.md` with `node_modules/auto-story-map/docs/story-map.md`. Then run `npx --no-install story-map validate product/story-map.yaml`, open the board as an internal viewer, and check the **Active** filter, a release panel and a story panel. For all-users maps, check that the customer view shows no blocked or cut stories and no “Merged” status.

## Upgrade to 0.3.0

These steps work from 0.1.0 or 0.2.0. The YAML format is unchanged.

1. From your host repo, run `npm install auto-story-map@0.3.0`. If you installed an earlier version from a tarball, this replaces it with the npm release. Commit the dependency and lockfile changes together.
2. Keep your existing `version: 1` map, story IDs, and visibility settings. React hosts should load the updated `auto-story-map/styles.css` and rebuild or restart the app. Refresh the stylesheet from the new package if the host keeps a local copy. The board is now a grid of release lanes, and each card opens a detail panel. Remove any host CSS that targets the old `.esm-table`, `.esm-card-toggle` or `<details>` markup.
3. To turn on search and the status filter, pass the projected view through `filterStoryMapView` with `readStoryMapFilters(url.searchParams)`, as described in [Integrate with a product](#integrate-with-a-product). Without this step the board renders without a toolbar.
4. To add an **Engineering overview** link, append a verified heading fragment such as `#payment-controls` to an existing Markdown source. Use an absolute Markdown URL or configure [`sourceBaseUrl`](#link-an-engineering-overview) for repository-relative paths.
5. If the host mapped its own roles to `engineer` or `super-admin` only to unlock the internal map, consider passing `canViewInternal` instead. See [Integrate with a product](#integrate-with-a-product).
6. Add the [schema comment](#check-the-map-as-you-edit) to the top of the map, and add `--format github --check-sources` to the CI validation step. Consider adding the [change summary](#review-a-map-change) to PRs. Running `npx story-map init` adds the CI workflow and any missing guide or `AGENTS.md` section without touching existing files. It does not update a guide you already copied, so compare yours with `node_modules/auto-story-map/docs/story-map.md`.
7. If host code catches errors from `parseStoryMap`, it can now read `error.issues`. Each message line now includes the source line and item ID. If host code uses the exported `storyMapSchema` directly, note that it is now a Zod 4 schema.
8. Run `npx --no-install story-map validate product/story-map.yaml`. In React hosts, open a card using an internal account and verify any overview links. Try a search and a status filter. For all-users maps, check that the customer view shows its approved activity and release labels and that its panels show no engineering details.

## Where an edit belongs

| If you are changing | Update |
| --- | --- |
| The order of the user journey | Reorder the `activities` list. |
| The order of delivery slices | Reorder the `releases` list. |
| Where one story sits | Change its `activity` or `release` to an existing ID. |
| The order within a cell | Reorder the affected stories in the `stories` list. |
| Implementation details | Update the delivery plan, then add the relevant Markdown section to `sources`. |
| Progress | Set `status` to `planned`, `in-progress`, `merged` or `shipped`. Merged means the work is on the default branch. Shipped means the intended audience can use it. See [Merged and shipped](#merged-and-shipped). |
| What a release is for | Edit the release’s `notes` and `impact`. See [Release notes and impact](#release-notes-and-impact). |
| Work that stopped or was dropped | Set `status` to `blocked` or `cut` and explain why in `statusReason`. See [Blocked and cut stories](#blocked-and-cut-stories). |

Use stable, unique IDs such as `BUILDER-102`. Keep the same ID when renaming or moving a story. A plan can refer to it as `BUILDER-102` and explain the implementation or acceptance criteria in its own words. Ordinary maintenance changes can leave the map alone.

The [status history](#show-status-history) works out who last edited each story from Git, so `updatedBy` is optional. Set it to a display name only when the commit author is not the person to credit, such as an edit made on someone else’s behalf. An edit that sets `updatedBy` is credited to that name.

## Example

When price catalogue lookup is agreed for the builder workflow, put the story under the estimate activity and the builder release. Its YAML can look like this:

```yaml
- id: BUILDER-102
  title: Look up prices in the material catalogue
  activity: prepare
  release: builder-mvp
  status: planned
  sources:
    - docs/example-builder-estimate-plan.md#builder-workflow
  updatedBy: Sam Patel
```

If the agreed release changes, edit `release` on this story. If implementation starts, set its status to `in-progress`. When the work is merged but not yet deployed, set it to `merged`. Once deployed and available to builders, set it to `shipped`.

## Merged and shipped

Two statuses separate finishing the work from releasing it:

- `merged`: the work is merged to the default branch (`main` or `master`), but its intended users cannot use it yet, for example because it waits for a deploy, a feature flag or an app store release.
- `shipped`: the intended users can use it.

If the product deploys every merge straight away, skip `merged` and set `shipped` when the work merges. Otherwise, set `merged` in the PR that finishes the work, and `shipped` once it is released.

Merged stories are active, so the board shows them by default, with their own status in the filter and in release progress, such as “2 of 5 stories shipped, 1 merged”. A story stops counting as [stalled](#flag-stalled-stories) once it is merged. Signed-in customers see a merged story as **In progress**, because they cannot use it yet. Moving a customer-facing story from in progress to merged is therefore not a customer-facing change in `story-map diff`, but moving it from merged to shipped is.

## Blocked and cut stories

Two statuses record work that is not going ahead as planned:

- `blocked`: the work was started or agreed, but cannot continue.
- `cut`: the work was deliberately dropped from its release.

Explain why in `statusReason`, up to 500 characters. The validator warns when a blocked or cut story has none.

```yaml
- id: FINANCE-202
  title: Explore duplicate approval handling
  activity: finance-ops
  release: reconciliation-internal
  status: cut
  statusReason: Finance will handle duplicates manually until volumes justify it.
```

Keep the story in the map rather than deleting it, so the team can review what was not done. When the work resumes, set its status back and remove or update the reason.

The board hides blocked and cut stories by default and says how many it hid, such as “1 blocked and 2 cut hidden”, with a link to show them. The status filter offers **Active** (the default), **All, including blocked and cut**, and each status on its own. If the host renders the board without [search and filters](#integrate-with-a-product), a **Show blocked and cut stories** checkbox above the grid shows them instead. It works without JavaScript and resets when the page reloads. The story panel shows the reason. Signed-in customers never see blocked or cut stories, even when they have customer-facing copy, and an activity or release with only such stories disappears from the customer view.

## Release notes and impact

Each release can say what it delivers and what it is expected to change. Both fields are optional and internal only.

```yaml
releases:
  - id: builder-mvp
    title: Builder workflow
    notes: |
      Builders can price and submit estimates without emailing finance.

      Catalogue prices are locked when the estimate is submitted.
    impact:
      - metric: Estimate turnaround time
        expected: Decrease from 3 days to 1 day
        solves: Builders waiting on finance for prices
      - metric: Estimates returned for corrections
        expected: Decrease by 50%
        solves: Wrong unit prices typed by hand
        draft: true
```

| Field | Rules |
| --- | --- |
| `notes` | Plain text, up to 800 characters. A blank line starts a new paragraph. Markdown is shown as typed. |
| `impact` | Up to 10 items. |
| `impact[].metric` | Required. What is measured. |
| `impact[].expected` | Required. The expected change, written for people. |
| `impact[].solves` | Optional. The problem it addresses. |
| `impact[].actual` | Optional. The measured result, added after the release ships. |
| `impact[].draft` | Optional. `true` while an agent’s draft waits for a person to confirm it. |

Impact is recommended. The validator warns about a release with active stories but no impact, and about a drafted item in a release that has shipped stories. Neither fails validation unless you add `--strict`.

Agents can draft impact from plans, issues and the code, and mark each item `draft: true`. A person confirms it by removing `draft`, usually while reviewing the PR. The board cannot edit notes or impact: change them in a PR like any other map change.

On the internal board, each release lane shows its first impact item under the title, with “+1 more” when there are more and a **Draft** label on drafts. Select the release title to open its panel: the summary, notes, every impact item with its expected and actual result, progress such as “3 of 5 stories shipped, 1 cut”, and the release’s stories grouped by status. Cut stories are left out of the total, because they have left the release. Progress counts every story in the release, while the list shows only the stories that match the current filters and says how many are hidden. Each story opens its own panel.

The customer view never includes notes, impact or progress. It keeps the release’s `customer.title` and `customer.summary`.

## Link an engineering overview

Add the URL of the relevant Markdown heading to the story’s `sources`, including the fragment after `#`. For a repository-relative reference such as `ENGINEERING-OVERVIEW.md#payment-controls`, pass the repository file URL prefix to `StoryMapBoard` as `sourceBaseUrl`. Include the trailing slash, for example `https://github.com/your-org/your-product/blob/main/`. Absolute Markdown URLs work without this prop.

Render the projected view with the repository URL in the board props.

```tsx
<StoryMapBoard
  map={view}
  sourceBaseUrl="https://github.com/your-org/your-product/blob/main/"
/>
```

Cards show only the story ID, title and status. Select a card to open its panel, which shows the summary, activity and release. In the internal view, the panel also has an **Engineering** section. The first Markdown section that resolves to a web URL becomes its **Engineering overview** link, followed by the notes and the remaining sources. Sources that resolve to a web URL are links. Anything else, such as a note about a meeting, is shown as text. The panel ends with the recorded editor.

## Audience settings

| Viewer | Internal map | All-users map |
| --- | --- | --- |
| Guest | Sign-in required | Sign-in required |
| Signed-in user | Access denied | Customer-facing view |
| Internal viewer (engineer or super admin by default) | Full map | Full map |

Set the map’s `visibility` to `internal` or `all-users`. The default is `internal`. To show a story to signed-in users, add its `customer.title` and optional `customer.summary`. Add customer-facing copy to its activity and release, and to the map itself. Review the wording and verify that the story’s displayed status is suitable for this audience before merging. Customers see `merged` as in progress, and never see blocked or cut stories.

The customer view includes the approved copy and story status, and its story panels show only that copy with the customer-facing activity and release labels. It excludes engineering notes, release notes and impact, source paths, editor names, internal IDs and activities or releases with no published stories. Customer searches match only the approved title and summary. Story records without a `customer` section stay internal, and blocked and cut stories never appear. Engineers and super admins can see the recorded editor on the card and in the JSON view.

## Validate a change

In the library source repo, run `npm run build && npm run validate` or `npm test`. In a product that installs the library, run:

```sh
npx --no-install story-map validate product/story-map.yaml
```

Each problem is reported as `file:line:column` with the item it belongs to, for example:

```text
product/story-map.yaml:74:14: stories.3.release (FINANCE-201): Unknown release 'finance-later'.
```

The checks cover YAML syntax, duplicate keys and IDs, missing and unknown fields, invalid statuses, broken references and missing customer-facing labels. All problems are reported in one run.

Some problems are warnings rather than errors, such as a blocked or cut story with no `statusReason`, or a release with active stories but no [impact](#release-notes-and-impact). Warnings are printed with `warning:` after the position, but the map is still valid and the command exits successfully. Add `--strict` to treat warnings as errors.

Two optional checks look beyond the map file. Run them from the repository root, or pass `--root`:

- `--check-sources` checks that each repository-relative source exists and that each Markdown `#heading` fragment matches a heading in that file, using GitHub’s anchor rules. Absolute URLs and free text such as “Agreed in planning” are not checked.
- `--plans <folder>` checks that story IDs mentioned in Markdown files under the folder exist in the map. Only IDs with a prefix the map already uses are checked: with `BUILDER-` stories in the map, a mistyped builder story number is reported, but `UTF-8` is not. Repeat the option for several folders.
- Both checks stay inside the repository. A source or plan that points outside it, directly or through a symbolic link, is reported and never read. Symbolic links that stay inside the repository are followed as usual.
- Heading links are checked in Markdown files of up to 5 MB. A `#heading` source in a larger file is reported, so link to a smaller file.

```sh
npx --no-install story-map validate --check-sources --plans docs product/story-map.yaml
```

Run the validator in CI for story map changes. In GitHub Actions, add `--format github` so each problem appears as an annotation on the PR diff. Errors appear as error annotations and warnings as warning annotations:

```yaml
- run: npx --no-install story-map validate --format github --check-sources product/story-map.yaml
```

In code, `parseStoryMap` throws a `StoryMapValidationError`. Its `issues` list gives each problem’s `severity`, `path`, `message`, `line`, `column` and the `itemId` of the activity, release or story it belongs to. `storyMapWarnings(document)` returns the warnings for a parsed map.

### Check the map as you edit

The package includes a JSON Schema with a description for every field. Editors that use the YAML language server, such as VS Code with the Red Hat YAML extension, use it for autocomplete, hover help and inline errors. Add this comment as the first line of `product/story-map.yaml`:

```yaml
# yaml-language-server: $schema=../node_modules/auto-story-map/story-map.schema.json
```

The schema covers the shape of each field. Run the validator for the checks that span the file, such as duplicate IDs and references to unknown activities or releases.

## Review a map change

`story-map diff` compares the map with an earlier version and prints a Markdown summary for the PR. Pass the base branch:

```sh
npx --no-install story-map diff origin/main
```

The summary starts with **Customer-facing changes**: stories that signed-in customers will start or stop seeing, and visible stories whose wording, status, activity or release changes. A switch between `internal` and `all-users` visibility is highlighted. Next, **Blocked and cut** lists stories that became blocked or cut, with their reasons, and stories that are no longer blocked or cut. Then it lists added, moved, renamed, re-statused and removed stories, followed by changes to activities and releases. Use `--map` for a map at another path and `--format json` for the raw comparison.

The base version may use an older format of the map, such as when this change upgrades the package. It is read leniently: fields the format no longer has, and stories that no longer validate, are left out of the comparison, and the summary starts with a note saying what was left out. The JSON has the same counts as `baseDropped`. Your current map is still validated strictly.

The workflow from `npx story-map init` adds the summary to each PR’s job summary. In your own workflow, check out with `fetch-depth: 0` so the base branch is available:

```yaml
- name: Summarise story map changes
  env:
    BASE_REF: ${{ github.base_ref }}
  run: npx --no-install story-map diff "origin/$BASE_REF" >> "$GITHUB_STEP_SUMMARY"
```

In code, `diffStoryMaps(before, after)` returns the same comparison and `formatStoryMapDiff` renders it.

## Show status history

Internal viewers can see when each story was added or changed status, who made the change and who merged it. The board shows the time since the last change on each card, such as “Shipped · 2 days ago”, and the full history in the story panel. The panel also says who last edited the story and when, such as “Last updated 3 days ago by Sam Patel”, counting any change to the story, including notes, sources and moves. A **Changed** filter in the toolbar narrows the board to stories added or changed in the last day, 7, 14 or 30 days. Moving a story to another activity or release does not count as a change. The customer view never includes history.

With history, the internal board's header replaces the map's `summary` with a line about recent work, such as “Last updated 4 hours ago by Sam Patel. Recent changes focused on 0.6.0 (12 stories) and 0.5.0 (3 stories).” It counts the stories changed in the 2 weeks up to the latest update, by release, and names the three releases with the most. The view carries the same data in `recentUpdates`. Without history, and on the customer board, the header shows the summary.

The history comes from Git, so there is nothing extra to record. When the product is built, run:

```sh
npx --no-install story-map history --out build/story-map-history.json
```

The command reads every version of the map on the current branch’s first-parent history, usually `main`:

- **When** is the time the change reached that branch.
- **By** is the story’s `updatedBy` when that edit set it, otherwise the author of the commit that made the change. When the author is a bot, such as a coding agent, the person who merged the change is credited instead. Authors whose names end in `[bot]` are bots. Name other bot accounts with `--bot-names "Audit Agent,Release Helper"`. If Git does not record who merged, as with GitHub squash merges, the bot is credited.
- **Merged by** is the person who merged the pull request. Git records this for merge commits and direct pushes, but not for GitHub squash or rebase merges, so those entries show only the editor.

Older versions of the map may use an earlier format. The command reads them leniently, so their changes still count: it ignores fields the format no longer has, and leaves out a story that no longer validates, such as one with a status that has since been removed, until a later version of the map has it again. A version it cannot read at all, because the map was missing or was not valid YAML, is skipped, and the next readable version is compared with the last readable one. The command prints a warning naming the first few skipped commits and still succeeds. The file lists them, oldest first, in `skipped` (up to 100, each with its `commit` and a `reason`) and counts them all in `skippedCount`. Both fields are absent when nothing was skipped.

Load the file on the server and pass it in. Keep it with the map, outside the static asset directory, because it contains names:

```ts
const history = parseStoryMapHistory(await readFile("build/story-map-history.json", "utf8"));
const map = getStoryMapPage(document, viewer, { canViewInternal, history, searchParams: url.searchParams });
```

Pass `timeZone`, such as `Europe/London`, and optionally `locale` to `StoryMapBoard` so dates match your team. If the runtime does not recognise either, the board still renders: it uses `en-GB` or the server's time zone instead, and logs a warning once. Without a history file, the board works as before with no dates and no **Changed** filter, and the panel shows the story’s `updatedBy` as “Last updated by …”.

The build needs the full Git history. Many CI and hosting systems clone only the latest commits, and Docker builds often have no `.git` folder:

- In GitHub Actions, check out with `fetch-depth: 0`.
- Elsewhere, run `git fetch --unshallow` before the command, or generate the file in a step that has the full history and pass it into the build.

The command stops with an explanation when the clone is shallow. Pass `--allow-shallow` to accept a partial history instead; changes before the clone’s oldest commit are then missing.

## Flag stalled stories

A story is stalled when it has been `in-progress` for longer than a number of weeks, 4 by default. Internal viewers see a warning on its card, such as “In progress for 6 weeks”, in place of the time since its last change. The story panel says when it became in progress and that it is stalled, and the status filter has a **Stalled** option. Customers never see the flag.

Stalled is a flag, not a status, and nothing changes the map automatically. When a stalled story cannot continue, set it to `blocked` with a `statusReason`. When it is still moving, leave it: the flag clears once it ships.

The time is measured from the latest history entry that moved the story to in progress, so a story that went back to planned and restarted counts from its restart. The flag needs the [status history](#show-status-history) file. Without it, or when the newest history entry for the story is not its move to in progress, there is no flag.

Set the threshold for everyone in the map. Changes go through a PR like any other edit, and `story-map diff` lists them under **Settings**:

```yaml
settings:
  stalledAfterWeeks: 6   # whole weeks, up to 104; 0 turns the flag off
```

A host can override it, for example from its own admin settings:

```ts
const view = getStoryMapForViewer(document, viewer, { canViewInternal, history, stalledAfterWeeks: 8 });
```

Pass `now` to `getStoryMapForViewer` as well as to `filterStoryMapView` and the board when the host fixes the time, such as in tests.

## Integrate with a product

1. Package or install the library and commit the product’s map under `product/`. Include that directory in the server deployment, outside the static asset directory.
2. In the product’s authenticated server route, read the YAML as UTF-8 and pass the text to `parseStoryMap`. Call `getStoryMapPage(document, viewer, { searchParams: url.searchParams })` with roles from the verified session. Pass `null` for a guest. A null result means no access: answer 401 for a guest and 403 for anyone else. By default, viewers whose roles include `engineer` or `super-admin` see the internal map. To use your own rule, pass `canViewInternal`, for example `getStoryMapPage(document, viewer, { canViewInternal: viewer => viewer.roles.includes("product"), searchParams: url.searchParams })`. The rule receives the viewer object you passed, so it can check permissions as well as roles. Only a return value of `true` grants the internal view.
3. `getStoryMapPage` projects the map for the viewer and then applies the search and filters from `searchParams`, so a search only sees what the viewer may see. The board then shows a search box and status filter. Blocked and cut stories are hidden unless the viewer picks them in the status filter or passes `status=all`. The toolbar submits a GET form with `q`, `status` and `changed` parameters to the current page, so the host must pass the page’s query string through. Use the `preservedParams` prop to keep any other parameters the page needs. If you need the steps separately, `getStoryMapPage` is the same as `filterStoryMapView(getStoryMapForViewer(document, viewer, options), readStoryMapFilters(url.searchParams), { now })`. Always filter after projecting, never before.
4. Render `StoryMapBoard` using the returned view and import `auto-story-map/styles.css` through the host’s CSS pipeline. Pass `sourceBaseUrl` if the map uses [repository-relative Markdown links](#link-an-engineering-overview). The board is light by default. Pass `theme="dark"` for a dark host, or `theme="auto"` to follow the viewer’s system setting. Colours are CSS custom properties on `.esm-board`, such as `--esm-accent`, so a host can override them. A footer under the board shows the running version of Auto Story Map, its author and its licence. Internal viewers also get links to the changelog, source code, licence and author. Pass `showVersion={false}` to remove it. Viewers can collapse a release lane to its title and story count with the chevron in its header, which needs no JavaScript but does need a browser that supports CSS `:has()`; other browsers show every lane open with no toggle. To apply filters as soon as a viewer changes them, also load the optional browser script: serve `node_modules/auto-story-map/dist/board.js` (exported as `auto-story-map/board.js`) with the host’s other static files and add `<script type="module" src="…/board.js"></script>` to the page. It hides **Apply**, applies a select as soon as it changes and a search when the viewer presses Enter, returns focus to the filter they used, and remembers which release lanes the viewer collapsed, adding them to the [export links](#download-from-the-board). Without it, the form works as before, and collapsed lanes open again when the page reloads. Use the same server-side projection and filters if adding a JSON endpoint.
5. Send `storyMapResponseHeaders` with the page and endpoint, including error responses. They set `Cache-Control: private, no-store`, because the page differs per viewer, and `X-Content-Type-Options: nosniff`. Keep the raw YAML and parsed document on the server. The localhost demo’s role selector is for testing sample data.

```ts
import { getStoryMapPage, storyMapResponseHeaders } from "auto-story-map";

const map = getStoryMapPage(document, viewer, { canViewInternal, history, searchParams: url.searchParams });
if (!map) return new Response(viewer ? "Forbidden" : "Sign in", { status: viewer ? 403 : 401, headers: storyMapResponseHeaders });
return Response.json(map, { headers: storyMapResponseHeaders });
```

[`example/host.mjs`](https://github.com/duncan-m/auto-story-map/blob/main/example/host.mjs) is a complete example for the page and a JSON endpoint.

### Large maps

The board renders every story's detail panel into the page, so it works without JavaScript, and the page grows with the map. Measured with the example host, for stories with a title, a summary, a few lines of notes and two sources:

| Stories | Internal page | Gzipped | Customer page | Gzipped |
| --- | --- | --- | --- | --- |
| 100 | 350 KB | 35 KB | 189 KB | 16 KB |
| 500 | 1.6 MB | 154 KB | 885 KB | 69 KB |
| 1,000 | 3.1 MB | 304 KB | 1.8 MB | 136 KB |

Up to a few hundred stories this is comfortable, especially with compression turned on. Above that, split the product into several maps, such as one per area of the product, or open the page with a filter by default, such as linking to `?status=in-progress`, so viewers start from a smaller board.

The map is edited through a PR and ships with the product. The example JSON endpoint is read-only. An app that needs in-app authoring can submit a PR against the same YAML file.

## Export the map

Internal viewers can take a snapshot of the map into Lucidchart, Miro or Visio as a Visio file (`.vsdx`), or into those tools or a spreadsheet as CSV. It is one way: the YAML file stays the source of truth, and edits made in those tools do not come back.

```ts
import { getStoryMapForViewer, storyMapResponseHeaders, storyMapToVsdx, vsdxContentType } from "auto-story-map";

const view = getStoryMapForViewer(document, viewer, { canViewInternal, history });
if (view?.audience !== "internal") return new Response("Forbidden", { status: 403, headers: storyMapResponseHeaders });
const file = storyMapToVsdx(view, { collapsedReleases: ["v0-1"] });
return new Response(file, {
  headers: {
    ...storyMapResponseHeaders,
    "Content-Type": vsdxContentType,
    "Content-Disposition": 'attachment; filename="story-map.vsdx"',
  },
});
```

- The file is one page laid out like the board: activities across the top, then a lane per release with its title, story counts, notes and impact, with drafted items marked **Draft**. Each story is a card showing its ID and title. Each card also carries its ID, title, status, activity and release as shape data.
- The export is the whole map, including blocked and cut stories. Pass the view from `getStoryMapForViewer`, not a filtered one. A filtered view is refused.
- `collapsedReleases` takes release IDs. Those lanes show only their title and story count.
- At most 200 stories are exported, from lanes that are not collapsed. When there are more, the most recently changed are kept, so pass `history` if you have it, and the file says how many were left out. Without history, the last stories in the file are kept. Change the limit with `maxStories`.
- Only the internal view can be exported. A customer view throws a `TypeError`, so a host cannot hand customers internal details by mistake.
- Titles too long for their card are cut with “…” on the card. The full title stays in the shape data.
- To export from the command line, without a host route, use `story-map export`. It validates the map first and always exports the internal view, because whoever runs it already has the YAML file:

  ```bash
  npx --no-install story-map export product/story-map.yaml --format vsdx --output story-map.vsdx --history story-map-history.json --collapsed v0-1
  ```

  `--format` is required, and is `vsdx` or `csv`. `--output` defaults to `story-map.vsdx` or `story-map.csv`, and `-` writes to stdout. `--history` takes the file from `story-map history`, `--collapsed` takes comma-separated release IDs, and `--max-stories` changes the 200-story limit.
- The file is tested with Lucidchart, which keeps the layout, colours and text styling, but changes curly quotes to straight ones and drops emoji. Miro has not been tested yet. If its import is poor, use the CSV export instead.

### Export as CSV

`storyMapToCsv(view, options)` takes the same view and options as `storyMapToVsdx`, and returns the CSV as a string. Use it for Miro, or for a spreadsheet:

```ts
import { csvContentType, storyMapToCsv } from "auto-story-map";

return new Response(storyMapToCsv(view), {
  headers: {
    ...storyMapResponseHeaders,
    "Content-Type": csvContentType,
    "Content-Disposition": 'attachment; filename="story-map.csv"',
  },
});
```

- Each story is a row with the columns `Activity`, `Release`, `ID` and `Title`, using activity and release titles, in board order: by release, then activity, then map order.
- A collapsed release is one row, with its title in `Release` and “Collapsed · N stories” in `Title`.
- Release notes and impact are left out, because they do not fit a row per story. The Visio file has them.
- The same rules apply as for Visio: the whole map, internal views only, and at most 200 of the most recently changed stories. The CSV cannot say how many were left out, so `story-map export` reports it.
- Fields are quoted following RFC 4180, with CRLF line endings. A field starting with `=`, `+`, `-`, `@`, a tab or a carriage return gets a `'` in front, so spreadsheets do not run it as a formula. The file starts with a UTF-8 byte order mark so Excel reads non-ASCII titles.
- From the command line, use `--format csv`. `--output -` writes it to stdout.
- The CSV has not been tested with Miro or Lucidchart imports yet.

### Download from the board

Give the board an export route, and internal viewers get an **Export** button to the right of the filters. It opens a menu with *Visio (.vsdx), for Lucidchart or Miro* and *CSV*. Without the filter toolbar, the button goes under the board's title instead. Customers never see it, even when the prop is set. The menu is a `<details>` element, so it opens without JavaScript. With `board.js`, it also closes on Escape, on a click elsewhere, and after a choice.

```tsx
<StoryMapBoard map={view} exportHref="/story-map/export" />
```

The board adds `format=vsdx` or `format=csv` to `exportHref`, keeping any query string the host put on it. With the optional `board.js` script loaded, it also adds `collapsed=<release IDs>` for the lanes the viewer collapsed, so the file matches the board. Without the script, every lane is exported open.

Serve the route with `storyMapExportResponse`, which builds the file and its headers from the query parameters:

```ts
import { getStoryMapForViewer, storyMapExportResponse, storyMapResponseHeaders } from "auto-story-map";

// An export is the whole map: build the view without filters, even if the URL has some.
const view = getStoryMapForViewer(document, viewer, { canViewInternal, history });
if (view?.audience !== "internal") return new Response("Forbidden", { status: 403, headers: storyMapResponseHeaders });
try {
  const file = storyMapExportResponse(view, { format: url.searchParams.get("format"), collapsed: url.searchParams.get("collapsed") });
  return new Response(file.body, { headers: file.headers });
} catch (error) {
  if (error instanceof RangeError) return new Response("Choose format=vsdx or format=csv.", { status: 400, headers: storyMapResponseHeaders });
  throw error;
}
```

- `format` is `vsdx` or `csv`. Anything else, including a missing value, throws a `RangeError`.
- `collapsed` takes the comma-separated query parameter or an array of release IDs.
- The headers are `storyMapResponseHeaders` plus `Content-Type` and `Content-Disposition: attachment`. The file is named after the map title, such as `builder-estimates-delivery-map.vsdx`. Pass `filename` to choose another name; it is reduced to letters, digits, dots, hyphens and underscores so it is safe in the header.
- Like the writers, it throws a `TypeError` for a customer view or a filtered view, and passes `maxStories` and `now` through.
- [`example/host.mjs`](../example/host.mjs) has a working route at `/story-map/export`.
