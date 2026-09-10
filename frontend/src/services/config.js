export const PMTILES_URLS = {
  districts: import.meta.env.VITE_PMTILES_URLS_DISTRICTS || '/tiles/districts.pmtiles',
  regions: import.meta.env.VITE_PMTILES_URLS_REGIONS || '/tiles/regions.pmtiles',
  depts: import.meta.env.VITE_PMTILES_URLS_DEPTS || '/tiles/depts.pmtiles',
  communes: import.meta.env.VITE_PMTILES_URLS_COMMUNES || '/tiles/communes.pmtiles',
};

// URLs GeoJSON directes (alternative aux PMTiles)
export const GEOJSON_URLS = {
  districts: import.meta.env.VITE_GEOJSON_URLS_DISTRICTS || '',
  regions: import.meta.env.VITE_GEOJSON_URLS_REGIONS || '',
  depts: import.meta.env.VITE_GEOJSON_URLS_DEPTS || '',
  communes: import.meta.env.VITE_GEOJSON_URLS_COMMUNES || '',
};

export const COUNTRY_CENTER = { lng: -5.5, zoom: 6.3 };
