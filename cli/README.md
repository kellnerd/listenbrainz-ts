# elbisaur

`elbisaur` is a CLI which can be used to submit and manage listens.
You can safely execute it with [Deno] to see its integrated help, it will prompt you for the necessary permissions:

```sh
deno run https://deno.land/x/listenbrainz/cli/elbisaur.ts
```

Of course you can also directly specify the permissions as arguments and even [install] it (by replacing `run` with `install`):

```sh
deno install --allow-env=LB_USER,LB_TOKEN,ELBISAUR_LISTEN_TEMPLATE --allow-net=api.listenbrainz.org --allow-read --allow-write=. https://deno.land/x/listenbrainz/cli/elbisaur.ts
```

Running `elbisaur` automatically tries to load environment variables from a `.env` file in your working directory, so you can comfortably safe your LB user token inside there.

[Deno]: https://deno.com/
[install]: https://docs.deno.com/runtime/manual/tools/script_installer
