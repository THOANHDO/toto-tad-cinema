"use client";

import { useReducer, useCallback, useRef, useEffect } from "react";
import type { PlaybackSource } from "../lib/player/source-candidates";
import {
  STARTUP_TIMEOUT_MS,
  BUFFERING_TIMEOUT_MS,
} from "../lib/player/playback-errors";
import {
  findNextPlayableSourceIndex,
  getFailoverStatusMessage,
} from "../lib/player/failover-helper";

export type PlayerPhase =
  | "idle"
  | "initializing"
  | "attempting"
  | "media_playing"
  | "healthy"
  | "switching"
  | "embed_loading"
  | "embed_ready"
  | "failed";

export interface ControllerState {
  episodeKey: string;
  sources: PlaybackSource[];
  activeIndex: number;
  attemptId: number;
  phase: PlayerPhase;
  failedSourceIds: string[];
  statusMessage: string;
  savedTime: number;
  manualSelected: boolean;
}

export type ControllerAction =
  | { type: "INIT_EPISODE"; episodeKey: string; sources: PlaybackSource[]; initialTime: number }
  | { type: "MEDIA_PLAYING"; sourceId: string; attemptId: number }
  | { type: "MEDIA_HEALTHY"; sourceId: string; attemptId: number }
  | { type: "EMBED_LOADED"; sourceId: string; attemptId: number }
  | { type: "SOURCE_FAILED"; sourceId: string; attemptId: number; reason: string }
  | { type: "SELECT_SOURCE"; sourceId: string }
  | { type: "BUFFERING_STALL" };

export function controllerReducer(state: ControllerState, action: ControllerAction): ControllerState {
  switch (action.type) {
    case "INIT_EPISODE": {
      const { episodeKey, sources, initialTime } = action;
      if (sources.length === 0) {
        return {
          ...state,
          episodeKey,
          sources: [],
          activeIndex: 0,
          attemptId: state.attemptId + 1,
          phase: "failed",
          failedSourceIds: [],
          statusMessage: "Chưa có nguồn phát cho tập phim này.",
          savedTime: initialTime,
          manualSelected: false,
        };
      }

      const firstSrc = sources[0];
      const initialPhase: PlayerPhase = firstSrc.kind === "embed" ? "embed_loading" : "attempting";
      const initialMsg = firstSrc.kind === "embed" ? `Đang kết nối máy chủ dự phòng ${firstSrc.label}...` : "";

      return {
        ...state,
        episodeKey,
        sources,
        activeIndex: 0,
        attemptId: state.attemptId + 1,
        phase: initialPhase,
        failedSourceIds: [],
        statusMessage: initialMsg,
        savedTime: initialTime,
        manualSelected: false,
      };
    }

    case "MEDIA_PLAYING": {
      if (action.attemptId !== state.attemptId) return state;
      const activeSrc = state.sources[state.activeIndex];
      if (!activeSrc || activeSrc.id !== action.sourceId) return state;

      return {
        ...state,
        phase: "media_playing",
      };
    }

    case "MEDIA_HEALTHY": {
      if (action.attemptId !== state.attemptId) return state;
      const activeSrc = state.sources[state.activeIndex];
      if (!activeSrc || activeSrc.id !== action.sourceId) return state;

      return {
        ...state,
        phase: "healthy",
        statusMessage: "",
      };
    }

    case "EMBED_LOADED": {
      if (action.attemptId !== state.attemptId) return state;
      const activeSrc = state.sources[state.activeIndex];
      if (!activeSrc || activeSrc.id !== action.sourceId) return state;

      return {
        ...state,
        phase: "embed_ready",
        statusMessage: "",
      };
    }

    case "SOURCE_FAILED": {
      // Guard against stale callback attemptId
      if (action.attemptId !== state.attemptId) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[PLAYER_CONTROLLER] Stale SOURCE_FAILED ignored (callback attemptId ${action.attemptId} != current ${state.attemptId})`
          );
        }
        return state;
      }

      const activeSrc = state.sources[state.activeIndex];
      if (!activeSrc || activeSrc.id !== action.sourceId) return state;

      const newFailedSet = Array.from(new Set([...state.failedSourceIds, action.sourceId]));
      const nextIndex = findNextPlayableSourceIndex({
        sources: state.sources,
        currentIndex: state.activeIndex,
        failedSourceIds: newFailedSet,
      });

      if (nextIndex !== -1) {
        const nextSrc = state.sources[nextIndex];
        const nextPhase: PlayerPhase = nextSrc.kind === "embed" ? "embed_loading" : "switching";
        const nextAttemptId = state.attemptId + 1;
        const statusMsg = getFailoverStatusMessage(action.reason, nextSrc.label);

        if (process.env.NODE_ENV === "development") {
          console.log("[PLAYER_CONTROLLER]", {
            event: "SOURCE_FAILED -> ADVANCE_INDEX",
            episodeKey: state.episodeKey,
            callbackAttemptId: action.attemptId,
            currentAttemptId: nextAttemptId,
            activeIndex: nextIndex,
            activeSourceId: nextSrc.id,
            failedSourceIds: newFailedSet,
            reason: action.reason,
            phase: nextPhase,
          });
        }

        return {
          ...state,
          failedSourceIds: newFailedSet,
          activeIndex: nextIndex,
          attemptId: nextAttemptId,
          phase: nextPhase,
          statusMessage: statusMsg,
        };
      } else {
        if (process.env.NODE_ENV === "development") {
          console.log("[PLAYER_CONTROLLER]", {
            event: "SOURCE_FAILED -> ALL_FAILED",
            episodeKey: state.episodeKey,
            callbackAttemptId: action.attemptId,
            currentAttemptId: state.attemptId,
            failedSourceIds: newFailedSet,
            reason: action.reason,
            phase: "failed",
          });
        }

        return {
          ...state,
          failedSourceIds: newFailedSet,
          phase: "failed",
          statusMessage: "Không thể phát tập này từ các máy chủ hiện có. Vui lòng chọn máy chủ khác.",
        };
      }
    }

    case "SELECT_SOURCE": {
      const targetIndex = state.sources.findIndex((s) => s.id === action.sourceId);
      if (targetIndex === -1) return state;

      const targetSrc = state.sources[targetIndex];
      const newFailedSet = state.failedSourceIds.filter((id) => id !== action.sourceId);
      const nextAttemptId = state.attemptId + 1;
      const nextPhase: PlayerPhase = targetSrc.kind === "embed" ? "embed_loading" : "attempting";
      const statusMsg = targetSrc.kind === "embed"
        ? `Đang kết nối máy chủ dự phòng ${targetSrc.label}...`
        : `Đang kết nối máy chủ ${targetSrc.label}...`;

      if (process.env.NODE_ENV === "development") {
        console.log("[PLAYER_CONTROLLER]", {
          event: "SELECT_SOURCE",
          episodeKey: state.episodeKey,
          callbackAttemptId: state.attemptId,
          currentAttemptId: nextAttemptId,
          activeIndex: targetIndex,
          activeSourceId: targetSrc.id,
          failedSourceIds: newFailedSet,
          phase: nextPhase,
        });
      }

      return {
        ...state,
        failedSourceIds: newFailedSet,
        activeIndex: targetIndex,
        attemptId: nextAttemptId,
        phase: nextPhase,
        statusMessage: statusMsg,
        manualSelected: true,
      };
    }

    case "BUFFERING_STALL": {
      if (state.phase === "media_playing" || state.phase === "healthy") {
        return {
          ...state,
          phase: "switching",
        };
      }
      return state;
    }

    default:
      return state;
  }
}

interface UsePlayerStateMachineOptions {
  sources: PlaybackSource[];
  episodeKey: string;
  initialTime?: number;
}

export function usePlayerStateMachine({ sources, episodeKey, initialTime = 0 }: UsePlayerStateMachineOptions) {
  const [state, dispatch] = useReducer(controllerReducer, {
    episodeKey,
    sources,
    activeIndex: 0,
    attemptId: 1,
    phase: "initializing",
    failedSourceIds: [],
    statusMessage: "",
    savedTime: initialTime,
    manualSelected: false,
  });

  const startupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bufferingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const embedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeSource = state.sources[state.activeIndex] || null;

  const stateRef = useRef(state);
  stateRef.current = state;

  const clearTimers = useCallback(() => {
    if (startupTimerRef.current) {
      clearTimeout(startupTimerRef.current);
      startupTimerRef.current = null;
    }
    if (bufferingTimerRef.current) {
      clearTimeout(bufferingTimerRef.current);
      bufferingTimerRef.current = null;
    }
    if (embedTimeoutRef.current) {
      clearTimeout(embedTimeoutRef.current);
      embedTimeoutRef.current = null;
    }
  }, []);

  // Initialize episode
  useEffect(() => {
    clearTimers();
    dispatch({ type: "INIT_EPISODE", episodeKey, sources, initialTime });
  }, [episodeKey, sources, initialTime, clearTimers]);

  // Actions wrapped in useCallback
  const reportMediaPlaying = useCallback((sourceId: string, attemptId: number) => {
    clearTimers();
    dispatch({ type: "MEDIA_PLAYING", sourceId, attemptId });
  }, [clearTimers]);

  const reportVideoHealthy = useCallback((sourceId: string, attemptId: number) => {
    clearTimers();
    dispatch({ type: "MEDIA_HEALTHY", sourceId, attemptId });
  }, [clearTimers]);

  const reportEmbedLoaded = useCallback((sourceId: string, attemptId: number) => {
    clearTimers();
    dispatch({ type: "EMBED_LOADED", sourceId, attemptId });
  }, [clearTimers]);

  const reportSourceError = useCallback((sourceId: string, attemptId: number, reason: string) => {
    clearTimers();
    dispatch({ type: "SOURCE_FAILED", sourceId, attemptId, reason });
  }, [clearTimers]);

  const reportBuffering = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.phase === "media_playing" || currentState.phase === "healthy") {
      dispatch({ type: "BUFFERING_STALL" });
      clearTimers();
      bufferingTimerRef.current = setTimeout(() => {
        const activeSrc = stateRef.current.sources[stateRef.current.activeIndex];
        const currentAttempt = stateRef.current.attemptId;
        if (activeSrc) {
          dispatch({ type: "SOURCE_FAILED", sourceId: activeSrc.id, attemptId: currentAttempt, reason: "buffering_timeout" });
        }
      }, BUFFERING_TIMEOUT_MS);
    }
  }, [clearTimers]);

  const selectSource = useCallback((sourceId: string) => {
    clearTimers();
    dispatch({ type: "SELECT_SOURCE", sourceId });
  }, [clearTimers]);

  // Handle Embed timeout (10 seconds)
  useEffect(() => {
    if (!activeSource || activeSource.kind !== "embed" || state.phase !== "embed_loading") {
      return;
    }

    clearTimers();
    embedTimeoutRef.current = setTimeout(() => {
      if (stateRef.current.phase === "embed_loading" && activeSource?.kind === "embed") {
        reportSourceError(activeSource.id, stateRef.current.attemptId, "embed_timeout");
      }
    }, 10000);

    return () => clearTimers();
  }, [activeSource, state.phase, reportSourceError, clearTimers]);

  // Handle HLS startup timeout (14 seconds)
  useEffect(() => {
    if (
      !activeSource ||
      activeSource.kind !== "hls" ||
      state.phase === "failed" ||
      state.phase === "healthy" ||
      state.phase === "media_playing"
    ) {
      return;
    }

    startupTimerRef.current = setTimeout(() => {
      const currentState = stateRef.current;
      if (
        currentState.phase !== "healthy" &&
        currentState.phase !== "media_playing" &&
        !currentState.manualSelected &&
        activeSource
      ) {
        reportSourceError(activeSource.id, currentState.attemptId, "startup_timeout");
      }
    }, STARTUP_TIMEOUT_MS);

    return () => clearTimers();
  }, [activeSource, state.phase, reportSourceError, clearTimers]);

  // Expose Development-Only Debug Panel
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
      (window as any).__TOTO_PLAYER_DEBUG__ = {
        episodeKey: state.episodeKey,
        activeSourceId: activeSource?.id,
        attemptId: state.attemptId,
        phase: state.phase,
        failedSources: state.failedSourceIds,
        sourcesCount: state.sources.length,
      };
    }
  }, [state.episodeKey, activeSource?.id, state.attemptId, state.phase, state.failedSourceIds, state.sources.length]);

  const isLoading = state.phase === "initializing" || state.phase === "attempting" || state.phase === "switching" || state.phase === "embed_loading";
  const isEmbedReady = state.phase === "embed_ready";
  const isHealthy = state.phase === "healthy";

  return {
    activeSource,
    activeIndex: state.activeIndex,
    attemptId: state.attemptId,
    phase: state.phase,
    isLoading,
    isEmbedReady,
    isHealthy,
    failedSourceIds: state.failedSourceIds,
    savedTime: state.savedTime,
    statusMessage: state.statusMessage,
    manualSelected: state.manualSelected,
    reportMediaPlaying,
    reportVideoHealthy,
    reportEmbedLoaded,
    reportSourceError,
    reportBuffering,
    selectSource,
  };
}
