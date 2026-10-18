AUDIO FOLDER
============
Put this "audio" folder next to index.html on your host. Sound effects go in audio/sfx/, music in audio/music/.
Use EXACTLY these file names (mp3). Any file that is missing is simply silent, so add them one at a time.
Keep sound effects short. Music files loop.

audio/sfx/  (sound effects)
  tap.mp3             any button tap
  chest.mp3           opening a chest (no fight)
  hit_melee.mp3       your attack: Warrior, Barbarian, Paladin, Anti-Paladin, Monk, Assassin
  hit_magic.mp3       your attack: Wizard, Druid, Healer, Bard
  nature_heal.mp3     Nature Discovery that healed you
  nature_plain.mp3    Nature Discovery with no heal
  quest_start.mp3     quest accepted
  quest_progress.mp3  quest step done (a light found, Traveler's Request progress)
  quest_complete.mp3  quest finished
  quest_fail.mp3      quest failed or ran out of time
  levelup.mp3         level up (always plays AFTER whatever caused it, e.g. after quest_complete)
  win.mp3             fight won
  lose.mp3            fight lost / you fall

  Optional extras (not required):
  hit_<class>.mp3     a sound for ONE class, e.g. hit_barbarian.mp3, hit_wizard.mp3. It replaces the group sound for that class.
  hit_ranged.mp3      Archer and Scout. Until you add it they use hit_melee.mp3.

audio/music/  (looping music)
  map.mp3             plays on the map (starts after the player's first tap)
  battle.mp3          general battle music, used whenever a specific battle track is missing
  battle_mimic.mp3    Mimic fight
  battle_strongmimic.mp3  Strong Mimic fight
  battle_rift.mp3     Creature Room in an Arcane Rift (the only combat in rifts)

When a fight ends the map music comes back. Dark Lair bosses have no music yet.
To add a new sound or track later, tell me where it should play.

