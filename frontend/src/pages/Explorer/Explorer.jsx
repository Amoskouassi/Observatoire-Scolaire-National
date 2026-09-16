import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../../stores/mapStore';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { addCustomIcons, getIconForSchool } from '../../utils/schoolIcons';

const COLORS = {
  collected: '#E8611A',
  waiting: '#00796B',
  pending: '#CBD5E1',
};

const STATUS_LABEL = {
  collected: 'Collecte',
  waiting: 'En attente',
  pending: 'Non programmé',
};

const GEOJSON_PATHS = {
  districts: '/districts.geojson',
  regions: '/regions.geojson',
  depts: '/depts.geojson',
  sp: '/sous_prefectures.geojson',
};

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > point[1]) !== (yj > point[1])) && (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(point, coords) {
  if (coords[0][0] === coords[0][coords[0].length - 1]) {
    if (!pointInRing(point, coords[0])) return false;
    for (let i = 1; i < coords.length; i++) {
      if (pointInRing(point, coords[i])) return false;
    }
    return true;
  }
  for (let i = 0; i < coords.length; i++) {
    if (pointInRing(point, coords[i])) return !i;
  }
  return false;
}

function distToSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function polylabel(coords, precision) {
  precision = precision || 0.001;
  let bestDist = -1, bestPoint = null;

  const flat = coords[0];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of flat) {
    if (c[0] < minX) minX = c[0];
    if (c[0] > maxX) maxX = c[0];
    if (c[1] < minY) minY = c[1];
    if (c[1] > maxY) maxY = c[1];
  }

  let width = maxX - minX;
  let height = maxY - minY;
  let cellSize = Math.min(width, height);
  let half = cellSize / 2;

  function maxDist(px, py) {
    let minD = Infinity;
    for (let i = 0, j = flat.length - 1; i < flat.length; j = i++) {
      const d = distToSegment([px, py], flat[i], flat[j]);
      if (d < minD) minD = d;
      if (minD < bestDist) return minD;
    }
    return minD;
  }

  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      const cx = x + half, cy = y + half;
      if (pointInPolygon([cx, cy], coords)) {
        const d = maxDist(cx, cy);
        if (d > bestDist) { bestDist = d; bestPoint = [cx, cy]; }
      }
      const nx = x + cellSize / 2, ny = y + cellSize / 2;
      if (pointInPolygon([nx, ny], coords)) {
        const d = maxDist(nx, ny);
        if (d > bestDist) { bestDist = d; bestPoint = [nx, ny]; }
      }
    }
  }

  if (!bestPoint) {
    bestPoint = [(minX + maxX) / 2, (minY + maxY) / 2];
  }

  if (cellSize > precision) {
    cellSize /= 2;
    half = cellSize / 2;
    const px = bestPoint[0] - half, py = bestPoint[1] - half;
    for (let x = px; x < px + cellSize; x += cellSize / 2) {
      for (let y = py; y < py + cellSize; y += cellSize / 2) {
        if (pointInPolygon([x, y], coords)) {
          const d = maxDist(x, y);
          if (d > bestDist) { bestDist = d; bestPoint = [x, y]; }
        }
      }
    }
  }

  return bestPoint;
}

function getCentroid(geometry) {
  if (!geometry) return null;
  try {
    if (geometry.type === 'Polygon') {
      return polylabel(geometry.coordinates, 0.0005);
    } else if (geometry.type === 'MultiPolygon') {
      let maxArea = 0, best = null;
      for (const poly of geometry.coordinates) {
        const ring = poly[0];
        let area = 0;
        for (let i = 0; i < ring.length - 1; i++) {
          area += Math.abs(ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]);
        }
        if (area > maxArea) {
          maxArea = area;
          const c = polylabel(poly, 0.0005);
          if (c) best = c;
        }
      }
      return best;
    }
  } catch (e) {
    const coords = geometry.type === 'Polygon' ? geometry.coordinates[0]
      : geometry.type === 'MultiPolygon' ? geometry.coordinates[0][0] : [];
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const c of coords) {
      if (c[0] < minLng) minLng = c[0]; if (c[0] > maxLng) maxLng = c[0];
      if (c[1] < minLat) minLat = c[1]; if (c[1] > maxLat) maxLat = c[1];
    }
    return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
  }
  return null;
}

function createLabelEl(name) {
  const el = document.createElement('div');
  el.textContent = name;
  el.style.cssText = `
    background: white;
    color: #0D1B2A;
    padding: 3px 10px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 700;
    font-family: Inter, system-ui, -apple-system, sans-serif;
    letter-spacing: -0.02em;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 1px 4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05);
    line-height: 1.4;
    text-align: center;
  `;
  return el;
}

function getBBox(geometry) {
  if (!geometry) return null;
  const coords = geometry.type === 'Polygon' ? geometry.coordinates
    : geometry.type === 'MultiPolygon' ? geometry.coordinates.flat()
    : [];
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const ring of coords) {
    for (const c of ring) {
      if (c[0] < minLng) minLng = c[0];
      if (c[0] > maxLng) maxLng = c[0];
      if (c[1] < minLat) minLat = c[1];
      if (c[1] > maxLat) maxLat = c[1];
    }
  }
  if (!isFinite(minLng)) return null;
  return [[minLng, minLat], [maxLng, maxLat]];
}

function fitBBox(map, geometry, pad) {
  const bbox = getBBox(geometry);
  if (!bbox) return;
  const p = pad || 0.15;
  const dLng = (bbox[1][0] - bbox[0][0]) * p;
  const dLat = (bbox[1][1] - bbox[0][1]) * p;
  const minLng = Math.max(bbox[0][0] - dLng, -9.5);
  const minLat = Math.max(bbox[0][1] - dLat, 3);
  const maxLng = Math.min(bbox[1][0] + dLng, -1.5);
  const maxLat = Math.min(bbox[1][1] + dLat, 12);
  if (maxLng - minLng < 0.001 || maxLat - minLat < 0.001) {
    try { map.flyTo({ center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2], zoom: 10, duration: 700 }); } catch (e) {}
    return;
  }
  try {
    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 700, maxZoom: 12 });
  } catch (e) {}
}

export default function Explorer() {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const [loading, setLoading] = useState(true);
  const { level: urlLevel, code: urlCode } = useParams();
  const [searchParams] = useSearchParams();
  const { filters, setFilter, resetFilters, advancedFiltersOpen, toggleAdvancedFilters, schoolsData, setSchoolsData } = useMapStore();
  const { role, user } = useAuthStore();
  const [selected, setSelected] = useState(null);
  const [currentLevel, setCurrentLevel] = useState('district');
  const [zones, setZones] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState({ district: null, region: null, dept: null });
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [zoneCounts, setZoneCounts] = useState(null);

  const selDistRef = useRef(null);
  const selRegRef = useRef(null);
  const selDeptRef = useRef(null);
  const currentLevelRef = useRef('district');
  const geoDataRef = useRef({ districts: null, regions: null, depts: null, sp: null });
  const labelsRef = useRef({ districts: [], regions: [], depts: [], sp: [] });
  const showPointsFromDashboard = useRef(false);
  const zoomingBackRef = useRef(false);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    const filterParam = searchParams.get('filter');
    const showPoints = searchParams.get('show_points');
    const milieuParam = searchParams.get('milieu');
    const niveauParam = searchParams.get('niveau');
    const statutParam = searchParams.get('statut');
    const focusLat = searchParams.get('lat');
    const focusLng = searchParams.get('lng');
    const focusSchoolId = searchParams.get('school_id');
    const hasDashboardParams = showPoints === '1' || statusParam || filterParam || milieuParam || niveauParam || statutParam || focusLat || focusLng;
    if (showPoints === '1' || focusLat) showPointsFromDashboard.current = true;
    else showPointsFromDashboard.current = false;
    if (hasDashboardParams) resetFilters();
    if (statusParam) setFilter('collect_status', [statusParam]);
    if (milieuParam) setFilter('milieu', [milieuParam]);
    if (niveauParam) setFilter('niveau', [niveauParam]);
    if (statutParam) setFilter('statut', [statutParam]);
    if (filterParam === 'sans_eau') setFilter('sans_eau', true);
    if (filterParam === 'sans_toilettes') setFilter('sans_toilettes', true);
    if (filterParam === 'sans_electricite') setFilter('sans_electricite', true);
    if (filterParam === 'manque_bancs') setFilter('manque_bancs', true);
    if (filterParam === 'materiaux_precaires') setFilter('materiaux_precaires', true);
    if (filterParam === 'manque_enseignants') setFilter('manque_enseignants', true);
    if (filterParam === 'critical') {
      setFilter('sans_eau', true);
      setFilter('sans_toilettes', true);
      setFilter('sans_electricite', true);
    }
  }, [urlLevel, urlCode, searchParams.toString()]);
  const drillingRef = useRef(false);
  const syncViewRef = useRef(null);
  const zoneSchoolStatsRef = useRef({});

  useEffect(() => {
    api.getZoneCounts().then(d => setZoneCounts(d)).catch(() => {});
  }, []);

  const showZoneDetail = useCallback((level, props) => {
    const zs = zoneSchoolStatsRef.current[props.code] || {};
    setSelected({
      name: props.name,
      code: props.code,
      level,
      status: props.status,
      schools: zs.schools || 0,
      students: zs.students || 0,
      girls: zs.girls || 0,
      boys: zs.boys || 0,
    });
  }, []);

  const drillDown = useCallback((level, name) => {
    try {
    const map = mapInst.current;
    if (!map) return;
    const data = geoDataRef.current;
    const setVis = (ls, v) => ls.forEach(l => { if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', v); });

    let nextLevel = null;
    let nextZones = [];

    if (level === 'district') {
      selDistRef.current = name;
      selRegRef.current = null;
      selDeptRef.current = null;
      setBreadcrumb({ district: name, region: null, dept: null });

      if (data.regions?.features) {
        const filtered = { type: 'FeatureCollection', features: data.regions.features.filter(f => f.properties.district === name) };
        map.getSource('regions')?.setData(filtered);
        nextZones = filtered.features.map(f => f.properties);
      }
      if (data.depts?.features) map.getSource('depts')?.setData(data.depts);
      if (data.sp?.features) map.getSource('sp')?.setData(data.sp);

      setVis(['districts-fill', 'districts-outline'], 'visible');
      setVis(['regions-fill', 'regions-outline'], 'visible');
      setVis(['depts-fill', 'depts-outline'], 'none');
      setVis(['sp-fill', 'sp-outline'], 'none');
      setVis(['ecoles-points'], showPointsFromDashboard.current ? 'visible' : 'none');
      setVis(['clusters-layer'], showPointsFromDashboard.current ? 'none' : 'visible');

      nextLevel = 'region';

    } else if (level === 'region') {
      const regionFeat = data.regions?.features?.find(f => f.properties.name === name);
      selDistRef.current = regionFeat?.properties?.district || selDistRef.current;
      selRegRef.current = name;
      selDeptRef.current = null;
      setBreadcrumb(prev => ({ ...prev, region: name, dept: null }));

      if (data.depts?.features) {
        const filtered = { type: 'FeatureCollection', features: data.depts.features.filter(f => f.properties.region === name) };
        map.getSource('depts')?.setData(filtered);
        nextZones = filtered.features.map(f => f.properties);
      }
      if (data.sp?.features) map.getSource('sp')?.setData(data.sp);

      setVis(['regions-fill'], 'none');
      setVis(['regions-outline'], 'visible');
      setVis(['depts-fill', 'depts-outline'], 'visible');
      setVis(['sp-fill', 'sp-outline'], 'none');
      setVis(['ecoles-points'], showPointsFromDashboard.current ? 'visible' : 'none');
      setVis(['clusters-layer'], showPointsFromDashboard.current ? 'none' : 'visible');
      nextLevel = 'departement';

    } else if (level === 'departement') {
      const deptFeat = data.depts?.features?.find(f => f.properties.name === name);
      selRegRef.current = deptFeat?.properties?.region || selRegRef.current;
      selDeptRef.current = name;
      setBreadcrumb(prev => ({ ...prev, dept: name }));

      if (data.sp?.features) {
        const filtered = { type: 'FeatureCollection', features: data.sp.features.filter(f => f.properties.departement === name) };
        map.getSource('sp')?.setData(filtered);
        nextZones = filtered.features.map(f => f.properties);
      }

      setVis(['depts-fill'], 'none');
      setVis(['depts-outline'], 'visible');
      setVis(['sp-fill', 'sp-outline'], 'visible');
      setVis(['ecoles-points'], showPointsFromDashboard.current ? 'visible' : 'none');
      setVis(['clusters-layer'], showPointsFromDashboard.current ? 'none' : 'visible');
      nextLevel = 'sous-prefecture';
    } else if (level === 'sous-prefecture') {
      const spFeat = data.sp?.features?.find(f => f.properties.name === name);
      if (spFeat) {
        map.getSource('sp')?.setData({ type: 'FeatureCollection', features: [spFeat] });
        if (spFeat.geometry) {
          drillingRef.current = true;
          fitBBox(map, spFeat.geometry, 0.05);
          setTimeout(() => { drillingRef.current = false; }, 900);
        }
      }
      setZones([]);
      setCurrentLevel('sous-prefecture');
      currentLevelRef.current = 'sous-prefecture';
      setVis(['ecoles-points'], 'visible');
      setVis(['clusters-layer'], 'none');
      showZoneDetail('sous-prefecture', spFeat?.properties || { name });
      return;
    } else {
      return;
    }

    setSelected(null);
    setZones(nextZones);
    setCurrentLevel(nextLevel);
    currentLevelRef.current = nextLevel;

    syncViewRef.current?.();

    const parentData = level === 'district' ? data.districts : level === 'region' ? data.regions : data.depts;
    const feat = parentData?.features?.find(f => f.properties?.name === name);
    if (feat?.geometry) {
      drillingRef.current = true;
      fitBBox(map, feat.geometry, 0.15);
      setTimeout(() => { drillingRef.current = false; }, 800);
    }
    } catch (e) { console.error('drillDown error:', e); }
  }, []);

  const navigateToBreadcrumb = useCallback((targetLevel) => {
    try {
    const map = mapInst.current;
    if (!map) return;
    const data = geoDataRef.current;
    const setVis = (ls, v) => ls.forEach(l => { if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', v); });

    setSelected(null);
    setSelectedSchool(null);

    if (targetLevel === 'district') {
      selDistRef.current = null;
      selRegRef.current = null;
      selDeptRef.current = null;
      setBreadcrumb({ district: null, region: null, dept: null });
      if (data.districts?.features) {
        map.getSource('districts')?.setData(data.districts);
        setZones(data.districts.features.map(f => f.properties));
      }
      if (data.regions?.features) map.getSource('regions')?.setData(data.regions);
      if (data.depts?.features) map.getSource('depts')?.setData(data.depts);
      if (data.sp?.features) map.getSource('sp')?.setData(data.sp);
      setVis(['districts-fill', 'districts-outline'], 'visible');
      setVis(['regions-fill', 'regions-outline'], 'none');
      setVis(['depts-fill', 'depts-outline'], 'none');
      setVis(['sp-fill', 'sp-outline'], 'none');
      setVis(['ecoles-points'], 'none');
      setVis(['clusters-layer'], 'visible');
      drillingRef.current = true;
      map.flyTo({ center: [-5.5, 7.0], zoom: 5.5, duration: 800 });
      setCurrentLevel('district');
      currentLevelRef.current = 'district';
      setTimeout(() => { drillingRef.current = false; }, 900);

    } else if (targetLevel === 'region') {
      const districtName = breadcrumb.district;
      if (!districtName) return;
      selDistRef.current = districtName;
      selRegRef.current = null;
      selDeptRef.current = null;
      setBreadcrumb({ district: districtName, region: null, dept: null });
      if (data.regions?.features) {
        const filtered = { type: 'FeatureCollection', features: data.regions.features.filter(f => f.properties.district === districtName) };
        map.getSource('regions')?.setData(filtered);
        setZones(filtered.features.map(f => f.properties));
      }
      if (data.depts?.features) map.getSource('depts')?.setData(data.depts);
      if (data.sp?.features) map.getSource('sp')?.setData(data.sp);
      setVis(['districts-fill', 'districts-outline'], 'visible');
      setVis(['regions-fill', 'regions-outline'], 'visible');
      setVis(['depts-fill', 'depts-outline'], 'none');
      setVis(['sp-fill', 'sp-outline'], 'none');
      setVis(['ecoles-points'], 'none');
      setVis(['clusters-layer'], 'visible');
      const distFeat = data.districts?.features?.find(f => f.properties.name === districtName);
      if (distFeat?.geometry) {
        drillingRef.current = true;
        fitBBox(map, distFeat.geometry, 0.15);
        setTimeout(() => { drillingRef.current = false; }, 800);
      }
      setCurrentLevel('region');
      currentLevelRef.current = 'region';

    } else if (targetLevel === 'departement') {
      const regionName = breadcrumb.region;
      if (!regionName) return;
      const regionFeat = data.regions?.features?.find(f => f.properties.name === regionName);
      selDistRef.current = regionFeat?.properties?.district || selDistRef.current;
      selRegRef.current = regionName;
      selDeptRef.current = null;
      setBreadcrumb(prev => ({ ...prev, region: regionName, dept: null }));
      if (data.depts?.features) {
        const filtered = { type: 'FeatureCollection', features: data.depts.features.filter(f => f.properties.region === regionName) };
        map.getSource('depts')?.setData(filtered);
        setZones(filtered.features.map(f => f.properties));
      }
      if (data.sp?.features) map.getSource('sp')?.setData(data.sp);
      setVis(['regions-fill'], 'none');
      setVis(['regions-outline'], 'visible');
      setVis(['depts-fill', 'depts-outline'], 'visible');
      setVis(['sp-fill', 'sp-outline'], 'none');
      setVis(['ecoles-points'], 'none');
      setVis(['clusters-layer'], 'visible');
      if (regionFeat?.geometry) {
        drillingRef.current = true;
        fitBBox(map, regionFeat.geometry, 0.15);
        setTimeout(() => { drillingRef.current = false; }, 800);
      }
      setCurrentLevel('departement');
      currentLevelRef.current = 'departement';
    }

    syncViewRef.current?.();
    } catch (e) { console.error('navigateToBreadcrumb error:', e); }
  }, [breadcrumb]);

  const handleBack = useCallback(() => {
    try {
    setSelected(null);
    setSelectedSchool(null);
    const map = mapInst.current;
    if (!map) return;
    const data = geoDataRef.current;
    const setVis = (ls, v) => ls.forEach(l => { if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', v); });

    if (currentLevelRef.current === 'sous-prefecture') {
      if (data.sp?.features) map.getSource('sp')?.setData(data.sp);
      const parentRegion = selRegRef.current;
      if (parentRegion && data.depts?.features) {
        const filtered = { type: 'FeatureCollection', features: data.depts.features.filter(f => f.properties.region === parentRegion) };
        map.getSource('depts')?.setData(filtered);
        setZones(filtered.features.map(f => f.properties));
      }
      selDeptRef.current = null;
      setBreadcrumb(prev => ({ ...prev, dept: null }));
      setVis(['depts-fill', 'depts-outline'], 'visible');
      setVis(['sp-fill', 'sp-outline'], 'none');
      setVis(['ecoles-points'], showPointsFromDashboard.current ? 'visible' : 'none');
      setVis(['clusters-layer'], showPointsFromDashboard.current ? 'none' : 'visible');
      setCurrentLevel('departement');
      currentLevelRef.current = 'departement';

    } else if (currentLevelRef.current === 'departement') {
      const parentDistrict = selDistRef.current;
      if (parentDistrict && data.regions?.features) {
        const filtered = { type: 'FeatureCollection', features: data.regions.features.filter(f => f.properties.district === parentDistrict) };
        map.getSource('regions')?.setData(filtered);
        setZones(filtered.features.map(f => f.properties));
      }
      selRegRef.current = null;
      setBreadcrumb(prev => ({ ...prev, region: null, dept: null }));
      setVis(['regions-fill', 'regions-outline'], 'visible');
      setVis(['depts-fill', 'depts-outline'], 'none');
      setVis(['ecoles-points'], showPointsFromDashboard.current ? 'visible' : 'none');
      setVis(['clusters-layer'], showPointsFromDashboard.current ? 'none' : 'visible');
      setCurrentLevel('region');
      currentLevelRef.current = 'region';

    } else if (currentLevelRef.current === 'region') {
      selDistRef.current = null;
      setBreadcrumb({ district: null, region: null, dept: null });
      if (data.districts?.features) {
        map.getSource('districts')?.setData(data.districts);
        setZones(data.districts.features.map(f => f.properties));
      }
      if (data.regions?.features) map.getSource('regions')?.setData(data.regions);
      if (data.depts?.features) map.getSource('depts')?.setData(data.depts);
      if (data.sp?.features) map.getSource('sp')?.setData(data.sp);
      setVis(['districts-fill', 'districts-outline'], 'visible');
      setVis(['regions-fill', 'regions-outline'], 'none');
      setVis(['depts-fill', 'depts-outline'], 'none');
      setVis(['sp-fill', 'sp-outline'], 'none');
      setVis(['ecoles-points'], 'none');
      setVis(['clusters-layer'], 'visible');
      drillingRef.current = true;
      map.flyTo({ center: [-5.5, 7.0], zoom: 5.5, duration: 800 });
      setCurrentLevel('district');
      currentLevelRef.current = 'district';
      setTimeout(() => { drillingRef.current = false; }, 900);
    }

    syncViewRef.current?.();
    } catch (e) { console.error('handleBack error:', e); }
  }, []);

  useEffect(() => {
    if (mapInst.current) return;
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxzoom: 19,
          },
        },
        layers: [{
          id: 'osm',
          type: 'raster',
          source: 'osm',
          paint: { 'raster-opacity': 0.85 },
        }],
      },
      center: [-5.5, 7.0],
      zoom: 5.5,
      minZoom: 5,
      maxZoom: 18,
      attributionControl: false,
      maxBounds: [[-9.5, 3], [-1.5, 12]],
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    addCustomIcons(map);

    const setVis = (ls, v) => ls.forEach(l => { if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', v); });

    const syncLabels = () => {
      const labels = labelsRef.current;
      const hideAll = (arr) => arr.forEach(l => l.marker.getElement().style.display = 'none');
      hideAll(labels.districts);
      hideAll(labels.regions);
      hideAll(labels.depts);
      hideAll(labels.sp);

      const level = currentLevelRef.current;

      if (level === 'district') {
        labels.districts.forEach(l => { l.marker.getElement().style.display = ''; });
      } else if (level === 'region') {
        labels.regions.forEach(l => {
          l.marker.getElement().style.display = (l.parentKey === selDistRef.current) ? '' : 'none';
        });
      } else if (level === 'departement') {
        labels.depts.forEach(l => {
          l.marker.getElement().style.display = (l.parentKey === selRegRef.current) ? '' : 'none';
        });
      } else if (level === 'sous-prefecture') {
        labels.sp.forEach(l => {
          l.marker.getElement().style.display = (l.parentKey === selDeptRef.current) ? '' : 'none';
        });
      }
    };

    const syncView = () => {
      syncLabels();
    };
    syncViewRef.current = syncView;

    map.on('load', async () => {
      const [districtsData, regionsData, deptsData, spData] = await Promise.all([
        fetch(GEOJSON_PATHS.districts).then(r => r.json()).catch(() => null),
        fetch(GEOJSON_PATHS.regions).then(r => r.json()).catch(() => null),
        fetch(GEOJSON_PATHS.depts).then(r => r.json()).catch(() => null),
        fetch(GEOJSON_PATHS.sp).then(r => r.json()).catch(() => null),
      ]);

      geoDataRef.current = { districts: districtsData, regions: regionsData, depts: deptsData, sp: spData };

      if (districtsData) {
        map.addSource('districts', { type: 'geojson', data: districtsData });
        map.addLayer({
          id: 'districts-fill', type: 'fill', source: 'districts',
          paint: {
            'fill-color': ['match', ['get', 'status'], 'collected', COLORS.collected, 'waiting', COLORS.waiting, COLORS.pending],
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.15, 0.06],
            'fill-opacity-transition': { duration: 200 },
          },
        });
        map.addLayer({
          id: 'districts-outline', type: 'line', source: 'districts',
          paint: {
            'line-color': ['match', ['get', 'status'], 'collected', COLORS.collected, 'waiting', COLORS.waiting, '#94A3B8'],
            'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2.5, 1.5],
            'line-opacity': 0.85,
          },
        });
        for (const f of districtsData.features) {
          const centroid = getCentroid(f.geometry);
          if (!centroid) continue;
          const el = createLabelEl(f.properties.name);
          const marker = new maplibregl.Marker({ element: el, offset: [0, 28] }).setLngLat(centroid).addTo(map);
          el.style.display = '';
          labelsRef.current.districts.push({ marker, parentKey: null });
        }
      }

      if (regionsData) {
        map.addSource('regions', { type: 'geojson', data: regionsData });
        map.addLayer({
          id: 'regions-fill', type: 'fill', source: 'regions',
          paint: {
            'fill-color': ['match', ['get', 'status'], 'collected', COLORS.collected, 'waiting', COLORS.waiting, COLORS.pending],
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.15, 0.06],
            'fill-opacity-transition': { duration: 200 },
          },
          layout: { visibility: 'none' },
        });
        map.addLayer({
          id: 'regions-outline', type: 'line', source: 'regions',
          paint: {
            'line-color': ['match', ['get', 'status'], 'collected', COLORS.collected, 'waiting', COLORS.waiting, '#94A3B8'],
            'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 1],
            'line-opacity': 0.8,
          },
          layout: { visibility: 'none' },
        });
        for (const f of regionsData.features) {
          const centroid = getCentroid(f.geometry);
          if (!centroid) continue;
          const el = createLabelEl(f.properties.name);
          const marker = new maplibregl.Marker({ element: el, offset: [0, 28] }).setLngLat(centroid).addTo(map);
          el.style.display = 'none';
          labelsRef.current.regions.push({ marker, parentKey: f.properties.district });
        }
      }

      if (deptsData) {
        map.addSource('depts', { type: 'geojson', data: deptsData });
        map.addLayer({
          id: 'depts-fill', type: 'fill', source: 'depts',
          paint: {
            'fill-color': ['match', ['get', 'status'], 'collected', COLORS.collected, 'waiting', COLORS.waiting, COLORS.pending],
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.15, 0.06],
            'fill-opacity-transition': { duration: 200 },
          },
          layout: { visibility: 'none' },
        });
        map.addLayer({
          id: 'depts-outline', type: 'line', source: 'depts',
          paint: {
            'line-color': ['match', ['get', 'status'], 'collected', COLORS.collected, 'waiting', COLORS.waiting, '#94A3B8'],
            'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 1],
            'line-opacity': 0.8,
          },
          layout: { visibility: 'none' },
        });
        for (const f of deptsData.features) {
          const centroid = getCentroid(f.geometry);
          if (!centroid) continue;
          const el = createLabelEl(f.properties.name);
          const marker = new maplibregl.Marker({ element: el, offset: [0, 28] }).setLngLat(centroid).addTo(map);
          el.style.display = 'none';
          labelsRef.current.depts.push({ marker, parentKey: f.properties.region });
        }
      }

      if (spData) {
        map.addSource('sp', { type: 'geojson', data: spData });
        map.addLayer({
          id: 'sp-fill', type: 'fill', source: 'sp',
          paint: {
            'fill-color': ['match', ['get', 'status'], 'collected', COLORS.collected, 'waiting', COLORS.waiting, COLORS.pending],
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.15, 0.06],
            'fill-opacity-transition': { duration: 200 },
          },
          layout: { visibility: 'none' },
        });
        map.addLayer({
          id: 'sp-outline', type: 'line', source: 'sp',
          paint: {
            'line-color': ['match', ['get', 'status'], 'collected', COLORS.collected, 'waiting', COLORS.waiting, '#CBD5E1'],
            'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 1.5, 0.8],
            'line-opacity': 0.75,
          },
          layout: { visibility: 'none' },
        });
        for (const f of spData.features) {
          const centroid = getCentroid(f.geometry);
          if (!centroid) continue;
          const el = createLabelEl(f.properties.name);
          const marker = new maplibregl.Marker({ element: el, offset: [0, 28] }).setLngLat(centroid).addTo(map);
          el.style.display = 'none';
          labelsRef.current.sp.push({ marker, parentKey: f.properties.departement });
        }
      }

      map.addSource('ecoles', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'ecoles-points', type: 'symbol', source: 'ecoles',
        layout: {
          'visibility': 'none',
          'icon-image': [
            'match', ['get', 'niveau_enseignement'],
            'prescolaire', 'maternelle',
            'maternelle', 'maternelle',
            [
              'match', ['get', 'statut'],
              'prive_confessionnel', 'confessionnel',
              'communautaire_non_reconnue', 'communautaire',
              'prive_laic', [
                'match', ['get', 'niveau_enseignement'],
                'primaire', 'primaire-prive',
                'secondaire', 'secondaire-prive',
                'primaire-prive'
              ],
              'public', [
                'match', ['get', 'niveau_enseignement'],
                'primaire', 'primaire-public',
                'secondaire', 'secondaire-public',
                'primaire-public'
              ],
              'primaire-public'
            ]
          ],
          'icon-size': 1.2,
          'icon-allow-overlap': true,
        },
      });

      map.addSource('clusters', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'clusters-layer', type: 'symbol', source: 'clusters',
        layout: {
          'visibility': 'none',
          'icon-image': [
            'case',
            ['==', ['get', 'school_count'], 1], 'cluster-single',
            ['==', ['get', 'school_count'], 2], 'cluster-2',
            ['==', ['get', 'school_count'], 3], 'cluster-3',
            ['==', ['get', 'school_count'], 4], 'cluster-4',
            ['==', ['get', 'school_count'], 5], 'cluster-5',
            ['==', ['get', 'school_count'], 6], 'cluster-6',
            ['==', ['get', 'school_count'], 7], 'cluster-7',
            ['==', ['get', 'school_count'], 8], 'cluster-8',
            ['==', ['get', 'school_count'], 9], 'cluster-9',
            ['==', ['get', 'school_count'], 10], 'cluster-10',
            ['==', ['get', 'school_count'], 15], 'cluster-15',
            ['==', ['get', 'school_count'], 20], 'cluster-20',
            ['==', ['get', 'school_count'], 25], 'cluster-25',
            ['==', ['get', 'school_count'], 50], 'cluster-50',
            'cluster-100',
          ],
          'icon-size': 1,
          'icon-allow-overlap': true,
        },
      });

      const allFill = ['districts-fill', 'regions-fill', 'depts-fill', 'sp-fill'];
      let hId = null, hSrc = null;
      for (const lid of allFill) {
        map.on('mouseenter', lid, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', lid, () => {
          map.getCanvas().style.cursor = '';
          if (hId !== null && hSrc) map.setFeatureState({ source: hSrc, id: hId }, { hover: false });
          hId = null; hSrc = null;
        });
        map.on('mousemove', lid, (e) => {
          if (hId !== null && hSrc) map.setFeatureState({ source: hSrc, id: hId }, { hover: false });
          const f = e.features?.[0];
          if (f) {
            hId = f.id; hSrc = lid.replace('-fill', '');
            map.setFeatureState({ source: hSrc, id: hId }, { hover: true });
          }
        });
      }

      map.on('click', (e) => {
        try {
        const sf = map.queryRenderedFeatures(e.point, { layers: ['ecoles-points'] });
        if (sf?.length) {
          const props = sf[0].properties;
          setSelectedSchool(props);
          document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());
          const centroid = sf[0].geometry?.coordinates || [props.longitude, props.latitude];
          const photoBlock = props.photo_url
            ? `<img src="${props.photo_url}" alt="${props.nom_etablissement}" style="width:100%;height:120px;object-fit:cover" />`
            : `<div style="width:100%;height:80px;display:flex;align-items:center;justify-content:center;background:#F4EFE6">
                <span class="material-symbols-outlined" style="font-size:32px;color:#CBD5E1">school</span>
              </div>`;
          const popupHtml = `<div style="width:200px;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.2)">
            ${photoBlock}
            <div style="padding:8px 10px;background:#FAF8F3">
              <p style="margin:0;font-size:11px;font-weight:700;color:#0D1B2A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${props.nom_etablissement || ''}</p>
              <p style="margin:2px 0 0;font-size:9px;color:#94A3B8">${props.niveau_enseignement || ''} · ${props.milieu_implantation || ''}</p>
            </div>
          </div>`;
          new maplibregl.Popup({ offset: 15, closeButton: false, maxWidth: '220px' })
            .setLngLat(centroid)
            .setHTML(popupHtml)
            .addTo(map);
          return;
        }

        const level = currentLevelRef.current;
        document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());
        if (level === 'district') {
          const zf = map.queryRenderedFeatures(e.point, { layers: ['districts-fill'] });
          if (zf?.length) drillDown('district', zf[0].properties.name);
        } else if (level === 'region') {
          const zf = map.queryRenderedFeatures(e.point, { layers: ['regions-fill', 'regions-outline'] });
          if (zf?.length) drillDown('region', zf[0].properties.name);
        } else if (level === 'departement') {
          const zf = map.queryRenderedFeatures(e.point, { layers: ['depts-fill', 'depts-outline'] });
          if (zf?.length) drillDown('departement', zf[0].properties.name);
        } else if (level === 'sous-prefecture') {
          const zf = map.queryRenderedFeatures(e.point, { layers: ['sp-fill', 'sp-outline'] });
          if (zf?.length) drillDown('sous-prefecture', zf[0].properties.name);
        }
        } catch (e) { console.error('map click error:', e); }
      });

      map.on('zoomend', () => {
        try {
        if (drillingRef.current || zoomingBackRef.current) return;
        const z = map.getZoom();
        const level = currentLevelRef.current;

        if (level === 'region' && z < 7) {
          zoomingBackRef.current = true;
          handleBack();
          setTimeout(() => { zoomingBackRef.current = false; }, 500);
        } else if (level === 'departement' && z < 8) {
          zoomingBackRef.current = true;
          handleBack();
          setTimeout(() => { zoomingBackRef.current = false; }, 500);
        } else if (level === 'sous-prefecture' && z < 10) {
          zoomingBackRef.current = true;
          handleBack();
          setTimeout(() => { zoomingBackRef.current = false; }, 500);
        }
        } catch (e) { console.error('zoomend error:', e); }
      });

      syncLabels();

      const schoolsPromise = loadSchools();
      setTimeout(() => setLoading(false), 600);

      const autoDrillToZone = async (targetLevel, targetCode) => {
        await schoolsPromise;
        const geoData = geoDataRef.current;
        const findFeat = (geoKey, code) => {
          const g = geoData[geoKey];
          if (!g) return null;
          return g.features.find(f => f.properties.code === code || f.properties.name === code);
        };

        if (targetLevel === 'district') {
          drillDown('district', findFeat('districts', targetCode)?.properties.name || targetCode);
        } else if (targetLevel === 'region') {
          const feat = findFeat('regions', targetCode);
          if (feat) {
            const distName = feat.properties.district;
            drillDown('district', distName);
            await new Promise(r => setTimeout(r, 900));
            drillDown('region', feat.properties.name);
          }
        } else if (targetLevel === 'departement') {
          const feat = findFeat('depts', targetCode);
          if (feat) {
            const regName = feat.properties.region;
            const regFeat = findFeat('regions', regName);
            const distName = regFeat?.properties.district;
            if (distName) { drillDown('district', distName); await new Promise(r => setTimeout(r, 900)); }
            if (regName) { drillDown('region', regName); await new Promise(r => setTimeout(r, 900)); }
            drillDown('departement', feat.properties.name);
          }
        } else if (targetLevel === 'commune' || targetLevel === 'sous-prefecture') {
          const feat = findFeat('sp', targetCode);
          if (feat) {
            const deptName = feat.properties.departement;
            const deptFeat = findFeat('depts', deptName);
            const regName = deptFeat?.properties.region || feat.properties.region;
            const regFeat = findFeat('regions', regName);
            const distName = regFeat?.properties.district;
            if (distName) { drillDown('district', distName); await new Promise(r => setTimeout(r, 900)); }
            if (regName) { drillDown('region', regName); await new Promise(r => setTimeout(r, 900)); }
            if (deptName) { drillDown('departement', deptName); await new Promise(r => setTimeout(r, 900)); }
            drillDown('sous-prefecture', feat.properties.name);
          }
        }
      };

      const urlTargetLevel = urlLevel || null;
      const urlTargetCode = urlCode || null;

      const focusLatParam = searchParams.get('lat');
      const focusLngParam = searchParams.get('lng');
      const focusSchoolIdParam = searchParams.get('school_id');

      if (focusLatParam && focusLngParam) {
        const lat = parseFloat(focusLatParam);
        const lng = parseFloat(focusLngParam);
        if (!isNaN(lat) && !isNaN(lng)) {
          schoolsPromise.then(() => {
            setTimeout(() => {
              map.flyTo({ center: [lng, lat], zoom: 16, duration: 1500 });
              showPointsFromDashboard.current = true;
              const ecolesLayer = map.getLayer('ecoles-points');
              if (ecolesLayer) map.setLayoutProperty('ecoles-points', 'visibility', 'visible');
              if (map.getLayer('clusters-layer')) map.setLayoutProperty('clusters-layer', 'visibility', 'none');
              if (focusSchoolIdParam && schoolsData?.features) {
                const feat = schoolsData.features.find(f => f.properties.id === focusSchoolIdParam);
                if (feat) setSelectedSchool(feat.properties);
              }
            }, 500);
          });
        }
      } else if (urlTargetLevel && urlTargetCode) {
        autoDrillToZone(urlTargetLevel, urlTargetCode);
      } else if (user?.commune_code || user?.departement_code || user?.region_code || user?.district_code) {
        const zoneLevel = user.commune_code ? 'commune' : user.departement_code ? 'departement' : user.region_code ? 'region' : 'district';
        const zoneCode = user.commune_code || user.departement_code || user.region_code || user.district_code;
        autoDrillToZone(zoneLevel, zoneCode);
      } else if (districtsData?.features?.length) {
        setZones(districtsData.features.map(f => f.properties));
      }
    });

    mapInst.current = map;
    return () => map.remove();
  }, []);

  const loadSchools = useCallback(async () => {
    try { const d = await api.getSchools(); setSchoolsData(d); return d; } catch { return null; }
  }, [setSchoolsData]);

  const enrichWithStatus = useCallback((geoData, level) => {
    if (!schoolsData || !geoData) return geoData;
    const codeKey = level === 'districts' ? 'district_code' : level === 'regions' ? 'region_code' : level === 'depts' ? 'departement_code' : 'commune_code';
    const zoneCodeKey = urlLevel === 'district' ? 'district_code' : urlLevel === 'region' ? 'region_code' : urlLevel === 'departement' ? 'departement_code' : 'commune_code';
    const statusMap = {};
    for (const f of schoolsData.features) {
      if (showPointsFromDashboard.current && urlCode && f.properties[zoneCodeKey] !== urlCode) continue;
      const code = f.properties[codeKey];
      const st = f.properties.collect_status;
      if (!code) continue;
      if (!statusMap[code]) statusMap[code] = { collected: 0, waiting: 0, pending: 0 };
      statusMap[code][st] = (statusMap[code][st] || 0) + 1;
    }
    return {
      ...geoData,
      features: geoData.features.map(f => {
        const code = f.properties.code;
        const counts = statusMap[code] || {};
        const status = (counts.collected || 0) > 0 ? 'collected' : (counts.waiting || 0) > 0 ? 'waiting' : 'pending';
        return { ...f, properties: { ...f.properties, status } };
      }),
    };
  }, [schoolsData, urlLevel, urlCode]);

  const filteredSchools = useMemo(() => {
    if (!schoolsData) return [];
    const zoneCodeKey = urlLevel === 'district' ? 'district_code' : urlLevel === 'region' ? 'region_code' : urlLevel === 'departement' ? 'departement_code' : 'commune_code';
    return schoolsData.features.filter(f => {
      const p = f.properties;
      if (showPointsFromDashboard.current && urlCode && p[zoneCodeKey] !== urlCode) return false;
      if (filters.collect_status.length && !filters.collect_status.includes(p.collect_status)) return false;
      if (filters.milieu.length && !filters.milieu.includes(p.milieu_implantation)) return false;
      if (filters.niveau.length && !filters.niveau.includes(p.niveau_enseignement)) return false;
      if (filters.statut.length && !filters.statut.includes(p.statut)) return false;
      if (filters.manque_bancs && (!p.besoin_bancs || p.besoin_bancs <= 0)) return false;
      if (filters.sans_toilettes && p.toilettes_filles_fonctionnelles) return false;
      if (filters.sans_eau && p.eau_potable) return false;
      if (filters.sans_electricite && p.electricite) return false;
      if (filters.manque_enseignants && (p.enseignants_presents > 0)) return false;
      if (filters.materiaux_precaires && (!p.materiaux_precaires || (Array.isArray(p.materiaux_precaires) ? p.materiaux_precaires.length === 0 : !p.materiaux_precaires))) return false;
      if (filters.taux_filles_min != null) {
        const total = (p.nombre_filles || 0) + (p.nombre_garcons || 0);
        const pct = total > 0 ? (p.nombre_filles / total) * 100 : 0;
        if (pct < filters.taux_filles_min) return false;
      }
      if (filters.taux_filles_max != null) {
        const total = (p.nombre_filles || 0) + (p.nombre_garcons || 0);
        const pct = total > 0 ? (p.nombre_filles / total) * 100 : 0;
        if (pct > filters.taux_filles_max) return false;
      }
      return true;
    });
  }, [filters, schoolsData, urlLevel, urlCode]);

  const hasActiveFilters = filters.collect_status.length > 0 || filters.milieu.length > 0 || filters.niveau.length > 0 || filters.statut.length > 0 || filters.sans_eau || filters.sans_toilettes || filters.sans_electricite || filters.manque_bancs || filters.manque_enseignants || filters.materiaux_precaires || filters.taux_filles_min != null || filters.taux_filles_max != null;

  useEffect(() => {
    try {
    if (!mapInst.current?.getLayer('ecoles-points') || !schoolsData) return;
    mapInst.current.getSource('ecoles')?.setData({ type: 'FeatureCollection', features: filteredSchools });
    if (showPointsFromDashboard.current && currentLevelRef.current !== 'sous-prefecture') {
      mapInst.current.setLayoutProperty('ecoles-points', 'visibility', 'visible');
    }
    } catch (e) { console.error('ecoles update error:', e); }
  }, [filteredSchools, schoolsData]);

  useEffect(() => {
    try {
    const map = mapInst.current;
    if (!map || !schoolsData) return;
    const data = geoDataRef.current;
    if (data.districts?.features) {
      const enriched = enrichWithStatus(data.districts, 'districts');
      if (enriched && enriched !== data.districts) {
        data.districts = enriched;
      }
      if (currentLevelRef.current === 'district') {
        map.getSource('districts')?.setData(data.districts);
      }
    }
    if (data.regions?.features) {
      const enriched = enrichWithStatus(data.regions, 'regions');
      if (enriched && enriched !== data.regions) {
        data.regions = enriched;
      }
      if (currentLevelRef.current === 'region' && selDistRef.current) {
        const filtered = { type: 'FeatureCollection', features: data.regions.features.filter(f => f.properties.district === selDistRef.current) };
        map.getSource('regions')?.setData(filtered);
      }
    }
    if (data.depts?.features) {
      const enriched = enrichWithStatus(data.depts, 'depts');
      if (enriched && enriched !== data.depts) {
        data.depts = enriched;
      }
      if (currentLevelRef.current === 'departement' && selRegRef.current) {
        const filtered = { type: 'FeatureCollection', features: data.depts.features.filter(f => f.properties.region === selRegRef.current) };
        map.getSource('depts')?.setData(filtered);
      }
    }
    if (data.sp?.features) {
      const enriched = enrichWithStatus(data.sp, 'communes');
      if (enriched && enriched !== data.sp) {
        data.sp = enriched;
      }
      if (currentLevelRef.current === 'sous-prefecture' && selDeptRef.current) {
        const filtered = { type: 'FeatureCollection', features: data.sp.features.filter(f => f.properties.departement === selDeptRef.current) };
        map.getSource('sp')?.setData(filtered);
      }
    }
    } catch (e) { console.error('enrichWithStatus effect error:', e); }
  }, [schoolsData, enrichWithStatus]);

  const zc = zoneCounts;
  const levelTable = { district: 'districts', region: 'regions', departement: 'departements', 'sous-prefecture': 'communes' };
  const currentTable = zc ? zc[levelTable[currentLevel]] || {} : {};

  const parentName = { region: breadcrumb.district, departement: breadcrumb.region, 'sous-prefecture': breadcrumb.dept }[currentLevel];
  const parentGeoKey = { region: 'districts', departement: 'regions', 'sous-prefecture': 'depts' }[currentLevel];
  const parentCountKey = { region: 'districts', departement: 'regions', 'sous-prefecture': 'departements' }[currentLevel];
  const parentCode = parentName && geoDataRef.current[parentGeoKey]?.features
    ? (geoDataRef.current[parentGeoKey].features.find(f => f.properties.name === parentName)?.properties.code || null)
    : null;

  const scope = currentLevel === 'district'
    ? zc?.national
    : (parentCode && zc ? zc[parentCountKey]?.[parentCode] : null);

  const fallbackScope = !scope ? {
    schools: zones.reduce((s, z) => s + (zoneSchoolStats[z.code]?.schools || 0), 0) + (selected ? (zc?.communes?.[selected.code]?.schools || zoneSchoolStats[selected.code]?.schools || 0) : 0),
    students: zones.reduce((s, z) => s + (zoneSchoolStats[z.code]?.students || 0), 0) + (selected ? (zc?.communes?.[selected.code]?.students || zoneSchoolStats[selected.code]?.students || 0) : 0),
    girls: zones.reduce((s, z) => s + (zoneSchoolStats[z.code]?.girls || 0), 0) + (selected ? (zc?.communes?.[selected.code]?.girls || zoneSchoolStats[selected.code]?.girls || 0) : 0),
    boys: zones.reduce((s, z) => s + (zoneSchoolStats[z.code]?.boys || 0), 0) + (selected ? (zc?.communes?.[selected.code]?.boys || zoneSchoolStats[selected.code]?.boys || 0) : 0),
  } : null;

  const effectiveScope = scope || fallbackScope;
  const totalSchools = effectiveScope?.schools || 0;
  const totalStudents = effectiveScope?.students || 0;
  const totalGirls = effectiveScope?.girls || 0;
  const totalBoys = effectiveScope?.boys || 0;

  const zoneSchoolStats = {};
  for (const z of zones) {
    if (currentTable[z.code]) zoneSchoolStats[z.code] = currentTable[z.code];
  }
  zoneSchoolStatsRef.current = zoneSchoolStats;

  const maxSchools = Math.max(...zones.map(z => (zoneSchoolStats[z.code]?.schools || 0)), 1) || 1;
  const sortedZones = zones.slice().sort((a, b) => (zoneSchoolStats[b.code]?.schools || 0) - (zoneSchoolStats[a.code]?.schools || 0));

  useEffect(() => {
    try {
    const map = mapInst.current;
    if (!map || !map.getSource('clusters')) return;
    const geoKey = { district: 'districts', region: 'regions', departement: 'depts', 'sous-prefecture': 'sp' }[currentLevel];
    const geoData = geoDataRef.current[geoKey];
    if (!geoData?.features) return;
    const features = [];
    const parentFilter = { region: selDistRef.current, departement: selRegRef.current, 'sous-prefecture': selDeptRef.current }[currentLevel];
    const filteredGeo = parentFilter
      ? { type: 'FeatureCollection', features: geoData.features.filter(f => {
          if (currentLevel === 'region') return f.properties.district === parentFilter;
          if (currentLevel === 'departement') return f.properties.region === parentFilter;
          if (currentLevel === 'sous-prefecture') return f.properties.departement === parentFilter;
          return true;
        }) }
      : geoData;
    for (const f of filteredGeo.features) {
      const code = f.properties.code;
      const count = zoneSchoolStats[code]?.schools || 0;
      if (count <= 0) continue;
      const centroid = getCentroid(f.geometry);
      if (!centroid) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: centroid },
        properties: { code, name: f.properties.name, school_count: count },
      });
    }
    map.getSource('clusters')?.setData({ type: 'FeatureCollection', features });
    const showClusters = !showPointsFromDashboard.current;
    map.setLayoutProperty('clusters-layer', 'visibility', showClusters ? 'visible' : 'none');
    syncViewRef.current?.();
    } catch (e) { console.error('cluster update error:', e); }
  }, [zones, zoneSchoolStats, currentLevel]);

  const levelLabel = { district: 'Districts', region: 'Régions', departement: 'Départements', 'sous-prefecture': 'Sous-préfectures' };

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {loading && (
        <div className="absolute inset-0 z-50 bg-[#F4EFE6] flex flex-col items-center justify-center gap-5">
          <div className="w-16 h-16 rounded-full border-4 border-[#E8611A]/20 border-t-[#E8611A] animate-spin" />
          <p className="text-xs text-[#6B7280]">Chargement de la carte...</p>
        </div>
      )}

      <div className="relative flex-1 min-h-[50vh] lg:min-h-0">
        <div className="absolute top-3 left-4 right-4 z-20">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-white/90 backdrop-blur-md rounded-xl px-3.5 py-2.5 shadow-lg border border-[#CBD5E1]/20">
              <span className="material-symbols-outlined text-[#E8611A] text-[18px] shrink-0 mr-2">search</span>
              <input className="w-full bg-transparent text-[#0D1B2A] text-sm placeholder:text-[#94A3B8] focus:outline-none font-medium"
                placeholder="Rechercher (Korhogo, Cocody, San-Pedro)..." type="search" />
            </div>
            <button onClick={toggleAdvancedFilters}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg border shrink-0 transition ${advancedFiltersOpen ? 'bg-[#E8611A] border-[#E8611A]' : 'bg-white/90 backdrop-blur-md border-[#CBD5E1]/20 hover:bg-white'}`}>
              <span className={`material-symbols-outlined text-[18px] ${advancedFiltersOpen ? 'text-white' : 'text-[#475569]'}`}>tune</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2">
            <button onClick={resetFilters}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 shadow-sm transition ${filters.collect_status.length === 0 && filters.milieu.length === 0 && filters.niveau.length === 0 && filters.statut.length === 0 && !filters.sans_eau && !filters.sans_toilettes && !filters.sans_electricite && !filters.manque_bancs && !filters.manque_enseignants && !filters.materiaux_precaires ? 'bg-[#E8611A] text-white' : 'bg-white/90 backdrop-blur text-[#475569] border border-[#CBD5E1]/20 hover:bg-white'}`}>
              Tous
            </button>
            {[
              { key: 'collected', label: 'Collecte', color: '#E8611A' },
              { key: 'waiting', label: 'En cours', color: '#00796B' },
              { key: 'pending', label: 'En attente', color: '#94A3B8' },
            ].map(f => {
              const active = filters.collect_status.includes(f.key);
              return (
                <button key={f.key}
                  onClick={() => setFilter('collect_status', active ? filters.collect_status.filter(v => v !== f.key) : [...filters.collect_status, f.key])}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0 shadow-sm flex items-center gap-1.5 border transition ${active ? 'bg-white border-[#E8611A]/30 text-[#0D1B2A]' : 'bg-white/90 backdrop-blur text-[#475569] border-[#CBD5E1]/20 hover:bg-white'}`}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }} /> {f.label}
                </button>
              );
            })}
          </div>

          {advancedFiltersOpen && (
            <div className="mt-2 bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-lg border border-[#CBD5E1]/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#0D1B2A] uppercase tracking-wider">Filtres avancés</span>
                <button onClick={resetFilters} className="text-[10px] text-[#E8611A] font-bold hover:underline">Réinitialiser</button>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-1.5">Niveau</p>
                  <div className="flex gap-1.5">
                    {['primaire', 'secondaire'].map(n => {
                      const active = filters.niveau.includes(n);
                      return (
                        <button key={n}
                          onClick={() => setFilter('niveau', active ? filters.niveau.filter(v => v !== n) : [...filters.niveau, n])}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition ${active ? 'bg-[#E8611A] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'}`}>
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-1.5">Milieu</p>
                  <div className="flex gap-1.5">
                    {['urbain', 'rural'].map(m => {
                      const active = filters.milieu.includes(m);
                      return (
                        <button key={m}
                          onClick={() => setFilter('milieu', active ? filters.milieu.filter(v => v !== m) : [...filters.milieu, m])}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition ${active ? 'bg-[#00796B] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'}`}>
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-[#CBD5E1]/20" />

                {['institution', 'admin', 'mairie', 'president_region', 'ministre', 'directeur_afrique'].includes(role) ? (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: 'manque_bancs', label: 'Manque bancs', icon: 'chair' },
                        { key: 'sans_toilettes', label: 'Sans toilettes', icon: 'wc' },
                        { key: 'sans_eau', label: 'Sans eau', icon: 'water_drop' },
                        { key: 'sans_electricite', label: 'Sans électricité', icon: 'bolt' },
                        { key: 'manque_enseignants', label: 'Manque enseignants', icon: 'person_off' },
                        { key: 'materiaux_precaires', label: 'Matériaux précaires', icon: 'construction' },
                      ].map(f => {
                        const active = filters[f.key];
                        return (
                          <button key={f.key}
                            onClick={() => setFilter(f.key, !active)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${active ? 'bg-[#E8611A] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'}`}>
                            <span className="material-symbols-outlined text-[12px]">{f.icon}</span>
                            {f.label}
                          </button>
                        );
                      })}
                    </div>

                    <div>
                      <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-1.5">Statut juridique</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { value: 'public', label: 'Public' },
                          { value: 'prive_laic', label: 'Privé laïc' },
                          { value: 'prive_confessionnel', label: 'Privé confes.' },
                          { value: 'communautaire_non_reconnue', label: 'Communautaire' },
                        ].map(s => {
                          const active = filters.statut.includes(s.value);
                          return (
                            <button key={s.value}
                              onClick={() => setFilter('statut', active ? filters.statut.filter(v => v !== s.value) : [...filters.statut, s.value])}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${active ? 'bg-[#0D1B2A] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'}`}>
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-1.5">Taux filles (%)</p>
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" max="100" placeholder="Min"
                          value={filters.taux_filles_min ?? ''}
                          onChange={e => setFilter('taux_filles_min', e.target.value ? Number(e.target.value) : null)}
                          className="w-16 px-2 py-1 rounded-lg bg-[#F1F5F9] text-[#0D1B2A] text-[11px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#E8611A]" />
                        <span className="text-[10px] text-[#94A3B8]">→</span>
                        <input type="number" min="0" max="100" placeholder="Max"
                          value={filters.taux_filles_max ?? ''}
                          onChange={e => setFilter('taux_filles_max', e.target.value ? Number(e.target.value) : null)}
                          className="w-16 px-2 py-1 rounded-lg bg-[#F1F5F9] text-[#0D1B2A] text-[11px] font-bold text-center focus:outline-none focus:ring-1 focus:ring-[#E8611A]" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-3 px-3 bg-[#F8F6F1] rounded-xl border border-[#E8611A]/10">
                    <div className="w-9 h-9 rounded-lg bg-[#E8611A]/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] text-[#E8611A]">lock</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-[#0D1B2A]">Filtres avancés</p>
                      <p className="text-[10px] text-[#94A3B8]">Infrastructure, statut juridique, taux parité — connectez-vous en tant que décideur</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-2 left-3 right-3 z-20 flex items-center justify-between px-3 py-2 rounded-xl bg-[#0D1B2A]/80 backdrop-blur-md text-white text-[10px] font-bold shadow-lg pointer-events-none border border-white/5">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#E8611A]" /> Collecte</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00796B]" /> En cours</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#94A3B8]" /> En attente</span>
          </div>
          <span className="text-[#E8611A] uppercase tracking-widest text-[9px]">SIG v2.4</span>
        </div>

        <div ref={mapRef} className="absolute inset-0" />
      </div>

      <div className="w-full lg:w-[380px] xl:w-[420px] bg-[#FAF8F3] border-l border-[#CBD5E1]/30 flex flex-col overflow-hidden max-h-[45vh] lg:max-h-none">
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-[#CBD5E1]/20">
          <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] font-semibold mb-2 flex-wrap">
            <span className="material-symbols-outlined text-[14px] text-[#E8611A]">location_on</span>
            <button onClick={() => navigateToBreadcrumb('district')}
              className={`hover:underline hover:text-[#E8611A] transition-colors ${currentLevel === 'district' ? 'text-[#E8611A] font-bold' : ''}`}>CI</button>
            {breadcrumb.district && (
              <>
                <span className="material-symbols-outlined text-[10px] text-[#CBD5E1]">chevron_right</span>
                <button onClick={() => navigateToBreadcrumb('region')}
                  className={`hover:underline hover:text-[#E8611A] transition-colors ${currentLevel === 'region' ? 'text-[#E8611A] font-bold' : 'text-[#6B7280]'}`}>{breadcrumb.district}</button>
              </>
            )}
            {breadcrumb.region && (
              <>
                <span className="material-symbols-outlined text-[10px] text-[#CBD5E1]">chevron_right</span>
                <button onClick={() => navigateToBreadcrumb('departement')}
                  className={`hover:underline hover:text-[#E8611A] transition-colors ${currentLevel === 'departement' ? 'text-[#E8611A] font-bold' : 'text-[#6B7280]'}`}>{breadcrumb.region}</button>
              </>
            )}
            {breadcrumb.dept && (
              <>
                <span className="material-symbols-outlined text-[10px] text-[#CBD5E1]">chevron_right</span>
                <span className={currentLevel === 'sous-prefecture' ? 'text-[#E8611A] font-bold' : 'text-[#6B7280]'}>{breadcrumb.dept}</span>
              </>
            )}
            {selectedSchool && (
              <>
                <span className="material-symbols-outlined text-[10px] text-[#CBD5E1]">chevron_right</span>
                <span className="text-[#E8611A] font-bold">{selectedSchool.nom_etablissement}</span>
              </>
            )}
          </div>
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-[#0D1B2A] text-lg tracking-tight">
              {selectedSchool ? 'Fiche École' :
                selected ? `Sous-préfecture de ${selected.name}` :
                breadcrumb.dept ? `Département de ${breadcrumb.dept}` :
                breadcrumb.region ? `Région de ${breadcrumb.region}` :
                breadcrumb.district ? `District ${breadcrumb.district.includes('District') ? breadcrumb.district : 'des ' + breadcrumb.district}` :
                'Districts'}
            </h2>
            {(selectedSchool || currentLevel !== 'district') && (
              <button onClick={() => selectedSchool ? setSelectedSchool(null) : handleBack()}
                className="flex items-center gap-1 text-[11px] text-[#E8611A] font-bold hover:bg-[#E8611A]/5 px-2 py-1 rounded-lg transition">
                <span className="material-symbols-outlined text-[14px]">arrow_back</span> Retour
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">{zones.length} {currentLevel === 'district' ? 'districts' : currentLevel === 'region' ? 'régions' : currentLevel === 'departement' ? 'départements' : 'sous-préfectures'} dans {breadcrumb.dept || breadcrumb.region || breadcrumb.district || 'Côte d\'Ivoire'}</p>
          {hasActiveFilters && (
            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-[#E8611A]/10 text-[#E8611A] text-[10px] font-bold">
              <span className="material-symbols-outlined text-[10px]">filter_alt</span>
              {filteredSchools.length} / {totalSchools} écoles
            </span>
          )}
        </div>

        <div className="px-5 py-4 grid grid-cols-3 gap-3 border-b border-[#CBD5E1]/20">
          {(() => {
            const sel = selected ? (zoneSchoolStats[selected.code] || zc?.communes?.[selected.code] || { schools: 0, students: 0, girls: 0, boys: 0 }) : null;
            let s = sel || { schools: totalSchools, students: totalStudents, girls: totalGirls, boys: totalBoys };
            if (hasActiveFilters && !sel) {
              const fSchools = filteredSchools.length;
              const fStudents = filteredSchools.reduce((sum, f) => sum + (f.properties.nombre_filles || 0) + (f.properties.nombre_garcons || 0), 0);
              const fGirls = filteredSchools.reduce((sum, f) => sum + (f.properties.nombre_filles || 0), 0);
              const fBoys = filteredSchools.reduce((sum, f) => sum + (f.properties.nombre_garcons || 0), 0);
              s = { schools: fSchools, students: fStudents, girls: fGirls, boys: fBoys };
            }
            const pctFilles = (s.girls + s.boys) > 0 ? Math.round(s.girls / (s.girls + s.boys) * 100) : 0;
            return (<>
              <StatCard icon="school" label="Écoles" value={s.schools} />
              <StatCard icon="groups" label="Élèves" value={s.students} format="k" />
              <StatCard icon="girl" label="Filles" value={pctFilles} suffix="%" />
            </>);
          })()}
        </div>

        {(() => {
          const sel = selected ? (zoneSchoolStats[selected.code] || zc?.communes?.[selected.code] || { girls: 0, boys: 0 }) : null;
          const g = sel ? sel.girls : totalGirls;
          const b = sel ? sel.boys : totalBoys;
          if ((g + b) <= 0) return null;
          const pct = Math.round(g / (g + b) * 100);
          return (
            <div className="px-5 py-3 border-b border-[#CBD5E1]/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Parité filles/garçons</span>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden flex">
                <div className="h-full bg-[#E8611A] rounded-l-full transition-all duration-500" style={{ width: `${pct}%` }} />
                <div className="h-full bg-[#00796B] rounded-r-full flex-1" />
              </div>
              <div className="flex justify-between text-[10px] font-bold mt-1.5">
                <span className="text-[#E8611A]">{pct}% filles</span>
                <span className="text-[#00796B]">{100 - pct}% garçons</span>
              </div>
            </div>
          );
        })()}

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {selectedSchool ? (
            <SchoolFiche school={selectedSchool} onBack={() => setSelectedSchool(null)} geoData={geoDataRef.current} />
          ) : selected ? (
            <ZoneDetail zone={selected} level={selected.level || currentLevel} />
          ) : (
            <div className="flex flex-col gap-1.5">
              {sortedZones
                .map((z, i) => {
                const zs = zoneSchoolStats[z.code] || { schools: z.schools || 0, students: z.students || 0, girls: z.girls || 0, boys: z.boys || 0 };
                const zoneCodeKey = currentLevel === 'district' ? 'district_code' : currentLevel === 'region' ? 'region_code' : currentLevel === 'departement' ? 'departement_code' : 'commune_code';
                const filteredCount = hasActiveFilters ? filteredSchools.filter(f => f.properties[zoneCodeKey] === z.code).length : null;
                return (
                <button key={i} onClick={() => drillDown(currentLevel, z.name)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white hover:bg-white hover:shadow-sm transition-all duration-200 text-left group border border-transparent hover:border-[#E8611A]/10">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: `${COLORS[z.status] || COLORS.pending}12`, color: COLORS[z.status] || COLORS.pending }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#0D1B2A] truncate group-hover:text-[#E8611A] transition-colors">{z.name}</p>
                    <p className="text-[10px] text-[#94A3B8] font-medium">
                      {hasActiveFilters ? (
                        <>{filteredCount} / {zs.schools.toLocaleString('fr-FR')} écoles</>
                      ) : (
                        <>{zs.schools.toLocaleString('fr-FR')} écoles · {zs.students ? Math.round(zs.students / 1000) + 'k élèves' : '—'}</>
                      )}
                    </p>
                  </div>
                  <div className="w-14 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden shrink-0">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((filteredCount != null ? filteredCount : zs.schools || 0) / maxSchools) * 100}%`, backgroundColor: COLORS[z.status] || COLORS.pending }} />
                  </div>
                </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, format, suffix }) {
  let display = value;
  if (format === 'k' && value >= 1000) display = Math.round(value / 1000) + 'k';
  if (suffix) display = value + suffix;
  return (
    <div className="bg-white p-3 rounded-xl flex flex-col shadow-sm border border-[#CBD5E1]/10">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="w-6 h-6 rounded-md bg-[#E8611A]/8 flex items-center justify-center">
          <span className="material-symbols-outlined text-[13px] text-[#E8611A]">{icon}</span>
        </span>
        <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span className="font-extrabold text-[#0D1B2A] text-xl tracking-tight">{typeof display === 'number' ? display.toLocaleString('fr-FR') : display}</span>
    </div>
  );
}

function ZoneDetail({ zone, level }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const pct = zone.girls && zone.boys ? Math.round(zone.girls / (zone.girls + zone.boys) * 100) : 0;

  useEffect(() => {
    if (!zone.code) { setLoading(false); return; }
    setLoading(true);
    const apiLevel = level === 'sous-prefecture' ? 'commune' : level;
    api.getDashboardStats(apiLevel, zone.code).then(d => { setDetail(d); setLoading(false); }).catch(() => setLoading(false));
  }, [zone.code, level]);

  const totalStudents = zone.students || detail?.total_eleves || 0;
  const girls = zone.girls || detail?.total_filles || 0;
  const boys = zone.boys || detail?.total_garcons || 0;
  const schoolCount = zone.schools || detail?.total_ecoles || 0;

  if (loading) {
    return <div className="flex items-center justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-[#E8611A]/20 border-t-[#E8611A] animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
        <div className="flex items-center justify-between mb-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: `${COLORS[zone.status] || COLORS.pending}10`, color: COLORS[zone.status] || COLORS.pending }}>
            {STATUS_LABEL[zone.status] || zone.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Écoles</p>
            <p className="text-2xl font-extrabold text-[#0D1B2A] tracking-tight mt-0.5">{schoolCount.toLocaleString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Élèves</p>
            <p className="text-2xl font-extrabold text-[#0D1B2A] tracking-tight mt-0.5">{totalStudents ? totalStudents.toLocaleString('fr-FR') : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#E8611A] font-bold uppercase tracking-wider">Filles</p>
            <p className="text-2xl font-extrabold text-[#E8611A] tracking-tight mt-0.5">{girls.toLocaleString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#00796B] font-bold uppercase tracking-wider">Garçons</p>
            <p className="text-2xl font-extrabold text-[#00796B] tracking-tight mt-0.5">{boys.toLocaleString('fr-FR')}</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Parité F/G</span>
            <span className="text-[10px] font-bold text-[#0D1B2A]">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden flex">
            <div className="h-full bg-[#E8611A] rounded-l-full transition-all duration-500" style={{ width: pct + '%' }} />
            <div className="h-full bg-[#00796B] rounded-r-full flex-1" />
          </div>
          <div className="flex justify-between text-[9px] font-bold mt-1">
            <span className="text-[#E8611A]">{pct}% filles</span>
            <span className="text-[#00796B]">{100 - pct}% garçons</span>
          </div>
        </div>
      </div>

      {detail && (
        <>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-3">Collecte</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Collecté', value: detail.by_status?.collected || 0, color: COLORS.collected },
                { label: 'En cours', value: detail.by_status?.waiting || 0, color: COLORS.waiting },
                { label: 'En attente', value: detail.by_status?.pending || 0, color: COLORS.pending },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] text-[#94A3B8] font-semibold">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {detail.infrastructure && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
              <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-3">Infrastructure</p>
              <div className="flex flex-col gap-2">
                {[
                  { icon: 'wc', label: 'Sans toilettes', value: detail.infrastructure.sans_toilettes, color: '#ba1a1a' },
                  { icon: 'water_drop', label: 'Sans eau', value: detail.infrastructure.sans_eau, color: '#1E88E5' },
                  { icon: 'bolt', label: 'Sans électricité', value: detail.infrastructure.sans_electricite, color: '#F9A825' },
                  { icon: 'construction', label: 'Matériaux précaires', value: detail.infrastructure.materiaux_precaires, color: '#E8611A' },
                  { icon: 'chair', label: 'Bancs manquants', value: detail.infrastructure.besoin_bancs, color: '#00796B' },
                ].map(i => (
                  <div key={i.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]" style={{ color: i.color }}>{i.icon}</span>
                      <span className="text-[11px] text-[#475569] font-medium">{i.label}</span>
                    </div>
                    <span className="text-[12px] font-extrabold" style={{ color: i.color }}>{i.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail.parity_by_level && Object.keys(detail.parity_by_level).length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
              <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-3">Parité par niveau</p>
              <div className="flex flex-col gap-3">
                {Object.entries(detail.parity_by_level).map(([niveau, data]) => {
                  const total = (data.filles || 0) + (data.garcons || 0);
                  const pctN = total > 0 ? Math.round(data.filles / total * 100) : 0;
                  return (
                    <div key={niveau}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-[#0D1B2A] capitalize">{niveau}</span>
                        <span className="text-[10px] text-[#94A3B8] font-medium">{total.toLocaleString('fr-FR')} élèves</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden flex">
                        <div className="h-full bg-[#E8611A] rounded-l-full" style={{ width: pctN + '%' }} />
                        <div className="h-full bg-[#00796B] rounded-r-full flex-1" />
                      </div>
                      <div className="flex justify-between text-[9px] font-bold mt-0.5">
                        <span className="text-[#E8611A]">{data.filles} F ({pctN}%)</span>
                        <span className="text-[#00796B]">{data.garcons} G</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {detail.monthly && detail.monthly.some(m => m.count > 0) && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
              <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-3">Collecte mensuelle</p>
              <div className="flex items-end gap-1 h-16">
                {detail.monthly.map(m => {
                  const max = Math.max(...detail.monthly.map(x => x.count), 1);
                  const h = Math.round((m.count / max) * 100);
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5" title={`${m.label}: ${m.count}`}>
                      <div className="w-full bg-[#E8611A] rounded-t transition-all" style={{ height: `${Math.max(h, 4)}%`, minHeight: m.count > 0 ? '4px' : '1px', opacity: m.count > 0 ? 1 : 0.2 }} />
                      <span className="text-[7px] text-[#94A3B8] font-medium leading-none">{m.label.split('.')[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SchoolFiche({ school, onBack, geoData }) {
  const [schoolPhoto, setSchoolPhoto] = useState(school.photo_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoFileRef = useRef(null);

  const total = (school.nombre_filles || 0) + (school.nombre_garcons || 0);
  const pctFilles = total > 0 ? Math.round((school.nombre_filles || 0) / total * 100) : 0;
  const inventaire = (() => { try { return typeof school.inventaire_classes === 'string' ? JSON.parse(school.inventaire_classes) : (school.inventaire_classes || []); } catch { return []; } })();
  const nbNiveaux = inventaire.length > 0 ? new Set(inventaire.map(c => c.classe?.split(' ')[0])).size : 0;
  const besoins = inventaire.reduce((s, c) => s + (c.besoin_bancs || 0), 0);

  const STATUT_LABEL = { public: 'public', prive_laic: 'privé laïc', prive_confessionnel: 'privé confessionnel', communautaire_non_reconnue: 'communautaire non reconnu' };
  const NIVEAU_LABEL = { primaire: 'primaire', secondaire: 'secondaire' };
  const STATUS_COLORS = { collected: '#E8611A', waiting: '#00796B', pending: '#CBD5E1' };

  const findZoneName = (geoKey, code) => {
    if (!geoData || !geoData[geoKey] || !code) return null;
    const f = geoData[geoKey].features.find(f => f.properties.code === code);
    return f?.properties?.name || null;
  };
  const spName = findZoneName('sp', school.commune_code);
  const deptName = findZoneName('depts', school.departement_code);
  const regName = findZoneName('regions', school.region_code);

  const isUrbain = school.milieu_implantation === 'urbain';
  const statutLabel = STATUT_LABEL[school.statut] || school.statut || 'inconnu';
  const niveauLabel = NIVEAU_LABEL[school.niveau_enseignement] || school.niveau_enseignement || '';

  let confessionText = '';
  if (school.statut === 'prive_confessionnel') {
    const conf = school.type_genre || school.categorie || '';
    confessionText = conf ? ` de confession ${conf}` : '';
  }

  let localisation = '';
  if (isUrbain) {
    localisation = `dans la commune de ${spName || school.commune_code || 'inconnue'}`;
  } else {
    localisation = `dans la communauté de ${spName || school.commune_code || 'inconnue'}`;
  }

  const directorTitle = school.directeur_genre === 'Mme' ? 'Madame' : school.directeur_genre === 'Mlle' ? 'Mademoiselle' : 'Monsieur';
  const hasDirector = school.directeur_nom;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !school.id) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const token = useAuthStore.getState().token;
      const res = await fetch(`${api.baseUrl}/ecoles/${school.id}/photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      }).then(r => r.json());
      if (res.error) throw new Error(res.details || res.error);
      if (res.photo_url) {
        setSchoolPhoto(res.photo_url);
        school.photo_url = res.photo_url;
      }
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const description = `L'école ${school.nom_etablissement || 'inconnue'} est une école ${niveauLabel} ${statutLabel}${confessionText}. Elle se situe ${localisation}${deptName ? `, dans le département de ${deptName}` : ''}${regName ? `, dans la région de ${regName}` : ''}${school.annee_creation ? `. Créée en ${school.annee_creation}` : ''}${nbNiveaux > 0 ? `. Elle dispose de ${nbNiveaux} niveau${nbNiveaux > 1 ? 'x' : ''}` : ''}${school.enseignants_presents ? ` ainsi que de ${school.enseignants_presents} enseignant${school.enseignants_presents > 1 ? 's' : ''}` : ''}${hasDirector ? `. Et est dirigée par ${directorTitle} ${school.directeur_nom}` : ''}.`;

  return (
    <div className="flex flex-col gap-3 pb-4">
      {schoolPhoto ? (
        <div className="rounded-xl overflow-hidden shadow-sm border border-[#CBD5E1]/10 relative group">
          <img src={schoolPhoto} alt={school.nom_etablissement} className="w-full h-48 object-cover" />
          <button onClick={() => photoFileRef.current?.click()}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-white text-[16px]">edit</span>
          </button>
          <input ref={photoFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
        </div>
      ) : (
        <button onClick={() => photoFileRef.current?.click()}
          className="rounded-xl border-2 border-dashed border-[#CBD5E1] bg-white p-6 flex flex-col items-center gap-2 hover:border-[#E8611A]/40 hover:bg-[#E8611A]/5 transition-all">
          <span className="material-symbols-outlined text-[#CBD5E1] text-[32px]">{uploadingPhoto ? 'hourglass_top' : 'add_a_photo'}</span>
          <p className="text-[11px] text-[#94A3B8] font-medium">{uploadingPhoto ? 'Envoi en cours...' : 'Ajouter une photo de l\'établissement'}</p>
          <input ref={photoFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
        </button>
      )}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
        <div className="flex items-center justify-between mb-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: `${STATUS_COLORS[school.collect_status] || '#CBD5E1'}10`, color: STATUS_COLORS[school.collect_status] || '#CBD5E1' }}>
            {school.collect_status === 'collected' ? 'Collecté' : school.collect_status === 'waiting' ? 'En cours' : 'En attente'}
          </span>
          <span className="text-[10px] text-[#94A3B8] font-mono">{school.code_mena}</span>
        </div>
        <h3 className="text-[15px] font-extrabold text-[#0D1B2A] leading-tight mb-3">{school.nom_etablissement}</h3>
        <p className="text-[12px] text-[#475569] leading-relaxed">{description}</p>
      </div>

      {total > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
          <h4 className="text-[11px] font-bold text-[#0D1B2A] uppercase tracking-wider mb-3">Effectifs</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-[#0D1B2A]">{total.toLocaleString('fr-FR')}</p>
              <p className="text-[9px] font-bold text-[#94A3B8] uppercase">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-[#E8611A]">{(school.nombre_filles || 0).toLocaleString('fr-FR')}</p>
              <p className="text-[9px] font-bold text-[#E8611A] uppercase">Filles {pctFilles}%</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-[#00796B]">{(school.nombre_garcons || 0).toLocaleString('fr-FR')}</p>
              <p className="text-[9px] font-bold text-[#00796B] uppercase">Garçons {100 - pctFilles}%</p>
            </div>
          </div>
          <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden flex mt-3">
            <div className="h-full bg-[#E8611A] rounded-l-full transition-all" style={{ width: `${pctFilles}%` }} />
            <div className="h-full bg-[#00796B] rounded-r-full flex-1" />
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] font-bold">
            <span className="text-[#94A3B8]">{school.enseignants_presents || 0} enseignants · {school.salles_classe_total || 0} salles</span>
            {total > 0 && school.enseignants_presents > 0 && <span className="text-[#475569]">Ratio {Math.round(total / school.enseignants_presents)}:1</span>}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
        <h4 className="text-[11px] font-bold text-[#0D1B2A] uppercase tracking-wider mb-3">Infrastructure</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Eau potable', ok: school.eau_potable, icon: 'water_drop' },
            { label: 'Électricité', ok: school.electricite, icon: 'bolt' },
            { label: 'Toilettes filles', ok: school.toilettes_filles_fonctionnelles, icon: 'wc' },
            { label: 'Bancs', ok: besoins === 0, icon: 'chair', extra: besoins > 0 ? `${besoins} besoins` : 'OK' },
          ].map(item => (
            <div key={item.label} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-bold ${item.ok ? 'bg-[#00796B]/8 text-[#00796B]' : 'bg-[#ba1a1a]/8 text-[#ba1a1a]'}`}>
              <span className="material-symbols-outlined text-[14px]">{item.icon}</span>
              <span>{item.label}</span>
              {item.extra && <span className="ml-auto text-[9px]">{item.extra}</span>}
            </div>
          ))}
        </div>
        {school.materiaux_precaires && school.materiaux_precaires.length > 0 && (
          <div className="mt-2 px-2.5 py-2 rounded-lg bg-[#d97706]/8 text-[#d97706] text-[11px] font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">construction</span>
            <span>Matériaux précaires : {Array.isArray(school.materiaux_precaires) ? school.materiaux_precaires.join(', ') : school.materiaux_precaires}</span>
          </div>
        )}
      </div>

      {inventaire.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
          <h4 className="text-[11px] font-bold text-[#0D1B2A] uppercase tracking-wider mb-3">Inventaire des classes</h4>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center text-[10px] font-bold text-[#94A3B8] uppercase px-2">
              <span className="flex-1">Classe</span>
              <span className="w-10 text-center">F</span>
              <span className="w-10 text-center">G</span>
              <span className="w-10 text-center">Bancs</span>
              <span className="w-14 text-center">Besoin</span>
            </div>
            {inventaire.map((cl, i) => (
              <div key={i} className="flex items-center text-[11px] font-medium text-[#0D1B2A] px-2 py-1.5 rounded-lg bg-[#F8F6F1]">
                <span className="flex-1 font-bold">{cl.classe}</span>
                <span className="w-10 text-center text-[#E8611A]">{cl.filles || 0}</span>
                <span className="w-10 text-center text-[#00796B]">{cl.garcons || 0}</span>
                <span className="w-10 text-center">{cl.bancs_actifs || 0}</span>
                <span className="w-14 text-center font-bold text-[#ba1a1a]">{cl.besoin_bancs || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {school.last_collecte_at && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
          <h4 className="text-[11px] font-bold text-[#0D1B2A] uppercase tracking-wider mb-2">Dernière collecte</h4>
          <p className="text-[12px] font-medium text-[#475569]">
            {new Date(school.last_collecte_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  );
}
