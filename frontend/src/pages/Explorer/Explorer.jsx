import { useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../../stores/mapStore';
import { useAuthStore } from '../../stores/authStore';
import { PMTILES_URLS, NAVIGATION_LEVELS, SCHOOL_SIZES } from '../../services/config';
import { api } from '../../services/api';
import Sidebar from '../../components/Sidebar/Sidebar';
import FilterBar from '../../components/FilterBar/FilterBar';
import MapLegend from '../../components/MapLegend/MapLegend';
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

  const { level, code } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const {
    currentLevel, setCurrentLevel,
    currentFeature, setCurrentFeature,
    sidebarOpen, openSidebar, closeSidebar,
    filters, schoolsData, setSchoolsData,
    setSchoolsLoading,
  } = useMapStore();

  // Initialisation carte
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
    });

    map.on('click', handleMapClick);
    mapInstance.current = map;

    return () => map.remove();
  }, []);

  // Chargement des écoles une seule fois
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

  // Cacher le loading après 1.5s
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
      { id: 'districts', source: 'districts', zoom: [7, 9], color: '#CBD5E1', width: 1.5 },
      { id: 'regions', source: 'regions', zoom: [8.5, 10], color: '#94A3B8', width: 1.5 },
      { id: 'depts', source: 'depts', zoom: [10, 11.5], color: '#CBD5E1', width: 1.2 },
      { id: 'communes', source: 'communes', zoom: [11, 13], color: '#CBD5E1', width: 1 },
    ];

    levels.forEach(({ id, source, zoom, color, width }) => {
      map.addSource(source, {
        type: 'vector',
        url: `pmtiles://${PMTILES_URLS[id === 'districts' ? 'districts' : id === 'regions' ? 'regions' : id === 'depts' ? 'depts' : 'communes']}`,
      });

      map.addLayer({
        id: `fill-${id}`,
        type: 'fill',
        source,
        'source-layer': `admin_${id}`,
        minzoom: zoom[0],
        maxzoom: zoom[1],
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
        minzoom: zoom[0],
        maxzoom: zoom[1],
        paint: {
          'line-color': color,
          'line-width': width,
          'line-opacity': 0.8,
        },
      });
    });

    // Hover effect
    let hoveredFeatureId = null;
    levels.forEach(({ id }) => {
      map.on('mouseenter', `fill-${id}`, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', `fill-${id}`, () => { map.getCanvas().style.cursor = ''; });

      map.on('mousemove', `fill-${id}`, (e) => {
        if (hoveredFeatureId !== null) {
          map.setFeatureState({ source: id, sourceLayer: `admin_${id}`, id: hoveredFeatureId }, { hover: false });
        }
        hoveredFeatureId = e.features?.[0]?.id;
        if (hoveredFeatureId !== null) {
          map.setFeatureState({ source: id, sourceLayer: `admin_${id}`, id: hoveredFeatureId }, { hover: true });
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
          6, 100,
          8, 500,
          12, 1000,
          16,
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

  const handleMapClick = useCallback((e) => {
    const clickedFeatures = mapInstance.current?.queryRenderedFeatures(e.point, { layers: ['ecoles-points'] });
    if (clickedFeatures?.length) {
      const feature = clickedFeatures[0];
      const schoolId = feature.properties?.id;
      if (schoolId) {
        navigate(`/ecole/${schoolId}`);
        return;
      }
    }

    const adminLevels = ['fill-communes', 'fill-depts', 'fill-regions', 'fill-districts'];
    const adminFeature = mapInstance.current?.queryRenderedFeatures(e.point, { layers: adminLevels })?.[0];
    if (adminFeature) {
      const levelName = adminFeature.layer.id.replace('fill-', '');
      const zoomMap = { districts: 8, regions: 9, depts: 10.5, communes: 12 };
      mapInstance.current?.easeTo({
        center: e.lngLat,
        zoom: zoomMap[levelName] || 10,
        duration: 1500,
        essential: true,
      });
    }
  }, [navigate]);

  // Appliquer les filtres
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
      if (filters.manque_enseignants && p.enseignants_presents > 0) return false;
      if (filters.materiaux_precaires && p.materiaux_precaires?.length === 0) return false;
      if (filters.taux_filles_min !== null) {
        const ratio = p.nombre_filles / Math.max(p.nombre_filles + p.nombre_garcons, 1);
        if (ratio * 100 < filters.taux_filles_min) return false;
      }
      if (filters.taux_filles_max !== null) {
        const ratio = p.nombre_filles / Math.max(p.nombre_filles + p.nombre_garcons, 1);
        if (ratio * 100 > filters.taux_filles_max) return false;
      }
      return true;
    });

    mapInstance.current.getSource('ecoles')?.setData({
      type: 'FeatureCollection',
      features: filtered,
    });
  }, [filters, schoolsData]);

  return (
    <>
      <div ref={loadingRef} className="absolute inset-0 z-50 bg-akwa-beige">
        <LoadingScreen />
      </div>

      <div className="relative h-full flex">
        <Sidebar />
        <div ref={mapRef} className="flex-1 h-full" />
        <FilterBar />
      </div>

      <MapLegend />
    </>
  );
}
