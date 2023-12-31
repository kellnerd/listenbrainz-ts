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
  additional_info?: Partial<{
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
     * The Spotify track URL associated with this recording.
     *
     * @example "http://open.spotify.com/track/1rrgWMXGCGHru5bIRxGFV0"
     */
    spotify_id: string;
    /**
     * List of user-defined folksonomy tags to be associated with this recording.
     * You may submit up to `MAX_TAGS_PER_LISTEN` tags and each tag may be up to
     * `MAX_TAG_SIZE` characters large.
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
     * value may be the same as `media_player`.
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
     * (see `spotify_id`), a YouTube video URL, a Soundcloud recording page URL,
     * or the full URL to a public MP3 file.
     * If there is a webpage for this song (e.g. Youtube page, Soundcloud page)
     * do not try and resolve the URL to an actual audio resource.
     */
    origin_url: string;
    /**
     * The duration of the track in milliseconds (integer).
     * You should only include one of `duration_ms` or `duration`.
     */
    duration_ms: number;
    /**
     * The duration of the track in seconds (integer).
     * You should only include one of `duration_ms` or `duration`.
     */
    duration: number;
  }>;
}

export interface Listen {
  /**
   * Integer representing the Unix time when the track was listened to.
   * This should be set to playback start time of the submitted track.
   * The minimum accepted value for this field is `LISTEN_MINIMUM_TS`.
   */
  listened_at: number;
  track_metadata: Track;
}

export type ListenSubmission = {
  /**
   * Submit previously saved listens.
   *
   * Submitting multiple listens in one request is permitted.
   * There are some limitations on the size of a submission.
   * A request must be less than `MAX_LISTEN_PAYLOAD_SIZE` bytes, and you can
   * only submit up to `MAX_LISTENS_PER_REQUEST` listens per request.
   * Each listen may not exceed `MAX_LISTEN_SIZE` bytes in size.
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
