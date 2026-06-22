/** Keyset pagination over sortable ULID ids. */
import type { Paginated } from '@hyro/core';

/**
 * Given `limit + 1` rows fetched in descending id order, split into the page and a
 * forward cursor. The cursor is simply the last returned id.
 */
export function paginate<T extends { id: string }>(rows: T[], limit: number): Paginated<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return { items, nextCursor: hasMore && last ? last.id : null };
}

/** SQL fragment + params for a descending keyset page filtered by an optional cursor. */
export function keysetClause(cursor: string | undefined, paramIndex: number): {
  clause: string;
  param: string | null;
} {
  if (!cursor) return { clause: '', param: null };
  return { clause: ` AND id < $${paramIndex}`, param: cursor };
}
