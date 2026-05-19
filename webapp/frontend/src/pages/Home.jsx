import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Trophy, UserCheck, BarChart3, ArrowRight, Calendar, Users, DollarSign, TrendingUp } from 'lucide-react'
import { supabase } from '../supabaseClient.js'

function Home() {
  const [racesData, setRacesData] = useState([])
  const [membershipsData, setMembershipsData] = useState([])
  const [membershipMonthlyData, setMembershipMonthlyData] = useState([])
  const [resultsData, setResultsData] = useState([])
  const [analyticsData, setAnalyticsData] = useState([])
  const [balanceOverTimeData, setBalanceOverTimeData] = useState([])
  const [currentBalance, setCurrentBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch races data (for alias lookup)
        const { data: races } = await supabase.from('races').select('race_id, name, alias')
        setRacesData(races || [])

        // Fetch memberships data (level distribution and active status)
        const { data: memberships } = await supabase.from('v_memberships').select('club_membership_level_name, membership_end').limit(1000)
        setMembershipsData(memberships || [])

        // Fetch membership summary data
        const { data: membershipSummary, error: summaryError } = await supabase
          .from('v_membership_summary')
          .select('month, ending_total, new')
        console.log('Membership summary data:', membershipSummary)
        console.log('Membership summary error:', summaryError)
        if (membershipSummary) {
          // Take the last 12 months of data (assuming it's ordered chronologically)
          const last12Months = membershipSummary.slice(-12)
          const sortedData = last12Months.map(m => ({
            month: m.month,
            ending_total: Number(m.ending_total) || 0,
            new: Number(m.new) || 0
          }))
          setMembershipMonthlyData(sortedData)
        } else {
          console.error('Failed to load membership summary:', summaryError)
          setMembershipMonthlyData([])
        }

        // Fetch race finishers data from htc.v_race_finishers
        const { data: finishers, error: finishersError } = await supabase
          .from('v_race_finishers')
          .select('race_id, alias, race_year, finishers')
        setResultsData(finishers || [])

        // Fetch analytics data for Registration Trends chart
        const { data: analytics } = await supabase.rpc('get_race_revenue')
        setAnalyticsData(analytics || [])

        // Fetch balance over time data from v_check_register_summary
        const { data: summaryData } = await supabase
          .from('v_check_register_summary')
          .select('*')
          .order('trans_date', { ascending: true })
        if (summaryData) {
          const twelveMonthsAgo = new Date()
          twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
          const filteredData = summaryData
            .filter(s => new Date(s.trans_date) >= twelveMonthsAgo)
            .map(s => ({
              date: new Date(s.trans_date).toLocaleDateString('en-US', { year: '2-digit', month: 'short' }),
              balance: s.balance || 0
            }))
          setBalanceOverTimeData(filteredData)
        }

        // Fetch current balance from finance data
        const currentYear = new Date().getFullYear()
        const { data: detailData } = await supabase.from('v_check_register_detail').select('*')
        if (detailData) {
          const currentYearData = detailData.filter(d => d.trans_year === currentYear)
          currentYearData.sort((a, b) => new Date(b.trans_date) - new Date(a.trans_date))
          setCurrentBalance(currentYearData.length > 0 ? currentYearData[0].balance : 0)
        }

        setLoading(false)
      } catch (err) {
        console.error('Failed to load home data:', err)
        setError('Failed to load dashboard data')
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatCurrency = (amount) => {
    if (!amount) return '$0'
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

  // Calculate active members (membership_end is in future or null)
  const getActiveMemberCount = () => {
    const now = new Date()
    return membershipsData.filter(m => {
      if (!m.membership_end) return true // No end date means active
      const endDate = new Date(m.membership_end)
      return endDate >= now
    }).length
  }

  // Calculate membership level distribution for pie chart
  const getMembershipLevelData = () => {
    const levelCounts = {}
    membershipsData.forEach(m => {
      const level = m.club_membership_level_name || 'Unknown'
      levelCounts[level] = (levelCounts[level] || 0) + 1
    })
    
    return Object.keys(levelCounts).map(level => ({
      name: level,
      value: levelCounts[level]
    }))
  }

  // Calculate race finishers for bar chart
  const getRaceParticipationData = () => {
    if (!resultsData.length) return []
    
    // Group by race and get the last year of each race
    const raceMap = new Map()
    resultsData.forEach(r => {
      const raceKey = r.race_id || 'Unknown'
      if (!raceMap.has(raceKey)) {
        raceMap.set(raceKey, r)
      } else {
        // Keep the most recent entry (higher year)
        const existing = raceMap.get(raceKey)
        if (r.race_year > existing.race_year) {
          raceMap.set(raceKey, r)
        }
      }
    })
    
    // Convert to array and map to include alias
    const raceFinishers = Array.from(raceMap.values()).map(r => {
      // Use alias directly from the view
      const alias = r.alias || 'Unknown'
      return {
        name: alias,
        count: Number(r.finishers) || 0
      }
    })
    
    // Sort by count
    return raceFinishers.sort((a, b) => b.count - a.count)
  }

  // Calculate registrations trend for line chart
  const getRegistrationsTrend = () => {
    if (!analyticsData.length) return []
    
    const yearGroups = {}
    analyticsData.forEach(r => {
      const year = Math.floor(r.year)
      if (!yearGroups[year]) {
        yearGroups[year] = 0
      }
      yearGroups[year] += Number(r.registration_count) || 0
    })
    
    return Object.keys(yearGroups).sort().map(year => ({
      year: parseInt(year),
      registrations: yearGroups[year]
    }))
  }

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

  if (loading) return <div className="text-center py-12 text-[#94A3B8] animate-fade-in">Loading dashboard...</div>
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>

  return (
    <div className="animate-fade-in">
      <h1 className="text-5xl font-bold mb-4 text-white">Welcome to HTC Data Portal</h1>
      <p className="text-xl text-[#94A3B8] mb-12">Your central hub for race data, membership management, and analytics</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <Link to="/races" className="card p-6 hover:scale-105 transition-transform cursor-pointer animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <Trophy className="h-8 w-8 text-blue-400" />
            <ArrowRight className="h-5 w-5 text-[#94A3B8]" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Races</h2>
          <p className="text-[#94A3B8]">{racesData.length} races available</p>
        </Link>

        <Link to="/memberships" className="card p-6 hover:scale-105 transition-transform cursor-pointer animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <UserCheck className="h-8 w-8 text-green-400" />
            <ArrowRight className="h-5 w-5 text-[#94A3B8]" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Memberships</h2>
          <p className="text-[#94A3B8]">{getActiveMemberCount()} active members</p>
        </Link>

        <Link to="/finance" className="card p-6 hover:scale-105 transition-transform cursor-pointer animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 text-purple-400" />
            <ArrowRight className="h-5 w-5 text-[#94A3B8]" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Finance</h2>
          <p className="text-[#94A3B8]">{formatCurrency(currentBalance)} balance</p>
        </Link>

        <Link to="/analytics" className="card p-6 hover:scale-105 transition-transform cursor-pointer animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="h-8 w-8 text-orange-400" />
            <ArrowRight className="h-5 w-5 text-[#94A3B8]" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Analytics</h2>
          <p className="text-[#94A3B8]">{resultsData.length} data points</p>
        </Link>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {/* Race Finishers */}
        <div className="card p-6 animate-slide-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Race Finishers</h2>
            <Trophy className="h-6 w-6 text-orange-400" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={getRaceParticipationData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#94A3B8" fill="#94A3B8" />
              <YAxis stroke="#94A3B8" fill="#94A3B8" />
              <Tooltip 
                formatter={(value) => formatNumber(value)}
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#F8FAFC' }}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Membership Levels by Month */}
        <div className="card p-6 animate-slide-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Membership Levels</h2>
            <UserCheck className="h-6 w-6 text-green-400" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={membershipMonthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94A3B8" fill="#94A3B8" angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="#94A3B8" fill="#94A3B8" />
              <Tooltip 
                formatter={(value) => formatNumber(value)}
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#F8FAFC' }}
              />
              <Legend />
              <Line 
                dataKey="ending_total"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 6 }}
                name="Memberships"
              />
              <Line
                dataKey="new"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ r: 6 }}
                name="New"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Balance Over Time */}
        <div className="card p-6 lg:col-span-2 animate-slide-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Balance Over Time</h2>
            <DollarSign className="h-6 w-6 text-blue-400" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={balanceOverTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94A3B8" fill="#94A3B8" />
              <YAxis stroke="#94A3B8" fill="#94A3B8" tickFormatter={formatCurrency} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#F8FAFC' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend />
              <Line 
                type="monotone"
                dataKey="balance" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Balance"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6 animate-slide-in">
        <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link to="/races" className="flex items-center justify-center p-4 bg-[#1E293B] hover:bg-[#334155] rounded-lg transition-colors group">
            <Trophy className="h-6 w-6 text-blue-400 mr-3 group-hover:scale-110 transition-transform" />
            <span className="text-white font-medium">View Races</span>
          </Link>
          <Link to="/memberships" className="flex items-center justify-center p-4 bg-[#1E293B] hover:bg-[#334155] rounded-lg transition-colors group">
            <UserCheck className="h-6 w-6 text-green-400 mr-3 group-hover:scale-110 transition-transform" />
            <span className="text-white font-medium">Manage Memberships</span>
          </Link>
          <Link to="/finance" className="flex items-center justify-center p-4 bg-[#1E293B] hover:bg-[#334155] rounded-lg transition-colors group">
            <DollarSign className="h-6 w-6 text-purple-400 mr-3 group-hover:scale-110 transition-transform" />
            <span className="text-white font-medium">View Finance</span>
          </Link>
          <Link to="/analytics" className="flex items-center justify-center p-4 bg-[#1E293B] hover:bg-[#334155] rounded-lg transition-colors group">
            <BarChart3 className="h-6 w-6 text-orange-400 mr-3 group-hover:scale-110 transition-transform" />
            <span className="text-white font-medium">View Analytics</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Home
