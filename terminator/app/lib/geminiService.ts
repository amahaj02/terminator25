import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
  throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not defined in environment variables');
}

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

export async function generateMovieSynopsis(movieName: string): Promise<string> {
  try {
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Create a prompt that will generate detailed movie research and synopsis
    const prompt = `Please provide a detailed synopsis and analysis for the movie "${movieName}". 
    Include the following:
    - Plot summary
    - Key themes and messages
    - Notable performances and direction
    - Critical reception
    Please make it engaging and informative.`;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating movie synopsis:', error);
    throw error;
  }
}