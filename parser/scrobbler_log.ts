import type { Listen, Track } from "../listen.ts";
import { localTimestampToUtc } from "../timestamp.ts";
import { assert } from "@std/assert/assert";
import { CsvParseStream } from "@std/csv/parse-stream";
import { LimitedTransformStream } from "@std/streams/limited-transform-stream";
import { TextLineStream } from "@std/streams/text-line-stream";

/**
 * Parses a readable text stream from a `.scrobbler.log` file into listens.
 *
 * Also yields skipped listens (`"S"`) which should generally not be submitted.
 * These are marked with `track_metadata.additional_info.skipped = true`.
 */
export async function* parseScrobblerLog(
  input: ReadableStream<string>,
): AsyncGenerator<Listen> {
  // We do not want to consume chunks of the main content while parsing the header.
  const [header, content] = input.tee();

  // Parse the first three lines as headers.
  const headerLineStream = header
    .pipeThrough(new TextLineStream())
    .pipeThrough(new LimitedTransformStream(3));
  const headers: Record<string, string> = Object.fromEntries(
    (await Array.fromAsync(headerLineStream))
      .filter((line) => /^#.+\/.+/.test(line))
      .map((line) => line.split("/")),
  );

  // Validate header, check might be loosened if other formats are also supported.
  assert(
    headers["#AUDIOSCROBBLER"] === "1.1" && headers["#TZ"] === "UNKNOWN",
    "Input does not have the expected .scrobbler.log header lines",
  );

  // Drop revision placeholder which can be found in files written by Rockbox.
  const player = headers["#CLIENT"]?.replace(" $Revision$", "");

  // Parse the main content of the TSV document, headers are skipped as comments.
  const parser = new CsvParseStream({
    separator: "\t",
    lazyQuotes: true,
    comment: "#",
    columns: [
      "artist_name",
      "release_name",
      "track_name",
      "tracknumber",
      "duration",
      "rating",
      "timestamp",
      "recording_mbid",
    ],
  });
  const scrobbleStream = content.pipeThrough(parser);

  for await (const scrobble of scrobbleStream) {
    const track: Track = {
      artist_name: scrobble.artist_name,
      track_name: scrobble.track_name,
      additional_info: {},
    };
    const listen: Listen = {
      listened_at: localTimestampToUtc(parseInt(scrobble.timestamp)),
      track_metadata: track,
    };

    const info = track.additional_info!;
    if (scrobble.release_name) track.release_name = scrobble.release_name;
    if (scrobble.recording_mbid) info.recording_mbid = scrobble.recording_mbid;
    if (scrobble.duration) info.duration = parseInt(scrobble.duration);
    if (scrobble.tracknumber) info.tracknumber = scrobble.tracknumber;
    if (player) info.media_player = player;
    if (scrobble.rating === "S") info.skipped = true;

    yield listen;
  }
}
