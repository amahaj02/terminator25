import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

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
    
    const prompt = `Write a detailed and engaging synopsis for the movie "${title}". 
    Here's the basic overview: ${overview}
    
    Please provide a comprehensive synopsis that includes:
    1. Main plot points
    2. Key themes and messages
    3. Character development
    4. Notable scenes or moments
    5. The movie's impact or significance
    
    Format the response in a clear, well-structured way.`;

    console.log('Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    console.log('Received response from Gemini API');
    const response = await result.response;
    const text = response.text();
    console.log('Successfully generated synopsis');

    return NextResponse.json({ synopsis: text });
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