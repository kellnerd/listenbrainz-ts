/**
 * Timestamp conversion utilities.
 *
 * @module
 */

/**
 * Converts the given date time string into a Unix timestamp.
 * If no value is passed, it returns the current timestamp.
 *
 * @param datetime Date time string which is accepted by `Date.parse()`.
 * Alternatively a `HH:mm` or `HH:mm:ss` time without date will be interpreted
 * as being today.
 *
 * @returns Timestamp in seconds since the Unix epoch.
 */
export function timestamp(datetime?: string): number {
  let date = datetime ? new Date(datetime) : new Date();
  if (isNaN(date.getTime())) { // invalid date
    const timeMatch = datetime!.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (timeMatch) {
      const [hours, minutes, seconds] = timeMatch.slice(1)
        .map((component) => parseInt(component ?? "0"));
      date = new Date(); // today
      date.setHours(hours, minutes, seconds);
    }
  }
  return Math.floor(date.getTime() / 1000);
}

/**
 * Takes a timestamp in seconds since the Unix epoch in local time (instead of
 * UTC as usual) and compensates the timezone offset.
 * Useful to convert timestamps from systems which are not timezone-aware and
 * can only handle timestamps in local time.
 *
 * @param localTimestamp Timestamp in seconds (clock in local time).
 *
 * @returns Timestamp in seconds since the Unix epoch.
 */
export function localTimestampToUtc(localTimestamp: number): number {
  const date = new Date(localTimestamp * 1000);
  const offsetMinutes = date.getTimezoneOffset();
  return localTimestamp + 60 * offsetMinutes;
}
