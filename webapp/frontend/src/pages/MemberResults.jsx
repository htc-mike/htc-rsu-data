import { useState, useEffect } from 'react'
import { Search, Filter, Calendar, Trophy, Users, MapPin, Ruler, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { supabase } from '../supabaseClient.js'

function MemberResults() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [eventFilter, setEventFilter] = useState('all')
  const [raceFilter, setRaceFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [distanceFilter, setDistanceFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())
  const [expandedGroups, setExpandedGroups] = useState({})
  const [expandAll, setExpandAll] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase.from('v_member_results').select('*')
        
        if (error) throw error
        
        setResults(data || [])
        setLoading(false)
      } catch (err) {
        console.error('Failed to load member results:', err)
        setError('Failed to load member results')
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Get unique values for filters
  const uniqueEvents = [...new Set(results.map(r => r.event_name))].sort()
  const uniqueRaces = [...new Set(results.map(r => r.race))].sort()
  const uniqueLocations = [...new Set(results.map(r => r.location))].sort()
  const uniqueDistances = [...new Set(results.map(r => r.distance))].sort()
  const uniqueYears = [...new Set(results.map(r => r.event_date ? r.event_date.split('-')[0] : null))].filter(Boolean).sort().reverse()

  // Filter results
  const filteredResults = results.filter(result => {
    const matchesSearch = 
      result.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.race?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.location?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesEvent = eventFilter === 'all' || result.event_name === eventFilter
    const matchesRace = raceFilter === 'all' || result.race === raceFilter
    const matchesLocation = locationFilter === 'all' || result.location === locationFilter
    const matchesDistance = distanceFilter === 'all' || result.distance === distanceFilter
    const matchesYear = yearFilter === 'all' || (result.event_date && result.event_date.startsWith(yearFilter))
    
    return matchesSearch && matchesEvent && matchesRace && matchesLocation && matchesDistance && matchesYear
  })

  // Calculate KPIs
  const calculateKPIs = () => {
    const uniqueEvents = new Set(filteredResults.map(r => r.event_name))
    const uniqueRaces = new Set(filteredResults.map(r => r.race))
    const uniqueMembers = new Set(filteredResults.map(r => r.name))
    const uniqueDistances = new Set(filteredResults.map(r => r.distance))
    const uniqueLocations = new Set(filteredResults.map(r => r.location))
    
    return {
      events: uniqueEvents.size,
      races: uniqueRaces.size,
      members: uniqueMembers.size,
      distances: uniqueDistances.size,
      locations: uniqueLocations.size
    }
  }

  const kpis = calculateKPIs()

  // Group results by event and race
  const groupedResults = filteredResults.reduce((acc, result) => {
    const eventKey = `${result.event_date}-${result.event_name}-${result.location}`
    if (!acc[eventKey]) {
      acc[eventKey] = {
        event_date: result.event_date,
        event_name: result.event_name,
        location: result.location,
        race_url: result.race_url,
        races: {}
      }
    }
    
    const raceKey = `${result.race}-${result.distance}`
    if (!acc[eventKey].races[raceKey]) {
      acc[eventKey].races[raceKey] = {
        race: result.race,
        distance: result.distance,
        finishers: result.finishers,
        first_place_time: result.first_place_time,
        results: []
      }
    }
    
    acc[eventKey].races[raceKey].results.push(result)
    return acc
  }, {})

  const toggleGroup = (eventKey, raceKey = null) => {
    const key = raceKey ? `${eventKey}-${raceKey}` : eventKey
    setExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const toggleExpandAll = () => {
    const newExpandAll = !expandAll
    setExpandAll(newExpandAll)
    
    if (newExpandAll) {
      // Expand all events and all races
      const allKeys = {}
      Object.keys(groupedResults).forEach(eventKey => {
        allKeys[eventKey] = true
        Object.keys(groupedResults[eventKey].races).forEach(raceKey => {
          allKeys[`${eventKey}-${raceKey}`] = true
        })
      })
      setExpandedGroups(allKeys)
    } else {
      // Collapse all
      setExpandedGroups({})
    }
  }

  const handleEventClick = (eventKey) => {
    const isEventExpanded = expandedGroups[eventKey]
    setExpandedGroups(prev => ({
      ...prev,
      [eventKey]: !isEventExpanded
    }))
    
    // When expanding an event, also expand all its races
    if (!isEventExpanded) {
      const eventGroup = groupedResults[eventKey]
      if (eventGroup && eventGroup.races) {
        const newExpanded = { ...expandedGroups }
        Object.keys(eventGroup.races).forEach(raceKey => {
          newExpanded[`${eventKey}-${raceKey}`] = true
        })
        setExpandedGroups(newExpanded)
      }
    }
  }

  const formatTime = (time) => {
    if (!time) return 'N/A'
    return time
  }

  if (loading) return <div className="text-center py-12 text-[#94A3B8] animate-fade-in">Loading member results...</div>
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>

  return (
    <div className="animate-fade-in">
      <h1 className="text-5xl font-bold mb-8 text-white">Member Results</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Events</p>
              <p className="text-3xl font-bold text-white">{kpis.events}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Races</p>
              <p className="text-3xl font-bold text-white">{kpis.races}</p>
            </div>
            <Trophy className="h-8 w-8 text-purple-400" />
          </div>
        </div>
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Members</p>
              <p className="text-3xl font-bold text-white">{kpis.members}</p>
            </div>
            <Users className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Distances</p>
              <p className="text-3xl font-bold text-white">{kpis.distances}</p>
            </div>
            <Ruler className="h-8 w-8 text-orange-400" />
          </div>
        </div>
        <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#94A3B8]">Locations</p>
              <p className="text-3xl font-bold text-white">{kpis.locations}</p>
            </div>
            <MapPin className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6 mb-6 animate-slide-in">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by name, event, race, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8]" />
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Events</option>
              {uniqueEvents.map(event => (
                <option key={event} value={event}>{event}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Trophy className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8]" />
            <select
              value={raceFilter}
              onChange={(e) => setRaceFilter(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Races</option>
              {uniqueRaces.map(race => (
                <option key={race} value={race}>{race}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <MapPin className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8]" />
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Locations</option>
              {uniqueLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Ruler className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8]" />
            <select
              value={distanceFilter}
              onChange={(e) => setDistanceFilter(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Distances</option>
              {uniqueDistances.map(distance => (
                <option key={distance} value={distance}>{distance}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Calendar className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#94A3B8]" />
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Years</option>
              {uniqueYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expand All Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={toggleExpandAll}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
        >
          {expandAll ? (
            <>
              <ChevronDown className="h-4 w-4" />
              Collapse All
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4" />
              Expand All
            </>
          )}
        </button>
      </div>

      {/* Results Grid */}
      <div className="space-y-6 animate-slide-in">
        {Object.keys(groupedResults).length === 0 ? (
          <div className="card p-12 text-center text-[#94A3B8]">No results found</div>
        ) : (
          Object.entries(groupedResults).map(([eventKey, eventGroup]) => {
            const isEventExpanded = expandedGroups[eventKey]
            
            return (
              <div key={eventKey} className="card overflow-hidden">
                {/* Event Group Header */}
                <div
                  className="bg-[#0F172A] p-4 cursor-pointer hover:bg-[#1E293B] transition-colors"
                  onClick={() => handleEventClick(eventKey)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-400" />
                        <span className="text-white font-medium">{eventGroup.event_date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-purple-400" />
                        {eventGroup.race_url ? (
                          <a
                            href={eventGroup.race_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              handleEventClick(eventKey)
                            }}
                            className="text-white font-bold hover:text-blue-400 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            {eventGroup.event_name}
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-white font-bold">{eventGroup.event_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-red-400" />
                        <span className="text-[#94A3B8]">{eventGroup.location}</span>
                      </div>
                    </div>
                    <span className="text-[#94A3B8]">{isEventExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</span>
                  </div>
                </div>

                {/* Race Groups */}
                {isEventExpanded && (
                  <div className="divide-y divide-[#334155]">
                    {Object.entries(eventGroup.races).map(([raceKey, raceGroup]) => {
                      const fullRaceKey = `${eventKey}-${raceKey}`
                      const isRaceExpanded = expandedGroups[fullRaceKey]
                      
                      return (
                        <div key={raceKey}>
                          {/* Race Group Header */}
                          <div
                            className="p-4 cursor-pointer hover:bg-[#1E293B] transition-colors ml-4"
                            onClick={() => toggleGroup(eventKey, raceKey)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                  <Trophy className="h-5 w-5 text-yellow-400" />
                                  <span className="text-white font-bold">{raceGroup.race}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Ruler className="h-5 w-5 text-orange-400" />
                                  <span className="text-[#94A3B8]">{raceGroup.distance}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="h-5 w-5 text-green-400" />
                                  <span className="text-[#94A3B8]">{raceGroup.finishers} finishers</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Trophy className="h-5 w-5 text-yellow-400" />
                                  <span className="text-[#94A3B8]">First: {formatTime(raceGroup.first_place_time)}</span>
                                </div>
                              </div>
                              <span className="text-[#94A3B8]">{isRaceExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</span>
                            </div>
                          </div>

                          {/* Individual Results */}
                          {isRaceExpanded && (
                            <div className="ml-8 overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-[#0F172A]">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Place</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Division</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Div Place</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Time</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Pace</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Age Grade</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#334155]">
                                  {raceGroup.results.map((result, index) => (
                                    <tr key={index} className="hover:bg-[#334155] transition-colors">
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-white font-bold">
                                        {result.race_place || 'N/A'}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-white font-medium">
                                        {result.name || 'N/A'}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-[#94A3B8]">
                                        {result.division || 'N/A'}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-white">
                                        {result.division_place || 'N/A'}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-white font-medium">
                                        {formatTime(result.time)}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-[#94A3B8]">
                                        {result.pace || 'N/A'}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-white">
                                        {result.age_grade ? `${result.age_grade}%` : 'N/A'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default MemberResults
