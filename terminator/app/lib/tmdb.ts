import { TMDB_API_KEY } from '../config/tmdb';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface TMDBMovie {
  id: number;
  title: string;
  release_date: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
}

export interface TMDBResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

export async function searchMovie(query: string): Promise<TMDBMovie[]> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText}`);
    }

    const data: TMDBResponse = await response.json();
    return data.results;
  } catch (error) {
    console.error(`Error searching for movie "${query}":`, error);
    return [];
  }
}

export async function searchMoviesFromList(movieTitles: string[]): Promise<Map<string, TMDBMovie[]>> {
  const results = new Map<string, TMDBMovie[]>();
  
  for (const title of movieTitles) {
    const searchResults = await searchMovie(title);
    results.set(title, searchResults);
    
    // Add a small delay to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  return results;
} 