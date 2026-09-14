function getConfig(school) {
  const statut = (school.statut || '').toLowerCase();
  const niv = (school.niveau_enseignement || '').toLowerCase();
  const conf = (school.type_genre || school.categorie || '').toLowerCase();

  if (statut === 'prive_confessionnel') {
    if (conf.includes('musulman') || conf.includes('islam')) return { color: '#1A1A2E', icon: 'crescent' };
    if (conf.includes('chrétien') || conf.includes('catholique') || conf.includes('protestant')) return { color: '#1A1A2E', icon: 'cross' };
    return { color: '#1A1A2E', icon: 'star' };
  }

  if (statut === 'communautaire_non_reconnue') return { color: '#0B7A3E', icon: 'dot' };

  const isPublic = statut === 'public';

  if (niv.includes('prescolaire') || niv.includes('maternelle') || niv.includes('primaire')) {
    return isPublic
      ? { color: '#1565C0', icon: 'book' }
      : { color: '#42A5F5', icon: 'book' };
  }

  if (niv.includes('secondaire') || niv.includes('lycee')) {
    return isPublic
      ? { color: '#B71C1C', icon: 'graduation' }
      : { color: '#E65100', icon: 'graduation' };
  }

  if (niv.includes('universitaire') || niv.includes('universit') || niv.includes('superieur')) {
    return { color: '#6A1B9A', icon: 'university' };
  }

  return isPublic
    ? { color: '#1565C0', icon: 'book' }
    : { color: '#42A5F5', icon: 'book' };
}

const ICON_PATHS = {
  cross:      `<path d="M14 5v14M5 14h14" stroke="white" stroke-width="2.5" stroke-linecap="round"/>`,
  crescent:   `<path d="M16 10a6 6 0 1 1-6-6c0 1.5.5 3 1.5 4A6 6 0 0 1 16 10z" fill="white"/>`,
  star:       `<polygon points="14,4.5 15.8,9.8 21,10.2 17,14 18.5,19.5 14,16.5 9.5,19.5 11,14 7,10.2 12.2,9.8" fill="white"/>`,
  book:       `<rect x="8" y="6" width="12" height="14" rx="1" fill="none" stroke="white" stroke-width="1.8"/><path d="M14 6v14M8 10h6M8 13h5" stroke="white" stroke-width="1.4" stroke-linecap="round"/>`,
  graduation: `<path d="M14 5l7 3.5-7 3.5-7-3.5z" fill="none" stroke="white" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 11.5v5c0 1 3 3 7 3s7-2 7-3v-5" fill="none" stroke="white" stroke-width="1.8"/>`,
  university: `<rect x="7" y="10" width="14" height="9" rx="1" fill="none" stroke="white" stroke-width="1.8"/><path d="M7 14h14M14 10v9" stroke="white" stroke-width="1.4"/>`,
  dot:        `<circle cx="14" cy="13" r="3" fill="white"/>`,
};

function createPinSVG(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
    <defs>
      <filter id="ds" x="-20%" y="-10%" width="140%" height="130%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity="0.25"/>
      </filter>
    </defs>
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z" fill="${color}" filter="url(#ds)"/>
    <circle cx="14" cy="13" r="8" fill="white"/>
  </svg>`;
}

export function createSchoolMarker(school) {
  const { color, icon } = getConfig(school);
  const svg = createPinSVG(color);
  const iconPath = ICON_PATHS[icon] || ICON_PATHS.dot;

  const el = document.createElement('div');
  el.style.cssText = 'width:28px;height:38px;cursor:pointer;position:relative;transition:transform .15s ease;transform-origin:bottom center;';
  el.innerHTML = svg;
  el.insertAdjacentHTML('beforeend', `<svg style="position:absolute;top:5px;left:0;width:28px;height:28px" viewBox="0 0 28 28">${iconPath}</svg>`);
  el.title = school.nom_etablissement || '';

  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2) translateY(-3px)'; });
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

  return el;
}
