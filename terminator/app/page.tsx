"use client";

import { useEffect, useState, useRef } from "react";
import { TMDBMovie, MovieEntry, fetchGenres } from "./lib/tmdb";
import {
  searchMovie,
  searchMoviesFromList,
  searchMoviesByQuery,
} from "./lib/tmdb";
import Link from "next/link";

export default function Home() {
  // Original state variables
  const [results, setResults] = useState<Map<string, TMDBMovie[]>>(new Map());
  const [directResults, setDirectResults] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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
  
  // Menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Add click outside listener to close menu
  useEffect(() => {
    function handleClickOutsideMenu(event: MouseEvent) {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        isMenuOpen
      ) {
        setIsMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutsideMenu);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideMenu);
    };
  }, [isMenuOpen]);

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
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`,
      );
      if (!response.ok) throw new Error("Failed to fetch predictions");

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
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during search');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePredictionClick = async (movieId: number, movieTitle: string) => {
    setSearchTerm(movieTitle);
    setShowPredictions(false);
    
    try {
      setIsSearching(true);
      // We need to create a MovieEntry from the title to pass to searchMovie
      const movieEntry: MovieEntry = {
        title: movieTitle,
        year: null
      };
      
      // Search for the movie
      const result = await searchMovie(movieEntry);
      
      // Find the specific movie we want by ID
      const specificMovie = result.find(movie => movie.id === movieId);
      
      if (specificMovie) {
        setDirectResults([specificMovie]);
        setIsDirectSearch(true);
        setResultCount(1);
        setNoResults(false);
      } else if (result.length > 0) {
        // If we didn't find the exact movie but got others with the same title, show them
        setDirectResults(result);
        setIsDirectSearch(true);
        setResultCount(result.length);
        setNoResults(false);
      } else {
        setNoResults(true);
        setResultCount(0);
      }
    } catch (err) {
      console.error('Error fetching movie details:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto relative">
        {/* Hamburger Menu Button */}
        <button 
          onClick={toggleMenu}
          className="fixed top-4 left-4 z-50 p-2 text-white hover:text-gray-300 focus:outline-none"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>

        {/* Mobile Menu */}
        <div
          ref={menuRef}
          className={`fixed top-0 left-0 z-40 h-full w-full sm:w-80 bg-black transform transition-transform duration-300 ease-in-out ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full p-8">
            <button
              onClick={toggleMenu}
              className="absolute top-4 left-4 text-white p-2"
              aria-label="Close menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="mt-16 flex flex-col space-y-4">
              <button className="py-3 px-5 rounded-full bg-white text-black font-semibold text-center">
                Sign in
              </button>
              <button className="py-3 px-5 rounded-full bg-[#900048] text-white font-semibold text-center">
                Join Us
              </button>
            </div>

            <nav className="mt-12">
              <ul className="space-y-6 text-xl">
                <li>
                  <Link href="/films" className="block hover:text-gray-300">
                    Films
                  </Link>
                </li>
                <li>
                  <Link href="/tv-shows" className="block hover:text-gray-300">
                    TV Shows
                  </Link>
                </li>
                <li>
                  <Link href="/genres" className="block hover:text-gray-300">
                    Genres
                  </Link>
                </li>
                <li>
                  <Link href="/tropes" className="block hover:text-gray-300">
                    Tropes
                  </Link>
                </li>
                <li>
                  <Link href="/a-z" className="block hover:text-gray-300">
                    A-Z
                  </Link>
                </li>
              </ul>
            </nav>

            <div className="mt-auto mb-8 text-sm">
              <ul className="space-y-6">
                <li>
                  <Link href="/privacy-policy" className="block hover:text-gray-300">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms-of-service" className="block hover:text-gray-300">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Black overlay when menu is open */}
        {isMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        <main className="flex flex-col items-center">
          {/* Hero section with search */}
          <section className="relative w-full py-10 px-4 flex flex-col items-center">
            <div className="w-full max-w-4xl flex flex-col items-center">
              <h1 className="font-poppins text-5xl font-semibold text-center">
                Discover Movies by Trope
              </h1>
              <p className="mt-4 font-poppins text-base text-[#A3A3A3] text-center max-w-md">
                Find your next favorite movie based on the story elements you love
              </p>

              {/* Search box */}
              <div className="mt-8 w-full max-w-md">
                <form onSubmit={handleSearch} className="relative">
                  <div className="search-input">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        debouncedFetchPredictions(e.target.value);
                      }}
                      placeholder="Search for movies, TV shows, or tropes..."
                      className="w-full focus:outline-none text-black"
                    />
                    <button
                      type="submit"
                      className="bg-[#FF007F] rounded-full w-10 h-10 flex items-center justify-center"
                    >
                      <img
                        src="https://cdn.builder.io/api/v1/image/assets/TEMP/b11a7bb8e7b7dd4903de2bd1d25bc01e83b35e6c?placeholderIfAbsent=true"
                        alt="Search"
                        className="w-4 h-4"
                      />
                    </button>
                  </div>
                  
                  {/* Predictions dropdown */}
                  {showPredictions && predictions.length > 0 && (
                    <div
                      ref={predictionsRef}
                      className="absolute z-10 mt-2 w-full bg-white text-black rounded-lg shadow-lg"
                    >
                      {predictions.map((movie) => (
                        <div
                          key={movie.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handlePredictionClick(movie.id, movie.title)}
                        >
                          {movie.title}
                        </div>
                      ))}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </section>

          {/* Loading, Error, or No Results States */}
          {loading && (
            <div className="w-full text-center py-8">
              <p>Loading movies...</p>
            </div>
          )}

          {error && (
            <div className="w-full text-center py-8">
              <p className="text-red-500">Error: {error}</p>
            </div>
          )}

          {noResults && !loading && (
            <div className="w-full text-center py-8">
              <p>No movies found matching your search. Try a different query.</p>
            </div>
          )}

          {/* Display search results */}
          {!loading && !noResults && (
            <section className="w-full max-w-6xl px-4 py-8">
              <div className="w-full">
                {isDirectSearch ? (
                  <>
                    <h2 className="section-title mb-4">Search Results for "{searchTerm}"</h2>
                    <p className="section-subtitle mb-6">Found {resultCount} movie(s)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {directResults.map(movie => (
                        <Link href={`/movie/${movie.id}`} key={movie.id}>
                          <div className="flex flex-col">
                            {movie.poster_path ? (
                              <img 
                                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                                alt={movie.title}
                                className="movie-poster"
                              />
                            ) : (
                              <div className="bg-gray-800 movie-poster flex items-center justify-center">
                                <span className="text-sm text-center px-2">No poster available</span>
                              </div>
                            )}
                            <h3 className="mt-2 text-sm font-medium line-clamp-2">{movie.title}</h3>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="section-title mb-4">Browse Movies by Trope</h2>
                    <p className="section-subtitle mb-6">Explore {resultCount} movies across different genres</p>
                    
                    {/* Category cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                      <div className="category-card-primary">
                        <img
                          src="https://cdn.builder.io/api/v1/image/assets/TEMP/6a46af89e4c41c35caa0a0b20e9331e962b16e52?placeholderIfAbsent=true"
                          alt="Hero's Journey"
                          className="w-12 h-12"
                        />
                        <div>
                          <div className="text-lg font-medium">Hero's Journey</div>
                          <div className="text-sm opacity-80">Classic storytelling arc</div>
                        </div>
                      </div>
                      <div className="category-card-secondary">
                        <img
                          src="https://cdn.builder.io/api/v1/image/assets/TEMP/5a1d39a73e1e5dbaff8025b8d9cc578fdd9e21d6?placeholderIfAbsent=true"
                          alt="Coming of Age"
                          className="w-12 h-12"
                        />
                        <div>
                          <div className="text-lg font-medium">Coming of Age</div>
                          <div className="text-sm opacity-80">Growth & transformation</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Display movies by genre */}
                    {Array.from(genreGroupedMovies.entries()).map(([genre, movies]) => (
                      <div key={genre} className="mb-12">
                        <div className="flex items-center gap-1 font-poppins text-2xl text-white font-semibold mb-4">
                          <h2>{genre}</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {movies.slice(0, 5).map(movie => (
                            <Link href={`/movie/${movie.id}`} key={movie.id}>
                              <div className="flex flex-col">
                                {movie.poster_path ? (
                                  <img 
                                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                                    alt={movie.title}
                                    className="movie-poster"
                                  />
                                ) : (
                                  <div className="bg-gray-800 movie-poster flex items-center justify-center">
                                    <span className="text-sm text-center px-2">No poster available</span>
                                  </div>
                                )}
                                <h3 className="mt-2 text-sm font-medium line-clamp-2">{movie.title}</h3>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="w-full px-2 pt-4 pb-10 bg-[#AC0050] font-poppins text-xs text-white font-medium text-center">
            <div className="w-full">
              <p>Copyright © Trope to Truth. All rights reserved.</p>
              <div className="flex mt-10 w-full flex-col items-center">
                <a href="#" className="hover:underline">
                  Contact us
                </a>
                <a href="#" className="mt-6 hover:underline">
                  Terms of use
                </a>
                <a href="#" className="mt-6 hover:underline">
                  Privacy policy
                </a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}