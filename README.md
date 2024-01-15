# listenbrainz

[Deno] library to access the [ListenBrainz API], written in TypeScript.

You can use it to submit your listening history to your [ListenBrainz] account.

As this library only makes use of web standards, it is also compatible with modern browsers (after transpilation to JavaScript).

## Features

- Submits listens and playing now notifications
- Browses your listening history and allows you to delete listens
- Handles ListenBrainz authorization and API errors
- Adheres to rate limits and optionally retries failed requests
- Provides generic `GET` and `POST` methods for (yet) unsupported API endpoints
- Includes additional [parsers](#parsers) to extract listens from text formats
- Ships with type definitions and inline [documentation]

## Usage

In order to submit listens, you have to specify a user token which you can obtain from your [ListenBrainz profile].

The following example instantiates a ListenBrainz client with a token from an environment variable and submits a [playing now] notification for a track:

```ts
import { ListenBrainzClient } from "https://deno.land/x/listenbrainz@v0.5.0/client.ts";

const client = new ListenBrainzClient({ userToken: Deno.env.get("LB_TOKEN") });
await client.playingNow({ artist_name: "John Doe", track_name: "Love Song" });
```

## Parsers

All listen parsers accept text input and generate `Listen` objects as their output.
These objects can then be used together with the ListenBrainz API and the LB client.

The parsers do not include any logic to access files to make them platform independent.
You can pass them the content from a HTTP response body or from a Deno file, for example.

The following parsers are available in the `listenbrainz/parser/*.ts` submodules:

- **JSON**: Accepts a JSON-serialized `Listen` object (as shown by the LB “Inspect listen” dialog) or an array of `Listen` objects (format of a [LB listening history export]) as input.
- **JSONL**: Multiple JSON-serialized `Listen` objects, separated by line breaks.
- **.scrobbler.log**: TSV table document which is generated by some portable music players for later submission to Last.fm.
  Currently accepts files with `AUDIOSCROBBLER/1.1` header which are generated by players with [Rockbox] firmware, maybe also by others.

[Deno]: https://deno.com/
[documentation]: https://deno.land/x/listenbrainz?doc
[ListenBrainz]: https://listenbrainz.org/
[ListenBrainz API]: https://listenbrainz.readthedocs.io/en/latest/users/api/index.html
[ListenBrainz profile]: https://listenbrainz.org/profile/
[LB listening history export]: https://listenbrainz.org/profile/export/
[playing now]: https://listenbrainz.org/listening-now/
[Rockbox]: https://www.rockbox.org/wiki/LastFMLog
