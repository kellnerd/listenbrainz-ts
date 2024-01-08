# listenbrainz

[Deno] library to access the [ListenBrainz API], written in TypeScript.

You can use it to submit your listening history to your [ListenBrainz] account.

As this library only makes use of web standards, it is also compatible with modern browsers (after transpilation to JavaScript).

## Features

- Submits listens and playing now notifications
- Handles ListenBrainz authorization with user token
- Adheres to rate limits and optionally retries failed requests
- Ships with type definitions and inline [documentation]

## Usage

In order to submit listens, you have to specify a user token which you can obtain from your [ListenBrainz profile].

The following example instantiates a ListenBrainz client with a token from an environment variable and submits a [playing now] notification for a track:

```ts
import { ListenBrainzClient } from "https://deno.land/x/listenbrainz@v0.2.0/client.ts";

const client = new ListenBrainzClient({ userToken: Deno.env.get("LB_TOKEN") });
await client.playingNow({ artist_name: "John Doe", track_name: "Love Song" });
```

[Deno]: https://deno.com/
[documentation]: https://deno.land/x/listenbrainz?doc
[ListenBrainz]: https://listenbrainz.org/
[ListenBrainz API]: https://listenbrainz.readthedocs.io/en/latest/users/api/index.html
[ListenBrainz profile]: https://listenbrainz.org/profile/
[playing now]: https://listenbrainz.org/listening-now/
