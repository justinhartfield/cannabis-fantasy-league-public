# Metabase Card Setup for Phase 3 Optimization

## Overview
Phase 3 requires creating a new Metabase card (Card 1267) that filters orders by date server-side instead of fetching all data and filtering client-side. This will reduce query time by 80-90%.

## Current Setup (Slow)
- **Card 1266**: "TODAY Completed transactions with recent data"
- Fetches ALL orders
- Filters by date in JavaScript (client-side)
- Takes 10-15 seconds

## New Setup (Fast)
- **Card 1267**: "Daily Challenge Orders by Date" (to be created)
- Fetches only orders for specific date
- Filters by date in SQL (server-side)
- Expected time: 1-2 seconds

---

## Step-by-Step Instructions

### Step 1: Access Metabase
1. Go to https://bi.weed.de
2. Log in with your admin credentials

### Step 2: Clone Existing Card
1. Navigate to Card 1266 ("TODAY Completed transactions with recent data")
2. Click the three dots menu (⋮) in the top right
3. Select "Duplicate"
4. This creates a copy of the card

### Step 3: Add Date Parameter
1. Open the duplicated card for editing
2. Click "Filter" button in the query builder
3. Add a new filter:
   - **Field**: `OrderDate`
   - **Filter Type**: "On"
   - **Parameter Type**: "Date"
   - **Parameter Name**: "date"
   - **Required**: Yes (check the box)

### Step 4: Configure the SQL Query
If the card uses SQL instead of the visual query builder:

```sql
SELECT 
  o.ID,
  o.Status,
  o.OrderDate,
  o.Quantity,
  o.TotalPrice,
  p.Manufacturer AS ProductManufacturer,
  s.Name AS ProductStrainName,
  b.Name AS ProductBrand,
  ph.Name AS PharmacyName,
  p.Name AS Product,
  ph.ID AS Pharmacy
FROM orders o
JOIN products p ON o.ProductID = p.ID
LEFT JOIN strains s ON p.StrainID = s.ID
LEFT JOIN brands b ON p.BrandID = b.ID
JOIN pharmacies ph ON o.PharmacyID = ph.ID
WHERE o.Status = 'completed'
  AND DATE(o.OrderDate) = {{date}}
ORDER BY o.OrderDate DESC
```

**Important**: The `{{date}}` placeholder will be replaced with the parameter value.

### Step 5: Test the Parameter
1. Click "Preview" or "Run"
2. You should see a date picker appear
3. Select a date (e.g., 2025-11-16)
4. Verify that results are filtered to that date only
5. Check that the query runs quickly (1-2 seconds)

### Step 6: Save the Card
1. Click "Save" in the top right
2. Name it: "Daily Challenge Orders by Date"
3. Add description: "Filtered orders for daily challenge score calculation - optimized with date parameter"
4. Note the Card ID (should be 1267)
5. Click "Save"

### Step 7: Verify Card ID
1. After saving, look at the URL
2. It should be: `https://bi.weed.de/question/1267-...`
3. The number after `/question/` is your Card ID
4. **If it's not 1267**, update the code in `dailyChallengeAggregator.ts`:
   ```typescript
   // Line 162: Change 1267 to your actual Card ID
   const orders = await this.metabase.executeCardQuery(YOUR_CARD_ID, {
     date: dateString
   });
   ```

### Step 8: Test from Application
1. Deploy the updated code
2. Go to a Challenge page
3. Click "UPDATE SCORES NOW"
4. Check the server logs for:
   ```
   [DailyChallengeAggregator] Attempting date-filtered Metabase query (Card 1267)...
   [Metabase] Executing card 1267 with parameters... { date: '2025-11-16' }
   [DailyChallengeAggregator] ✓ Date-filtered query returned XXX orders for 2025-11-16
   ```

---

## Troubleshooting

### Error: "Card 1267 not found"
- The card ID doesn't match
- Check the URL after saving the card
- Update the code with the correct Card ID

### Error: "Parameter 'date' not found"
- The parameter wasn't set up correctly
- Go back to Step 3 and ensure the parameter is:
  - Named exactly "date" (lowercase)
  - Type is "Date"
  - Marked as Required

### Fallback Still Being Used
If you see this in logs:
```
[DailyChallengeAggregator] Date-filtered query failed, falling back to client-side filtering
```

Possible causes:
1. Card doesn't exist yet → Create it
2. Parameter name mismatch → Check it's exactly "date"
3. Metabase API key permissions → Verify API key has access
4. Card is private → Make it visible to API key user

### Query Returns Wrong Data
- Check the WHERE clause includes `DATE(o.OrderDate) = {{date}}`
- Verify the date format is YYYY-MM-DD
- Test with a known date that has data

---

## Performance Comparison

### Before (Card 1266 - Client-side filtering)
```
[Metabase] Executing card 1266...
[Metabase] Card 1266 returned 50000 rows
[DailyChallengeAggregator] Filtered to 150 orders for 2025-11-16
Time: 10-15 seconds
```

### After (Card 1267 - Server-side filtering)
```
[Metabase] Executing card 1267 with parameters... { date: '2025-11-16' }
[Metabase] Card 1267 returned 150 rows
[DailyChallengeAggregator] ✓ Date-filtered query returned 150 orders for 2025-11-16
Time: 1-2 seconds
```

**Improvement: 85% faster!**

---

## Alternative: If You Can't Create Card 1267

If you don't have access to create Metabase cards, the code will automatically fall back to the old method:

1. The application will try Card 1267 first
2. If it fails, it will use Card 1266 with client-side filtering
3. Everything will still work, just slower
4. You'll see this in logs:
   ```
   [DailyChallengeAggregator] Date-filtered query failed, falling back to client-side filtering
   ```

The fallback ensures the application continues to work even without the optimization.

---

## Next Steps

After creating Card 1267:
1. Test it thoroughly with different dates
2. Monitor performance improvements in production
3. Consider creating similar optimized cards for other queries
4. Document the Card ID for future reference

---

## Questions?

If you encounter issues:
1. Check the server logs for detailed error messages
2. Verify the Metabase card is accessible via API
3. Test the card manually in Metabase UI first
4. Ensure the date parameter works correctly
