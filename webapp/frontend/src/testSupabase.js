import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Read .env file manually
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '..', '.env')

let supabaseUrl = ''
let supabasePublishableKey = ''

try {
  const envContent = readFileSync(envPath, 'utf-8')
  const lines = envContent.split('\n')
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim()
    } else if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) {
      supabasePublishableKey = line.split('=')[1].trim()
    }
  }
} catch (err) {
  console.error('Error reading .env file:', err.message)
  process.exit(1)
}

if (!supabaseUrl || !supabasePublishableKey) {
  console.error('Missing Supabase environment variables in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  db: {
    schema: 'htc'
  }
})

async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test basic connection
    const { data, error } = await supabase
      .from('races')
      .select('race_id, name')
      .limit(1)
    
    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }
    
    console.log('✅ Supabase connection successful!')
    console.log('Sample data:', data)
    return true
  } catch (err) {
    console.error('Test failed:', err)
    return false
  }
}

testConnection()
