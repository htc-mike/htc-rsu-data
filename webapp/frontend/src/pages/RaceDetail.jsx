import { useState, useEffect } from 'react'
import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Users, Clock, DollarSign, ExternalLink, Trophy } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import trophyImage from '../../htc.logo.new.blue.png'
import { supabase } from '../supabaseClient.js'

const stripHtml = (html) => {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

function RaceDetail() {
  const { raceId } = useParams()
  const [race, setRace] = useState(null)
  const [events, setEvents] = useState([])
  const [registrationsOverTime, setRegistrationsOverTime] = useState([])
  const [finishersOverTime, setFinishersOverTime] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [raceResponse, eventsResponse] = await Promise.all([
          supabase.from('races').select('*').eq('race_id', raceId).single(),
          supabase.from('events').select('*').eq('race_id', raceId)
        ])
        
        if (raceResponse.error) throw raceResponse.error
        if (eventsResponse.error) throw eventsResponse.error
        
        setRace(raceResponse.data)
        
        // Get results count for each event
        const eventIds = eventsResponse.data.map(e => e.event_id)
        const { data: results } = await supabase.from('results').select('event_id').in('event_id', eventIds)
        
        const resultsCountMap = new Map()
        results?.forEach(r => {
          resultsCountMap.set(r.event_id, (resultsCountMap.get(r.event_id) || 0) + 1)
        })
        
        // Get registration count for each event
        const { data: registrations } = await supabase.from('registrations').select('event_id').in('event_id', eventIds)
        
        const registrationCountMap = new Map()
        registrations?.forEach(r => {
          registrationCountMap.set(r.event_id, (registrationCountMap.get(r.event_id) || 0) + 1)
        })
        
        // Add results_count and registration_count to each event
        const eventsWithCounts = eventsResponse.data.map(event => ({
          ...event,
          results_count: resultsCountMap.get(event.event_id) || 0,
          registration_count: registrationCountMap.get(event.event_id) || 0
        }))
        
        setEvents(eventsWithCounts)
        
        // Get registrations over time data
        const { data: regData, error: regError } = await supabase.rpc('get_race_registrations_over_time', { race_id_param: raceId })
        if (regError) {
          console.error('RPC error for registrations over time:', regError)
          setRegistrationsOverTime([])
        } else {
          setRegistrationsOverTime(regData || [])
        }
        
        // Get finishers over time data
        const { data: finishersData, error: finishersError } = await supabase.rpc('get_race_finishers_over_time', { race_id_param: raceId })
        if (finishersError) {
          console.error('RPC error for finishers over time:', finishersError)
          setFinishersOverTime([])
        } else {
          setFinishersOverTime(finishersData || [])
        }
        
        setLoading(false)
      } catch (err) {
        console.error('Failed to load race details:', err)
        setError('Failed to load race details')
        setLoading(false)
      }
    }
    fetchData()
  }, [raceId])

  if (loading) return <div className="text-center py-12 text-[#94A3B8] animate-fade-in">Loading race details...</div>
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>
  if (!race) return <div className="text-center py-12 text-[#94A3B8]">Race not found</div>

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD'
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const truncateText = (text, maxLength) => {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const processChartData = (data) => {
    const allYears = [...new Set(data.map(d => d.year))].sort()
    // Only include last 4 years
    const years = allYears.slice(-4)
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
    
    // Filter data to only include the last 4 years
    const filteredData = data.filter(d => years.includes(d.year))
    
    // Create a map of unique week combinations
    const weekMap = new Map()
    
    filteredData.forEach(d => {
      const weekNumber = getWeekNumber(Math.floor(d.year), Math.floor(d.month), Math.floor(d.day))
      const weekKey = `Week ${weekNumber}`
      if (!weekMap.has(weekKey)) {
        // Use a leap year (2024) for consistent date sorting across years
        const sortDate = new Date(2024, Math.floor(d.month) - 1, Math.floor(d.day))
        weekMap.set(weekKey, { weekKey, weekNumber, sortDate })
      }
    })
    
    // Sort weeks chronologically
    const sortedWeeks = Array.from(weekMap.values()).sort((a, b) => a.weekNumber - b.weekNumber)
    
    // Renumber weeks counting down from total (reverse numbering)
    const renumberedWeeks = sortedWeeks.map((weekObj, index) => ({
      ...weekObj,
      displayWeek: `Week ${sortedWeeks.length - index}`,
      actualWeekNumber: weekObj.weekNumber
    }))
    
    // Build chart data with each year as a separate key
    const chartData = renumberedWeeks.map(weekObj => {
      const row = { week: weekObj.displayWeek }
      const values = []
      years.forEach(year => {
        const matches = filteredData.filter(d => d.year === year && 
          getWeekNumber(Math.floor(d.year), Math.floor(d.month), Math.floor(d.day)) === weekObj.actualWeekNumber)
        const count = matches.reduce((sum, m) => sum + (m.count || 0), 0)
        row[`year_${year}`] = count
        values.push(count)
      })
      // Calculate median
      values.sort((a, b) => a - b)
      const mid = Math.floor(values.length / 2)
      row.median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2
      return row
    })
    
    return { chartData, years, colors }
  }

  // Helper function to get week number (1-52)
  const getWeekNumber = (year, month, day) => {
    const date = new Date(year, month - 1, day)
    const firstDayOfYear = new Date(year, 0, 1)
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  const { chartData, years, colors } = processChartData(registrationsOverTime)
  
  // Process finishers data by year only (not weekly)
  const processFinishersByYear = (data) => {
    const yearCounts = {}
    data.forEach(d => {
      const year = Math.floor(d.year)
      if (!yearCounts[year]) {
        yearCounts[year] = 0
      }
      yearCounts[year] += d.count || 0
    })
    
    const sortedYears = Object.keys(yearCounts).sort()
    const chartData = sortedYears.map(year => ({
      year: parseInt(year),
      count: yearCounts[year]
    }))
    
    return { chartData, years: sortedYears.map(y => parseInt(y)) }
  }
  
  let finishersChartData = []
  let finishersYears = []
  let finishersColors = []
  
  try {
    const processed = processFinishersByYear(finishersOverTime)
    finishersChartData = processed.chartData
    finishersYears = processed.years
    finishersColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
  } catch (error) {
    console.error('Error processing finishers data:', error)
  }

  // Sort events by start_time first (descending)
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.start_time) return 1
    if (!b.start_time) return -1
    return new Date(b.start_time) - new Date(a.start_time)
  })

  // Group events by date
  const groupedEvents = {}
  sortedEvents.forEach(event => {
    const date = formatDate(event.start_time)
    if (!groupedEvents[date]) {
      groupedEvents[date] = []
    }
    groupedEvents[date].push(event)
  })

  const sortedDates = Object.keys(groupedEvents)

  return (
    <div className="animate-fade-in">
      <Link
        to="/"
        className="inline-flex items-center mb-6 group transition-colors"
        style={{ color: 'var(--color-primary)' }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary-light)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
      >
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Races
      </Link>

      <div className="card p-6 mb-8">
        <div className="flex items-start space-x-6">
          <div className="relative">
            <img 
              src={race.logo_url || trophyImage} 
              alt="Race Logo" 
              className="h-24 w-24 rounded-lg"
              onError={(e) => e.target.src = trophyImage}
            />
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-white mb-4">{race.name}</h1>
            {race.description && (
              <p className="text-[#94A3B8] mb-4">{stripHtml(race.description)}</p>
            )}
            <div className="flex items-center space-x-4">
              {race.url && (
                <a
                  href={race.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center transition-colors"
                  style={{ color: 'var(--color-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary-light)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Visit Website
                </a>
              )}
              <a
                href={`https://runsignup.com/Race/Dashboard/Overview/${raceId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center transition-colors"
                style={{ color: 'var(--color-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary-light)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>

      {(finishersOverTime.length > 0 || registrationsOverTime.length > 0) && (
        <div className="flex gap-6 mb-8 animate-slide-in">
          {finishersOverTime.length > 0 && (
            <div className="card p-6 flex-1">
              <h2 className="text-2xl font-bold text-white mb-4">Finishers Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={finishersChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="year"
                    label={{ value: 'Year', position: 'insideBottom', offset: -5, fill: '#94A3B8', style: { fill: '#94A3B8' } }}
                    stroke="#94A3B8"
                    fill="#94A3B8"
                  />
                  <YAxis 
                    label={{ value: 'Finishers', angle: -90, position: 'insideLeft', fill: '#94A3B8', style: { fill: '#94A3B8' } }}
                    stroke="#94A3B8"
                    fill="#94A3B8"
                  />
                  <Tooltip 
                    labelFormatter={(label) => `Year ${label}`}
                    contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#F8FAFC' }}
                  />
                  <Legend />
                  <Line 
                    dataKey="count"
                    name="Finishers"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {registrationsOverTime.length > 0 && (
            <div className="card p-6 flex-1">
              <h2 className="text-2xl font-bold text-white mb-4">Registrations Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="week"
                    label={{ value: 'Week', position: 'insideBottom', offset: -5, fill: '#94A3B8', style: { fill: '#94A3B8' } }}
                    stroke="#94A3B8"
                    fill="#94A3B8"
                  />
                  <YAxis 
                    label={{ value: 'Registrations', angle: -90, position: 'insideLeft', fill: '#94A3B8', style: { fill: '#94A3B8' } }}
                    stroke="#94A3B8"
                    fill="#94A3B8"
                  />
                  <Tooltip 
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#F8FAFC' }}
                  />
                  <Legend />
                  {years.map((year, index) => (
                    <Line 
                      key={year}
                      dataKey={`year_${year}`}
                      name={`Year ${year}`}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  ))}
                  <Line 
                    dataKey="median"
                    name="Median"
                    stroke="#F97316"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <h2 className="text-3xl font-bold text-white mb-4">Events</h2>
      {events.length === 0 ? (
        <div className="text-center py-12 text-[#94A3B8]">No events found for this race</div>
      ) : (
        <div className="card overflow-hidden animate-slide-in">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0F172A]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Race Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Participant Cap</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Registrations</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Finishers</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Results</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {sortedDates.map((date) => (
                  <React.Fragment key={date}>
                    {groupedEvents[date].map((event, index) => (
                      <tr key={event.event_id} className="hover:bg-[#334155] transition-colors">
                        {index === 0 && (
                          <td
                            rowSpan={groupedEvents[date].length}
                            className="px-6 py-4 whitespace-nowrap text-sm text-[#94A3B8] bg-[#0F172A] font-medium"
                          >
                            {date}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            to={`/registrations?event_id=${event.event_id}`}
                            className="font-medium transition-colors"
                            style={{ color: 'var(--color-primary)' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary-light)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                            title={event.name}
                          >
                            {truncateText(event.name, 50)}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1 text-orange-400" />
                            {formatCurrency(event.race_fee)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1 text-green-400" />
                            {event.participant_cap || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                          {event.registration_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                          {event.results_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {event.results_count > 0 ? (
                            <Link
                              to={`/results?event_id=${event.event_id}`}
                              className="inline-flex items-center font-medium transition-colors"
                              style={{ color: 'var(--color-primary)' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary-light)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                            >
                              <Trophy className="h-4 w-4 mr-1" />
                              View Results
                            </Link>
                          ) : (
                            <span className="inline-flex items-center text-[#94A3B8] font-medium cursor-not-allowed">
                              <Trophy className="h-4 w-4 mr-1" />
                              No Results
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default RaceDetail
