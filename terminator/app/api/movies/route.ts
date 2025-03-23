import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    // Parse the URL to get search parameters
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('query');
    
    // Get the absolute path to the public directory
    const publicDir = path.join(process.cwd(), 'public');
    const filePath = path.join(publicDir, 'List of LGBTQ-related films - Wikipedia.txt');
    
    // Log the file path for debugging
    console.log('Attempting to read file from:', filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('File not found at:', filePath);
      return NextResponse.json({ error: 'Movie list file not found' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Split the content into lines and clean up each line
    const allMovies = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0); // Remove empty lines

    let movieList = allMovies;
    
    if (searchQuery) {
      // If there's a search query, filter the movies using more flexible fuzzy matching
      // Convert both to lowercase for case-insensitive comparison
      const query = searchQuery.toLowerCase();
      
      // Less restrictive matching - will match partial words
      movieList = allMovies.filter(movie => {
        const movieLower = movie.toLowerCase();
        
        // Simple fuzzy matching - check if any word in the movie title contains
        // the search query as a substring
        const movieWords = movieLower.split(/\s+/);
        
        // Check for direct substring match
        if (movieLower.includes(query)) {
          return true;
        }
        
        // Check for individual word partial matches
        for (const word of movieWords) {
          if (word.includes(query) || query.includes(word)) {
            return true;
          }
        }
        
        return false;
      });
    } else {
      // If no search query, return 10 random movies
      movieList = getRandomMovies(allMovies, 10);
    }

    return NextResponse.json({ movies: movieList });
  } catch (error) {
    console.error('Error reading movie list:', error);
    return NextResponse.json({ error: 'Failed to read movie list' }, { status: 500 });
  }
}

// Function to get random movies from the list
function getRandomMovies(movies: string[], count: number): string[] {
  // Make a copy to avoid modifying the original array
  const shuffled = [...movies];
  
  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Return the first 'count' movies
  return shuffled.slice(0, count);
} 