import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../../stores/mapStore';
import { api } from '../../services/api';

const COLORS = { collected: '#E8611A', waiting: '#0B7A3E', pending: '#CBD5E1' };

// GeoJSON fallback si pas de données HDX
const FALLBACK_DISTRICTS = {
  type: 'FeatureCollection',
  features: [
    mkZone('Savanes', [-5.6, 9.5], 'collected', 1428, 312000, 152000, 160000),
    mkZone('Lacs', [-5.0, 7.0], 'collected', 980, 210000, 100000, 110000),
    mkZone('Abidjan', [-4.0, 5.3], 'collected', 2145, 840200, 410000, 430200),
    mkZone('Comoé', [-3.5, 6.5], 'waiting', 650, 130000, 62000, 68000),
    mkZone('Zanzan', [-3.0, 8.0], 'waiting', 870, 164000, 78000, 86000),
    mkZone('Vallée du Bandama', [-5.0, 8.5], 'waiting', 1105, 248900, 119000, 129900),
    mkZone('Sassandra-Marahoué', [-6.0, 7.0], 'waiting', 1040, 215000, 103000, 112000),
    mkZone('Bas-Sassandra', [-7.0, 5.5], 'pending', 920, 195400, 93000, 102400),
    mkZone('Montagnes', [-7.5, 7.5], 'pending', 980, 189000, 90000, 99000),
    mkZone('Woroba', [-6.5, 8.0], 'pending', 560, 110000, 52000, 58000),
    mkZone('Ségou', [-6.0, 9.0], 'pending', 430, 95000, 45000, 50000),
    mkZone('Bafing', [-7.5, 8.5], 'pending', 280, 52000, 24000, 28000),
    mkZone('Gôh-Djiboua', [-5.5, 6.0], 'waiting', 720, 145000, 69000, 76000),
    mkZone('Lagunes', [-3.8, 5.8], 'collected', 1800, 720000, 350000, 370000),
    mkZone('Marahoué', [-5.5, 7.0], 'waiting', 680, 135000, 64000, 71000),
    mkZone('Nawa', [-7.0, 6.5], 'pending', 540, 105000, 50000, 55000),
    mkZone('Fromager', [-5.8, 6.5], 'waiting', 490, 98000, 47000, 51000),
    mkZone('Haut-Sassandra', [-6.5, 6.8], 'waiting', 780, 156000, 74000, 82000),
    mkZone('Iffou', [-4.5, 7.5], 'waiting', 620, 124000, 59000, 65000),
    mkZone('Indénié-Djuablin', [-3.5, 7.0], 'waiting', 580, 116000, 55000, 61000),
    mkZone('Ko', [-5.5, 8.0], 'pending', 350, 70000, 33000, 37000),
    mkZone('Moronou', [-4.0, 6.5], 'waiting', 420, 84000, 40000, 44000),
    mkZone("N'zi", [-4.5, 8.0], 'pending', 380, 76000, 36000, 40000),
    mkZone('Poro', [-5.6, 9.5], 'collected', 342, 72000, 34000, 38000),
    mkZone('Tchologo', [-5.0, 9.0], 'waiting', 198, 42000, 20000, 22000),
    mkZone('Bagoué', [-6.0, 9.5], 'waiting', 210, 44000, 21000, 23000),
    mkZone('Folon', [-7.0, 9.5], 'pending', 180, 36000, 17000, 19000),
    mkZone('Kabadougou', [-7.5, 9.0], 'pending', 160, 32000, 15000, 17000),
    mkZone("Gbokle", [-6.5, 5.0], 'pending', 310, 62000, 29000, 33000),
    mkZone('San-Pédro', [-7.0, 5.0], 'waiting', 520, 104000, 50000, 54000),
    mkZone('Agnéby-Tiassa', [-4.5, 6.0], 'waiting', 480, 96000, 46000, 50000),
    mkZone('Cascade', [-3.5, 7.5], 'pending', 390, 78000, 37000, 41000),
    mkZone("Me", [-7.0, 7.5], 'pending', 440, 88000, 42000, 46000),
  ],
};

function mkZone(name, center, status, schools, students, girls, boys) {
  const s = 0.6;
  return {
    type: 'Feature',
    id: name,
    properties: { name, status, schools, students, girls, boys },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [center[0] - s, center[1] - s],
        [center[0] + s, center[1] - s],
        [center[0] + s, center[1] + s],
        [center[0] - s, center[1] + s],
        [center[0] - s, center[1] - s],
      ]],
    },
  };
}

export default function Explorer() {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const loaded = useRef(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { openBottomSheet, bottomSheetOpen, filters, schoolsData, setSchoolsData } = useMapStore();
  const sheetContent = useMapStore((s) => s.bottomSheetContent);

  useEffect(() => {
    if (mapInst.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#F4EFE6' } }],
      },
      center: [-5.5, 7.5],
      zoom: 6.3,
      minZoom: 5,
      maxZoom: 18,
      attributionControl: false,
      maxBounds: [[-8.5, 4], [-2.5, 11]],
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      // Zones admin (fallback grid)
      map.addSource('zones', { type: 'geojson', data: FALLBACK_DISTRICTS });
      map.addLayer({
        id: 'zones-fill', type: 'fill', source: 'zones',
        paint: {
          'fill-color': ['match', ['get', 'status'], 'collected', COLORS.collected, 'waiting', COLORS.waiting, COLORS.pending],
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.35, 0.2],
        },
      });
      map.addLayer({
        id: 'zones-outline', type: 'line', source: 'zones',
        paint: { 'line-color': '#CBD5E1', 'line-width': 1.5 },
      });

      // Labels
      map.addLayer({
        id: 'zones-labels', type: 'symbol', source: 'zones',
        layout: {
          'text-field': ['concat', ['get', 'name'], '\n', ['to-string', ['get', 'schools']], ' écoles'],
          'text-size': 11,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        },
        paint: { 'text-color': '#1E293B', 'text-halo-color': '#FAF8F3', 'text-halo-width': 1.5 },
      });

      // Hover
      let hoveredId = null;
      map.on('mouseenter', 'zones-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'zones-fill', () => {
        map.getCanvas().style.cursor = '';
        if (hoveredId !== null) map.setFeatureState({ source: 'zones', id: hoveredId }, { hover: false });
        hoveredId = null;
      });
      map.on('mousemove', 'zones-fill', (e) => {
        if (hoveredId !== null) map.setFeatureState({ source: 'zones', id: hoveredId }, { hover: false });
        hoveredId = e.features?.[0]?.id;
        if (hoveredId !== null) map.setFeatureState({ source: 'zones', id: hoveredId }, { hover: true });
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

      map.on('click', (e) => handleClick(e, map));

      loadSchools();
      setTimeout(() => setLoading(false), 1200);
    });

    mapInst.current = map;
    return () => map.remove();
  }, []);

  const loadSchools = useCallback(async () => {
    if (loaded.current) return;
    try {
      const data = await api.getSchools();
      setSchoolsData(data);
      loaded.current = true;
    } catch (e) { console.error('Écoles non disponibles:', e.message); }
  }, [setSchoolsData]);

  function handleClick(e, map) {
    // Clic sur une école
    const sf = map.queryRenderedFeatures(e.point, { layers: ['ecoles-points'] });
    if (sf?.length) {
      const id = sf[0].properties?.id;
      if (id) { navigate(`/ecole/${id}`); return; }
    }
    // Clic sur une zone
    const zf = map.queryRenderedFeatures(e.point, { layers: ['zones-fill'] });
    if (zf?.length) {
      const p = zf[0].properties;
      map.easeTo({ center: e.lngLat, zoom: 8, duration: 1500 });
      openBottomSheet({
        type: 'admin-zone', name: p.name, level: 'district',
        status: p.status,
        data: { schools: p.schools, students: p.students, girls: p.girls, boys: p.boys },
      });
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

  return (
    <div className="h-full relative">
      {loading && (
        <div className="absolute inset-0 z-50 bg-[#F4EFE6] flex flex-col items-center justify-center gap-5">
          <div className="w-16 h-16 rounded-full border-4 border-[#E8611A]/20 border-t-[#E8611A] animate-spin" />
          <p className="text-xs text-[#6B7280]">Chargement de la carte...</p>
        </div>
      )}

      {/* Search bar */}
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
          <button className="px-3 py-1 rounded-full bg-[#E8611A] text-white text-xs font-bold shrink-0 shadow-sm">Tous</button>
          <button className="px-3 py-1 rounded-full bg-[#FAF8F3] text-[#1E293B] text-xs shrink-0 shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8611A]" /> Collecté
          </button>
          <button className="px-3 py-1 rounded-full bg-[#FAF8F3] text-[#1E293B] text-xs shrink-0 shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0B7A3E]" /> En cours
          </button>
          <button className="px-3 py-1 rounded-full bg-[#FAF8F3] text-[#1E293B] text-xs shrink-0 shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" /> En attente
          </button>
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
          <div className="w-12 h-1.5 bg-[#CBD5E1]/80 rounded-full mx-auto mb-3 cursor-grab" />
          {sheetContent ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">Côte d'Ivoire › District</span>
                  <h2 className="font-bold text-[#1E293B] text-lg">{sheetContent.name}</h2>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase"
                  style={{ backgroundColor: `${sheetContent.status === 'collected' ? '#E8611A' : sheetContent.status === 'waiting' ? '#0B7A3E' : '#6B7280'}15`, color: sheetContent.status === 'collected' ? '#E8611A' : sheetContent.status === 'waiting' ? '#0B7A3E' : '#6B7280' }}>
                  {sheetContent.status === 'collected' ? 'Collecté' : sheetContent.status === 'waiting' ? 'En attente' : 'Non programmé'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MiniKPI icon="school" label="Écoles" value={sheetContent.data?.schools || '—'} />
                <MiniKPI icon="groups" label="Élèves" value={sheetContent.data?.students ? `${Math.round(sheetContent.data.students / 1000)}k` : '—'} />
                <MiniKPI icon="pie_chart" label="Filles" value={sheetContent.data?.girls ? `${Math.round(sheetContent.data.girls / (sheetContent.data.girls + sheetContent.data.boys) * 100)}%` : '—'} />
              </div>
              {sheetContent.data?.girls > 0 && (
                <div className="bg-[#F4EFE6] rounded-xl p-3">
                  <div className="w-full h-3 bg-white rounded-full overflow-hidden flex p-0.5">
                    <div className="h-full bg-[#E8611A] rounded-l-full" style={{ width: `${Math.round(sheetContent.data.girls / (sheetContent.data.girls + sheetContent.data.boys) * 100)}%` }} />
                    <div className="h-full bg-[#0B7A3E] rounded-r-full flex-1" />
                  </div>
                  <div className="flex justify-between text-xs font-bold mt-1.5">
                    <span className="text-[#E8611A]">👧 {Math.round(sheetContent.data.girls / (sheetContent.data.girls + sheetContent.data.boys) * 100)}%</span>
                    <span className="text-[#0B7A3E]">👦 {100 - Math.round(sheetContent.data.girls / (sheetContent.data.girls + sheetContent.data.boys) * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">Côte d'Ivoire</span>
                <h2 className="font-bold text-[#1E293B] text-lg">Vue Nationale — 33 Districts</h2>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MiniKPI icon="map" label="Districts" value="33" />
                <MiniKPI icon="school" label="Écoles" value="~15k" />
                <MiniKPI icon="groups" label="Élèves" value="3.2M" />
              </div>
              <p className="text-xs text-[#6B7280] bg-[#F4EFE6] rounded-xl p-3">
                Cliquez sur une zone <span className="text-[#E8611A] font-bold">orange</span> pour voir les statistiques détaillées.
              </p>
            </div>
          )}
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
