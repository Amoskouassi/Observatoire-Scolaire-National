import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="h-full flex items-center justify-center bg-akwa-beige">
      <div className="text-center">
        <p className="text-6xl mb-4">🔍</p>
        <h1 className="text-2xl font-black text-akwa-texte">Page non trouvée</h1>
        <p className="text-sm text-gray-500 mt-2">La page que vous cherchez n'existe pas.</p>
        <Link to="/" className="btn-primary inline-block mt-4 no-underline">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
