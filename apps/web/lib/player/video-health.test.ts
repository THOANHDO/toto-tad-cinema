import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { checkVideoHealth, VideoHealthWatchdog } from "./video-health";

describe("Video Health Evaluation & Audio-Only Black Video Watchdog", () => {
  test("1. video element null returns unhealthy status", () => {
    const status = checkVideoHealth(null);
    assert.equal(status.isHealthy, false);
    assert.equal(status.reason, "no_video_element");
  });

  test("2. videoWidth=0 and totalVideoFrames=0 returns unhealthy (audio_only_playback)", () => {
    const fakeVideo = {
      videoWidth: 0,
      videoHeight: 0,
    } as any;

    const status = checkVideoHealth(fakeVideo);
    assert.equal(status.isHealthy, false);
    assert.equal(status.reason, "audio_only_playback");
  });

  test("3. videoWidth > 0 and videoHeight > 0 returns healthy", () => {
    const fakeVideo = {
      videoWidth: 1920,
      videoHeight: 1080,
    } as any;

    const status = checkVideoHealth(fakeVideo);
    assert.equal(status.isHealthy, true);
    assert.equal(status.reason, "healthy");
  });

  test("4. totalVideoFrames > 0 returns healthy even if videoWidth is 0", () => {
    const fakeVideo = {
      videoWidth: 0,
      videoHeight: 0,
      getVideoPlaybackQuality: () => ({ totalVideoFrames: 45 }),
    } as any;

    const status = checkVideoHealth(fakeVideo);
    assert.equal(status.isHealthy, true);
    assert.equal(status.totalVideoFrames, 45);
  });

  test("4b. currentTime > 0 and not paused returns healthy even on platforms without getVideoPlaybackQuality", () => {
    const fakeVideo = {
      videoWidth: 0,
      videoHeight: 0,
      currentTime: 1.5,
      paused: false,
    } as any;

    const status = checkVideoHealth(fakeVideo);
    assert.equal(status.isHealthy, true);
    assert.equal(status.reason, "healthy");
  });

  test("4c. readyState >= 2 and not paused returns healthy", () => {
    const fakeVideo = {
      videoWidth: 0,
      videoHeight: 0,
      readyState: 3,
      paused: false,
    } as any;

    const status = checkVideoHealth(fakeVideo);
    assert.equal(status.isHealthy, true);
    assert.equal(status.reason, "healthy");
  });

  test("5. VideoHealthWatchdog does not trigger error when video is paused", () => {
    const watchdog = new VideoHealthWatchdog();
    let errorTriggered = false;

    const fakeVideo = {
      videoWidth: 0,
      videoHeight: 0,
      paused: true,
    } as any;

    watchdog.start(fakeVideo, "attempt-1", () => {
      errorTriggered = true;
    }, 50);

    // Force evaluation
    watchdog.evaluateHealth();
    assert.equal(errorTriggered, false);
    watchdog.stop();
  });

  test("6. VideoHealthWatchdog triggers audio_only_playback when playing without video dimensions", () => {
    const watchdog = new VideoHealthWatchdog();
    let errorReason = "";

    const fakeVideo = {
      videoWidth: 0,
      videoHeight: 0,
      paused: false,
    } as any;

    watchdog.start(
      fakeVideo,
      "attempt-1",
      (reason) => {
        errorReason = reason;
      },
      1000
    );

    watchdog.evaluateHealth();
    assert.equal(errorReason, "audio_only_playback");
    watchdog.stop();
  });

  test("7. Watchdog stop clears timers and frame callbacks cleanly", () => {
    const watchdog = new VideoHealthWatchdog();
    let errorTriggered = false;

    const fakeVideo = {
      videoWidth: 0,
      videoHeight: 0,
      paused: false,
    } as any;

    watchdog.start(fakeVideo, "attempt-1", () => {
      errorTriggered = true;
    }, 10);

    watchdog.stop();
    watchdog.evaluateHealth();
    assert.equal(errorTriggered, false);
  });
});
