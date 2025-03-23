import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

function cleanMarkdown(text: string): string {
  // Remove markdown headings
  let cleaned = text.replace(/^#+\s/gm, '');
  // Remove italics (asterisks)
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  // Remove any remaining asterisks at the start of lines
  cleaned = cleaned.replace(/^\s*\*\s*/gm, '');
  // Remove "AI-Generated Synopsis" heading if present
  cleaned = cleaned.replace(/^AI-Generated Synopsis\s*/m, '');
  // Remove asterisk after "Tropes & Tags"
  cleaned = cleaned.replace(/Tropes & Tags\*\s*/, 'Tropes & Tags\n');
  return cleaned;
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

Additionally, extract up to 10 highly relevant tropes and tags that accurately reflect the movie's genre, narrative structure, character archetypes, and stylistic elements. Prioritize precision, diversity, and thematic alignment in selecting these tropes and tags.

Since this content will be displayed on a webpage, structure the output with clear headings, short paragraphs, and bullet points where appropriate to enhance readability and user engagement.

Movie Title: "${title}"
Basic Overview: ${overview}

Please structure your response in the following format:

Movie Analysis: ${title}

Synopsis
[Your detailed synopsis here, limited to 2 paragraphs]

Key Elements
Tone: [Describe the film's tone]
Themes: [List main themes]
Genre: [Primary and secondary genres]

Tropes & Tags
[Up to 10 comma-separated tropes and tags]`;

    console.log('Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    console.log('Received response from Gemini API');
    const response = await result.response;
    const text = response.text();
    console.log('Successfully generated synopsis');

    // Clean up markdown formatting before sending response
    const cleanedText = cleanMarkdown(text);

    return NextResponse.json({ synopsis: cleanedText });
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