import { isValidPlaybackUrl, type PlaybackSource } from "./source-candidates";
import type { MultiProviderResolution } from "./provider-resolution";
import { parseEpisodeIdentity, matchEpisode } from "./episode-identity";

export interface SourceInventory {
  episodeKey: string;
  sources: PlaybackSource[];
  unavailableProviders: string[];
}

/**
 * Builds a stable, deterministic SourceInventory for an episode with provenance tracking.
 */
export function buildSourceInventory(
  resolution: MultiProviderResolution | null | undefined,
  episodeSlug: string
): SourceInventory {
  const movieSlug = resolution?.movieSlug || "";
  const episodeKey = `${movieSlug}:${episodeSlug}`;

  if (!resolution || !episodeSlug) {
    return { episodeKey, sources: [], unavailableProviders: ["ophim", "nguonc", "phimapi"] };
  }

  const targetEpisodeIdentity = parseEpisodeIdentity(episodeSlug);
  const primaryMovie = resolution.primaryMovie;

  // Determine if primary movie is single episode / movie
  const totalEpisodesCount = resolution.ophim?.episodes?.[0]?.server_data?.length || 0;
  const isSingleEpisodeMovie =
    totalEpisodesCount === 1 ||
    primaryMovie?.episode_total === "1" ||
    primaryMovie?.type === "single";

  const candidates: PlaybackSource[] = [];
  const unavailableProviders: string[] = [];

  // 1. OPhim Sources (Primary Anchor)
  if (resolution.ophim?.status === "found") {
    const opEpisodes = resolution.ophim.episodes || [];
    let opMatch: any = null;
    let opMatchMethod = "none";

    for (const server of opEpisodes) {
      const items = server?.server_data || server?.items || [];
      const res = matchEpisode(targetEpisodeIdentity, items, isSingleEpisodeMovie);
      if (res) {
        opMatch = res.matchedItem;
        opMatchMethod = res.method;
        break;
      }
    }

    if (opMatch) {
      const m3u8Url = opMatch.link_m3u8 || opMatch.m3u8 || "";
      const embedUrl = opMatch.link_embed || opMatch.embed || "";

      if (isValidPlaybackUrl(m3u8Url)) {
        candidates.push({
          id: "op-hls",
          provider: "ophim",
          kind: "hls",
          url: m3u8Url.trim(),
          label: "OPhim (HLS)",
          priority: 1,
          providerMovieSlug: movieSlug,
          providerEpisodeName: opMatch.name || episodeSlug,
          canonicalEpisodeNumber: targetEpisodeIdentity.episodeNumber,
          matchConfidence: "exact",
          matchMethod: `ophim_${opMatchMethod}`,
        });
      }

      if (isValidPlaybackUrl(embedUrl)) {
        candidates.push({
          id: "op-embed",
          provider: "ophim",
          kind: "embed",
          url: embedUrl.trim(),
          label: "OPhim (Embed)",
          priority: 4,
          providerMovieSlug: movieSlug,
          providerEpisodeName: opMatch.name || episodeSlug,
          canonicalEpisodeNumber: targetEpisodeIdentity.episodeNumber,
          matchConfidence: "exact",
          matchMethod: `ophim_${opMatchMethod}`,
        });
      }
    } else {
      unavailableProviders.push("ophim");
    }
  } else {
    unavailableProviders.push("ophim");
  }

  // 2. NguonC Sources (Secondary Validated Provider)
  if (resolution.nguonc?.status === "found" && resolution.nguonc.movie) {
    const ncMovie = resolution.nguonc.movie;
    const ncEpisodes = ncMovie.episodes?.[0]?.items || resolution.nguonc.episodes?.[0]?.items || [];
    const ncRes = matchEpisode(targetEpisodeIdentity, ncEpisodes, isSingleEpisodeMovie);

    if (ncRes) {
      const ncMatch = ncRes.matchedItem;
      const ncM3u8 = ncMatch.m3u8 || "";
      const ncEmbed = ncMatch.embed || "";

      if (isValidPlaybackUrl(ncM3u8)) {
        candidates.push({
          id: "nc-hls",
          provider: "nguonc",
          kind: "hls",
          url: ncM3u8.trim(),
          label: "NguonC (HLS)",
          priority: 2,
          providerMovieSlug: resolution.nguonc.matchedSlug || movieSlug,
          providerEpisodeName: ncMatch.name || episodeSlug,
          canonicalEpisodeNumber: targetEpisodeIdentity.episodeNumber,
          matchConfidence: resolution.nguonc.matchScore && resolution.nguonc.matchScore >= 80 ? "exact" : "high",
          matchMethod: `nguonc_${resolution.nguonc.matchMethod}_${ncRes.method}`,
        });
      }

      if (isValidPlaybackUrl(ncEmbed)) {
        candidates.push({
          id: "nc-embed",
          provider: "nguonc",
          kind: "embed",
          url: ncEmbed.trim(),
          label: "NguonC (Embed)",
          priority: 5,
          providerMovieSlug: resolution.nguonc.matchedSlug || movieSlug,
          providerEpisodeName: ncMatch.name || episodeSlug,
          canonicalEpisodeNumber: targetEpisodeIdentity.episodeNumber,
          matchConfidence: resolution.nguonc.matchScore && resolution.nguonc.matchScore >= 80 ? "exact" : "high",
          matchMethod: `nguonc_${resolution.nguonc.matchMethod}_${ncRes.method}`,
        });
      }
    } else {
      unavailableProviders.push("nguonc");
    }
  } else {
    unavailableProviders.push("nguonc");
  }

  // 3. PhimAPI Sources (Secondary Validated Provider)
  if (resolution.phimapi?.status === "found" && resolution.phimapi.movie) {
    const paMovie = resolution.phimapi.movie;
    const paEpisodes = paMovie.episodes?.[0]?.server_data || resolution.phimapi.episodes?.[0]?.server_data || [];
    const paRes = matchEpisode(targetEpisodeIdentity, paEpisodes, isSingleEpisodeMovie);

    if (paRes) {
      const paMatch = paRes.matchedItem;
      const paM3u8 = paMatch.link_m3u8 || "";
      const paEmbed = paMatch.link_embed || "";

      if (isValidPlaybackUrl(paM3u8)) {
        candidates.push({
          id: "pa-hls",
          provider: "phimapi",
          kind: "hls",
          url: paM3u8.trim(),
          label: "PhimAPI (HLS)",
          priority: 3,
          providerMovieSlug: resolution.phimapi.matchedSlug || movieSlug,
          providerEpisodeName: paMatch.name || episodeSlug,
          canonicalEpisodeNumber: targetEpisodeIdentity.episodeNumber,
          matchConfidence: resolution.phimapi.matchScore && resolution.phimapi.matchScore >= 80 ? "exact" : "high",
          matchMethod: `phimapi_${resolution.phimapi.matchMethod}_${paRes.method}`,
        });
      }

      if (isValidPlaybackUrl(paEmbed)) {
        candidates.push({
          id: "pa-embed",
          provider: "phimapi",
          kind: "embed",
          url: paEmbed.trim(),
          label: "PhimAPI (Embed)",
          priority: 6,
          providerMovieSlug: resolution.phimapi.matchedSlug || movieSlug,
          providerEpisodeName: paMatch.name || episodeSlug,
          canonicalEpisodeNumber: targetEpisodeIdentity.episodeNumber,
          matchConfidence: resolution.phimapi.matchScore && resolution.phimapi.matchScore >= 80 ? "exact" : "high",
          matchMethod: `phimapi_${resolution.phimapi.matchMethod}_${paRes.method}`,
        });
      }
    } else {
      unavailableProviders.push("phimapi");
    }
  } else {
    unavailableProviders.push("phimapi");
  }

  // Sort candidates by priority (HLS first, then Embed) and deduplicate URLs
  candidates.sort((a, b) => a.priority - b.priority);

  const seenUrls = new Set<string>();
  const sources: PlaybackSource[] = [];
  for (const src of candidates) {
    if (!seenUrls.has(src.url)) {
      seenUrls.add(src.url);
      sources.push(src);
    }
  }

  // Development Structured Table Logging
  if (process.env.NODE_ENV === "development") {
    const debugInventory = sources.map((s) => ({
      sourceId: s.id,
      provider: s.provider,
      kind: s.kind,
      movieMatched: s.providerMovieSlug,
      episodeNumber: s.canonicalEpisodeNumber ?? "N/A",
      matchConfidence: s.matchConfidence,
      matchMethod: s.matchMethod,
    }));
    console.table(debugInventory);
  }

  return {
    episodeKey,
    sources,
    unavailableProviders,
  };
}
