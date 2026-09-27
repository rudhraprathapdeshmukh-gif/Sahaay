# Sahaay Provider Signup Form - Updates Summary

## Date: 2026-09-08

## Overview
Updated the Sahaay Service Provider signup form with comprehensive validation, new required fields, and file upload capabilities while maintaining the existing minimalist UI design.

---

## New Required Fields

### 1. **Name Fields**
- **First Name** (required)
- **Last Name** (required)
- **Full name validation**: Maximum 20 characters combined
- Split name input for better data structure

### 2. **Contact Information**
- **Indian Mobile Number** (required)
  - Proper +91 prefix display
  - 10-digit validation
  - Must start with 6-9 (Indian mobile pattern)
  - Regex validation: `/^[6-9]\d{9}$/`

### 3. **Email Validation**
- **Gmail only** requirement
- Validation: Email must end with `@gmail.com`
- Clear error message for non-Gmail addresses

### 4. **Date of Birth** (required)
- HTML5 date input field
- Stored as text in database

### 5. **Profile Photo** (required)
- File upload with image/* accept filter
- Uploaded to Supabase Storage bucket: `provider-photos`
- Public bucket for customer viewing
- URL stored in `users.avatar_url` and `service_providers.profile_photo_url`

### 6. **Certificate Upload** (optional)
- File upload accepting images and PDFs
- Uploaded to Supabase Storage bucket: `provider-certificates`
- Private bucket (admin access only)
- URL stored in `service_providers.certificate_url`
- Currently optional as requested

### 7. **Primary Location** (required)
- GPS auto-detection on component mount
- LocationPicker component automatically requests location
- Falls back to manual lat/lng entry if GPS denied
- Validation recommends but doesn't block submission

---

## Technical Changes

### Database Schema Updates

#### New Migration: `0006_provider_extra_fields.sql`
```sql
-- Added to users table
alter table public.users
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists dob text;

-- Added to service_providers table
alter table public.service_providers
  add column if not exists certificate_url text;

-- Created storage buckets with policies
insert into storage.buckets (id, name, public)
values ('provider-photos', 'provider-photos', true);

insert into storage.buckets (id, name, public)
values ('provider-certificates', 'provider-certificates', false);
```

### New Files Created

1. **`src/lib/storage.ts`**
   - File upload utility function
   - Handles Supabase Storage uploads
   - Returns public URLs for uploaded files
   - Exports bucket name constants

### Updated Files

1. **`src/types/database.ts`**
   - Added `first_name`, `last_name`, `dob` to User interface
   - Added `certificate_url` to ServiceProvider interface

2. **`src/lib/providers.ts`**
   - Updated `upsertUser()` to accept new fields
   - Updated `registerProvider()` to handle photo uploads and new fields
   - Updated `upsertProviderProfile()` to save certificate URL
   - Added profile_photo_url handling throughout

3. **`src/pages/ProviderOnboarding.tsx`**
   - Replaced single `fullName` field with `firstName` and `lastName`
   - Added `dob`, `profilePhoto`, `certificate` to FormData interface
   - Updated validation logic for all new fields
   - Added Gmail-only email validation
   - Added Indian mobile number validation
   - Added file upload handling with proper error states
   - Integrated file uploads into registration flow

4. **`src/components/LocationPicker.tsx`**
   - Added auto-request location on mount
   - Improves UX by detecting GPS automatically when component loads

---

## Validation Rules

### Step 1: Basic Info
- ✅ First name required
- ✅ Last name required
- ✅ Combined name max 20 characters
- ✅ Gmail address required (must end with @gmail.com)
- ✅ Password min 6 characters
- ✅ Indian mobile: 10 digits starting with 6-9
- ✅ Date of birth required
- ✅ Profile photo required (image files only)
- ⚪ Certificate optional (images or PDFs)
- ✅ City and State required

### Step 2: Services & Skills
- ✅ Service category required
- ✅ At least one skill required
- ✅ Years of experience required

### Step 3: Profile & Availability
- ✅ Bio minimum 20 characters
- ✅ At least one availability slot required
- ⚠️ Location recommended but not blocking (shows warning)

---

## User Experience Improvements

1. **Clear Error Messages**
   - Specific validation messages for each field
   - Inline error display below each input
   - Red border highlighting on invalid fields

2. **File Upload Feedback**
   - Shows selected filename after upload
   - Clear visual state for required vs optional uploads
   - Proper file type filtering (accept attribute)

3. **Auto GPS Detection**
   - Location automatically requested on Step 3
   - Reduces friction in location entry
   - Graceful fallback to manual entry if denied

4. **Progressive Disclosure**
   - 3-step form maintains existing UX
   - New fields integrated naturally into Step 1
   - No cognitive overload with clear progress indicators

---

## Storage Buckets & Policies

### provider-photos (Public)
- **Purpose**: Provider profile photos visible to customers
- **Access**: Public read, authenticated write
- **Policy**: Providers can upload their own photos, anyone can view

### provider-certificates (Private)
- **Purpose**: Verification documents for admin review
- **Access**: Authenticated read/write
- **Policy**: Providers can upload, only authenticated users (admins) can view

---

## Migration Instructions

1. **Run Database Migration**
   ```bash
   # In Supabase SQL Editor or via CLI
   supabase db push
   ```
   This will apply `0006_provider_extra_fields.sql`

2. **Create Storage Buckets** (if not auto-created)
   - Go to Supabase Dashboard → Storage
   - Buckets should be created automatically via migration
   - Verify policies are applied correctly

3. **Test Registration Flow**
   - Sign up as new provider
   - Verify all validations work
   - Confirm photos upload successfully
   - Check data appears correctly in database

---

## Future Enhancements (Not Implemented)

- Certificate verification workflow
- Image compression before upload
- Drag-and-drop file upload
- Image cropping tool for profile photos
- Certificate expiry tracking
- Admin certificate approval interface

---

## Notes

- Certificate upload remains **optional** as requested
- All existing functionality preserved
- No breaking changes to current providers
- Maintains Sahaay's minimalist UI design
- Build successful with zero TypeScript errors
- All validations tested in development mode

