# Brickfall

A family arcade of quick games that runs in any browser, including phones.

**Play:** https://jharvey1113.github.io/brickfall/

That link is a door chooser: the quick games live at `/brickfall/games/`, and the long road-trip game **One More Exit** lives at https://jharvey1113.github.io/one-more-exit/.

## Games

- **Classic**: rotate falling blocks and fill rows to clear them. Includes hold, a next-piece queue, a ghost piece, and levels that speed up.
- **Brick Blast**: drag blocks from a tray of three onto an 8×8 grid. Fill rows or columns to blast them, and chain clears for combos.
- **Sweet Swap**: a match-three candy game with cascades, combos, striped candies and colour bombs, played along an endless level trail.
- **Spin to Win**: a three-reel slot machine with a pull handle and a Wheel-of-Fortune bonus wheel. Play chips only, with a free daily bonus and free refills; nothing to buy and nothing paid out.
- **Letter Ladder**: swipe across a wheel of letters to spell the hidden words. There are 500 levels, starting with 4 letters and 2 words and climbing to 7 letters and 10 words. Bonus words earn coins, and coins buy hints.

All three games share a synthwave soundtrack, sound effects, and random cheers for good moves. Use the music and sound buttons (or **M**) to turn them on or off. On iPhone, the silent switch mutes the game.

## Family leaderboard and crowns

Players enter a name once, and scores save automatically to a shared board (This week / All time). The all-time #1 in each game holds that game's crown, shown on the home screen. When someone takes it, the home screen announces who stole the crown from whom.

## Separate boards (groups)

Each board is separate, with its own top-10 lists and crowns:

| Link | Board |
|---|---|
| `…/brickfall/` | the family board |
| `…/brickfall/?group=AFUHSD` | a separate AFUHSD board |
| `…/brickfall/?solo` | no shared board; scores stay on that phone |

A phone remembers its group after opening the link once. Opening a different group link switches it. Scores are stored with a `grp` column in Supabase, and anything without a group counts as `family`.

## Controls

| Classic | Keys | Phone |
|---|---|---|
| Move | ← → | Drag sideways |
| Rotate | ↑ / Z | Tap |
| Soft drop | ↓ | Drag down |
| Hard drop | Space | Flick down |
| Hold | C | Swipe up |
| Pause | P | Pause button |

In Brick Blast, drag with a mouse or finger, or press 1–3 to pick a block, use the arrows to move it, and press Enter to place it.

In Letter Ladder, swipe across the letters or tap them one at a time and press ✓. On a keyboard, type the letters and press Enter; Space shuffles.

## Files

- `index.html` is the game source.
- `docs/index.html` is the door chooser, and `docs/games/index.html` is the published arcade that GitHub Pages serves.
- `build.js` regenerates `docs/games/index.html` from the source. Run `node build.js` after editing `index.html`.
- `tools/words.txt` is the Letter Ladder word list, and `tools/gen-ladder.js` rebuilds the levels from it into `index.html`. Run `node tools/gen-ladder.js` after editing the word list.
