import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DollarSign, TrendingDown, TrendingUp, Activity, Filter } from 'lucide-react'
import { supabase } from '../supabaseClient.js'

function Finance() {
  const [kpiData, setKpiData] = useState(null)
  const [summaryData, setSummaryData] = useState([])
  const [filteredSummaryData, setFilteredSummaryData] = useState([])
  const [detailData, setDetailData] = useState([])
  const [filteredDetailData, setFilteredDetailData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [yearFilter, setYearFilter] = useState('all')
  const [summaryYearFilter, setSummaryYearFilter] = useState(new Date().getFullYear().toString())
  const [availableYears, setAvailableYears] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch KPI data from v_check_register_detail
        const { data: detailData, error: detailError } = await supabase
          .from('v_check_register_detail')
          .select('*')
        
        if (detailError) throw detailError
        
        // Fetch summary data from v_check_register_summary
        const { data: summaryData, error: summaryError } = await supabase
          .from('v_check_register_summary')
          .select('*')
          .order('trans_date', { ascending: true })
        
        if (summaryError) throw summaryError
        
        setDetailData(detailData || [])
        setFilteredDetailData(detailData || [])
        setSummaryData(summaryData || [])
        
        // Calculate KPIs for current year only
        const currentYear = new Date().getFullYear()
        const currentYearData = detailData ? detailData.filter(d => d.trans_year === currentYear) : []
        
        // Sort by trans_date DESC to get most recent first
        currentYearData.sort((a, b) => b.trans_date.localeCompare(a.trans_date))
        
        const currentBalance = currentYearData && currentYearData.length > 0
          ? currentYearData[0].balance || 0  // First record is most recent
          : 0
        const withdrawalsToDate = currentYearData ? currentYearData.reduce((sum, d) => sum + (d.withdrawal || 0), 0) : 0
        const depositsToDate = currentYearData ? currentYearData.reduce((sum, d) => sum + (d.deposit || 0), 0) : 0
        const transactionsToDate = currentYearData ? currentYearData.length : 0
        
        setKpiData({
          currentBalance,
          withdrawalsToDate,
          depositsToDate,
          transactionsToDate
        })
        
        // Extract unique years for filter
        const years = [...new Set(detailData?.map(d => d.trans_year).filter(Boolean))]
        setAvailableYears(years.sort())
        
        setLoading(false)
      } catch (err) {
        console.error('Failed to load finance data:', err)
        setError('Failed to load finance data')
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    let filtered = detailData
    
    // Apply year filter
    if (yearFilter !== 'all') {
      filtered = filtered.filter(d => d.trans_year === parseInt(yearFilter))
    }
    
    setFilteredDetailData(filtered)
  }, [yearFilter, detailData])

  useEffect(() => {
    let filtered = summaryData
    
    // Apply summary year filter
    if (summaryYearFilter !== 'all') {
      filtered = filtered.filter(d => d.trans_year === parseInt(summaryYearFilter))
    }
    
    setFilteredSummaryData(filtered)
  }, [summaryYearFilter, summaryData])

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatCompactCurrency = (amount) => {
    if (amount === null || amount === undefined) return '$0'
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
    return `$${amount.toFixed(0)}`
  }

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0'
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return dateStr.split('T')[0]
  }

  const formatMonthYear = (dateStr) => {
    if (!dateStr) return ''
    return dateStr.split('T')[0]
  }

  const getMonthTransactions = (monthData) => {
    if (!monthData) return []
    const year = monthData.trans_year
    const monthName = monthData.trans_month
    
    // Map month names to month indices
    const monthMap = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3,
      'May': 4, 'June': 5, 'July': 6, 'August': 7,
      'September': 8, 'October': 9, 'November': 10, 'December': 11
    }
    
    const targetMonth = monthMap[monthName]
    
    return detailData.filter(d => {
      const dMonth = Number(d.trans_date.split('T')[0].split('-')[1]) - 1
      return dMonth === targetMonth && d.trans_year === year
    })
  }

  // Prepare time series data
  const timeSeriesData = summaryData.map(item => ({
    date: item.trans_month || formatMonthYear(item.trans_date),
    balance: item.balance || 0
  }))

  if (loading) return <div className="text-center py-12 text-[#94A3B8] animate-fade-in">Loading finance data...</div>
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>

  return (
    <div className="animate-fade-in">
      <h1 className="text-5xl font-bold mb-8 text-white">Finance</h1>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Current Balance</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(kpiData?.currentBalance)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Withdrawals to Date</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(kpiData?.withdrawalsToDate)}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-400" />
          </div>
        </div>
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Deposits to Date</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(kpiData?.depositsToDate)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Transactions to Date</p>
              <p className="text-3xl font-bold text-white">{formatNumber(kpiData?.transactionsToDate)}</p>
            </div>
            <Activity className="h-8 w-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Time Series Chart */}
      <div className="card p-6 mb-8 animate-slide-in">
        <h2 className="text-2xl font-bold text-white mb-4">Balance Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94A3B8" fill="#94A3B8" />
            <YAxis stroke="#94A3B8" fill="#94A3B8" tickFormatter={formatCompactCurrency} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
              itemStyle={{ color: '#F8FAFC' }}
              formatter={(value) => formatCurrency(value)}
            />
            <Legend />
            <Line type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Grid */}
      <div className="card p-6 mb-8 animate-slide-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Monthly Summary</h2>
          <div className="relative">
            <Filter className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8]" />
            <select
              value={summaryYearFilter}
              onChange={(e) => setSummaryYearFilter(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0F172A]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Year</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Bank Balance</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Statement Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {filteredSummaryData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[#94A3B8]">No summary data found</td>
                </tr>
              ) : (
                filteredSummaryData.map((row, index) => (
                  <tr 
                    key={index} 
                    className="hover:bg-[#334155] transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedMonth(row)
                      setShowModal(true)
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400 hover:text-blue-300">{row.trans_month || formatDate(row.trans_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{row.trans_year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{formatCurrency(row.balance)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{formatCurrency(row.bank_balance)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{formatCurrency(row.statement_balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Transaction Details */}
      {showModal && selectedMonth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#1E293B] rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-[#334155]">
              <h2 className="text-2xl font-bold text-white">
                Transaction Details - {selectedMonth.trans_month} {selectedMonth.trans_year}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="overflow-x-auto p-6">
              <table className="w-full">
                <thead className="bg-[#0F172A]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Number</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">To/From</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Deposit</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Withdrawal</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Note</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]">
                  {getMonthTransactions(selectedMonth).length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-[#94A3B8]">No transactions found for this month</td>
                    </tr>
                  ) : (
                    getMonthTransactions(selectedMonth).map((row, index) => (
                      <tr key={index} className="hover:bg-[#334155] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{row.number || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{formatDate(row.trans_date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{row.to_from || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{row.description || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{formatCurrency(row.deposit)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{formatCurrency(row.withdrawal)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{row.note || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{formatCurrency(row.balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Finance
