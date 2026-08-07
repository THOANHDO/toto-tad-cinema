import type { PlaybackSource } from "./source-candidates";

export interface FindNextSourceParams {
  sources: PlaybackSource[];
  currentIndex: number;
  failedSourceIds: string[] | Set<string>;
}

/**
 * Pure function to find the next playable source index.
 * Skips all sources contained in failedSourceIds.
 * Returns -1 if no playable candidate remains.
 */
export function findNextPlayableSourceIndex(params: FindNextSourceParams): number {
  const { sources, currentIndex, failedSourceIds } = params;
  if (!sources || !Array.isArray(sources) || sources.length === 0) return -1;

  const failedSet = failedSourceIds instanceof Set ? failedSourceIds : new Set(failedSourceIds);

  for (let i = currentIndex + 1; i < sources.length; i++) {
    const candidate = sources[i];
    if (candidate && !failedSet.has(candidate.id)) {
      return i;
    }
  }

  return -1;
}

export function getFailoverStatusMessage(reason: string, nextSourceLabel: string): string {
  if (reason === "certificate_or_tls_error") {
    return "Máy chủ gặp lỗi kết nối bảo mật. Đang chuyển máy chủ...";
  }
  if (
    reason === "segment_cors_or_network_block" ||
    reason === "segment_network_error" ||
    reason === "segment_http_error" ||
    reason === "segment_timeout"
  ) {
    return "Dữ liệu phim từ máy chủ bị chặn kết nối. Đang chuyển máy chủ...";
  }
  if (
    reason === "manifest_network_error" ||
    reason === "manifest_not_found" ||
    reason === "http_access_error" ||
    reason === "upstream_server_error" ||
    reason === "timeout_error"
  ) {
    return "Máy chủ OPhim không thể kết nối. Đang chuyển máy chủ...";
  }
  if (reason === "audio_only_playback" || reason === "audio_only_manifest" || reason === "unsupported_video_codec") {
    return "Máy chủ hiện tại không cung cấp hình ảnh tương thích. Đang chuyển máy chủ...";
  }
  return `Đang chuyển sang máy chủ ${nextSourceLabel}...`;
}
