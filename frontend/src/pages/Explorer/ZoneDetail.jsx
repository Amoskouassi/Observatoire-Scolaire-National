import { useState, useEffect } from 'react';
import { api } from '../../services/api';

const COLORS = {
  collected: '#E8611A',
  waiting: '#00796B',
  pending: '#CBD5E1',
};

const STATUS_LABEL = {
  collected: 'Collecte',
  waiting: 'En attente',
  pending: 'Non programmé',
};

export default function ZoneDetail({ zone, level }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const pct = zone.girls && zone.boys ? Math.round(zone.girls / (zone.girls + zone.boys) * 100) : 0;

  useEffect(() => {
    if (!zone.code) { setLoading(false); return; }
    setLoading(true);
    const apiLevel = level === 'sous-prefecture' ? 'commune' : level;
    api.getDashboardStats(apiLevel, zone.code).then(d => { setDetail(d); setLoading(false); }).catch(() => setLoading(false));
  }, [zone.code, level]);

  const totalStudents = zone.students || detail?.total_eleves || 0;
  const girls = zone.girls || detail?.total_filles || 0;
  const boys = zone.boys || detail?.total_garcons || 0;
  const schoolCount = zone.schools || detail?.total_ecoles || 0;

  if (loading) {
    return <div className="flex items-center justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-[#E8611A]/20 border-t-[#E8611A] animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
        <div className="flex items-center justify-between mb-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: `${COLORS[zone.status] || COLORS.pending}10`, color: COLORS[zone.status] || COLORS.pending }}>
            {STATUS_LABEL[zone.status] || zone.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Écoles</p>
            <p className="text-2xl font-extrabold text-[#0D1B2A] tracking-tight mt-0.5">{(schoolCount || 0).toLocaleString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Élèves</p>
            <p className="text-2xl font-extrabold text-[#0D1B2A] tracking-tight mt-0.5">{totalStudents ? totalStudents.toLocaleString('fr-FR') : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#E8611A] font-bold uppercase tracking-wider">Filles</p>
            <p className="text-2xl font-extrabold text-[#E8611A] tracking-tight mt-0.5">{(girls || 0).toLocaleString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#00796B] font-bold uppercase tracking-wider">Garçons</p>
            <p className="text-2xl font-extrabold text-[#00796B] tracking-tight mt-0.5">{(boys || 0).toLocaleString('fr-FR')}</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Parité F/G</span>
            <span className="text-[10px] font-bold text-[#0D1B2A]">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden flex">
            <div className="h-full bg-[#E8611A] rounded-l-full transition-all duration-500" style={{ width: pct + '%' }} />
            <div className="h-full bg-[#00796B] rounded-r-full flex-1" />
          </div>
          <div className="flex justify-between text-[9px] font-bold mt-1">
            <span className="text-[#E8611A]">{pct}% filles</span>
            <span className="text-[#00796B]">{100 - pct}% garçons</span>
          </div>
        </div>
      </div>

      {detail && (
        <>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-3">Collecte</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Collecté', value: detail.by_status?.collected || 0, color: COLORS.collected },
                { label: 'En cours', value: detail.by_status?.waiting || 0, color: COLORS.waiting },
                { label: 'En attente', value: detail.by_status?.pending || 0, color: COLORS.pending },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] text-[#94A3B8] font-semibold">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {detail.infrastructure && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
              <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-3">Infrastructure</p>
              <div className="flex flex-col gap-2">
                {[
                  { icon: 'wc', label: 'Sans toilettes', value: detail.infrastructure.sans_toilettes, color: '#ba1a1a' },
                  { icon: 'water_drop', label: 'Sans eau', value: detail.infrastructure.sans_eau, color: '#1E88E5' },
                  { icon: 'bolt', label: 'Sans électricité', value: detail.infrastructure.sans_electricite, color: '#F9A825' },
                  { icon: 'construction', label: 'Matériaux précaires', value: detail.infrastructure.materiaux_precaires, color: '#E8611A' },
                  { icon: 'chair', label: 'Bancs manquants', value: detail.infrastructure.besoin_bancs, color: '#00796B' },
                ].map(i => (
                  <div key={i.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]" style={{ color: i.color }}>{i.icon}</span>
                      <span className="text-[11px] text-[#475569] font-medium">{i.label}</span>
                    </div>
                    <span className="text-[12px] font-extrabold" style={{ color: i.color }}>{i.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail.parity_by_level && Object.keys(detail.parity_by_level).length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
              <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-3">Parité par niveau</p>
              <div className="flex flex-col gap-3">
                {Object.entries(detail.parity_by_level).map(([niveau, data]) => {
                  const total = (data.filles || 0) + (data.garcons || 0);
                  const pctN = total > 0 ? Math.round(data.filles / total * 100) : 0;
                  return (
                    <div key={niveau}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-[#0D1B2A] capitalize">{niveau}</span>
                        <span className="text-[10px] text-[#94A3B8] font-medium">{total.toLocaleString('fr-FR')} élèves</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden flex">
                        <div className="h-full bg-[#E8611A] rounded-l-full" style={{ width: pctN + '%' }} />
                        <div className="h-full bg-[#00796B] rounded-r-full flex-1" />
                      </div>
                      <div className="flex justify-between text-[9px] font-bold mt-0.5">
                        <span className="text-[#E8611A]">{data.filles} F ({pctN}%)</span>
                        <span className="text-[#00796B]">{data.garcons} G</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {detail.monthly && detail.monthly.some(m => m.count > 0) && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-[#CBD5E1]/10">
              <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-3">Collecte mensuelle</p>
              <div className="flex items-end gap-1 h-16">
                {detail.monthly.map(m => {
                  const max = Math.max(...detail.monthly.map(x => x.count), 1);
                  const h = Math.round((m.count / max) * 100);
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5" title={`${m.label}: ${m.count}`}>
                      <div className="w-full bg-[#E8611A] rounded-t transition-all" style={{ height: `${Math.max(h, 4)}%`, minHeight: m.count > 0 ? '4px' : '1px', opacity: m.count > 0 ? 1 : 0.2 }} />
                      <span className="text-[7px] text-[#94A3B8] font-medium leading-none">{m.label.split('.')[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
