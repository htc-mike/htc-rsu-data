import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { User, Search, Calendar, DollarSign, X, ArrowLeft } from 'lucide-react'
import { supabase } from '../supabaseClient.js'

function Registrations() {
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('event_id')
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        let query = supabase
          .from('registrations')
          .select(`
            *,
            users!inner (first_name, middle_name, last_name, email, street,
                   city, state, zip_code, country_code, dob, gender, phone),
            events!inner (name, start_time, race_id, races!inner (name, race_id))
          `)
        
        if (eventId) {
          query = query.eq('event_id', eventId)
        }
        
        const { data, error } = await query.order('registration_date', { ascending: false })
        
        if (error) {
          console.error('Supabase error:', error)
          throw error
        }
        
        // Flatten the data structure and calculate age
        const flattenedData = data.map(item => {
          const age = item.users?.dob ? new Date().getFullYear() - Number(item.users.dob.split('T')[0].split('-')[0]) : null
          return {
            registration_id: item.registration_id,
            user_id: item.user_id,
            event_id: item.event_id,
            registration_date: item.registration_date,
            amount_paid: item.amount_paid,
            processing_fee_paid_by_user: item.processing_fee_paid_by_user,
            bib_num: item.bib_num,
            first_name: item.users?.first_name,
            middle_name: item.users?.middle_name,
            last_name: item.users?.last_name,
            email: item.users?.email,
            street: item.users?.street,
            city: item.users?.city,
            state: item.users?.state,
            zip_code: item.users?.zip_code,
            country_code: item.users?.country_code,
            dob: item.users?.dob,
            gender: item.users?.gender,
            phone: item.users?.phone,
            age: age,
            event_name: item.events?.name,
            event_start_time: item.events?.start_time,
            race_name: item.events?.races?.name,
            race_id: item.events?.races?.race_id
          }
        })
        
        setRegistrations(flattenedData)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load registrations:', err)
        setError('Failed to load registrations')
        setLoading(false)
      }
    }
    fetchData()
  }, [eventId])

  const filteredRegistrations = registrations.filter(reg => 
    reg.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.race_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.event_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return dateStr.split('T')[0]
  }

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) return <div className="text-center py-12 text-[#94A3B8] animate-fade-in">Loading registrations...</div>
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>

  const eventName = registrations.length > 0 ? registrations[0].event_name : null
  const eventYear = registrations.length > 0 && registrations[0].event_start_time 
    ? registrations[0].event_start_time.split('T')[0].split('-')[0]
    : null

  return (
    <div className="animate-fade-in">
      {eventId && (
        <Link
          to={`/races/${registrations[0]?.race_id || ''}`}
          className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6 group transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Events
        </Link>
      )}

      <h1 className="text-5xl font-bold mb-8 text-white break-words">
        {eventId && eventName && eventYear 
          ? `Registrations - ${eventName} ${eventYear}` 
          : eventId && eventName 
          ? `Registrations - ${eventName}`
          : 'Registrations'}
      </h1>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by name, email, race, or event..."
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
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Bib #</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Age</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Registration Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Processing Fee</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-[#94A3B8]">
                    No registrations found
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => (
                  <tr key={reg.registration_id} className="hover:bg-[#334155] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedUser(reg)}
                        className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <User className="h-5 w-5 mr-2" />
                        <span className="text-sm font-medium">
                          {reg.first_name} {reg.last_name}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {reg.bib_num || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {reg.age || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {reg.gender || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#94A3B8]">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-blue-400" />
                        {formatDate(reg.registration_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-orange-400" />
                        {formatCurrency(reg.processing_fee_paid_by_user)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-green-400" />
                        {formatCurrency(reg.amount_paid)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
          <div className="card max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-in">
            <div className="flex items-center justify-between p-6 border-b border-[#334155]">
              <h2 className="text-2xl font-bold text-white">User Details</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Name Section */}
                <div>
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3">Name</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-[#94A3B8]">First Name</p>
                      <p className="text-sm font-bold text-white">{selectedUser.first_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Middle Name</p>
                      <p className="text-sm font-bold text-white">{selectedUser.middle_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Last Name</p>
                      <p className="text-sm font-bold text-white">{selectedUser.last_name}</p>
                    </div>
                  </div>
                </div>

                {/* Personal Info Section */}
                <div>
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3">Personal Info</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-[#94A3B8]">Date of Birth</p>
                      <p className="text-sm font-bold text-white">{selectedUser.dob || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Age</p>
                      <p className="text-sm font-bold text-white">{selectedUser.age || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Gender</p>
                      <p className="text-sm font-bold text-white">{selectedUser.gender || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div>
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3">Address</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#94A3B8]">Street</p>
                      <p className="text-sm font-bold text-white">{selectedUser.street || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">City</p>
                      <p className="text-sm font-bold text-white">{selectedUser.city || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">State</p>
                      <p className="text-sm font-bold text-white">{selectedUser.state || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Zip Code</p>
                      <p className="text-sm font-bold text-white">{selectedUser.zip_code || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-[#94A3B8]">Country Code</p>
                      <p className="text-sm font-bold text-white">{selectedUser.country_code || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Section */}
                <div>
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3">Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#94A3B8]">Email</p>
                      <p className="text-sm font-bold text-white">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Phone</p>
                      <p className="text-sm font-bold text-white">{selectedUser.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Registrations
