# 🖼️ Artwork Processor - User Guide

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Getting Started](#getting-started)
4. [CSV File Format](#csv-file-format)
5. [Aspect Ratios](#aspect-ratios)
6. [Output & Results](#output--results)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The **Artwork Processor** is a feature of the image generation application that transforms artwork (paintings) images into stunning gallery-style display images. It takes your artwork product images and places them on photorealistic gallery walls with professional lighting.

### What This Feature Does

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CSV File      │     │  Gemini AI      │     │  Gallery Scene  │
│  (Artwork Data  │ ──▶ │  Batch API      │ ──▶ │  Images         │
│  + Image URLs)  │     │                 │     │  (PNG files)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Input:** A CSV file containing artwork data (SKU, title, artist, aspect ratio, image URLs, etc.)

**Output:** Photorealistic PNG images showing each artwork displayed on an elegant gallery wall

### Key Features

- 📐 **Multiple Aspect Ratios** - Support for 1:1, 1:2, and 2:1 output ratios
- 🖼️ **Gallery Wall Display** - Artwork centered with 15-20% wall background
- 💡 **Professional Lighting** - Soft, diffused gallery lighting
- 🎨 **Artwork Preservation** - Original artwork colors and details maintained
- 📦 **Batch Processing** - Process hundreds of artworks efficiently

---

## How It Works

### The Image Generation Flow

```
1. UPLOAD CSV
   └── Parse artwork data (SKU, title, artist, aspect ratio, image URL, etc.)
   
2. GENERATE PROMPTS
   └── Create AI prompts based on artwork attributes
       ├── Wall style based on artwork style
       ├── Aspect ratio from CSV data
       └── Lighting and quality instructions
   
3. DOWNLOAD ARTWORK IMAGES
   └── Fetch original artwork images from URLs
   └── Convert to Base64 for AI processing
   
4. CREATE BATCH REQUESTS
   └── Package prompt + artwork image into JSONL format
   └── Include aspect ratio configuration
   
5. SUBMIT TO GEMINI
   └── Upload JSONL to Google Files API
   └── Submit batch job to Gemini 2.5 Flash Image
   
6. WAIT FOR PROCESSING
   └── Poll batch status every 15-30 seconds
   
7. DOWNLOAD RESULTS
   └── Retrieve completed batch results
   └── Extract generated images from responses
   └── Save as PNG files
```

### Gallery Wall Effect

The system generates images that look like professional gallery photographs:

| Element | Description |
|---------|-------------|
| **Wall Background** | Elegant off-white to light gray gallery wall |
| **Spacing** | 15-20% wall visible around the artwork |
| **Lighting** | Soft, diffused illumination from above |
| **Shadows** | Subtle shadows beneath artwork for depth |
| **Quality** | High-resolution, sharp focus |

---

## Getting Started

### Prerequisites

1. **Node.js 16+** installed
2. **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/apikey)

### Usage

1. Prepare your CSV file with artwork data (see format below)
2. Upload the CSV file to the application
3. The system automatically detects it as artwork data
4. Start the processing pipeline
5. Collect your generated gallery images

---

## CSV File Format

### Required Columns

| Column | Description | Example |
|--------|-------------|---------|
| `SKU` | Unique product identifier | `ART-12345` |
| `image link` OR `local path` | URL or local file path | See below |
| `Aspect Ratio` | Output aspect ratio | `1:1`, `1:2`, or `2:1` |

### Image Source Options

You can provide images in **two ways**:

#### Option 1: Remote URLs
```csv
SKU,Title,Aspect Ratio,image link
ART-001,Starry Night,2:1,https://example.com/starry.jpg
```

#### Option 2: Local File Paths
```csv
SKU,Title,Aspect Ratio,local path
ART-001,Starry Night,2:1,/Users/you/images/starry.jpg
ART-002,Mona Lisa,1:2,./artwork/mona-lisa.png
```

**Supported local path column names:**
- `local path`, `local_path`, `Local Path`, `LocalPath`
- `file path`, `file_path`, `File Path`, `FilePath`
- `path`, `Path`

### Recommended Columns

| Column | Description | Example |
|--------|-------------|---------|
| `Title` | Artwork title | `Starry Night` |
| `Artist` | Artist name | `Vincent van Gogh` |
| `Medium` | Artwork medium | `Oil on canvas` |
| `Style` | Art style | `Impressionist`, `Modern`, `Abstract` |
| `Dimensions` | Physical dimensions | `29" x 36"` |
| `Year` | Year created | `1889` |
| `Category` | Art category | `Landscape`, `Portrait` |
| `Description` | Artwork description | `Night sky over village...` |

### Sample CSV (with URLs)

```csv
SKU,Title,Artist,Medium,Aspect Ratio,image link,Style
ART-001,Starry Night,Vincent van Gogh,Oil on canvas,2:1,https://example.com/starry.jpg,Impressionist
ART-002,The Persistence of Memory,Salvador Dali,Oil on canvas,2:1,https://example.com/dali.jpg,Surrealist
ART-003,Girl with Pearl Earring,Johannes Vermeer,Oil on canvas,1:2,https://example.com/vermeer.jpg,Classical
ART-004,Composition VIII,Wassily Kandinsky,Oil on canvas,1:1,https://example.com/kandinsky.jpg,Abstract
```

### Sample CSV (with Local Paths)

```csv
SKU,Title,Artist,Aspect Ratio,local path,Style
ART-001,Starry Night,Vincent van Gogh,2:1,/images/artwork/starry-night.jpg,Impressionist
ART-002,The Persistence of Memory,Salvador Dali,2:1,./paintings/dali-memory.png,Surrealist
ART-003,Girl with Pearl Earring,Johannes Vermeer,1:2,../gallery/vermeer.jpg,Classical
```

---

## Aspect Ratios

### Supported Ratios

| Ratio | Description | Best For |
|-------|-------------|----------|
| **1:1** | Square | Modern art, portraits, Instagram |
| **1:2** | Portrait (tall) | Tall paintings, portraits |
| **2:1** | Landscape (wide) | Wide landscapes, panoramas |

### Ratio in CSV

You can specify aspect ratio using various formats:

| CSV Value | Interpreted As |
|-----------|----------------|
| `1:1` | Square |
| `1x1` | Square |
| `square` | Square |
| `1:2` | Portrait |
| `1x2` | Portrait |
| `portrait` | Portrait |
| `tall` | Portrait |
| `2:1` | Landscape |
| `2x1` | Landscape |
| `landscape` | Landscape |
| `wide` | Landscape |

---

## Output & Results

### Output Directory Structure

```
rugapp/
└── output/
    └── YYYY-MM-DD/
        ├── images/
        │   ├── artwork-SKU001.png
        │   ├── artwork-SKU002.png
        │   └── ...
        └── jsonl/
            ├── batch-results-chunk-1.jsonl
            └── ...
```

### Generated Images

- **Format:** PNG (high quality)
- **Naming:** `artwork-[SKU].png`
- **Quality:** High resolution with gallery-quality presentation

### What to Expect

Your generated images will show:

1. ✅ Original artwork centered in frame
2. ✅ Elegant gallery wall background
3. ✅ Professional museum-quality lighting
4. ✅ Subtle shadows for depth/realism
5. ✅ 15-20% wall border around artwork
6. ✅ Preserved original colors and details

---

## Troubleshooting

### Common Issues

#### Artwork appears distorted

**Cause:** Aspect ratio mismatch between original and specified ratio.

**Solution:** 
- Match the aspect ratio to the original artwork proportions
- Use 2:1 for landscapes, 1:2 for portraits, 1:1 for square works

#### Colors look different

**Cause:** AI may adjust colors slightly.

**Solution:**
- The prompt instructs preservation of original colors
- If issues persist, try with higher quality source images

#### Wall background not uniform

**Cause:** AI interpretation variation.

**Solution:**
- Ensure artwork image has clean edges
- Results may vary slightly - regenerate if needed

#### Image failed to download

**Cause:** Invalid URL or server issues.

**Solution:**
- Verify image URL works in browser
- Check if URL requires authentication
- Ensure image format is JPG or PNG

### Tips for Best Results

1. **Use high-quality source images** - Higher resolution inputs produce better results
2. **Match aspect ratios** - Use ratios that complement the original artwork shape
3. **Clear image edges** - Artwork images with clean edges work best
4. **Consistent naming** - Use unique SKUs for each artwork

---

## Technical Details

### Wall Style by Art Style

| Art Style | Wall Description |
|-----------|------------------|
| Modern | Clean white gallery wall with minimal texture |
| Contemporary | Smooth light gray museum wall |
| Classical | Warm off-white wall with subtle texture |
| Impressionist | Soft cream-colored gallery wall |
| Abstract | Pure white contemporary gallery wall |
| Renaissance | Warm beige museum wall with subtle texture |
| Pop Art | Bright white gallery wall |
| Minimalist | Pristine white wall with no texture |
| Traditional | Warm neutral gallery wall |
| Default | Elegant off-white gallery wall with subtle texture |

---

*For technical details and rug processing, see the [README.md](../README.md) and [USER-GUIDE.md](./USER-GUIDE.md).*
