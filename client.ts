import { ListenSubmission } from "./listen.ts";
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
