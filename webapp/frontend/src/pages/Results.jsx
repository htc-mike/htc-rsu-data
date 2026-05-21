import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Calendar, Clock, ArrowLeft } from 'lucide-react'
import { supabase } from '../supabaseClient.js'

function Results() {
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('event_id')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        let query = supabase
          .from('results')
          .select(`
            *,
            events!inner (name, start_time, race_id, races!inner (name, race_id))
          `)
        
        if (eventId) {
          query = query.eq('event_id', eventId)
        }
        
        const { data, error } = await query.order('place', { ascending: true })
        
        if (error) {
          console.error('Supabase error:', error)
          throw error
        }
        
        // Flatten the data structure
        const flattenedData = data.map(item => ({
          place: item.place,
          bib: item.bib,
          first_name: item.first_name,
          last_name: item.last_name,
          gender: item.gender,
          age: item.age,
          city: item.city,
          state: item.state,
          clock_time: item.clock_time,
          chip_time: item.chip_time,
          pace: item.pace,
          age_percentage: item.age_percentage,
          event_name: item.events?.name,
          event_start_time: item.events?.start_time,
          race_id: item.events?.race_id,
          race_name: item.events?.races?.name
        }))
        
        setResults(flattenedData)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load results:', err)
        setError('Failed to load results')
        setLoading(false)
      }
    }
    fetchData()
  }, [eventId])

  const filteredResults = results.filter(result => 
    result.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.race_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.event_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return dateStr.split('T')[0]
  }

  if (loading) return <div className="text-center py-12 text-[#94A3B8] animate-fade-in">Loading results...</div>
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>

  const eventName = results.length > 0 ? results[0].event_name : null
  const eventYear = results.length > 0 && results[0].event_start_time 
    ? results[0].event_start_time.split('T')[0].split('-')[0]
    : null

  return (
    <div className="animate-fade-in">
      {eventId && (
        <Link
          to={`/races/${results[0]?.race_id || ''}`}
          className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6 group transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Events
        </Link>
      )}

      <h1 className="text-5xl font-bold mb-8 text-white break-words">
        {eventId && eventName && eventYear 
          ? `Results - ${eventName} ${eventYear}` 
          : eventId && eventName 
          ? `Results - ${eventName}`
          : 'Results'}
      </h1>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by name, city, state, race, or event..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="card overflow-hidden animate-slide-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0F172A]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Place</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Bib #</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Age</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">City</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">State</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Clock Time</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Chip Time</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Pace</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Age %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-6 py-12 text-center text-[#94A3B8]">
                    No results found
                  </td>
                </tr>
              ) : (
                filteredResults.map((result) => (
                  <tr key={`${result.place}-${result.bib}`} className="hover:bg-[#334155] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-bold">
                      {result.place || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {result.bib || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {result.first_name} {result.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {result.gender || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {result.age || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {result.city || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {result.state || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-blue-400" />
                        {result.clock_time || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-green-400" />
                        {result.chip_time || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {result.pace || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {result.age_percentage || 'N/A'}
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

export default Results
