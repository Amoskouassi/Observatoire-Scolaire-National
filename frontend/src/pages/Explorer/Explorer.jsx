import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../../stores/mapStore';
import { api } from '../../services/api';

const COLORS = { collected: '#E8611A', waiting: '#0B7A3E', pending: '#CBD5E1' };

export default function Explorer() {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const loaded = useRef(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { openBottomSheet, bottomSheetOpen, filters, schoolsData, setSchoolsData } = useMapStore();

  useEffect(() => {
    if (mapInst.current) return;
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#F4EFE6' } }] },
      center: [-5.5, 7.5], zoom: 6.3, minZoom: 5, maxZoom: 18,
      attributionControl: false, maxBounds: [[-8.5, 4], [-2.5, 11]],
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.on('load', () => { addLayers(map); loadSchools(); setTimeout(() => setLoading(false), 1200); });
    map.on('click', (e) => handleClick(e, map));
    mapInst.current = map;
    return () => map.remove();
  }, []);

  const loadSchools = useCallback(async () => {
    if (loaded.current) return;
    try {
      const data = await api.getSchools();
      setSchoolsData(data);
      loaded.current = true;
    } catch (e) { console.error(e); }
  }, [setSchoolsData]);

  function addLayers(map) {
    // Fallback: grilles de districts si PMTiles indisponibles
    map.addSource('grid', {
      type: 'geojson',
      data: generateFallbackGrid(),
    });
    map.addLayer({
      id: 'grid-fill', type: 'fill', source: 'grid',
      paint: { 'fill-color': ['match', ['get', 'status'], 'collected', COLORS.collected, 'waiting', COLORS.waiting, COLORS.pending], 'fill-opacity': 0.2 },
    });
    map.addLayer({
      id: 'grid-outline', type: 'line', source: 'grid',
      paint: { 'line-color': '#CBD5E1', 'line-width': 1 },
    });

    // Écoles
    map.addSource('ecoles', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: 'ecoles-points', type: 'circle', source: 'ecoles',
      paint: {
        'circle-radius': ['step', ['get', 'eleves_total'], 5, 100, 7, 500, 10, 1000, 14],
        'circle-color': '#E8611A', 'circle-stroke-width': 1.5, 'circle-stroke-color': '#FAF8F3', 'circle-opacity': 0.85,
      },
    });
    map.on('mouseenter', 'ecoles-points', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'ecoles-points', () => { map.getCanvas().style.cursor = ''; });
  }

  function generateFallbackGrid() {
    const zones = [
      { name: 'Savanes', center: [-5.6, 9.5], status: 'collected', schools: 1428, students: 312000 },
      { name: 'Lacs', center: [-5.0, 7.0], status: 'collected', schools: 980, students: 210000 },
      { name: 'Abidjan', center: [-4.0, 5.3], status: 'collected', schools: 2145, students: 840200 },
      { name: 'Comoé', center: [-3.5, 6.5], status: 'waiting', schools: 650, students: 130000 },
      { name: 'Zanzan', center: [-3.0, 8.0], status: 'waiting', schools: 870, students: 164000 },
      { name: 'Vallée du Bandama', center: [-5.0, 8.5], status: 'waiting', schools: 1105, students: 248900 },
      { name: 'Sassandra-Marahoué', center: [-6.0, 7.0], status: 'waiting', schools: 1040, students: 215000 },
      { name: 'Bas-Sassandra', center: [-7.0, 5.5], status: 'pending', schools: 920, students: 195400 },
      { name: 'Montagnes', center: [-7.5, 7.5], status: 'pending', schools: 980, students: 189000 },
      { name: 'Woroba', center: [-6.5, 8.0], status: 'pending', schools: 560, students: 110000 },
      { name: 'Ségou', center: [-6.0, 9.0], status: 'pending', schools: 430, students: 95000 },
      { name: 'Bafing', center: [-7.5, 8.5], status: 'pending', schools: 280, students: 52000 },
    ];
    return {
      type: 'FeatureCollection',
      features: zones.map((z) => ({
        type: 'Feature',
        properties: { name: z.name, status: z.status, schools: z.schools, students: z.students },
        geometry: {
          type: 'Polygon',
          coordinates: [generateBox(z.center, 0.8)],
        },
      })),
    };
  }

  function generateBox([cx, cy], size) {
    const s = size / 2;
    return [[cx - s, cy - s], [cx + s, cy - s], [cx + s, cy + s], [cx - s, cy + s], [cx - s, cy - s]];
  }

  function handleClick(e, map) {
    const schoolFeat = map.queryRenderedFeatures(e.point, { layers: ['ecoles-points'] });
    if (schoolFeat?.length) {
      navigate(`/ecole/${schoolFeat[0].properties?.id}`);
      return;
    }
    const zoneFeat = map.queryRenderedFeatures(e.point, { layers: ['grid-fill'] });
    if (zoneFeat?.length) {
      const p = zoneFeat[0].properties;
      map.easeTo({ center: e.lngLat, zoom: 8, duration: 1500 });
      openBottomSheet({ type: 'admin-zone', name: p.name, level: 'district', status: p.status, data: { schools: p.schools, students: p.students } });
    }
  }

  useEffect(() => {
    if (!mapInst.current?.getLayer('ecoles-points') || !schoolsData) return;
    const filtered = schoolsData.features.filter((f) => {
      const p = f.properties;
      if (filters.collect_status.length && !filters.collect_status.includes(p.collect_status)) return false;
      if (filters.milieu.length && !filters.milieu.includes(p.milieu_implantation)) return false;
      if (filters.manque_bancs && (!p.besoin_bancs || p.besoin_bancs <= 0)) return false;
      return true;
    });
    mapInst.current.getSource('ecoles')?.setData({ type: 'FeatureCollection', features: filtered });
  }, [filters, schoolsData]);

  const sheetContent = useMapStore((s) => s.bottomSheetContent);

  return (
    <div className="h-full relative">
      {loading && (
        <div className="absolute inset-0 z-50 bg-[#F4EFE6] flex flex-col items-center justify-center gap-5">
          <div className="w-16 h-16 rounded-full border-4 border-[#E8611A]/20 border-t-[#E8611A] animate-spin" />
          <p className="text-xs text-[#6B7280]">Chargement de la carte...</p>
        </div>
      )}

      {/* Search */}
      <div className="absolute top-3 left-4 right-4 z-20">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-[#FAF8F3] rounded-xl px-3.5 py-2.5 shadow-md">
            <span className="material-symbols-outlined text-[#E8611A] text-[20px] shrink-0 mr-2">search</span>
            <input className="w-full bg-transparent text-[#1E293B] text-sm placeholder:text-[#6B7280] focus:outline-none"
              placeholder="Rechercher (Korhogo, Cocody, San-Pédro)..." type="search" />
          </div>
          <button className="w-11 h-11 rounded-xl bg-[#FAF8F3] flex items-center justify-center shadow-md shrink-0">
            <span className="material-symbols-outlined text-[20px] text-[#1E293B]">tune</span>
          </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2">
          <button className="px-3 py-1 rounded-full bg-[#E8611A] text-white text-xs font-bold shrink-0 shadow-sm">Tous les Districts</button>
          <button className="px-3 py-1 rounded-full bg-[#FAF8F3] text-[#1E293B] text-xs shrink-0 shadow-sm flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#E8611A]" /> Savanes</button>
          <button className="px-3 py-1 rounded-full bg-[#FAF8F3] text-[#1E293B] text-xs shrink-0 shadow-sm flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#0B7A3E]" /> Abidjan</button>
          <button className="px-3 py-1 rounded-full bg-[#FAF8F3] text-[#1E293B] text-xs shrink-0 shadow-sm flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" /> Montagnes</button>
        </div>
      </div>

      {/* Légende */}
      <div className="absolute bottom-2 left-3 right-3 z-20 flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#0D1B2A]/90 backdrop-blur text-white text-[10px] font-bold shadow-md pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#E8611A]" /> Collecté</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0B7A3E]" /> En cours</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#6B7280]" /> En attente</span>
        </div>
        <span className="text-[#E8611A] uppercase tracking-wider">SIG v2.4</span>
      </div>

      {/* Map */}
      <div ref={mapRef} className="absolute inset-0" />

      {/* Bottom Sheet */}
      {bottomSheetOpen && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#FAF8F3] rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 pt-3 pb-8 animate-slide-up">
          <div className="w-12 h-1.5 bg-[#CBD5E1]/80 rounded-full mx-auto mb-3" />
          <BottomSheetInner content={sheetContent} />
        </div>
      )}
    </div>
  );
}

function BottomSheetInner({ content }) {
  if (!content) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">Côte d'Ivoire</span>
          <h2 className="font-bold text-[#1E293B] text-lg">Vue Nationale</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MiniKPI icon="map" label="Districts" value="34" />
          <MiniKPI icon="school" label="Écoles" value="~15k" />
          <MiniKPI icon="groups" label="Élèves" value="3.2M" />
        </div>
        <div className="bg-[#F4EFE6] rounded-xl p-3 text-xs text-[#6B7280]">
          Cliquez sur une zone <span className="text-[#E8611A] font-bold">orange</span> pour voir les stats. Naviguez en cascade.
        </div>
      </div>
    );
  }

  const { name, status, data, level } = content;
  const st = status === 'collected' ? 'Collecté' : status === 'waiting' ? 'En attente' : 'Non programmé';
  const stColor = status === 'collected' ? '#E8611A' : status === 'waiting' ? '#0B7A3E' : '#6B7280';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">Côte d'Ivoire › {level}</span>
          <h2 className="font-bold text-[#1E293B] text-lg">{name}</h2>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase" style={{ backgroundColor: `${stColor}15`, color: stColor }}>{st}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MiniKPI icon="school" label="Écoles" value={data?.schools || '—'} />
        <MiniKPI icon="groups" label="Élèves" value={data?.students ? `${Math.round(data.students / 1000)}k` : '—'} />
        <MiniKPI icon="pie_chart" label="Parité" value={data?.girls ? `${Math.round(data.girls / (data.girls + data.boys) * 100)}%` : '—'} />
      </div>
      {data?.girls > 0 && (
        <div className="bg-[#F4EFE6] rounded-xl p-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-bold text-[#1E293B]">Parité de Genre</span>
            <span className="text-[#6B7280]">IPG: {(data.boys / data.girls).toFixed(2)}</span>
          </div>
          <div className="w-full h-3 bg-white rounded-full overflow-hidden flex p-0.5">
            <div className="h-full bg-[#E8611A] rounded-l-full" style={{ width: `${Math.round(data.girls / (data.girls + data.boys) * 100)}%` }} />
            <div className="h-full bg-[#0B7A3E] rounded-r-full flex-1" />
          </div>
          <div className="flex justify-between text-xs mt-1.5 font-bold">
            <span className="text-[#E8611A]">Filles {Math.round(data.girls / (data.girls + data.boys) * 100)}%</span>
            <span className="text-[#0B7A3E]">Garçons {100 - Math.round(data.girls / (data.girls + data.boys) * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniKPI({ icon, label, value }) {
  return (
    <div className="bg-[#F4EFE6] p-2.5 rounded-xl flex flex-col shadow-sm">
      <span className="flex items-center gap-1 text-[10px] text-[#6B7280] font-bold">
        <span className="material-symbols-outlined text-[13px] text-[#E8611A]">{icon}</span> {label}
      </span>
      <span className="font-bold text-[#1E293B] text-lg mt-1">{value}</span>
    </div>
  );
}
