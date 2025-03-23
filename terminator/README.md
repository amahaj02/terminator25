# Terminator25

LGBTQ Movies Search Application

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   cd terminator
   npm install
   ```

3. Setup environment variables:
   - Create a `.env.local` file in the `terminator` directory
   - Get TMDB API credentials from https://www.themoviedb.org/ (Account Settings > API)
   - Add your credentials to the `.env.local` file:
     ```
     NEXT_PUBLIC_TMDB_API_KEY=your_api_key_here
     NEXT_PUBLIC_TMDB_ACCESS_TOKEN=your_read_access_token_here
     ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Features

- Displays 10 random LGBTQ-related movies on initial load
- Search functionality for finding specific movies
- Uses TMDB API to fetch movie details and posters

## Troubleshooting

If you encounter an error about missing TMDB authentication credentials:
1. Make sure your `.env.local` file exists in the `terminator` directory
2. Ensure you've added both your API key and Access Token
3. Restart the development server after updating environment variables

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
