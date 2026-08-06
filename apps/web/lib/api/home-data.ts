import { getNewlyUpdatedMovies, getMoviesByType, extractMovieItems } from "./ophim";
import type { Movie } from "../../types/movie";

export interface HomeInitialData {
  heroMovie: Movie | null;
  newMovies: Movie[];
  seriesMovies: Movie[];
  singleMovies: Movie[];
  animeMovies: Movie[];
  chieuRap: Movie[];
  hasInitialData: boolean;
  sectionsCount: number;
}

export async function fetchHomeInitialData(): Promise<HomeInitialData> {
  const tasks = [
    { key: "newMovies", fn: () => getNewlyUpdatedMovies(1) },
    { key: "seriesMovies", fn: () => getMoviesByType("phim-bo", 1) },
    { key: "singleMovies", fn: () => getMoviesByType("phim-le", 1) },
    { key: "animeMovies", fn: () => getMoviesByType("hoat-hinh", 1) },
    { key: "chieuRap", fn: () => getMoviesByType("phim-chieu-rap", 1) },
  ];

  const results = await Promise.allSettled(tasks.map((t) => t.fn()));

  const dataMap: Record<string, Movie[]> = {};
  let successfulSectionsCount = 0;

  tasks.forEach((t, idx) => {
    const res = results[idx];
    if (res.status === "fulfilled" && res.value) {
      const items = extractMovieItems(res.value);
      dataMap[t.key] = items;
      if (items.length > 0) {
        successfulSectionsCount++;
      }
    } else {
      dataMap[t.key] = [];
    }
  });

  // Pick hero movie from first section with valid movies
  let heroMovie: Movie | null = null;
  const sectionKeysInOrder = ["newMovies", "seriesMovies", "singleMovies", "animeMovies", "chieuRap"];
  for (const key of sectionKeysInOrder) {
    if (dataMap[key] && dataMap[key].length > 0) {
      heroMovie = dataMap[key][0];
      break;
    }
  }

  const hasInitialData = successfulSectionsCount > 0 && heroMovie !== null;

  return {
    heroMovie,
    newMovies: dataMap.newMovies || [],
    seriesMovies: dataMap.seriesMovies || [],
    singleMovies: dataMap.singleMovies || [],
    animeMovies: dataMap.animeMovies || [],
    chieuRap: dataMap.chieuRap || [],
    hasInitialData,
    sectionsCount: successfulSectionsCount,
  };
}
