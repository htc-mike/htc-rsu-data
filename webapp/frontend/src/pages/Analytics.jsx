import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, DollarSign, Users, Calendar, Heart } from 'lucide-react'
import { supabase } from '../supabaseClient.js'

function Analytics() {
  const [summary, setSummary] = useState(null)
  const [raceRevenue, setRaceRevenue] = useState([])
  const [donationsSummary, setDonationsSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('average')
  const [availableYears, setAvailableYears] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryResponse, raceRevenueResponse, donationsResponse] = await Promise.all([
          supabase.rpc('get_analytics_summary'),
          supabase.rpc('get_race_revenue'),
          supabase.from('donations').select('donation_amount')
        ])
        
        if (summaryResponse.error) {
          console.error('RPC error for analytics summary:', summaryResponse.error)
          throw summaryResponse.error
        }
        if (raceRevenueResponse.error) {
          console.error('RPC error for race revenue:', raceRevenueResponse.error)
          throw raceRevenueResponse.error
        }
        if (donationsResponse.error) {
          console.error('Error loading donations:', donationsResponse.error)
          throw donationsResponse.error
        }
        
        setSummary(summaryResponse.data)
        setRaceRevenue(raceRevenueResponse.data)
        
        // Calculate donations summary
        const totalDonations = donationsResponse.data.length
        const totalAmount = donationsResponse.data.reduce((sum, d) => sum + (d.donation_amount || 0), 0)
        setDonationsSummary({ total_donations: totalDonations, total_amount: totalAmount })
        
        // Extract available years from race revenue data
        const years = [...new Set(raceRevenueResponse.data.map(r => r.year))].filter(Boolean).sort()
        setAvailableYears(years)
        
        setLoading(false)
      } catch (err) {
        console.error('Failed to load analytics data:', err)
        setError('Failed to load analytics data')
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0'
    return new Intl.NumberFormat('en-US').format(num)
  }

  const calculateAverages = () => {
    if (!raceRevenue.length) return null
    
    const totalRaces = raceRevenue.length
    const totalEvents = raceRevenue.reduce((sum, r) => sum + (Number(r.event_count) || 0), 0)
    const totalRegistrations = raceRevenue.reduce((sum, r) => sum + (Number(r.registration_count) || 0), 0)
    const totalRevenue = raceRevenue.reduce((sum, r) => sum + (Number(r.total_revenue) || 0), 0)
    
    // Calculate average revenue per year
    const yearGroups = {}
    raceRevenue.forEach(r => {
      const year = Math.floor(r.year)
      if (!yearGroups[year]) {
        yearGroups[year] = 0
      }
      yearGroups[year] += (Number(r.total_revenue) || 0)
    })
    const yearlyRevenues = Object.values(yearGroups)
    const avgRevenuePerYear = yearlyRevenues.length > 0 ? yearlyRevenues.reduce((sum, val) => sum + (Number(val) || 0), 0) / yearlyRevenues.length : 0
    
    return {
      total_races: totalRaces,
      avg_events: totalEvents / totalRaces,
      avg_registrations: totalRegistrations / totalRaces,
      avg_revenue: avgRevenuePerYear
    }
  }

  const getFilteredData = () => {
    if (filter === 'average') {
      const averages = calculateAverages()
      if (!averages) return []
      
      // Group by race and calculate average registrations and revenue per race
      const raceGroups = {}
      raceRevenue.forEach(r => {
        if (!raceGroups[r.race_name]) {
          raceGroups[r.race_name] = { 
            regTotal: 0, 
            regCount: 0,
            revenueTotal: 0,
            revenueCount: 0
          }
        }
        raceGroups[r.race_name].regTotal += (Number(r.registration_count) || 0)
        raceGroups[r.race_name].regCount += 1
        raceGroups[r.race_name].revenueTotal += (Number(r.total_revenue) || 0)
        raceGroups[r.race_name].revenueCount += 1
      })
      
      return Object.keys(raceGroups).map(raceName => {
        const group = raceGroups[raceName]
        const avgReg = group.regTotal / group.regCount
        const avgRevenue = group.revenueTotal / group.revenueCount
        const avgRevenuePerReg = avgReg > 0 ? avgRevenue / avgReg : 0
        
        return {
          race_name: raceName,
          registration_count: avgReg,
          total_revenue: avgRevenue,
          avg_revenue_per_registration: avgRevenuePerReg
        }
      })
    }
    
    return raceRevenue.filter(r => Math.floor(r.year) === parseInt(filter))
  }

  if (loading) return <div className="text-center py-12 text-[#94A3B8] animate-fade-in">Loading analytics...</div>
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>

  return (
    <div className="animate-fade-in">
      <h1 className="text-5xl font-bold mb-8 text-white">Analytics Dashboard</h1>

      {/* Filter Dropdown */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#94A3B8] mb-2">Filter By</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="block w-64 px-3 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        >
          <option value="average">Average</option>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">{filter === 'average' ? 'Total Races' : 'Races'}</p>
              <p className="text-3xl font-bold text-white">{formatNumber(filter === 'average' ? calculateAverages()?.total_races : getFilteredData().length)}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">{filter === 'average' ? 'Avg Registrations/Race' : 'Total Registrations'}</p>
              <p className="text-3xl font-bold text-white">
                {filter === 'average'
                  ? formatNumber(calculateAverages()?.avg_registrations?.toFixed(0))
                  : formatNumber(getFilteredData().reduce((sum, r) => sum + (r.registration_count || 0), 0))
                }
              </p>
            </div>
            <Users className="h-8 w-8 text-purple-400" />
          </div>
        </div>
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">{filter === 'average' ? 'Avg Revenue/Year' : 'Total Revenue'}</p>
              <p className="text-3xl font-bold text-white">
                {filter === 'average'
                  ? formatCurrency(calculateAverages()?.avg_revenue ?? 0)
                  : formatCurrency(getFilteredData().reduce((sum, r) => sum + (Number(r.total_revenue) || 0), 0))
                }
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-400" />
          </div>
        </div>
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Total Donations</p>
              <p className="text-3xl font-bold text-white">
                {formatCurrency(donationsSummary?.total_amount || 0)}
              </p>
            </div>
            <Heart className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Race Revenue Chart */}
      <div className="card p-6 mb-8 animate-slide-in">
        <h2 className="text-2xl font-bold text-white mb-4">
          {filter === 'average' ? 'Average Participants by Race' : `Participants by Race (${filter})`}
        </h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getFilteredData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="race_name" angle={-45} textAnchor="end" height={100} stroke="#94A3B8" fill="#94A3B8" />
              <YAxis stroke="#94A3B8" fill="#94A3B8" />
              <Tooltip 
                formatter={(value) => formatNumber(value)} 
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#F8FAFC' }}
              />
              <Legend />
              <Bar dataKey="registration_count" fill="#3B82F6" name="Participants" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Race Details Table */}
      <div className="card p-6 animate-slide-in">
        <h2 className="text-2xl font-bold text-white mb-4">
          {filter === 'average' ? 'Race Performance (Averages)' : `Race Performance (${filter})`}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0F172A]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Race</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Registrations</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">{filter === 'average' ? 'Avg Revenue' : 'Total Revenue'}</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Avg Revenue/Reg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {(() => {
                const filteredData = getFilteredData()
                const totalRevenue = filteredData.reduce((sum, r) => sum + (Number(r.total_revenue) || 0), 0)
                const totalRegistrations = filteredData.reduce((sum, r) => sum + (Number(r.registration_count) || 0), 0)
                return (
                  <>
                    {filteredData.map((race, index) => (
                      <tr key={race.race_id || index} className="hover:bg-[#334155] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">
                          {race.race_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#94A3B8]">
                          {formatNumber(race.registration_count)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                          {formatCurrency(race.total_revenue || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                          {formatCurrency(race.avg_revenue_per_registration)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#0F172A] font-bold">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">Totals</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {formatNumber(totalRegistrations)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {formatCurrency(totalRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {formatCurrency(totalRevenue / (totalRegistrations || 1))}
                      </td>
                    </tr>
                  </>
                )
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Analytics
