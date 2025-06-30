/**
 * Listen parser and types for Spotify Extended Streaming History JSON files.
 *
 * @module
 */

import type { Listen } from "../listen.ts";
import { timestamp } from "../timestamp.ts";

/** Options for the Spotify parser. */
export interface SpotifyParserOptions {
  /** Listens include additional info properties which might help with debugging. */
  includeDebugInfo?: boolean;
  /** Hook which is called for an invalid Spotify stream item. */
  onInvalidItem?: (item: SpotifyStream, index: number, reason: string) => void;
}

/**
 * Parses the content from a Spotify Extended Streaming History JSON file.
 *
 * Accepts a serialized array of Spotify streams as input.
 *
 * Also yields skipped listens which should generally not be submitted.
 * These can be detected by their `track_metadata.additional_info` attributes
 * `skipped`, `reason_end` and a too short `duration_ms`.
 */
export function* parseSpotifyExtendedHistory(
  input: string,
  options: SpotifyParserOptions = {},
): Generator<Listen> {
  const json = JSON.parse(input);

  if (!Array.isArray(json)) {
    throw new Error("Spotify JSON is supposed to be an array");
  }

  let index = 0;
  for (const stream of json) {
    if (!isSpotifyStream(stream)) {
      throw new TypeError(`Item at index ${index} is no Spotify stream`);
    } else if (stream.spotify_episode_uri) {
      // Podcast episodes are not supported by ListenBrainz
      options.onInvalidItem?.(stream, index, "Item is a podcast episode");
      continue;
    } else if (
      !(stream.master_metadata_track_name &&
        stream.master_metadata_album_artist_name)
    ) {
      options.onInvalidItem?.(
        stream,
        index,
        "Track has no artist and/or title",
      );
      continue;
    }

    const spotifyUrl = spotifyUriToUrl(stream.spotify_track_uri).href;
    const endTime = timestamp(stream.ts);
    const calculatedStartTime = Math.round(endTime - stream.ms_played / 1000);

    /**
     * First use the calculated start timestamp (end time minus playback duration).
     *
     * In some cases this time is completely inaccurate because the logged end
     * timestamp is wrong and does not indicate when the track stopped playing.
     * It appears to be the next time when Spotify was opened again after the
     * app or the web player had been closed unexpectedly (`"unexpected-exit"`).
     *
     * In those cases the so called "offline" timestamp has proven to be useful
     * as an alternative value to be considered.
     * Despite its name, it is not exclusively used to track offline playback.
     * While it seems to be a few (usually -3 to 1) seconds off in general, it
     * is pretty accurate for those cases where the logged end time is bogus.
     */
    let startTime = calculatedStartTime;
    let offlineTime = stream.offline_timestamp;

    // Timestamp sometimes stored in milliseconds, convert those to seconds.
    if (offlineTime > 1e11) {
      offlineTime = Math.round(offlineTime / 1000);
    } else if (offlineTime < spotifyLaunchTime) {
      // Older exports may have a meaningless value of `1` (that is 1970), ignore it.
      offlineTime = 0;
    }

    // Find outliers by calculating the delay between two alternative timestamps.
    const offlineTimeDelay = offlineTime && (offlineTime - calculatedStartTime);

    // Use offline timestamp if it is present and the calculated delay is large.
    if (offlineTime && Math.abs(offlineTimeDelay) > 10) {
      startTime = offlineTime;
    }

    const listen: Listen = {
      listened_at: startTime,
      track_metadata: {
        artist_name: stream.master_metadata_album_artist_name,
        track_name: stream.master_metadata_track_name,
        release_name: stream.master_metadata_album_album_name ?? undefined,
        additional_info: {
          duration_ms: stream.ms_played,
          music_service: "spotify.com",
          spotify_id: spotifyUrl,
          origin_url: spotifyUrl,
          // Additional fields for filtering, might be removed in a later version.
          reason_start: stream.reason_start,
          reason_end: stream.reason_end,
          skipped: stream.skipped,
          incognito_mode: stream.incognito_mode,
        },
      },
    };

    if (options.includeDebugInfo) {
      const info = listen.track_metadata.additional_info!;
      info.playing_stopped_date = stream.ts;
      info.playing_stopped_ts = endTime;
      info.offline = stream.offline;
      info.offline_ts = stream.offline_timestamp;
      info.offline_ts_delay = offlineTimeDelay;
    }

    yield listen;
    index++;
  }
}

/** Stream item from a Spotify Extended Streaming History JSON file. */
export interface SpotifyStream {
  /** Timestamp indicating when the track stopped playing in UTC (JSON date). */
  ts: string;
  /** Spotify username. */
  username: string;
  /** Platform used when streaming the track (e.g. Android OS). */
  platform: string;
  /** Number of milliseconds the stream was played. */
  ms_played: number;
  /** Country code of the country where the stream was played (e.g. SE). */
  conn_country: string;
  /** IP address (v4 or v6) logged when streaming the track. */
  ip_addr_decrypted: string;
  /** User agent (URL-encoded) used when streaming the track (e.g. a browser). */
  user_agent_decrypted: string | null;
  /** Name of the track. */
  master_metadata_track_name: string | null;
  /** Name of the artist, band or podcast. */
  master_metadata_album_artist_name: string | null;
  /** Name of the album of the track. */
  master_metadata_album_album_name: string | null;
  /** Spotify track URI, in the form of `spotify:track:<base-62-id>`. */
  spotify_track_uri: string;
  /** Name of the episode of the podcast. */
  episode_name: string | null;
  /** Name of the show of the podcast. */
  episode_show_name: string | null;
  /** Spotify episode URI, in the form of `spotify:episode:<base-62-id>`. */
  spotify_episode_uri: string | null;
  /** Value telling why the track started (e.g. “trackdone”). */
  reason_start:
    | SpotifyStreamReason
    | "clickrow"
    | "appload"
    | string;
  /** Value telling why the track ended (e.g. “endplay”). */
  reason_end:
    | SpotifyStreamReason
    | "endplay"
    // For the following 3 reasons, "offline" timestamp seems to be more accurate:
    | "logout"
    | "unexpected-exit" // still playing
    | "unexpected-exit-while-paused"
    | string
    | null; // for older listens
  /** Indicates if shuffle mode was used when playing the track. */
  shuffle: null | true | false;
  /** Indicates if the user skipped to the next song. */
  skipped: null | true | false;
  /** Indicates whether the track was played in offline mode or not. */
  offline: null | true | false;
  /** Timestamp of when offline mode was used, if used. */
  offline_timestamp: number;
  /** Indicates whether the track was played in incognito mode or not. */
  incognito_mode: null | true | false;
}

/** Reasons why a Spotify stream started or ended. */
export type SpotifyStreamReason =
  | "trackdone"
  | "fwdbtn"
  | "playbtn"
  | "backbtn"
  | "remote"
  | "trackerror"
  | "unknown";

/** Checks whether the given JSON is a Spotify stream. */
// deno-lint-ignore no-explicit-any
export function isSpotifyStream(json: any): json is SpotifyStream {
  return typeof json.ts === "string" && json.spotify_track_uri !== undefined;
}

/** URL pattern of a Spotify URI, in the form of `spotify:<type>:<base-62-id>`. */
export const spotifyUriPattern: URLPattern = new URLPattern(
  String.raw`spotify::type([a-z]+)\::id([A-Za-z0-9]+)`,
);

/** Timestamp of Spotify's launch, listens should be no older than that. */
export const spotifyLaunchTime: number = timestamp("2008-10");

/** Constructs a Spotify URL from the given Spotify URI. */
export function spotifyUriToUrl(
  uri: string,
  base = "https://open.spotify.com",
): URL {
  const match = spotifyUriPattern.exec(uri)?.pathname.groups;
  if (match) {
    return new URL([match.type, match.id].join("/"), base);
  } else {
    throw new Error(`Invalid Spotify URI "${uri}"`);
  }
}
