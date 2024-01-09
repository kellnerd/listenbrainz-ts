import type { Listen } from "./listen.ts";

/** URL query parameters. */
export type Query<T extends string | number = string> = Record<string, T>;

/** Options to limit the returned listens or feed events. */
export type LimitOptions = Partial<{
  /** Lower bound (exclusive) for Unix timestamps of the results. */
  min_ts: number;
  /** Upper bound (exclusive) for Unix timestamps of the results. */
  max_ts: number;
  /**
   * Desired number of results, defaults to [`DEFAULT_ITEMS_PER_GET`].
   * Maximum: [`MAX_ITEMS_PER_GET`].
   *
   * [`DEFAULT_ITEMS_PER_GET`]: https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#listenbrainz.webserver.views.api_tools.DEFAULT_ITEMS_PER_GET
   * [`MAX_ITEMS_PER_GET`]: https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#listenbrainz.webserver.views.api_tools.MAX_ITEMS_PER_GET
   */
  count: number;
}>;

/** JSON document which is returned by many endpoints. */
export type Payload<T> = {
  payload: T;
};

/** Payload which is returned by `1/user/<user_name>/listens`. */
export interface UserListens {
  /** Number of listens in the document. */
  count: number;
  /** MusicBrainz name of the user whose listens are being returned. */
  user_id: string;
  listens: Listen[];
  /** Timestamp of the latest listen in the document. */
  latest_listen_ts: number;
  /** Timestamp of the oldest listen in the document. */
  oldest_listen_ts: number;
}

/** Result which is returned by `1/search/users`. */
export interface UsersResult {
  users: Array<{
    user_name: string;
  }>;
}
