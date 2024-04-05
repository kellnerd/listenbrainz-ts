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
  const tracks = release.media.flatMap((medium) => {
    if (!medium.tracks || (targetMedium && medium.position !== targetMedium)) {
      return [];
    }
    return filterTrackRange(medium.tracks, trackRange);
  });
  const lastTrackIndex = tracks.length - 1;

  let { startTime } = options;
  return tracks.map((track, index) => {
    const durationMs = track.length ?? track.recording.length;
    const listen: Listen = {
      listened_at: Math.round(startTime),
      track_metadata: {
        track_name: track.title,
        artist_name: joinArtistCredit(track["artist-credit"]),
        release_name: release.title,
        additional_info: {
          recording_mbid: track.recording.id,
          artist_mbids: track["artist-credit"].map((ac) => ac.artist.id),
          release_mbid: release.id,
        },
      },
    };
    if (durationMs) {
      listen.track_metadata.additional_info!.duration_ms = durationMs;
    }
    if (index !== lastTrackIndex) {
      assert(
        durationMs !== null,
        "Unknown track length, can not calculate start time of the next listen",
      );
      startTime += durationMs / 1000;
    }
    return listen;
  });
}
