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

    map.on('load', async () => {
      // Load all 3 levels
      const [districtsData, regionsData, deptsData] = await Promise.all([
        fetch(GEOJSON_PATHS.districts).then(r => r.json()).catch(() => null),
        fetch(GEOJSON_PATHS.regions).then(r => r.json()).catch(() => null),
        fetch(GEOJSON_PATHS.depts).then(r => r.json()).catch(() => null),
      ]);

      // Districts (adm1) — visible at zoom < 8
      if (districtsData) {
        map.addSource('districts', { type: 'geojson', data: districtsData });
        map.addLayer({
          id: 'districts-fill',
          type: 'fill',
          source: 'districts',
          paint: {
            'fill-color': [
              'match', ['get', 'status'],
              'collected', COLORS.collected,
              'waiting', COLORS.waiting,
              COLORS.pending,
            ],
            'fill-opacity': 0.25,
          },
          layout: { visibility: 'visible' },
        });
        map.addLayer({
          id: 'districts-outline',
          type: 'line',
          source: 'districts',
          paint: { 'line-color': '#CBD5E1', 'line-width': 1.5 },
        });
        map.addLayer({
          id: 'districts-labels',
          type: 'symbol',
          source: 'districts',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'visibility': 'visible',
          },
          paint: {
            'text-color': '#1E293B',
            'text-halo-color': '#FAF8F3',
            'text-halo-width': 1.5,
          },
        });
      }

      // Regions (adm2) — visible at zoom >= 8
      if (regionsData) {
        map.addSource('regions', { type: 'geojson', data: regionsData });
        map.addLayer({
          id: 'regions-fill',
          type: 'fill',
          source: 'regions',
          paint: {
            'fill-color': [
              'match', ['get', 'status'],
              'collected', COLORS.collected,
              'waiting', COLORS.waiting,
              COLORS.pending,
            ],
            'fill-opacity': 0.3,
          },
          layout: { visibility: 'none' },
        });
        map.addLayer({
          id: 'regions-outline',
          type: 'line',
          source: 'regions',
          paint: { 'line-color': '#CBD5E1', 'line-width': 1.2 },
          layout: { visibility: 'none' },
        });
        map.addLayer({
          id: 'regions-labels',
          type: 'symbol',
          source: 'regions',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 10,
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'visibility': 'none',
          },
          paint: {
            'text-color': '#1E293B',
            'text-halo-color': '#FAF8F3',
            'text-halo-width': 1.5,
          },
        });
      }

      // Departments (adm3) — visible at zoom >= 10
      if (deptsData) {
        map.addSource('depts', { type: 'geojson', data: deptsData });
        map.addLayer({
          id: 'depts-fill',
          type: 'fill',
          source: 'depts',
          paint: {
            'fill-color': [
              'match', ['get', 'status'],
              'collected', COLORS.collected,
              'waiting', COLORS.waiting,
              COLORS.pending,
            ],
            'fill-opacity': 0.35,
          },
          layout: { visibility: 'none' },
        });
        map.addLayer({
          id: 'depts-outline',
          type: 'line',
          source: 'depts',
          paint: { 'line-color': '#CBD5E1', 'line-width': 1 },
          layout: { visibility: 'none' },
        });
        map.addLayer({
          id: 'depts-labels',
          type: 'symbol',
          source: 'depts',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 9,
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'visibility': 'none',
          },
          paint: {
            'text-color': '#1E293B',
            'text-halo-color': '#FAF8F3',
            'text-halo-width': 1.5,
          },
        });
      }

      // Schools source (empty initially, populated via API)
      map.addSource('ecoles', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'ecoles-points',
        type: 'circle',
        source: 'ecoles',
        paint: {
          'circle-radius': [
            'step', ['get', 'eleves_total'],
            5, 100, 7, 500, 10, 1000, 14,
          ],
          'circle-color': '#E8611A',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#FAF8F3',
          'circle-opacity': 0.85,
        },
      });

      // Hover effects
      const hoverLayers = [
        'districts-fill', 'regions-fill', 'depts-fill',
      ];
      let hoveredId = null;
      let hoveredSource = null;

      for (const layerId of hoverLayers) {
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
          if (hoveredId !== null && hoveredSource) {
            map.setFeatureState({ source: hoveredSource, id: hoveredId }, { hover: false });
          }
          hoveredId = null;
          hoveredSource = null;
        });
        map.on('mousemove', layerId, (e) => {
          if (hoveredId !== null && hoveredSource) {
            map.setFeatureState({ source: hoveredSource, id: hoveredId }, { hover: false });
          }
          const f = e.features?.[0];
          if (f) {
            hoveredId = f.id;
            hoveredSource = layerId.replace('-fill', '');
            map.setFeatureState({ source: hoveredSource, id: hoveredId }, { hover: true });
          }
        });
      }

      // Click handler
      map.on('click', (e) => {
        // School click
        const sf = map.queryRenderedFeatures(e.point, { layers: ['ecoles-points'] });
        if (sf?.length) {
          const id = sf[0].properties?.id;
          if (id) { navigate('/ecole/' + id); return; }
        }

        // Admin zone click — zoom in and show details
        const zoom = map.getZoom();
        const layers = zoom < 8 ? ['districts-fill'] : zoom < 10 ? ['regions-fill'] : ['depts-fill'];
        const zf = map.queryRenderedFeatures(e.point, { layers });
        if (zf?.length) {
          const p = zf[0].properties;
          const nextZoom = Math.min(zoom + 2.5, 12);
          map.easeTo({ center: e.lngLat, zoom: nextZoom, duration: 1200 });

          const statusLabel = p.status === 'collected' ? 'Collecté'
            : p.status === 'waiting' ? 'En attente'
            : 'Non programmé';
          openBottomSheet({
            type: 'admin-zone',
            name: p.name,
            level: zoom < 8 ? 'district' : zoom < 10 ? 'region' : 'département',
            status: p.status,
            data: {
              schools: p.schools || '—',
              students: p.students || '—',
              girls: p.girls || '—',
              boys: p.boys || '—',
            },
          });
        }
      });

      // Zoom-based layer visibility
      map.on('zoomend', () => {
        const z = map.getZoom();
        const setVisibility = (layers, vis) => {
          layers.forEach(l => {
            if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', vis);
          });
        };

        if (z < 8) {
          setVisibility(['districts-fill', 'districts-outline', 'districts-labels'], 'visible');
          setVisibility(['regions-fill', 'regions-outline', 'regions-labels'], 'none');
          setVisibility(['depts-fill', 'depts-outline', 'depts-labels'], 'none');
        } else if (z < 10) {
          setVisibility(['districts-fill', 'districts-outline', 'districts-labels'], 'none');
          setVisibility(['regions-fill', 'regions-outline', 'regions-labels'], 'visible');
          setVisibility(['depts-fill', 'depts-outline', 'depts-labels'], 'none');
        } else {
          setVisibility(['districts-fill', 'districts-outline', 'districts-labels'], 'none');
          setVisibility(['regions-fill', 'regions-outline', 'regions-labels'], 'none');
          setVisibility(['depts-fill', 'depts-outline', 'depts-labels'], 'visible');
        }
      });

      loadSchools();
      setTimeout(() => setLoading(false), 800);
    });

    mapInst.current = map;
    return () => map.remove();
  }, []);

  const loadSchools = useCallback(async () => {
    try {
      const data = await api.getSchools();
      setSchoolsData(data);
    } catch (e) {
      console.error('Écoles non disponibles:', e.message);
    }
  }, [setSchoolsData]);

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
                  <span className="text-[11px] uppercase tracking-wider text-[#6B7280]">
                    Côte d'Ivoire › {sheetContent.level || 'District'}
                  </span>
                  <h2 className="font-bold text-[#1E293B] text-lg">{sheetContent.name}</h2>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase"
                  style={{
                    backgroundColor: `${sheetContent.status === 'collected' ? '#E8611A' : sheetContent.status === 'waiting' ? '#0B7A3E' : '#6B7280'}15`,
                    color: sheetContent.status === 'collected' ? '#E8611A' : sheetContent.status === 'waiting' ? '#0B7A3E' : '#6B7280',
                  }}>
                  {sheetContent.status === 'collected' ? 'Collecté' : sheetContent.status === 'waiting' ? 'En attente' : 'Non programmé'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MiniKPI icon="school" label="Écoles" value={sheetContent.data?.schools || '—'} />
                <MiniKPI icon="groups" label="Élèves" value={sheetContent.data?.students ? `${Math.round(sheetContent.data.students / 1000)}k` : '—'} />
                <MiniKPI icon="pie_chart" label="Filles" value={sheetContent.data?.girls && sheetContent.data?.boys ? `${Math.round(sheetContent.data.girls / (sheetContent.data.girls + sheetContent.data.boys) * 100)}%` : '—'} />
              </div>
              {sheetContent.data?.girls > 0 && (
                <div className="bg-[#F4EFE6] rounded-xl p-3">
                  <div className="w-full h-3 bg-white rounded-full overflow-hidden flex p-0.5">
                    <div className="h-full bg-[#E8611A] rounded-l-full"
                      style={{ width: `${Math.round(sheetContent.data.girls / (sheetContent.data.girls + sheetContent.data.boys) * 100)}%` }} />
                    <div className="h-full bg-[#0B7A3E] rounded-r-full flex-1" />
                  </div>
                  <div className="flex justify-between text-xs font-bold mt-1.5">
                    <span className="text-[#E8611A]">Filles {Math.round(sheetContent.data.girls / (sheetContent.data.girls + sheetContent.data.boys) * 100)}%</span>
                    <span className="text-[#0B7A3E]">Garçons {100 - Math.round(sheetContent.data.girls / (sheetContent.data.girls + sheetContent.data.boys) * 100)}%</span>
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
