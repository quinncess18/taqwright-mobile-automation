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
  taqwright.config.ts     # android (local + CI) + ios (CI) projects
  tests/
    pages/                # POMs (BasePage, LoginPage, CatalogLandingPage, …)
    specs/01_auth/        # 01_functional, 02_negative, 03_deeplink (.spec.ts)
  app/                    # app binaries (gitignored — fetched per below)
.github/workflows/mobile-automation.yml # Android + iOS CI (parallel jobs)
```

## Prerequisites

Node 24 (taqwright's `engines` requires `>=24 <26` — it loads the `.ts` config
via Node's native TS type-stripping, which 18 lacks), the Android SDK/JDK, and
Appium are expected to be set up already (bootcamp prereqs). Verify rather than
reinstall:

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
**order-dependent** (e.g. the negatives rely on TC-L06's logout to hand back a
logged-out screen). Each test still owns the state it asserts on, though —
TC-N03 toggles password visibility itself rather than leaning on TC-N02's
leftover toggle, which kept it green once the iOS WDA timing changed. Stateful
slices (Catalog → Checkout) will add per-spec reset helpers, as the reference
does.

## Continuous integration (Android + iOS)

CI runs both platforms in parallel from a single workflow
([`.github/workflows/mobile-automation.yml`](.github/workflows/mobile-automation.yml)),
mirroring the reference repo's combined Android + iOS pipeline. Each job fetches
the app binary from the public `taqelah/demo-app` release at run time, starts
Appium manually (`appium.autoStart: false`), and runs the auth slice — scope
grows per platform as each slice's selectors are verified.

- **Android (Emulator)** — `ubuntu-22.04`, via
  [`reactivecircus/android-emulator-runner`](https://github.com/ReactiveCircus/android-emulator-runner)
  (Pixel 6, API 34, `google_apis`/x86_64). Installs the UiAutomator2 driver,
  `adb install`s the APK, then `npx taqwright test --project=android`. Same
  emulator config as the local run — both attach to the one running emulator.
- **iOS (Simulator)** — `macos-14`, boots an iPhone 15 (iOS 17.5) simulator,
  `simctl install`s the app, pins the XCUITest driver to `@7`, then
  `npx taqwright test --project=ios`. WebDriverAgent is **prebuilt and
  preinstalled** so the driver launches it via `usePreinstalledWDA` (no
  `xcodebuild` at session time) — the first session starts in seconds instead of
  cold-building WDA. iOS is CI-only: it needs macOS, which this Windows dev
  machine can't provide.

Selectors branch per platform in the POMs (`this.isAndroid` / `this.isIOS`):
Flutter `Key()` reaches Android `content-desc` but not iOS
`accessibilityIdentifier`, so iOS uses `getByLabel` (accessibility id) and
predicates. Typing on iOS goes char-by-char (`pressSequentially`) so Flutter's
`TextEditingController` updates.

## License

[MIT](./LICENSE) © 2026 Lara Talasan
