# FakeNitro+ (Revenge / Vendetta plugin)

Client-side plugin that unlocks Nitro-style features on Discord mobile.

## Features

- **Emojis from all servers**: custom emojis are sent as image links, and the picker is unlocked.
- **Soundboard from all servers**: loads sounds from every server you are in.
- **Stickers from all servers**: stickers are sent as image links.
- **Locked channels visible**: hidden channels show up in the channel list.
- **Profile theme**: custom profile colors (visible only to you).
- **Nickname style**: type `!nick yourname` to convert text to bold, script or mono.

## Install

1. Upload `manifest.json` and `index.js` to a GitHub repo.
2. Enable GitHub Pages for the repo.
3. In Revenge, go to Plugins, press Install, and paste the link:

   ```
   https://<username>.github.io/<repo>/
   ```

## Config

Edit the `CONFIG` object at the top of `index.js`:

```js
const CONFIG = {
  emojiSize: 48,
  profileTheme: [0x5865f2, 0xeb459e],
  nicknameStyle: "bold", // "bold" | "script" | "mono" | "none"
};
```

## Limits

- Profile theme and soundboard are **local only**. Other users will not see them.
- Locked channels appear in the list, but their messages stay hidden because the server blocks access.
- Animated stickers are sent as a static PNG.
- Some internal module names may differ between Revenge versions. Each feature is wrapped in `try/catch`, so one failure does not break the others. Check the console for errors.

## Disclaimer

This plugin modifies the Discord client, which is against Discord's Terms of Service. Use at your own risk.
