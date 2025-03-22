import fs from 'fs';
import path from 'path';

export function readMovieList(): string[] {
  try {
    const filePath = path.join(process.cwd(), 'app', 'data', 'List of LGBTQ-related films - Wikipedia.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Split the content into lines and clean up each line
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0); // Remove empty lines
  } catch (error) {
    console.error('Error reading movie list:', error);
    return [];
  }
} 