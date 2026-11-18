import type {
  Monument,
  GISNode,
  LensTestCase,
  RegionalCollection,
  Sestiere,
  MonumentCategory,
} from '../types.ts';
import {
  RAW_SURVEY_ARTWORKS,
  RAW_IMAGE_MANIFEST,
  RAW_LENS_TEST_CASES,
  EXISTING_ARCHIVE_IMAGE_URL_MAP,
  hasAccessibleArchiveImage,
  resolveDatasetImageUrl,
} from './surveyDataset.ts';

export const VENICE_CENTER = {
  lat: 45.4371,
  lng: 12.3326,
};

export const DORSODURO_CENTER = {
  lat: 45.4325,
  lng: 12.3235,
};

const SESTIERI_SET = new Set([
  'Dorsoduro',
  'San Marco',
  'San Polo',
  'Castello',
  'Cannaregio',
  'Santa Croce',
]);

const PREFERRED_REGION_ORDER = [
  'Dorsoduro',
  'San Marco',
  'San Polo',
  'Castello',
  'Cannaregio',
  'Santa Croce',
  'Guidecca',
  'Giudecca',
  'Murano',
  'Burano',
  'Torcello',
  'Mazzorbo',
  'Lido',
];

export function getRegionDisplayName(rawRegion: string): string {
  const trimmed = (rawRegion || '').trim();
  if (trimmed.toLowerCase() === 'guidecca') return 'Giudecca';
  return trimmed || 'Venice';
}

export function getRegionClassification(rawRegion: string): 'Sestiere' | 'Island' {
  const display = getRegionDisplayName(rawRegion);
  return SESTIERI_SET.has(display) ? 'Sestiere' : 'Island';
}

export function getRegionCollectionId(rawRegion: string): string {
  const slug = getRegionDisplayName(rawRegion)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-collection`;
}

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

function getSurveyNumberFromPrimary(primaryImage: string, index: number): string {
  const match = primaryImage.match(/artwork_(\d+)_/i);
  if (match && match[1]) return match[1].padStart(3, '0');
  return String(index + 1).padStart(3, '0');
}

const manifestByGlobalId = new Map<string, typeof RAW_IMAGE_MANIFEST>();
for (const entry of RAW_IMAGE_MANIFEST) {
  const list = manifestByGlobalId.get(entry.arcgisGlobalId) || [];
  list.push(entry);
  manifestByGlobalId.set(entry.arcgisGlobalId, list);
}

export const MONUMENTS: Monument[] = RAW_SURVEY_ARTWORKS.map((raw, index) => {
  const surveyNumber = getSurveyNumberFromPrimary(raw.primaryImage, index);
  const surveyCode = `artwork_${surveyNumber}`;
  const artworkType = raw.properties.what_type_of_artwork_are_you_lo;
  const singularType =
    artworkType === 'Statues' ? 'Statue' : artworkType === 'Reliefs' ? 'Relief' : 'Monument';
  const manifestEntries = manifestByGlobalId.get(raw.arcgisGlobalId) || [];

  const rawRegion = (raw.properties.region || 'Dorsoduro').trim();
  const regionDisplay = getRegionDisplayName(rawRegion);
  const sestiere = rawRegion as Sestiere;

  const resolvedGallery = raw.images.map(resolveDatasetImageUrl).filter(Boolean);
  const resolvedPrimary = resolveDatasetImageUrl(raw.primaryImage) || resolvedGallery[0] || '';
  const hasAccessibleImage =
    hasAccessibleArchiveImage(raw.primaryImage) ||
    raw.images.some((img) => hasAccessibleArchiveImage(img));

  const generalNotes = raw.properties.general_notes;
  const formattedCoords = `${raw.latitude.toFixed(5)}° N, ${raw.longitude.toFixed(5)}° E`;
  const modelRaw = raw.properties._3d_model_captured;

  return {
    id: raw.id,
    arcgisGlobalId: raw.arcgisGlobalId,
    surveyCode,
    title: `${regionDisplay} ${singularType} #${surveyNumber}`,
    artist: raw.properties.artist,
    year: raw.properties.artworks_date,
    era: null,
    category: artworkType,
    rawCategory: raw.category,
    sestiere,
    rawRegion,
    regionDisplay,
    locationName: `${regionDisplay}, Venice`,
    coordinates: {
      lat: raw.latitude,
      lng: raw.longitude,
      formatted: formattedCoords,
    },
    distanceKm: haversineDistanceKm(
      VENICE_CENTER.lat,
      VENICE_CENTER.lng,
      raw.latitude,
      raw.longitude
    ),
    material: null,
    description: generalNotes
      ? `Survey123 Field Note: "${generalNotes}"`
      : `Surveyed in ${regionDisplay}, Venice via ArcGIS Survey123 (${artworkType}).`,
    generalNotes,
    historicalContext: null,
    imageUrl: resolvedPrimary,
    galleryImages: resolvedGallery,
    originalFilenames: manifestEntries.map((e) => e.originalFilename),
    hasAccessibleImage,
    acquaAltaRisk: null,
    elevationMeters: null,
    has3DModel: (modelRaw || '').toLowerCase() === 'yes',
    modelCapturedRaw: modelRaw || 'Not recorded',
    creationDate: raw.properties.CreationDate,
    creator: raw.properties.Creator,
    editDate: raw.properties.EditDate,
    editor: raw.properties.Editor,
    conditionReport: {
      gisCatalogId: raw.arcgisGlobalId,
    },
    isFeatured: raw.id === 'a92deb11-7c77-4d4c-8b6e-6142b9fa535d',
  };
});

// Group artworks dynamically by Survey123 region
const monumentsByRawRegion = new Map<string, Monument[]>();
for (const m of MONUMENTS) {
  const list = monumentsByRawRegion.get(m.rawRegion) || [];
  list.push(m);
  monumentsByRawRegion.set(m.rawRegion, list);
}

const sortedRawRegions = Array.from(monumentsByRawRegion.keys()).sort((a, b) => {
  const idxA = PREFERRED_REGION_ORDER.indexOf(a);
  const idxB = PREFERRED_REGION_ORDER.indexOf(b);
  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
  if (idxA !== -1) return -1;
  if (idxB !== -1) return 1;
  return a.localeCompare(b);
});

export interface AvailableRegionSummary {
  rawRegion: Sestiere;
  displayName: string;
  classification: 'Sestiere' | 'Island';
  count: number;
  statuesCount: number;
  reliefsCount: number;
  monumentsCount: number;
  center: { lat: number; lng: number };
}

export const AVAILABLE_REGIONS: AvailableRegionSummary[] = sortedRawRegions.map((rawReg) => {
  const list = monumentsByRawRegion.get(rawReg) || [];
  const latAvg = list.reduce((s, m) => s + m.coordinates.lat, 0) / Math.max(1, list.length);
  const lngAvg = list.reduce((s, m) => s + m.coordinates.lng, 0) / Math.max(1, list.length);
  return {
    rawRegion: rawReg as Sestiere,
    displayName: getRegionDisplayName(rawReg),
    classification: getRegionClassification(rawReg),
    count: list.length,
    statuesCount: list.filter((m) => m.category === 'Statues').length,
    reliefsCount: list.filter((m) => m.category === 'Reliefs').length,
    monumentsCount: list.filter((m) => m.category === 'Monuments').length,
    center: {
      lat: Number(latAvg.toFixed(5)),
      lng: Number(lngAvg.toFixed(5)),
    },
  };
});

function formatBreakdownTag(list: Monument[]): string {
  const statues = list.filter((m) => m.category === 'Statues').length;
  const reliefs = list.filter((m) => m.category === 'Reliefs').length;
  const monuments = list.filter((m) => m.category === 'Monuments').length;
  const parts: string[] = [];
  if (statues > 0) parts.push(`${statues} ${statues === 1 ? 'Statue' : 'Statues'}`);
  if (reliefs > 0) parts.push(`${reliefs} ${reliefs === 1 ? 'Relief' : 'Reliefs'}`);
  if (monuments > 0) parts.push(`${monuments} ${monuments === 1 ? 'Monument' : 'Monuments'}`);
  return parts.join(' • ') || `${list.length} Works`;
}

export const REGIONAL_COLLECTIONS: RegionalCollection[] = AVAILABLE_REGIONS.map((reg) => {
  const artworks = monumentsByRawRegion.get(reg.rawRegion) || [];
  const breakdown = formatBreakdownTag(artworks);
  const coverMonument =
    artworks.find((m) => m.hasAccessibleImage) || artworks[0];
  const rawNoteSuffix =
    reg.rawRegion !== reg.displayName ? ` (Survey123 region: ${reg.rawRegion})` : '';

  return {
    id: getRegionCollectionId(reg.rawRegion),
    region: reg.rawRegion,
    regionDisplay: reg.displayName,
    rawRegion: reg.rawRegion,
    classification: reg.classification,
    title: `${reg.displayName} Collection`,
    subtitle: `${reg.displayName} ${reg.classification} • Survey123`,
    description: `ArcGIS Survey123 collection documenting ${artworks.length} public artworks (${breakdown}) georeferenced across ${reg.displayName}, Venice${rawNoteSuffix}.`,
    imageUrl: coverMonument?.imageUrl || '',
    tags: [
      reg.rawRegion === reg.displayName ? reg.displayName : `${reg.displayName} (${reg.rawRegion})`,
      breakdown,
    ],
    artworks,
  };
});

export interface MapRegionViewport {
  id: string;
  name: string;
  coords: { lat: number; lng: number };
  zoom: number;
  rawRegion: Sestiere | 'All';
}

export const REGION_MAP_VIEWPORTS: MapRegionViewport[] = [
  {
    id: 'all-venice',
    name: `All Venice (${MONUMENTS.length})`,
    coords: { lat: 45.4371, lng: 12.3326 },
    zoom: 14,
    rawRegion: 'All',
  },
  ...AVAILABLE_REGIONS.map((reg) => ({
    id: getRegionCollectionId(reg.rawRegion),
    name: `${reg.displayName} (${reg.count})`,
    coords: reg.center,
    zoom: reg.count >= 50 ? 16 : 16,
    rawRegion: reg.rawRegion,
  })),
];

export const DATASET_STATS = {
  totalArtworks: MONUMENTS.length,
  regionsCount: AVAILABLE_REGIONS.length,
  statuesCount: MONUMENTS.filter((m) => m.category === 'Statues').length,
  reliefsCount: MONUMENTS.filter((m) => m.category === 'Reliefs').length,
  monumentsCount: MONUMENTS.filter((m) => m.category === 'Monuments').length,
  withNotesCount: MONUMENTS.filter((m) => Boolean(m.generalNotes)).length,
  multiPhotoCount: MONUMENTS.filter((m) => m.galleryImages.length > 1).length,
  with3DModelCount: MONUMENTS.filter((m) => m.has3DModel).length,
  manifestAttachmentsCount: RAW_IMAGE_MANIFEST.length,
  accessibleArchiveImagesCount: Object.keys(EXISTING_ARCHIVE_IMAGE_URL_MAP).length,
};

// Bounding box for Venice Lagoon radar projection
const LATS = MONUMENTS.map((m) => m.coordinates.lat);
const LNGS = MONUMENTS.map((m) => m.coordinates.lng);
const MIN_LAT = Math.min(...LATS);
const MAX_LAT = Math.max(...LATS);
const MIN_LNG = Math.min(...LNGS);
const MAX_LNG = Math.max(...LNGS);

function toRadarNode(monument: Monument, idSuffix: string): GISNode {
  const xPercent =
    10 + ((monument.coordinates.lng - MIN_LNG) / Math.max(MAX_LNG - MIN_LNG, 0.0001)) * 80;
  const yPercent =
    14 + ((MAX_LAT - monument.coordinates.lat) / Math.max(MAX_LAT - MIN_LAT, 0.0001)) * 70;
  return {
    id: idSuffix,
    label: monument.title,
    xPercent: Number(xPercent.toFixed(1)),
    yPercent: Number(yPercent.toFixed(1)),
    status: monument.generalNotes ? 'surveying' : 'active',
    distanceMeters: Math.round((monument.distanceKm || 0.2) * 1000),
    monumentRefId: monument.id,
  };
}

// Representative spatially distributed radar nodes anchored across available Venice regions
export const RADAR_NODES: GISNode[] = AVAILABLE_REGIONS.slice(0, 8)
  .map((reg) => MONUMENTS.find((m) => m.rawRegion === reg.rawRegion))
  .filter((m): m is Monument => Boolean(m))
  .map((m) => toRadarNode(m, `radar-${m.surveyCode}`));

const monumentsById = new Map<string, Monument>(MONUMENTS.map((m) => [m.id, m]));

// All imported Lens recognition test cases across Venice regions
export const LENS_TEST_CASES: LensTestCase[] = RAW_LENS_TEST_CASES.map((tc, idx) => {
  const monument = monumentsById.get(tc.expectedArtworkId);
  const region = (monument?.sestiere || 'Dorsoduro') as Sestiere;
  const regionDisplay = monument?.regionDisplay || getRegionDisplayName(region);
  const cat: MonumentCategory = monument?.category || 'Reliefs';
  return {
    id: `test-${String(idx + 1).padStart(3, '0')}`,
    label: monument ? monument.title : `Artwork #${String(idx + 1).padStart(3, '0')}`,
    testImage: tc.testImage,
    imageUrl: resolveDatasetImageUrl(tc.testImage),
    hasAccessibleImage: hasAccessibleArchiveImage(tc.testImage),
    expectedArtworkId: tc.expectedArtworkId,
    category: cat,
    region,
    regionDisplay,
    latitude: tc.latitude,
    longitude: tc.longitude,
    generalNotes: monument?.generalNotes || null,
  };
});
