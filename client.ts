import { ListenSubmission, Track } from "./listen.ts";
import { delay } from "https://deno.land/std@0.210.0/async/delay.ts";

export interface ClientOptions {
  /** User token, a unique alphanumeric string linked to a user account. */
  userToken: string;
  /** Root URL of the ListenBrainz API. Only useful with a custom server. */
  apiUrl?: string;
}

/**
 * ListenBrainz API client to submit listens.
 */
export class ListenBrainzClient {
  constructor({
    userToken,
    apiUrl = "https://api.listenbrainz.org",
  }: ClientOptions) {
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

  /** Submits the given listen data. */
  submitListens(data: ListenSubmission) {
    return this.#request(this.#submissionUrl, {
      method: "POST",
      headers: this.#headers,
      body: JSON.stringify(data),
    });
  }

  async #request(...params: Parameters<typeof fetch>): Promise<Response> {
    await this.#rateLimitDelay;

    const response = await fetch(...params);

    /** Number of requests remaining in current time window. */
    const remainingRequests = response.headers.get("X-RateLimit-Remaining");
    if (remainingRequests && parseInt(remainingRequests) === 0) {
      /** Number of seconds when current time window expires. */
      const rateLimitDelay = response.headers.get("X-RateLimit-Reset-In");
      if (rateLimitDelay) {
        this.#rateLimitDelay = delay(1000 * parseInt(rateLimitDelay));
      }
    }

    return response;
  }

  #headers: HeadersInit;
  #rateLimitDelay = Promise.resolve();
  #submissionUrl: URL;
}

/** Returns the current time in Unix seconds. */
function now(): number {
  return Math.floor(Date.now() / 1000);
}
