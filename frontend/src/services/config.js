export const PMTILES_URLS = {
  districts: import.meta.env.VITE_PMTILES_URLS_DISTRICTS || '/tiles/districts.pmtiles',
  regions: import.meta.env.VITE_PMTILES_URLS_REGIONS || '/tiles/regions.pmtiles',
  depts: import.meta.env.VITE_PMTILES_URLS_DEPTS || '/tiles/depts.pmtiles',
  communes: import.meta.env.VITE_PMTILES_URLS_COMMUNES || '/tiles/communes.pmtiles',
};

export const COUNTRY_CENTER = {
  lng: -5.5,
  zoom: 6.3,
  minZoom: 5,
  maxZoom: 12,
};

export const NAVIGATION_LEVELS = {
  country: { zoom: 6.3, minZoom: 5, maxZoom: 7.5 },
  district: { zoom: 8, minZoom: 7, maxZoom: 9 },
  region: { zoom: 9, minZoom: 8, maxZoom: 10 },
  dept: { zoom: 10.5, minZoom: 9.5, maxZoom: 11.5 },
  commune: { zoom: 12, minZoom: 11, maxZoom: 13 },
  school: { zoom: 14, minZoom: 12, maxZoom: 18 },
};

export const SCHOOL_SIZES = {
  small: { min: 1, max: 4, pixel: 8 },
  medium: { min: 5, max: 14, pixel: 12 },
  large: { min: 15, max: Infinity, pixel: 18 },
};
