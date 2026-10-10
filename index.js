(function(exports, metro, patcher){
"use strict";
const { findByProps, findByStoreName, findByName } = metro;
const { before, after, instead } = patcher;
const exports_ = exports;

const patches = [];
const safe = (name, fn) => {
  try { fn(); } catch (e) { console.log(`[FakeNitro+] ${name} failed:`, e); }
};

// ---- CONFIG (bddel hna) ----
const CONFIG = {
  emojiSize: 48,
  profileTheme: [0x5865f2, 0xeb459e], // [primary, accent] hex, local ghir
  nicknameStyle: "bold", // "bold" | "script" | "mono" | "none"
  memberSince: "2015-05-15T00:00:00Z",
  fakeDeafen: true,
  // 7ot hna badges: icon = URL dyal tswira
  badges: [
    // { description: "My badge", icon: "https://example.com/badge.png" },
  ],
};

// ---- Nickname style (unicode, kayban l kolchi) ----
const ranges = {
  bold: [0x1d5d4, 0x1d5ee, 0x1d7ec],
  script: [0x1d4d0, 0x1d4ea, 0x1d7ce],
  mono: [0x1d670, 0x1d68a, 0x1d7f6],
};
const styleText = (text, style = CONFIG.nicknameStyle) => {
  const r = ranges[style];
  if (!r) return text;
  return [...text]
    .map((c) => {
      const k = c.charCodeAt(0);
      if (k >= 65 && k <= 90) return String.fromCodePoint(r[0] + k - 65);
      if (k >= 97 && k <= 122) return String.fromCodePoint(r[1] + k - 97);
      if (k >= 48 && k <= 57) return String.fromCodePoint(r[2] + k - 48);
      return c;
    })
    .join("");
};

exports.default = {
  onLoad() {
    // 1) Emojis: bddel emoji custom l link f send
    safe("emoji-send", () => {
      const Messages = findByProps("sendMessage", "receiveMessage");
      patches.push(
        before("sendMessage", Messages, (args) => {
          const msg = args[1];
          if (!msg?.content) return;
          msg.content = msg.content.replace(
            /<(a?):(\w+):(\d+)>/g,
            (_, anim, name, id) =>
              `https://cdn.discordapp.com/emojis/${id}.${anim ? "gif" : "webp"}?size=${CONFIG.emojiSize}&name=${name}`
          );
        })
      );
    });

    // 2) Picker + Soundboard: nitro client-side (premiumType = 2)
    safe("premium", () => {
      const UserStore = findByStoreName("UserStore");
      const me = UserStore.getCurrentUser();
      const old = me.premiumType;
      me.premiumType = 2;
      patches.push(() => { me.premiumType = old; });
    });

    // 3) Soundboard mn gae3 servers
    safe("soundboard", () => {
      const SB = findByProps("playSound", "fetchSoundboardSounds");
      if (SB?.fetchSoundboardSounds) SB.fetchSoundboardSounds();
      const Guilds = findByStoreName("SoundboardStore");
      if (Guilds?.getSounds) {
        patches.push(
          after("getSounds", Guilds, (_, res) => res)
        );
      }
    });

    // 4) Profile theme (ghir kay-ban lik)
    safe("profile-theme", () => {
      const Profiles = findByStoreName("UserProfileStore");
      const myId = findByStoreName("UserStore").getCurrentUser().id;
      patches.push(
        after("getUserProfile", Profiles, ([id], profile) => {
          if (id === myId && profile) {
            profile.themeColors = CONFIG.profileTheme;
            profile.premiumType = 2;
          }
          return profile;
        })
      );
    });

    // 5) Nickname style f message dyalek
    safe("nick-style", () => {
      const Messages = findByProps("sendMessage", "receiveMessage");
      if (CONFIG.nicknameStyle === "none") return;
      // example: /nick text -> kayrj3 styled text
      patches.push(
        before("sendMessage", Messages, (args) => {
          const msg = args[1];
          if (msg?.content?.startsWith("!nick "))
            msg.content = styleText(msg.content.slice(6));
        })
      );
    });

    // 6) Channels mseddin: kayban f l-list (VIEW_CHANNEL = 1 << 10)
    safe("hidden-channels", () => {
      const Perms = findByProps("can", "getChannelPermissions");
      const VIEW = 1n << 10n;
      patches.push(
        instead("can", Perms, (args, orig) => {
          const [perm] = args;
          if (perm === VIEW) return true;
          return orig(...args);
        })
      );
    });

    // 7) Stickers mn gae3 servers: kay-tsifto b link dyal tswira
    safe("stickers", () => {
      const Stickers = findByProps("sendStickers");
      const Messages = findByProps("sendMessage", "receiveMessage");
      if (!Stickers?.sendStickers) return;
      patches.push(
        instead("sendStickers", Stickers, (args, orig) => {
          const [channelId, ids] = args;
          const content = ids
            .map((id) => `https://media.discordapp.net/stickers/${id}.png?size=160`)
            .join("\n");
          return Messages.sendMessage(channelId, {
            content,
            tts: false,
            invalidEmojis: [],
            validNonShortcutEmojis: [],
          });
        })
      );
    });

    // 8) Badges fake (ghir kayban lik)
    safe("badges", () => {
      const Profiles = findByStoreName("UserProfileStore");
      const myId = findByStoreName("UserStore").getCurrentUser().id;
      patches.push(
        after("getUserProfile", Profiles, ([id], profile) => {
          if (id === myId && profile) {
            const extra = CONFIG.badges.map((b, i) => ({
              id: "fake_" + i,
              description: b.description,
              icon: b.icon, // hash dyal Discord wla URL kaml
            }));
            profile.badges = [...(profile.badges || []), ...extra];
          }
          return profile;
        })
      );
    });

    // 8b) Badges: patch useBadges (hna kayt-rsem f mobile) + asset URL
    safe("badges-hook", () => {
      const myId = findByStoreName("UserStore").getCurrentUser().id;
      const mod = findByName("useBadges", false);
      if (mod?.default) {
        patches.push(
          after("default", mod, ([user], res) => {
            if (user?.userId === myId || user?.id === myId) {
              const extra = CONFIG.badges.map((b, i) => ({
                id: "fake_" + i,
                description: b.description,
                icon: b.icon,
              }));
              return [...(res || []), ...extra];
            }
            return res;
          })
        );
      }
      const Assets = findByProps("getBadgeAsset");
      if (Assets) {
        patches.push(
          instead("getBadgeAsset", Assets, (args, orig) =>
            typeof args[0] === "string" && args[0].startsWith("http")
              ? args[0]
              : orig(...args)
          )
        );
      }
    });

    // 9) Member Since fake (2015)
    safe("member-since", () => {
      const me = findByStoreName("UserStore").getCurrentUser();
      const fake = new Date(CONFIG.memberSince);
      Object.defineProperty(me, "createdAt", { value: fake, configurable: true });
      const Snow = findByProps("extractTimestamp");
      if (Snow) {
        patches.push(
          instead("extractTimestamp", Snow, (args, orig) =>
            args[0] === me.id ? fake.getTime() : orig(...args)
          )
        );
      }
    });

    // 10) Fake deafen: mnin t-mute, l-nass kaychoufok deafen w nta kat-sme3
    safe("fake-deafen", () => {
      const targets = [
        findByProps("voiceStateUpdate"),
        findByProps("updateVoiceState"),
      ].filter(Boolean);
      for (const t of targets) {
        const fn = t.voiceStateUpdate ? "voiceStateUpdate" : "updateVoiceState";
        patches.push(
          before(fn, t, (args) => {
            const s = args[0];
            if (CONFIG.fakeDeafen && s && (s.selfMute || s.self_mute)) {
              s.selfDeaf = true;
              s.self_deaf = true;
            }
          })
        );
      }
    });
  },

  onUnload() {
    for (const p of patches) typeof p === "function" && p();
    patches.length = 0;
  },
};
return exports;
})({}, vendetta.metro, vendetta.patcher);
