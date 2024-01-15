import type {
  LimitOptions,
  UserListens,
  UserPlayingNow,
} from "./api_types.ts";
import { ApiError, isError } from "./error.ts";
import type {
  Listen,
  ListenSubmission,
  Track,
  UniqueListen,
} from "./listen.ts";
import { assert } from "https://deno.land/std@0.210.0/assert/assert.ts";
import { delay } from "https://deno.land/std@0.210.0/async/delay.ts";
import { validate } from "https://deno.land/std@0.210.0/uuid/v4.ts";

/** ListenBrainz API client configuration options. */
export interface ClientOptions {
  /** User token, a unique alphanumeric string linked to a user account. */
  userToken: string;
  /** Root URL of the ListenBrainz API. Only useful with a custom server. */
  apiUrl?: string;
  /** Maximum number of times a failed request is repeated. */
  maxRetries?: number;
}

/**
 * ListenBrainz API client to submit listens and request data.
 *
 * You have to specify a user token which you can obtain from your [profile].
 *
 * [profile]: https://listenbrainz.org/profile/
 *
 * @example
 * ```ts
 * const client = new ListenBrainzClient({ userToken: Deno.env.get("LB_TOKEN") });
 * await client.playingNow({ artist_name: "John Doe", track_name: "Love Song" });
 * ```
 */
export class ListenBrainzClient {
  constructor(options: ClientOptions) {
    this.apiBaseUrl = options.apiUrl ?? "https://api.listenbrainz.org/";
    this.maxRetries = options.maxRetries ?? 1;

    assert(validate(options.userToken), "No valid user token has been passed");
    this.#headers = {
      "Authorization": `Token ${options.userToken}`,
      "Content-Type": "application/json",
    };
  }

  /** Imports the given listens. */
  import(listens: Listen[]) {
    return this.#submitListens({ listen_type: "import", payload: listens });
  }

  /**
   * Submits a listen for the given track.
   *
   * @param track Metadata of the track.
   * @param listenedAt Playback start time of the track (Unix time in seconds).
   * Defaults to the current time if not specified.
   */
  listen(track: Track, listenedAt?: number) {
    return this.#submitListens({
      listen_type: "single",
      payload: [{
        listened_at: listenedAt ?? now(),
        track_metadata: track,
      }],
    });
  }

  /** Submits a playing now notification for the given track. */
  playingNow(track: Track) {
    return this.#submitListens({
      listen_type: "playing_now",
      payload: [{ track_metadata: track }],
    });
  }

  async #submitListens(data: ListenSubmission) {
    await this.post("1/submit-listens", data);
  }

  /**
   * Deletes a particular listen from a user’s listen history.
   *
   * The listen is not deleted immediately, but is scheduled for deletion,
   * which usually happens shortly after the hour.
   */
  async deleteListen(listen: UniqueListen) {
    await this.post("1/delete-listen", {
      listened_at: listen.listened_at,
      recording_msid: listen.recording_msid,
    });
  }

  /** Gets the number of listens for the given user. */
  async getListenCount(userName: string): Promise<number> {
    const { payload } = await this.get(
      `1/user/${encodeURIComponent(userName)}/listen-count`,
    ) as Payload<{ count: number }>;
    return payload.count;
  }

  /**
   * Gets listens for the given user.
   *
   * If no options are given, the most recent listens will be returned.
   * The optional `max_ts` and `min_ts` timestamps control at which point in
   * time to start or stop returning listens.
   * Listens are always returned in descending timestamp order.
   */
  async getListens(
    userName: string,
    options?: LimitOptions,
  ): Promise<UserListens> {
    const { payload } = await this.get(
      `1/user/${encodeURIComponent(userName)}/listens`,
      options,
    ) as Payload<UserListens>;
    return payload;
  }

  /** Gets the listen being played right now for the given user. */
  async getPlayingNow(userName: string): Promise<UserPlayingNow> {
    const { payload } = await this.get(
      `1/user/${encodeURIComponent(userName)}/playing-now`,
    ) as Payload<UserPlayingNow>;
    return payload;
  }

  /** Searches a ListenBrainz-registered user and returns a list of names. */
  async searchUsers(searchTerm: string): Promise<string[]> {
    const { users } = await this.get("1/search/users", {
      search_term: searchTerm,
    }) as { users: Array<{ user_name: string }> };
    return users.map((user) => user.user_name);
  }

  /**
   * Fetches JSON data from the given `GET` endpoint.
   *
   * This method should only be directly called for unsupported endpoints.
   */
  // deno-lint-ignore no-explicit-any
  async get(endpoint: string, query?: Query<string | number>): Promise<any> {
    const endpointUrl = new URL(endpoint, this.apiBaseUrl);
    if (query) {
      // Hack to make TS accept query values of type `number`.
      // https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1568
      endpointUrl.search = new URLSearchParams(query as Query).toString();
    }

    const response = await this.#request(endpointUrl, {
      method: "GET",
      headers: this.#headers,
    }, this.maxRetries);

    const data = await response.json();
    if (isError(data)) {
      throw new ApiError(data.error, data.code);
    } else {
      return data;
    }
  }

  /**
   * Sends the given JSON data to the given `POST` endpoint.
   *
   * This method should only be directly called for unsupported endpoints.
   */
  // deno-lint-ignore no-explicit-any
  async post(endpoint: string, json: any): Promise<any> {
    const endpointUrl = new URL(endpoint, this.apiBaseUrl);
    const response = await this.#request(endpointUrl, {
      method: "POST",
      headers: this.#headers,
      body: JSON.stringify(json),
    }, this.maxRetries);

    const data = await response.json();
    if (isError(data)) {
      throw new ApiError(data.error, data.code);
    } else {
      return data;
    }
  }

  async #request(url: URL, init?: RequestInit, retries = 0): Promise<Response> {
    await this.#rateLimitDelay;

    const response = await fetch(url, init);

    /** Number of requests remaining in current time window. */
    const remainingRequests = response.headers.get("X-RateLimit-Remaining");
    if (remainingRequests && parseInt(remainingRequests) === 0) {
      /** Number of seconds when current time window expires. */
      const rateLimitDelay = response.headers.get("X-RateLimit-Reset-In");
      if (rateLimitDelay) {
        this.#rateLimitDelay = delay(1000 * parseInt(rateLimitDelay));
      }
    }

    // Repeat if failed for "429: Too Many Requests"
    if (retries > 0 && response.status === 429) {
      return this.#request(url, init, retries - 1);
    }

    return response;
  }

  /** Base URL of the ListenBrainz API endpoints. */
  apiBaseUrl: string;
  /** Maximum number of times a failed request is repeated. */
  maxRetries: number;
  #headers: HeadersInit;
  #rateLimitDelay = Promise.resolve();
}

/** URL query parameters. */
export type Query<T extends string | number = string> = Record<string, T>;

/** JSON document which is returned by many endpoints. */
type Payload<T> = {
  payload: T;
};

/** Returns the current time in Unix seconds. */
function now(): number {
  return Math.floor(Date.now() / 1000);
}
