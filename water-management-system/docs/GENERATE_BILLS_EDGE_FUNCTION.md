# Generate Bills Edge Function

## Overview
Automatic billing engine that processes meter readings and creates bills for all active customers.

## Deployment

```bash
supabase functions deploy generate-bills
```

## Configuration

Set the following environment variables in your Supabase project settings:

```
BILLING_API_KEY=your-secure-api-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## API Endpoint

```
POST https://your-project.supabase.co/functions/v1/generate-bills
X-API-Key: your-secure-api-key-here
Content-Type: application/json
```

## Request

Empty body:

```json
{}
```

## Response

```json
{
  "success": true,
  "bills_generated": 42,
  "bills_failed": 2,
  "total_revenue": 125000,
  "errors": [
    "Customer ABC123 has no active meters",
    "Failed to bill meter MET-999: readings error"
  ]
}
```

## How It Works

1. **Validation**: Checks if bills already exist for current billing period (prevents duplicates)
2. **Customer Loop**: Iterates through all active customers
3. **Meter Loop**: For each active meter, sums consumption readings
4. **Calculation**: Applies customer's tariff rate (liters × tariff_rate_per_liter)
5. **Insertion**: Creates bill record with status 'pending' and 14-day due date
6. **Reporting**: Returns summary of generated bills and any errors

## Billing Logic

- **Reading Delta**: Uses difference between latest and oldest meter reading in the billing period
- **Fallback**: If only one reading exists, uses that value (assumes from 0)
- **Tariff**: Pulled from `customer_types.tariff_rate_per_liter` via FK
- **Due Date**: 14 days after period end (configurable via code change)

## Scheduled Execution (Monthly)

To run automatically on the 1st of each month at 00:00 UTC:

### Option 1: Supabase Cron (Recommended)

Create a scheduled function that calls generate-bills:

```sql
select cron.schedule(
  'monthly_billing',
  '0 0 1 * *',  -- First day of each month at 00:00 UTC
  $$
  select net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/generate-bills',
    headers := jsonb_build_object(
      'authorization', 'Bearer ' || current_setting('app.jwt_token'),
      'x-api-key', current_setting('app.billing_api_key'),
      'content-type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Option 2: External Scheduler (e.g., GitHub Actions)

```yaml
name: Generate Monthly Bills
on:
  schedule:
    - cron: '0 0 1 * *'  # First day of month at 00:00 UTC

jobs:
  bill:
    runs-on: ubuntu-latest
    steps:
      - name: Call generate-bills
        run: |
          curl -X POST \
            https://your-project.supabase.co/functions/v1/generate-bills \
            -H "X-API-Key: ${{ secrets.BILLING_API_KEY }}" \
            -H "Content-Type: application/json"
```

## Error Handling

- Missing/invalid tariff: Skips customer, logs error
- No active meters: Logs error, continues to next customer
- Meter reading query failure: Logs error, continues to next meter
- Billing period already exists: Aborts with informative message

## Testing

```bash
# Local testing (requires SERVICE_ROLE_KEY)
supabase functions serve generate-bills

# In another terminal
curl -X POST http://localhost:54321/functions/v1/generate-bills \
  -H "X-API-Key: test-key" \
  -H "Content-Type: application/json"
```

## Database Views Used

- `customers` - Active customer records with `customer_type_id` FK
- `customer_types` - Tariff rates
- `meters` - Active meter links to customers
- `meter_readings` - Consumption readings
- `bills` - Destination table for generated bills

## Future Enhancements

- [ ] Support multiple billing periods (not just monthly)
- [ ] Minimum charge logic
- [ ] Seasonal tariff variations
- [ ] Tax/surcharge calculations
- [ ] Partial meter installations (prorated bills)
- [ ] Retry mechanism with exponential backoff
- [ ] Webhook notifications to finance system
