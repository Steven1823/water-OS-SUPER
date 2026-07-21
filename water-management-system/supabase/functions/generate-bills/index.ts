import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

interface GenerateBillsResponse {
  success: boolean
  bills_generated: number
  bills_failed: number
  total_revenue: number
  errors: string[]
}

export default async (
  req: Request,
  ctx: any
): Promise<Response> => {
  try {
    // Authenticate: require x-api-key or service role
    const apiKey = req.headers.get('x-api-key')
    if (apiKey !== Deno.env.get('BILLING_API_KEY')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role (for RLS bypass)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get billing period (default: current month)
    const now = new Date()
    const period_start = new Date(now.getFullYear(), now.getMonth(), 1)
    const period_end = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // Check if bills already exist for this period
    const { data: existingBills, error: checkError } = await supabase
      .from('bills')
      .select('id')
      .gte('created_at', period_start.toISOString())
      .lt('created_at', period_end.toISOString())
      .limit(1)

    if (checkError) throw checkError

    if (existingBills && existingBills.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Bills already generated for this period',
          bills_generated: 0,
          bills_failed: 0,
          total_revenue: 0,
          errors: ['Bills already exist for current billing period']
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let billsGenerated = 0
    let billsFailed = 0
    let totalRevenue = 0
    const errors: string[] = []

    // Fetch all active customers with their customer types (for tariff)
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        customer_type_id,
        customer_types (
          id,
          tariff_rate_per_liter
        )
      `)
      .eq('status', 'active')

    if (customersError) throw customersError
    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active customers to bill',
          bills_generated: 0,
          bills_failed: 0,
          total_revenue: 0,
          errors: []
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // For each customer, find active meters and sum readings
    for (const customer of customers) {
      try {
        const customerTypes = customer.customer_types as any
        if (!customerTypes || !customerTypes.tariff_rate_per_liter) {
          errors.push(`Customer ${customer.name} has invalid tariff`)
          billsFailed++
          continue
        }

        const tariffRate = customerTypes.tariff_rate_per_liter

        // Get all active meters for this customer
        const { data: meters, error: metersError } = await supabase
          .from('meters')
          .select('id, serial_number')
          .eq('customer_id', customer.id)
          .eq('status', 'active')

        if (metersError) throw metersError
        if (!meters || meters.length === 0) {
          errors.push(`Customer ${customer.name} has no active meters`)
          continue
        }

        // For each meter, sum readings from the billing period
        for (const meter of meters) {
          try {
            // Get latest reading before billing period, and within period
            const { data: readings, error: readingsError } = await supabase
              .from('meter_readings')
              .select('reading_value, reading_date')
              .eq('meter_id', meter.id)
              .gte('reading_date', period_start.toISOString().split('T')[0])
              .lt('reading_date', period_end.toISOString().split('T')[0])
              .order('reading_date', { ascending: false })

            if (readingsError) throw readingsError

            let liters = 0
            if (readings && readings.length >= 2) {
              // Calculate delta: latest - oldest reading in period
              const latest = readings[0].reading_value
              const oldest = readings[readings.length - 1].reading_value
              liters = Math.max(0, latest - oldest)
            } else if (readings && readings.length === 1) {
              // Only one reading in period; use as-is if it's positive
              liters = Math.max(0, readings[0].reading_value)
            }

            // Calculate bill amount
            const amount = Math.round(liters * tariffRate)
            const dueDate = new Date(period_end)
            dueDate.setDate(dueDate.getDate() + 14) // Due 14 days after period end

            // Insert bill
            const { error: billError } = await supabase
              .from('bills')
              .insert({
                customer_id: customer.id,
                meter_id: meter.id,
                period_start: period_start.toISOString().split('T')[0],
                period_end: period_end.toISOString().split('T')[0],
                liters_billed: liters,
                amount: amount,
                status: 'pending',
                due_date: dueDate.toISOString().split('T')[0],
                notes: `Auto-generated for meter ${meter.serial_number}`
              })

            if (billError) throw billError

            billsGenerated++
            totalRevenue += amount
          } catch (meterError) {
            errors.push(`Failed to bill meter ${meter.serial_number}: ${meterError}`)
            billsFailed++
          }
        }
      } catch (customerError) {
        errors.push(`Failed to process customer ${customer.name}: ${customerError}`)
        billsFailed++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        bills_generated: billsGenerated,
        bills_failed: billsFailed,
        total_revenue: totalRevenue,
        errors: errors.length > 0 ? errors : []
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Generate bills error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        bills_generated: 0,
        bills_failed: 0,
        total_revenue: 0,
        errors: [String(error)]
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
