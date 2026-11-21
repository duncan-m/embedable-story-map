import { Fragment, useId, version } from "react";
import type { CSSProperties, ReactNode } from "react";
import { activeStoryStatuses, customerStoryStatuses, isActiveStatus, storyStatusLabels, storyStatuses, type StoryStatus, type StoryStatusFilter } from "./status.js";
import type { ReleaseImpact } from "./schema.js";
import { storyMapAuthor, storyMapLicense, storyMapRepositoryUrl, storyMapVersion } from "./version.js";
import type { InternalReleaseLabel, InternalStoryCard, StoryHistoryEntry, StoryMapRecentUpdates, StoryMapView } from "./view.js";

/** Windows offered by the “Changed in” filter, in days. Matches `changedWithinOptions`. */
const changedWithinChoices = [[1, "Last day"], [7, "Last 7 days"], [14, "Last 14 days"], [30, "Last 30 days"]] as const;

export interface StoryMapBoardProps {
  map: StoryMapView;
  /** Base URL for repository-relative sources, such as `https://github.com/org/repo/blob/main/`. */
  sourceBaseUrl?: string;
  /** `light` by default. `auto` follows the viewer's colour scheme preference. */
  theme?: "light" | "dark" | "auto";
  /** Query parameters to keep when the filter form is submitted, such as a host's own page state. */
  preservedParams?: Readonly<Record<string, string>>;
  /** Locale for dates and relative times. Defaults to `en-GB`. */
  locale?: string;
  /** IANA time zone for dates, such as `Europe/London`. Defaults to the runtime’s zone. */
  timeZone?: string;
  /** Time to measure “3 days ago” from. Defaults to now. */
  now?: Date;
  /**
   * Shows the library version under the board, with links to its changelog and
   * repository on internal boards. On by default.
   */
  showVersion?: boolean;
  /**
   * The host's export route, such as `/story-map/export`. On internal boards the
   * header then links to it with `format=vsdx` and `format=csv`, and board.js adds
   * the lanes the viewer collapsed as `collapsed`. Never shown to customers.
   */
  exportHref?: string;
}

interface DateSettings {
  now: Date;
  date: Intl.DateTimeFormat;
  dateTime: Intl.DateTimeFormat;
  relative: Intl.RelativeTimeFormat;
}

const defaultLocale = "en-GB";
const warned = new Set<string>();

/** Warns once per message, so a host that renders on every request does not fill its logs. */
function warnOnce(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`auto-story-map: ${message}`);
}

/** Whether `Intl` accepts the options. An unknown locale tag or time zone throws a RangeError. */
function accepted(locale: string, timeZone?: string) {
  try {
    new Intl.DateTimeFormat(locale, { timeZone });
    new Intl.RelativeTimeFormat(locale);
    return true;
  } catch {
    return false;
  }
}

/**
 * Builds the board's date formatters once per render. A locale or time zone
 * that `Intl` rejects falls back to `en-GB` or the runtime's zone, with a
 * warning, instead of failing the whole page.
 */
function dateFormatters(locale: string, timeZone: string | undefined, now: Date): DateSettings {
  if (!accepted(locale)) {
    warnOnce(`Unknown locale ${JSON.stringify(locale)}, so dates use ${defaultLocale}.`);
    locale = defaultLocale;
  }
  if (timeZone !== undefined && !accepted(locale, timeZone)) {
    warnOnce(`Unknown time zone ${JSON.stringify(timeZone)}, so dates use the server's time zone.`);
    timeZone = undefined;
  }
  return {
    now,
    date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone }),
    dateTime: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }),
    relative: new Intl.RelativeTimeFormat(locale, { numeric: "auto" }),
  };
}

function formatDate(at: string, settings: DateSettings, withTime = true) {
  return (withTime ? settings.dateTime : settings.date).format(new Date(at));
}

/** “5 hours ago”, “yesterday”, “12 days ago”, then the date after 30 days. */
function formatRelative(at: string, settings: DateSettings) {
  const minutes = Math.floor((settings.now.getTime() - Date.parse(at)) / 60_000);
  const relative = settings.relative;
  if (minutes < 1) return "just now";
  if (minutes < 60) return relative.format(-minutes, "minute");
  if (minutes < 24 * 60) return relative.format(-Math.floor(minutes / 60), "hour");
  const days = Math.floor(minutes / (24 * 60));
  if (days < 30) return relative.format(-days, "day");
  return formatDate(at, settings, false);
}

const shownReleases = 3;

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * “Last updated 4 hours ago by Sam. Recent changes focused on 0.6.0 (12 stories) and 0.5.0 (3 stories).”
 * Recent means the `days` up to the latest update, so a quiet map still shows what last moved.
 */
function RecentUpdates({ updates, settings }: { updates: StoryMapRecentUpdates; settings: DateSettings }) {
  const shown = updates.releases.slice(0, shownReleases);
  const others = updates.releases.length - shown.length;
  const parts: ReactNode[] = shown.map(release => (
    <Fragment key={release.id}><strong>{release.title}</strong> ({plural(release.stories, "story", "stories")})</Fragment>
  ));
  if (others > 0) parts.push(plural(others, "other release"));
  return (
    <p className="esm-goal esm-recent">
      Last updated <time dateTime={updates.at} title={formatDate(updates.at, settings)}>{formatRelative(updates.at, settings)}</time>
      {updates.by && ` by ${updates.by}`}.
      {parts.length > 0 && <>
        {" Recent changes focused on "}
        {parts.map((part, index) => (
          <Fragment key={index}>{index > 0 && (index === parts.length - 1 ? " and " : ", ")}{part}</Fragment>
        ))}.
      </>}
    </p>
  );
}

function ChangedAt({ at, settings }: { at: string; settings: DateSettings }) {
  return (
    <time className="esm-changed" dateTime={at} title={formatDate(at, settings)}>
      {formatRelative(at, settings)}
    </time>
  );
}

const weekMs = 7 * 24 * 60 * 60 * 1000;

function weeks(count: number) {
  return `${count} ${count === 1 ? "week" : "weeks"}`;
}

/** Whole weeks since `at`, such as 6 for 45 days. */
function weeksSince(at: string, settings: DateSettings) {
  return Math.max(0, Math.floor((settings.now.getTime() - Date.parse(at)) / weekMs));
}

function WarningIcon() {
  return (
    <svg className="esm-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2.2 14.2 13H1.8L8 2.2Z" />
      <path d="M8 6.5v2.8M8 11.2v.1" />
    </svg>
  );
}

/** Replaces the card’s “3 days ago” on a stalled story. */
function StalledLabel({ since, settings }: { since: string; settings: DateSettings }) {
  return (
    <span className="esm-stalled" title={`In progress since ${formatDate(since, settings)}`}>
      <WarningIcon />
      {`In progress for ${weeks(weeksSince(since, settings))}`}
    </span>
  );
}

function HistoryList({ entries, settings, labelledBy }: { entries: StoryHistoryEntry[]; settings: DateSettings; labelledBy: string }) {
  return (
    <ol className="esm-history" aria-labelledby={labelledBy}>
      {entries.map((entry, index) => {
        const people = [
          entry.by && `by ${entry.by}`,
          entry.mergedBy && entry.mergedBy !== entry.by && `merged by ${entry.mergedBy}`,
        ].filter(Boolean).join(", ");
        return (
          <li key={index}>
            <span className="esm-history-change">
              {entry.type === "added" ? "Added as " : ""}
              <Status status={entry.to} />
            </span>
            <span className="esm-history-meta">
              <time dateTime={entry.at}>{formatDate(entry.at, settings)}</time>
              {people && ` · ${people}`}
            </span>
            {entry.reason && <span className="esm-history-reason">{entry.reason}</span>}
          </li>
        );
      })}
    </ol>
  );
}

// React 19 knows the popover attributes by their camelCase names. React 18 passes
// them through only when they are spelled in lowercase.
const reactMajor = Number(version.split(".")[0]);
function popoverTarget(id: string, action?: "hide"): Record<string, string> {
  const [target, targetAction] = reactMajor >= 19
    ? ["popoverTarget", "popoverTargetAction"]
    : ["popovertarget", "popovertargetaction"];
  return action ? { [target]: id, [targetAction]: action } : { [target]: id };
}

interface SourceLink {
  label: string;
  href?: string;
  overview: boolean;
}

function resolveSources(sources: readonly string[] | undefined, sourceBaseUrl?: string): SourceLink[] {
  let overviewFound = false;
  return (sources ?? []).map(label => {
    if (/\s/.test(label)) return { label, overview: false };
    let url: URL;
    try {
      url = new URL(label, sourceBaseUrl);
    } catch {
      return { label, overview: false };
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return { label, overview: false };
    const overview = !overviewFound && url.pathname.toLowerCase().endsWith(".md") && !!url.hash;
    overviewFound ||= overview;
    return { label, href: url.href, overview };
  });
}

// Engineering links open in a new tab so the board stays where the reader left it.
const newTab = { target: "_blank", rel: "noopener noreferrer" } as const;

function NewTabHint() {
  return (
    <>
      <svg className="esm-icon esm-external" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9.5 2.5h4v4M13.5 2.5 7 9M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" />
      </svg>
      <span className="esm-visually-hidden"> (opens in a new tab)</span>
    </>
  );
}

function StatusIcon({ status }: { status: StoryStatus }) {
  return (
    <svg className="esm-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {status === "planned"
        ? <circle cx="8" cy="8" r="6.2" strokeDasharray="2.4 2.2" />
        : <circle cx="8" cy="8" r="6.2" />}
      {status === "in-progress" && <circle cx="8" cy="8" r="1.7" fill="currentColor" stroke="none" />}
      {status === "merged" && <path d="M8 8V4.2A3.8 3.8 0 1 1 4.2 8Z" fill="currentColor" stroke="none" />}
      {status === "shipped" && <path d="m5.3 8.2 1.8 1.8 3.6-3.7" />}
      {status === "blocked" && <path d="M5 8h6" />}
      {status === "cut" && <path d="M3.6 12.4 12.4 3.6" />}
    </svg>
  );
}

function Status({ status }: { status: StoryStatus }) {
  return (
    <span className="esm-status" data-status={status}>
      <StatusIcon status={status} />
      {storyStatusLabels[status]}
    </span>
  );
}

function StoryDetail({ story, panelId, activityTitle, releaseTitle, internal, sourceBaseUrl, settings, stalledAfterWeeks }: {
  story: InternalStoryCard;
  panelId: string;
  activityTitle: string;
  releaseTitle: string;
  internal: boolean;
  sourceBaseUrl?: string;
  settings: DateSettings;
  stalledAfterWeeks?: number;
}) {
  const titleId = `${panelId}-title`;
  const sources = internal ? resolveSources(story.sources, sourceBaseUrl) : [];
  const overview = sources.find(source => source.overview);
  const references = sources.filter(source => source !== overview);
  const hasEngineering = internal && !!(overview || story.notes || references.length);

  return (
    <div className="esm-detail" id={panelId} popover="auto" role="dialog" aria-labelledby={titleId}>
      <div className="esm-detail-head">
        <div>
          {internal && <p className="esm-card-id">{story.id}</p>}
          <h3 id={titleId}>{story.title}</h3>
        </div>
        <CloseButton panelId={panelId} />
      </div>
      <Status status={story.status} />
      {internal && story.statusReason && <p className="esm-status-reason">{story.statusReason}</p>}
      {internal && story.inProgressSince && (
        <p className="esm-progress-since">
          In progress since <time dateTime={story.inProgressSince}>{formatDate(story.inProgressSince, settings, false)}</time>
        </p>
      )}
      {internal && story.stalled && story.inProgressSince && (
        <p className="esm-stalled-note">
          <WarningIcon />
          <span>
            {`Stalled: in progress for ${weeks(weeksSince(story.inProgressSince, settings))}.`}
            {stalledAfterWeeks ? ` Stories are flagged after ${weeks(stalledAfterWeeks)}.` : ""}
          </span>
        </p>
      )}
      {story.summary && <p className="esm-detail-summary">{story.summary}</p>}
      <dl className="esm-detail-context">
        <dt>Activity</dt>
        <dd>{activityTitle}</dd>
        <dt>Release</dt>
        <dd>{releaseTitle}</dd>
      </dl>
      {internal && !!story.history?.length && (
        <section className="esm-detail-section">
          <h4 id={`${panelId}-history`}>History</h4>
          <HistoryList entries={story.history} settings={settings} labelledBy={`${panelId}-history`} />
        </section>
      )}
      {hasEngineering && (
        <section className="esm-detail-section" aria-labelledby={`${panelId}-engineering`}>
          <h4 id={`${panelId}-engineering`}>Engineering</h4>
          {overview && (
            <a className="esm-overview-link" href={overview.href} aria-label={`Engineering overview for ${story.title} (opens in a new tab)`} {...newTab}>
              Engineering overview<NewTabHint />
            </a>
          )}
          {story.notes && <p className="esm-notes">{story.notes}</p>}
          {references.length > 0 && (
            <ul className="esm-sources" aria-label="Sources">
              {references.map((source, index) => (
                <li key={index}>
                  {source.href
                    ? <a href={source.href} {...newTab}><code>{source.label}</code><NewTabHint /></a>
                    : <code>{source.label}</code>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {internal && (story.lastEdit
        ? (
          <p className="esm-updater">
            Last updated <time dateTime={story.lastEdit.at} title={formatDate(story.lastEdit.at, settings)}>{formatRelative(story.lastEdit.at, settings)}</time>
            {story.lastEdit.by && ` by ${story.lastEdit.by}`}
          </p>
        )
        : story.updatedBy && <p className="esm-updater">Last updated by {story.updatedBy}</p>)}
    </div>
  );
}

function storyCount(count: number) {
  return `${count} ${count === 1 ? "story" : "stories"}`;
}

function CloseButton({ panelId }: { panelId: string }) {
  return (
    <button type="button" className="esm-close" aria-label="Close" autoFocus {...popoverTarget(panelId, "hide")}>
      <svg className="esm-icon" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <path d="m4 4 8 8M12 4l-8 8" />
      </svg>
    </button>
  );
}

function DraftLabel() {
  return <span className="esm-draft" title="Drafted by an agent and not yet confirmed">Draft</span>;
}

/** The first impact item, in one line under the release title. */
function ImpactLine({ impact }: { impact: ReleaseImpact[] }) {
  const [first] = impact;
  return (
    <span className="esm-release-impact">
      <span className="esm-impact-text">{`${first.metric}: ${first.expected}`}</span>
      {first.draft && <DraftLabel />}
      {impact.length > 1 && <span className="esm-impact-more">{`+${impact.length - 1} more`}</span>}
    </span>
  );
}

/** “3 of 5 stories shipped, 1 merged, 1 cut.” Cut stories have left the release, so they are not in the total. */
function releaseProgress(counts: Record<StoryStatus, number>) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (total === 0) return "No stories yet.";
  const kept = total - counts.cut;
  if (kept === 0) return `${storyCount(total)}, all cut.`;
  return [
    `${counts.shipped} of ${storyCount(kept)} shipped`,
    counts.merged && `${counts.merged} merged`,
    counts.blocked && `${counts.blocked} blocked`,
    counts.cut && `${counts.cut} cut`,
  ].filter(Boolean).join(", ") + ".";
}

function paragraphs(text: string) {
  return text.split(/\n[ \t]*\n/).map(paragraph => paragraph.trim()).filter(Boolean);
}

function ReleaseDetail({ release, panelId, stories, storyPanelIds, filtered }: {
  release: InternalReleaseLabel;
  panelId: string;
  /** The release’s stories that are on the board. */
  stories: InternalStoryCard[];
  storyPanelIds: Map<InternalStoryCard, string>;
  filtered: boolean;
}) {
  const titleId = `${panelId}-title`;
  const total = Object.values(release.storyCounts).reduce((sum, count) => sum + count, 0);
  const hidden = total - stories.length;
  const groups = storyStatuses.flatMap(status => {
    const matching = stories.filter(story => story.status === status);
    return matching.length ? [{ status, stories: matching }] : [];
  });

  return (
    <div className="esm-detail esm-release-detail" id={panelId} popover="auto" role="dialog" aria-labelledby={titleId}>
      <div className="esm-detail-head">
        <div>
          <p className="esm-card-id">Release</p>
          <h3 id={titleId}>{release.title}</h3>
        </div>
        <CloseButton panelId={panelId} />
      </div>
      {release.summary && <p className="esm-detail-summary">{release.summary}</p>}
      {release.notes && (
        <section className="esm-detail-section" aria-labelledby={`${panelId}-notes`}>
          <h4 id={`${panelId}-notes`}>Release notes</h4>
          {paragraphs(release.notes).map((paragraph, index) => <p className="esm-notes" key={index}>{paragraph}</p>)}
        </section>
      )}
      {!!release.impact?.length && (
        <section className="esm-detail-section" aria-labelledby={`${panelId}-impact`}>
          <h4 id={`${panelId}-impact`}>Expected impact</h4>
          <ul className="esm-impact">
            {release.impact.map((item, index) => (
              <li key={index}>
                <p className="esm-impact-metric">{item.metric}{item.draft && <DraftLabel />}</p>
                <dl className="esm-detail-context">
                  <dt>Expected</dt>
                  <dd>{item.expected}</dd>
                  {item.actual && <><dt>Actual</dt><dd>{item.actual}</dd></>}
                  {item.solves && <><dt>Solves</dt><dd>{item.solves}</dd></>}
                </dl>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="esm-detail-section" aria-labelledby={`${panelId}-stories`}>
        <h4 id={`${panelId}-stories`}>Stories</h4>
        <p className="esm-release-progress">{releaseProgress(release.storyCounts)}</p>
        {groups.map(group => (
          <div className="esm-release-group" key={group.status}>
            <h5><Status status={group.status} /></h5>
            <ul className="esm-release-stories">
              {group.stories.map(story => (
                <li key={story.id}>
                  <button type="button" className="esm-release-story" aria-haspopup="dialog" {...popoverTarget(storyPanelIds.get(story)!)}>
                    <span className="esm-card-id">{story.id}</span>
                    <span>{story.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {filtered && hidden > 0 && <p className="esm-release-hidden">{`${hidden} more hidden by the current filters.`}</p>}
      </section>
    </div>
  );
}

/**
 * Collapses a release lane to its header. CSS does the collapsing with :has(), so it works
 * without JavaScript; browsers without :has() never show the toggle. The value is the
 * release ID, which board.js uses to remember the choice.
 */
function ReleaseCollapse({ releaseId, title }: { releaseId: string; title: string }) {
  return (
    <label className="esm-collapse">
      <input type="checkbox" className="esm-collapse-input" value={releaseId} aria-label={`Collapse ${title}`} />
      <svg className="esm-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m4 6 4 4 4-4" />
      </svg>
    </label>
  );
}

/** Adds a query parameter to a URL that may be relative, keeping any fragment. */
function withParam(href: string, name: string, value: string) {
  const hash = href.indexOf("#");
  const [path, fragment] = hash === -1 ? [href, ""] : [href.slice(0, hash), href.slice(hash)];
  return `${path}${path.includes("?") ? "&" : "?"}${name}=${encodeURIComponent(value)}${fragment}`;
}

/**
 * An Export button that opens a menu of links to the host's export route. A
 * `<details>` element opens it, so it works without JavaScript. board.js keeps
 * `collapsed` in step with the lanes, and closes the menu on Escape or a click elsewhere.
 */
function ExportMenu({ href }: { href: string }) {
  const formats = [["vsdx", "Visio (.vsdx), for Lucidchart or Miro"], ["csv", "CSV"]] as const;
  return (
    <details className="esm-menu esm-export">
      <summary className="esm-button esm-menu-button">
        Export
        <svg className="esm-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m3 5 4 4 4-4" />
        </svg>
      </summary>
      <ul className="esm-menu-panel">
        {formats.map(([format, label]) => {
          const target = withParam(href, "format", format);
          return <li key={format}><a className="esm-export-link" href={target} data-esm-export={target} download>{label}</a></li>;
        })}
      </ul>
    </details>
  );
}

/** GitHub’s anchor for a changelog heading such as `## 0.4.1`. */
function changelogAnchor(version: string) {
  return version.toLowerCase().replace(/[^a-z0-9 _-]/g, "").replace(/ /g, "-");
}

/** The running version, licence and author. Internal viewers also get links. */
function VersionFooter({ internal }: { internal: boolean }) {
  const licenseUrl = `${storyMapRepositoryUrl}/blob/main/LICENSE`;
  return (
    <footer className="esm-footer">
      <span className="esm-version">Auto Story Map {storyMapVersion}</span>
      <span className="esm-author">
        {"By "}
        {internal && storyMapAuthor.url
          ? <a href={storyMapAuthor.url} {...newTab}>{storyMapAuthor.name}<NewTabHint /></a>
          : storyMapAuthor.name}
      </span>
      <span className="esm-license">
        {internal ? <a href={licenseUrl} {...newTab}>{storyMapLicense} licence<NewTabHint /></a> : `${storyMapLicense} licence`}
      </span>
      {internal && <>
        <span><a href={`${storyMapRepositoryUrl}/blob/main/CHANGELOG.md#${changelogAnchor(storyMapVersion)}`} {...newTab}>Changelog<NewTabHint /></a></span>
        <span><a href={storyMapRepositoryUrl} {...newTab}>Source code<NewTabHint /></a></span>
      </>}
    </footer>
  );
}

/** True when a filter narrows the board. Choosing every status shows every story, so it does not count. */
function isFiltering(filter: StoryMapView["filter"]) {
  const narrowsStatus = !!filter?.status && !storyStatuses.every(choice => filter.status!.includes(choice));
  return !!(filter && (filter.query || narrowsStatus || filter.changedWithinDays));
}

const statusFilterLabels: Record<StoryStatusFilter, string> = { ...storyStatusLabels, stalled: "Stalled" };

/** What the status button says: “Active” by default, “All statuses”, one or two names, or a count. */
function statusSummary(status: readonly StoryStatusFilter[] | undefined, internal: boolean) {
  if (!status) return internal ? "Active" : "All statuses";
  if (storyStatuses.every(choice => status.includes(choice))) return "All statuses";
  if (status.length <= 2) return status.map(choice => statusFilterLabels[choice]).join(", ");
  return `${status.length} statuses`;
}

/**
 * The status filter: a button that opens a list of checkboxes, one per status, plus
 * Stalled when the view flags stalled stories. A `<details>` element opens it, so it
 * works without JavaScript, and the form's Apply button submits it. board.js applies
 * the choice when the menu closes.
 */
function StatusMenu({ status, internal, stalled, hintId }: {
  status: readonly StoryStatusFilter[] | undefined;
  internal: boolean;
  stalled: boolean;
  hintId: string;
}) {
  const choices: readonly StoryStatusFilter[] = internal ? [...storyStatuses, ...(stalled ? ["stalled" as const] : [])] : customerStoryStatuses;
  const chosen = new Set<StoryStatusFilter>(status ?? (internal ? activeStoryStatuses : customerStoryStatuses));
  return (
    <details className="esm-menu esm-status-menu">
      <summary className="esm-select esm-menu-button" data-esm-focus="status" aria-describedby={hintId}>
        <span className="esm-visually-hidden">Status: </span>{statusSummary(status, internal)}
      </summary>
      <fieldset className="esm-menu-panel">
        <legend className="esm-visually-hidden">Show stories with these statuses</legend>
        {choices.map(choice => (
          <label key={choice} className="esm-menu-option">
            <input type="checkbox" name="status" value={choice} defaultChecked={chosen.has(choice)} />
            {statusFilterLabels[choice]}
          </label>
        ))}
      </fieldset>
    </details>
  );
}

function hiddenSummary({ blocked, cut }: { blocked: number; cut: number }) {
  return [blocked && `${blocked} blocked`, cut && `${cut} cut`].filter(Boolean).join(" and ");
}

function FilterToolbar({ filter, shown, preservedParams, showChanged, internal, stalledAfterWeeks, exportHref }: {
  filter: NonNullable<StoryMapView["filter"]>;
  shown: number;
  preservedParams?: Readonly<Record<string, string>>;
  showChanged: boolean;
  internal: boolean;
  stalledAfterWeeks?: number;
  /** Only passed for internal views. */
  exportHref?: string;
}) {
  const filtering = isFiltering(filter);
  const clearHref = `?${new URLSearchParams(preservedParams ?? {})}`;
  const showHiddenParams = new URLSearchParams(preservedParams ?? {});
  if (filter.query) showHiddenParams.set("q", filter.query);
  showHiddenParams.set("status", "all");
  if (filter.changedWithinDays) showHiddenParams.set("changed", `${filter.changedWithinDays}d`);
  // Empty unless the optional board.js script runs: it explains that the filters apply as soon as they change.
  const hintId = `${useId()}-filter-hint`;
  return (
    <>
      <div className="esm-toolbar">
        <p className="esm-toolbar-label">
          Journey map <span className="esm-toolbar-count">{storyCount(filter.total)}</span>
        </p>
        <form className="esm-filters" method="get" role="search" aria-label="Filter stories">
          {Object.entries(preservedParams ?? {}).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <label className="esm-search">
            <svg className="esm-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <circle cx="7" cy="7" r="4.6" />
              <path d="m10.5 10.5 3.5 3.5" />
            </svg>
            <input type="search" name="q" placeholder="Search stories" aria-label="Search stories" maxLength={100} defaultValue={filter.query ?? ""} />
          </label>
          <span className="esm-visually-hidden" id={hintId} data-esm-filter-hint="" />
          <StatusMenu status={filter.status} internal={internal} stalled={!!stalledAfterWeeks} hintId={hintId} />
          {showChanged && (
            <select
              className="esm-select"
              name="changed"
              aria-label="Filter by when stories were added or changed status"
              aria-describedby={hintId}
              defaultValue={filter.changedWithinDays ? `${filter.changedWithinDays}d` : ""}
            >
              <option value="">Changed any time</option>
              {changedWithinChoices.map(([days, label]) => <option key={days} value={`${days}d`}>{`Changed: ${label.toLowerCase()}`}</option>)}
            </select>
          )}
          <button type="submit" className="esm-button esm-apply">Apply</button>
          {exportHref && <ExportMenu href={exportHref} />}
        </form>
      </div>
      {(filtering || filter.hidden) && (
        <p className="esm-filter-results" role="status">
          {filtering && <>
            {shown === 0 ? "No stories match these filters." : `Showing ${shown} of ${storyCount(filter.total)}.`}{" "}
          </>}
          {filter.hidden && <>
            {`${hiddenSummary(filter.hidden)} hidden.`}{" "}
            <a href={`?${showHiddenParams}`}>Show them</a>{filtering && " · "}
          </>}
          {filtering && <a href={clearHref}>Clear filters</a>}
        </p>
      )}
    </>
  );
}

export function StoryMapBoard({
  map,
  sourceBaseUrl,
  theme = "light",
  preservedParams,
  locale = defaultLocale,
  timeZone,
  now,
  showVersion = true,
  exportHref,
}: StoryMapBoardProps) {
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const internal = map.audience === "internal";
  const stalledAfterWeeks = map.audience === "internal" ? map.stalledAfterWeeks : undefined;
  const filtering = isFiltering(map.filter);
  const settings = dateFormatters(locale, timeZone, now ?? new Date());

  const activityTitles = new Map(map.activities.map(activity => [activity.id, activity.title]));
  const releaseTitles = new Map(map.releases.map(release => [release.id, release.title]));
  const placed = (map.stories as InternalStoryCard[]).filter(story =>
    activityTitles.has(story.activity) && releaseTitles.has(story.release)
  );
  const panelIds = new Map(placed.map((story, index) => [story, `${baseId}-story-${index}`]));
  const internalReleases = map.audience === "internal" ? new Map(map.releases.map(release => [release.id, release])) : undefined;

  const cells = new Map<string, InternalStoryCard[]>();
  const releaseCounts = new Map<string, number>();
  for (const story of placed) {
    const key = `${story.release}:${story.activity}`;
    const cell = cells.get(key);
    if (cell) cell.push(story);
    else cells.set(key, [story]);
    releaseCounts.set(story.release, (releaseCounts.get(story.release) ?? 0) + 1);
  }
  const releases = filtering ? map.releases.filter(release => releaseCounts.has(release.id)) : map.releases;

  // Without filterStoryMapView, the board hides blocked and cut stories itself and offers a
  // checkbox to show them. CSS does the hiding, so it works without JavaScript and without
  // the host reading a query parameter. Browsers without :has() show every story.
  const inactive = { blocked: 0, cut: 0 };
  const activeCounts = new Map<string, number>();
  for (const story of placed) {
    if (isActiveStatus(story.status)) activeCounts.set(story.release, (activeCounts.get(story.release) ?? 0) + 1);
    else inactive[story.status as keyof typeof inactive]++;
  }
  const hideInactive = !map.filter && (inactive.blocked > 0 || inactive.cut > 0);
  const toggleId = `${baseId}-show-inactive`;
  const showGrid = releases.length > 0 && (placed.length > 0 || (internal && !filtering));

  return (
    <section className="esm-board" data-theme={theme} data-hide-inactive={hideInactive ? "" : undefined} aria-labelledby={headingId}>
      <header className="esm-header">
        <p className="esm-eyebrow">{internal ? "User story map" : "Roadmap"}</p>
        <h2 id={headingId}>{map.title}</h2>
        {map.audience === "internal" && map.recentUpdates
          ? <RecentUpdates updates={map.recentUpdates} settings={settings} />
          : map.summary && <p className="esm-goal">{map.summary}</p>}
        {/* Without the filter toolbar, the Export button goes in the header. */}
        {internal && exportHref && !map.filter && <ExportMenu href={exportHref} />}
      </header>
      <div className="esm-frame">
        {map.filter && (
          <FilterToolbar
            filter={map.filter}
            shown={placed.length}
            preservedParams={preservedParams}
            showChanged={internal && !!map.history}
            internal={internal}
            stalledAfterWeeks={stalledAfterWeeks}
            exportHref={internal ? exportHref : undefined}
          />
        )}
        {hideInactive && (
          <p className="esm-inactive-toggle">
            <input type="checkbox" className="esm-inactive-input" id={toggleId} />
            <label htmlFor={toggleId}>Show blocked and cut stories ({hiddenSummary(inactive)})</label>
          </p>
        )}
        {showGrid ? (
          <div className="esm-scroll" role="region" tabIndex={0} aria-label="Story map by release and activity">
            <div
              className="esm-grid"
              role="table"
              aria-label={`${map.title} by release and activity`}
              style={{ "--esm-columns": map.activities.length } as CSSProperties}
            >
              <div className="esm-row esm-activities" role="row">
                <div className="esm-corner" role="columnheader">Activities</div>
                {map.activities.map((activity, index) => (
                  <div className="esm-activity" role="columnheader" key={activity.id}>
                    <span className="esm-activity-title">{activity.title}</span>
                    {activity.summary && <span className="esm-activity-summary">{activity.summary}</span>}
                    {index < map.activities.length - 1 && (
                      <svg className="esm-icon esm-step" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m6 3.5 4.5 4.5L6 12.5" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
              {releases.map((release, laneIndex) => (
                <div className="esm-row esm-lane" role="row" data-lane={laneIndex % 3} key={release.id}>
                  <div className="esm-release" role="rowheader">
                    <ReleaseCollapse releaseId={release.id} title={release.title} />
                    <span className="esm-release-name">
                      <span className="esm-release-dot" aria-hidden="true" />
                      {internalReleases
                        ? <button type="button" className="esm-release-button" aria-haspopup="dialog" {...popoverTarget(`${baseId}-release-${laneIndex}`)}>{release.title}</button>
                        : release.title}
                    </span>
                    {release.summary && <span className="esm-release-summary">{release.summary}</span>}
                    {!!internalReleases?.get(release.id)?.impact?.length && <ImpactLine impact={internalReleases.get(release.id)!.impact!} />}
                    {hideInactive && (activeCounts.get(release.id) ?? 0) !== (releaseCounts.get(release.id) ?? 0) ? <>
                      <span className="esm-release-count esm-count-active">{storyCount(activeCounts.get(release.id) ?? 0)}</span>
                      <span className="esm-release-count esm-count-all">{storyCount(releaseCounts.get(release.id) ?? 0)}</span>
                    </> : <span className="esm-release-count">{storyCount(releaseCounts.get(release.id) ?? 0)}</span>}
                  </div>
                  {map.activities.map(activity => {
                    const stories = cells.get(`${release.id}:${activity.id}`) ?? [];
                    return (
                      <div
                        className="esm-cell"
                        role="cell"
                        data-empty={stories.length ? undefined : ""}
                        data-inactive-only={stories.length && stories.every(story => !isActiveStatus(story.status)) ? "" : undefined}
                        key={activity.id}
                      >
                        <span className="esm-cell-label" aria-hidden="true">{activity.title}</span>
                        {stories.map(story => (
                          <button
                            type="button"
                            className="esm-card"
                            aria-haspopup="dialog"
                            data-inactive={isActiveStatus(story.status) ? undefined : ""}
                            key={story.id}
                            {...popoverTarget(panelIds.get(story)!)}
                          >
                            {internal && <span className="esm-card-id">{story.id}</span>}
                            <span className="esm-card-title">{story.title}</span>
                            <span className="esm-card-meta">
                              <Status status={story.status} />
                              {internal && (story.stalled && story.inProgressSince
                                ? <StalledLabel since={story.inProgressSince} settings={settings} />
                                : story.lastChangedAt && <ChangedAt at={story.lastChangedAt} settings={settings} />)}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : !filtering && <p className="esm-empty">There are no stories to show yet.</p>}
      </div>
      {showVersion && <VersionFooter internal={internal} />}
      {placed.map(story => (
        <StoryDetail
          key={story.id}
          story={story}
          panelId={panelIds.get(story)!}
          activityTitle={activityTitles.get(story.activity)!}
          releaseTitle={releaseTitles.get(story.release)!}
          internal={internal}
          sourceBaseUrl={sourceBaseUrl}
          settings={settings}
          stalledAfterWeeks={stalledAfterWeeks}
        />
      ))}
      {internalReleases && showGrid && releases.map((release, index) => (
        <ReleaseDetail
          key={release.id}
          release={internalReleases.get(release.id)!}
          panelId={`${baseId}-release-${index}`}
          stories={placed.filter(story => story.release === release.id)}
          storyPanelIds={panelIds}
          filtered={!!map.filter}
        />
      ))}
    </section>
  );
}
