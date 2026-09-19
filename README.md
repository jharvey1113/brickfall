# Brickfall

A falling-blocks puzzle game that runs in any browser, including phones.

**Play:** https://jharvey1113.github.io/brickfall/

## Modes

- **Classic**: rotate falling blocks and fill rows to clear them. Includes hold, a next-piece queue, a ghost piece, and levels that speed up.
- **Brick Blast**: drag blocks from a tray of three onto an 8×8 grid. Fill rows or columns to blast them, and chain clears for combos.

Both modes have synthesized sound effects and a synthwave soundtrack. Use the Music and Sound buttons (or **M**) to turn them on or off. On iPhone, the silent switch mutes the game.

## Controls

| Classic | Keys |
|---|---|
| Move | ← → |
| Rotate | ↑ / Z |
| Soft / hard drop | ↓ / Space |
| Hold | C |
| Pause | P |

In Brick Blast, drag with a mouse or finger, or press 1–3 to pick a block, use the arrows to move it, and press Enter to place it. On phones, Classic shows on-screen buttons.

## Files

- `index.html` is the game source.
- `docs/index.html` is the published copy that GitHub Pages serves.
- `build.js` regenerates `docs/index.html` from the source. Run `node build.js` after editing `index.html`.
