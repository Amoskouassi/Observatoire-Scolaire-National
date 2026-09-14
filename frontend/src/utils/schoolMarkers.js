let markerId = 0;

function getColor(school) {
  const statut = (school.statut || '').toLowerCase();
  const niv = (school.niveau_enseignement || '').toLowerCase();

  if (statut === 'prive_confessionnel') return '#1A1A2E';
  if (statut === 'communautaire_non_reconnue') return '#0B7A3E';

  const isPublic = statut === 'public';

  if (niv.includes('prescolaire') || niv.includes('maternelle') || niv.includes('primaire'))
    return isPublic ? '#1565C0' : '#42A5F5';

  if (niv.includes('secondaire') || niv.includes('lycee'))
    return isPublic ? '#B71C1C' : '#E65100';

  if (niv.includes('universitaire') || niv.includes('universit') || niv.includes('superieur'))
    return '#6A1B9A';

  return isPublic ? '#1565C0' : '#42A5F5';
}

export function createSchoolMarker(school) {
  const color = getColor(school);
  const id = `pin-${markerId++}`;

  const el = document.createElement('div');
  el.style.cssText = 'width:28px;height:38px;cursor:pointer;transition:transform .15s ease;transform-origin:bottom center;';
  el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
    <defs>
      <filter id="${id}" x="-20%" y="-10%" width="140%" height="130%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity="0.25"/>
      </filter>
    </defs>
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z" fill="${color}" filter="url(#${id})"/>
    <circle cx="14" cy="13" r="8" fill="white"/>
  </svg>`;
  el.title = school.nom_etablissement || '';

  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2) translateY(-3px)'; });
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

  return el;
}
