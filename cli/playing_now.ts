import { ListenBrainzClient } from "../client.ts";
import type { Track } from "../listen.ts";
import { parseArgs } from "https://deno.land/std@0.210.0/cli/parse_args.ts";

const userToken = Deno.env.get("LB_TOKEN");
if (!userToken) {
  throw new Error("You have to specify LB_TOKEN in your environment!");
}

const client = new ListenBrainzClient({ userToken });
const { artist, title } = parseArgs(Deno.args, {
  string: ["title", "artist"],
});

if (artist && title) {
  const track: Track = {
    artist_name: artist,
    track_name: title,
  };
  console.log("Listen:", track);

  await client.playingNow(track);
}
