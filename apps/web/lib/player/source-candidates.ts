export type PlaybackSource = {
  id: string;
  provider: "ophim" | "nguonc" | "phimapi" | "kkphim";
  kind: "hls" | "embed";
  url: string;
  label: string;
  priority: number;
  providerMovieId?: string;
  providerMovieSlug?: string;
  providerEpisodeId?: string;
  providerEpisodeName?: string;
  canonicalEpisodeNumber?: number;
  matchConfidence?: "exact" | "high" | "medium" | "low";
  matchMethod?: string;
};

export interface BuildCandidatesParams {
  m3u8Url?: string | null;
  embedUrl?: string | null;
  nguonCData?: any;
  phimApiData?: any;
  episode: string;
  episodeName?: string;
}

/**
 * Validates stream or embed URLs cleanly.
 * Removes empty, non-HTTP/HTTPS, or detail page URLs.
 */
export function isValidPlaybackUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (!/^https?:\/\//i.test(trimmed)) return false;
  // Reject catalog / detail URLs accidentally passed as stream URLs
  if (trimmed.includes("ophim1.com/phim/") || trimmed.includes("phim.nguonc.com/film/")) {
    return false;
  }
  return true;
}

/**
 * Matches episode from NguonC or PhimApi payload.
 */
function findEpisodeInPayload(payload: any, episode: string, episodeName?: string): any {
  if (!payload) return null;
  const list = payload?.movie?.episodes?.[0]?.items || payload?.episodes?.[0]?.server_data || [];
  if (!Array.isArray(list) || list.length === 0) return null;

  const normTargetSlug = episode.replace(/^tap-/, "").replace(/^0+/, "").toLowerCase();
  const normTargetName = (episodeName || "").replace(/^tap\s*/i, "").replace(/^0+/, "").toLowerCase();

  return list.find((item: any) => {
    if (!item) return false;
    const itemSlug = (item.slug || "").replace(/^tap-/, "").replace(/^0+/, "").toLowerCase();
    const itemName = (item.name || "").replace(/^tap\s*/i, "").replace(/^0+/, "").toLowerCase();
    return itemSlug === normTargetSlug || itemName === normTargetName || item.slug === episode;
  });
}

/**
 * Builds prioritized and deduplicated PlaybackSource candidates list.
 */
export function buildPlaybackCandidates(params: BuildCandidatesParams): PlaybackSource[] {
  const { m3u8Url, embedUrl, nguonCData, phimApiData, episode, episodeName } = params;

  const nguonCEp = findEpisodeInPayload(nguonCData, episode, episodeName);
  const ncM3u8 = nguonCEp?.m3u8;
  const ncEmbed = nguonCEp?.embed;

  const phimApiEp = findEpisodeInPayload(phimApiData, episode, episodeName);
  const paM3u8 = phimApiEp?.link_m3u8;
  const paEmbed = phimApiEp?.link_embed;

  const rawCandidates: Array<Omit<PlaybackSource, "priority">> = [
    {
      id: "op-hls",
      provider: "ophim",
      kind: "hls",
      url: m3u8Url || "",
      label: "OPhim (HLS)",
    },
    {
      id: "nc-hls",
      provider: "nguonc",
      kind: "hls",
      url: ncM3u8 || "",
      label: "NguonC (HLS)",
    },
    {
      id: "pa-hls",
      provider: "phimapi",
      kind: "hls",
      url: paM3u8 || "",
      label: "PhimAPI (HLS)",
    },
    {
      id: "op-embed",
      provider: "ophim",
      kind: "embed",
      url: embedUrl || "",
      label: "OPhim (Embed)",
    },
    {
      id: "nc-embed",
      provider: "nguonc",
      kind: "embed",
      url: ncEmbed || "",
      label: "NguonC (Embed)",
    },
    {
      id: "pa-embed",
      provider: "phimapi",
      kind: "embed",
      url: paEmbed || "",
      label: "PhimAPI (Embed)",
    },
  ];

  const seenUrls = new Set<string>();
  const validCandidates: PlaybackSource[] = [];

  let currentPriority = 1;
  for (const item of rawCandidates) {
    if (!isValidPlaybackUrl(item.url)) continue;
    const cleanUrl = item.url.trim();
    if (seenUrls.has(cleanUrl)) continue;

    seenUrls.add(cleanUrl);
    validCandidates.push({
      ...item,
      url: cleanUrl,
      priority: currentPriority++,
    });
  }

  return validCandidates;
}
