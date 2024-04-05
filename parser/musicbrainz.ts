import { assert } from "https://deno.land/std@0.210.0/assert/assert.ts";
import type { Release } from "jsr:@kellnerd/musicbrainz@^0.1.2";
import { joinArtistCredit } from "jsr:@kellnerd/musicbrainz@^0.1.3/utils/artist";
import {
  filterTrackRange,
  TrackRange,
} from "jsr:@kellnerd/musicbrainz@^0.1.3/utils/track";
import type { Listen } from "../listen.ts";

/** Options for the MusicBrainz parser. */
export interface MusicBrainzListenOptions {
  /** Unix time when the first track was listened to. */
  startTime: number;
  /** Range of tracks which were listened to, defaults to all. */
  tracks?: TrackRange;
}

/** Parses listens for tracks from a MusicBrainz release API response. */
export function parseMusicBrainzRelease(
  release: Release<"recordings" | "artist-credits">,
  options: MusicBrainzListenOptions,
): Listen[] {
  const trackRange = options.tracks ?? {};
  const targetMedium = trackRange.medium;
  const media = release.media.map((medium) => {
    if (!medium.tracks || (targetMedium && medium.position !== targetMedium)) {
      return { ...medium, tracks: [] };
    }
    return { ...medium, tracks: filterTrackRange(medium.tracks, trackRange) };
  });

  let { startTime } = options;
  let lastDurationMs: number | null = 0;
  return media.flatMap((medium) =>
    medium.tracks.map((track) => {
      assert(
        lastDurationMs !== null,
        "Unknown track length, can not calculate start time of the next listen",
      );
      startTime += lastDurationMs / 1000;

      const { recording } = track;
      const durationMs = track.length ?? recording.length;
      const listen: Listen = {
        listened_at: Math.round(startTime),
        track_metadata: {
          track_name: recording.title,
          artist_name: joinArtistCredit(recording["artist-credit"]),
          release_name: release.title,
          additional_info: {
            discnumber: medium.position,
            tracknumber: track.position,
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
