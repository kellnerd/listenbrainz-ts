/** Metadata of an audio track that was played. */
export interface Track {
  /** Name of the recording artist. */
  artist_name: string;
  /** Name of the track. */
  track_name: string;
  /** The name of the release this recording was played from. */
  release_name?: string;
  /**
   * Additional metadata you may have for a track.
   * Any additional information allows ListenBrainz to better correlate your
   * listen data to existing MusicBrainz-based data.
   * If you have MusicBrainz IDs available, submit them!
   */
  additional_info?: Partial<AdditionalTrackInfo>;
}

/**
 * Additional metadata an audio track can have.
 *
 * Other unspecified fields that may be submitted here will not be removed, but
 * ListenBrainz may decide to formally specify or scrub fields in the future.
 */
export interface AdditionalTrackInfo {
  /**
   * List of MusicBrainz Artist IDs, one or more IDs may be included here.
   * If you have a complete MusicBrainz artist credit that contains multiple
   * Artist IDs, include them all in this list.
   */
  artist_mbids: string[];
  /** MusicBrainz Release Group ID of the release group this recording was played from. */
  release_group_mbid: string;
  /** MusicBrainz Release ID of the release this recording was played from. */
  release_mbid: string;
  /** MusicBrainz Recording ID of the recording that was played. */
  recording_mbid: string;
  /** MusicBrainz Track ID associated with the recording that was played. */
  track_mbid: string;
  /** List of MusicBrainz Work IDs that may be associated with this recording. */
  work_mbids: string[];
  /** The tracknumber of the recording (first recording on a release is #1). */
  tracknumber: number;
  /** The ISRC code associated with the recording. */
  isrc: string;
  /**
   * List of user-defined folksonomy tags to be associated with this recording.
   * You may submit up to [`MAX_TAGS_PER_LISTEN`] tags and each tag may be up to
   * [`MAX_TAG_SIZE`] characters large.
   *
   * [`MAX_TAGS_PER_LISTEN`]: https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#listenbrainz.webserver.views.api_tools.MAX_TAGS_PER_LISTEN
   * [`MAX_TAG_SIZE`]: https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#listenbrainz.webserver.views.api_tools.MAX_TAG_SIZE
   */
  tags: string[];
  /**
   * The name of the program being used to listen to music.
   * Don’t include a version number here.
   */
  media_player: string;
  /** The version of the program being used to listen to music. */
  media_player_version: string;
  /**
   * The name of the client that is being used to submit listens to ListenBrainz.
   * If the media player has the ability to submit listens built-in then this
   * value may be the same as {@linkcode media_player}.
   * Don’t include a version number here.
   */
  submission_client: string;
  /** The version of the submission client. */
  submission_client_version: string;
  /**
   * If the song being listened to comes from an online service, the canonical
   * domain of this service (rather than a textual description or URL).
   *
   * This allows ListenBrainz to refer unambiguously to a service without
   * worrying about capitalization or full/short names (such as the difference
   * between “Internet Archive”, “The Internet Archive” or “Archive”).
   *
   * @example "archive.org"
   */
  music_service: string;
  /**
   * If the song being listened to comes from an online service and you don’t
   * know the canonical domain, a name that represents the service.
   */
  music_service_name: string;
  /**
   * If the song of this listen comes from an online source, the URL to the
   * place where it is available. This could be a Spotify URL
   * (see {@linkcode spotify_id}), a YouTube video URL, a Soundcloud recording
   * page URL, or the full URL to a public MP3 file.
   * If there is a webpage for this song (e.g. Youtube page, Soundcloud page)
   * do not try and resolve the URL to an actual audio resource.
   */
  origin_url: string;
  /**
   * The duration of the track in milliseconds (integer).
   * You should only include one of `duration_ms` or {@linkcode duration}.
   */
  duration_ms: number;
  /**
   * The duration of the track in seconds (integer).
   * You should only include one of {@linkcode duration_ms} or `duration`.
   */
  duration: number;
  /**
   * The Spotify track URL associated with this recording.
   *
   * @example "http://open.spotify.com/track/1rrgWMXGCGHru5bIRxGFV0"
   */
  spotify_id: string;

  // The following properties are not officially documented, but used by LB.

  /** Number of the medium on which the track can be found. */
  discnumber: number;
  /** Name of the track artist. */
  artist_names: string[];
  /** Name of the release artist. */
  release_artist_name: string;
  /** Names of the release artists. */
  release_artist_names: string[];
  /** The Spotify artist URLs associated with the recording artists. */
  spotify_artist_ids: string[];
  /** The Spotify album URL associated with the release. */
  spotify_album_id: string;
  /** The Spotify artist URLs associated with the album artists. */
  spotify_album_artist_ids: string[];
  /** The YouTube URL associated with the track. */
  youtube_id: string;
  /** MessyBrainz ID (should not be submitted).  */
  recording_msid: string;
  /**
   * Source of the listens.
   * @deprecated Use {@linkcode media_player} or {@linkcode music_service} instead.
   */
  listening_from: string;

  /** Other unspecified fields can be submitted as well. */
  [unspecified: string]: unknown;
}

/**
 * Event of listening to a certain track at certain time.
 *
 * Listens should be submitted for tracks when the user has listened to half the
 * track or 4 minutes of the track, whichever is lower.
 * If the user hasn’t listened to 4 minutes or half the track, it doesn’t fully
 * count as a listen and should not be submitted.
 */
export interface Listen {
  /**
   * Integer representing the Unix time when the track was listened to.
   * This should be set to playback start time of the submitted track.
   * The minimum accepted value for this field is [`LISTEN_MINIMUM_TS`].
   *
   * [`LISTEN_MINIMUM_TS`]: https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#listenbrainz.listenstore.LISTEN_MINIMUM_TS
   */
  listened_at: number;
  /** Metadata of the track. */
  track_metadata: Track;
}

/**
 * Listening data which can be submitted to the ListenBrainz API.
 *
 * There are some limitations on the size of a submission.
 * A request must be less than [`MAX_LISTEN_PAYLOAD_SIZE`] bytes, and you can
 * only submit up to [`MAX_LISTENS_PER_REQUEST`] listens per request.
 * Each listen may not exceed [`MAX_LISTEN_SIZE`] bytes in size.
 *
 * [`MAX_LISTEN_PAYLOAD_SIZE`]: https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#listenbrainz.webserver.views.api_tools.MAX_LISTEN_PAYLOAD_SIZE
 * [`MAX_LISTENS_PER_REQUEST`]: https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#listenbrainz.webserver.views.api_tools.MAX_LISTENS_PER_REQUEST
 * [`MAX_LISTEN_SIZE`]: https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#listenbrainz.webserver.views.api_tools.MAX_LISTEN_SIZE
 */
export type ListenSubmission = {
  /**
   * Submit previously saved listens.
   * Submitting multiple listens in one request is permitted.
   */
  listen_type: "import";
  payload: Listen[];
} | {
  /**
   * Submit single listen.
   * Indicates that user just finished listening to track.
   */
  listen_type: "single";
  payload: [Listen];
} | {
  /**
   * Submit `playing_now` notification.
   * Indicates that user just began listening to track.
   */
  listen_type: "playing_now";
  payload: [{
    track_metadata: Track;
  }];
};

/** Listen which has already been inserted into the database. */
export interface InsertedListen extends Listen {
  /** Unix time when the track was inserted into the database (in seconds). */
  inserted_at: number;
  /** MessyBrainz ID (gets assigned to a hash of the track metadata).  */
  recording_msid: string;
  /** MusicBrainz name of the user who submitted this listen. */
  user_name: string;
  /** Metadata of the track, which may have been mapped to MBIDs. */
  track_metadata: Track | MappedTrack;
}

/** Track which has already been mapped to MBIDs by the server. */
export interface MappedTrack extends Track {
  /** Mapping of a track to MusicBrainz identifiers. */
  mbid_mapping: MusicBrainzMapping;
  // brainzplayer_metadata?: { track_name: string; };
}

/** Mapping of a track to MusicBrainz identifiers. */
export interface MusicBrainzMapping {
  /** Name of the mapped recording. */
  recording_name?: string;
  /** MusicBrainz Recording ID of the mapped recording. */
  recording_mbid: string;
  /** MusicBrainz Release ID of the mapped release. */
  release_mbid: string;
  /** List of MusicBrainz Artist IDs of the mapped recording’s artists. */
  artist_mbids: string[];
  /** MusicBrainz artist credit of the mapped recording. */
  artists?: ArtistCredit[];
  /** ID of the Cover Art Archive image. */
  caa_id?: number;
  /** MusicBrainz Release ID of the release whose cover art will be used. */
  caa_release_mbid?: string;
  /** Name of the mapped release group. */
  release_group_name?: string;
  /** MusicBrainz Release Group ID of the mapped release group. */
  release_group_mbid?: string;
}

/** MusicBrainz artist with credited name, MBID and join phrase. */
export interface ArtistCredit {
  /** Credited name of the artist. */
  artist_credit_name: string;
  /** MusicBrainz Artist ID of the artist. */
  artist_mbid: string;
  /** Join phrase between this artist and the next artist. */
  join_phrase: string;
}

/** Uniquely identifiable listen of a user. */
export type UniqueListen = InsertedListen | {
  listened_at: number;
  recording_msid: string;
};

/** Returns a string representation of the given listen (for logging). */
export function formatListen(listen: Listen): string {
  const { artist_name, track_name, release_name, additional_info } =
    listen.track_metadata;

  return [
    new Date(listen.listened_at * 1000).toLocaleString("en-GB"),
    artist_name,
    track_name,
    release_name ?? "[standalone track]",
    `#${additional_info?.tracknumber ?? 0}`,
  ].join(" | ");
}

/** Checks whether the given JSON is a listen. */
// deno-lint-ignore no-explicit-any
export function isListen(json: any): json is Listen | InsertedListen {
  const metadata = json.track_metadata;

  return Number.isInteger(json.listened_at) &&
    typeof metadata === "object" &&
    typeof metadata.track_name === "string" &&
    typeof metadata.artist_name === "string";
}
