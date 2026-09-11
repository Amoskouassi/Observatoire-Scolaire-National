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
    // Use the largest polygon for centroid
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

function createLabelMarker(name, status, zoomThreshold) {
  const el = document.createElement('div');
  el.className = 'district-label-marker';
  el.textContent = name;
  el.dataset.zoomThreshold = zoomThreshold;
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
    transition: opacity 0.2s ease;
  `;
  return el;
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

  const markersRef = useRef({ districts: [], regions: [], depts: [], sp: [] });
  const selectedDistrictRef = useRef(null);
  const selectedRegionRef = useRef(null);
  const selectedDeptRef = useRef(null);
  const allDistrictsRef = useRef(null);
  const allRegionsRef = useRef(null);
  const allDeptsRef = useRef(null);
  const allSPRef = useRef(null);
  const updateLayersRef = useRef(null);
  const updateLabelsRef = useRef(null);
  const drillingRef = useRef(false);

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

      // Districts fill + outline
      if (districtsData) {
        allDistrictsRef.current = districtsData;
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
        // HTML markers for labels
        for (const f of districtsData.features) {
          const centroid = getCentroid(f.geometry);
          if (!centroid) continue;
          const el = createLabelMarker(f.properties.name, f.properties.status, 7);
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat(centroid)
            .addTo(map);
          markersRef.current.districts.push(marker);
        }
      }

      // Regions fill + outline
      if (regionsData) {
        allRegionsRef.current = regionsData;
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
          const el = createLabelMarker(f.properties.name, f.properties.status, 9);
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat(centroid)
            .addTo(map);
          el.style.display = 'none';
          markersRef.current.regions.push(marker);
        }
      }

      // Depts fill + outline
      if (deptsData) {
        allDeptsRef.current = deptsData;
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
          const el = createLabelMarker(f.properties.name, f.properties.status, 11);
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat(centroid)
            .addTo(map);
          el.style.display = 'none';
          markersRef.current.depts.push(marker);
        }
      }

      // SP fill + outline
      if (spData) {
        allSPRef.current = spData;
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
          const el = createLabelMarker(f.properties.name, f.properties.status, 13);
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat(centroid)
            .addTo(map);
          el.style.display = 'none';
          markersRef.current.sp.push(marker);
        }
      }

      // Schools source
      map.addSource('ecoles', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'ecoles-points', type: 'circle', source: 'ecoles',
        paint: {
          'circle-radius': ['step', ['get', 'eleves_total'], 5, 100, 7, 500, 10, 1000, 14],
          'circle-color': '#E8611A', 'circle-stroke-width': 1.5, 'circle-stroke-color': '#FAF8F3', 'circle-opacity': 0.85,
        },
      });

      // Hover
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

      // Click
      map.on('click', (e) => {
        const sf = map.queryRenderedFeatures(e.point, { layers: ['ecoles-points'] });
        if (sf?.length) { const id = sf[0].properties?.id; if (id) navigate('/ecole/' + id); return; }

        const z = map.getZoom();
        let layer = z < 7 ? 'districts-fill' : z < 9 ? 'regions-fill' : z < 11 ? 'depts-fill' : 'sp-fill';
        let sourceKey = z < 7 ? 'districts' : z < 9 ? 'regions' : z < 11 ? 'depts' : 'sp';
        const zf = map.queryRenderedFeatures(e.point, { layers: [layer] });
        if (zf?.length) {
          drillingRef.current = true;
          const p = zf[0].properties;
          const name = p.name;
          const setVis = (ls, v) => ls.forEach(l => { if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', v); });

          if (z < 7) {
            // Click district → set refs, show regions of that district, zoom to dept
            selectedDistrictRef.current = name;
            selectedRegionRef.current = null;
            selectedDeptRef.current = null;
            if (allRegionsRef.current) {
              const filtered = { type: 'FeatureCollection', features: allRegionsRef.current.features.filter(f => f.properties.district === name) };
              map.getSource('regions')?.setData(filtered);
            }
            // Reset depts/sp
            if (allDeptsRef.current) map.getSource('depts')?.setData(allDeptsRef.current);
            if (allSPRef.current) map.getSource('sp')?.setData(allSPRef.current);
            setVis(['districts-fill', 'districts-outline'], 'visible');
            setVis(['regions-fill', 'regions-outline'], 'visible');
            setVis(['depts-fill', 'depts-outline'], 'none');
            setVis(['sp-fill', 'sp-outline'], 'none');

          } else if (z >= 7 && z < 9) {
            // Click region → set refs, show depts of that region, zoom to SP
            const regionFeat = allRegionsRef.current?.features?.find(f => f.properties.name === name);
            selectedDistrictRef.current = regionFeat?.properties?.district || selectedDistrictRef.current;
            selectedRegionRef.current = name;
            selectedDeptRef.current = null;
            if (allDeptsRef.current) {
              const filtered = { type: 'FeatureCollection', features: allDeptsRef.current.features.filter(f => f.properties.region === name) };
              map.getSource('depts')?.setData(filtered);
            }
            if (allSPRef.current) map.getSource('sp')?.setData(allSPRef.current);
            setVis(['regions-fill'], 'none');
            setVis(['regions-outline'], 'visible');
            setVis(['depts-fill', 'depts-outline'], 'visible');
            setVis(['sp-fill', 'sp-outline'], 'none');

          } else if (z >= 9 && z < 11) {
            // Click dept → set refs, show SPs of that dept
            const deptFeat = allDeptsRef.current?.features?.find(f => f.properties.name === name);
            selectedRegionRef.current = deptFeat?.properties?.region || selectedRegionRef.current;
            selectedDeptRef.current = name;
            if (allSPRef.current) {
              const filtered = { type: 'FeatureCollection', features: allSPRef.current.features.filter(f => f.properties.departement === name) };
              map.getSource('sp')?.setData(filtered);
            }
            setVis(['depts-fill'], 'none');
            setVis(['depts-outline'], 'visible');
            setVis(['sp-fill', 'sp-outline'], 'visible');
          }

          // Set panel info
          const level = z < 7 ? 'district' : z < 9 ? 'r\u00e9gion' : z < 11 ? 'd\u00e9partement' : 'sous-pr\u00e9fecture';
          setSelected({
            name: name,
            level: level,
            status: p.status,
            schools: p.schools,
            students: p.students,
            girls: p.girls,
            boys: p.boys,
          });

          // Zoom to clicked zone
          const feat = map.getSource(sourceKey)?._data?.features?.find(f => f.properties?.name === name);
          if (feat?.geometry) {
            let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
            const coords = feat.geometry.type === 'Polygon' ? feat.geometry.coordinates
              : feat.geometry.type === 'MultiPolygon' ? feat.geometry.coordinates.flat()
              : [];
            for (const ring of coords) {
              for (const c of ring) {
                if (c[0] < minLng) minLng = c[0];
                if (c[0] > maxLng) maxLng = c[0];
                if (c[1] < minLat) minLat = c[1];
                if (c[1] > maxLat) maxLat = c[1];
              }
            }
            if (isFinite(minLng) && isFinite(maxLng) && isFinite(minLat) && isFinite(maxLat)) {
              const padLng = (maxLng - minLng) * 0.02;
              const padLat = (maxLat - minLat) * 0.02;
              map.fitBounds(
                [[minLng - padLng, minLat - padLat], [maxLng + padLng, maxLat + padLat]],
                { padding: 40, duration: 600 }
              );
              setTimeout(() => { drillingRef.current = false; updateLayersRef.current?.(); updateLabelsRef.current?.(); }, 700);
            }
          }
        }
      });

      // Zoom-based visibility
      const setVis = (ls, v) => ls.forEach(l => { if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', v); });

      const updateLabels = () => {
        if (drillingRef.current) return;
        const z = map.getZoom();
        const selDist = selectedDistrictRef.current;
        const selReg = selectedRegionRef.current;
        const selDept = selectedDeptRef.current;
        const hide = (markers) => markers.forEach(m => {
          m.getElement().style.display = 'none';
        });

        hide(markersRef.current.districts);
        hide(markersRef.current.regions);
        hide(markersRef.current.depts);
        hide(markersRef.current.sp);

        if (z < 7) {
          markersRef.current.districts.forEach(m => m.getElement().style.display = '');
        } else if (z < 9) {
          markersRef.current.regions.forEach((m, i) => {
            const allFeats = allRegionsRef.current?.features || [];
            const feat = allFeats[i];
            const belongsToSel = feat && feat.properties.district === selDist;
            m.getElement().style.display = belongsToSel ? '' : 'none';
          });
        } else if (z < 11) {
          markersRef.current.depts.forEach((m, i) => {
            const allFeats = allDeptsRef.current?.features || [];
            const feat = allFeats[i];
            const belongsToSel = feat && feat.properties.region === selReg;
            m.getElement().style.display = belongsToSel ? '' : 'none';
          });
        } else {
          markersRef.current.sp.forEach((m, i) => {
            const allFeats = allSPRef.current?.features || [];
            const feat = allFeats[i];
            const belongsToSel = feat && feat.properties.departement === selDept;
            m.getElement().style.display = belongsToSel ? '' : 'none';
          });
        }
      };

      const updateLayers = () => {
        if (drillingRef.current) return; // Skip during drill-down animation
        const z = map.getZoom();
        const selDist = selectedDistrictRef.current;
        const selReg = selectedRegionRef.current;
        const selDept = selectedDeptRef.current;

        // Districts: ALWAYS visible
        setVis(['districts-fill', 'districts-outline'], 'visible');
        if (districtsData) map.getSource('districts')?.setData(districtsData);
        setVis(['sp-fill', 'sp-outline'], 'none');

        if (z < 7) {
          // National: districts only
          setVis(['regions-fill', 'regions-outline'], 'none');
          setVis(['depts-fill', 'depts-outline'], 'none');
          setCurrentLevel('district');
          setZones(districtsData?.features?.map(f => f.properties) || []);
          if (allRegionsRef.current) map.getSource('regions')?.setData(allRegionsRef.current);
          if (allDeptsRef.current) map.getSource('depts')?.setData(allDeptsRef.current);
          if (allSPRef.current) map.getSource('sp')?.setData(allSPRef.current);
        } else if (z < 9) {
          // Region view: selected district's regions
          setVis(['regions-fill', 'regions-outline'], 'visible');
          setVis(['depts-fill', 'depts-outline'], 'none');
          setCurrentLevel('r\u00e9gion');
          if (selDist && allRegionsRef.current) {
            const filtered = {
              type: 'FeatureCollection',
              features: allRegionsRef.current.features.filter(f => f.properties.district === selDist),
            };
            map.getSource('regions')?.setData(filtered);
            setZones(filtered.features.map(f => f.properties));
          } else {
            setZones(allRegionsRef.current?.features?.map(f => f.properties) || []);
          }
          if (allDeptsRef.current) map.getSource('depts')?.setData(allDeptsRef.current);
          if (allSPRef.current) map.getSource('sp')?.setData(allSPRef.current);
        } else if (z < 11) {
          // Dept view: selected region's depts
          setVis(['regions-fill'], 'none');
          setVis(['regions-outline'], 'visible');
          setVis(['depts-fill', 'depts-outline'], 'visible');
          setCurrentLevel('d\u00e9partement');
          if (selReg && allDeptsRef.current) {
            const filtered = {
              type: 'FeatureCollection',
              features: allDeptsRef.current.features.filter(f => f.properties.region === selReg),
            };
            map.getSource('depts')?.setData(filtered);
            setZones(filtered.features.map(f => f.properties));
          } else {
            setZones(allDeptsRef.current?.features?.map(f => f.properties) || []);
          }
          if (allSPRef.current) map.getSource('sp')?.setData(allSPRef.current);
        } else {
          // SP view: selected dept's sous-prefectures
          setVis(['depts-fill'], 'none');
          setVis(['depts-outline'], 'visible');
          setVis(['sp-fill', 'sp-outline'], 'visible');
          setCurrentLevel('sous-pr\u00e9fecture');
          if (selDept && allSPRef.current) {
            const filtered = {
              type: 'FeatureCollection',
              features: allSPRef.current.features.filter(f => f.properties.departement === selDept),
            };
            map.getSource('sp')?.setData(filtered);
            setZones(filtered.features.map(f => f.properties));
          } else {
            setZones(allSPRef.current?.features?.map(f => f.properties) || []);
          }
        }
        updateLabels();
      };

      updateLayersRef.current = updateLayers;
      updateLabelsRef.current = updateLabels;

      map.on('zoomend', updateLayers);
      map.on('move', updateLabels);
      updateLayers();

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

  const levelLabel = { district: 'Districts', 'r\u00e9gion': 'R\u00e9gions', 'd\u00e9partement': 'D\u00e9partements', 'sous-pr\u00e9fecture': 'Sous-pr\u00e9fectures' };

  const handleBack = () => {
    setSelected(null);
    const map = mapInst.current;
    if (!map) return;
    const setVis = (ls, v) => ls.forEach(l => { if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', v); });

    if (currentLevel === 'sous-préfecture') {
      // Back to depts
      const parentRegion = selectedRegionRef.current;
      if (parentRegion && allDeptsRef.current) {
        const filtered = { type: 'FeatureCollection', features: allDeptsRef.current.features.filter(f => f.properties.region === parentRegion) };
        map.getSource('depts')?.setData(filtered);
        setZones(filtered.features.map(f => f.properties));
      }
      selectedDeptRef.current = null;
      setBreadcrumb(prev => ({ ...prev, dept: null }));
      setVis(['depts-fill', 'depts-outline'], 'visible');
      setVis(['sp-fill', 'sp-outline'], 'none');
      setCurrentLevel('département');
    } else if (currentLevel === 'département') {
      // Back to regions
      const parentDistrict = selectedDistrictRef.current;
      if (parentDistrict && allRegionsRef.current) {
        const filtered = { type: 'FeatureCollection', features: allRegionsRef.current.features.filter(f => f.properties.district === parentDistrict) };
        map.getSource('regions')?.setData(filtered);
        setZones(filtered.features.map(f => f.properties));
      }
      selectedRegionRef.current = null;
      setBreadcrumb(prev => ({ ...prev, region: null, dept: null }));
      setVis(['regions-fill', 'regions-outline'], 'visible');
      setVis(['depts-fill', 'depts-outline'], 'none');
      setCurrentLevel('région');
    } else if (currentLevel === 'région') {
      // Back to districts
      selectedDistrictRef.current = null;
      setBreadcrumb({ district: null, region: null, dept: null });
      if (allDistrictsRef.current) {
        map.getSource('districts')?.setData(allDistrictsRef.current);
        setZones(allDistrictsRef.current.features.map(f => f.properties));
      }
      if (allRegionsRef.current) map.getSource('regions')?.setData(allRegionsRef.current);
      if (allDeptsRef.current) map.getSource('depts')?.setData(allDeptsRef.current);
      if (allSPRef.current) map.getSource('sp')?.setData(allSPRef.current);
      setVis(['districts-fill', 'districts-outline'], 'visible');
      setVis(['regions-fill', 'regions-outline'], 'none');
      setVis(['depts-fill', 'depts-outline'], 'none');
      setVis(['sp-fill', 'sp-outline'], 'none');
      map.flyTo({ center: [-5.5, 7.0], zoom: 5.5, duration: 800 });
      setCurrentLevel('district');
    }
  };

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
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[#CBD5E1]/20">
          <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] font-semibold mb-2 flex-wrap">
            <span className="material-symbols-outlined text-[14px] text-[#E8611A]">location_on</span>
            <span className={currentLevel === 'district' ? 'text-[#E8611A] font-bold' : ''}>CI</span>
            {breadcrumb.district && (
              <>
                <span className="material-symbols-outlined text-[10px] text-[#CBD5E1]">chevron_right</span>
                <span className={currentLevel === 'r\u00e9gion' ? 'text-[#E8611A] font-bold' : 'text-[#6B7280]'}>{breadcrumb.district}</span>
              </>
            )}
            {breadcrumb.region && (
              <>
                <span className="material-symbols-outlined text-[10px] text-[#CBD5E1]">chevron_right</span>
                <span className={currentLevel === 'd\u00e9partement' ? 'text-[#E8611A] font-bold' : 'text-[#6B7280]'}>{breadcrumb.region}</span>
              </>
            )}
            {breadcrumb.dept && (
              <>
                <span className="material-symbols-outlined text-[10px] text-[#CBD5E1]">chevron_right</span>
                <span className={currentLevel === 'sous-pr\u00e9fecture' ? 'text-[#E8611A] font-bold' : 'text-[#6B7280]'}>{breadcrumb.dept}</span>
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
          <p className="text-[11px] text-[#94A3B8] mt-1">{zones.length} {currentLevel === 'district' ? 'districts' : currentLevel === 'r\u00e9gion' ? 'r\u00e9gions' : currentLevel === 'd\u00e9partement' ? 'd\u00e9partements' : 'sous-pr\u00e9fectures'}</p>
        </div>

        {/* Stats */}
        <div className="px-5 py-4 grid grid-cols-3 gap-3 border-b border-[#CBD5E1]/20">
          <StatCard icon="school" label="\u00c9coles" value={selected ? (selected.schools || 0) : totalSchools} />
          <StatCard icon="groups" label="\u00c9l\u00e8ves" value={selected ? (selected.students || 0) : totalStudents} format="k" />
          <StatCard icon="girl" label="Filles" value={
            selected
              ? (selected.girls && selected.boys ? Math.round(selected.girls / (selected.girls + selected.boys) * 100) : 0)
              : (totalGirls && totalBoys ? Math.round(totalGirls / (totalGirls + totalBoys) * 100) : 0)
          } suffix="%" />
        </div>

        {/* Gender bar */}
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

        {/* Zone list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {selected ? (
            <ZoneDetail zone={selected} />
          ) : (
            <div className="flex flex-col gap-1.5">
              {zones
                .sort((a, b) => (b.schools || 0) - (a.schools || 0))
                .map((z, i) => (
                <button key={i} onClick={() => {
                  // DON'T setSelected here — list click navigates/drills down, doesn't show detail
                  drillingRef.current = true;
                  const zmap = mapInst.current;
                  if (!zmap) return;
                  const setVis = (ls, v) => ls.forEach(l => { if (zmap.getLayer(l)) zmap.setLayoutProperty(l, 'visibility', v); });

                  if (currentLevel === 'district') {
                    // Click district → show regions of that district
                    selectedDistrictRef.current = z.name;
                    selectedRegionRef.current = null;
                    selectedDeptRef.current = null;
                    setBreadcrumb({ district: z.name, region: null, dept: null });
                    if (allRegionsRef.current) {
                      const filtered = { type: 'FeatureCollection', features: allRegionsRef.current.features.filter(f => f.properties.district === z.name) };
                      zmap.getSource('regions')?.setData(filtered);
                      setZones(filtered.features.map(f => f.properties));
                    }
                    if (allDeptsRef.current) zmap.getSource('depts')?.setData(allDeptsRef.current);
                    if (allSPRef.current) zmap.getSource('sp')?.setData(allSPRef.current);
                    setVis(['districts-fill', 'districts-outline'], 'visible');
                    setVis(['regions-fill', 'regions-outline'], 'visible');
                    setVis(['depts-fill', 'depts-outline'], 'none');
                    setVis(['sp-fill', 'sp-outline'], 'none');
                    setCurrentLevel('région');

                  } else if (currentLevel === 'région') {
                    // Click region → show depts of that region
                    const regionFeat = allRegionsRef.current?.features?.find(f => f.properties.name === z.name);
                    selectedDistrictRef.current = regionFeat?.properties?.district || selectedDistrictRef.current;
                    selectedRegionRef.current = z.name;
                    selectedDeptRef.current = null;
                    setBreadcrumb(prev => ({ ...prev, region: z.name, dept: null }));
                    if (allDeptsRef.current) {
                      const filtered = { type: 'FeatureCollection', features: allDeptsRef.current.features.filter(f => f.properties.region === z.name) };
                      zmap.getSource('depts')?.setData(filtered);
                      setZones(filtered.features.map(f => f.properties));
                    }
                    if (allSPRef.current) zmap.getSource('sp')?.setData(allSPRef.current);
                    setVis(['regions-fill'], 'none');
                    setVis(['regions-outline'], 'visible');
                    setVis(['depts-fill', 'depts-outline'], 'visible');
                    setVis(['sp-fill', 'sp-outline'], 'none');
                    setCurrentLevel('département');

                  } else if (currentLevel === 'département') {
                    // Click dept → show SPs of that dept
                    const deptFeat = allDeptsRef.current?.features?.find(f => f.properties.name === z.name);
                    selectedRegionRef.current = deptFeat?.properties?.region || selectedRegionRef.current;
                    selectedDeptRef.current = z.name;
                    setBreadcrumb(prev => ({ ...prev, dept: z.name }));
                    if (allSPRef.current) {
                      const filtered = { type: 'FeatureCollection', features: allSPRef.current.features.filter(f => f.properties.departement === z.name) };
                      zmap.getSource('sp')?.setData(filtered);
                      setZones(filtered.features.map(f => f.properties));
                    }
                    setVis(['depts-fill'], 'none');
                    setVis(['depts-outline'], 'visible');
                    setVis(['sp-fill', 'sp-outline'], 'visible');
                    setCurrentLevel('sous-préfecture');
                  }

                  // Zoom to zone geometry from full data
                  // currentLevel is stale in closure — determine the source ref from the zone's level
                  const geoRef = currentLevel === 'district' ? allDistrictsRef : currentLevel === 'région' ? allRegionsRef : currentLevel === 'département' ? allDeptsRef : allSPRef;
                  const feat = geoRef?.current?.features?.find(f => f.properties?.name === z.name);
                  if (feat?.geometry) {
                    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
                    const coords = feat.geometry.type === 'Polygon' ? feat.geometry.coordinates
                      : feat.geometry.type === 'MultiPolygon' ? feat.geometry.coordinates.flat()
                      : [];
                    for (const ring of coords) {
                      for (const c of ring) {
                        if (c[0] < minLng) minLng = c[0];
                        if (c[0] > maxLng) maxLng = c[0];
                        if (c[1] < minLat) minLat = c[1];
                        if (c[1] > maxLat) maxLat = c[1];
                      }
                    }
                    if (isFinite(minLng) && isFinite(maxLng)) {
                      const targetZoom = currentLevel === 'district' ? 8.5 : currentLevel === 'r\u00e9gion' ? 10 : 12;
                      zmap.flyTo({
                        center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
                        zoom: targetZoom,
                        duration: 1000,
                      });
                      setTimeout(() => { drillingRef.current = false; updateLayersRef.current?.(); updateLabelsRef.current?.(); }, 1100);
                      return;
                    }
                  }
                  drillingRef.current = false;
                }}
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
