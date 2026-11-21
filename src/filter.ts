import { activeStoryStatuses, customerStoryStatuses, isActiveStatus, storyStatuses, type StoryStatusFilter } from "./status.js";
import type { InternalStoryCard, StoryMapView } from "./view.js";

/** Windows offered by the board’s “Changed in” filter, in days. */
export const changedWithinOptions = [1, 7, 14, 30] as const;
export type ChangedWithinDays = (typeof changedWithinOptions)[number];

export interface StoryMapFilters {
  query?: string;
  /**
   * The statuses to show. A story is kept when its status is chosen, or when
   * `stalled` is chosen and the story is stalled. `all` chooses every status.
   * When absent or empty, only active stories (planned, in progress, merged and
   * shipped) are kept, and blocked and cut stories are hidden.
   */
  status?: StoryStatusFilter | "all" | readonly StoryStatusFilter[];
  /** Only stories added or changed in this many days. Needs history and an internal view. */
  changedWithinDays?: ChangedWithinDays;
}

export interface FilterOptions {
  /** Time to measure “changed in” windows from. Defaults to now. */
  now?: Date;
}

const maxQueryLength = 100;
const dayMs = 24 * 60 * 60 * 1000;

const statusChoices: readonly StoryStatusFilter[] = [...storyStatuses, "stalled"];

/** The chosen statuses, in board order, without duplicates or unknown values. `all` means every status. */
function readStatuses(value: unknown): StoryStatusFilter[] {
  const values: unknown[] = Array.isArray(value) ? value : [value];
  if (values.includes("all")) return [...storyStatuses];
  return statusChoices.filter(choice => values.includes(choice));
}

/**
 * Reads the board’s `q`, `status` and `changed` (`1d`, `7d`, `14d` or `30d`)
 * parameters. `status` can repeat, once for each chosen status or `stalled`,
 * and `status=all` chooses every status. Unknown values are ignored.
 */
export function readStoryMapFilters(params: URLSearchParams): StoryMapFilters {
  const query = params.get("q")?.trim().slice(0, maxQueryLength) || undefined;
  const chosen = readStatuses(params.getAll("status"));
  const status = chosen.length ? chosen : undefined;
  const changed = /^(\d+)d$/.exec(params.get("changed") ?? "")?.[1];
  const changedWithinDays = changedWithinOptions.find(days => String(days) === changed);
  return { query, status, ...(changedWithinDays ? { changedWithinDays } : {}) };
}

/**
 * Narrows a projected view to the stories that match the filters. Call it after
 * `getStoryMapForViewer`, so searches only see what the viewer is allowed to see.
 * Without a status filter, or when it chooses exactly the default statuses, blocked
 * and cut stories are hidden and counted in `filter.hidden`. The “changed in” and
 * `stalled` filters apply only to internal views with history; otherwise they are ignored.
 */
export function filterStoryMapView<View extends StoryMapView>(
  view: View,
  filters: StoryMapFilters = {},
  options: FilterOptions = {},
): View {
  const query = filters.query?.trim().slice(0, maxQueryLength) || undefined;
  const needle = query?.toLocaleLowerCase();
  const internal = view.audience === "internal";
  // Customers only see their own statuses, and every one of them by default.
  const offered = internal ? statusChoices.filter(choice => choice !== "stalled" || view.stalledAfterWeeks) : customerStoryStatuses;
  const defaults: readonly StoryStatusFilter[] = internal ? activeStoryStatuses : customerStoryStatuses;
  const requested = readStatuses(filters.status).filter(choice => offered.includes(choice as never));
  const isDefault = requested.length === defaults.length && defaults.every(choice => requested.includes(choice));
  const status = requested.length && !isDefault ? requested : undefined;
  const chosen = new Set<StoryStatusFilter>(status ?? defaults);
  const changedWithinDays = internal && view.history && changedWithinOptions.includes(filters.changedWithinDays!)
    ? filters.changedWithinDays
    : undefined;
  const since = changedWithinDays ? (options.now ?? new Date()).getTime() - changedWithinDays * dayMs : undefined;

  const hidden = { blocked: 0, cut: 0 };
  const stories = (view.stories as InternalStoryCard[]).filter(story => {
    if (status && !chosen.has(story.status) && !(chosen.has("stalled") && story.stalled)) return false;
    if (since !== undefined && !(story.lastChangedAt && Date.parse(story.lastChangedAt) >= since)) return false;
    if (needle) {
      const fields = internal
        ? [story.id, story.title, story.summary, story.notes, story.statusReason]
        : [story.title, story.summary];
      if (!fields.some(field => field?.toLocaleLowerCase().includes(needle))) return false;
    }
    if (!status && !isActiveStatus(story.status)) {
      hidden[story.status as keyof typeof hidden]++;
      return false;
    }
    return true;
  });

  return {
    ...view,
    stories,
    filter: {
      query,
      status,
      ...(changedWithinDays ? { changedWithinDays } : {}),
      total: view.stories.length,
      ...(hidden.blocked || hidden.cut ? { hidden } : {}),
    },
  };
}
