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

  const el = document.createElement('div');
  el.style.cssText = 'width:24px;height:34px;cursor:pointer;position:relative;';

  el.innerHTML = `<div style="
    width:24px;height:34px;
    background:${color};
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 2px 6px rgba(0,0,0,0.3);
    position:relative;
  "><div style="
    width:12px;height:12px;
    background:white;
    border-radius:50%;
    position:absolute;
    top:6px;left:6px;
  "></div></div>`;

  el.title = school.nom_etablissement || '';

  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15) translateY(-2px)'; el.style.transition = 'transform .15s ease'; });
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

  return el;
}
