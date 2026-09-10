import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="h-full flex items-center justify-center bg-surface">
      <div className="text-center">
        <span className="material-symbols-outlined text-ivoire-gris text-[64px]">search_off</span>
        <h1 className="text-headline-lg-mobile text-ivoire-nuit mt-3 font-black">Page non trouvée</h1>
        <p className="text-body-md text-ivoire-gris mt-2">La page que vous cherchez n'existe pas.</p>
        <Link to="/" className="btn-primary inline-block mt-4 no-underline">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
