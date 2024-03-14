# elbisaur

Command line app to manage your ListenBrainz listens and process listen dumps.

If you want to give it a try to see what you get, you can safely execute it with [Deno].
Run the following command to see its integrated help, Deno will prompt you for the necessary permissions:

```sh
deno run https://deno.land/x/listenbrainz/cli/elbisaur.ts
```

## Setup

If you don’t want to have to remember the URL and grant permissions every time, you can [install] it with the permissions specified as arguments:

```sh
deno install --allow-env=LB_USER,LB_TOKEN,ELBISAUR_LISTEN_TEMPLATE --allow-net=api.listenbrainz.org --allow-read --allow-write https://deno.land/x/listenbrainz/cli/elbisaur.ts
```

Now you can simply run the app by executing `elbisaur`, which should show you the help and complain about a missing required environment variable `LB_TOKEN`.
This is your ListenBrainz user token which is required to submit listens and can be obtained from your [ListenBrainz settings] page.
Running `elbisaur` automatically tries to load environment variables from a `.env` file in your working directory, so you can comfortably safe your LB user token inside there:

```conf
# example token below, insert your own
LB_TOKEN = "3b851ecc-474d-44eb-a4d0-db3bbb5ef8b8"
# user name is optional, but it sometimes safes an API request if it is specified
LB_USER = "Your LB user name here"
```

[Deno]: https://deno.com/
[install]: https://docs.deno.com/runtime/manual/tools/script_installer
[ListenBrainz settings]: https://listenbrainz.org/settings/
