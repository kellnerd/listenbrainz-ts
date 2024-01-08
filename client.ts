import type { Listen, ListenSubmission, Track } from "./listen.ts";
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
 * ListenBrainz API client to submit listens.
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

  #submitListens(data: ListenSubmission) {
    return this.post("1/submit-listens", data);
  }

  /**
   * Fetches JSON data from the given `GET` endpoint.
   *
   * This method should only be directly called for unsupported endpoints.
   */
  async get(endpoint: string, query?: Record<string, string>): Promise<any> {
    const endpointUrl = new URL(endpoint, this.apiBaseUrl);
    if (query) {
      endpointUrl.search = new URLSearchParams(query).toString();
    }

    const response = await this.#request(
      new Request(endpointUrl, {
        method: "GET",
        headers: this.#headers,
      }),
      this.maxRetries,
    );

    return response.json();
  }

  /**
   * Sends the given JSON data to the given `POST` endpoint.
   *
   * This method should only be directly called for unsupported endpoints.
   */
  post(endpoint: string, json: any) {
    const endpointUrl = new URL(endpoint, this.apiBaseUrl);
    return this.#request(
      new Request(endpointUrl, {
        method: "POST",
        headers: this.#headers,
        body: JSON.stringify(json),
      }),
      this.maxRetries,
    );
  }

  async #request(input: Request | URL, retries = 0): Promise<Response> {
    await this.#rateLimitDelay;

    const response = await fetch(input);

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
      return this.#request(input, retries - 1);
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

/** Returns the current time in Unix seconds. */
function now(): number {
  return Math.floor(Date.now() / 1000);
}
