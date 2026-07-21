import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import * as bcrypt from 'https://esm.sh/bcryptjs@2.4.3'

interface ProvisionMachineRequest {
  name: string
  serial_number: string
  address: string
  tank_capacity_liters: number
  daily_target_liters: number
}

interface ProvisionMachineResponse {
  success: boolean
  machine_id?: string
  serial_number?: string
  device_secret?: string
  ingest_host?: string
  error?: string
}

// Generate a cryptographically secure random secret
function generateDeviceSecret(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export default async (req: Request, ctx: any): Promise<Response> => {
  try {
    // Only POST allowed
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Authenticate: must be logged-in user with staff role
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify JWT token and extract user
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabase.auth.getUser(token)

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
    const body: ProvisionMachineRequest = await req.json()
    const { name, serial_number, address, tank_capacity_liters, daily_target_liters } = body

    // Validate inputs
    if (!name || !serial_number || !address || !tank_capacity_liters || !daily_target_liters) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check if serial number already exists
    const { data: existingMachine, error: checkError } = await supabase
      .from('machines')
      .select('id')
      .eq('serial_number', serial_number)
      .limit(1)
      .single()

    if (existingMachine) {
      return new Response(
        JSON.stringify({ error: `Machine with serial number ${serial_number} already exists` }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Generate device secret and hash
    const deviceSecret = generateDeviceSecret()
    const deviceSecretHash = await bcrypt.hash(deviceSecret, 12)

    // Insert machine record
    const { data: machineData, error: insertError } = await supabase
      .from('machines')
      .insert({
        name,
        serial_number,
        location: address,
        tank_capacity_liters,
        daily_target_liters,
        status: 'offline',
        device_secret_hash: deviceSecretHash,
        device_provisioned_at: new Date().toISOString(),
        device_provisioned_by: userData.user.id
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to provision machine' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Return response with plaintext secret (shown only once)
    const response: ProvisionMachineResponse = {
      success: true,
      machine_id: machineData.id,
      serial_number,
      device_secret: deviceSecret,
      ingest_host: new URL(Deno.env.get('SUPABASE_URL')!).hostname
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Provision machine error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
