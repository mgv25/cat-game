# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based game where a cat catches mice. The game is written in vanilla JavaScript with no build process or dependencies. The UI is in Russian ("Кот ловит мышь" - "Cat Catches Mouse").

## Architecture

**Single-Page Application**: The entire game runs client-side in the browser:
- `index.html` - Single HTML page with game structure and overlays
- `game.js` - All game logic in an IIFE (Immediately Invoked Function Expression)
- `styles.css` - CSS custom properties for theming, responsive design

**Game State Machine**: The game uses a status-based state machine (game.js:25-26):
- `idle` - Start screen visible
- `running` - Active gameplay with timer and mouse spawning
- `paused` - Game paused due to orientation change or tab visibility
- `ended` - Game over screen visible

**Core Game Loop**: The game operates with three timers (game.js:39-44):
- `tickTimerId` - Updates HUD every 125ms (game.js:167-179)
- `nextSpawnTimerId` - Schedules next mouse appearance (game.js:181-191)
- `mouseHideTimerId` - Auto-hides mouse after random duration (game.js:229-233)

**Coordinate System**: The game uses pixel-based positioning relative to `#gameField`:
- Mouse and cat positions use `{xPx, yPx}` coordinates
- Hitbox detection uses `HITBOX_SIZE_PX` (80px) centered on mouse position (game.js:301-307)
- Coordinates are calculated relative to `#gameField.getBoundingClientRect()` (game.js:194-211, 313-315)

**Persistence**: Only the best score is persisted using `localStorage` with key `catMouseBestScore` (game.js:71-87)

## Development Commands

This project has no build process or package manager. To develop:

**Run the game**:
```bash
# Open index.html in a browser (no dev server required)
open index.html
```

For local development with live reload, use any simple HTTP server:
```bash
python3 -m http.server 8000
# or
npx serve
```

**Test**: No automated tests exist. Test manually by opening in browser.

**Deploy**: Copy `index.html`, `game.js`, and `styles.css` to any static hosting.

## Key Implementation Details

**Orientation Handling**: The game pauses automatically on mobile landscape orientation (game.js:122-165):
- `isPhoneLike()` checks if viewport width <= 767px
- `isLandscape()` checks orientation
- When blocked, game state transitions to `paused` and preserves remaining time
- `#rotateOverlay` displays instruction to rotate device

**Pause/Resume Logic**: Game pauses when tab loses visibility (game.js:374-390):
- Uses `document.visibilitychange` event
- Saves `pausedRemainingMs` to preserve exact remaining time
- Clears all timers to prevent background resource usage
- Resumes only if orientation is still allowed

**Pointer Events**: Uses pointer events (not mouse/touch) for unified input handling (game.js:309-336, 346):
- `pointerdown` on `#gameField` spawns cat at click/tap position
- Checks if click intersects mouse hitbox for score increment
- Prevents default behavior to avoid scrolling/text selection

**Score Management**: Best score updates during gameplay but saves only at round end (game.js:278, 322-325):
- `bestScoreAtRoundStart` tracks value at game start
- `bestScore` can increase during round for HUD display
- Only saved to localStorage in `endGame()` if improved
