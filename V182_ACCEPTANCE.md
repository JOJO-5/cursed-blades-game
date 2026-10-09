# v0.18.0-preview.2 — Treasure retrieval and biome travel marks

## Delivered

- New gold treasure magnet attracts every currently available normal, rare and quest chest in the active map. Suspicious trap chests remain in place. Future spawns require another magnet.
- First elite or the first kill after 50 stage kills guarantees the initial magnet; subsequent normal/elite kills have 0.4%/20% chances; bosses guarantee one. Magnet pickups remain for 90 seconds.
- True chests persist until leaving the stage instead of disappearing after 30 seconds. Chest rarity and quest protection survive attraction and save/continue.
- Chest rewards open sequentially, so overlapping arrivals cannot replace a pending reward. Collected pickups cannot grant rewards twice.
- Removed shared broad translucent scene-path strokes from mine, hell, frost and marsh. Added scattered cart scuffs, ash fissures, snow footprints and irregular stepping stones, leaving a clear central area.
- Forest has winding leaf/root traces, clock has orthogonal foundry marks, court has a broken marble processional aisle. Village retains its existing worn dirt roads.
- Travel marks are baked into the ground cache. Collision footprints, reserved corridors, layout versions and old-save geometry are preserved.

## Local verification

- `npm test`: passed, including the new treasure regression, all existing map reachability and exact save-geometry checks.
- `tests/treasure-magnet-browser.js`: 15 checks passed, no browser errors. Real movement collected the item; remote quest/rare chests arrived; actual keyboard choices completed both rewards; real reload retained attraction and quest metadata.
- Inspected screenshots of all eight scenes. Revised mine/marsh after the first visual pass to remove the remaining central X impression.
- Screenshots: `output/playwright/v120/v182-*-roads.png` (generated, ignored artifacts).

## Release gates

Full browser regression, natural opening checks and public Pages verification are pending at the implementation commit; final results will be recorded after deployment.

## Acceptance limits

The focused browser fixture supplies items and uses invulnerability to isolate retrieval. It does not establish natural four-stage balance, physical phone rendering, speaker audio or strict all-frame 60 fps acceptance.
