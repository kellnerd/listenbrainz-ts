/** Error which was caused by a ListenBrainz API call. */
export class ApiError extends Error {
  name = "ApiError";
  /** HTTP status code which was returned by the API. */
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode ?? 500;
  }
}

/** Error response which is returned by the ListenBrainz API. */
export interface ErrorResponse {
  /** HTTP status code. */
  code: number;
  /** Error message with a description. */
  error: string;
}

/** Checks whether the given JSON is an error response. */
// deno-lint-ignore no-explicit-any
export function isError(json: any): json is ErrorResponse {
  return json.error && json.code;
}
