import { formatListen } from "../listen.ts";
import { readListensFile } from "../utils.ts";
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";

export const cli = new Command()
  .name("manage.ts")
  .version("0.5.0")
  .description("Manage your ListenBrainz listens.")
  .globalEnv("LB_TOKEN=<UUID:string>", "ListenBrainz user token.", {
    prefix: "LB_",
  })
  .command("list <path:file>", "Display listens from the given JSON file.")
  .action(async (options, path) => {
    for await (const listen of readListensFile(path)) {
      console.log(formatListen(listen));
    }
  });

if (import.meta.main) {
  await cli.parse();
}
