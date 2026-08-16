import { Link } from 'react-router-dom'
export default function Unauthorized() {
  return (
    <div className="h-screen overflow-y-auto flex items-center justify-center bg-gray-50">
      <div className="text-center animate-fade-in">
        <div className="text-8xl font-bold text-red-500 mb-4">403</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-gray-500 mb-6">You are not authorized to view this page.</p>
        <Link to="/" className="btn-primary">Go Home</Link>
      </div>
    </div>
  )
}
