import { ListenSubmission, Track } from "./listen.ts";
import { delay } from "https://deno.land/std@0.210.0/async/delay.ts";

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
  constructor({
    userToken,
    apiUrl = "https://api.listenbrainz.org",
    maxRetries = 1,
  }: ClientOptions) {
    this.maxRetries = maxRetries;
    this.#headers = {
      "Authorization": `Token ${userToken}`,
      "Content-Type": "application/json",
    };
    this.#submissionUrl = new URL("/1/submit-listens", apiUrl);
  }

  /**
   * Submits a listen for the given track.
   *
   * @param listenedAt - Playback start time of the track (Unix time in seconds).
   * Defaults to the current time if not specified.
   */
  listen(track: Track, listenedAt = now()) {
    return this.submitListens({
      listen_type: "single",
      payload: [{
        listened_at: listenedAt,
        track_metadata: track,
      }],
    });
  }

  /** Submits a playing now notification for the given track. */
  playingNow(track: Track) {
    return this.submitListens({
      listen_type: "playing_now",
      payload: [{ track_metadata: track }],
    });
  }

  /** Submits the given listening data. */
  submitListens(data: ListenSubmission) {
    return this.#request(
      new Request(this.#submissionUrl, {
        method: "POST",
        headers: this.#headers,
        body: JSON.stringify(data),
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

  maxRetries: number;
  #headers: HeadersInit;
  #rateLimitDelay = Promise.resolve();
  #submissionUrl: URL;
}

/** Returns the current time in Unix seconds. */
function now(): number {
  return Math.floor(Date.now() / 1000);
}
