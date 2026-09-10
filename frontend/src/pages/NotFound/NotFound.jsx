import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="h-full flex items-center justify-center bg-[#F4EFE6]">
      <div className="text-center">
        <span className="material-symbols-outlined text-[#6B7280] text-[64px]">search_off</span>
        <h1 className="text-[1.5rem] font-black text-[#0D1B2A] mt-3">Page non trouvée</h1>
        <Link to="/" className="btn-primary inline-block mt-4 no-underline">Retour</Link>
      </div>
    </div>
  );
}
