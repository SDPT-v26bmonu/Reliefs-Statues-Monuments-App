// Canonical ArcGIS Survey123 Multi-Region Venice Dataset
// Wraps generated raw records from:
// - artworks_4a797b48.json (402 records across Venice sestieri and lagoon islands)
// - image_manifest_7c28216e.json (475 attachment mappings)
// - lens_test_cases_c20d0df7.json (402 recognition test cases)

import {
  EXISTING_ARCHIVE_IMAGE_URL_MAP,
  RAW_SURVEY_ARTWORKS,
  RAW_IMAGE_MANIFEST,
  RAW_LENS_TEST_CASES,
  type RawSurveyArtwork,
  type RawImageManifestEntry,
  type RawLensTestCase,
} from './surveyDataRecords.ts';

export {
  EXISTING_ARCHIVE_IMAGE_URL_MAP,
  RAW_SURVEY_ARTWORKS,
  RAW_IMAGE_MANIFEST,
  RAW_LENS_TEST_CASES,
  type RawSurveyArtwork,
  type RawImageManifestEntry,
  type RawLensTestCase,
};

// Map of all verified local Survey123 reference image URLs
export const DATASET_IMAGE_URL_MAP: Record<string, string> = {
  ...EXISTING_ARCHIVE_IMAGE_URL_MAP,
};

/**
 * Returns true if the logical Survey123 attachment path currently has a verified local image asset.
 */
export function hasAccessibleArchiveImage(logicalPath: string): boolean {
  const clean = (logicalPath || '').replace(/^\/+/, '');
  return Boolean(DATASET_IMAGE_URL_MAP[clean]);
}

/**
 * Resolves a logical dataset image path (e.g. "images/artwork_001_01.jpg") to its verified
 * static /assets/aistudio/ path (or falls back to /images/artwork_XXX_YY.jpg for future additions).
 */
export function resolveDatasetImageUrl(logicalPath: string): string {
  const clean = (logicalPath || '').replace(/^\/+/, '');
  if (!clean) return '';
  if (DATASET_IMAGE_URL_MAP[clean]) {
    return DATASET_IMAGE_URL_MAP[clean];
  }
  return `/${clean}`;
}
