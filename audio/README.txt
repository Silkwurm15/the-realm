AUDIO FOLDER
============
Put this "audio" folder next to index.html on your host. Drop sound files in with EXACTLY these names (mp3 works everywhere; keep sound effects short).
Any file that is missing is simply silent, so you can add them one at a time.

audio/sfx/   (sound effects)
  tap.mp3      button taps
  chest.mp3    opening a chest
  nature.mp3   gathering from nature
  quest.mp3    quest start / progress
  rift.mp3     rift
  levelup.mp3  level up
  hit.mp3      combat hit
  win.mp3      victory
  lose.mp3     defeat
  error.mp3    errors

audio/music/ (looping music)
  map.mp3      plays on the map (starts after the player's first tap)
  battle.mp3   combat music

Only "tap" and "map" are wired up right now. To play another sound, tell me where it should trigger
(or call Sound.sfx('chest') / Sound.music('battle') in the game code). To add a brand-new sound name, add one line to
the SFX or MUSIC list near the top of the Settings section in index.html.

