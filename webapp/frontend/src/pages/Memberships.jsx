import { useState, useEffect } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Users, DollarSign, Calendar, Search, Filter } from 'lucide-react'
import { supabase } from '../supabaseClient.js'

function Memberships() {
  const [memberships, setMemberships] = useState([])
  const [filteredMemberships, setFilteredMemberships] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [subStatusFilter, setSubStatusFilter] = useState('all')
  const [membershipSubStatuses, setMembershipSubStatuses] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase.from('v_memberships').select('*')
        
        if (error) throw error
        
        setMemberships(data || [])
        setFilteredMemberships(data || [])
        
        // Extract unique membership sub-statuses
        const subStatuses = Object.values((data || []).reduce((statuses, membership) => {
          const label = getSubStatus(membership)
          const value = getSubStatusKey(membership)
          statuses[value] = statuses[value] || { value, label }
          return statuses
        }, {})).sort((a, b) => a.label.localeCompare(b.label))
        setMembershipSubStatuses(subStatuses)
        
        setLoading(false)
      } catch (err) {
        console.error('Failed to load memberships:', err)
        setError('Failed to load memberships')
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const getSubStatus = (membership) => {
    const subStatus = membership.membership_sub_status?.toString().trim()
    return subStatus || 'Unknown'
  }

  const getSubStatusKey = (membership) => {
    return getSubStatus(membership).toLowerCase()
  }

  useEffect(() => {
    let filtered = memberships
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(m => 
        m.full_name?.toLowerCase().includes(term) ||
        m.email?.toLowerCase().includes(term) ||
        m.membership_id?.toString().includes(term)
      )
    }
    
    // Apply sub-status filter
    if (subStatusFilter !== 'all') {
      filtered = filtered.filter(m => getSubStatusKey(m) === subStatusFilter)
    }
    
    setFilteredMemberships(filtered)
  }, [searchTerm, subStatusFilter, memberships])

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Calculate stats for graphs
  const calculateStats = () => {
    const totalMembers = memberships.length
    const totalRevenue = memberships.reduce((sum, m) => sum + (m.amount_paid || 0), 0)
    const avgCost = totalMembers > 0 ? totalRevenue / totalMembers : 0
    
    // Members by sub-status
    const subStatusCounts = {}
    memberships.forEach(m => {
      const subStatus = getSubStatus(m)
      subStatusCounts[subStatus] = (subStatusCounts[subStatus] || 0) + 1
    })
    
    const subStatusData = Object.keys(subStatusCounts).map(subStatus => ({
      name: subStatus,
      value: subStatusCounts[subStatus]
    }))
    
    // Members by year (based on membership_start)
    const yearCounts = {}
    memberships.forEach(m => {
      if (m.membership_start) {
        const year = new Date(m.membership_start).getFullYear()
        yearCounts[year] = (yearCounts[year] || 0) + 1
      }
    })
    
    const yearData = Object.keys(yearCounts).sort().map(year => ({
      year: parseInt(year),
      members: yearCounts[year]
    }))
    
    return {
      totalMembers,
      totalRevenue,
      avgCost,
      subStatusData,
      yearData
    }
  }

  const stats = calculateStats()

  // Colors for pie chart
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

  if (loading) return <div className="text-center py-12 text-[#94A3B8] animate-fade-in">Loading memberships...</div>
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>

  return (
    <div className="animate-fade-in">
      <h1 className="text-5xl font-bold mb-8 text-white">Memberships</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Total Members</p>
              <p className="text-3xl font-bold text-white">{stats.totalMembers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Total Revenue</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Avg Cost/Member</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(stats.avgCost)}</p>
            </div>
            <Calendar className="h-8 w-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="flex gap-6 mb-8 animate-slide-in">
        <div className="card p-6 flex-1">
          <h2 className="text-2xl font-bold text-white mb-4">Members by Sub-Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.subStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.subStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#F8FAFC' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6 flex-1">
          <h2 className="text-2xl font-bold text-white mb-4">New Members by Year</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.yearData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" stroke="#94A3B8" fill="#94A3B8" />
              <YAxis stroke="#94A3B8" fill="#94A3B8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#F8FAFC' }}
              />
              <Legend />
              <Bar dataKey="members" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card p-6 mb-6 animate-slide-in">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by name, email, or membership ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8]" />
            <select
              value={subStatusFilter}
              onChange={(e) => setSubStatusFilter(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Sub-Statuses</option>
              {membershipSubStatuses.map(subStatus => (
                <option key={subStatus.value} value={subStatus.value}>{subStatus.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Members Grid */}
      <div className="card overflow-hidden animate-slide-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0F172A]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Membership ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Full Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Age</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">City/State</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Sub-Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {filteredMemberships.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-[#94A3B8]">No memberships found</td>
                </tr>
              ) : (
                filteredMemberships.map((member, index) => (
                  <tr key={member.membership_id || index} className="hover:bg-[#334155] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {member.membership_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {member.full_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#94A3B8]">
                      {member.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {member.age || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#94A3B8]">
                      {member.gender || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#94A3B8]">
                      {member.city_state || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {getSubStatus(member)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Memberships
