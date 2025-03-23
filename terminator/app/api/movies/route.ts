import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
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
    const movieList = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0); // Remove empty lines

    return NextResponse.json({ movies: movieList });
  } catch (error) {
    console.error('Error reading movie list:', error);
    return NextResponse.json({ error: 'Failed to read movie list' }, { status: 500 });
  }
} 