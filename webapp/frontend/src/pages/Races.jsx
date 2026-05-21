import { useState, useEffect } from 'react'
import React from 'react'
import { Link } from 'react-router-dom'
import trophyImage from '../../htc.logo.new.blue.png'
import { Calendar, DollarSign, Users, ArrowRight, MapPin } from 'lucide-react'
import { supabase } from '../supabaseClient.js'

const stripHtml = (html) => {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

function Races() {
  const [races, setRaces] = useState([])
  const [yearOverYear, setYearOverYear] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showActiveOnly, setShowActiveOnly] = useState(true)

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD'
    return dateStr.split('T')[0]
  }

  const formatCurrency = (amount) => {
    if (!amount) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num) => {
    if (!num) return '0'
    return new Intl.NumberFormat('en-US').format(num)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [racesResponse, yoyResponse] = await Promise.all([
          supabase.from('races').select('*').not('next_date', 'is', null).order('next_date', { ascending: true, nullsFirst: false }),
          supabase.from('v_race_revenue_summary').select('*').order('race_name').order('race_year', { ascending: false })
        ])
        
        if (racesResponse.error) throw racesResponse.error
        if (yoyResponse.error) throw yoyResponse.error
        
        setRaces(racesResponse.data)
        setYearOverYear(yoyResponse.data)
        setLoading(false)
      } catch (err) {
        setError('Failed to load races')
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div className="text-center py-12 text-[#94A3B8] animate-fade-in">Loading races...</div>
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>

  return (
    <div className="animate-fade-in">
      <h1 className="text-5xl font-bold mb-8 text-white">Races</h1>
      
      {/* Year-over-Year Comparison */}
      {yearOverYear.length > 0 && (
        <div className="card p-6 mb-8 animate-slide-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Year-over-Year Comparison</h2>
            <label className="flex items-center space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="w-4 h-4 rounded border-[#334155] focus:ring-2"
                style={{ color: 'var(--color-primary)', backgroundColor: showActiveOnly ? 'var(--color-primary)' : 'transparent' }}
              />
              <span className="text-sm text-[#94A3B8] group-hover:text-white transition-colors">Active races only</span>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0F172A]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Race</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Registrations</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Donations</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {(() => {
                  const filteredData = yearOverYear.filter(item => !showActiveOnly || item.active === 'Y')
                  const groupedData = {}
                  filteredData.forEach(item => {
                    if (!groupedData[item.race_name]) {
                      groupedData[item.race_name] = []
                    }
                    groupedData[item.race_name].push(item)
                  })
                  
                  return Object.keys(groupedData).sort().map(raceName => {
                    const raceItems = groupedData[raceName].sort((a, b) => b.race_year - a.race_year)
                    return (
                      <React.Fragment key={raceName}>
                        {raceItems.map((item, index) => (
                          <tr key={`${item.race_name}-${item.race_year}-${index}`} className="hover:bg-[#334155] transition-colors">
                            {index === 0 && (
                              <td 
                                rowSpan={raceItems.length} 
                                className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white bg-[#0F172A]"
                              >
                                {item.race_name}
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#94A3B8]">
                              {item.race_year}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                              {formatNumber(item.registrations)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                              {formatCurrency(item.revenue)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                              {formatCurrency(item.donations)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#94A3B8]">
                              {item.active === 'Y' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Yes</span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {races.length === 0 ? (
        <div className="text-center py-12 text-[#94A3B8]">No races found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {races.map((race, index) => (
            <Link
              key={race.race_id}
              to={`/races/${race.race_id}`}
              className="card p-6 group animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img 
                      src={race.logo_url || trophyImage} 
                      alt="Race Logo" 
                      className="h-12 w-12 rounded-lg transition-transform group-hover:scale-110" 
                      onError={(e) => e.target.src = trophyImage}
                    />
                    <div className="absolute inset-0 rounded-lg transition-opacity"
                    style={{ backgroundColor: 'var(--color-primary)', opacity: '0' }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.2'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}></div>
                  </div>
                  <h2 className="text-xl font-bold text-white transition-colors"
                  style={{ color: 'var(--color-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary-light)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary)'}>{race.name}</h2>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-[#94A3B8] mb-4">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" style={{ color: 'var(--color-primary)' }} />
                    {formatDate(race.next_date)}
                  </span>
                  {(race.address_city || race.address_state) && (
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" style={{ color: 'var(--color-primary)' }} />
                      {race.address_city && race.address_state ? `${race.address_city}, ${race.address_state}` : race.address_city || race.address_state}
                    </span>
                  )}
                </div>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--color-primary)' }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Races
