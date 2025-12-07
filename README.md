# 🏠 Rug Prompt Generator

A Next.js application for processing large rug inventory CSV files and generating AI-styled room scene images using Google Gemini Batch API.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16+-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)

## ✨ Features

- **📤 CSV Upload & Processing** - Drag-and-drop support for rug inventory files
- **🔄 Automated Pipeline** - Process 5000+ rugs automatically with parallel batch processing
- **🖼️ Image-to-Image Generation** - Transform rug images into styled room scenes
- **📦 Smart Chunking** - Split large CSVs into optimal chunks (75 rugs each)
- **⏸️ Pause/Resume** - Full control over long-running batch jobs
- **📊 Real-time Progress** - Visual tracking of all chunks and batches
- **💰 Cost Efficient** - Uses Gemini Batch API at 50% discount

## 🚀 Quick Start

### 1. Clone & Install

\`\`\`bash
git clone <your-repo>
cd rugapp
npm install
\`\`\`

### 2. Configure Environment

\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit \`.env.local\`:
\`\`\`env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
\`\`\`

> Get your API key at [Google AI Studio](https://aistudio.google.com/apikey)

### 3. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

## 📖 Usage

### Option 1: Automated Pipeline (Recommended for 5000+ rugs)

1. Click **"🚀 Automated Pipeline"** mode
2. Upload your CSV file
3. Click **"▶️ Start Pipeline"**
4. Watch as the system automatically:
   - Splits into ~75 rug chunks
   - Processes 5 chunks in parallel
   - Downloads images & generates JSONL
   - Submits to Gemini Batch API
   - Waits for results, then continues

### Option 2: Manual Processing

1. Click **"Manual Processing"** mode
2. Upload CSV → Generate Batch → Submit to Gemini
3. Monitor status and download results

### Option 3: Split CSV Only

1. Click **"Split CSV Only"** mode
2. Upload large CSV
3. Download individual chunks for external processing

## 📁 CSV Format

Your CSV should include these columns:

| Column | Description | Example |
|--------|-------------|---------|
| \`SKU\` | Product identifier | \`RUG-12345\` |
| \`Title\` | Rug name | \`Persian Silk Carpet\` |
| \`Primary Category\` | Main category | \`Persian\`, \`Modern\` |
| \`Material\` | Rug material | \`Wool\`, \`Silk\` |
| \`Size\` / \`exactSize\` | Dimensions | \`8x10\`, \`9'6" x 13'6"\` |
| \`image link\` | URL to rug image | \`https://...\` |
| \`fieldColor\` | Main color | \`Red\`, \`Blue\` |
| \`borderColor\` | Border color | \`Gold\`, \`Ivory\` |
| \`Style\` | Design style | \`Traditional\`, \`Modern\` |

See \`docs/sample-rugs.csv\` for a complete example.

## 🏗️ Architecture

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐  │
│  │ CSV Upload  │ │  Pipeline   │ │   Log Viewer     │  │
│  │  Dropzone   │ │  Controls   │ │   (Real-time)    │  │
│  └─────────────┘ └─────────────┘ └──────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    API Routes                            │
│  /api/upload      /api/process-chunk    /api/batch-status│
│  /api/chunk-csv   /api/submit-batch     /api/download-*  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  Google Gemini API                       │
│           (Batch API - 50% cost discount)               │
│         gemini-2.5-flash-image model                    │
└─────────────────────────────────────────────────────────┘
\`\`\`

## 📂 Project Structure

\`\`\`
rugapp/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main page
│   │   └── api/
│   │       ├── upload/           # CSV upload & processing
│   │       ├── chunk-csv/        # Split large CSVs
│   │       ├── process-chunk/    # Process single chunk
│   │       ├── generate-batch/   # Generate JSONL
│   │       ├── submit-batch/     # Submit to Gemini
│   │       ├── batch-status/     # Check batch status
│   │       └── download-*/       # Download results
│   ├── components/
│   │   ├── rug-processor-app.tsx # Main app component
│   │   ├── AutomatedPipeline.tsx # Pipeline UI
│   │   └── LogViewer.tsx         # Real-time logs
│   ├── lib/
│   │   ├── csv-processor.ts      # CSV parsing
│   │   ├── gemini-service.ts     # Gemini API client
│   │   ├── batch-pipeline.ts     # Pipeline logic
│   │   ├── rug-utils.ts          # Prompt generation
│   │   └── logger.ts             # Logging system
│   └── types/
│       └── rug.ts                # TypeScript types
├── docs/
│   ├── sample-rugs.csv           # Sample data
│   └── gemini-batch-api.md       # API documentation
└── README.md
\`\`\`

## ⚙️ Configuration

### Chunk Size Recommendations

| Scenario | Chunk Size | Reason |
|----------|------------|--------|
| With images | 75 | ~50-75MB per batch |
| Text only | 300-500 | Lightweight requests |
| Testing | 10-20 | Quick iteration |

### Pipeline Settings

\`\`\`typescript
// In AutomatedPipeline component
chunkSize = 75         // Rugs per chunk
concurrentLimit = 5    // Parallel batches
pollingInterval = 15s  // Status check frequency
\`\`\`

## 💰 Cost Estimation

Using Gemini Batch API (50% discount):

| Rugs | Estimated Cost | Time |
|------|---------------|------|
| 100 | ~\$0.15 | ~5 min |
| 1,000 | ~\$1.50 | ~30 min |
| 5,500 | ~\$8.25 | ~3-4 hours |

*Estimates based on ~\$0.0015 per rug with image processing*

## 🛠️ API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/api/upload\` | POST | Upload & parse CSV |
| \`/api/chunk-csv\` | POST | Split CSV into chunks |
| \`/api/process-chunk\` | POST | Process single chunk (images + JSONL + submit) |
| \`/api/generate-batch\` | POST | Generate JSONL batch file |
| \`/api/submit-batch\` | POST | Submit batch to Gemini |
| \`/api/batch-status\` | GET | Check batch job status |
| \`/api/download-results\` | GET | Download batch results |
| \`/api/extract-images\` | POST | Extract images from results |

## 🧪 Development

\`\`\`bash
# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Lint code
npm run lint
\`\`\`

## 🚀 Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Add environment variable:
- \`GOOGLE_GENERATIVE_AI_API_KEY\`

## �� License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with ❤️ using Next.js, TypeScript, and Google Gemini AI
