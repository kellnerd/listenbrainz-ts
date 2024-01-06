import type { Listen, Track } from "../listen.ts";
import { CsvParseStream } from "https://deno.land/std@0.210.0/csv/csv_parse_stream.ts";

/**
 * Parses a readable text stream from a `.scrobbler.log` file into listens.
 */
export async function* parseScrobblerLog(
  input: ReadableStream<string>,
): AsyncGenerator<Listen> {
  // `.scrobbler.log` is a TSV document with three header lines (= comments)
  const parser = new CsvParseStream({
    separator: "\t",
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

  const scrobbleStream = input.pipeThrough(parser);

  for await (const scrobble of scrobbleStream) {
    const track: Track = {
      artist_name: scrobble.artist_name,
      track_name: scrobble.track_name,
      additional_info: {},
    };
    const listen: Listen = {
      listened_at: parseInt(scrobble.timestamp),
      track_metadata: track,
    };

    const info = track.additional_info!;
    if (scrobble.release_name) track.release_name = scrobble.release_name;
    if (scrobble.recording_mbid) info.recording_mbid = scrobble.recording_mbid;
    if (scrobble.duration) info.duration = parseInt(scrobble.duration);
    if (scrobble.tracknumber) info.tracknumber = parseInt(scrobble.tracknumber);

    // Ignore skipped "S" scrobbles, only listened "L" scrobbles count.
    if (scrobble.rating === "S") continue;

    yield listen;
  }
}
