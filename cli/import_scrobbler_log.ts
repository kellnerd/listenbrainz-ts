import { ListenBrainzClient } from "../client.ts";
import { chunk } from "../utils.ts";
import { parseScrobblerLog } from "../parser/scrobbler_log.ts";
import { parseArgs } from "https://deno.land/std@0.210.0/cli/parse_args.ts";

async function importScrobblerLog(path: string, client: ListenBrainzClient) {
  const file = await Deno.open(path);
  const input = file.readable.pipeThrough(new TextDecoderStream());

  const chunkSize = 100;
  for await (const listens of chunk(parseScrobblerLog(input), chunkSize)) {
    await client.import(listens);
  }
}

if (import.meta.main) {
  const userToken = Deno.env.get("LB_TOKEN");
  if (!userToken) {
    throw new Error("You have to specify LB_TOKEN in your environment!");
  }

  const client = new ListenBrainzClient({ userToken });
  const { _: paths } = parseArgs(Deno.args, {
    string: ["_"],
  });

  for (const path of paths) {
    await importScrobblerLog(path, client);
  }
}
