'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TMDBMovie } from '../../lib/tmdb';

export default function MoviePage() {
  const params = useParams();
  const [movie, setMovie] = useState<TMDBMovie | null>(null);
  const [synopsis, setSynopsis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMovieAndSynopsis() {
      try {
        // Fetch movie details from TMDB
        const response = await fetch(`/api/movies/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch movie details');
        }
        const movieData = await response.json();
        setMovie(movieData);

        // Generate synopsis using Gemini
        const synopsisResponse = await fetch('/api/gemini', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: movieData.title,
            overview: movieData.overview,
          }),
        });

        if (!synopsisResponse.ok) {
          const errorData = await synopsisResponse.json();
          throw new Error(errorData.details || errorData.error || 'Failed to generate synopsis');
        }

        const synopsisData = await synopsisResponse.json();
        setSynopsis(synopsisData.synopsis);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchMovieAndSynopsis();
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="text-gray-600">Movie not found</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6">
        {movie.poster_path && (
          <div className="md:w-1/3">
            <img
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt={movie.title}
              className="rounded-lg shadow-lg w-full"
            />
          </div>
        )}
        <div className="md:w-2/3">
          <h1 className="text-3xl font-bold mb-2">{movie.title}</h1>
          <p className="text-gray-600 mb-4">{movie.release_date}</p>
          
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold mb-4">AI-Generated Synopsis</h2>
            <div className="whitespace-pre-wrap">{synopsis}</div>
          </div>
        </div>
      </div>
    </div>
  );
} 