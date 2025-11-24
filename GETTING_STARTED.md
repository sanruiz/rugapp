# Getting Started with Your Rug Prompt Generator

## Quick Start Guide

### 1. Set Up Your Environment

First, make sure you have your Gemini API key ready:

1. Go to [Google AI Studio](https://aistudio.google.com/apikey) to get your API key
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Add your API key to `.env.local`:
   ```
   GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here
   ```

### 2. Test the Application

1. The development server should be running at http://localhost:3000
2. Use the sample CSV file in `/docs/sample-rugs.csv` to test the upload functionality
3. Try both "Generate Text-Only Batch" and "Generate with Images" options

### 3. Upload Your Own CSV

Your CSV file should have columns like:
- `SKU` - Product identifier
- `Title` - Rug name
- `Primary Category` - Main category (Persian, Modern & Contemporary, etc.)
- `Material` - Rug material
- `Size` or `exactSize` - Dimensions
- `image link` or `image_link` - URL to rug image
- Color fields: `fieldColor`, `borderColor`, etc.

### 4. Submit to Gemini Batch API

The app now supports **direct submission** to Gemini API:

#### Option A: Automatic Submission (Recommended)
1. Click "Submit to Gemini API" button
2. Monitor real-time progress updates
3. Download results when completed
4. Get AI-generated rug descriptions automatically

#### Option B: Manual Submission
1. Download the `batch-requests.jsonl` file
2. Use Gemini API client libraries or REST API directly
3. Monitor job status manually

### 5. Monitor Batch Progress

- **Real-time Updates**: See processing status every 10 seconds
- **Progress Tracking**: View completed/failed request counts
- **Automatic Polling**: No manual refresh needed
- **Result Download**: One-click download when ready

## Next Steps

1. **Customize Prompts**: Edit `src/lib/rug-utils.ts` to modify the prompt generation logic
2. **Add More Categories**: Update the `decorStyleByCollection` mapping for new rug categories
3. **Enhance UI**: Customize the styling in `src/components/rug-processor-app.tsx`
4. **Deploy**: Deploy to Vercel or your preferred hosting platform

## Need Help?

- Check the main README.md for detailed documentation
- Review the code comments in the source files
- Test with the provided sample CSV file first

Happy rug processing! 🏠✨
