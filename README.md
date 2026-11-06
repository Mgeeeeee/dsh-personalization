**English** | [中文](README.zh-CN.md)

# dsh-ui-personalization

A personalization plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) client: it replaces the account row at the bottom of the sidebar with your own avatar, nickname and account balance, and can additionally hide the brand mark at the top of the sidebar. dsh does not provide any of this itself; the plugin mounts on slots dsh reserves, as a client-side cordis bundle.

Built against dsh `0.2.1-rc.5`; not tested on other versions.

## Install

```shell
dsh plugin --profile <your profile> add github:Mgeeeeee/dsh-ui-personalization
```

Refresh the page after installing; if it does not take effect, restart the profile once. `dsh plugin` passes straight through to pnpm, so the target can also be an absolute path to a local directory:

```shell
dsh plugin --profile <profile> add /absolute/path/dsh-ui-personalization
```

This plugin is distributed from GitHub only; there is no npm release. The "Add plugin" dialog in the settings panel works too — paste the full address above. Entering just `dsh-ui-personalization` fails with "not in the npm registry" — that failure is deliberate: the old name `dsh-personalization` on npm belongs to a plugin by another author, and installing by name would install the wrong thing.

An agent inside dsh can install it directly as well: have it run `plugin_manager install_bundle <absolute path to the package directory>`.

## Usage

1. The avatar row at the bottom of the sidebar shows your avatar and nickname, with that account's balance at the right end; clicking it opens the settings panel.
2. **Settings → Personalization**: a page in the settings panel's left-hand navigation, listed after "Agent presets". The page is split into two cards by function, each starting with its own switch:
   - **Identity row**: Custom identity (switch) → Avatar (click the avatar to pick an image; on hover or keyboard focus a pencil icon appears on the avatar and a cross in its top-right corner; click the cross to restore the default) → Nickname
   - **Interface elements**: Hide top brand mark (switch)

The avatar is scaled locally to a 128px square and stored in localStorage; the nickname applies immediately. When the sidebar is collapsed into an icon rail, the nickname and balance are not shown (that row keeps only the avatar).

## Slots it takes over

| Where | Slot | Notes |
|---|---|---|
| Bottom of the sidebar | `settings.launcher` (single) | Overrides the built-in account row with `priority: -1`; turning "Custom identity" off unregisters it and the original returns unchanged |
| Top-of-sidebar brand | `sidebar.brand.mark`, `sidebar.brand.name` (single) | While "Hide top brand mark" is on they mount on top and render nothing; turning it off hands them back |
| Settings panel navigation | `settings.section` (list, id `ui-personalization`, order `25`) | One navigation entry per registration; `label` is a thunk that follows the language |

All three mount through `ctx.slots.inject`: they appear when the slot declaration appears and are torn down automatically when it disappears. Registrations controlled by a switch are mounted or unregistered as the state changes.

**The height of the brand row** is hard-coded by the shell (60px, and not through a token), so blanking the two slots above it leaves a gap. The plugin injects one extra rule for this, attached to the document only while the switch is on:

```css
[class*="_logoRow"]:not(:has(button)){height:0;min-height:0;margin:0;padding:0;overflow:hidden}
```

This is the only place where the plugin reaches outside its own components. It matches on a fragment of the shell's CSS-modules local name and refuses rows containing a button — on Windows the collapse button sits in that row, and the guard leaves it alone there. If the shell renames the local class, the rule stops applying on its own, and the result falls back to "content blanked but an empty row left behind".

**The settings panel cannot be opened at a given page**: the shell exposes no "open section X" interface, so clicking the avatar can only open the settings panel, and which page it lands on is decided by the shell's own selection state.

## Balance

The number at the right end of that sidebar row comes from the account Remote, along the same path as the official account page:

```
ctx.remote.account.getBalance({ version, locale, timezoneOffsetSeconds })
```

- **Client version**: the `x-client-version` header is read from the page's boot manifest, `window.__DSH_BOOT__.release.version` — the shell inlines that same release into its own bundles at build time, so a dsh upgrade no longer needs a plugin change. A deployment whose manifest carries no release shows no balance instead of requesting with a stale version.
- **What it counts**: top-up balance + grant balance, summed when the currency is the same; it follows the official account page's rules for two decimals and for amounts under one cent (`<¥0.01`).
- **Refresh**: every frame of the account state stream (sign-in, sign-out and state changes each push one), on plugin activation, and when the settings panel is opened; plus a fallback every 3 minutes while the page is visible. Credentials do not become available until the first frame of the state stream, so the read follows the stream.
- **Nothing shown when it cannot be read**: signed out, offline, request refused, or a deployment without the account Remote — that cell in the sidebar simply does not render, rather than showing a wrong number.

## Data

All state lives in `localStorage['dsh.personalization.v1']` (the key keeps the old name from the `dsh-personalization` era before the rename, so changing the package name does not lose saved avatars and nicknames):

```json
{ "enabled": true, "nickname": "示例", "avatar": "data:image/png;base64,...", "hideBrand": false }
```

`enabled` controls the custom identity, `hideBrand` controls the top brand mark; the two are independent. Purely client-side state: it does not go into the session log, does not go to the cloud, and the balance is never written to disk; changing browsers or clearing the cache loses it.

## Known limitations

1. **There is no "Sign out" entry in the sidebar unless custom identity is off.** The built-in account row also carries a dropdown menu (Settings / Feedback / Sign out). `settings.launcher` is a single-occupant slot, so taking over the row takes over the whole menu; the official menu is an internal component of the account plugin with no public export, so this plugin cannot call it. To sign out, turn "Custom identity" off on this page and the original account row and menu come back. The official account settings page does not offer sign-out either (checked against `0.2.1-rc.5`); the rest of the settings panel is unaffected.
2. **The brand row is collapsed by a rule matching a class-name fragment**, see above. It goes quietly stale when the shell changes structure (leaving blank space, with no error).
3. **The navigation icon is the same as "General settings".** The shell maps icons by page id in a fixed table, unknown ids fall back to the default gear, and the registration itself has no icon field.
4. **The pencil on the avatar appears only on hover or keyboard focus.** Touch screens have no hover, so clicking the avatar still picks an image but without that hint; the cross in the top-right corner stays visible on `hover:none` devices, so it no longer has to be guessed by position.

## Uninstall

```shell
dsh plugin --profile <your profile> remove dsh-ui-personalization
```

An agent inside dsh can run `plugin_manager remove_bundle dsh-ui-personalization` instead.

After uninstalling, the sidebar returns to the system account row and the settings navigation entry disappears; the record in localStorage is not cleared — delete that key if you want it gone.

One trap: with a `link:` install, uninstalling does not delete the symlink under the profile's `node_modules/`; it is left dangling, so delete it by hand afterwards.

## Development

| File | Purpose |
|---|---|
| `client.js` | The browser half, all of the logic |
| `index.js` | The host half, currently empty |
| `cordis.patch.yml` | Inserts this plugin's line into cordis |
| `locale/en.json`, `locale/zh.json` | Title and description for the plugin card and detail page |
| `icon.svg` | Plugin card icon |
| `THIRD-PARTY.md` | List of styles and markup copied from components that ship with dsh |

The browser half registers through `window.__ModuleLoader__.load({ id, factory })`, where `id` must equal the package name; `react` is taken from the page's module table and need not be bundled. Style class names always use the `dshprf_` prefix, and colors and spacing use dsh theme tokens (`--dsw-*`). Only two kinds of color are hard-coded: the letter background of the avatar (a pattern color derived from the nickname), and black-background-white-content on overlays — the scrim `#00000073`, the cross badge `#000000b3`, and their white icons. The latter deliberately do not follow the theme: the scrim sits on top of a photo and must be dark with light content under both themes.

With a `link:` install, refreshing the page after a change is enough; if you installed the GitHub copy, changes made in the workshop do not get in, and upgrading means uninstalling and installing again. Restart dsh if the new code does not take effect.

The plugin's own version number is `PLUGIN_VERSION` at the top of `client.js`; the settings footer displays it, and both sides must match `version` in `package.json` — the structure check blocks a release when they disagree. The shell version used for the balance request is not here; see "Balance" above.

## Acknowledgements

This plugin manages to look like part of dsh because [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) is open source: the slot mechanism, cordis bundles and plugin_manager all come from it; the styles, markup and balance display rules on screen all follow its own components (item by item in [THIRD-PARTY.md](THIRD-PARTY.md)). Thanks to DeepSeek for opening the project up.

## License

[MIT](LICENSE). Some styles and markup come from other sources, listed in [THIRD-PARTY.md](THIRD-PARTY.md).
