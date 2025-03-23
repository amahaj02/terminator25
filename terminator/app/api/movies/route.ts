import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Interface for parsed movie entries
interface MovieEntry {
  title: string;
  year: string | null;
}

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
    
    // Parse movie entries from the content
    const parsedMovies = parseMovieEntries(content);
    
    let movieEntries = parsedMovies;
    
    if (searchQuery) {
      // If there's a search query, filter the movies using fuzzy matching
      const query = searchQuery.toLowerCase();
      
      movieEntries = parsedMovies.filter(movie => {
        const movieTitle = movie.title.toLowerCase();
        
        // Check for direct substring match in title
        if (movieTitle.includes(query)) {
          return true;
        }
        
        // Check for individual word partial matches
        const movieWords = movieTitle.split(/\s+/);
        for (const word of movieWords) {
          if (word.includes(query) || query.includes(word)) {
            return true;
          }
        }
        
        return false;
      });
    } else {
      // If no search query, return 10 random movies
      movieEntries = getRandomMovies(parsedMovies, 10);
    }

    return NextResponse.json({ movies: movieEntries });
  } catch (error) {
    console.error('Error reading movie list:', error);
    return NextResponse.json({ error: 'Failed to read movie list' }, { status: 500 });
  }
}

// Function to parse movie entries from text content
function parseMovieEntries(content: string): MovieEntry[] {
  // Split the content into lines
  const lines = content.split('\n');
  const movies: MovieEntry[] = [];
  
  // Process each line that might contain a movie
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines, headers, and non-movie entries
    if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.match(/^[A-Z]$/) || 
        trimmedLine.match(/^[0-9]–[0-9]$/) || trimmedLine.includes('List of LGBTQ')) {
      continue;
    }
    
    // The standard format is: "Title, Country (Year)" or "Title (Year)"
    // First, try to extract year from parentheses at the end
    const yearMatch = trimmedLine.match(/\((\d{4})\)$/);
    let year: string | null = null;
    
    if (yearMatch) {
      year = yearMatch[1];
    } else {
      // Try to find a year pattern anywhere in the line
      const yearPatternMatch = trimmedLine.match(/\b(19|20)\d{2}\b/);
      if (yearPatternMatch) {
        year = yearPatternMatch[0];
      }
    }
    
    // Extract the title - everything before the country/year information
    let title = trimmedLine;
    
    // Remove country and year info if present at the end: ", Country (Year)"
    const countryYearMatch = title.match(/, [^(]+ \(\d{4}\)$/);
    if (countryYearMatch) {
      title = title.substring(0, title.length - countryYearMatch[0].length);
    } 
    // Or just year info: " (Year)"
    else if (yearMatch) {
      const yearPart = title.match(/ \(\d{4}\)$/);
      if (yearPart) {
        title = title.substring(0, title.length - yearPart[0].length);
      }
    }
    
    // Add to the movies array if we have at least a title
    if (title) {
      movies.push({ title, year });
    }
  }
  
  return movies;
}

// Function to get random movies from the list
function getRandomMovies(movies: MovieEntry[], count: number): MovieEntry[] {
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