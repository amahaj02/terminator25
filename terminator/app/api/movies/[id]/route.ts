import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${params.id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch movie details from TMDB');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('TMDB API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movie details' },
      { status: 500 }
    );
  }
} 