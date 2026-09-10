import { useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../../stores/mapStore';
import { PMTILES_URLS } from '../../services/config';
import { api } from '../../services/api';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import LoadingScreen from '../../components/LoadingScreen/LoadingScreen';

const STATUS_COLORS = {
  collected: '#E8611A',
  waiting: '#0B7A3E',
  pending: '#CBD5E1',
};

export default function Explorer() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const schoolsLoaded = useRef(false);
  const loadingRef = useRef(null);

  const navigate = useNavigate();
  const {
    bottomSheetOpen, openBottomSheet,
    filters, schoolsData, setSchoolsData, setSchoolsLoading,
    setCurrentFeature, currentFeature,
  } = useMapStore();

  useEffect(() => {
    if (mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [-5.5, 7.5],
      zoom: 6.3,
      minZoom: 5,
      maxZoom: 18,
      attributionControl: false,
      maxBounds: [[-8.5, 4.0], [-2.5, 11.0]],
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true, attribution: '© CartoDB' }), 'bottom-right');

    map.on('load', () => {
      addAdminLayers(map);
      addSchoolsLayer(map);
      loadSchools();
    });

    map.on('click', (e) => handleMapClick(e, map));
    mapInstance.current = map;

    return () => map.remove();
  }, []);

  const loadSchools = useCallback(async () => {
    if (schoolsLoaded.current) return;
    setSchoolsLoading(true);
    try {
      const data = await api.getSchools();
      setSchoolsData(data);
      schoolsLoaded.current = true;
    } catch (err) {
      console.error('Erreur chargement écoles:', err);
    } finally {
      setSchoolsLoading(false);
    }
  }, [setSchoolsData, setSchoolsLoading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loadingRef.current) {
        loadingRef.current.style.opacity = '0';
        setTimeout(() => {
          if (loadingRef.current) loadingRef.current.style.display = 'none';
        }, 500);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  function addAdminLayers(map) {
    const levels = [
      { id: 'districts', source: 'districts', minZoom: 5, maxZoom: 9, color: '#CBD5E1', width: 1.5 },
      { id: 'regions', source: 'regions', minZoom: 8.5, maxZoom: 10, color: '#94A3B8', width: 1.5 },
      { id: 'depts', source: 'depts', minZoom: 10, maxZoom: 11.5, color: '#CBD5E1', width: 1.2 },
      { id: 'communes', source: 'communes', minZoom: 11, maxZoom: 13, color: '#CBD5E1', width: 1 },
    ];

    levels.forEach(({ id, source, minZoom, maxZoom, color, width }) => {
      if (!map.getSource(source)) {
        map.addSource(source, {
          type: 'vector',
          url: `pmtiles://${PMTILES_URLS[id]}`,
        });
      }

      map.addLayer({
        id: `fill-${id}`,
        type: 'fill',
        source,
        'source-layer': `admin_${id}`,
        minzoom: minZoom,
        maxzoom: maxZoom,
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'collect_status'], 'collected'], STATUS_COLORS.collected,
            ['==', ['get', 'collect_status'], 'waiting'], STATUS_COLORS.waiting,
            STATUS_COLORS.pending,
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false], 0.35,
            0.25,
          ],
        },
      });

      map.addLayer({
        id: `outline-${id}`,
        type: 'line',
        source,
        'source-layer': `admin_${id}`,
        minzoom: minZoom,
        maxzoom: maxZoom,
        paint: { 'line-color': color, 'line-width': width, 'line-opacity': 0.8 },
      });

      map.on('mouseenter', `fill-${id}`, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', `fill-${id}`, () => { map.getCanvas().style.cursor = ''; });

      let hoveredId = null;
      map.on('mousemove', `fill-${id}`, (e) => {
        if (hoveredId !== null) {
          map.setFeatureState({ source, sourceLayer: `admin_${id}`, id: hoveredId }, { hover: false });
        }
        hoveredId = e.features?.[0]?.id;
        if (hoveredId !== null) {
          map.setFeatureState({ source, sourceLayer: `admin_${id}`, id: hoveredId }, { hover: true });
        }
      });

      map.on('click', `fill-${id}`, (e) => {
        if (e.features?.length) {
          const feature = e.features[0];
          const zoomMap = { districts: 8, regions: 9, depts: 10.5, communes: 12 };
          map.easeTo({
            center: e.lngLat,
            zoom: zoomMap[id] || 10,
            duration: 1500,
            essential: true,
          });
          openBottomSheet({
            type: 'admin-zone',
            name: feature.properties?.name || feature.properties?.ADM1_EN || 'Zone',
            level: id,
            status: feature.properties?.collect_status || 'pending',
            data: {
              schools: feature.properties?.ecoles_total || 0,
              students: feature.properties?.eleves_total || 0,
              girls: feature.properties?.total_filles || 0,
              boys: feature.properties?.total_garcons || 0,
            },
          });
        }
      });
    });
  }

  function addSchoolsLayer(map) {
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
          6, 100, 8, 500, 12, 1000, 16,
        ],
        'circle-color': '#E8611A',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#FAF8F3',
        'circle-opacity': 0.85,
      },
    });

    map.on('mouseenter', 'ecoles-points', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'ecoles-points', () => { map.getCanvas().style.cursor = ''; });
  }

  function handleMapClick(e, map) {
    const schoolFeatures = map.queryRenderedFeatures(e.point, { layers: ['ecoles-points'] });
    if (schoolFeatures?.length) {
      const schoolId = schoolFeatures[0].properties?.id;
      if (schoolId) {
        navigate(`/ecole/${schoolId}`);
        return;
      }
    }

    const adminLevels = ['fill-communes', 'fill-depts', 'fill-regions', 'fill-districts'];
    const adminFeature = map.queryRenderedFeatures(e.point, { layers: adminLevels })?.[0];
    if (adminFeature) {
      const levelName = adminFeature.layer.id.replace('fill-', '');
      const zoomMap = { districts: 8, regions: 9, depts: 10.5, communes: 12 };
      map.easeTo({
        center: e.lngLat,
        zoom: zoomMap[levelName] || 10,
        duration: 1500,
        essential: true,
      });
      openBottomSheet({
        type: 'admin-zone',
        name: adminFeature.properties?.name || adminFeature.properties?.ADM1_EN || 'Zone',
        level: levelName,
        status: adminFeature.properties?.collect_status || 'pending',
      });
    }
  }

  useEffect(() => {
    if (!mapInstance.current?.getLayer('ecoles-points') || !schoolsData) return;

    const filtered = schoolsData.features.filter((f) => {
      const p = f.properties;
      if (filters.collect_status.length && !filters.collect_status.includes(p.collect_status)) return false;
      if (filters.milieu.length && !filters.milieu.includes(p.milieu_implantation)) return false;
      if (filters.statut.length && !filters.statut.includes(p.statut)) return false;
      if (filters.niveau.length && !filters.niveau.includes(p.niveau_enseignement)) return false;
      if (filters.sans_toilettes && p.toilettes_filles_fonctionnelles > 0) return false;
      if (filters.sans_eau && p.eau_potable) return false;
      if (filters.sans_electricite && p.electricite) return false;
      if (filters.manque_bancs && (!p.besoin_bancs || p.besoin_bancs <= 0)) return false;
      return true;
    });

    mapInstance.current.getSource('ecoles')?.setData({
      type: 'FeatureCollection',
      features: filtered,
    });
  }, [filters, schoolsData]);

  return (
    <div className="h-full flex flex-col relative">
      {loadingRef && <div ref={loadingRef} className="absolute inset-0 z-50 bg-surface transition-opacity duration-500"><LoadingScreen /></div>}

      {/* Barre de recherche */}
      <div className="absolute top-3 left-4 right-4 z-20">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-ivoire-blanc rounded-xl px-3.5 py-2.5 shadow-md transition-all">
            <span className="material-symbols-outlined text-ivoire-orange text-[20px] shrink-0 mr-2">search</span>
            <input
              className="w-full bg-transparent text-ivoire-texte text-body-sm placeholder:text-ivoire-gris focus:outline-none"
              placeholder="Rechercher (Korhogo, Cocody, San-Pédro)..."
              type="search"
            />
            <span className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-ivoire-beige text-ivoire-gris text-label-sm text-[10px]">/</span>
          </div>
          <button className="w-11 h-11 rounded-xl bg-ivoire-blanc flex items-center justify-center text-ivoire-texte shadow-md hover:bg-ivoire-beige transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </button>
        </div>

        {/* Filtres rapides */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2">
          <button className="px-3 py-1 rounded-full bg-ivoire-orange text-white text-label-sm uppercase tracking-wide text-[10px] shrink-0 shadow-sm font-bold">
            Tous les Districts
          </button>
          <button className="px-3 py-1 rounded-full bg-ivoire-blanc text-ivoire-texte text-label-sm text-[11px] shrink-0 shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ivoire-orange" /> Savanes
          </button>
          <button className="px-3 py-1 rounded-full bg-ivoire-blanc text-ivoire-texte text-label-sm text-[11px] shrink-0 shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ivoire-vert" /> Abidjan
          </button>
          <button className="px-3 py-1 rounded-full bg-ivoire-blanc text-ivoire-texte text-label-sm text-[11px] shrink-0 shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ivoire-gris" /> Montagnes
          </button>
        </div>
      </div>

      {/* Légende */}
      <div className="absolute bottom-2 left-3 right-3 z-20 flex items-center justify-between px-3 py-1.5 rounded-lg bg-ivoire-nuit/90 backdrop-blur text-ivoire-blanc text-label-sm text-[10px] shadow-md pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-ivoire-orange" /><span>Collecté</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-ivoire-vert" /><span>En cours</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-ivoire-gris" /><span>En attente</span></div>
        </div>
        <span className="text-[9px] text-ivoire-orange font-bold uppercase tracking-wider">SIG v2.4</span>
      </div>

      {/* Carte MapLibre */}
      <div ref={mapRef} className="absolute inset-0" style={{ top: 0, bottom: 0 }} />

      {/* Bottom Sheet */}
      {bottomSheetOpen && (
        <BottomSheet>
          <SheetContent />
        </BottomSheet>
      )}
    </div>
  );
}

function SheetContent() {
  const { currentFeature, bottomSheetContent: content } = useMapStore();

  if (!content) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] uppercase tracking-wider text-ivoire-gris leading-none">Côte d'Ivoire</span>
              <h2 className="font-bold text-ivoire-texte truncate text-headline-sm">Vue Nationale</h2>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-ivoire-vert/10 text-ivoire-vert text-label-sm text-[10px] uppercase font-bold">En ligne</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <KPIBox icon="school" label="Districts" value="34" color="ivoire-orange" />
          <KPIBox icon="groups" label="Écoles" value="~15k" color="ivoire-vert" />
          <KPIBox icon="chair" label="Élèves" value="3.2M" color="ivoire-texte" />
        </div>

        <div className="bg-ivoire-beige/70 rounded-xl p-3 shadow-sm">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-label-sm text-ivoire-texte flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-ivoire-orange">info</span>
              Comment utiliser la carte
            </span>
          </div>
          <p className="text-body-sm text-ivoire-gris text-[12px]">
            Cliquez sur une zone <span className="text-ivoire-orange font-bold">orange</span> (collectée) pour voir les statistiques.
            Naviguez en cascade : District → Région → Département → Commune → École.
          </p>
        </div>
      </div>
    );
  }

  const { type, data, status, name, level } = content;

  return (
    <div className="flex flex-col gap-4">
      {/* Badge statut */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button className="w-7 h-7 rounded-full bg-ivoire-beige flex items-center justify-center text-ivoire-texte shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          </button>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] uppercase tracking-wider text-ivoire-gris leading-none truncate">
              Côte d'Ivoire › {level}
            </span>
            <h2 className="font-bold text-ivoire-texte truncate text-headline-sm">{name}</h2>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-label-sm text-[10px] uppercase font-bold shrink-0 ${
          status === 'collected' ? 'bg-ivoire-orange/10 text-ivoire-orange' :
          status === 'waiting' ? 'bg-ivoire-vert/10 text-ivoire-vert' :
          'bg-surface-container-high text-ivoire-gris'
        }`}>
          {status === 'collected' ? 'Collecté' : status === 'waiting' ? 'En attente' : 'Non programmé'}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <KPIBox icon="school" label="Écoles" value={data?.schools || '—'} color="ivoire-orange" />
        <KPIBox icon="groups" label="Élèves" value={data?.students ? `${Math.round(data.students / 1000)}k` : '—'} color="ivoire-vert" />
        <KPIBox icon="chair" label="Parité" value={data?.girls && data?.boys ? `${Math.round(data.girls / (data.girls + data.boys) * 100)}%` : '—'} color="ivoire-texte" />
      </div>

      {/* Jauge parité */}
      {data?.girls > 0 && data?.boys > 0 && (
        <div className="bg-ivoire-beige/70 rounded-xl p-3 shadow-sm">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-label-sm text-ivoire-texte flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-ivoire-orange">pie_chart</span>
              Parité de Genre
            </span>
            <span className="text-[10px] text-ivoire-gris">IPG: {(data.boys / Math.max(data.girls, 1)).toFixed(2)}</span>
          </div>
          <div className="w-full h-3 bg-ivoire-blanc rounded-full overflow-hidden flex p-0.5 shadow-inner">
            <div className="h-full bg-ivoire-orange rounded-l-full transition-all duration-500"
                 style={{ width: `${Math.round(data.girls / (data.girls + data.boys) * 100)}%` }} />
            <div className="h-full bg-ivoire-vert rounded-r-full transition-all duration-500" />
          </div>
          <div className="flex justify-between items-center mt-1.5 text-label-sm">
            <span className="text-ivoire-orange font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-ivoire-orange" />
              Filles {Math.round(data.girls / (data.girls + data.boys) * 100)}%
            </span>
            <span className="text-ivoire-vert font-bold flex items-center gap-1">
              Garçons {100 - Math.round(data.girls / (data.girls + data.boys) * 100)}%
              <span className="w-2 h-2 rounded-full bg-ivoire-vert" />
            </span>
          </div>
        </div>
      )}

      {/* CTA */}
      {status === 'collected' && (
        <button className="btn-primary w-full flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[18px]">travel_explore</span>
          Explorer les écoles de {name}
        </button>
      )}
    </div>
  );
}

function KPIBox({ icon, label, value, color }) {
  return (
    <div className="bg-ivoire-beige p-2.5 rounded-xl flex flex-col justify-between shadow-sm">
      <div className="flex items-center gap-1 text-ivoire-gris text-label-sm text-[10px]">
        <span className={`material-symbols-outlined text-[13px] text-${color}`}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1">
        <span className="font-bold text-ivoire-texte tabular-nums text-headline-sm">{value}</span>
      </div>
    </div>
  );
}
