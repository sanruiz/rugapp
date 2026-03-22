# 🏠 Rug Prompt Generator - User Guide

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Getting Started](#getting-started)
4. [Processing Modes](#processing-modes)
5. [Step-by-Step Workflows](#step-by-step-workflows)
6. [Understanding the Pipeline](#understanding-the-pipeline)
7. [CSV File Format](#csv-file-format)
8. [Output & Results](#output--results)
9. [Recovery & Error Handling](#recovery--error-handling)
10. [Cost Estimation](#cost-estimation)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The **Rug Prompt Generator** is a Next.js web application that transforms rug inventory data into stunning AI-generated room scene images. It takes your rug product images and places them into beautifully styled, photorealistic interior scenes using Google's Gemini AI.

### What This App Does

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CSV File      │     │  Gemini AI      │     │  Room Scene     │
│  (Rug Data +    │ ──▶ │  Batch API      │ ──▶ │  Images         │
│   Image URLs)   │     │                 │     │  (PNG files)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Input:** A CSV file containing rug inventory data (SKU, size, colors, style, image URLs, etc.)

**Output:** Photorealistic PNG images showing each rug placed in an appropriately styled room scene

### Key Features

- 📤 **Drag & Drop CSV Upload** - Simple file upload interface
- 🤖 **AI-Powered Image Generation** - Uses Gemini 2.5 Flash Image model
- 📦 **Smart Chunking** - Splits large files for efficient processing
- ⚡ **Parallel Processing** - Process up to 5 batches simultaneously
- ⏸️ **Pause/Resume** - Full control over long-running jobs
- 🔄 **Auto-Recovery** - Resume interrupted processing sessions
- 💰 **Cost Efficient** - Uses Batch API with 50% discount
- 📊 **Real-time Logging** - Monitor progress with detailed logs

---

## How It Works

### The Image Generation Flow

```
1. UPLOAD CSV
   └── Parse rug data (SKU, colors, size, style, image URL, etc.)
   
2. GENERATE PROMPTS
   └── Create AI prompts based on rug attributes
       ├── Room type based on rug shape (hallway for runners, living room for rectangles)
       ├── Decor style based on collection (Traditional, Modern, Transitional)
       └── Lighting, perspective, and quality instructions
   
3. DOWNLOAD RUG IMAGES
   └── Fetch original rug images from URLs
   └── Convert to Base64 for AI processing
   
4. CREATE BATCH REQUESTS
   └── Package prompt + rug image into JSONL format
   └── Split into chunks (75 rugs per chunk recommended)
   
5. SUBMIT TO GEMINI
   └── Upload JSONL to Google Files API
   └── Submit batch job to Gemini 2.5 Flash Image
   
6. WAIT FOR PROCESSING
   └── Poll batch status every 15-30 seconds
   └── Gemini processes all images in background
   
7. DOWNLOAD RESULTS
   └── Retrieve completed batch results
   └── Extract generated images from responses
   └── Save as PNG files (organized by date)
```

### Intelligent Prompt Generation

The app automatically generates context-aware prompts based on rug attributes:

| Rug Shape | Room Scene | Placement |
|-----------|------------|-----------|
| **Runner** | Elegant hallway | Centered lengthwise, no furniture on top |
| **Rectangle (Large)** | Spacious parlor/library | Seating around perimeter, clear center |
| **Rectangle (Small/Medium)** | Cozy living room | Under coffee table with sofa arrangement |
| **Round** | Dining room | Centered under round dining table |
| **Square** | Square dining room | Centered under table, balanced spacing |

The decor style is automatically selected based on the rug collection:

| Collection | Decor Style |
|------------|-------------|
| Persian, Antique, Fine Oriental | Traditional Decor |
| Modern & Contemporary, Silk | Modern Decor |
| Transitional, Kazak, Vintage | Transitional Decor |
| Flat Weave | Eclectic Decor |

---

## Getting Started

### Prerequisites

1. **Node.js 16+** installed
2. **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/apikey)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd rugapp

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
```

Edit `.env.local` and add your API key:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

### Running the App

```bash
# Development mode
npm run dev

# Production mode
npm run build && npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Processing Modes

The app offers three processing modes, selectable from the main interface:

### 1. 🚀 Automated Pipeline (Recommended)

**Best for:** Large datasets (100+ rugs), hands-off processing

The automated pipeline handles everything:
- Splits CSV into optimal chunks
- Processes multiple chunks in parallel
- Monitors batch status automatically
- Downloads and extracts images
- Handles errors and retries

**Workflow:**
1. Select "🚀 Automated Pipeline" mode
2. Upload your CSV file
3. Click "▶️ Start Pipeline"
4. Watch the progress (you can pause/resume)
5. Images are saved automatically to `output/[date]/images/`

### 2. 🔧 Manual Processing

**Best for:** Small datasets, testing, or custom control

Process step-by-step with manual control:
1. Upload CSV
2. Review parsed rugs
3. Generate batch requests
4. Submit to Gemini
5. Monitor status manually
6. Download results when complete

### 3. ✂️ Split CSV Only

**Best for:** Preparing files for external processing

Simply split a large CSV into smaller chunks:
1. Upload your large CSV
2. Set desired chunk size
3. Download individual chunk files
4. Process chunks externally or upload separately

---

## Step-by-Step Workflows

### Workflow A: Automated Pipeline (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: SELECT MODE                                        │
│  Click "🚀 Automated Pipeline" button                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: UPLOAD CSV                                         │
│  Drag & drop your CSV file into the dropzone               │
│  The app parses and displays rug count                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: CONFIGURE (Optional)                               │
│  • Chunk Size: 75 (recommended for images)                 │
│  • Concurrent Limit: 5 (parallel batches)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: START PIPELINE                                     │
│  Click "▶️ Start Pipeline" button                           │
│  The system begins automated processing                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: MONITOR PROGRESS                                   │
│  • Watch the chunk status grid                              │
│  • View real-time logs                                      │
│  • Use ⏸️ Pause / ▶️ Resume as needed                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: COLLECT RESULTS                                    │
│  Images automatically saved to:                             │
│  output/YYYY-MM-DD/images/rug-[SKU].png                    │
└─────────────────────────────────────────────────────────────┘
```

### Workflow B: Manual Processing

1. **Upload CSV**
   - Select "Manual Processing" mode
   - Drag & drop your CSV file
   - Review the list of parsed rugs

2. **Generate Batch Requests**
   - Click "Generate Batch Requests with Images"
   - Wait for image downloads (this may take a while)
   - Review the generated JSONL content

3. **Submit Batch**
   - Click "Submit to Gemini"
   - Note the Batch ID for tracking

4. **Monitor Status**
   - Click "Check Status" periodically
   - Wait for status: `JOB_STATE_SUCCEEDED`

5. **Download Results**
   - Click "Download Results"
   - Click "Extract Images"
   - View generated images in the gallery

---

## Understanding the Pipeline

### Chunk Processing States

Each chunk goes through these states:

| State | Icon | Description |
|-------|------|-------------|
| `pending` | ⏳ | Waiting to be processed |
| `downloading_images` | 📥 | Fetching rug images from URLs |
| `generating_jsonl` | 📝 | Creating batch request file |
| `submitted` | 📤 | Sent to Gemini API |
| `processing` | ⚙️ | Gemini is generating images |
| `downloading_results` | 📥 | Fetching completed results |
| `completed` | ✅ | Successfully finished |
| `failed` | ❌ | Error occurred |

### Batch Job States

| State | Description |
|-------|-------------|
| `JOB_STATE_PENDING` | Job queued, waiting to start |
| `JOB_STATE_RUNNING` | Gemini is processing images |
| `JOB_STATE_SUCCEEDED` | All images generated successfully |
| `JOB_STATE_FAILED` | Job failed (check error details) |
| `JOB_STATE_CANCELLED` | Job was manually cancelled |

### Parallel Processing

The pipeline processes multiple chunks simultaneously:

```
Time ──────────────────────────────────────────────────────────▶

Chunk 1: [====SUBMIT====][=====PROCESSING=====][DOWNLOAD]
Chunk 2:    [====SUBMIT====][=====PROCESSING=====][DOWNLOAD]
Chunk 3:       [====SUBMIT====][=====PROCESSING=====][DOWNLOAD]
Chunk 4:          [====SUBMIT====][=====PROCESSING=====][DOWNLOAD]
Chunk 5:             [====SUBMIT====][=====PROCESSING=====][DOWNLOAD]
Chunk 6:                                              [====SUBMIT====]...

└── Concurrent Limit: 5 chunks processing at once
```

---

## CSV File Format

### Required Columns

| Column | Description | Example |
|--------|-------------|---------|
| `SKU` | Unique product identifier | `RUG-12345` |
| `image link` | URL to rug product image | `https://cdn.example.com/rug.jpg` |

### Recommended Columns

| Column | Description | Example | Used For |
|--------|-------------|---------|----------|
| `Title` | Product name | `Persian Silk Carpet` | Display |
| `Primary Category` | Main collection | `Persian`, `Modern` | Decor style |
| `Material` | Rug material | `Wool`, `Silk` | Prompt detail |
| `Size` / `exactSize` | Dimensions | `8x10`, `9'6" x 13'6"` | Room sizing |
| `fieldColor` | Main rug color | `Red`, `Blue` | Color coordination |
| `borderColor` | Border color | `Gold`, `Ivory` | Color detail |
| `Style` | Design style | `Traditional` | Scene styling |
| `shape` | Rug shape | `Rectangle`, `Runner` | Room selection |
| `origin` | Country of origin | `Iran`, `India` | Context |
| `weavetype` | Weaving method | `Hand-knotted` | Detail |
| `pile` | Pile material | `Wool` | Texture detail |
| `foundation` | Foundation material | `Cotton` | Detail |

### Sample CSV

```csv
SKU,Title,Primary Category,Material,exactSize,image link,fieldColor,borderColor,Style,shape
RUG-001,Persian Garden,Persian,Wool/Silk,8' x 10',https://example.com/rug001.jpg,Red,Gold,Traditional,Rectangle
RUG-002,Modern Abstract,Modern & Contemporary,Wool,3' x 12',https://example.com/rug002.jpg,Blue,Navy,Modern,Runner
RUG-003,Vintage Oushak,Oushak and Peshawar,Wool,6' Round,https://example.com/rug003.jpg,Ivory,Beige,Transitional,Round
```

---

## Output & Results

### Output Directory Structure

```
rugapp/
└── output/
    └── YYYY-MM-DD/           # Organized by processing date
        ├── images/
        │   ├── rug-SKU001.png
        │   ├── rug-SKU002.png
        │   └── ...
        └── jsonl/
            ├── batch-results-chunk-1.jsonl
            ├── batch-results-chunk-2.jsonl
            └── ...
```

### Generated Images

- **Format:** PNG (high quality)
- **Size:** ~2-3 MB per image
- **Resolution:** 1024x1024 or higher
- **Naming:** `rug-[SKU].png`

### JSONL Files

Raw batch results are preserved for debugging:
- Contains original request/response pairs
- Useful for troubleshooting failed images
- Can be re-processed if needed

---

## Recovery & Error Handling

### Batch Recovery Panel

The app includes a recovery panel at the top of the page for:

1. **Checking Batch Status** - View all pending Gemini batches
2. **Downloading Missing Results** - Retrieve completed but not-downloaded batches
3. **Continuing Interrupted Sessions** - Resume from where you left off
4. **Retrying Failed Chunks** - Reprocess specific failed chunks

### Automatic Recovery Features

- **Session Persistence:** Pipeline state is preserved in browser storage
- **Resume Capability:** Return to a paused pipeline even after closing browser
- **Skip Completed Chunks:** Avoid reprocessing successful chunks
- **Retry Specific Chunks:** Target only failed chunks for reprocessing

### How to Recover a Session

1. Open the app - the Recovery Panel appears at the top
2. Click **"Check Gemini Status"** to see pending batches
3. If you see completed batches needing download:
   - Click **"Download All Missing Results"**
4. To continue from a specific chunk:
   - Enter the chunk number in "Continue from chunk"
   - Click **"Set Continue Point"**
   - Upload your CSV and start the pipeline

### Retrying Failed Chunks

1. Note the failed chunk numbers from the pipeline display
2. Enter them in the Recovery Panel: `5, 12, 23`
3. Click **"Set Retry Chunks"**
4. Upload your CSV and start - only those chunks will process

---

## Cost Estimation

### Pricing (Gemini Batch API - 50% Discount)

| Component | Cost |
|-----------|------|
| Input (rug image ~200KB + prompt) | ~$0.00075 |
| Output (generated room scene) | ~$0.00075 |
| **Total per rug** | **~$0.0015** |

### Batch Size Estimates

| Rugs | Estimated Cost | Processing Time |
|------|---------------|-----------------|
| 100 | ~$0.15 | ~5-10 minutes |
| 500 | ~$0.75 | ~20-30 minutes |
| 1,000 | ~$1.50 | ~45-60 minutes |
| 5,000 | ~$7.50 | ~3-4 hours |

*Times depend on Gemini API load and your concurrent limit setting.*

---

## Troubleshooting

### Common Issues

#### "Failed to download image for rug XXX"

**Cause:** The image URL is invalid, blocked, or the server is slow.

**Solutions:**
1. Verify the image URL works in a browser
2. Check if the server requires authentication
3. The app will continue without that image (text-only prompt)

#### "Batch job failed" or stuck in PENDING

**Cause:** Gemini API issue or invalid request format.

**Solutions:**
1. Check the Log Viewer for detailed errors
2. Try a smaller batch size (25-50 rugs)
3. Verify your API key has sufficient quota
4. Check [Google AI Studio](https://aistudio.google.com) for API status

#### Pipeline stuck / not progressing

**Solutions:**
1. Click **Pause** then **Resume**
2. Check network connectivity
3. Open browser DevTools Console for errors
4. Try refreshing the page (state is preserved)

#### Out of memory errors

**Cause:** Too many large images in browser memory.

**Solutions:**
1. Reduce chunk size to 50 or lower
2. Process in smaller batches
3. Close other browser tabs

### Configuration Tips

| Scenario | Chunk Size | Concurrent Limit |
|----------|------------|------------------|
| Testing/Debug | 10 | 2 |
| Normal processing | 75 | 5 |
| Slow network | 50 | 3 |
| Maximum throughput | 100 | 5 |

### Getting Help

1. Check the **Log Viewer** for detailed error messages
2. Review `output/[date]/jsonl/` files for batch details
3. Check browser DevTools Console (F12) for JavaScript errors

---

## Architecture Reference

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Next.js)                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│  │  RugProcessor   │ │   Automated     │ │   Recovery    │ │
│  │      App        │ │   Pipeline      │ │    Panel      │ │
│  └────────┬────────┘ └────────┬────────┘ └───────┬───────┘ │
└───────────┼───────────────────┼──────────────────┼─────────┘
            │                   │                  │
┌───────────▼───────────────────▼──────────────────▼─────────┐
│                      API ROUTES                             │
│  /api/upload         - Parse CSV files                      │
│  /api/chunk-csv      - Split into chunks                    │
│  /api/process-chunk  - Download images + generate JSONL     │
│  /api/submit-batch   - Submit to Gemini                     │
│  /api/batch-status   - Check batch progress                 │
│  /api/download-results - Get completed results              │
│  /api/save-and-extract - Save images to disk                │
│  /api/recover-batch  - Recovery operations                  │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                   GOOGLE GEMINI API                         │
│  • Files API (upload JSONL)                                 │
│  • Batch API (gemini-2.5-flash-image:batchGenerateContent)  │
│  • 50% cost discount for batch processing                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

The Rug Prompt Generator streamlines the process of creating marketing images for rug products:

1. **Upload** your rug inventory CSV
2. **Select** Automated Pipeline mode
3. **Start** and let the system handle everything
4. **Collect** your AI-generated room scene images

The intelligent prompt system ensures each rug is placed in an appropriately styled room based on its shape, size, collection, and design attributes. The batch processing approach makes it cost-effective to process thousands of rugs efficiently.

---

*For technical details, see the [README.md](../README.md) and [image-workflow.md](./image-workflow.md).*
