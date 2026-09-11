import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../../stores/mapStore';
import { api } from '../../services/api';

const COLORS = {
  collected: '#E8611A',
  waiting: '#0B7A3E',
  pending: '#CBD5E1',
};

const STATUS_LABEL = {
  collected: 'Collecte',
  waiting: 'En attente',
  pending: 'Non programm\u00e9',
};

const GEOJSON_PATHS = {
  districts: '/districts.geojson',
  regions: '/regions.geojson',
  depts: '/depts.geojson',
  sp: '/sous_prefectures.geojson',
};

function getCentroid(geometry) {
  if (!geometry) return null;
  let coords;
  if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0];
  } else if (geometry.type === 'MultiPolygon') {
    let maxArea = 0;
    let bestRing = null;
    for (const poly of geometry.coordinates) {
      const ring = poly[0];
      let area = 0;
      for (let i = 0; i < ring.length - 1; i++) {
        area += Math.abs(ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]);
      }
      if (area > maxArea) { maxArea = area; bestRing = ring; }
    }
    coords = bestRing || geometry.coordinates[0][0];
  } else {
    return null;
  }
  let lng = 0, lat = 0;
  for (const c of coords) { lng += c[0]; lat += c[1]; }
  return [lng / coords.length, lat / coords.length];
}

function createLabelEl(name) {
  const el = document.createElement('div');
  el.className = 'map-label';
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

export default function Explorer() {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { filters, schoolsData, setSchoolsData } = useMapStore();
  const [selected, setSelected] = useState(null);
  const [currentLevel, setCurrentLevel] = useState('district');
  const [zones, setZones] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState({ district: null, region: null, dept: null });

  const labelsRef = useRef({ districts: {}, regions: {}, depts: {}, sp: {} });
  const selDistRef = useRef(null);
  const selRegRef = useRef(null);
  const selDeptRef = useRef(null);
  const geoDataRef = useRef({ districts: null, regions: null, depts: null, sp: null });
  const currentLevelRef = useRef('district');

  const showZoneDetail = useCallback((level, props) => {
    setSelected({
      name: props.name,
      level,
      status: props.status,
      schools: props.schools,
      students: props.students,
      girls: props.girls,
      boys: props.boys,
    });
  }, []);

  const fitToFeature = useCallback((map, geometry, pad) => {
    const bbox = getBBox(geometry);
    if (!bbox) return;
    const p = pad || 0.15;
    const dLng = (bbox[1][0] - bbox[0][0]) * p;
    const dLat = (bbox[1][1] - bbox[0][1]) * p;
    map.fitBounds(
      [[bbox[0][0] - dLng, bbox[0][1] - dLat], [bbox[1][0] + dLng, bbox[1][1] + dLat]],
      { padding: 40, duration: 700 }
    );
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

    } else {
      return;
    }

    setSelected(null);
    setZones(nextZones);
    setCurrentLevel(nextLevel);
    currentLevelRef.current = nextLevel;

    syncLabels(map, nextLevel);

    const parentData = level === 'district' ? data.districts : level === 'region' ? data.regions : data.depts;
    const feat = parentData?.features?.find(f => f.properties?.name === name);
    if (feat?.geometry) {
      fitToFeature(map, feat.geometry, 0.15);
    }
  }, [fitToFeature]);

  const handleBack = useCallback(() => {
    setSelected(null);
    const map = mapInst.current;
    if (!map) return;
    const data = geoDataRef.current;
    const setVis = (ls, v) => ls.forEach(l => { if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', v); });

    if (currentLevelRef.current === 'sous-prefecture') {
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
      map.flyTo({ center: [-5.5, 7.0], zoom: 5.5, duration: 800 });
      setCurrentLevel('district');
      currentLevelRef.current = 'district';
    }

    syncLabels(map, currentLevelRef.current);
  }, []);

  const syncLabels = useCallback((map, level) => {
    const labels = labelsRef.current;
    const hideAll = (obj) => Object.values(obj).forEach(arr => arr.forEach(m => m.getElement().style.display = 'none'));
    hideAll(labels.districts);
    hideAll(labels.regions);
    hideAll(labels.depts);
    hideAll(labels.sp);

    if (level === 'district') {
      Object.values(labels.districts).forEach(arr => arr.forEach(m => m.getElement().style.display = ''));
    } else if (level === 'region') {
      const selD = selDistRef.current;
      Object.entries(labels.regions).forEach(([dist, markers]) => {
        markers.forEach(m => {
          m.getElement().style.display = (dist === selD) ? '' : 'none';
        });
      });
    } else if (level === 'departement') {
      const selR = selRegRef.current;
      Object.entries(labels.depts).forEach(([reg, markers]) => {
        markers.forEach(m => {
          m.getElement().style.display = (reg === selR) ? '' : 'none';
        });
      });
    } else if (level === 'sous-prefecture') {
      const selDe = selDeptRef.current;
      Object.entries(labels.sp).forEach(([dept, markers]) => {
        markers.forEach(m => {
          m.getElement().style.display = (dept === selDe) ? '' : 'none';
        });
      });
    }
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
          const name = f.properties.name;
          const el = createLabelEl(name);
          const marker = new maplibregl.Marker({ element: el }).setLngLat(centroid).addTo(map);
          if (!labelsRef.current.districts[name]) labelsRef.current.districts[name] = [];
          labelsRef.current.districts[name].push(marker);
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
          const name = f.properties.name;
          const district = f.properties.district;
          const el = createLabelEl(name);
          const marker = new maplibregl.Marker({ element: el }).setLngLat(centroid).addTo(map);
          el.style.display = 'none';
          if (!labelsRef.current.regions[district]) labelsRef.current.regions[district] = [];
          labelsRef.current.regions[district].push(marker);
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
          const name = f.properties.name;
          const region = f.properties.region;
          const el = createLabelEl(name);
          const marker = new maplibregl.Marker({ element: el }).setLngLat(centroid).addTo(map);
          el.style.display = 'none';
          if (!labelsRef.current.depts[region]) labelsRef.current.depts[region] = [];
          labelsRef.current.depts[region].push(marker);
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
          const name = f.properties.name;
          const dept = f.properties.departement;
          const el = createLabelEl(name);
          const marker = new maplibregl.Marker({ element: el }).setLngLat(centroid).addTo(map);
          el.style.display = 'none';
          if (!labelsRef.current.sp[dept]) labelsRef.current.sp[dept] = [];
          labelsRef.current.sp[dept].push(marker);
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
        if (sf?.length) { const id = sf[0].properties?.id; if (id) navigate('/ecole/' + id); return; }

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
          if (zf?.length) {
            showZoneDetail(level, zf[0].properties);
            const feat = geoDataRef.current.sp?.features?.find(f => f.properties?.name === zf[0].properties.name);
            if (feat?.geometry) fitToFeature(map, feat.geometry, 0.3);
          }
        }
      });

      syncLabels(map, 'district');
      loadSchools();
      setTimeout(() => setLoading(false), 600);
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
      if (filters.manque_bancs && (!p.besoin_bancs || p.besoin_bancs <= 0)) return false;
      return true;
    });
    mapInst.current.getSource('ecoles')?.setData({ type: 'FeatureCollection', features: filtered });
  }, [filters, schoolsData]);

  const totalSchools = zones.reduce((s, z) => s + (z.schools || 0), 0);
  const totalStudents = zones.reduce((s, z) => s + (z.students || 0), 0);
  const totalGirls = zones.reduce((s, z) => s + (z.girls || 0), 0);
  const totalBoys = zones.reduce((s, z) => s + (z.boys || 0), 0);
  const maxSchools = Math.max(...zones.map(z => z.schools || 0), 1);

  const levelLabel = { district: 'Districts', region: 'R\u00e9gions', departement: 'D\u00e9partements', 'sous-prefecture': 'Sous-pr\u00e9fectures' };

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
            <button className="w-11 h-11 rounded-xl bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg border border-[#CBD5E1]/20 shrink-0 hover:bg-white transition">
              <span className="material-symbols-outlined text-[18px] text-[#475569]">tune</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2">
            <button className="px-3 py-1.5 rounded-full bg-[#E8611A] text-white text-[11px] font-bold shrink-0 shadow-sm">Tous</button>
            <button className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-[#475569] text-[11px] font-semibold shrink-0 shadow-sm flex items-center gap-1.5 border border-[#CBD5E1]/20 hover:bg-white transition">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8611A]" /> Collecte
            </button>
            <button className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-[#475569] text-[11px] font-semibold shrink-0 shadow-sm flex items-center gap-1.5 border border-[#CBD5E1]/20 hover:bg-white transition">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0B7A3E]" /> En cours
            </button>
            <button className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-[#475569] text-[11px] font-semibold shrink-0 shadow-sm flex items-center gap-1.5 border border-[#CBD5E1]/20 hover:bg-white transition">
              <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" /> En attente
            </button>
          </div>
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
          </div>
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-[#0D1B2A] text-lg tracking-tight">
              {levelLabel[currentLevel]}
            </h2>
            {currentLevel !== 'district' && (
              <button onClick={handleBack}
                className="flex items-center gap-1 text-[11px] text-[#E8611A] font-bold hover:bg-[#E8611A]/5 px-2 py-1 rounded-lg transition">
                <span className="material-symbols-outlined text-[14px]">arrow_back</span> Retour
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">{zones.length} {currentLevel === 'district' ? 'districts' : currentLevel === 'region' ? 'r\u00e9gions' : currentLevel === 'departement' ? 'd\u00e9partements' : 'sous-pr\u00e9fectures'}</p>
        </div>

        <div className="px-5 py-4 grid grid-cols-3 gap-3 border-b border-[#CBD5E1]/20">
          <StatCard icon="school" label="\u00c9coles" value={selected ? (selected.schools || 0) : totalSchools} />
          <StatCard icon="groups" label="\u00c9l\u00e8ves" value={selected ? (selected.students || 0) : totalStudents} format="k" />
          <StatCard icon="girl" label="Filles" value={
            selected
              ? (selected.girls && selected.boys ? Math.round(selected.girls / (selected.girls + selected.boys) * 100) : 0)
              : (totalGirls && totalBoys ? Math.round(totalGirls / (totalGirls + totalBoys) * 100) : 0)
          } suffix="%" />
        </div>

        {(selected ? selected.girls > 0 : totalGirls > 0) && (
          <div className="px-5 py-3 border-b border-[#CBD5E1]/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Parit\u00e9 filles/gar\u00e7ons</span>
            </div>
            <div className="w-full h-2 bg-white rounded-full overflow-hidden flex">
              <div className="h-full bg-[#E8611A] rounded-l-full transition-all duration-500"
                style={{ width: `${selected ? Math.round(selected.girls / (selected.girls + selected.boys) * 100) : Math.round(totalGirls / (totalGirls + totalBoys) * 100)}%` }} />
              <div className="h-full bg-[#0B7A3E] rounded-r-full flex-1" />
            </div>
            <div className="flex justify-between text-[10px] font-bold mt-1.5">
              <span className="text-[#E8611A]">{selected ? Math.round(selected.girls / (selected.girls + selected.boys) * 100) : Math.round(totalGirls / (totalGirls + totalBoys) * 100)}% filles</span>
              <span className="text-[#0B7A3E]">{selected ? 100 - Math.round(selected.girls / (selected.girls + selected.boys) * 100) : 100 - Math.round(totalGirls / (totalGirls + totalBoys) * 100)}% gar\u00e7ons</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {selected ? (
            <ZoneDetail zone={selected} />
          ) : (
            <div className="flex flex-col gap-1.5">
              {zones
                .sort((a, b) => (b.schools || 0) - (a.schools || 0))
                .map((z, i) => (
                <button key={i} onClick={() => currentLevel === 'sous-prefecture' ? showZoneDetail(currentLevel, z) : drillDown(currentLevel, z.name)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white hover:bg-white hover:shadow-sm transition-all duration-200 text-left group border border-transparent hover:border-[#E8611A]/10">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: `${COLORS[z.status] || COLORS.pending}12`, color: COLORS[z.status] || COLORS.pending }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#0D1B2A] truncate group-hover:text-[#E8611A] transition-colors">{z.name}</p>
                    <p className="text-[10px] text-[#94A3B8] font-medium">{(z.schools || 0).toLocaleString('fr-FR')} \u00e9coles &middot; {z.students ? Math.round(z.students / 1000) + 'k \u00e9l\u00e8ves' : '\u2014'}</p>
                  </div>
                  <div className="w-14 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden shrink-0">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((z.schools || 0) / maxSchools) * 100}%`, backgroundColor: COLORS[z.status] || COLORS.pending }} />
                  </div>
                </button>
              ))}
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

function ZoneDetail({ zone }) {
  const pct = zone.girls && zone.boys ? Math.round(zone.girls / (zone.girls + zone.boys) * 100) : 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
        <div className="flex items-center justify-between mb-4">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: `${COLORS[zone.status] || COLORS.pending}10`,
              color: COLORS[zone.status] || COLORS.pending,
            }}>
            {STATUS_LABEL[zone.status] || zone.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">\u00c9coles</p>
            <p className="text-2xl font-extrabold text-[#0D1B2A] tracking-tight mt-0.5">{(zone.schools || 0).toLocaleString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">\u00c9l\u00e8ves</p>
            <p className="text-2xl font-extrabold text-[#0D1B2A] tracking-tight mt-0.5">{zone.students ? Math.round(zone.students / 1000) + 'k' : '\u2014'}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Filles</p>
            <p className="text-2xl font-extrabold text-[#E8611A] tracking-tight mt-0.5">{pct}%</p>
          </div>
          <div>
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Gar\u00e7ons</p>
            <p className="text-2xl font-extrabold text-[#0B7A3E] tracking-tight mt-0.5">{100 - pct}%</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Parit\u00e9</span>
          </div>
          <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden flex">
            <div className="h-full bg-[#E8611A] rounded-l-full transition-all duration-500" style={{ width: pct + '%' }} />
            <div className="h-full bg-[#0B7A3E] rounded-r-full flex-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
