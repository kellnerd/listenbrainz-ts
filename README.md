# listenbrainz

[Deno] library to access the [ListenBrainz API], written in TypeScript.

You can use it to submit your listening history to your [ListenBrainz] account.

As this library only makes use of web standards, it is also compatible with modern browsers (after transpilation to JavaScript).

## Usage

In order to submit listens, you have to specify a user token which you can obtain from your [ListenBrainz profile].

The following example instantiates a ListenBrainz client with a token from an environment variable and submits a [playing now] notification for a track:

```ts
import { ListenBrainzClient } from "https://deno.land/x/listenbrainz@v0.1.1/client.ts";

const client = new ListenBrainzClient({ userToken: Deno.env.get("LB_TOKEN") });
await client.playingNow({ artist_name: "John Doe", track_name: "Love Song" });
```

[Deno]: https://deno.com/
[ListenBrainz]: https://listenbrainz.org/
[ListenBrainz API]: https://listenbrainz.readthedocs.io/en/latest/users/api/index.html
[ListenBrainz profile]: https://listenbrainz.org/profile/
[playing now]: https://listenbrainz.org/listening-now/
