import { ListenBrainzClient } from "../client.ts";
import { formatListen, type Listen } from "../listen.ts";
import { chunk } from "../utils.ts";
import { parseScrobblerLog } from "../parser/scrobbler_log.ts";
import { parseArgs } from "https://deno.land/std@0.210.0/cli/parse_args.ts";

const clientName = "Deno ListenBrainz .scrobbler.log Importer";
const clientVersion = "0.5.0";

async function importScrobblerLog(path: string, client: ListenBrainzClient, {
  chunkSize = 100,
  listenFilter = (listen: Listen) =>
    !listen.track_metadata.additional_info?.skipped,
  preview = false,
} = {}) {
  const file = await Deno.open(path);
  const input = file.readable.pipeThrough(new TextDecoderStream());

  for await (let listens of chunk(parseScrobblerLog(input), chunkSize)) {
    listens = listens.filter(listenFilter);

    for (const listen of listens) {
      const info = listen.track_metadata.additional_info ??= {};
      info.submission_client = clientName;
      info.submission_client_version = clientVersion;
    }

    if (preview) {
      listens.forEach((listen) => console.info(formatListen(listen)));
    } else {
      try {
        await client.import(listens);
        console.info(listens.length, "listens have been submitted.");
      } catch (error) {
        console.error("Failed to submit listens:", error);
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
    alias: { "preview": "p", "onlyAlbums": "a" },
  });

  for (const path of paths) {
    await importScrobblerLog(path, client, {
      preview,
      listenFilter: onlyAlbums
        ? (listen) => {
          const info = listen.track_metadata.additional_info;
          return Boolean(info && info.tracknumber && !info.skipped);
        }
        : undefined,
    });
  }
}
