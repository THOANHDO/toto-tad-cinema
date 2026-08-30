export interface VideoHealthStatus {
  isHealthy: boolean;
  reason?: string;
  videoWidth: number;
  videoHeight: number;
  totalVideoFrames: number;
  baselineFrames: number;
  hasAudioTrack: boolean;
  hasVideoTrack: boolean;
}

/**
 * Checks if a video element is currently rendering valid video frames for a specific attempt baseline.
 */
export function checkVideoHealth(
  video: HTMLVideoElement | null,
  baselineFrames = 0,
  hasFrameCallbackFired = false
): VideoHealthStatus {
  if (!video) {
    return {
      isHealthy: false,
      reason: "no_video_element",
      videoWidth: 0,
      videoHeight: 0,
      totalVideoFrames: 0,
      baselineFrames: 0,
      hasAudioTrack: false,
      hasVideoTrack: false,
    };
  }

  const videoWidth = video.videoWidth || 0;
  const videoHeight = video.videoHeight || 0;

  let totalVideoFrames = 0;
  if (typeof (video as any).getVideoPlaybackQuality === "function") {
    try {
      const quality = (video as any).getVideoPlaybackQuality();
      totalVideoFrames = quality?.totalVideoFrames || 0;
    } catch (_e) {
      totalVideoFrames = 0;
    }
  }

  const hasDimensions = videoWidth > 0 && videoHeight > 0;
  const hasNewFrames = totalVideoFrames > baselineFrames;
  const hasPlaybackProgress = (video.currentTime > 0 || (video.readyState !== undefined && video.readyState >= 2)) && !video.paused;

  // Healthy if frame callback fired, new frames decoded, valid dimensions present, or active playback with data
  const isHealthy = hasFrameCallbackFired || hasNewFrames || hasDimensions || hasPlaybackProgress;

  return {
    isHealthy,
    reason: isHealthy ? "healthy" : "audio_only_playback",
    videoWidth,
    videoHeight,
    totalVideoFrames,
    baselineFrames,
    hasAudioTrack: true,
    hasVideoTrack: hasDimensions,
  };
}

/**
 * Creates a Video Health Watchdog timer scoped to a specific attemptId.
 */
export class VideoHealthWatchdog {
  private timer: NodeJS.Timeout | null = null;
  private frameCallbackId: number | null = null;
  private video: HTMLVideoElement | null = null;
  private hasReceivedFrame = false;
  private attemptId = "";
  private baselineFrames = 0;
  private onErrorCallback?: (reason: string, attemptId: string) => void;

  public start(
    video: HTMLVideoElement,
    attemptId: string,
    onError: (reason: string, attemptId: string) => void,
    timeoutMs = 5500
  ) {
    this.stop();
    this.video = video;
    this.attemptId = attemptId;
    this.onErrorCallback = onError;
    this.hasReceivedFrame = false;

    // Capture baseline frame count
    if (typeof (video as any).getVideoPlaybackQuality === "function") {
      try {
        const quality = (video as any).getVideoPlaybackQuality();
        this.baselineFrames = quality?.totalVideoFrames || 0;
      } catch (_e) {
        this.baselineFrames = 0;
      }
    }

    // Attach requestVideoFrameCallback if supported
    if (typeof (video as any).requestVideoFrameCallback === "function") {
      const onFrame = () => {
        this.hasReceivedFrame = true;
      };
      try {
        this.frameCallbackId = (video as any).requestVideoFrameCallback(onFrame);
      } catch (_e) {}
    }

    this.timer = setTimeout(() => {
      this.evaluateHealth();
    }, timeoutMs);
  }

  public evaluateHealth() {
    if (!this.video) return;

    // Do NOT trigger if video is paused or tab is hidden
    const isTabHidden = typeof document !== "undefined" && Boolean(document.hidden);
    if (this.video.paused || isTabHidden) return;

    if (this.hasReceivedFrame) return;

    const health = checkVideoHealth(this.video, this.baselineFrames, this.hasReceivedFrame);
    if (!health.isHealthy) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[Video Health Telemetry] audio_only_playback detected! attempt=${this.attemptId}, width=${health.videoWidth}, height=${health.videoHeight}, frames=${health.totalVideoFrames}, baseline=${this.baselineFrames}`
        );
      }
      this.onErrorCallback?.("audio_only_playback", this.attemptId);
    } else {
      this.stop();
    }
  }

  public stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (
      this.video &&
      this.frameCallbackId !== null &&
      typeof (this.video as any).cancelVideoFrameCallback === "function"
    ) {
      try {
        (this.video as any).cancelVideoFrameCallback(this.frameCallbackId);
      } catch (_e) {}
    }
    this.frameCallbackId = null;
    this.video = null;
    this.attemptId = "";
    this.hasReceivedFrame = false;
    this.baselineFrames = 0;
  }
}
