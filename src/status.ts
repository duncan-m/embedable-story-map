export const storyStatuses = ["planned", "in-progress", "merged", "shipped", "blocked", "cut"] as const;

export type StoryStatus = (typeof storyStatuses)[number];

/** A choice in the board's status filter: a status, or `stalled` for stories in progress for too long. */
export type StoryStatusFilter = StoryStatus | "stalled";

/** Statuses the board shows by default. Blocked and cut stories are hidden until a viewer asks for them. */
export const activeStoryStatuses = ["planned", "in-progress", "merged", "shipped"] as const satisfies readonly StoryStatus[];

/**
 * Statuses customers can see. A merged story is not available to them yet, so they see it as in progress.
 * Blocked and cut stories are never shown to customers.
 */
export const customerStoryStatuses = ["planned", "in-progress", "shipped"] as const satisfies readonly StoryStatus[];
export type CustomerStoryStatus = (typeof customerStoryStatuses)[number];

/** The status a customer sees for an active story: merged reads as in progress. */
export function customerStatus(status: StoryStatus): CustomerStoryStatus {
  return status === "merged" ? "in-progress" : status as CustomerStoryStatus;
}

/** Statuses for work that is not going ahead as planned. They are hidden by default and never shown to customers. */
export const inactiveStoryStatuses = ["blocked", "cut"] as const satisfies readonly StoryStatus[];

export function isActiveStatus(status: StoryStatus): boolean {
  return (activeStoryStatuses as readonly StoryStatus[]).includes(status);
}

export const storyStatusLabels: Record<StoryStatus, string> = {
  planned: "Planned",
  "in-progress": "In progress",
  merged: "Merged",
  shipped: "Shipped",
  blocked: "Blocked",
  cut: "Cut",
};
