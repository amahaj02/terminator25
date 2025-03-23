import { TMDB_API_KEY, TMDB_ACCESS_TOKEN } from '../config/tmdb';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface TMDBMovie {
  id: number;
  title: string;
  release_date: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
}

export interface TMDBResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

export async function searchMovie(query: string): Promise<TMDBMovie[]> {
  try {
    console.log('Searching with credentials:', { 
      hasApiKey: !!TMDB_API_KEY, 
      hasAccessToken: !!TMDB_ACCESS_TOKEN 
    });
    
    // Create search parameters - FIXED: don't apply encodeURIComponent directly
    const searchParams = new URLSearchParams({
      query: query, // Removed encodeURIComponent as URLSearchParams handles encoding
      language: 'en-US',
      page: '1',
      include_adult: 'true', // Include adult titles to maximize matches
    });
    
    let url = `${TMDB_BASE_URL}/search/movie?${searchParams.toString()}`;
    let options: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Check for authentication credentials
    if (!TMDB_ACCESS_TOKEN && !TMDB_API_KEY) {
      console.error('No TMDB authentication credentials found. Check your .env.local file.');
      throw new Error('No TMDB authentication credentials found. Check your .env.local file.');
    }
    
    // Preferred method: Use Bearer token if available
    if (TMDB_ACCESS_TOKEN) {
      console.log('Using Bearer token authentication');
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
      };
    } 
    // Fallback: Use API key as query parameter if token is not available
    else if (TMDB_API_KEY) {
      console.log('Using API key authentication');
      // Append the API key to the URL
      url = `${url}&api_key=${TMDB_API_KEY}`;
    }
    
    console.log('Fetching from URL:', url.replace(/(api_key|Bearer)=[^&]+/, '$1=HIDDEN'));
    
    // Make the request
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TMDB API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    const data: TMDBResponse = await response.json();
    console.log(`Found ${data.results.length} results for "${query}"`);
    
    // Sort results by relevance
    const sortedResults = data.results.sort((a, b) => {
      // First prioritize exact title matches
      const exactMatchA = a.title.toLowerCase() === query.toLowerCase();
      const exactMatchB = b.title.toLowerCase() === query.toLowerCase();
      
      if (exactMatchA && !exactMatchB) return -1;
      if (!exactMatchA && exactMatchB) return 1;
      
      // Then favor higher vote counts as more reliable matches
      return b.vote_count - a.vote_count;
    });
    
    return sortedResults;
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