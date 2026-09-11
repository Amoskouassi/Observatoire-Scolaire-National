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
};

function getCentroid(geometry) {
  if (!geometry) return null;
  let coords;
  if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0];
  } else if (geometry.type === 'MultiPolygon') {
    coords = geometry.coordinates[0][0];
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
    background: ${COLORS[status] || COLORS.pending};
    color: white;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    font-family: Inter, system-ui, -apple-system, sans-serif;
    letter-spacing: -0.01em;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    line-height: 1.4;
    text-align: center;
    border: 1.5px solid rgba(255,255,255,0.3);
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
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  const markersRef = useRef({ districts: [], regions: [], depts: [] });
  const selectedDistrictRef = useRef(null);
  const selectedRegionRef = useRef(null);
  const allRegionsRef = useRef(null);
  const allDeptsRef = useRef(null);

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
      const [districtsData, regionsData, deptsData] = await Promise.all([
        fetch(GEOJSON_PATHS.districts).then(r => r.json()).catch(() => null),
        fetch(GEOJSON_PATHS.regions).then(r => r.json()).catch(() => null),
        fetch(GEOJSON_PATHS.depts).then(r => r.json()).catch(() => null),
      ]);

      // Districts fill + outline
      if (districtsData) {
        map.addSource('districts', { type: 'geojson', data: districtsData });
        map.addLayer({
          id: 'districts-fill', type: 'fill', source: 'districts',
          paint: {
            'fill-color': ['match', ['get', 'status'], 'collected', COLORS.collected, 'waiting', COLORS.waiting, COLORS.pending],
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.45, 0.25],
          },
        });
        map.addLayer({
          id: 'districts-outline', type: 'line', source: 'districts',
          paint: { 'line-color': '#000000', 'line-width': 2 },
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
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.5, 0.3],
          },
          layout: { visibility: 'none' },
        });
        map.addLayer({ id: 'regions-outline', type: 'line', source: 'regions', paint: { 'line-color': '#000000', 'line-width': 2 }, layout: { visibility: 'none' } });
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
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.55, 0.35],
          },
          layout: { visibility: 'none' },
        });
        map.addLayer({ id: 'depts-outline', type: 'line', source: 'depts', paint: { 'line-color': '#555555', 'line-width': 1 }, layout: { visibility: 'none' } });
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
      const allFill = ['districts-fill', 'regions-fill', 'depts-fill'];
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
        let layer = z < 7 ? 'districts-fill' : z < 9 ? 'regions-fill' : 'depts-fill';
        let sourceKey = z < 7 ? 'districts' : z < 9 ? 'regions' : 'depts';
        const zf = map.queryRenderedFeatures(e.point, { layers: [layer] });
        if (zf?.length) {
          const f = zf[0];
          const p = f.properties;

          // fitBounds from the feature's geometry (direct from MapLibre, no source lookup)
          if (f.geometry) {
            let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
            const rings = f.geometry.type === 'Polygon' ? f.geometry.coordinates
              : f.geometry.coordinates;
            for (const ring of rings) {
              const coords = ring[0] || ring;
              for (const c of coords) {
                if (c[0] < minLng) minLng = c[0];
                if (c[0] > maxLng) maxLng = c[0];
                if (c[1] < minLat) minLat = c[1];
                if (c[1] > maxLat) maxLat = c[1];
              }
            }
            if (isFinite(minLng) && isFinite(maxLng) && isFinite(minLat) && isFinite(maxLat)) {
              const padLng = (maxLng - minLng) * 0.1;
              const padLat = (maxLat - minLat) * 0.1;
              map.fitBounds(
                [[minLng - padLng, minLat - padLat], [maxLng + padLng, maxLat + padLat]],
                { padding: 30, duration: 1000, maxZoom: z < 7 ? 12 : z < 9 ? 13 : 14 }
              );
            }
          }

          // Set district filter
          if (z < 7) {
            setSelectedDistrict(p.name);
            selectedDistrictRef.current = p.name;
            selectedRegionRef.current = null;
          }
          // Set region filter for depts
          if (z >= 7 && z < 9) {
            selectedRegionRef.current = p.name;
          }

          setSelected({
            name: p.name,
            level: z < 7 ? 'district' : z < 9 ? 'r\u00e9gion' : 'd\u00e9partement',
            status: p.status,
            schools: p.schools,
            students: p.students,
            girls: p.girls,
            boys: p.boys,
          });
        }
      });

      // Zoom-based visibility
      const setVis = (ls, v) => ls.forEach(l => { if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', v); });

      const updateLabels = () => {
        const z = map.getZoom();
        const selDist = selectedDistrictRef.current;
        const show = (markers, threshold) => markers.forEach(m => {
          m.getElement().style.display = z < threshold ? '' : 'none';
        });
        const hide = (markers) => markers.forEach(m => {
          m.getElement().style.display = 'none';
        });

        if (z < 7) {
          show(markersRef.current.districts, 7);
          hide(markersRef.current.regions);
          hide(markersRef.current.depts);
        } else if (z < 9) {
          hide(markersRef.current.districts);
          // Only show region labels for selected district
          markersRef.current.regions.forEach((m, i) => {
            const allFeats = allRegionsRef.current?.features || [];
            const feat = allFeats[i];
            const belongsToSel = feat && feat.properties.district === selDist;
            m.getElement().style.display = (belongsToSel && z < 9) ? '' : 'none';
          });
          hide(markersRef.current.depts);
        } else {
          hide(markersRef.current.districts);
          hide(markersRef.current.regions);
          show(markersRef.current.depts, 99);
        }
      };

      const updateLayers = () => {
        const z = map.getZoom();
        const selDist = selectedDistrictRef.current;
        const selReg = selectedRegionRef.current;

        // Districts: ALWAYS visible, never filtered
        setVis(['districts-fill', 'districts-outline'], 'visible');
        if (districtsData) map.getSource('districts')?.setData(districtsData);

        if (z < 7) {
          // National: no regions, no depts
          setVis(['regions-fill', 'regions-outline'], 'none');
          setVis(['depts-fill', 'depts-outline'], 'none');
          setCurrentLevel('district');
          setZones(districtsData?.features?.map(f => f.properties) || []);
          if (allRegionsRef.current) map.getSource('regions')?.setData(allRegionsRef.current);
          if (allDeptsRef.current) map.getSource('depts')?.setData(allDeptsRef.current);
        } else if (z < 9) {
          // Region view: selected district's regions only
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
        } else {
          // Dept view: selected region's depts only
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
        }
        updateLabels();
      };

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

  const levelLabel = { district: 'Districts', 'r\u00e9gion': 'R\u00e9gions', 'd\u00e9partement': 'D\u00e9partements' };

  const handleBack = () => {
    setSelected(null);
    setSelectedDistrict(null);
    selectedDistrictRef.current = null;
    selectedRegionRef.current = null;
    if (mapInst.current) {
      mapInst.current.flyTo({ center: [-5.5, 7.0], zoom: 5.5, duration: 1200 });
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
            <div className="flex-1 flex items-center bg-[#FAF8F3] rounded-xl px-3.5 py-2.5 shadow-md">
              <span className="material-symbols-outlined text-[#E8611A] text-[20px] shrink-0 mr-2">search</span>
              <input className="w-full bg-transparent text-[#1E293B] text-sm placeholder:text-[#6B7280] focus:outline-none"
                placeholder="Rechercher (Korhogo, Cocody, San-Pedro)..." type="search" />
            </div>
            <button className="w-11 h-11 rounded-xl bg-[#FAF8F3] flex items-center justify-center shadow-md shrink-0">
              <span className="material-symbols-outlined text-[20px] text-[#1E293B]">tune</span>
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2">
            <button className="px-3 py-1 rounded-full bg-[#E8611A] text-white text-xs font-bold shrink-0 shadow-sm">Tous</button>
            <button className="px-3 py-1 rounded-full bg-[#FAF8F3] text-[#1E293B] text-xs shrink-0 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8611A]" /> Collecte
            </button>
            <button className="px-3 py-1 rounded-full bg-[#FAF8F3] text-[#1E293B] text-xs shrink-0 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0B7A3E]" /> En cours
            </button>
            <button className="px-3 py-1 rounded-full bg-[#FAF8F3] text-[#1E293B] text-xs shrink-0 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" /> En attente
            </button>
          </div>
        </div>

        <div className="absolute bottom-2 left-3 right-3 z-20 flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#0D1B2A]/90 backdrop-blur text-white text-[10px] font-bold shadow-md pointer-events-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#E8611A]" /> Collecte</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0B7A3E]" /> En cours</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#6B7280]" /> En attente</span>
          </div>
          <span className="text-[#E8611A] uppercase tracking-wider">SIG v2.4</span>
        </div>

        <div ref={mapRef} className="absolute inset-0" />
      </div>

      <div className="w-full lg:w-[380px] xl:w-[420px] bg-[#FAF8F3] border-l border-[#CBD5E1]/40 flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-[#CBD5E1]/30">
          <p className="text-[11px] uppercase tracking-wider text-[#6B7280] font-bold">Cote d'Ivoire</p>
          <h2 className="font-bold text-[#1E293B] text-lg">
            {selected ? selected.name : levelLabel[currentLevel] + ' (' + zones.length + ')'}
          </h2>
          {selected && (
            <button onClick={handleBack}
              className="text-[11px] text-[#E8611A] font-bold mt-1 hover:underline">
              &larr; Retour
            </button>
          )}
        </div>

        <div className="px-5 py-3 grid grid-cols-3 gap-2 border-b border-[#CBD5E1]/30">
          <StatCard icon="school" label="\u00c9coles" value={selected ? (selected.schools || 0) : totalSchools} />
          <StatCard icon="groups" label="\u00c9l\u00e8ves" value={selected ? (selected.students || 0) : totalStudents} format="k" />
          <StatCard icon="girl" label="Filles" value={
            selected
              ? (selected.girls && selected.boys ? Math.round(selected.girls / (selected.girls + selected.boys) * 100) : 0)
              : (totalGirls && totalBoys ? Math.round(totalGirls / (totalGirls + totalBoys) * 100) : 0)
          } suffix="%" />
        </div>

        {(selected ? selected.girls > 0 : totalGirls > 0) && (
          <div className="px-5 py-3 border-b border-[#CBD5E1]/30">
            <div className="w-full h-3 bg-white rounded-full overflow-hidden flex p-0.5">
              <div className="h-full bg-[#E8611A] rounded-l-full"
                style={{ width: `${selected ? Math.round(selected.girls / (selected.girls + selected.boys) * 100) : Math.round(totalGirls / (totalGirls + totalBoys) * 100)}%` }} />
              <div className="h-full bg-[#0B7A3E] rounded-r-full flex-1" />
            </div>
            <div className="flex justify-between text-[10px] font-bold mt-1">
              <span className="text-[#E8611A]">Filles {selected ? Math.round(selected.girls / (selected.girls + selected.boys) * 100) : Math.round(totalGirls / (totalGirls + totalBoys) * 100)}%</span>
              <span className="text-[#0B7A3E]">Gar\u00e7ons {selected ? 100 - Math.round(selected.girls / (selected.girls + selected.boys) * 100) : 100 - Math.round(totalGirls / (totalGirls + totalBoys) * 100)}%</span>
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
                <button key={i} onClick={() => setSelected(z)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white hover:bg-[#F4EFE6] transition text-left group">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: `${COLORS[z.status] || COLORS.pending}18`, color: COLORS[z.status] || COLORS.pending }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1E293B] truncate group-hover:text-[#E8611A]">{z.name}</p>
                    <p className="text-[10px] text-[#6B7280]">{z.schools || 0} \u00e9coles &middot; {z.students ? Math.round(z.students / 1000) + 'k \u00e9l\u00e8ves' : ''}</p>
                  </div>
                  <div className="w-16 h-1.5 bg-[#F4EFE6] rounded-full overflow-hidden shrink-0">
                    <div className="h-full rounded-full" style={{ width: `${((z.schools || 0) / maxSchools) * 100}%`, backgroundColor: COLORS[z.status] || COLORS.pending }} />
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
    <div className="bg-white p-2.5 rounded-xl flex flex-col shadow-sm">
      <span className="flex items-center gap-1 text-[10px] text-[#6B7280] font-bold">
        <span className="material-symbols-outlined text-[13px] text-[#E8611A]">{icon}</span> {label}
      </span>
      <span className="font-bold text-[#1E293B] text-lg mt-1">{typeof display === 'number' ? display.toLocaleString('fr-FR') : display}</span>
    </div>
  );
}

function ZoneDetail({ zone }) {
  const pct = zone.girls && zone.boys ? Math.round(zone.girls / (zone.girls + zone.boys) * 100) : 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase"
            style={{
              backgroundColor: `${COLORS[zone.status] || COLORS.pending}18`,
              color: COLORS[zone.status] || COLORS.pending,
            }}>
            {STATUS_LABEL[zone.status] || zone.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-[#6B7280] font-bold">\u00c9coles</p>
            <p className="text-xl font-bold text-[#1E293B]">{(zone.schools || 0).toLocaleString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#6B7280] font-bold">\u00c9l\u00e8ves</p>
            <p className="text-xl font-bold text-[#1E293B]">{zone.students ? Math.round(zone.students / 1000) + 'k' : '\u2014'}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#6B7280] font-bold">Filles</p>
            <p className="text-xl font-bold text-[#E8611A]">{pct}%</p>
          </div>
          <div>
            <p className="text-[10px] text-[#6B7280] font-bold">Gar\u00e7ons</p>
            <p className="text-xl font-bold text-[#0B7A3E]">{100 - pct}%</p>
          </div>
        </div>
        <div className="mt-3 w-full h-2.5 bg-[#F4EFE6] rounded-full overflow-hidden flex p-0.5">
          <div className="h-full bg-[#E8611A] rounded-l-full" style={{ width: pct + '%' }} />
          <div className="h-full bg-[#0B7A3E] rounded-r-full flex-1" />
        </div>
      </div>
    </div>
  );
}
