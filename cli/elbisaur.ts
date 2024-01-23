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
import { chunk, JsonLogger, readListensFile } from "../utils.ts";
import { parseScrobblerLog } from "../parser/scrobbler_log.ts";
import { extname } from "https://deno.land/std@0.210.0/path/extname.ts";
import { parse as parseYaml } from "https://deno.land/std@0.210.0/yaml/mod.ts";
import {
  Command,
  ValidationError,
} from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";

export const cli = new Command()
  .name("elbisaur")
  .version("0.6.2")
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
  .option("-a, --after <datetime>", "Only get listens after the given time.")
  .option("-b, --before <datetime>", "Only get listens before the given time.")
  .option("-c, --count <N:integer>", "Desired number of results.")
  .option("-f, --filter <conditions>", "Filter listens by track metadata.")
  .option(
    "-o, --output <path:file>",
    "Write listens into to the given JSONL file (append to existing file).",
  )
  .action(async function (options) {
    const listenFilter = await getListenFilter(options.filter);
    const client = new ListenBrainzClient({ userToken: options.token });
    if (!options.user) {
      const username = await client.validateToken();
      if (!username) {
        throw new ValidationError("Specified token is invalid");
      } else {
        options.user = username;
      }
    }
    const output = new JsonLogger();
    if (options.output) {
      await output.open(options.output);
    }
    const { listens } = await client.getListens(options.user, {
      min_ts: options.after ? timestamp(options.after) : undefined,
      max_ts: options.before ? timestamp(options.before) : undefined,
      count: options.count,
    });
    for (const listen of listens) {
      if (listenFilter(listen)) {
        console.log(formatListen(listen));
        await output.log(listen);
      }
    }
    await output.close();
  })
  // Delete listens
  .command("delete <path:file>", "Delete listens in a JSON file from history.")
  .option("-a, --after <datetime>", "Only drop listens after the given time.")
  .option("-b, --before <datetime>", "Only drop listens before the given time.")
  .option("-f, --filter <conditions>", "Filter listens by track metadata.")
  .option("-p, --preview", "Show listens instead of deleting them.")
  .action(async function (options, path) {
    const listenFilter = await getListenFilter(options.filter, options);
    const listenSource = readListensFile(path);
    const client = new ListenBrainzClient({ userToken: options.token });
    let count = 0;
    for await (const listen of listenSource) {
      if (listenFilter(listen) && "recording_msid" in listen) {
        if (options.preview) {
          console.log(formatListen(listen));
        } else {
          await client.deleteListen(listen);
          count++;
        }
      }
    }
    console.info(count, "listens deleted");
  })
  // Import JSON
  .command("import <path:file>", "Import listens from the given JSON file.")
  .option("-a, --after <datetime>", "Only use listens after the given time.")
  .option("-b, --before <datetime>", "Only use listens before the given time.")
  .option("-f, --filter <conditions>", "Filter listens by track metadata.")
  .option("-p, --preview", "Show listens instead of submitting them.")
  .action(async function (options, path) {
    const listenFilter = await getListenFilter(options.filter, options);
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
        count += newListens.length;
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
  .option("--now", "Submit a playing now notification.", { conflicts: ["at"] })
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
        if (options.now) {
          await client.playingNow(track);
          console.info("Playing now notification submitted");
        } else {
          await client.listen(track, startTime);
          console.info("Listen submitted");
        }
      }
    } else {
      throw new ValidationError(`Invalid metadata format "${input}"`);
    }
  })
  // File parser
  .command("parse <input:file> [output:file]")
  .description(`
    Parse listens from the given input file and write them into a JSONL file.
    If no output file is specified, it will have the same name as the input,
    but with a ".jsonl" extension.

    Supported format: .scrobbler.log
  `)
  .option("-a, --after <datetime>", "Only use listens after the given time.")
  .option("-b, --before <datetime>", "Only use listens before the given time.")
  .option("-f, --filter <conditions>", "Filter listens by track metadata.")
  .option(
    "-t, --time-offset <seconds:integer>",
    "Add a time offset (in seconds) to all timestamps.",
    { default: 0 },
  )
  .action(async function (options, inputPath, outputPath) {
    const extension = extname(inputPath);
    if (extension === ".log") {
      const listenFilter = await getListenFilter(options.filter, options);
      const inputFile = await Deno.open(inputPath);
      const input = inputFile.readable.pipeThrough(new TextDecoderStream());
      const output = new JsonLogger();
      await output.open(outputPath ?? inputPath + ".jsonl");
      for await (const listen of parseScrobblerLog(input)) {
        if (listenFilter(listen)) {
          listen.listened_at += options.timeOffset;
          setSubmissionClient(listen.track_metadata, {
            name: "elbisaur (.scrobbler.log parser)",
            version: this.getVersion()!,
          });
          await output.log(listen);
        }
      }
      await output.close();
    } else {
      throw new ValidationError(`Unsupported file format "${extension}"`);
    }
  })
  // Listen statistics
  .command("statistics <path:file>", "Show statistics for the given JSON file.")
  .option(
    "-k, --keys <keys:string[]>",
    "Track metadata keys to generate statistics for.",
    { default: ["artist_name", "release_name"] },
  )
  .option("-a, --after <datetime>", "Only use listens after the given time.")
  .option("-b, --before <datetime>", "Only use listens before the given time.")
  .option("-f, --filter <conditions>", "Filter listens by track metadata.")
  .option(
    "-x, --exclude-list <path:file>",
    "YAML file with lists of values which should be skipped for their key.",
  )
  .option(
    "-i, --include-list <path:file>",
    "YAML file with lists of values which are allowed for their key.",
  )
  .action(async function (options, path) {
    const listenFilter = await getListenFilter(options.filter, options);
    const listenSource = readListensFile(path);
    const valueCounts: Record<string, Record<string, number>> = {};
    for (const key of options.keys) {
      valueCounts[key] = {};
    }
    for await (const listen of listenSource) {
      if (!listenFilter(listen)) continue;
      const track = listen.track_metadata;
      const info = track.additional_info;
      for (const key of options.keys) {
        const values = track[key as keyof Track] ??
          info?.[key as keyof AdditionalTrackInfo];
        const valueCountsForKey = valueCounts[key];
        for (const value of makeValidIndexTypes(values)) {
          if (valueCountsForKey[value]) {
            valueCountsForKey[value]++;
          } else {
            valueCountsForKey[value] = 1;
          }
        }
      }
    }
    // Print stats with values ordered by count in descending order.
    for (const key of options.keys) {
      console.log(`\n${key}:`);
      const stats = Object.entries(valueCounts[key])
        .sort(([_a, countA], [_b, countB]) => countB - countA);
      for (const [value, count] of stats) {
        console.log(count, "\t", value !== "" ? value : undefined);
      }
    }
  })
  // Modify listens
  .command(
    "transform <input:file> <output:file>",
    "Modify listens from a JSON input file and write them into a JSONL file.",
  )
  .option("-e, --edit <expression>", "Edit track metadata.", { collect: true })
  .option("-a, --after <datetime>", "Only use listens after the given time.")
  .option("-b, --before <datetime>", "Only use listens before the given time.")
  .option("-f, --filter <conditions>", "Filter listens by track metadata.")
  .option(
    "-x, --exclude-list <path:file>",
    "YAML file with lists of values which should be skipped for their key.",
  )
  .option(
    "-i, --include-list <path:file>",
    "YAML file with lists of values which are allowed for their key.",
  )
  .option(
    "-t, --time-offset <seconds:integer>",
    "Add a time offset (in seconds) to all timestamps.",
    { default: 0 },
  )
  .action(async function (options, inputPath, outputPath) {
    const listenFilter = await getListenFilter(options.filter, options);
    const editListen = getListenModifier(options.edit);
    const listenSource = readListensFile(inputPath);
    const output = new JsonLogger();
    await output.open(outputPath);
    for await (const listen of listenSource) {
      if (listenFilter(listen)) {
        editListen(listen);
        listen.listened_at += options.timeOffset;
        await output.log(listen);
      }
    }
    await output.close();
  });

async function getListenFilter(filterSpecification?: string, options: {
  after?: string;
  before?: string;
  excludeList?: string;
  includeList?: string;
} = {}) {
  const conditions = filterSpecification?.split("&&").map((expression) => {
    const condition = expression.match(
      /^(?<key>\w+)(?<operator>==|!=|\^)(?<value>.*)/,
    )?.groups;
    if (!condition) {
      throw new ValidationError(`Invalid filter expression "${expression}"`);
    }
    return condition as {
      key: string;
      operator: "==" | "!=" | "^";
      value: string | string[];
    };
  }) ?? [];

  const minTs = options.after ? timestamp(options.after) : 0;
  if (isNaN(minTs)) {
    throw new ValidationError(`Invalid date "${options.after}"`);
  }

  const maxTs = options.before ? timestamp(options.before) : Infinity;
  if (isNaN(maxTs)) {
    throw new ValidationError(`Invalid date "${options.before}"`);
  }

  if (options.excludeList) {
    await loadConditionsFromYaml(options.excludeList, "!=");
  }

  if (options.includeList) {
    await loadConditionsFromYaml(options.includeList, "==");
  }

  async function loadConditionsFromYaml(path: string, operator: "==" | "!=") {
    const content = await Deno.readTextFile(path);
    const excludeMap = parseYaml(content, { filename: path }) as any;
    for (const [key, values] of Object.entries(excludeMap)) {
      if (Array.isArray(values)) {
        conditions.push({ key, operator, value: values });
      } else {
        throw new ValidationError(`"${key}" from "${path}" has to be a list`);
      }
    }
  }

  return function (listen: Listen) {
    if (listen.listened_at <= minTs || listen.listened_at >= maxTs) {
      return false;
    }
    const track = listen.track_metadata;
    const info = track.additional_info;
    return conditions.every(({ key, operator, value }) => {
      const actualValue = track[key as keyof Track] ??
        info?.[key as keyof AdditionalTrackInfo];
      switch (operator) {
        case "==":
          if (Array.isArray(value)) {
            return value.some((value) => value == actualValue);
          }
          return value == actualValue;
        case "!=":
          if (Array.isArray(value)) {
            return value.every((value) => value != actualValue);
          }
          return value != actualValue;
        case "^": // XOR
          return actualValue && !value || !actualValue && value;
      }
    });
  };
}

function getListenModifier(expressions?: string[]) {
  const edits = expressions?.map((expression) => {
    const edit = expression.match(
      /^(?<key>\w+)(?<operator>=)(?<value>.*)/,
    )?.groups;
    if (!edit) {
      throw new ValidationError(`Invalid edit expression "${expression}"`);
    }
    return edit as { key: string; operator: "="; value: string };
  });

  return function (listen: Listen) {
    if (!edits) return;
    const track = listen.track_metadata;
    for (const { key, value } of edits) {
      if (
        key === "track_name" || key === "artist_name" || key === "release_name"
      ) {
        track[key] = value;
      } else {
        const info = track.additional_info ??= {};
        info[key] = value;
      }
    }
  };
}

function makeValidIndexTypes(input: unknown): Array<string | number> {
  if (typeof input === "string" || typeof input === "number") return [input];
  if (typeof input === "boolean") return [input.toString()];
  if (input === undefined) return [""];
  if (Array.isArray(input)) return input.flatMap(makeValidIndexTypes);
  return [];
}

if (import.meta.main) {
  // Automatically load environment variables from `.env` file.
  await import("https://deno.land/std@0.210.0/dotenv/load.ts");

  await cli.parse();
}
