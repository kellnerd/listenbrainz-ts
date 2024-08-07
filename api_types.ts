/**
 * Type definitions for ListenBrainz API results.
 *
 * @module
 */

import type { InsertedListen, Track } from "./listen.ts";

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

/** Payload which is returned by `1/user/<user_name>/listens`. */
export interface UserListens {
  /** Number of listens in the document. */
  count: number;
  /** MusicBrainz name of the user whose listens are being returned. */
  user_id: string;
  /** Listens from the database. */
  listens: InsertedListen[];
  /** Timestamp of the latest listen by the user. */
  latest_listen_ts: number;
  /** Timestamp of the oldest listen by the user. */
  oldest_listen_ts: number;
}

/** Payload which is returned by `1/user/<user_name>/playing-now`. */
export interface UserPlayingNow {
  /** Number of listens in the document. */
  count: 0 | 1;
  /** MusicBrainz name of the user whose listens are being returned. */
  user_id: string;
  /** Listen which is playing now. */
  listens: [] | [{
    playing_now: true;
    track_metadata: Track;
  }];
  /** Indicates that the payload is a playing now listen. */
  playing_now: true;
}
