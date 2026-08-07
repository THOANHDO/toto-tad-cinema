import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { findNextPlayableSourceIndex } from "./failover-helper";
import { controllerReducer, type ControllerState } from "../../hooks/usePlayerStateMachine";
import type { PlaybackSource } from "./source-candidates";

const mockSources: PlaybackSource[] = [
  { id: "op-hls", provider: "ophim", kind: "hls", url: "https://op.com/1.m3u8", label: "OPhim HLS", priority: 1 },
  { id: "nc-hls", provider: "nguonc", kind: "hls", url: "https://nc.com/1.m3u8", label: "NguonC HLS", priority: 2 },
  { id: "pa-hls", provider: "phimapi", kind: "hls", url: "https://pa.com/1.m3u8", label: "PhimAPI HLS", priority: 3 },
  { id: "op-embed", provider: "ophim", kind: "embed", url: "https://op.com/embed/1", label: "OPhim Embed", priority: 4 },
];

describe("Pure Helper: findNextPlayableSourceIndex", () => {
  test("1. Returns next index when current source fails", () => {
    const nextIdx = findNextPlayableSourceIndex({
      sources: mockSources,
      currentIndex: 0,
      failedSourceIds: ["op-hls"],
    });
    assert.equal(nextIdx, 1); // nc-hls
  });

  test("2. Skips already failed sources", () => {
    const nextIdx = findNextPlayableSourceIndex({
      sources: mockSources,
      currentIndex: 0,
      failedSourceIds: ["op-hls", "nc-hls"],
    });
    assert.equal(nextIdx, 2); // pa-hls
  });

  test("3. Returns -1 when all subsequent sources are failed", () => {
    const nextIdx = findNextPlayableSourceIndex({
      sources: mockSources,
      currentIndex: 2,
      failedSourceIds: ["op-hls", "nc-hls", "pa-hls", "op-embed"],
    });
    assert.equal(nextIdx, -1);
  });
});

describe("Atomic Controller Reducer Tests", () => {
  const initialState: ControllerState = {
    episodeKey: "test:1",
    sources: mockSources,
    activeIndex: 0,
    attemptId: 1,
    phase: "attempting",
    failedSourceIds: [],
    statusMessage: "",
    savedTime: 0,
    manualSelected: false,
  };

  test("4. Stale attemptId error is ignored by reducer", () => {
    const state1 = controllerReducer(initialState, {
      type: "SOURCE_FAILED",
      sourceId: "op-hls",
      attemptId: 999, // Stale
      reason: "manifest_error",
    });

    assert.equal(state1.activeIndex, 0);
    assert.equal(state1.attemptId, 1);
    assert.equal(state1.failedSourceIds.length, 0);
  });

  test("5. Valid attempt error advances activeIndex and increments attemptId", () => {
    const state1 = controllerReducer(initialState, {
      type: "SOURCE_FAILED",
      sourceId: "op-hls",
      attemptId: 1, // Valid
      reason: "manifest_error",
    });

    assert.equal(state1.activeIndex, 1);
    assert.equal(state1.attemptId, 2);
    assert.equal(state1.failedSourceIds.includes("op-hls"), true);
    assert.equal(state1.phase, "switching");
  });

  test("6. HLS -> Embed transition sets phase to embed_loading", () => {
    const stateWithFailedHls: ControllerState = {
      ...initialState,
      activeIndex: 2, // pa-hls
      attemptId: 3,
      failedSourceIds: ["op-hls", "nc-hls"],
    };

    const stateNext = controllerReducer(stateWithFailedHls, {
      type: "SOURCE_FAILED",
      sourceId: "pa-hls",
      attemptId: 3,
      reason: "audio_only_playback",
    });

    assert.equal(stateNext.activeIndex, 3); // op-embed
    assert.equal(stateNext.phase, "embed_loading");
    assert.equal(stateNext.failedSourceIds.includes("pa-hls"), true);
  });

  test("7. All sources failed transitions phase to failed", () => {
    const stateAtLast: ControllerState = {
      ...initialState,
      activeIndex: 3, // op-embed
      attemptId: 4,
      failedSourceIds: ["op-hls", "nc-hls", "pa-hls"],
    };

    const stateFinal = controllerReducer(stateAtLast, {
      type: "SOURCE_FAILED",
      sourceId: "op-embed",
      attemptId: 4,
      reason: "embed_timeout",
    });

    assert.equal(stateFinal.phase, "failed");
    assert.equal(stateFinal.failedSourceIds.length, 4);
  });

  test("8. Manual source selection removes target source from failed set", () => {
    const stateFailed: ControllerState = {
      ...initialState,
      failedSourceIds: ["op-hls"],
    };

    const stateSelected = controllerReducer(stateFailed, {
      type: "SELECT_SOURCE",
      sourceId: "op-hls",
    });

    assert.equal(stateSelected.activeIndex, 0);
    assert.equal(stateSelected.failedSourceIds.includes("op-hls"), false);
    assert.equal(stateSelected.manualSelected, true);
  });
});
