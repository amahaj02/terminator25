import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

interface MovieAnalysis {
  title: string;
  releaseDate: string;
  synopsis: string;
  keyElements: string[];
  tropesAndTags: string[];
  whereToWatch: string[];
}

function extractMovieAnalysis(text: string): MovieAnalysis {
  // Split the text into sections
  const sections = text.split(/\n(?=\w)/);
  
  // Initialize the result object
  const result: MovieAnalysis = {
    title: '',
    releaseDate: '',
    synopsis: '',
    keyElements: [],
    tropesAndTags: [],
    whereToWatch: []
  };

  // Extract title and release date
  const titleMatch = text.match(/^([^\n]+)\n([^\n]+)/);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
    result.releaseDate = titleMatch[2].trim();
  }

  // Extract synopsis
  const synopsisMatch = text.match(/Synopsis\n\n([\s\S]*?)(?=\n\nKey Elements)/);
  if (synopsisMatch) {
    result.synopsis = synopsisMatch[1].trim();
  }

  // Extract key elements
  const keyElementsMatch = text.match(/Key Elements\n\n([\s\S]*?)(?=\n\nTropes & Tags)/);
  if (keyElementsMatch) {
    result.keyElements = keyElementsMatch[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('*'));
  }

  // Extract tropes and tags
  const tropesMatch = text.match(/Tropes & Tags\n\n([\s\S]*?)(?=\n\nWhere to Watch)/);
  if (tropesMatch) {
    const tropesText = tropesMatch[1];
    // Split into lines and filter out empty lines and category headers
    result.tropesAndTags = tropesText
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Skip empty lines and lines that are category headers
        if (!line) return false;
        
        // Skip category headers
        const categoryHeaders = [
          'Historical & Period Dramas',
          'Age Gaps & Power Imbalances',
          'Supernatural & Sci-Fi Sapphics',
          'Coming of Age & First Love',
          'Religious Struggles & Conversion',
          'Family-Friendly',
          'Horror & Survival Thrillers',
          'Mainstream WLW',
          'Tragic & Doomed Romance',
          'Happy & Healthy WLW'
        ];
        
        // Skip if the line is a category header
        if (categoryHeaders.some(header => line.includes(header))) return false;
        
        // Skip if the line starts with an asterisk or is just whitespace
        if (line.startsWith('*') || /^\s*$/.test(line)) return false;
        
        return true;
      });
  }

  // Extract where to watch
  const whereToWatchMatch = text.match(/Where to Watch\n([\s\S]*?)(?=\n\n⚠|$)/);
  if (whereToWatchMatch) {
    result.whereToWatch = whereToWatchMatch[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('*'));
  }

  return result;
}

export async function POST(request: Request) {
  try {
    const { title, overview } = await request.json();
    
    if (!title || !overview) {
      return NextResponse.json(
        { error: 'Title and overview are required' },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      console.error('Gemini API key is not configured');
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `Given the name of a movie, conduct in-depth research to generate a concise yet richly descriptive synopsis that captures the essence of the film without revealing major spoilers. The synopsis should be no more than two paragraphs, effectively conveying the film's tone, themes, and key elements in an engaging way.

Format the output exactly as follows, ensuring proper spacing for readability:

[Movie Title]
[Release Date]

Synopsis

[Two-paragraph synopsis]

Key Elements

[List key themes, genres, or defining aspects of the movie]

Tropes & Tags

IMPORTANT: You MUST include 5-10 relevant tropes/tags from the following categories. List each trope/tag on a new line, without any bullet points or special characters. Here's an example of how the tropes and tags section should look for a movie about a young gay man in 1970s Atlanta:

Coming Out Story
Religious Trauma
Self-Discovery
Mentor-Student Relationship
Period Piece
Cultural Commentary
Dark Comedy
Found Family
Substance Use
LGBTQ+ Representation

Available categories and example tropes:

Historical & Period Dramas
- Historical & Period Dramas

Age Gaps & Power Imbalances
- Age Gaps & Power Imbalances

Supernatural & Sci-Fi Sapphics
- Supernatural & Sci-Fi Sapphics

Coming of Age & First Love
- Coming of Age & First Love

Religious Struggles & Conversion
- Religious Struggles & Conversion

Family-Friendly
- Family-Friendly

Horror & Survival Thrillers
- Horror & Survival Thrillers

Mainstream WLW
- Mainstream WLW

Tragic & Doomed Romance
- Tragic & Doomed Romance

Happy & Healthy WLW
- Happy & Healthy WLW

Where to Watch
Conduct deep research to find all available platforms where the movie can be streamed, rented, or purchased. Use sources like IMDb and other relevant websites to identify lesser-known options, including YouTube, Amazon rentals, TV broadcasts, or any other verified viewing platforms. Clearly list the options.

⚠ Important Restrictions:

Do NOT include extra introductory text such as "AI-Generated Synopsis" or "Here's the requested information..."

Do NOT repeat the movie title and release date beyond the initial listing.

Do NOT add disclaimers about availability unless explicitly necessary. Only list the sources where the movie can be found.

Do NOT mention ongoing updates or future attempts to find more information. Only provide the best possible details at the time of research.

Do NOT include bullet points or special characters in the tropes and tags section. List each trope/tag on its own line.

Movie Title: "${title}"
Basic Overview: ${overview}`;

    console.log('Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    console.log('Received response from Gemini API');
    const response = await result.response;
    const text = response.text();
    console.log('Successfully generated synopsis');

    // Extract structured data from the response
    const movieAnalysis = extractMovieAnalysis(text);

    return NextResponse.json({ data: movieAnalysis });
  } catch (error) {
    console.error('Gemini API error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    return NextResponse.json(
      { error: 'Failed to generate synopsis', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 