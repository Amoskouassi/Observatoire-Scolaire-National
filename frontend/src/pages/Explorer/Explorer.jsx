import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../../stores/mapStore';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

const COLORS = {
  collected: '#E8611A',
  waiting: '#0B7A3E',
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
    background: rgba(255,255,255,0.92);
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
    backdrop-filter: blur(4px);
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
  map.fitBounds(
    [[bbox[0][0] - dLng, bbox[0][1] - dLat], [bbox[1][0] + dLng, bbox[1][1] + dLat]],
    { padding: 40, duration: 700 }
  );
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
  const urlAppliedRef = useRef(false);

  useEffect(() => {
    if (urlAppliedRef.current) return;
    const statusParam = searchParams.get('status');
    const filterParam = searchParams.get('filter');
    if (statusParam) {
      setFilter('collect_status', [statusParam]);
    }
    if (filterParam === 'sans_eau') setFilter('sans_eau', true);
    if (filterParam === 'sans_toilettes') setFilter('sans_toilettes', true);
    if (filterParam === 'sans_electricite') setFilter('sans_electricite', true);
    if (filterParam === 'manque_bancs') setFilter('manque_bancs', true);
    if (urlLevel && urlCode) {
      urlAppliedRef.current = true;
    }
  }, [urlLevel, urlCode, searchParams, setFilter]);
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

      if (data.regions) {
        const filtered = { type: 'FeatureCollection', features: data.regions.features.filter(f => f.properties.district === name) };
        map.getSource('regions')?.setData(filtered);
        nextZones = filtered.features.map(f => f.properties);
      }
      if (data.depts) map.getSource('depts')?.setData(data.depts);
      if (data.sp) map.getSource('sp')?.setData(data.sp);

      setVis(['districts-fill', 'districts-outline'], 'visible');
      setVis(['regions-fill', 'regions-outline'], 'visible');
      setVis(['depts-fill', 'depts-outline'], 'none');
      setVis(['sp-fill', 'sp-outline'], 'none');

      nextLevel = 'region';

    } else if (level === 'region') {
      const regionFeat = data.regions?.features?.find(f => f.properties.name === name);
      selDistRef.current = regionFeat?.properties?.district || selDistRef.current;
      selRegRef.current = name;
      selDeptRef.current = null;
      setBreadcrumb(prev => ({ ...prev, region: name, dept: null }));

      if (data.depts) {
        const filtered = { type: 'FeatureCollection', features: data.depts.features.filter(f => f.properties.region === name) };
        map.getSource('depts')?.setData(filtered);
        nextZones = filtered.features.map(f => f.properties);
      }
      if (data.sp) map.getSource('sp')?.setData(data.sp);

      setVis(['regions-fill'], 'none');
      setVis(['regions-outline'], 'visible');
      setVis(['depts-fill', 'depts-outline'], 'visible');
      setVis(['sp-fill', 'sp-outline'], 'none');

      nextLevel = 'departement';

    } else if (level === 'departement') {
      const deptFeat = data.depts?.features?.find(f => f.properties.name === name);
      selRegRef.current = deptFeat?.properties?.region || selRegRef.current;
      selDeptRef.current = name;
      setBreadcrumb(prev => ({ ...prev, dept: name }));

      if (data.sp) {
        const filtered = { type: 'FeatureCollection', features: data.sp.features.filter(f => f.properties.departement === name) };
        map.getSource('sp')?.setData(filtered);
        nextZones = filtered.features.map(f => f.properties);
      }

      setVis(['depts-fill'], 'none');
      setVis(['depts-outline'], 'visible');
      setVis(['sp-fill', 'sp-outline'], 'visible');

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
  }, []);

  const handleBack = useCallback(() => {
    setSelected(null);
    setSelectedSchool(null);
    const map = mapInst.current;
    if (!map) return;
    const data = geoDataRef.current;
    const setVis = (ls, v) => ls.forEach(l => { if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', v); });

    if (currentLevelRef.current === 'sous-prefecture') {
      if (data.sp) map.getSource('sp')?.setData(data.sp);
      const parentRegion = selRegRef.current;
      if (parentRegion && data.depts) {
        const filtered = { type: 'FeatureCollection', features: data.depts.features.filter(f => f.properties.region === parentRegion) };
        map.getSource('depts')?.setData(filtered);
        setZones(filtered.features.map(f => f.properties));
      }
      selDeptRef.current = null;
      setBreadcrumb(prev => ({ ...prev, dept: null }));
      setVis(['depts-fill', 'depts-outline'], 'visible');
      setVis(['sp-fill', 'sp-outline'], 'none');
      setCurrentLevel('departement');
      currentLevelRef.current = 'departement';

    } else if (currentLevelRef.current === 'departement') {
      const parentDistrict = selDistRef.current;
      if (parentDistrict && data.regions) {
        const filtered = { type: 'FeatureCollection', features: data.regions.features.filter(f => f.properties.district === parentDistrict) };
        map.getSource('regions')?.setData(filtered);
        setZones(filtered.features.map(f => f.properties));
      }
      selRegRef.current = null;
      setBreadcrumb(prev => ({ ...prev, region: null, dept: null }));
      setVis(['regions-fill', 'regions-outline'], 'visible');
      setVis(['depts-fill', 'depts-outline'], 'none');
      setCurrentLevel('region');
      currentLevelRef.current = 'region';

    } else if (currentLevelRef.current === 'region') {
      selDistRef.current = null;
      setBreadcrumb({ district: null, region: null, dept: null });
      if (data.districts) {
        map.getSource('districts')?.setData(data.districts);
        setZones(data.districts.features.map(f => f.properties));
      }
      if (data.regions) map.getSource('regions')?.setData(data.regions);
      if (data.depts) map.getSource('depts')?.setData(data.depts);
      if (data.sp) map.getSource('sp')?.setData(data.sp);
      setVis(['districts-fill', 'districts-outline'], 'visible');
      setVis(['regions-fill', 'regions-outline'], 'none');
      setVis(['depts-fill', 'depts-outline'], 'none');
      setVis(['sp-fill', 'sp-outline'], 'none');
      drillingRef.current = true;
      map.flyTo({ center: [-5.5, 7.0], zoom: 5.5, duration: 800 });
      setCurrentLevel('district');
      currentLevelRef.current = 'district';
      setTimeout(() => { drillingRef.current = false; }, 900);
    }

    syncViewRef.current?.();
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
        sources: {},
        layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#F4EFE6' } }],
      },
      center: [-5.5, 7.0],
      zoom: 5.5,
      minZoom: 5,
      maxZoom: 18,
      attributionControl: false,
      maxBounds: [[-9.5, 3], [-1.5, 12]],
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

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
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.4, 0.2],
            'fill-opacity-transition': { duration: 200 },
          },
        });
        map.addLayer({
          id: 'districts-outline', type: 'line', source: 'districts',
          paint: { 'line-color': '#0D1B2A', 'line-width': 1.5, 'line-opacity': 0.7 },
        });
        for (const f of districtsData.features) {
          const centroid = getCentroid(f.geometry);
          if (!centroid) continue;
          const el = createLabelEl(f.properties.name);
          const marker = new maplibregl.Marker({ element: el }).setLngLat(centroid).addTo(map);
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
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.45, 0.25],
            'fill-opacity-transition': { duration: 200 },
          },
          layout: { visibility: 'none' },
        });
        map.addLayer({ id: 'regions-outline', type: 'line', source: 'regions', paint: { 'line-color': '#475569', 'line-width': 0.8, 'line-opacity': 0.6 }, layout: { visibility: 'none' } });
        for (const f of regionsData.features) {
          const centroid = getCentroid(f.geometry);
          if (!centroid) continue;
          const el = createLabelEl(f.properties.name);
          const marker = new maplibregl.Marker({ element: el }).setLngLat(centroid).addTo(map);
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
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.5, 0.3],
            'fill-opacity-transition': { duration: 200 },
          },
          layout: { visibility: 'none' },
        });
        map.addLayer({ id: 'depts-outline', type: 'line', source: 'depts', paint: { 'line-color': '#94A3B8', 'line-width': 0.5, 'line-opacity': 0.5 }, layout: { visibility: 'none' } });
        for (const f of deptsData.features) {
          const centroid = getCentroid(f.geometry);
          if (!centroid) continue;
          const el = createLabelEl(f.properties.name);
          const marker = new maplibregl.Marker({ element: el }).setLngLat(centroid).addTo(map);
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
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.5, 0.3],
            'fill-opacity-transition': { duration: 200 },
          },
          layout: { visibility: 'none' },
        });
        map.addLayer({ id: 'sp-outline', type: 'line', source: 'sp', paint: { 'line-color': '#94A3B8', 'line-width': 0.4, 'line-opacity': 0.4 }, layout: { visibility: 'none' } });
        for (const f of spData.features) {
          const centroid = getCentroid(f.geometry);
          if (!centroid) continue;
          const el = createLabelEl(f.properties.name);
          const marker = new maplibregl.Marker({ element: el }).setLngLat(centroid).addTo(map);
          el.style.display = 'none';
          labelsRef.current.sp.push({ marker, parentKey: f.properties.departement });
        }
      }

      map.addSource('ecoles', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'ecoles-points', type: 'circle', source: 'ecoles',
        paint: {
          'circle-radius': ['step', ['get', 'eleves_total'], 5, 100, 7, 500, 10, 1000, 14],
          'circle-color': '#E8611A', 'circle-stroke-width': 1.5, 'circle-stroke-color': '#FAF8F3', 'circle-opacity': 0.85,
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
        const sf = map.queryRenderedFeatures(e.point, { layers: ['ecoles-points'] });
        if (sf?.length) { setSelectedSchool(sf[0].properties); return; }

        const level = currentLevelRef.current;
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
      });

      map.on('zoomend', () => {
        if (drillingRef.current) return;
        const z = map.getZoom();
        const level = currentLevelRef.current;
        const data = geoDataRef.current;

        if (level === 'region' && z < 7) {
          handleBack();
        } else if (level === 'departement' && z < 8) {
          handleBack();
        } else if (level === 'sous-prefecture' && z < 10) {
          handleBack();
        }
      });

      syncLabels();
      loadSchools();
      setTimeout(() => setLoading(false), 600);

      if (user?.district_code || user?.region_code || user?.departement_code || user?.commune_code) {
        const zoneCode = user.commune_code || user.departement_code || user.region_code || user.district_code;
        const zoneLevel = user.commune_code ? 'sp' : user.departement_code ? 'depts' : user.region_code ? 'regions' : 'districts';
        const geoData = geoDataRef.current[zoneLevel];
        if (geoData) {
          const feature = geoData.features.find(f => f.properties.code === zoneCode || f.properties.name === zoneCode);
          if (feature) {
            const bbox = getBBox(feature.geometry);
            if (bbox) {
              const dLng = (bbox[1][0] - bbox[0][0]) * 0.2;
              const dLat = (bbox[1][1] - bbox[0][1]) * 0.2;
              map.fitBounds(
                [[bbox[0][0] - dLng, bbox[0][1] - dLat], [bbox[1][0] + dLng, bbox[1][1] + dLat]],
                { padding: 40, duration: 1200 }
              );
            }
          }
        }
      }
    });

    mapInst.current = map;
    return () => map.remove();
  }, []);

  const loadSchools = useCallback(async () => {
    try { const d = await api.getSchools(); setSchoolsData(d); } catch {}
  }, [setSchoolsData]);

  useEffect(() => {
    if (!mapInst.current?.getLayer('ecoles-points') || !schoolsData) return;
    const filtered = schoolsData.features.filter(f => {
      const p = f.properties;
      if (filters.collect_status.length && !filters.collect_status.includes(p.collect_status)) return false;
      if (filters.milieu.length && !filters.milieu.includes(p.milieu_implantation)) return false;
      if (filters.niveau.length && !filters.niveau.includes(p.niveau_enseignement)) return false;
      if (filters.statut.length && !filters.statut.includes(p.statut)) return false;
      if (filters.manque_bancs && (!p.besoin_bancs || p.besoin_bancs <= 0)) return false;
      if (filters.sans_toilettes && p.toilettes_filles_fonctionnelles !== false) return false;
      if (filters.sans_eau && p.eau_potable !== false) return false;
      if (filters.sans_electricite && p.electricite !== false) return false;
      if (filters.manque_enseignants && (!p.enseignants_presents || p.enseignants_presents > 0)) return false;
      if (filters.materiaux_precaires && (!p.materiaux_precaires || p.materiaux_precaires.length === 0)) return false;
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
    mapInst.current.getSource('ecoles')?.setData({ type: 'FeatureCollection', features: filtered });
  }, [filters, schoolsData]);

  const zc = zoneCounts;
  const levelTable = { district: 'districts', region: 'regions', departement: 'departements', 'sous-prefecture': 'communes' };
  const currentTable = zc ? zc[levelTable[currentLevel]] || {} : {};

  const parentName = { region: breadcrumb.district, departement: breadcrumb.region, 'sous-prefecture': breadcrumb.dept }[currentLevel];
  const parentGeoKey = { region: 'districts', departement: 'regions', 'sous-prefecture': 'depts' }[currentLevel];
  const parentCountKey = { region: 'districts', departement: 'regions', 'sous-prefecture': 'departements' }[currentLevel];
  const parentCode = parentName && geoDataRef.current[parentGeoKey]
    ? (geoDataRef.current[parentGeoKey].features.find(f => f.properties.name === parentName)?.properties.code || null)
    : null;

  const scope = currentLevel === 'district'
    ? zc?.national
    : (parentCode && zc ? zc[parentCountKey]?.[parentCode] : null);

  const totalSchools = scope?.schools || 0;
  const totalStudents = scope?.students || 0;
  const totalGirls = scope?.girls || 0;
  const totalBoys = scope?.boys || 0;

  const zoneSchoolStats = {};
  for (const z of zones) {
    if (currentTable[z.code]) zoneSchoolStats[z.code] = currentTable[z.code];
  }
  zoneSchoolStatsRef.current = zoneSchoolStats;

  const maxSchools = Math.max(...zones.map(z => (zoneSchoolStats[z.code]?.schools || 0)), 1);
  const sortedZones = zones.slice().sort((a, b) => (zoneSchoolStats[b.code]?.schools || 0) - (zoneSchoolStats[a.code]?.schools || 0));

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
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 shadow-sm transition ${filters.collect_status.length === 0 && filters.milieu.length === 0 && filters.niveau.length === 0 ? 'bg-[#E8611A] text-white' : 'bg-white/90 backdrop-blur text-[#475569] border border-[#CBD5E1]/20 hover:bg-white'}`}>
              Tous
            </button>
            {[
              { key: 'collected', label: 'Collecte', color: '#E8611A' },
              { key: 'waiting', label: 'En cours', color: '#0B7A3E' },
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
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition ${active ? 'bg-[#0B7A3E] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'}`}>
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
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0B7A3E]" /> En cours</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#94A3B8]" /> En attente</span>
          </div>
          <span className="text-[#E8611A] uppercase tracking-widest text-[9px]">SIG v2.4</span>
        </div>

        <div ref={mapRef} className="absolute inset-0" />
      </div>

      <div className="w-full lg:w-[380px] xl:w-[420px] bg-[#FAF8F3] border-l border-[#CBD5E1]/30 flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b border-[#CBD5E1]/20">
          <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] font-semibold mb-2 flex-wrap">
            <span className="material-symbols-outlined text-[14px] text-[#E8611A]">location_on</span>
            <span className={currentLevel === 'district' ? 'text-[#E8611A] font-bold' : ''}>CI</span>
            {breadcrumb.district && (
              <>
                <span className="material-symbols-outlined text-[10px] text-[#CBD5E1]">chevron_right</span>
                <span className={currentLevel === 'region' ? 'text-[#E8611A] font-bold' : 'text-[#6B7280]'}>{breadcrumb.district}</span>
              </>
            )}
            {breadcrumb.region && (
              <>
                <span className="material-symbols-outlined text-[10px] text-[#CBD5E1]">chevron_right</span>
                <span className={currentLevel === 'departement' ? 'text-[#E8611A] font-bold' : 'text-[#6B7280]'}>{breadcrumb.region}</span>
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
        </div>

        <div className="px-5 py-4 grid grid-cols-3 gap-3 border-b border-[#CBD5E1]/20">
          {(() => {
            const sel = selected ? (zoneSchoolStats[selected.code] || { schools: 0, students: 0, girls: 0, boys: 0 }) : null;
            const s = sel || { schools: totalSchools, students: totalStudents, girls: totalGirls, boys: totalBoys };
            const pctFilles = (s.girls + s.boys) > 0 ? Math.round(s.girls / (s.girls + s.boys) * 100) : 0;
            return (<>
              <StatCard icon="school" label="Écoles" value={s.schools} />
              <StatCard icon="groups" label="Élèves" value={s.students} format="k" />
              <StatCard icon="girl" label="Filles" value={pctFilles} suffix="%" />
            </>);
          })()}
        </div>

        {(() => {
          const sel = selected ? (zoneSchoolStats[selected.code] || { girls: 0, boys: 0 }) : null;
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
                <div className="h-full bg-[#0B7A3E] rounded-r-full flex-1" />
              </div>
              <div className="flex justify-between text-[10px] font-bold mt-1.5">
                <span className="text-[#E8611A]">{pct}% filles</span>
                <span className="text-[#0B7A3E]">{100 - pct}% garçons</span>
              </div>
            </div>
          );
        })()}

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {selectedSchool ? (
            <SchoolFiche school={selectedSchool} onBack={() => setSelectedSchool(null)} />
          ) : selected ? (
            <ZoneDetail zone={selected} level={selected.level || currentLevel} />
          ) : (
            <div className="flex flex-col gap-1.5">
              {sortedZones
                .map((z, i) => {
                const zs = zoneSchoolStats[z.code] || { schools: z.schools || 0, students: z.students || 0, girls: z.girls || 0, boys: z.boys || 0 };
                return (
                <button key={i} onClick={() => drillDown(currentLevel, z.name)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white hover:bg-white hover:shadow-sm transition-all duration-200 text-left group border border-transparent hover:border-[#E8611A]/10">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: `${COLORS[z.status] || COLORS.pending}12`, color: COLORS[z.status] || COLORS.pending }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#0D1B2A] truncate group-hover:text-[#E8611A] transition-colors">{z.name}</p>
                    <p className="text-[10px] text-[#94A3B8] font-medium">{zs.schools.toLocaleString('fr-FR')} écoles · {zs.students ? Math.round(zs.students / 1000) + 'k élèves' : '—'}</p>
                  </div>
                  <div className="w-14 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden shrink-0">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((zs.schools || 0) / maxSchools) * 100}%`, backgroundColor: COLORS[z.status] || COLORS.pending }} />
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

  const totalStudents = zone.students || (detail?.total_ecoles ? 0 : 0);
  const girls = zone.girls || 0;
  const boys = zone.boys || 0;

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
            <p className="text-2xl font-extrabold text-[#0D1B2A] tracking-tight mt-0.5">{(zone.schools || 0).toLocaleString('fr-FR')}</p>
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
            <p className="text-[10px] text-[#0B7A3E] font-bold uppercase tracking-wider">Garçons</p>
            <p className="text-2xl font-extrabold text-[#0B7A3E] tracking-tight mt-0.5">{boys.toLocaleString('fr-FR')}</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Parité F/G</span>
            <span className="text-[10px] font-bold text-[#0D1B2A]">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden flex">
            <div className="h-full bg-[#E8611A] rounded-l-full transition-all duration-500" style={{ width: pct + '%' }} />
            <div className="h-full bg-[#0B7A3E] rounded-r-full flex-1" />
          </div>
          <div className="flex justify-between text-[9px] font-bold mt-1">
            <span className="text-[#E8611A]">{pct}% filles</span>
            <span className="text-[#0B7A3E]">{100 - pct}% garçons</span>
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
                  { icon: 'chair', label: 'Bancs manquants', value: detail.infrastructure.besoin_bancs, color: '#0B7A3E' },
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
                        <div className="h-full bg-[#0B7A3E] rounded-r-full flex-1" />
                      </div>
                      <div className="flex justify-between text-[9px] font-bold mt-0.5">
                        <span className="text-[#E8611A]">{data.filles} F ({pctN}%)</span>
                        <span className="text-[#0B7A3E]">{data.garcons} G</span>
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

function SchoolFiche({ school }) {
  const total = (school.nombre_filles || 0) + (school.nombre_garcons || 0);
  const pctFilles = total > 0 ? Math.round((school.nombre_filles || 0) / total * 100) : 0;
  const inventaire = (() => { try { return typeof school.inventaire_classes === 'string' ? JSON.parse(school.inventaire_classes) : (school.inventaire_classes || []); } catch { return []; } })();
  const besoins = inventaire.reduce((s, c) => s + (c.besoin_bancs || 0), 0);

  const STATUT_LABEL = { public: 'Public', prive_laic: 'Privé laïc', prive_confessionnel: 'Privé confessionnel', communautaire_non_reconnue: 'Communautaire' };
  const NIVEAU_LABEL = { primaire: 'Primaire', secondaire: 'Secondaire' };
  const STATUS_COLORS = { collected: '#E8611A', waiting: '#0B7A3E', pending: '#CBD5E1' };

  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
        <div className="flex items-center justify-between mb-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: `${STATUS_COLORS[school.collect_status] || '#CBD5E1'}10`, color: STATUS_COLORS[school.collect_status] || '#CBD5E1' }}>
            {school.collect_status === 'collected' ? 'Collecté' : school.collect_status === 'waiting' ? 'En cours' : 'En attente'}
          </span>
          <span className="text-[10px] text-[#94A3B8] font-mono">{school.code_mena}</span>
        </div>
        <h3 className="text-[15px] font-extrabold text-[#0D1B2A] leading-tight">{school.nom_etablissement}</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F1F5F9] text-[#475569]">{STATUT_LABEL[school.statut] || school.statut}</span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F1F5F9] text-[#475569]">{NIVEAU_LABEL[school.niveau_enseignement] || school.niveau_enseignement}</span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F1F5F9] text-[#475569] capitalize">{school.milieu_implantation}</span>
        </div>
      </div>

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
            <p className="text-2xl font-extrabold text-[#0B7A3E]">{(school.nombre_garcons || 0).toLocaleString('fr-FR')}</p>
            <p className="text-[9px] font-bold text-[#0B7A3E] uppercase">Garçons {100 - pctFilles}%</p>
          </div>
        </div>
        <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden flex mt-3">
          <div className="h-full bg-[#E8611A] rounded-l-full transition-all" style={{ width: `${pctFilles}%` }} />
          <div className="h-full bg-[#0B7A3E] rounded-r-full flex-1" />
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] font-bold">
          <span className="text-[#94A3B8]">{school.enseignants_presents || 0} enseignants · {school.salles_classe_total || 0} salles</span>
          {total > 0 && school.enseignants_presents > 0 && <span className="text-[#475569]">Ratio {Math.round(total / school.enseignants_presents)}:1</span>}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
        <h4 className="text-[11px] font-bold text-[#0D1B2A] uppercase tracking-wider mb-3">Infrastructure</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Eau potable', ok: school.eau_potable, icon: 'water_drop' },
            { label: 'Électricité', ok: school.electricite, icon: 'bolt' },
            { label: 'Toilettes filles', ok: school.toilettes_filles_fonctionnelles, icon: 'wc' },
            { label: 'Bancs', ok: besoins === 0, icon: 'chair', extra: besoins > 0 ? `${besoins} besoins` : 'OK' },
          ].map(item => (
            <div key={item.label} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-bold ${item.ok ? 'bg-[#0B7A3E]/8 text-[#0B7A3E]' : 'bg-[#ba1a1a]/8 text-[#ba1a1a]'}`}>
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
                <span className="w-10 text-center text-[#0B7A3E]">{cl.garcons || 0}</span>
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
