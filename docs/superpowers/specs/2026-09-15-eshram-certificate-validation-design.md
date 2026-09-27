# e-SHRAM Certificate Validation System — Design Specification

**Date:** 2026-09-15  
**Project:** Sahaay Provider Onboarding  
**Status:** Design Complete  

---

## Executive Summary

This document specifies a certificate validation system that validates provider-uploaded e-SHRAM cards during registration. The system extracts UAN (Universal Account Number) and occupation data from card images using client-side OCR, validates against a local UAN registry, and prevents duplicate registrations and occupation mismatches.

**Key outcomes:**
- Providers cannot proceed to registration unless their e-SHRAM card is valid
- UAN numbers are verified against a local database
- Occupation on the card must match the service category the provider selected
- Each UAN can only be registered once (fraud prevention)

---

## Architecture & Data Flow

```
[Provider selects Certificate File in Step 2]
                     │
                     ▼
       [Client-side Preprocessing] (Contrast enhancement, grayscale)
                     │
                     ▼
        [Tesseract.js OCR Worker]
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
 [Extract 12-digit UAN]   [Extract Occupation Text]
        │                         │
        └────────────┬────────────┘
                     ▼
 [Call Supabase: validate_provider_certificate]
  1. Check if UAN exists in `uan_registry` table
  2. Check if UAN is already registered by another provider (fraud prevention)
  3. Map extracted occupation to Service Category
  4. Compare with Provider's selected Service Category
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
   [PASS ✅]                  [FAIL ❌]
• Show green validation badge  • Show specific error message:
• Enable "Next / Proceed"      - "Invalid UAN / Not found in registry"
• Auto-fill name/DOB (opt)     - "Occupation mismatch: Card says [X], you selected [Y]"
                               - "UAN already in use by another account"
                               • Disable "Next" button until valid card uploaded
```

### Zero Backend Server Overhead
Tesseract.js runs directly in a client Web Worker in the browser to extract text from the card image, eliminating server-side OCR infrastructure.

### Atomic Supabase Validation
An RPC verifies extracted UAN and occupation against the registry before allowing step progression.

### Instant Feedback
The user sees validation status immediately upon choosing the file in Step 2, rather than waiting until the final submit button.

---

## Database Schema

### Table: `uan_registry`

Stores all valid UAN records from the e-SHRAM database. Each UAN can be registered only once.

```sql
create table public.uan_registry (
  uan                text primary key check (uan ~ '^\d{12}$'),
  name               text not null,
  father_name        text,
  dob                date,
  gender             text check (gender in ('Male', 'Female', 'Other')),
  occupation         text not null,
  registered_by      uuid references public.service_providers(id) on delete set null,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create index idx_uan_registry_occupation on public.uan_registry(occupation);
create index idx_uan_registry_registered_by on public.uan_registry(registered_by);
```

**Fraud Prevention:** The `registered_by` column tracks which provider (if any) claimed this UAN. When validating a new certificate, we check if the UAN is already linked to a different provider's account.

### Table: `occupation_mappings`

Maps free-form occupation text extracted from e-SHRAM cards to Sahaay Service Categories. This normalizes variations in how occupations are written on cards.

```sql
create table public.occupation_mappings (
  id                serial primary key,
  occupation_text   text not null unique,
  service_id        int not null references public.services(id),
  created_at        timestamptz default now()
);

create index idx_occupation_mappings_service on public.occupation_mappings(service_id);
```

**Seed data example:**
```sql
insert into public.occupation_mappings (occupation_text, service_id) values
  ('Electrician', 1),
  ('Electrical Worker', 1),
  ('Plumber', 2),
  ('Plumbing Worker', 2),
  ('Carpenter', 3),
  ('Wood Worker', 3),
  ('Painter', 4),
  ('House Painter', 4),
  ('Cleaner', 5),
  ('Cleaning Worker', 5),
  ('Driver', 6),
  ('Vehicle Driver', 6),
  ('Appliance Technician', 7),
  ('Repair Technician', 7),
  ('Care Worker', 8),
  ('Nursing Assistant', 8);
```

---

## Validation Logic (RPC)

### Function: `validate_provider_certificate`

Validates an extracted UAN and occupation against the registry.

```sql
create or replace function public.validate_provider_certificate(
  p_uan              text,
  p_extracted_occupation text,
  p_provider_service_id int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uan_record       public.uan_registry%rowtype;
  v_mapped_service   int;
  v_already_used_by  uuid;
begin
  -- 1. Check if UAN exists in registry
  select * into v_uan_record from public.uan_registry where uan = p_uan;
  
  if v_uan_record is null then
    return jsonb_build_object(
      'valid', false,
      'error', 'UAN not found in registry. Invalid or unregistered card.'
    );
  end if;
  
  -- 2. Fraud check: is this UAN already claimed by another provider?
  if v_uan_record.registered_by is not null then
    return jsonb_build_object(
      'valid', false,
      'error', 'This UAN is already in use. Cannot register with duplicate certificate.'
    );
  end if;
  
  -- 3. Occupation matching: map extracted text to service_id
  select service_id into v_mapped_service
    from public.occupation_mappings
   where lower(occupation_text) = lower(p_extracted_occupation)
   limit 1;
  
  if v_mapped_service is null then
    return jsonb_build_object(
      'valid', false,
      'error', format('Occupation "%s" not recognized. Please select a valid service category.', p_extracted_occupation)
    );
  end if;
  
  -- 4. Service mismatch: does mapped service match provider's selected service?
  if v_mapped_service != p_provider_service_id then
    return jsonb_build_object(
      'valid', false,
      'error', format(
        'Occupation mismatch: Your certificate shows "%s" but you selected a different service. Please correct this.',
        p_extracted_occupation
      )
    );
  end if;
  
  -- All checks passed
  return jsonb_build_object(
    'valid', true,
    'uan', v_uan_record.uan,
    'name', v_uan_record.name,
    'occupation', v_uan_record.occupation,
    'dob', v_uan_record.dob
  );
end;
$$;

grant execute on function public.validate_provider_certificate(text, text, int) to authenticated, anon;
```

**Return shape:**

- **On success (`valid: true`)**:
  ```json
  {
    "valid": true,
    "uan": "123456789012",
    "name": "John Doe",
    "occupation": "Electrician",
    "dob": "1990-05-15"
  }
  ```

- **On failure (`valid: false`)**:
  ```json
  {
    "valid": false,
    "error": "Specific error message"
  }
  ```

---

## Client-Side Validation Flow

### Phase 1: File Upload & OCR Extraction

When the provider selects a certificate file in Step 2:

1. **Preprocess the image** (client-side):
   - Convert to grayscale
   - Enhance contrast to improve OCR accuracy
   - Resize if needed for Tesseract.js performance

2. **Run Tesseract.js OCR** in a Web Worker:
   - Extract all text from the image
   - Parse for 12-digit UAN pattern: `/\d{12}/`
   - Parse for occupation field (typically after "Occupation:" label)
   - Return extracted data or error if unreadable

3. **Show interim feedback**:
   - "Scanning certificate..." spinner while OCR runs
   - If OCR fails: "Could not read certificate. Please ensure image is clear and well-lit."

### Phase 2: Server-Side Validation

Once UAN and occupation are extracted, call the `validate_provider_certificate` RPC with:
- Extracted UAN
- Extracted occupation text
- Provider's selected service_id

### Phase 3: UI Feedback Loop

Based on RPC response:

- **✅ PASS**: 
  - Show green badge: "Certificate verified ✓"
  - Optionally auto-fill name and DOB from certificate data
  - Enable "Next" button
  - Form can proceed to Step 3

- **❌ FAIL**: 
  - Show red alert box with specific error message
  - Disable "Next" button
  - Allow user to re-upload a different certificate
  - Clear the error when a new file is selected

---

## Integration with Provider Onboarding

### Where It Fits in Step 2

Currently, Step 2 of onboarding collects:
- Full name, phone, district, state
- Service category (dropdown)
- Bio, years of experience, service radius
- Profile photo
- Certificate file (upload)

**New flow:**

1. User selects a certificate file via file input
2. **Trigger OCR validation immediately** (not deferred to form submit)
3. Display validation status inline as badge + error message (if any)
4. **Block form submission** until certificate is valid (`validationPassed === true`)
5. If validation passes, optionally pre-fill name and DOB for user review
6. On successful registration, mark the UAN as `registered_by` this provider in the `uan_registry` table

### Implementation Points

**Client-side (`src/pages/ProviderOnboarding.tsx`)**:
- Add `tesseract.js` to dependencies
- Create `validateCertificate()` helper that:
  - Loads image, preprocesses it
  - Runs OCR in a Web Worker (non-blocking)
  - Calls RPC `validate_provider_certificate()` with extracted UAN + occupation
  - Returns validation result or error
- Bind to file input `onChange` event
- Render validation status component (badge + error message)
- Block form submission until `validationPassed === true`

**Server-side (Supabase)**:
- Create `validate_provider_certificate()` RPC (see Validation Logic section)
- Create `uan_registry` table
- Create `occupation_mappings` table with seed data
- Update `register_provider()` RPC to:
  - Accept `p_uan` as a parameter
  - On successful registration, set `uan_registry.registered_by` to this provider's ID
  - This prevents fraud (same UAN used twice)

**Database migrations**:
- New migration file with:
  - `uan_registry` table creation
  - `occupation_mappings` table creation + seed data
  - `validate_provider_certificate()` RPC
  - Update to `register_provider()` to accept and track UAN

---

## Error Handling

### OCR Failures
- If Tesseract cannot read the image: "Could not read certificate. Please ensure image is clear and well-lit."
- Offer user the option to re-upload a clearer image

### Validation Failures
- **UAN not in registry**: "UAN not found in registry. Invalid or unregistered card."
- **UAN already registered**: "This UAN is already in use. Cannot register with duplicate certificate."
- **Occupation not recognized**: "Occupation '[occupation]' not recognized. Please select a valid service category."
- **Occupation mismatch**: "Occupation mismatch: Your certificate shows '[cert_occupation]' but you selected a different service. Please correct this."

### Network Failures
- If RPC call fails: "Unable to verify certificate. Please check your connection and try again."
- Offer retry button

---

## Testing Strategy

1. **Unit tests** (OCR extraction):
   - Test Tesseract.js extraction with sample e-SHRAM card images
   - Verify UAN regex matching
   - Verify occupation text extraction

2. **Integration tests** (RPC validation):
   - Valid UAN, matching occupation → pass
   - Invalid UAN → fail with "not found" error
   - Duplicate UAN (already registered) → fail with "already in use" error
   - Valid UAN, mismatched occupation → fail with "mismatch" error
   - Unrecognized occupation → fail with "not recognized" error

3. **E2E tests** (onboarding flow):
   - Upload valid certificate → validation passes, form proceeds
   - Upload invalid certificate → validation fails, form blocks, allows re-upload
   - Upload certificate with mismatched occupation → shows error, allows service category correction

---

## Success Criteria

✅ Provider cannot register without a valid e-SHRAM certificate  
✅ OCR extracts UAN and occupation reliably from card images  
✅ UAN is verified against the local registry before registration  
✅ Occupation matches the provider's selected service category  
✅ Duplicate UAN registrations are blocked (fraud prevention)  
✅ Validation feedback is immediate and specific  
✅ User experience is smooth: validation happens in-line, errors are clear  

---

## Future Enhancements

- Integrate with Government e-SHRAM API to auto-populate `uan_registry` on-demand
- Add batch UAN import from CSV for admin panel
- Analytics dashboard tracking certificate validation rates and failure modes
- Multi-language error messages based on provider's selected language
