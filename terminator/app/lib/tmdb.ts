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

// Interface for movie entry from our API
export interface MovieEntry {
  title: string;
  year: string | null;
}

export async function searchMovie(movieEntry: MovieEntry): Promise<TMDBMovie[]> {
  try {
    const { title, year } = movieEntry;
    
    console.log('Searching for movie:', { title, year });
    console.log('Searching with credentials:', { 
      hasApiKey: !!TMDB_API_KEY, 
      hasAccessToken: !!TMDB_ACCESS_TOKEN 
    });
    
    // Create search parameters
    const searchParams = new URLSearchParams({
      query: title, // Title is the main search term
      language: 'en-US',
      page: '1',
      include_adult: 'true', // Include adult titles to maximize matches
    });
    
    // Add year parameter if available
    if (year) {
      searchParams.append('year', year);
    }
    
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
    console.log(`Found ${data.results.length} results for "${title}"${year ? ` (${year})` : ''}`);
    
    // Sort results by relevance
    const sortedResults = data.results.sort((a, b) => {
      // First prioritize exact title matches
      const exactMatchA = a.title.toLowerCase() === title.toLowerCase();
      const exactMatchB = b.title.toLowerCase() === title.toLowerCase();
      
      if (exactMatchA && !exactMatchB) return -1;
      if (!exactMatchA && exactMatchB) return 1;
      
      // If year is provided, prioritize movies from that year
      if (year) {
        const yearA = a.release_date ? parseInt(a.release_date.split('-')[0]) : 0;
        const yearB = b.release_date ? parseInt(b.release_date.split('-')[0]) : 0;
        const targetYear = parseInt(year);
        
        if (yearA === targetYear && yearB !== targetYear) return -1;
        if (yearA !== targetYear && yearB === targetYear) return 1;
      }
      
      // Then favor higher vote counts as more reliable matches
      return b.vote_count - a.vote_count;
    });
    
    return sortedResults;
  } catch (error) {
    console.error(`Error searching for movie:`, error);
    return [];
  }
}

export async function searchMoviesFromList(movieEntries: MovieEntry[]): Promise<Map<string, TMDBMovie[]>> {
  const results = new Map<string, TMDBMovie[]>();
  
  for (const entry of movieEntries) {
    const searchResults = await searchMovie(entry);
    
    // Only add movies that have results
    if (searchResults.length > 0) {
      results.set(entry.title, searchResults);
    }
    
    // Add a small delay to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  return results;
} 