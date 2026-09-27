# Service Restructure — Summary of Changes

**Date**: 2026-09-13  
**Scope**: Replace all services with exactly 8 categories + 30 sub-services

---

## New Service Structure (8 Categories)

1. **Electrician** → Fan Repair, Switch & Socket Repair, Light Installation, Wiring Repair
2. **Plumber** → Tap Repair, Pipe Leakage, Drain Blockage, Bathroom Plumbing
3. **Carpenter** → Door Repair, Furniture Repair, Lock Repair, Shelf Installation
4. **Painter** → Wall Painting, Room Painting, Touch-up, Exterior Painting
5. **Cleaner** → Home Cleaning, Bathroom Cleaning, Kitchen Cleaning, Deep Cleaning
6. **Driver** → Local Driver, Outstation Driver, Full-Day Driver
7. **Caregiver** (NEW) → Elder Care, Patient Care, Daily Assistance
8. **Technician** → AC Repair, Refrigerator Repair, Washing Machine Repair, TV Repair

---

## Files Modified

### Database Migration
- **`supabase/migrations/0013_update_services_and_skills.sql`** — Created
  - Ensures all 8 service categories exist
  - Removes obsolete services (Beautician, Gardener, etc.)
  - Clears provider_skills junction table (FK safety)
  - Deletes old skills
  - Inserts exactly 30 new sub-services matching the structure above

### Frontend Components
- **`src/components/Icons.tsx`**
  - Added `HeartIcon` for Caregiver service

- **`src/components/ServiceCard.tsx`**
  - Added Caregiver with HeartIcon
  - Updated all 8 service descriptions to match new sub-services

- **`src/pages/Home.tsx`**
  - Imported HeartIcon
  - Added `caregiver: HeartIcon` to SERVICE_ICONS map

- **`src/components/BookingModal.tsx`**
  - Replaced ALL problemOptions entries with the exact new sub-services
  - Now covers all 8 categories including Caregiver
  - Problem labels match database skills exactly

- **`src/lib/providers.ts`**
  - Updated DEFAULT_SKILLS_BY_SERVICE for IDs 1-8
  - Service ID 7 = Technician (was AC/appliances with old names)
  - Service ID 8 = Caregiver (new)
  - All skill names match migration SQL exactly

- **`src/pages/ProvidersPage.tsx`**
  - Updated mock provider data
  - Removed Beautician, Gardener, AC Repair services
  - Added Caregiver
  - Updated services filter array to only show the 8 valid categories

---

## Next Steps

1. **Run the migration** in Supabase SQL Editor:
   ```bash
   # Apply via Supabase dashboard SQL Editor
   # Or via CLI if configured:
   supabase db push
   ```

2. **Test the booking flow**:
   - Select each category
   - Verify sub-service options match the new structure
   - Confirm provider registration shows correct skills

3. **Data Impact**:
   - Existing provider_skills links are cleared (providers need to re-select skills)
   - Existing bookings remain intact (reference service_id which stays valid)
   - Service categories 1-7 keep same IDs, Caregiver gets ID 8

4. **Provider Communication**:
   - Existing providers will need to update their skill selections
   - Their service category (electrician/plumber/etc) remains unchanged

---

## Service ID Mapping

| ID | Service Name | Sub-Services Count |
|----|-------------|-------------------|
| 1  | Electrician | 4                 |
| 2  | Plumber     | 4                 |
| 3  | Carpenter   | 4                 |
| 4  | Painter     | 4                 |
| 5  | Cleaner     | 4                 |
| 6  | Driver      | 3                 |
| 7  | Technician  | 4                 |
| 8  | Caregiver   | 3                 |

**Total**: 8 categories, 30 sub-services
