import { ListenBrainzClient } from "../client.ts";
import type { Track } from "../listen.ts";
import { formatTimestamp, timestamp } from "../timestamp.ts";
import { parseArgs } from "https://deno.land/std@0.210.0/cli/parse_args.ts";

const userToken = Deno.env.get("LB_TOKEN");
if (!userToken) {
  throw new Error("You have to specify LB_TOKEN in your environment!");
}

const client = new ListenBrainzClient({ userToken });
const { start, end, _: inputs } = parseArgs(Deno.args, {
  string: ["start", "end"],
});

let listeningStart: number, listeningEnd: number;
if (start || !end) listeningStart = timestamp(start);
else listeningEnd = timestamp(end);

inputs.forEach(async (input) => {
  let track: Track;

  // TODO: detect MB recording and release URLs (fetch tracks and their durations to calculate timestamps)
  const trackMatch = input.toString().match(/(?<artist>.+?) -+ (?<title>.+)/);
  if (trackMatch) {
    track = {
      artist_name: trackMatch.groups!.artist,
      track_name: trackMatch.groups!.title,
    };

    if (!listeningStart) {
      // As we do not know the track duration, we have to use what we have
      listeningStart = listeningEnd;
    }

    console.log("Listen @", formatTimestamp(listeningStart), track);
    prompt("Press enter to submit this listen...");

    await client.listen(track, listeningStart);
  } else {
    console.warn("Skipping invalid input:", input);
    return;
  }
});
