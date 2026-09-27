# Customer Service Request Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a platform-directed service request flow where customers submit requests to a pool (no provider selection) and providers claim them.

**Architecture:** 
- Modify the database schema to allow `bookings.provider_id` to be NULL.
- Replace the provider-specific booking flow with a platform-directed request flow.
- Introduce a new request-submission component that drives the user through category -> subcategory -> price display -> request details.
- Update UI to handle unassigned bookings (status='pending', provider_id=NULL).
- Update provider-side to display available requests for claiming.

**Tech Stack:** React 18, Supabase (PostgreSQL), TypeScript, Tailwind CSS.

**Spec:** The requirement is to shift from a provider-centric booking model to a platform-directed request pool model.

## Global Constraints

- `provider_id` must be allowed to be NULL in the `bookings` table.
- All new service requests must have `provider_id: null` upon submission.
- Providers claim unassigned requests from a shared pool.
- Pricing must be validated and displayed from `pricing.ts` before submission.
- Existing features must remain functional.

---

### Task 1: Database Migration
**Files:**
- Create: `supabase/migrations/20260922000000_make_bookings_provider_nullable.sql`

**Interfaces:**
- Produces: `bookings` table with `provider_id` as NULLABLE.

- [ ] **Step 1: Write migration**
```sql
ALTER TABLE public.bookings ALTER COLUMN provider_id DROP NOT NULL;
```
- [ ] **Step 2: Run migration**
(Assumed to be run against Supabase environment)

### Task 2: Update TypeScript Types
**Files:**
- Modify: `src/types/database.ts`

**Interfaces:**
- Produces: `Booking` type with `provider_id: string | null`.

- [ ] **Step 1: Update Booking interface**
```typescript
export interface Booking {
  // ...
  provider_id: string | null
  // ...
}
```

### Task 3: Update `src/lib/services.ts`
**Files:**
- Modify: `src/lib/services.ts`

**Interfaces:**
- Consumes: `types/database.ts`
- Produces: `createBooking` function accepting nullable `provider_id`.

- [ ] **Step 1: Update `createBooking`**
```typescript
export const createBooking = async (booking: {
  customer_id: string
  provider_id: string | null // Now nullable
  service_id: number
  scheduled_at?: string
  address?: string
  notes?: string
  amount: number
}): Promise<Booking> => {
  // ... update INSERT to handle provider_id: payload.provider_id ?? null
}
```

### Task 4: Create Request Submission Component
**Files:**
- Create: `src/components/ServiceRequestForm.tsx`

**Interfaces:**
- Produces: `ServiceRequestForm` component that leads customer through flow: Category -> Subcategory -> Price -> Details.

- [ ] **Step 1: Implement ServiceRequestForm**
(Use `CATEGORY_PRICING` from `src/lib/pricing.ts`)

### Task 5: Implement Request Flow Page
**Files:**
- Modify: `src/components/RoleDashboardRouter.tsx`
- Modify: `src/pages/customer/CustomerFindProviders.tsx` (replace with new request flow page)

**Interfaces:**
- Produces: New request page driving the platform-directed model.

### Task 6: Update Dashboard and Bookings List
**Files:**
- Modify: `src/pages/customer/CustomerBookings.tsx`
- Modify: `src/pages/customer/CustomerDashboard.tsx`

**Interfaces:**
- Produces: UI that handles `provider_id === null` bookings.

### Task 7: Update Provider "Pool" View
**Files:**
- Modify: `src/pages/provider/ProviderRequests.tsx`

**Interfaces:**
- Produces: A list view of requests where `provider_id === null`.
