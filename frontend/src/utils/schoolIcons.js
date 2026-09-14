export function addCustomIcons(map) {
  const icons = [
    { name: 'maternelle', shape: 'square', color: '#9C27B0' },
    { name: 'primaire-public', shape: 'circle', color: '#1565C0' },
    { name: 'primaire-prive', shape: 'circle', color: '#42A5F5' },
    { name: 'secondaire-public', shape: 'diamond', color: '#B71C1C' },
    { name: 'secondaire-prive', shape: 'diamond', color: '#E65100' },
    { name: 'superieur', shape: 'hexagon', color: '#6A1B9A' },
    { name: 'confessionnel', shape: 'star', color: '#1A1A2E' },
    { name: 'communautaire', shape: 'triangle', color: '#00796B' },
    { name: 'default', shape: 'circle', color: '#1565C0' },
  ];

  icons.forEach(({ name, shape, color }) => {
    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2, r = size / 2 - 2;

    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = color;
    ctx.strokeStyle = '#FAF8F3';
    ctx.lineWidth = 2;

    switch (shape) {
      case 'square':
        ctx.beginPath();
        const sr = 4;
        ctx.moveTo(cx - r + sr, cy - r);
        ctx.lineTo(cx + r - sr, cy - r);
        ctx.quadraticCurveTo(cx + r, cy - r, cx + r, cy - r + sr);
        ctx.lineTo(cx + r, cy + r - sr);
        ctx.quadraticCurveTo(cx + r, cy + r, cx + r - sr, cy + r);
        ctx.lineTo(cx - r + sr, cy + r);
        ctx.quadraticCurveTo(cx - r, cy + r, cx - r, cy + r - sr);
        ctx.lineTo(cx - r, cy - r + sr);
        ctx.quadraticCurveTo(cx - r, cy - r, cx - r + sr, cy - r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('M', cx, cy);
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'hexagon':
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          const hx = cx + r * Math.cos(angle);
          const hy = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'star':
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const outerAngle = (Math.PI * 2 / 5) * i - Math.PI / 2;
          const innerAngle = outerAngle + Math.PI / 5;
          ctx.lineTo(cx + r * Math.cos(outerAngle), cy + r * Math.sin(outerAngle));
          ctx.lineTo(cx + r * 0.5 * Math.cos(innerAngle), cy + r * 0.5 * Math.sin(innerAngle));
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy + r * 0.7);
        ctx.lineTo(cx - r, cy + r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      default:
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
    }

    const imageData = ctx.getImageData(0, 0, size, size);
    map.addImage(name, imageData);
  });
}

export function getIconForSchool(school) {
  const statut = (school.statut || '').toLowerCase();
  const niv = (school.niveau_enseignement || '').toLowerCase();

  if (niv.includes('prescolaire') || niv.includes('maternelle')) return 'maternelle';
  if (statut === 'prive_confessionnel') return 'confessionnel';
  if (statut === 'communautaire_non_reconnue') return 'communautaire';

  const isPublic = statut === 'public';

  if (niv.includes('primaire'))
    return isPublic ? 'primaire-public' : 'primaire-prive';

  if (niv.includes('secondaire') || niv.includes('lycee'))
    return isPublic ? 'secondaire-public' : 'secondaire-prive';

  if (niv.includes('universitaire') || niv.includes('universit') || niv.includes('superieur'))
    return 'superieur';

  return isPublic ? 'primaire-public' : 'primaire-prive';
}
