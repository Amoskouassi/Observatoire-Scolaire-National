export const GEOJSON_URLS = {
  districts: import.meta.env.VITE_GEOJSON_URLS_DISTRICTS || '/districts.geojson',
  regions: import.meta.env.VITE_GEOJSON_URLS_REGIONS || '/regions.geojson',
  depts: import.meta.env.VITE_GEOJSON_URLS_DEPTS || '/depts.geojson',
};

export const PMTILES_URLS = {
  districts: import.meta.env.VITE_PMTILES_URLS_DISTRICTS || '',
  regions: import.meta.env.VITE_PMTILES_URLS_REGIONS || '',
  depts: import.meta.env.VITE_PMTILES_URLS_DEPTS || '',
  communes: import.meta.env.VITE_PMTILES_URLS_COMMUNES || '',
};

export const COUNTRY_CENTER = { lng: -5.5, zoom: 6.3 };
