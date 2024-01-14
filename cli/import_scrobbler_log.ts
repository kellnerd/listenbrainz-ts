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
  logfile = "",
  preview = false,
} = {}) {
  const inputFile = await Deno.open(path);
  const input = inputFile.readable.pipeThrough(new TextDecoderStream());

  const encoder = new TextEncoder();
  let output: WritableStreamDefaultWriter<Uint8Array> | undefined = undefined;
  if (logfile) {
    const outputFile = await Deno.open(logfile, { create: true, append: true });
    output = outputFile.writable.getWriter();
    await output.ready;
  }

  for await (let listens of chunk(parseScrobblerLog(input), chunkSize)) {
    listens = listens.filter(listenFilter);

    for (const listen of listens) {
      const info = listen.track_metadata.additional_info ??= {};
      info.submission_client = clientName;
      info.submission_client_version = clientVersion;

      if (output) {
        await output.write(encoder.encode(JSON.stringify(listen) + "\n"));
      }
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

  if (output) {
    await output.close();
  }
}

if (import.meta.main) {
  const userToken = Deno.env.get("LB_TOKEN");
  if (!userToken) {
    throw new Error("You have to specify LB_TOKEN in your environment!");
  }

  const client = new ListenBrainzClient({ userToken });
  const { logfile, _: paths, preview, onlyAlbums } = parseArgs(Deno.args, {
    boolean: ["preview", "onlyAlbums"],
    string: ["_", "logfile"],
    alias: { "preview": "p", "onlyAlbums": "a" },
  });

  for (const path of paths) {
    await importScrobblerLog(path, client, {
      logfile,
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
