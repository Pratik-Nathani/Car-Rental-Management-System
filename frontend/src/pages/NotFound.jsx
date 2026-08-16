import { Link } from 'react-router-dom'
export default function NotFound() {
  return (
    <div className="h-screen overflow-y-auto flex items-center justify-center bg-gray-50">
      <div className="text-center animate-fade-in">
        <div className="text-8xl font-bold text-orange-500 mb-4">404</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h2>
        <p className="text-gray-500 mb-6">The page you are looking for does not exist.</p>
        <Link to="/" className="btn-primary">Go Home</Link>
      </div>
    </div>
  )
}
