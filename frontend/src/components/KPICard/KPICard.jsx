export default function KPICard({ label, value, icon, color = 'ivoire-texte', trend }) {
  return (
    <div className="kpi-card">
      {icon && <span className={`material-symbols-outlined text-[18px] text-${color}`}>{icon}</span>}
      <span className="text-label-sm text-ivoire-gris leading-tight mb-1">{label}</span>
      <div className="flex items-end gap-1.5">
        <span className={`text-kpi-metric-mobile text-${color} tabular-nums`}>{value}</span>
        {trend !== undefined && (
          <span className={`text-[10px] font-bold mb-0.5 ${trend >= 0 ? 'text-ivoire-vert' : 'text-ivoire-rouge'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}
