'use client';

import { useEffect, useState, useRef } from 'react';
import { TMDBMovie, MovieEntry, fetchGenres } from './lib/tmdb';
import { searchMovie, searchMoviesFromList, searchMoviesByQuery } from './lib/tmdb';
import Link from 'next/link';

export default function Home() {
  const [results, setResults] = useState<Map<string, TMDBMovie[]>>(new Map());
  const [directResults, setDirectResults] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const [isDirectSearch, setIsDirectSearch] = useState(false);
  const [predictions, setPredictions] = useState<{id: number, title: string}[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [genreMap, setGenreMap] = useState<Map<number, string>>(new Map());
  const [genreGroupedMovies, setGenreGroupedMovies] = useState<Map<string, TMDBMovie[]>>(new Map());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const predictionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadInitialMovies() {
      try {
        // Fetch genre information
        const genres = await fetchGenres();
        setGenreMap(genres);
        
        // Fetch 10 random movies from our API route
        const response = await fetch('/api/movies');
        if (!response.ok) {
          throw new Error('Failed to fetch movie list');
        }
        const data = await response.json();
        const movieList: MovieEntry[] = data.movies;

        // Search for movies using TMDB API
        const searchResults = await searchMoviesFromList(movieList);
        setResults(searchResults);
        setIsDirectSearch(false);
        
        // Count total movies found
        let count = 0;
        searchResults.forEach(movies => {
          count += movies.length;
        });
        setResultCount(count);
        
        // Group movies by genre
        groupMoviesByGenre(searchResults, genres);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    loadInitialMovies();
  }, []);
  
  // Group movies by genre
  const groupMoviesByGenre = (searchResults: Map<string, TMDBMovie[]>, genreMap: Map<number, string>) => {
    const genreGroups = new Map<string, TMDBMovie[]>();
    
    // Process each movie and add it to the appropriate genre group(s)
    searchResults.forEach((movies) => {
      movies.forEach((movie) => {
        if (movie.genre_ids && movie.genre_ids.length > 0) {
          // A movie can belong to multiple genres
          movie.genre_ids.forEach((genreId) => {
            const genreName = genreMap.get(genreId) || 'Unknown';
            if (!genreGroups.has(genreName)) {
              genreGroups.set(genreName, []);
            }
            // Check if movie already exists in this genre group
            const existingMovies = genreGroups.get(genreName) || [];
            if (!existingMovies.some(m => m.id === movie.id)) {
              existingMovies.push(movie);
              genreGroups.set(genreName, existingMovies);
            }
          });
        } else {
          // If no genre is found, add to "Unknown" category
          if (!genreGroups.has('Unknown')) {
            genreGroups.set('Unknown', []);
          }
          const unknownMovies = genreGroups.get('Unknown') || [];
          if (!unknownMovies.some(m => m.id === movie.id)) {
            unknownMovies.push(movie);
            genreGroups.set('Unknown', unknownMovies);
          }
        }
      });
    });
    
    setGenreGroupedMovies(genreGroups);
  };

  // Add click outside listener to close predictions dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        predictionsRef.current && 
        !predictionsRef.current.contains(event.target as Node) &&
        searchInputRef.current && 
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowPredictions(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounce function to limit API calls
  const debounce = (fn: Function, delay: number) => {
    let timer: NodeJS.Timeout;
    return function(...args: any[]) {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  // Fetch predictions as user types
  const fetchPredictions = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    try {
      const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`);
      if (!response.ok) {
        throw new Error('Failed to fetch predictions');
      }
      const data = await response.json();
      const movieSuggestions = data.results.slice(0, 6).map((movie: any) => ({
        id: movie.id,
        title: movie.title,
      }));
      
      setPredictions(movieSuggestions);
      setShowPredictions(true);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setPredictions([]);
    }
  };

  // Create debounced version of fetchPredictions
  const debouncedFetchPredictions = useRef(
    debounce(fetchPredictions, 300)
  ).current;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setNoResults(false);
    setResultCount(0);
    setShowPredictions(false);
    
    try {
      // Directly search TMDB with the user's query
      console.log('Performing direct search for:', searchTerm);
      const searchResults = await searchMoviesByQuery(searchTerm);
      
      // Set the results
      setDirectResults(searchResults);
      setIsDirectSearch(true);
      setResultCount(searchResults.length);
      setNoResults(searchResults.length === 0);
      
      // Group direct search results by genre
      if (searchResults.length > 0) {
        const directResultsMap = new Map<string, TMDBMovie[]>();
        directResultsMap.set('Search Results', searchResults);
        groupMoviesByGenre(directResultsMap, genreMap);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during search');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle input change for better UX
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedFetchPredictions(value);
  };

  // Handle prediction selection
  const handlePredictionClick = (prediction: {id: number, title: string}) => {
    setSearchTerm(prediction.title);
    setShowPredictions(false);
    
    // Optional: auto-search when a prediction is clicked
    setTimeout(() => {
      const formEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSearch(formEvent);
    }, 100);
  };

  // Function to render a single movie card
  const renderMovieCard = (movie: TMDBMovie, sourceTitle?: string) => (
    <Link 
      href={`/movie/${movie.id}`} 
      key={movie.id}
      className="border rounded p-3 hover:bg-gray-50 transition-colors block"
    >
      <div className="flex flex-col h-full">
        <h3 className="font-medium">{movie.title}</h3>
        {sourceTitle && (
          <p className="text-xs text-gray-500">From list: {sourceTitle}</p>
        )}
        <p className="text-sm text-gray-600">{movie.release_date}</p>
        {movie.poster_path && (
          <img
            src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
            alt={movie.title}
            className="mt-2 rounded w-full h-auto object-cover"
          />
        )}
        <p className="text-xs text-gray-500 mt-2 line-clamp-3">{movie.overview}</p>
        <div className="mt-auto pt-2">
          <span className="text-xs text-blue-600 inline-flex items-center mt-1">
            View AI synopsis
            <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );

  // Function to render the movie grid by genre
  const renderMoviesByGenre = () => {
    if (genreGroupedMovies.size === 0) {
      return (
        <div className="p-4 text-center text-gray-500">
          No movies found. Try a different search term.
        </div>
      );
    }
    
    // Sort genres alphabetically but keep "Unknown" at the end if it exists
    const sortedGenres = Array.from(genreGroupedMovies.keys()).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return a.localeCompare(b);
    });
    
    return (
      <div className="space-y-8">
        {sortedGenres.map(genre => (
          <div key={genre} className="genre-section">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">{genre}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {genreGroupedMovies.get(genre)?.map(movie => renderMovieCard(movie))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Replace the renderMovieGrid function with this updated version
  const renderMovieGrid = () => {
    if (loading) {
      return <div className="p-4 text-center">Loading movies...</div>;
    }
    
    if (error) {
      return <div className="p-4 text-center text-red-500">Error: {error}</div>;
    }
    
    if (isDirectSearch && directResults.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500">
          No movies found matching "{searchTerm}". Try a different search term or check your spelling.
        </div>
      );
    }
    
    // Use the genre-based display
    return renderMoviesByGenre();
  };

  return (
    <main className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">LGBTQ Movies Search</h1>
      
      <form onSubmit={handleSearch} className="mb-6 relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              placeholder="Search for any movie..."
              className="w-full p-2 border rounded"
              onFocus={() => {
                if (searchTerm.trim().length >= 2 && predictions.length > 0) {
                  setShowPredictions(true);
                }
              }}
            />
            
            {/* Predictions dropdown */}
            {showPredictions && predictions.length > 0 && (
              <div 
                ref={predictionsRef}
                className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10"
              >
                {predictions.map(prediction => (
                  <div
                    key={prediction.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 text-gray-800"
                    onClick={() => handlePredictionClick(prediction)}
                  >
                    {prediction.title}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button 
            type="submit" 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Enter any movie name, even partial or misspelled - TMDB search will find the closest match!
        </p>
      </form>
      
      {loading && <div className="p-4">Loading initial movies...</div>}
      {error && <div className="p-4 text-red-500">Error: {error}</div>}
      {noResults && (
        <div className="p-4 text-amber-600 border border-amber-300 bg-amber-50 rounded mb-4">
          No matches found for "{searchTerm}". Try a different search term or check your spelling.
        </div>
      )}
      
      {!loading && !error && (
        <div className="mb-4">
          <h2 className="text-lg font-medium mb-2">
            {isDirectSearch ? (
              <>Search Results for "{searchTerm}": {resultCount} {resultCount === 1 ? 'Movie' : 'Movies'} Found</>
            ) : (
              <>Random LGBTQ Films: {resultCount} {resultCount === 1 ? 'Movie' : 'Movies'} Found</>
            )}
          </h2>
          {renderMovieGrid()}
        </div>
      )}
    </main>
  );
}
