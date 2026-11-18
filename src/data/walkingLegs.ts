// Pre-calibrated Google Maps walking legs cache.
// Emptied for the Dorsoduro Survey123 dataset so pedestrian paths are dynamically
// computed along actual Dorsoduro streets and bridges via Route.computeRoutes().

export interface LatLng {
  lat: number;
  lng: number;
}

export const AUTHENTIC_GOOGLE_WALKING_LEGS: Record<string, LatLng[][]> = {};
