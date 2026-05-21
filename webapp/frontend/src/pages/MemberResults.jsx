import { useState, useEffect } from 'react'
import { Search, Users } from 'lucide-react'
import { supabase } from '../supabaseClient.js'

function MemberResults() {
  const [results, setResults] = useState([])
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase.from('v_member_results').select('*').limit(1)
        
        if (error) throw error
        
        if (data && data.length > 0) {
          // Get column names from the first result
          const columnNames = Object.keys(data[0])
          setColumns(columnNames)
        }
        
        // Fetch all results
        const { data: allData, error: allError } = await supabase.from('v_member_results').select('*')
        if (allError) throw allError
        
        setResults(allData || [])
        setLoading(false)
      } catch (err) {
        console.error('Failed to load member results:', err)
        setError('Failed to load member results')
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Filter results - search across all fields
  const filteredResults = results.filter(result => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return Object.values(result).some(value => 
      String(value).toLowerCase().includes(searchLower)
    )
  })

  if (loading) return <div className="text-center py-12 text-[#94A3B8] animate-fade-in">Loading member results...</div>
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>

  return (
    <div className="animate-fade-in">
      <h1 className="text-5xl font-bold mb-8 text-white">Member Results</h1>

      {/* KPI Card */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
        <div className="card p-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Total Results</p>
              <p className="text-3xl font-bold text-white">{filteredResults.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-6 mb-6 animate-slide-in">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search all fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="card overflow-hidden animate-slide-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0F172A]">
              <tr>
                {columns.map(column => (
                  <th key={column} className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                    {column.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-[#94A3B8]">No results found</td>
                </tr>
              ) : (
                filteredResults.map((result, index) => (
                  <tr key={index} className="hover:bg-[#334155] transition-colors">
                    {columns.map(column => (
                      <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {result[column] !== null && result[column] !== undefined ? String(result[column]) : 'N/A'}
                      </td>
                    ))}
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

export default MemberResults
