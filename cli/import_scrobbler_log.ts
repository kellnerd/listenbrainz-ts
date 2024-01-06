import { ListenBrainzClient } from "../client.ts";
import { formatListen, type Listen } from "../listen.ts";
import { chunk } from "../utils.ts";
import { parseScrobblerLog } from "../parser/scrobbler_log.ts";
import { parseArgs } from "https://deno.land/std@0.210.0/cli/parse_args.ts";

async function importScrobblerLog(path: string, client: ListenBrainzClient, {
  chunkSize = 100,
  listenFilter = (listen: Listen) => <boolean> (true),
  preview = false,
} = {}) {
  const file = await Deno.open(path);
  const input = file.readable.pipeThrough(new TextDecoderStream());

  for await (let listens of chunk(parseScrobblerLog(input), chunkSize)) {
    listens = listens.filter(listenFilter);

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
  const { _: paths, preview, onlyAlbums } = parseArgs(Deno.args, {
    boolean: ["preview", "onlyAlbums"],
    string: ["_"],
    alias: { p: "preview", a: "onlyAlbums" },
  });

  for (const path of paths) {
    await importScrobblerLog(path, client, {
      preview,
      listenFilter: onlyAlbums
        ? (listen) => !!(listen.track_metadata.additional_info?.tracknumber)
        : undefined,
    });
  }
}
