# taqwright-mobile-automation

TypeScript mobile-test suite for the **Taqelah Boutique** Flutter app, built on
[**taqwright**](https://www.npmjs.com/package/@taqwright/taqwright) — a
Playwright-ergonomics layer over Appium (UIA2 / XCUITest).

It is the TypeScript companion to
[`taqelah-mobile-automation`](https://github.com/quinncess18/taqelah-mobile-automation)
(JavaScript + WebdriverIO), which tests the same app. This repo rebuilds that
coverage in TS — same test-case IDs (`TC-L01…`) so the two cross-reference
cleanly — and additionally targets behaviour that only exists in the newer app
build (see below).

## App under test — v1.1.0

This repo targets **v1.1.0** of `taqelah/demo-app` (a bootcamp build), whereas
the reference repo is pinned to v1.0.0. v1.1.0 adds testable surface the
original suite could not cover:

- **Planted "crash" on `*` search** — a search query containing `*` replaces the
  product grid with a rendered error state ("App crashed on search result").
- **`red` → `black` synonym pollution** — searching `red` silently also matches
  black products (a contaminated result set).
- **WebView DOM inspection** — debug builds enable `WebContentsDebuggingEnabled`,
  so the WEBVIEW context allows real DOM assertions (the v1.0.0 suite could only
  assert rendered text).
- **Login-bypass deep link** — `demoapp://login?username=<u>&password=<p>`:
  valid creds jump straight to `/home`; invalid creds route to `/login` with an
  "Invalid deeplink credentials" snackbar.

See [`TEST_PLAN.md`](./TEST_PLAN.md) for the full coverage map and status.

## Layout

```
taqwright-tests/
  taqwright.config.ts     # android (local) + ios (CI) projects
  tests/
    pages/                # POMs (BasePage, LoginPage, CatalogLandingPage, …)
    specs/01_auth/        # functional.spec.ts, negative.spec.ts
  app/                    # app binaries (gitignored — fetched per below)
.github/workflows/ios.yml # iOS CI on macos-14
```

## Prerequisites

Node 18+, the Android SDK/JDK, and Appium are expected to be set up already
(bootcamp prereqs). Verify rather than reinstall:

```bash
cd taqwright-tests
npm install
npx taqwright doctor
```

Download the app binaries into `taqwright-tests/app/` (kept local, not committed):

```bash
cd taqwright-tests
gh release download v1.1.0 --repo taqelah/demo-app --pattern "DemoApp-v1.1.0-debug.apk" --dir app
gh release download v1.1.0 --repo taqelah/demo-app --pattern "DemoApp-v1.1.0-debug-ios.app.zip" --dir app
unzip app/DemoApp-v1.1.0-debug-ios.app.zip -d app/   # → app/Runner.app (iOS)
```

## Running (Android — local)

iOS cannot run locally on Windows; Android is the local target.

> **Boot Appium first.** On the dev machine the emulator can crash when Appium
> spins up concurrently, so start the server manually and leave it running
> (`taqwright.config.ts` has `appium.autoStart: false`):

```bash
npx appium                 # in its own terminal; confirm http://127.0.0.1:4723/
# with a Pixel emulator booted:
npx taqwright test --project=android tests/specs/01_auth
```

### Test isolation

`resetBetweenTests: false` — one shared session per run, **mirroring the
reference repo's `noReset` model**. The auth suite is intentionally
**order-dependent** (e.g. TC-N03 inherits the visibility toggle from TC-N02;
the negatives rely on TC-L06's logout to hand back a logged-out screen).
Stateful slices (Catalog → Checkout) will add per-spec reset helpers, as the
reference does.

## Running (iOS — CI only)

iOS needs macOS, so it runs exclusively in GitHub Actions
([`.github/workflows/ios.yml`](.github/workflows/ios.yml)) on a `macos-14`
runner: boot an iPhone 15 (iOS 17.5) simulator, `simctl install` the app, start
Appium (XCUITest driver pinned to `@7`), then `npx taqwright test --project=ios`.
The app binary is fetched from the public `taqelah/demo-app` release at CI time.

Selectors branch per platform in the POMs (`this.isAndroid` / `this.isIOS`):
Flutter `Key()` reaches Android `content-desc` but not iOS
`accessibilityIdentifier`, so iOS uses `getByLabel` (accessibility id) and
predicates. Typing on iOS goes char-by-char (`pressSequentially`) so Flutter's
`TextEditingController` updates.

## License

[MIT](./LICENSE) © 2026 Lara Talasan
