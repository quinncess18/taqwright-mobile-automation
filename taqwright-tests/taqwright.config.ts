import { defineConfig, Platform } from '@taqwright/taqwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Resolve app binaries relative to this config file so paths are stable
// regardless of the cwd taqwright is invoked from.
const __dirname = dirname(fileURLToPath(import.meta.url));
const ANDROID_APK = resolve(__dirname, 'app/DemoApp-v1.1.0-debug.apk');
const IOS_APP = resolve(__dirname, 'app/Runner.app');

// App identifiers — verified from the v1.1.0 debug binaries:
//   Android: aapt dump badging → package name='com.taqelah.demo_app'
//   iOS:     Runner.app/Info.plist → CFBundleIdentifier=com.taqelah.demoApp
// (debug builds kept the release ids; no .debug suffix.)
const ANDROID_BUNDLE_ID = 'com.taqelah.demo_app';
const IOS_BUNDLE_ID = 'com.taqelah.demoApp';

export default defineConfig({
  testDir: './tests',
  // 180s per test — mirrors the reference repo's iOS testTimeout. The cold
  // first-session WebDriverAgent build (which tripped TC-L01/L02 at ~2min) is
  // absorbed by `retries` below, the same way the reference handles it, rather
  // than by inflating per-test/connection timeouts.
  timeout: 180_000,
  expectTimeout: 30_000,
  // 2 retries on CI / 1 locally — mirrors the reference repo. This is how the
  // reference absorbs the one-time WDA cold build on the first iOS session: an
  // attempt that aborts while WDA is still compiling is retried, and the next
  // attempt finds WDA already built and passes. A genuine failure fails every
  // attempt. Android (run locally) gets 1 retry to absorb cold-boot render lag.
  retries: process.env.CI ? 2 : 1,
  // Mobile/Appium sessions don't tolerate concurrent device access on one
  // emulator — run serially (mirrors the reference repo's workers:1).
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never', title: 'Taqwright Test Report' }]],

  projects: [
    {
      // Android — runs locally on a booted emulator (Pixel_8, API 35).
      name: 'android',
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: 'emulator',
          // Leave name unset so taqwright attaches to whichever emulator is
          // already running (Pixel_8). Override via DEVICE udid if needed.
        },
        appium: {
          // Appium is started manually on this machine (the emulator crashes
          // under load when Appium boots concurrently). autoStart stays a
          // fallback: it only spawns if nothing is already listening.
          autoStart: false,
          host: '127.0.0.1',
          port: 4723,
          path: '/',
        },
        // Disabled per user direction: per-test reinstall (terminate → uninstall
        // → reinstall → relaunch) caused heavy foreground churn and slow runs.
        // Specs manage their own starting state instead (login helper per spec),
        // mirroring the reference repo's per-spec beforeAll design.
        resetBetweenTests: false,
        buildPath: ANDROID_APK,
        appBundleId: ANDROID_BUNDLE_ID,

        trace: 'on-failure',
        video: 'on-failure',
      },
    },

    {
      // iOS — CI ONLY. This Windows laptop cannot run the iOS simulator
      // (needs a macos-14 GitHub Actions runner). The workflow filters to
      // --project=ios; locally we always run --project=android.
      name: 'ios',
      use: {
        platform: Platform.IOS,
        device: {
          provider: 'emulator', // simulator; provider key is 'emulator' for local sims
          name: /iPhone 15/,
          osVersion: '17.5',
        },
        appium: {
          autoStart: false,
          host: '127.0.0.1',
          port: 4723,
          path: '/',
        },
        resetBetweenTests: false,
        buildPath: IOS_APP,
        appBundleId: IOS_BUNDLE_ID,

        trace: 'on-failure',
        video: 'on-failure',
      },
    },
  ],
});
