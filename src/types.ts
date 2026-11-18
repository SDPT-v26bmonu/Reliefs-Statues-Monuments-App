export type Sestiere =
  | 'Dorsoduro'
  | 'San Marco'
  | 'Cannaregio'
  | 'Castello'
  | 'San Polo'
  | 'Santa Croce'
  | 'Guidecca'
  | 'Giudecca'
  | 'Murano'
  | 'Burano'
  | 'Torcello'
  | 'Mazzorbo'
  | 'Lido';

export type MonumentCategory =
  | 'Statues'
  | 'Monuments'
  | 'Reliefs'
  | 'Surveys';

export type Era = 'Byzantine' | 'Gothic' | 'Renaissance' | 'Baroque' | 'Modern';

export type Material =
  | 'Bronze'
  | 'Istrian Stone'
  | 'Carrara Marble'
  | 'Red Verona Marble'
  | 'Polychrome Stone';

export type AcquaAltaRisk = 'Critical' | 'High' | 'Moderate' | 'Safe';

export interface Monument {
  id: string;
  arcgisGlobalId: string;
  surveyCode: string; // e.g. "artwork_001"
  title: string;
  artist: string | null;
  year: string | null;
  era?: Era | null;
  category: MonumentCategory;
  rawCategory?: string;
  sestiere: Sestiere;
  rawRegion: string;
  regionDisplay: string;
  locationName: string;
  coordinates: {
    lat: number;
    lng: number;
    formatted: string;
  };
  distanceKm?: number;
  material?: Material | null;
  description: string;
  generalNotes: string | null;
  historicalContext?: string | null;
  imageUrl: string;
  galleryImages: string[];
  originalFilenames: string[];
  hasAccessibleImage: boolean;
  acquaAltaRisk?: AcquaAltaRisk | null;
  elevationMeters?: number | null;
  has3DModel: boolean;
  modelCapturedRaw: string; // e.g. "No", "Yes", or "Not recorded"
  modelPolyCount?: string;
  creationDate: string;
  creator: string;
  editDate: string;
  editor: string;
  conditionReport: {
    stoneErosionLevel?: 'Mild' | 'Moderate' | 'Severe';
    saltCrustExposure?: boolean;
    lastRestorationYear?: number;
    gisCatalogId: string;
  };
  isFeatured?: boolean;
}

export interface RegionalCollection {
  id: string;
  region: Sestiere;
  regionDisplay: string;
  rawRegion: string;
  classification: 'Sestiere' | 'Island';
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  tags: string[];
  artworks: Monument[];
}

export interface RouteStop {
  monumentId: string;
  order: number;
  walkingTimeMinutes: number;
  walkingDistanceMeters: number;
  highlightNote: string;
  bridgesToCross: number;
}

export interface CuratedTrail {
  id: string;
  number: string; // e.g. "TRAIL 01"
  title: string;
  description: string;
  distanceKm: number;
  estimatedMinutes: number;
  stopsCount: number;
  rating?: number;
  reviewsCount?: number;
  imageUrl: string;
  featuredBadge?: string;
  tags: string[];
  stops: RouteStop[];
  sestieriCovered: Sestiere[];
  vaporettoAccessStop: string;
  streetNavigationPath?: { lat: number; lng: number }[];
}

export interface GISNode {
  id: string;
  label: string;
  xPercent: number; // position on radar/map
  yPercent: number;
  status: 'active' | 'surveying' | 'vulnerable';
  distanceMeters: number;
  monumentRefId?: string;
}

export interface LensTestCase {
  id: string;
  label: string;
  testImage: string; // logical path e.g. "images/artwork_001_01.jpg"
  imageUrl: string; // resolved URL (existing /assets/aistudio/... or /images/artwork_XXX_YY.jpg)
  hasAccessibleImage: boolean;
  expectedArtworkId: string;
  category: MonumentCategory;
  region: Sestiere;
  regionDisplay: string;
  latitude: number;
  longitude: number;
  generalNotes: string | null;
}

export type ActiveTab = 'explore' | 'collection' | 'lens' | 'routes' | 'support' | 'settings';
