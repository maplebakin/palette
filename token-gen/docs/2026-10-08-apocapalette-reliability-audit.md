# Apocapalette: reliability, seed fidelity, and release audit

**Reviewed:** October 8, 2026  
**Baseline:** main at 058dbce09bbea41dc4083a3e1f80bb48e87797fa  
**Scope:** Public Tasting Room, Light/Dark/Pop generation, seven semantic roles, saved/share links, previews, accessibility, private forge boundary, export product readiness, tests, CI and repository structure.

## Executive diagnosis

**The colour engine's newer seed-relative OKLCH solver is promising, but the public controller has several contradictory layers of state around it.** Regenerate secretly replaces the seed hue; old mode-specific edits survive global source changes; Surprise me inherits the old exploration's locks; incomplete hex input is temporarily interpreted as a phrase; and one clipboard path falsely acknowledges success. Those five interacting behaviors can explain why a palette sometimes feels faithful and sometimes drifts, without implying that all of the underlying colour math is broken.

The repository also has 68 test files but no active GitHub Actions workflow at the repository root, and no browser E2E harness. This is a source-and-repository audit. Live Netlify visual inspection and local npm test execution were unavailable in this session. **Tests committed in the fixes below have not yet been executed by CI.**

## Architecture, traced end to end

1. Repository root is not the Vite app root: active project lives under **token-gen/**. Main contains 276 tracked files, including 199 files under token-gen/src and 68 .test.js/.test.jsx files.
2. **token-gen/src/main.jsx** mounts React StrictMode, notifications, a project provider, and App.
3. **token-gen/vite.config.js** selects public vs private app shell using VITE_PRIVATE_FORGE. **AppShell** renders TastingRoom for the public demo; the private forge enables project management and file export tools.
4. **TastingRoom.jsx** owns seed input, phrase hashing, regeneration count, harmony, mode-specific snapshots, locks/overrides, preview scene, share link, clipboard feedback, and browser-library actions.
5. **lib/theme/engine.js** calls **lib/tokens.js**, which uses **lib/core-math.js** for seed-relative OKLCH role generation and accessible foreground-solving.
6. **lib/playgroundPalette.js** maps seven semantic tokens to Background, Surface, Text, Heading, Muted, Accent, and CTA; TastingRoom applies role overrides before deriving preview, contrast view, and copied code.
7. **lib/playgroundLink.js** validates and round-trips share hashes including mode states and overrides. Browser saves and current session use separate localStorage keys, with no cloud account/sync.
8. **data/kits.js** describes finished kits; **KitGallery** currently labels the shop as opening soon. Seller downloads and marketplace archive construction are explicitly private forge workflows.

## Confirmed problems

### A01 | Hidden seed substitution during regeneration
**Priority: High / confidence: confirmed source.**

TastingRoom's buildThemeForState rotates the hue of state.baseColor by 15, 28, or 42 degrees depending on regenerateCount. The input continues displaying state.baseColor and the UI promises everything is rebuilt from the seed. This means a seed can be faithfully represented at iteration zero yet noticeably diverge at later iterations. The share link faithfully stores the original seed, not the hidden generatedBase. This contradicts the expected "one selected seed" mental model.

**Fix:** [PR #17](https://github.com/maplebakin/palette/pull/17) always passes the authored seed to the engine. Different regeneration steps still vary the harmony intensity. Pure regression tests cover several seeds and repeated clicks. Preserve mode/harmony-derived accents; those are intended variations, not replacements for the seed.

### A02 | Inactive Light/Dark/Pop edits return after a new seed or harmony
**Priority: High / confidence: confirmed source.**

Global edits use markMutation, which resets swatchOverrides on the active mode but preserves the saved **modeStates** snapshots, including their old overrides and generation indices. When a user returns to an inactive mode, TastingRoom restores an adjustment from the previous seed. Saved shares can persist this mismatch. This is an especially plausible cause of an apparently unfaithful Light or Pop variant after editing Dark.

**Fix:** [PR #20](https://github.com/maplebakin/palette/pull/20) clears inactive **unlocked** overrides and obsolete iteration state whenever global source/tuning changes. Explicit locks remain intentional. Regression test: set a Dark accent, switch to Light, change seed, return to Dark and ensure old accent does not return.

### A03 | Surprise me isn't necessarily a fresh palette
**Priority: Medium/High / confidence: confirmed source.**

Surprise me generates a new random baseColor but retains old lockedSwatches, modeStates, hue/saturation nudges, and confirmedModes. A new blue seed could therefore still show old red overrides or locked roles. That is legal state but not a reasonable "new exploration" default.

**Fix:** Also [PR #20](https://github.com/maplebakin/palette/pull/20). A new random seed now clears previous locks, tuning, mode snapshots and mode confirmations while retaining the chosen harmony/mode.

### A04 | Missing root workflow makes tests invisible to GitHub
**Priority: High / confidence: confirmed repository tree and Actions history.**

The tracked workflow exists at **token-gen/.github/workflows/ci.yml**, which GitHub Actions does not discover. The repository has no .github/workflows in its root and no Actions runs, so new PRs cannot legitimately claim a completed CI check. The current nested workflow describes lint, tests, build and Pages deployment, but that description is not an executed test.

**Fix:** [PR #16](https://github.com/maplebakin/palette/pull/16) adds root CI to run npm ci, lint, Vitest, a public-path build + verification, and an independent private-forge build. **Merge this PR first.** It intentionally does not auto-deploy, to avoid unrequested release behavior. Test success remains unverified until Actions actually runs.

### A05 | Partial hex typing creates arbitrary intermediate colours
**Priority: Medium / confidence: confirmed source.**

If toSeedHex fails, handleSeedInput immediately hashes input as a phrase. Typing #ab or #abcde can temporarily generate a new unrelated seed; completion restores the intended hex. Users see a palette flashing through other hues while editing a code, even though they never requested a phrase.

**Fix:** [PR #19](https://github.com/maplebakin/palette/pull/19) treats explicit # input as a hex transaction: use the last valid seed until the hex is complete, show a non-blocking helper, and keep deterministic phrase generation intact.

### A06 | Copy hex can falsely report success
**Priority: Medium / confidence: confirmed source.**

copySingleHex updates the "Copied" toast and copy counter **before** attempting Clipboard API write. A blocked permission, missing Clipboard API or a rejected write still shows success. Code-copy and share-link-copy paths already have genuine success/error handling, so behavior is inconsistent across similar actions.

**Fix:** [PR #18](https://github.com/maplebakin/palette/pull/18) awaits writeText and only then announces success; rejects/errors receive a clear failure message. Includes mock clipboard regression cases.

### A07 | localStorage getter can crash app startup in restricted contexts
**Priority: High / confidence: confirmed branch behavior, not a reproduced customer crash.**

loadPlaygroundSession and savePlaygroundSession tested window.localStorage *outside* try/catch. Some sandboxed browser contexts throw SecurityError even on property access. Since loadPlaygroundSession is called during the Tasting Room's React state initialization, an exception can prevent the editor mounting.

**Fix:** [PR #21](https://github.com/maplebakin/palette/pull/21) puts all storage property access inside guarded handlers and tests SecurityError on the getter. This does not pretend ephemeral session state was saved.

### A08 | Public demo initializes private Forge project state
**Priority: Medium / confidence: confirmed entry graph.**

main.jsx mounts ProjectProvider unconditionally. That provider calls useProjectState/useProjectStorage and initializes the private project state even for visitors who only use the public Tasting Room; no public page needs the project context. This increases entry-graph coupling and background storage work, and muddies the guarantee that the public demo excludes private Forge tooling.

**Fix:** Also [PR #21](https://github.com/maplebakin/palette/pull/21). Vite resolves a pass-through provider for the public app and keeps the full provider for private builds. Verify both builds with real CI before merging.

## Product and testing gaps (not claimed runtime failures)

### A09 | "Confirmed" mode indicator means visited, not reviewed
**Priority: Medium product honesty / confidence: confirmed behavior.**

toggleMode immediately sets confirmedModes[mode] to true on navigation, and the sparkle icon is labelled "confirmed". That is not equivalent to user acceptance, color-contrast validation, or production-kit approval. Do not let the public wording convey an assurance the app never verified.

**Next:** Relabel as **Explored** or add an explicit confirmation action in Forge, with independent contrast status. Preserve legacy serialization shape to avoid breaking existing share URLs.

### A10 | No actual browser acceptance test for the full journey
**Priority: High validation gap / confidence: confirmed repository files and package scripts.**

Vitest + React Testing Library are substantial (68 test files, including a large tokens test suite), but there is no Playwright/Cypress harness or required browser journey. A jsdom assertion can verify control values and rendered class names, but not mobile layout, clipboard permissions, complete browser navigation, preview screenshots, focus movement, share/refresh/reopen on actual storage, or deployment-specific asset paths.

**Next:** Add a small Chromium smoke sequence *after CI is restored*: enter seed, Regenerate, change each mode, lock a role, edit a role, inspect preview/contrast, copy and share, refresh with hash, save and reload browser palette, and assert no console errors. A second screenshot-based matrix should cover muted, dark, pale, grey, saturated and near-neon seeds in all modes and harmonies.

### A11 | Local-only saved palettes are not backed up automatically
**Priority: Medium data expectation / confidence: verified documented product boundary.**

The public experience uses localStorage for current session and saved palettes. There is no account or sync, and the public app intentionally offers no file downloads, while private Forge does. Clearing site data or changing devices loses the browser library; a share link is the current portable handoff.

**Next:** Keep "Save in this browser" explicit, and describe share link as a manual backup of the selected palette, not cloud sync. If portability is later enabled for the public app, treat that as a product decision, not an accidental bypass of the demo/forge boundary.

### A12 | Preview and kit sales have separate truth contracts
**Priority: Medium launch readiness / confidence: verified source.**

The Tasting Room shows seven live semantic roles and honest code/hex copying. The finished-kit gallery advertises 59-token products and Light/Dark/Pop delivery, but states "Shop opening soon" and offers no checkout. That is intentionally not a broken button, nor is lack of public downloadable packages a regression. However, a user-generated seven-role sketch is not itself the finished kit, and this distinction should remain explicit in every conversion message.

**Next:** Before storefront launch, validate the downloadable ZIP contents, all advertised formats, Procreate truncation note, commercial license, manifest, colour-role consistency, SEO/legal copy, and actual payment/customer fulfillment separately. Do not silently wire buy buttons before a real checkout exists.

### A13 | Stale contributor guidance and duplicate-looking source
**Priority: Low/Medium maintenance / confidence: confirmed repository files.**

token-gen/AGENTS.md still claims no automated test suite exists, even though there are now 68 test files. The root also contains src/lib/exports/marketplaceKit.js with the same content as token-gen/src/lib/exports/marketplaceKit.js. A coding agent can edit the root duplicate and see no change in the actual app, or overlook real tests due to old instructions.

**Next:** Refresh contributor guidance after CI lands, and either remove the unreferenced duplicate after proving no external script imports it, or document the authoritative copy.

## Strengths to preserve

- Seed-relative OKLCH role generation and explicit contrast-solving; it is a genuine improvement over treating Light/Dark/Pop as arbitrary unrelated aesthetic palettes.
- Strong React-level regression coverage for actual Tasting Room controls and palette states.
- Seven clearly named semantic roles, copyable colours, edits and explicit locks.
- The preview exposes visible failure states for bad contrast instead of disguising manually selected inaccessible text.
- Explicit public demo versus private seller/Forge export boundary.
- Separate saved palette library, current session and portable share links with strict payload validation.
- "Finished kit" products are represented separately from generated sketches; shop status is clearly not an active checkout.

## Recommended merge and acceptance order

1. **#16 first:** establish real CI. Check first Actions result rather than assuming success.
2. **#17:** stop drifting from the seed. Run the muted/mid-tone seed gauntlet for all three modes.
3. **#20:** reset stale cross-mode state and "Surprise me" inheritance.
4. **#19 and #18:** correct input and clipboard truthfulness.
5. **#21:** isolate public/private providers and handle blocked storage; require both builds green.
6. Merge this audit independently; then schedule a proper browser E2E and responsive visual pass.

These PRs were authored separately against the same main baseline; merge sequentially, checking the combined CI and resolving any conflicts. They are review proposals, not applied changes to main.

## Manual test matrix

- **Hex:** slowly type #987f9d, delete back to partial, retype; palette should remain at last valid colour during invalid partial values.
- **Regenerate:** note authored seed, repeat Space/Regenerate several times; generated harmony changes, seed input never has a hidden replacement.
- **Mode memory:** edit Dark Accent, switch Light, change global seed, return Dark; no stale unlocked Accent.
- **Lock:** lock a role and regenerate; only deliberately locked roles survive. Surprise me must reset all locks.
- **Contrast:** override text with background; clear Fail status must be visible; restore readable values.
- **Clipboard:** accept and reject browser clipboard writes; success should appear only after confirmation.
- **Persistence:** normal browser save/refresh/load and blocked storage startup; no crashed Tasting Room.
- **Share:** copy link, open in fresh tab, switch through edited Light/Dark/Pop snapshots, compare visible seven roles.
- **Public/Forge:** both build successfully; public bundles do not mount private project state or show downloads, Forge retains exports and project editing.
- **Mobile/keyboard:** verify preview scenes, controls, mode pills, role colour pickers, focus order, and no horizontal overflow at narrow viewport widths.

## Validation limitations

This was a direct GitHub source/tree/test review, plus attempts to access the public Netlify site and local clone. The public site could not be fetched through the browsing interface, and the local clone could not resolve github.com; no interactive screenshots, npm run test/build output, or real-device checks are claimed in this audit. Opening a pull request does not mean a test passed. GitHub Actions are not active on the current default branch until root workflow #16 lands.
