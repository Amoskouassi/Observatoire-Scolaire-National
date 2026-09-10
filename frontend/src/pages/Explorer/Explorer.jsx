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

export default function Explorer() {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { filters, schoolsData, setSchoolsData } = useMapStore();
  const [selected, setSelected] = useState(null);
  const [currentLevel, setCurrentLevel] = useState('district');
  const [zones, setZones] = useState([]);
  const [hoveredZone, setHoveredZone] = useState(null);

  useEffect(() => {
    if (mapInst.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#F4EFE6' } }],
      },
      center: [-5.54, 7.54],
      zoom: 6,
      minZoom: 5,
      maxZoom: 18,
      attributionControl: false,
      maxBounds: [[-9, 3.5], [-2, 11.5]],
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', async () => {
      const [districtsData, regionsData, deptsData] = await Promise.all([
        fetch(GEOJSON_PATHS.districts).then(r => r.json()).catch(() => null),
        fetch(GEOJSON_PATHS.regions).then(r => r.json()).catch(() => null),
        fetch(GEOJSON_PATHS.depts).then(r => r.json()).catch(() => null),
      ]);

      if (districtsData) {
        map.addSource('districts', { type: 'geojson', data: districtsData });
        map.addLayer({
          id: 'districts-fill', type: 'fill', source: 'districts',
          paint: {
            'fill-color': ['match', ['get', 'status'], 'collected', COLORS.collected, 'waiting', COLORS.waiting, COLORS.pending],
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.45, 0.25],
          },
          layout: { visibility: 'visible' },
        });
        map.addLayer({
          id: 'districts-outline', type: 'line', source: 'districts',
          paint: { 'line-color': '#CBD5E1', 'line-width': 2 },
        });
        map.addLayer({
          id: 'districts-labels', type: 'symbol', source: 'districts',
          layout: { 'text-field': ['get', 'name'], 'text-size': 14, 'text-max-width': 10, 'text-allow-overlap': true },
          paint: { 'text-color': '#1E293B', 'text-halo-color': '#FAF8F3', 'text-halo-width': 2.5 },
        });
      }

      if (regionsData) {
        map.addSource('regions', { type: 'geojson', data: regionsData });
        map.addLayer({
          id: 'regions-fill', type: 'fill', source: 'regions',
          paint: {
            'fill-color': ['match', ['get', 'status'], 'collected', COLORS.collected, 'waiting', COLORS.waiting, COLORS.pending],
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.5, 0.3],
          },
          layout: { visibility: 'none' },
        });
        map.addLayer({ id: 'regions-outline', type: 'line', source: 'regions', paint: { 'line-color': '#CBD5E1', 'line-width': 1.5 }, layout: { visibility: 'none' } });
        map.addLayer({
          id: 'regions-labels', type: 'symbol', source: 'regions',
          layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-max-width': 10, 'text-allow-overlap': true, 'visibility': 'none' },
          paint: { 'text-color': '#1E293B', 'text-halo-color': '#FAF8F3', 'text-halo-width': 2 },
        });
      }

      if (deptsData) {
        map.addSource('depts', { type: 'geojson', data: deptsData });
        map.addLayer({
          id: 'depts-fill', type: 'fill', source: 'depts',
          paint: {
            'fill-color': ['match', ['get', 'status'], 'collected', COLORS.collected, 'waiting', COLORS.waiting, COLORS.pending],
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.55, 0.35],
          },
          layout: { visibility: 'none' },
        });
        map.addLayer({ id: 'depts-outline', type: 'line', source: 'depts', paint: { 'line-color': '#CBD5E1', 'line-width': 1 }, layout: { visibility: 'none' } });
        map.addLayer({
          id: 'depts-labels', type: 'symbol', source: 'depts',
          layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-max-width': 10, 'text-allow-overlap': true, 'visibility': 'none' },
          paint: { 'text-color': '#1E293B', 'text-halo-color': '#FAF8F3', 'text-halo-width': 2 },
        });
      }

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
          setHoveredZone(null);
        });
        map.on('mousemove', lid, (e) => {
          if (hId !== null && hSrc) map.setFeatureState({ source: hSrc, id: hId }, { hover: false });
          const f = e.features?.[0];
          if (f) {
            hId = f.id; hSrc = lid.replace('-fill', '');
            map.setFeatureState({ source: hSrc, id: hId }, { hover: true });
            setHoveredZone(f.properties?.name);
          }
        });
      }

      // Click
      map.on('click', (e) => {
        const sf = map.queryRenderedFeatures(e.point, { layers: ['ecoles-points'] });
        if (sf?.length) { const id = sf[0].properties?.id; if (id) navigate('/ecole/' + id); return; }

        const z = map.getZoom();
        let layer = z < 7 ? 'districts-fill' : z < 9 ? 'regions-fill' : 'depts-fill';
        const zf = map.queryRenderedFeatures(e.point, { layers: [layer] });
        if (zf?.length) {
          const p = zf[0].properties;
          const nextZoom = Math.min(z + 2, 13);
          map.easeTo({ center: e.lngLat, zoom: nextZoom, duration: 1200 });
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

      // Zoom visibility
      const setVis = (ls, v) => ls.forEach(l => { if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', v); });

      const updateLayers = () => {
        const z = map.getZoom();
        if (z < 7) {
          setVis(['districts-fill', 'districts-outline', 'districts-labels'], 'visible');
          setVis(['regions-fill', 'regions-outline', 'regions-labels'], 'none');
          setVis(['depts-fill', 'depts-outline', 'depts-labels'], 'none');
          setCurrentLevel('district');
          setZones(districtsData?.features?.map(f => f.properties) || []);
        } else if (z < 9) {
          setVis(['districts-fill', 'districts-outline', 'districts-labels'], 'none');
          setVis(['regions-fill', 'regions-outline', 'regions-labels'], 'visible');
          setVis(['depts-fill', 'depts-outline', 'depts-labels'], 'none');
          setCurrentLevel('r\u00e9gion');
          setZones(regionsData?.features?.map(f => f.properties) || []);
        } else {
          setVis(['districts-fill', 'districts-outline', 'districts-labels'], 'none');
          setVis(['regions-fill', 'regions-outline', 'regions-labels'], 'none');
          setVis(['depts-fill', 'depts-outline', 'depts-labels'], 'visible');
          setCurrentLevel('d\u00e9partement');
          setZones(deptsData?.features?.map(f => f.properties) || []);
        }
      };

      map.on('zoomend', updateLayers);
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

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {loading && (
        <div className="absolute inset-0 z-50 bg-[#F4EFE6] flex flex-col items-center justify-center gap-5">
          <div className="w-16 h-16 rounded-full border-4 border-[#E8611A]/20 border-t-[#E8611A] animate-spin" />
          <p className="text-xs text-[#6B7280]">Chargement de la carte...</p>
        </div>
      )}

      {/* MAP — left */}
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

      {/* STATS — right */}
      <div className="w-full lg:w-[380px] xl:w-[420px] bg-[#FAF8F3] border-l border-[#CBD5E1]/40 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-[#CBD5E1]/30">
          <p className="text-[11px] uppercase tracking-wider text-[#6B7280] font-bold">Cote d'Ivoire</p>
          <h2 className="font-bold text-[#1E293B] text-lg">
            {selected ? selected.name : levelLabel[currentLevel] + ' (' + zones.length + ')'}
          </h2>
          {selected && (
            <button onClick={() => setSelected(null)}
              className="text-[11px] text-[#E8611A] font-bold mt-1 hover:underline">
              &larr; Retour \u00e0 la vue {levelLabel[currentLevel]}
            </button>
          )}
        </div>

        {/* KPIs */}
        <div className="px-5 py-3 grid grid-cols-3 gap-2 border-b border-[#CBD5E1]/30">
          <StatCard icon="school" label="\u00c9coles" value={selected ? (selected.schools || 0) : totalSchools} />
          <StatCard icon="groups" label="\u00c9l\u00e8ves" value={selected ? (selected.students || 0) : totalStudents} format="k" />
          <StatCard icon="girl" label="Filles" value={
            selected
              ? (selected.girls && selected.boys ? Math.round(selected.girls / (selected.girls + selected.boys) * 100) : 0)
              : (totalGirls && totalBoys ? Math.round(totalGirls / (totalGirls + totalBoys) * 100) : 0)
          } suffix="%" />
        </div>

        {/* Girls/Boys bar */}
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

        {/* Zone list */}
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
