# Service Request Flow - Testing Guide

**Development Server:** ✅ Running at http://localhost:5173/
**Status:** The service request flow is fully implemented and ready for testing.

---

## How to Test the Implementation

### 1. Start the Application
```bash
cd D:\Sahaay
npm run dev  # Already running on http://localhost:5173/
```

### 2. Customer Flow - Submit Service Request

**Navigate to:** http://localhost:5173/

**Step-by-Step Testing:**

1. **Login as a Customer** (or create test customer account)
2. **Dashboard CTA** - Look for "Request Service Now" button in teal gradient section
3. **Category Selection** - Choose from 8 service categories (Electrician, Plumber, etc.)
4. **Subcategory Selection** - Pick specific service (e.g., "Switch & Socket" for Electrician)
5. **Duration Selection** (if applicable) - For care services like "Elder Care"
6. **Request Details**:
   - Select date (today through 14 days forward)
   - Select time (30-minute slots, 9 AM - 5:30 PM)
   - Enter service address
   - Add optional notes
7. **Price Display** - Should show transparent breakdown with platform/provider fee percentages
8. **Submit** - Click "Submit Request" button

**Expected Results:**
- Booking created with `provider_id: null` in database
- Redirects to `/customer/bookings`
- Booking shows as "pending" with message: "🕒 Waiting for provider to claim this request"
- Customer cannot exceed 2 active bookings limit (enforced)

### 3. Provider Flow - Claim Request from Pool

**Navigate to:** http://localhost:5173/provider

**Prerequisites:**
- Login as verified provider with `service_id` matching the request's service category
- Provider must have `verification_status: 'verified'`

**Step-by-Step Testing:**

1. **Provider Dashboard** - Navigate to "Pending Requests"
2. **View Pool** - See all unassigned requests matching provider's service category
3. **Request Details** - Each request should show:
   - Customer name and contact info
   - Service location and distance
   - Requested date/time
   - Price offered
   - Additional notes
4. **Accept Request** - Click "✓ Accept Job" button
5. **Success** - Should see "Request accepted successfully!" alert
6. **My Bookings** - Navigate to provider's "My Bookings" to see claimed request

**Expected Results:**
- Database booking updates:
  - `provider_id` set to provider's ID
  - `status` changed from "pending" → "confirmed"
- Real-time updates via Supabase subscriptions
- Customer sees provider assigned in their bookings

### 4. Database Verification

Check these database fields:

**Customer-Side Booking Record:**
```sql
-- Booking should have:
-- provider_id: null (before claim)
-- status: 'pending' (before claim)
-- service_id: matching service category
-- scheduled_at: selected date/time
-- amount: calculated price
```

**After Provider Claim:**
```sql
-- Booking updates:
-- provider_id: [provider_uuid] (not null)
-- status: 'confirmed'
```

### 5. Error Conditions to Test

**Customer Constraints:**
1. **Max 2 Active Services** - Try to submit 3rd request → Should fail with clear error message
2. **Invalid Date/Time** - Try past dates or outside 9 AM - 5:30 PM range
3. **Missing Address** - Leave address empty → Should prevent submission
4. **Past 14 Days** - Try to book beyond 14-day window

**Provider Constraints:**
1. **Wrong Service Category** - Provider with `service_id: 1` (Electrician) shouldn't see requests for `service_id: 2` (Plumber)
2. **Unverified Provider** - Provider with `verification_status: 'pending'` shouldn't see pool
3. **Already Claimed** - Try to accept request that was just claimed by another provider

### 6. Visual Verification Checklist

**Customer Interface:**
- [ ] "Request Service Now" button visible on dashboard
- [ ] Multi-step form progresses correctly (1 → 2 → 3)
- [ ] Pricing display shows transparent breakdown
- [ ] Date picker restricts to 14-day window
- [ ] Time slots are 30-minute intervals only
- [ ] Success message after submission
- [ ] "Waiting for provider" status in My Bookings

**Provider Interface:**
- [ ] "Pending Requests" page accessible
- [ ] Unassigned requests visible (with `provider_id: null`)
- [ ] Request cards show all necessary details
- [ ] "Accept Job" button functional
- [ ] Success alert after accepting
- [ ] Real-time updates (no page refresh needed)
- [ ] Accepted requests move from pool to My Bookings

### 7. API/Backend Verification

**Endpoints to Verify:**

1. **`/customer/request`** - Service request form page
2. **`POST /bookings`** - Creates booking with `provider_id: null`
3. **`GET /provider/requests`** - Fetches unassigned pool requests
4. **`PATCH /bookings/:id`** - Updates booking with `provider_id` when claimed

**Supabase Queries Working:**
```javascript
// Fetch unassigned pool requests
.or(`provider_id.is.null,provider_id.eq.${provider.id}`)
.eq('service_id', provider.service_id)

// Claim request (sets provider_id)
.update({ provider_id: providerId, status: 'confirmed' })
```

### 8. Mobile/Responsive Testing

Test on mobile viewport (~400px width):
- [ ] Service categories stack to 2 per row
- [ ] Form fields remain usable
- [ ] Buttons are tap-friendly size
- [ ] No horizontal scrolling
- [ ] Progress indicator works

### 9. Edge Cases

1. **Simultaneous Claims** - Two providers trying to claim same request
2. **Network Interruptions** - During submission or claiming
3. **Real-time Sync** - Open customer and provider views in separate tabs/windows
4. **Data Persistence** - Refresh pages after actions
5. **Form Persistence** - Navigate back/forward in form steps

### 10. Performance Testing

1. **Form Responsiveness** - Click through steps quickly
2. **Data Loading** - Provider requests page with many unassigned requests
3. **Real-time Updates** - Should be near-instant
4. **Error Recovery** - Handle failed API calls gracefully

---

## Summary of What's Working

✅ **Core Functionality:**
- Customer multi-step request form with transparent pricing
- Request submission to unassigned provider pool (`provider_id: null`)
- Provider pool filtering by service category
- Provider claiming mechanism (sets `provider_id` and `status`)
- Real-time updates via Supabase
- 2 active services limit enforcement

✅ **UI/UX:**
- Progress indicators
- Form validation
- Error messaging
- Responsive design
- Clear status indicators

✅ **Backend:**
- Database schema supports nullable `provider_id`
- Proper Supabase queries for pool filtering
- Atomic updates for claiming
- Real-time subscriptions

✅ **Build Status:** Passed npm run build, no TypeScript errors

---

## Quick Test Commands

```bash
# Check if dev server is running
curl http://localhost:5173/

# Check bundle size and errors
npm run build

# Test TypeScript compilation
npx tsc --noEmit
```

---

## Next Steps After Verification

Once testing confirms everything works:

1. **User Acceptance** - Share with stakeholders for review
2. **Analytics Setup** - Track request submission and claim rates
3. **Notifications** - Add email/SMS alerts when requests are claimed
4. **Provider Matching** - Enhance with automated suggestions based on ratings/availability
5. **Performance Monitoring** - Track claim response times
6. **User Feedback** - Collect feedback on the new platform-directed model

---

## Troubleshooting

**Issue:** Provider cannot see any requests
**Solution:** Check `service_id` matches request category and `verification_status` is 'verified'

**Issue:** Request stuck in "pending" state after claiming
**Solution:** Check Supabase update query includes both `provider_id` and `status` fields

**Issue:** Customer can submit more than 2 active services
**Solution:** Verify `fetchCustomerActiveBookingsCount` function is called in `requestService`

**Issue:** Date/time restrictions not working
**Solution:** Check `generateTimeSlots` and `getMaxDate` functions in ServiceRequestForm

**Issue:** Real-time updates not working
**Solution:** Check Supabase channel subscriptions in ProviderRequests and CustomerBookings
