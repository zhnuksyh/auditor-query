# Background music

The game loops a single background track while you work a case.

## How to add the music

1. Get a music track that is **free to distribute** (e.g. Creative Commons / CC0,
   or one whose licence permits including it in this repo).
2. Drop it into **this folder** (`public/music/`).
3. Point `MUSIC_FILE` in [`src/engine/music.js`](../../src/engine/music.js) at
   its filename.

The current track is `theme.mp3` — carried over from Detective Query, this
project's parent, and still a crime-drama cue rather than anything audit-flavoured.
Replacing it is on the reskin list. Until the file named in `MUSIC_FILE` is
present the game stays silent; everything else works fine without it.

Toggle music on/off and set its volume in **Options**. If you ship a track,
remember to credit it in the Credits screen (`src/screens/Credits.jsx`) if its
licence requires attribution.
