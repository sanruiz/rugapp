# Rug Prompt Generator

A Next.js application for processing rug inventory CSV files and generating AI prompts for the Google Gemini Batch API. This tool helps automate the creation of batch requests for generating detailed rug descriptions and product content using AI.

## Features

- **CSV Upload & Processing**: Upload rug inventory CSV files with drag-and-drop functionality
- **Intelligent Prompt Generation**: Automatically creates detailed prompts based on rug specifications
- **Image Processing**: Downloads and converts rug images to base64 for AI analysis
- **Batch Request Generation**: Creates properly formatted JSONL files for Gemini Batch API
- **Progress Tracking**: Real-time status updates during processing
- **Download Ready Files**: Export batch request files ready for API submission

## Prerequisites

- Node.js 18+ installed
- Google Gemini API key
- CSV file with rug product data

## Getting Started

### 1. Environment Setup

Copy the environment template and add your API key:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Gemini API key:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Usage

### 1. Upload CSV File
- Drag and drop or click to select your rug inventory CSV file
- The app supports various CSV column formats for rug data

### 2. Review Processed Rugs
- View the first few processed rugs with generated prompts
- Check that data was parsed correctly

### 3. Generate Batch Requests
- Choose between text-only or image-included batch requests
- Text-only: Faster processing, prompts only
- With images: Downloads and includes rug images for visual analysis

### 4. Submit to Gemini API
- **Option A**: Download the `batch-requests.jsonl` file and manually upload to Gemini API
- **Option B**: Click "Submit to Gemini API" to automatically submit your batch job
- Monitor real-time progress and status updates
- Download results when processing completes

## CSV File Format

Your CSV should contain columns like:
- `SKU`: Product identifier
- `Title`: Rug name/title
- `Description`: Product description
- `Primary Category`: Main rug category
- `Material`: Rug material (wool, silk, etc.)
- `Style`: Design style
- `Size` / `Exact Size`: Dimensions
- `image link` / `image_link`: URL to rug image
- `Pile`, `Foundation`, `Origin`: Additional details
- Color fields: `fieldColor`, `borderColor`, etc.

## API Routes

- `POST /api/upload`: Process uploaded CSV files
- `POST /api/generate-batch`: Generate batch requests with optional image processing
- `POST /api/submit-batch`: Submit batch jobs directly to Gemini Batch API
- `GET /api/batch-status`: Monitor batch job status and progress
- `POST /api/batch-status`: Cancel or delete batch jobs
- `GET /api/download-results`: Download completed batch results

## Technology Stack

- **Next.js 14+**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Vercel AI SDK**: AI integration toolkit
- **Google Gemini API**: AI model for content generation
- **React Dropzone**: File upload component
- **csv-parser**: CSV file processing

## Development

### Build for Production

```bash
npm run build
```

### Run Production Server

```bash
npm start
```

### Linting

```bash
npm run lint
```

## Deployment

Deploy easily to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Make sure to add your `GOOGLE_GENERATIVE_AI_API_KEY` in Vercel's environment variables.
