import { ListenBrainzClient } from "../client.ts";
import { formatListen } from "../listen.ts";
import { chunk } from "../utils.ts";
import { parseScrobblerLog } from "../parser/scrobbler_log.ts";
import { parseArgs } from "https://deno.land/std@0.210.0/cli/parse_args.ts";

async function importScrobblerLog(path: string, client: ListenBrainzClient, {
  chunkSize = 100,
  preview = false,
} = {}) {
  const file = await Deno.open(path);
  const input = file.readable.pipeThrough(new TextDecoderStream());

  for await (const listens of chunk(parseScrobblerLog(input), chunkSize)) {

    if (preview) {
      listens.forEach((listen) => console.info(formatListen(listen)));
    } else {
      const response = await client.import(listens);
      if (response.ok) {
        console.info(listens.length, "listens have been submitted.");
      } else {
        console.error("Failed to submit listens:", await response.json());
      }
    }
  }
}

if (import.meta.main) {
  const userToken = Deno.env.get("LB_TOKEN");
  if (!userToken) {
    throw new Error("You have to specify LB_TOKEN in your environment!");
  }

  const client = new ListenBrainzClient({ userToken });
  const { _: paths, preview } = parseArgs(Deno.args, {
    boolean: ["preview"],
    string: ["_"],
    alias: { p: "preview" },
  });

  for (const path of paths) {
    await importScrobblerLog(path, client, {
      preview,
    });
  }
}
