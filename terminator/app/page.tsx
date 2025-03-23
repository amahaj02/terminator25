'use client';

import { useEffect, useState } from 'react';
import { TMDBMovie } from './lib/tmdb';
import { searchMoviesFromList } from './lib/tmdb';

export default function Home() {
  const [results, setResults] = useState<Map<string, TMDBMovie[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function searchMovies() {
      try {
        // Fetch the movie list from our API route
        const response = await fetch('/api/movies');
        if (!response.ok) {
          throw new Error('Failed to fetch movie list');
        }
        const data = await response.json();
        const movieList = data.movies;

        // Search for movies using TMDB API
        const searchResults = await searchMoviesFromList(movieList);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    searchMovies();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">LGBTQ Movies Search Results</h1>
      <div className="grid gap-4">
        {Array.from(results.entries()).map(([title, movies]) => (
          <div key={title} className="border p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">{title}</h2>
            {movies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {movies.map((movie) => (
                  <div key={movie.id} className="border rounded p-2">
                    <h3 className="font-medium">{movie.title}</h3>
                    <p className="text-sm text-gray-600">{movie.release_date}</p>
                    {movie.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                        alt={movie.title}
                        className="mt-2 rounded"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No results found</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
