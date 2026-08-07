export type PlaybackState =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "buffering"
  | "recovering"
  | "switching"
  | "failed";

export const STARTUP_TIMEOUT_MS = 14000; // 14s startup timeout before failing over
export const BUFFERING_TIMEOUT_MS = 15000; // 15s persistent stall timeout before failing over

/**
 * Classifies if a HTML5 <video> media error is fatal.
 */
export function isFatalVideoError(error: MediaError | null | undefined): boolean {
  if (!error) return false;
  // MEDIA_ERR_NETWORK (2), MEDIA_ERR_DECODE (3), MEDIA_ERR_SRC_NOT_SUPPORTED (4)
  return error.code === 2 || error.code === 3 || error.code === 4;
}

/**
 * Classifies if a HLS.js error event is fatal.
 */
export function isFatalHlsError(data: any): boolean {
  if (!data) return false;
  if (data.fatal === true) return true;
  if (data.type === "networkError" && data.response && data.response.code >= 400) {
    return true;
  }
  if (
    data.details === "manifestLoadError" ||
    data.details === "manifestParsingError" ||
    data.details === "fragLoadError" ||
    data.details === "fragLoadTimeout" ||
    data.details === "keyLoadError"
  ) {
    return true;
  }
  return false;
}

/**
 * Classifies exact HLS error category safely based on HTTP status and error details.
 */
export function classifyHlsError(data: any): string {
  if (!data) return "unknown_playback_error";

  const statusCode = data.response?.code || data.response?.status || data.networkDetails?.status;
  const isFrag = data.details === "fragLoadError" || data.details === "fragLoadTimeout" || data.details === "keyLoadError";

  if (statusCode === 401 || statusCode === 403) {
    return isFrag ? "segment_http_error" : "http_access_error";
  }
  if (statusCode === 404) {
    return isFrag ? "segment_http_error" : "manifest_not_found";
  }
  if (statusCode === 408 || data.details === "timeout" || data.details === "fragLoadTimeout") {
    return isFrag ? "segment_timeout" : "timeout_error";
  }
  if (statusCode >= 500 && statusCode <= 599) {
    return isFrag ? "segment_http_error" : "upstream_server_error";
  }

  if (isFrag) {
    if (statusCode === 0 || !statusCode) {
      return "segment_cors_or_network_block";
    }
    return "segment_network_error";
  }

  // Explicit TLS / Certificate signals if exposed by runtime
  if (
    data.response?.text?.includes("CERT") ||
    data.error?.message?.includes("CERT") ||
    data.networkDetails?.error?.includes("CERT")
  ) {
    return "certificate_or_tls_error";
  }

  if (data.details === "manifestLoadError" || data.type === "networkError") {
    return "manifest_network_error";
  }
  if (data.details === "manifestParsingError") {
    return "manifest_network_error";
  }
  if (data.details === "bufferCodecsError" || data.type === "mediaError") {
    return "media_decode_error";
  }

  return data.details || "unknown_playback_error";
}
