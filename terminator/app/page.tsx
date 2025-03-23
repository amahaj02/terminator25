'use client';

import { useEffect, useState } from 'react';
import { TMDBMovie, MovieEntry } from './lib/tmdb';
import { searchMovie, searchMoviesFromList } from './lib/tmdb';

export default function Home() {
  const [results, setResults] = useState<Map<string, TMDBMovie[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);

  useEffect(() => {
    async function loadInitialMovies() {
      try {
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    loadInitialMovies();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setNoResults(false);
    
    try {
      // Fetch movies matching the search term with fuzzy matching
      const response = await fetch(`/api/movies?query=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch movie search results');
      }
      
      const data = await response.json();
      const movieList: MovieEntry[] = data.movies;
      
      if (movieList.length === 0) {
        // No matching movies found
        setNoResults(true);
        setResults(new Map());
      } else {
        // Search for these movies in TMDB
        const searchResults = await searchMoviesFromList(movieList);
        setResults(searchResults);
        
        // Check if any TMDB results were found
        let hasAnyResults = false;
        searchResults.forEach(movieArray => {
          if (movieArray.length > 0) {
            hasAnyResults = true;
          }
        });
        
        setNoResults(!hasAnyResults);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during search');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle input change with debouncing for better UX
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <main className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">LGBTQ Movies Search</h1>
      
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            placeholder="Search for a movie (partial matches work)..."
            className="flex-1 p-2 border rounded"
          />
          <button 
            type="submit" 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Try partial words, character names, or themes - our search has fuzzy matching!
        </p>
      </form>
      
      {loading && <div className="p-4">Loading initial movies...</div>}
      {error && <div className="p-4 text-red-500">Error: {error}</div>}
      {noResults && (
        <div className="p-4 text-amber-600 border border-amber-300 bg-amber-50 rounded mb-4">
          No matches found for "{searchTerm}". Try a different search term or check your spelling.
        </div>
      )}
      
      <div className="grid gap-4">
        {Array.from(results.entries()).map(([title, movies]) => (
          <div key={title} className="border p-4 rounded shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-2">{title}</h2>
            {movies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {movies.map((movie) => (
                  <a
                    href={`/movie/${movie.id}`}
                    key={movie.id}
                    className="border rounded p-3 hover:bg-gray-50 transition-colors block"
                  >
                    <h3 className="font-medium">{movie.title}</h3>
                    <p className="text-sm text-gray-600">{movie.release_date}</p>
                    {movie.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                        alt={movie.title}
                        className="mt-2 rounded w-full"
                      />
                    )}
                    <p className="text-xs text-gray-500 mt-2 line-clamp-3">{movie.overview}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No results found in TMDB</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
