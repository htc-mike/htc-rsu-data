import { useState, useEffect } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Users, DollarSign, Calendar, Search, Filter, Download, List } from 'lucide-react'
import { supabase } from '../supabaseClient.js'

function Memberships() {
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [subStatusFilter, setSubStatusFilter] = useState('Active')
  const [membershipSubStatuses, setMembershipSubStatuses] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase.from('v_memberships').select('*')
        
        if (error) throw error
        
        setMemberships(data || [])
        
        // Extract unique membership sub-statuses
        const subStatuses = [...new Set((data || []).map(m => getSubStatus(m)))].sort()
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

  const filteredMemberships = (() => {
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
      filtered = filtered.filter(m => getSubStatus(m) === subStatusFilter)
    }
    
    return [...filtered].sort((a, b) => {
      let aValue = sortConfig.key === 'membership_sub_status' ? getSubStatus(a) : a[sortConfig.key]
      let bValue = sortConfig.key === 'membership_sub_status' ? getSubStatus(b) : b[sortConfig.key]

      if (sortConfig.key === 'membership_end') {
        aValue = aValue ? new Date(aValue).getTime() : 0
        bValue = bValue ? new Date(bValue).getTime() : 0
      } else if (sortConfig.key === 'age' || sortConfig.key === 'membership_id') {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
      } else {
        aValue = aValue?.toString().toLowerCase() || ''
        bValue = bValue?.toString().toLowerCase() || ''
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  })()

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return ''
    return sortConfig.direction === 'asc' ? ' â†‘' : ' â†“'
  }

  const renderSortableHeader = (key, label) => (
    <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
      <button
        type="button"
        onClick={() => handleSort(key)}
        className="uppercase tracking-wider hover:text-white transition-colors"
      >
        {label}{getSortIndicator(key)}
      </button>
    </th>
  )

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return dateStr.split('T')[0]
  }

  const exportToCsv = () => {
    const columns = [
      ['Membership ID', 'membership_id'],
      ['Full Name', 'full_name'],
      ['Email', 'email'],
      ['Age', 'age'],
      ['Gender', 'gender'],
      ['City/State', 'city_state'],
      ['Membership End', 'membership_end'],
      ['Sub-Status', 'membership_sub_status']
    ]
    const escapeCsvValue = (value) => {
      const stringValue = value === null || value === undefined || value === '' ? 'N/A' : value.toString()
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    const rows = filteredMemberships.map(member => columns.map(([label, key]) => {
      if (key === 'membership_end') return escapeCsvValue(formatDate(member.membership_end))
      if (key === 'membership_sub_status') return escapeCsvValue(getSubStatus(member))
      return escapeCsvValue(member[key])
    }).join(','))
    const csv = [columns.map(([label]) => escapeCsvValue(label)).join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const statusSlug = subStatusFilter === 'all' ? 'all' : subStatusFilter.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    link.href = url
    link.download = `memberships-${statusSlug}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Calculate stats for graphs
  const calculateStats = () => {
    const currentYear = new Date().getFullYear()
    
    // Active Members: count where membership_status = 'Active'
    const activeMembers = memberships.filter(m => m.membership_status === 'Active').length
    
    // Total Revenue: aggregate amount_paid of primary_member where membership_start is in current year
    const totalRevenue = memberships
      .filter(m => m.primary_member && m.membership_start)
      .filter(m => {
        const startYear = Number(m.membership_start.split('T')[0].split('-')[0])
        return startYear === currentYear
      })
      .reduce((sum, m) => sum + (m.amount_paid || 0), 0)
    
    // Total Memberships: distinct count of membership_id for active members
    const totalMemberships = new Set(
      memberships
        .filter(m => m.membership_status === 'Active')
        .map(m => m.membership_id)
    ).size
    
    // Members by division
    const divisionCounts = {}
    memberships.forEach(m => {
      if (getSubStatus(m) === 'Active') {
        const division = m.division?.toString().trim() || 'Unknown'
        divisionCounts[division] = (divisionCounts[division] || 0) + 1
      }
    })
    
    const divisionData = Object.keys(divisionCounts).map(division => ({
      name: division,
      value: divisionCounts[division]
    }))
    
    // Members by year (based on membership_start)
    const yearCounts = {}
    memberships.forEach(m => {
      if (m.membership_start) {
        const year = Number(m.membership_start.split('T')[0].split('-')[0])
        yearCounts[year] = (yearCounts[year] || 0) + 1
      }
    })
    
    const yearData = Object.keys(yearCounts).sort().map(year => ({
      year: parseInt(year),
      members: yearCounts[year]
    }))
    
    return {
      activeMembers,
      totalRevenue,
      totalMemberships,
      divisionData,
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
              <p className="text-sm text-[#94A3B8]">Active Members</p>
              <p className="text-3xl font-bold text-white">{stats.activeMembers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Total Revenue ({new Date().getFullYear()})</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Total Memberships</p>
              <p className="text-3xl font-bold text-white">{stats.totalMemberships}</p>
            </div>
            <List className="h-8 w-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="flex gap-6 mb-8 animate-slide-in">
        <div className="card p-6 flex-1">
          <h2 className="text-2xl font-bold text-white mb-4">Members by Division</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.divisionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.divisionData.map((entry, index) => (
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
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={exportToCsv}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
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
                <option key={subStatus} value={subStatus}>{subStatus}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-[#94A3B8] whitespace-nowrap">
            Showing {filteredMemberships.length} of {memberships.length}
          </div>
        </div>
      </div>

      {/* Members Grid */}
      <div className="card overflow-hidden animate-slide-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0F172A]">
              <tr>
                {renderSortableHeader('membership_id', 'Membership ID')}
                {renderSortableHeader('full_name', 'Full Name')}
                {renderSortableHeader('email', 'Email')}
                {renderSortableHeader('age', 'Age')}
                {renderSortableHeader('gender', 'Gender')}
                {renderSortableHeader('city_state', 'City/State')}
                {renderSortableHeader('membership_end', 'Membership End')}
                {renderSortableHeader('membership_sub_status', 'Sub-Status')}
              </tr>
            </thead>
            <tbody key={`${subStatusFilter}-${searchTerm}-${sortConfig.key}-${sortConfig.direction}`} className="divide-y divide-[#334155]">
              {filteredMemberships.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-[#94A3B8]">No memberships found</td>
                </tr>
              ) : (
                filteredMemberships.map((member, index) => (
                  <tr key={`${subStatusFilter}-${sortConfig.key}-${sortConfig.direction}-${member.membership_id || index}`} className="hover:bg-[#334155] transition-colors">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#94A3B8]">
                      {formatDate(member.membership_end)}
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
