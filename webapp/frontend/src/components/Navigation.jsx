import { Link } from 'react-router-dom'
import trophyImage from '../../htc.logo.new.blue.png'
import { Users, BarChart3, Home, Trophy, LogOut, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

function Navigation() {
  const { user, signOut } = useAuth()

  return (
    <nav className="bg-[#1E293B] border-b border-[#334155] shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="relative">
                <img src={trophyImage} alt="HTC Logo" className="h-10 w-10 transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 rounded-full transition-opacity"
                style={{ backgroundColor: 'var(--color-primary)', opacity: '0' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.2'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}></div>
              </div>
              <span className="text-2xl font-bold text-white">HTC Race Admin</span>
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            {user ? (
              <>
                <Link
                  to="/"
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#334155] transition-all duration-300 group"
                >
                  <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Races</span>
                </Link>
                <Link
                  to="/analytics"
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#334155] transition-all duration-300 group"
                >
                  <BarChart3 className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Analytics</span>
                </Link>
                <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-[#334155]">
                  <span className="text-slate-300 text-sm">{user.email}</span>
                  <button
                    onClick={signOut}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#334155] transition-all duration-300 group"
                  >
                    <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#334155] transition-all duration-300 group"
              >
                <LogIn className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
