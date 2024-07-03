import { assert } from "@std/assert/assert";
import type { Release } from "jsr:@kellnerd/musicbrainz@^0.1.2";
import { joinArtistCredit } from "jsr:@kellnerd/musicbrainz@^0.1.3/utils/artist";
import {
  filterTrackRange,
  TrackRange,
} from "jsr:@kellnerd/musicbrainz@^0.1.3/utils/track";
import type { Listen } from "../listen.ts";

/** Options for the MusicBrainz parser, either start or end time is required. */
export interface MusicBrainzListenOptions {
  /** Unix time when the first track was listened to. */
  startTime?: number;
  /** Unix time when the last track finished playing. */
  endTime?: number;
  /** Range of tracks which were listened to, defaults to all. */
  tracks?: TrackRange;
}

/** Parses listens for tracks from a MusicBrainz release API response. */
export function parseMusicBrainzRelease(
  release: Release<"recordings" | "artist-credits">,
  options: MusicBrainzListenOptions,
): Listen[] {
  const { startTime, endTime } = options;
  assert(
    startTime && !endTime || !startTime && endTime,
    "Either start or end time is required and both are mutually exclusive",
  );
  const trackRange = options.tracks ?? {};
  const targetMedium = trackRange.medium;
  let totalDurationMs = 0;
  const media = release.media.map((medium) => {
    if (!medium.tracks || (targetMedium && medium.position !== targetMedium)) {
      return { ...medium, tracks: [] };
    }
    const tracks = filterTrackRange(medium.tracks, trackRange);
    if (!startTime) {
      const trackLengths = tracks
        .map((track) => track.length ?? track.recording.length);
      assert(
        trackLengths.every((length) => length !== null),
        "Unknown track length, can not calculate start time of the first listen",
      );
      totalDurationMs += (trackLengths as number[]).reduce((a, b) => a + b, 0);
    }
    return { ...medium, tracks };
  });

  let trackStartTime = startTime ?? endTime! - totalDurationMs / 1000;
  let lastDurationMs: number | null = 0;
  return media.flatMap((medium) =>
    medium.tracks.map((track) => {
      assert(
        lastDurationMs !== null,
        "Unknown track length, can not calculate start time of the next listen",
      );
      trackStartTime += lastDurationMs / 1000;

      const { recording } = track;
      const durationMs = track.length ?? recording.length;
      const listen: Listen = {
        listened_at: Math.round(trackStartTime),
        track_metadata: {
          track_name: recording.title,
          artist_name: joinArtistCredit(recording["artist-credit"]),
          release_name: release.title,
          additional_info: {
            discnumber: medium.position,
            tracknumber: track.number,
            recording_mbid: recording.id,
            artist_mbids: recording["artist-credit"].map((ac) => ac.artist.id),
            release_mbid: release.id,
          },
        },
      };

      if (durationMs) {
        listen.track_metadata.additional_info!.duration_ms = durationMs;
      }
      lastDurationMs = durationMs;

      return listen;
    })
  );
}
