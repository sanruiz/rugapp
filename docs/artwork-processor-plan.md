# Artwork Processor Feature - Implementation Plan

## Problem Statement

The user wants to modify the existing rug processor to also handle artwork (paintings) images. The system should:

1. Take artwork images from a CSV file
2. Generate images with specific aspect ratios (1:1, 1:2, or 2:1) based on CSV data
3. Place the artwork centered on a wall background with 15-20% white/wall background around it
4. Apply realistic wall/lighting effects to make it look like the artwork is displayed on a real wall

## Current Architecture Analysis

### Existing Components
- `src/types/rug.ts` - Type definitions for rug data
- `src/lib/rug-utils.ts` - Rug-specific utilities (prompts, decor styles)
- `src/lib/csv-processor.ts` - CSV parsing and rug data mapping
- `src/lib/gemini-service.ts` - Batch request creation for Gemini API
- `src/app/api/*` - API routes for processing

### Required Changes

We will create a parallel set of components for artwork processing while keeping the rug processor intact:

1. **New Types**: `src/types/artwork.ts`
2. **New Utils**: `src/lib/artwork-utils.ts`
3. **Modified CSV Processor**: Update to detect/handle artwork CSV format
4. **Modified Gemini Service**: Support artwork batch requests with aspect ratios
5. **New UI Mode**: Add artwork mode selector

## Proposed Changes

### Phase 1: Create Artwork Types

Create `src/types/artwork.ts`:
```typescript
export interface ArtworkData {
  sku: string;
  title: string;
  artist?: string;
  medium?: string;
  dimensions?: string;
  aspectRatio: '1:1' | '1:2' | '2:1';
  imageLink: string;
  style?: string;
  category?: string;
}

export interface ProcessedArtwork extends ArtworkData {
  prompt: string;
  imageBase64?: string;
}
```

### Phase 2: Create Artwork Utilities

Create `src/lib/artwork-utils.ts` with:
- `buildArtworkPrompt()` - Generate prompts for wall-mounted artwork scenes
- `getAspectRatioConfig()` - Map aspect ratio strings to Gemini config
- `downloadImageAsBase64()` - (reuse from rug-utils)

### Phase 3: Update CSV Processor

Add artwork-specific CSV parsing:
- Detect if CSV is for artwork (by column names)
- `mapRowToArtworkData()` function
- `processArtworksFromCSV()` function

### Phase 4: Update Gemini Service

- Add `createArtworkBatchRequest()` method
- Support `image_config.aspect_ratio` parameter
- Add `createArtworkBatchRequests()` method

### Phase 5: Update API Routes

- Modify `/api/process-chunk` to handle both rugs and artwork
- Add content type detection

---

## Implementation Details

### Aspect Ratio Mapping

| CSV Value | Gemini Config | Use Case |
|-----------|---------------|----------|
| `1:1` | `"1:1"` | Square artworks |
| `1:2` | `"1:2"` | Portrait artworks (tall) |
| `2:1` | `"2:1"` | Landscape artworks (wide) |

### Prompt Template for Artwork

```
A photorealistic museum-quality image showing [artwork title] displayed on an elegant gallery wall.

The artwork is centered in the frame with approximately 15-20% white/neutral wall visible around all edges.
The wall has a subtle texture and warm neutral tone (off-white to light gray).

Lighting: Professional gallery lighting with soft, diffused illumination from above.
The lighting creates subtle shadows beneath the frame that add depth and realism.
No harsh reflections or glare on the artwork surface.

The artwork should appear as if it's actually mounted on the wall - not digitally overlaid.
Maintain the exact colors, details, and proportions of the original artwork.
The frame (if visible) should complement the artwork style.

Aspect ratio: [1:1/1:2/2:1]
```

---

## CSV Format for Artwork

| Column | Required | Description |
|--------|----------|-------------|
| `SKU` | Yes | Unique identifier |
| `Title` | Yes | Artwork title |
| `Artist` | No | Artist name |
| `Medium` | No | e.g., "Oil on canvas" |
| `Aspect Ratio` | Yes | `1:1`, `1:2`, or `2:1` |
| `image link` | Yes | URL to artwork image |
| `Style` | No | e.g., "Impressionist" |

---

## Action Plan

- [ ] Phase 1: Create artwork types (`src/types/artwork.ts`)
- [ ] Phase 2: Create artwork utilities (`src/lib/artwork-utils.ts`)
- [ ] Phase 3: Update CSV processor for artwork detection
- [ ] Phase 4: Update Gemini service with artwork methods
- [ ] Phase 5: Update API routes for artwork processing
- [ ] Phase 6: Test with sample artwork CSV
- [ ] Phase 7: Documentation update

---

## Risk Assessment

1. **Aspect ratio support**: Verify Gemini API supports the specified aspect ratios
2. **Background generation**: May need prompt tuning to achieve consistent wall backgrounds
3. **Artwork preservation**: Ensure original artwork quality/colors are maintained

## Mitigation

- Test with various aspect ratios early
- Iterate on prompt to achieve desired wall effect
- Include negative prompts to prevent distortion
