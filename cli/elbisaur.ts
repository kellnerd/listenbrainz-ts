import { ListenBrainzClient } from "../client.ts";
import { formatListen, type Track } from "../listen.ts";
import { timestamp } from "../timestamp.ts";
import { chunk, readListensFile } from "../utils.ts";
import {
  Command,
  ValidationError,
} from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";

export const cli = new Command()
  .name("elbisaur")
  .version("0.5.0")
  .description("Manage your ListenBrainz listens.")
  .globalEnv("LB_TOKEN=<UUID>", "ListenBrainz user token.", {
    prefix: "LB_",
    required: true,
  })
  .action(function () {
    this.showHelp();
  })
  .command("history <user>", "Show the listening history of the given user.")
  .action(async function (options, user) {
    const client = new ListenBrainzClient({ userToken: options.token });
    const { listens } = await client.getListens(user);
    for (const listen of listens) {
      console.log(formatListen(listen));
    }
  })
  .command("import <path:file>", "Import listens from the given JSON file.")
  .option("-p, --preview", "Show listens instead of submitting them.")
  .action(async function (options, path) {
    const listenSource = readListensFile(path);
    if (options.preview) {
      for await (const listen of listenSource) {
        console.log(formatListen(listen));
      }
    } else {
      const client = new ListenBrainzClient({ userToken: options.token });
      let count = 0;
      for await (const listens of chunk(listenSource, 100)) {
        await client.import(listens);
        count += listens.length;
        console.info(count, "listens imported");
      }
    }
  })
  .command("listen <metadata>")
  .description(`
    Submit listen for the given track metadata.
      <metadata> = "<artist> - <title>"
  `)
  .option("--at <datetime>", "Time when you started listening.")
  .option("-p, --preview", "Show listens instead of submitting them.")
  .action(async function (options, input) {
    const startTime = timestamp(options.at);
    if (isNaN(startTime)) {
      throw new ValidationError(`Invalid date "${options.at}"`);
    }
    const trackMatch = input.match(/(?<artist>.+?) -+ (?<title>.+)/);
    if (trackMatch?.groups) {
      const track: Track = {
        artist_name: trackMatch.groups.artist,
        track_name: trackMatch.groups.title,
      };
      if (options.preview) {
        console.log(formatListen({
          listened_at: startTime,
          track_metadata: track,
        }));
      } else {
        const client = new ListenBrainzClient({ userToken: options.token });
        await client.listen(track, startTime);
        console.info("Listen submitted");
      }
    } else {
      throw new ValidationError(`Invalid metadata format "${input}"`);
    }
  });

if (import.meta.main) {
  // Automatically load environment variables from `.env` file.
  await import("https://deno.land/std@0.210.0/dotenv/load.ts");

  await cli.parse();
}
