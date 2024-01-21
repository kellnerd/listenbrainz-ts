import { ListenBrainzClient } from "../client.ts";
import {
  type AdditionalTrackInfo,
  cleanListen,
  formatListen,
  type Listen,
  setSubmissionClient,
  type Track,
} from "../listen.ts";
import { timestamp } from "../timestamp.ts";
import { chunk, readListensFile } from "../utils.ts";
import {
  Command,
  ValidationError,
} from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";

export const cli = new Command()
  .name("elbisaur")
  .version("0.6.0")
  .description("Manage your ListenBrainz listens.")
  .globalEnv("LB_TOKEN=<UUID>", "ListenBrainz user token.", {
    prefix: "LB_",
    required: true,
  })
  .action(function () {
    this.showHelp();
  })
  // Listening history
  .command("history", "Show the listening history of yourself or another user.")
  .env("LB_USER=<name>", "ListenBrainz username.", { prefix: "LB_" })
  .option("-u, --user <name>", "ListenBrainz username, defaults to you.")
  .action(async function (options) {
    const client = new ListenBrainzClient({ userToken: options.token });
    if (!options.user) {
      const username = await client.validateToken();
      if (!username) {
        throw new ValidationError("Specified token is invalid");
      } else {
        options.user = username;
      }
    }
    const { listens } = await client.getListens(options.user);
    for (const listen of listens) {
      console.log(formatListen(listen));
    }
  })
  // Import JSON
  .command("import <path:file>", "Import listens from the given JSON file.")
  .option("-f, --filter <conditions>", "Filter listens by track metadata.")
  .option("-p, --preview", "Show listens instead of submitting them.")
  .action(async function (options, path) {
    const listenFilter = getListenFilter(options.filter);
    const listenSource = readListensFile(path);
    if (options.preview) {
      for await (const listen of listenSource) {
        if (listenFilter(listen)) console.log(formatListen(listen));
      }
    } else {
      const client = new ListenBrainzClient({ userToken: options.token });
      let count = 0;
      for await (const listens of chunk(listenSource, 100)) {
        const newListens = listens
          .filter(listenFilter)
          .map((listen) => {
            const newListen = cleanListen(listen);
            setSubmissionClient(newListen.track_metadata, {
              name: "elbisaur (JSON importer)",
              version: this.getVersion()!,
            });
            return newListen;
          });
        await client.import(newListens);
        count += listens.length;
        console.info(count, "listens imported");
      }
    }
  })
  // Submit listen
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
      setSubmissionClient(track, {
        name: "elbisaur (track submitter)",
        version: this.getVersion()!,
      });
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

function getListenFilter(filterSpecification?: string) {
  const conditions = filterSpecification?.split("&&").map((expression) => {
    const condition = expression.match(
      /^(?<key>\w+)(?<operator>==|!=)(?<value>.+)/,
    )?.groups;
    if (!condition) {
      throw new ValidationError(`Invalid filter expression "${expression}"`);
    }
    return condition as { key: string; operator: "==" | "!="; value: string };
  }) ?? [];

  return function (listen: Listen) {
    const track = listen.track_metadata;
    return conditions.every(({ key, operator, value }) => {
      const actualValue = track[key as keyof Track] ??
        track.additional_info?.[key as keyof AdditionalTrackInfo];
      if (operator === "==") return value == actualValue;
      else return value != actualValue;
    });
  };
}

if (import.meta.main) {
  // Automatically load environment variables from `.env` file.
  await import("https://deno.land/std@0.210.0/dotenv/load.ts");

  await cli.parse();
}
