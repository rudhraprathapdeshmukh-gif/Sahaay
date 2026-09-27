# e-SHRAM Certificate Validation System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement e-SHRAM certificate validation during provider onboarding: OCR extracts UAN/occupation from card images, server validates against UAN registry and occupation mappings, and registration is blocked until validation passes.

**Architecture:** Client-side Tesseract.js OCR in a Web Worker → Server-side RPC validation against `uan_registry` and `occupation_mappings` tables → Block form until valid.

**Tech Stack:** React, TypeScript, Supabase (PostgreSQL RPC), Tesseract.js (client-side OCR), Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-09-15-eshram-certificate-validation-design.md`

---

## Global Constraints

- Must use Tesseract.js for OCR (no server-side OCR)
- UAN must be exactly 12 digits (regex: `^\d{12}$`)
- Each UAN can only be registered once (fraud prevention via `registered_by` column)
- Validation must happen immediately on file selection, not on form submit
- Error messages must be specific and actionable

---

## File Structure

```
src/
├── lib/
│   ├── eshram.ts          (OCR + validation helpers - NEW)
│   └── providers.ts       (MODIFY - add UAN tracking)
├── pages/
│   └── ProviderOnboarding.tsx  (MODIFY - add validation UI)
│
supabase/
└── migrations/
    └── 0101_eshram_validation.sql  (NEW - tables + RPC)
```

---

## Task 1: Create Database Migration

**Files:**
- Create: `supabase/migrations/0101_eshram_validation.sql`

**Interfaces:**
- Produces: `uan_registry` table, `occupation_mappings` table, `validate_provider_certificate()` RPC, updated `register_provider()` RPC

```sql
-- ============================================================
-- 0101: e-SHRAM Certificate Validation Schema
-- ============================================================

-- Table: uan_registry - stores valid UAN records
create table if not exists public.uan_registry (
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

create index if not exists idx_uan_registry_occupation on public.uan_registry(occupation);
create index if not exists idx_uan_registry_registered_by on public.uan_registry(registered_by);

-- Table: occupation_mappings - maps occupation text to service_id
create table if not exists public.occupation_mappings (
  id                serial primary key,
  occupation_text   text not null unique,
  service_id        int not null references public.services(id),
  created_at        timestamptz default now()
);

create index if not exists idx_occupation_mappings_service on public.occupation_mappings(service_id);

-- Seed occupation mappings
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
  ('Nursing Assistant', 8)
on conflict (occupation_text) do nothing;

-- Function: validate_provider_certificate - validates UAN and occupation
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

-- Grant execute permissions
grant execute on function public.validate_provider_certificate(text, text, int) to authenticated, anon;

-- ============================================================
-- Update register_provider to accept and track UAN
-- ============================================================
create or replace function public.register_provider(
  p_user_id          uuid,
  p_email            text,
  p_full_name        text,
  p_phone            text,
  p_city             text,
  p_state            text,
  p_service_id       integer,
  p_bio              text,
  p_years_exp        text,
  p_radius_km        integer,
  p_availability     jsonb default '[]'::jsonb,
  p_skill_ids        integer[] default '{}'::integer[],
  p_latitude         decimal(10, 8) default null,
  p_longitude        decimal(11, 8) default null,
  p_certificate_url  text default null,
  p_uan              text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_row         public.users%rowtype;
  v_provider_row     public.service_providers%rowtype;
  v_skill_id         integer;
  v_provider_id      uuid;
begin
  insert into public.users (id, email, full_name, phone, city, state, role, latitude, longitude)
    values (p_user_id, p_email, p_full_name, p_phone, p_city, p_state, 'provider', p_latitude, p_longitude)
    on conflict (id) do update
      set full_name  = excluded.full_name,
          phone      = coalesce(excluded.phone, public.users.phone),
          city       = coalesce(excluded.city, public.users.city),
          state      = coalesce(excluded.state, public.users.state),
          role       = 'provider',
          latitude   = coalesce(excluded.latitude, public.users.latitude),
          longitude  = coalesce(excluded.longitude, public.users.longitude),
          updated_at = now()
    returning * into v_user_row;

  insert into public.service_providers
    (user_id, service_id, bio, years_experience, service_radius_km, availability, verification_status, is_available, latitude, longitude, certificate_url)
    values
    (p_user_id, p_service_id, p_bio, p_years_exp, p_radius_km, p_availability, 'pending', true, p_latitude, p_longitude, p_certificate_url)
    on conflict (user_id) do update
      set service_id        = excluded.service_id,
          bio               = excluded.bio,
          years_experience  = excluded.years_experience,
          service_radius_km = excluded.service_radius_km,
          availability      = excluded.availability,
          latitude          = coalesce(excluded.latitude, public.service_providers.latitude),
          longitude         = coalesce(excluded.longitude, public.service_providers.longitude),
          certificate_url   = coalesce(excluded.certificate_url, public.service_providers.certificate_url),
          updated_at        = now()
    returning * into v_provider_row;

  v_provider_id := v_provider_row.id;

  if array_length(p_skill_ids, 1) > 0 then
    delete from public.provider_skills where provider_id = v_provider_row.id;
    foreach v_skill_id in array p_skill_ids loop
      insert into public.provider_skills (provider_id, skill_id)
        values (v_provider_row.id, v_skill_id)
        on conflict do nothing;
    end loop;
  end if;

  -- Mark UAN as registered by this provider if provided
  if p_uan is not null then
    update public.uan_registry
       set registered_by = v_provider_id,
           updated_at = now()
     where uan = p_uan;
  end if;

  return jsonb_build_object(
    'user',     to_jsonb(v_user_row),
    'provider', to_jsonb(v_provider_row)
  );
end;
$$;
```

- [ ] **Step 1: Write the migration file**

```sql
-- Copy the SQL above into supabase/migrations/0101_eshram_validation.sql
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Copy and execute in Supabase Dashboard SQL Editor.

- [ ] **Step 3: Insert test UAN data**

```sql
-- Insert sample UAN for testing (use a real 12-digit number format)
insert into public.uan_registry (uan, name, father_name, dob, gender, occupation)
values 
  ('123456789012', 'Test Provider', 'Test Father', '1990-01-15', 'Male', 'Electrician'),
  ('987654321098', 'Second Provider', 'Second Father', '1985-06-20', 'Male', 'Plumber')
on conflict (uan) do nothing;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0101_eshram_validation.sql
git commit -m "feat: add e-SHRAM validation schema (uan_registry, occupation_mappings, RPC)"
```

---

## Task 2: Create eshram.ts Validation Library

**Files:**
- Create: `src/lib/eshram.ts`

**Interfaces:**
- Produces: `extractCertificateData(file: File)` function that returns `{ uan: string | null, occupation: string | null }`; `validateCertificate(uan, occupation, serviceId)` function that returns validation result

```typescript
/**
 * e-SHRAM Certificate Validation Utilities
 * Uses Tesseract.js for client-side OCR to extract UAN and occupation from card images.
 */

import { createWorker, Worker } from 'tesseract.js';
import { supabase } from './supabase';

export interface CertificateData {
  uan: string | null;
  occupation: string | null;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  uan?: string;
  name?: string;
  occupation?: string;
  dob?: string;
}

// Regex patterns for extracting data from OCR text
const UAN_PATTERN = /\b(\d{12})\b/g;
const OCCUPATION_PATTERNS = [
  /Occupation[:\s]*([A-Za-z][A-Za-z\s]+)/i,
  /Occupation\s*[-–:]\s*([A-Za-z][A-Za-z\s]+)/i,
];

let worker: Worker | null = null;

/**
 * Initialize Tesseract worker (reused across calls for performance)
 */
async function getWorker(): Promise<Worker> {
  if (!worker) {
    worker = await createWorker('eng');
  }
  return worker;
}

/**
 * Preprocess image for better OCR results
 */
function preprocessImage(imageData: ImageData): ImageData {
  // Simple grayscale conversion using canvas API
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageData;
  
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.putImageData(imageData, 0, 0);
  
  const imageDataCopy = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageDataCopy.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale using luminance formula
    const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Increase contrast by 20%
    const contrast = avg > 128 ? Math.min(255, avg * 1.2) : Math.max(0, avg * 0.8);
    data[i] = data[i + 1] = data[i + 2] = contrast;
  }
  
  ctx.putImageData(imageDataCopy, 0, 0);
  return imageDataCopy;
}

/**
 * Extract UAN and occupation from image using Tesseract OCR
 */
export async function extractCertificateData(file: File): Promise<CertificateData> {
  try {
    const worker = await getWorker();
    
    // Convert file to image for processing
    const imageBitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { uan: null, occupation: null };
    }
    
    ctx.drawImage(imageBitmap, 0, 0);
    
    // Run OCR
    const { data: { text } } = await worker.recognize(canvas);
    
    // Extract UAN (12-digit number)
    UAN_PATTERN.lastIndex = 0;
    const uanMatch = UAN_PATTERN.exec(text);
    const uan = uanMatch ? uanMatch[1] : null;
    
    // Extract occupation
    let occupation: string | null = null;
    for (const pattern of OCCUPATION_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        occupation = match[1].trim();
        break;
      }
    }
    
    // Fallback: search for common occupations in text
    if (!occupation) {
      const occupationKeywords = [
        'Electrician', 'Electrical Worker',
        'Plumber', 'Plumbing Worker',
        'Carpenter', 'Wood Worker',
        'Painter', 'House Painter',
        'Cleaner', 'Cleaning Worker',
        'Driver', 'Vehicle Driver',
        'Appliance Technician', 'Repair Technician',
        'Care Worker', 'Nursing Assistant',
      ];
      
      for (const keyword of occupationKeywords) {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
          occupation = keyword;
          break;
        }
      }
    }
    
    return { uan, occupation };
  } catch (error) {
    console.error('OCR extraction failed:', error);
    return { uan: null, occupation: null };
  }
}

/**
 * Validate certificate data against Supabase RPC
 */
export async function validateCertificate(
  uan: string,
  occupation: string,
  serviceId: number
): Promise<ValidationResult> {
  if (!uan) {
    return { valid: false, error: 'Could not extract UAN from certificate. Please ensure the image is clear.' };
  }
  
  if (!occupation) {
    return { valid: false, error: 'Could not extract occupation from certificate. Please ensure the image is clear.' };
  }
  
  try {
    const { data, error } = await supabase.rpc('validate_provider_certificate', {
      p_uan: uan,
      p_extracted_occupation: occupation,
      p_provider_service_id: serviceId,
    });
    
    if (error) {
      console.error('Validation RPC error:', error);
      return { valid: false, error: 'Unable to verify certificate. Please check your connection and try again.' };
    }
    
    return data as ValidationResult;
  } catch (error) {
    console.error('Validation error:', error);
    return { valid: false, error: 'Unable to verify certificate. Please check your connection and try again.' };
  }
}

/**
 * Terminate OCR worker (cleanup)
 */
export async function terminateOcrWorker(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}
```

- [ ] **Step 1: Create eshram.ts with OCR utilities**

```typescript
// Copy the code above into src/lib/eshram.ts
```

- [ ] **Step 2: Install tesseract.js**

```bash
npm install tesseract.js
```

- [ ] **Step 3: Run build to verify**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/lib/eshram.ts package.json package-lock.json
git commit -m "feat: add e-SHRAM OCR validation library with Tesseract.js"
```

---

## Task 3: Update ProviderOnboarding.tsx with Validation UI

**Files:**
- Modify: `src/pages/ProviderOnboarding.tsx`

**Interfaces:**
- Consumes: `extractCertificateData`, `validateCertificate` from `eshram.ts`
- Produces: Validation status UI with badge and error messages; form submission blocked until valid

**Current imports to add:**
```typescript
import { extractCertificateData, validateCertificate, CertificateData, ValidationResult } from '@/lib/eshram';
```

**New state to add:**
```typescript
const [certData, setCertData] = useState<CertificateData | null>(null);
const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
const [certValidationLoading, setCertValidationLoading] = useState(false);
const [ocrLoading, setOcrLoading] = useState(false);
```

**New handlers to add:**
```typescript
const handleCertificateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // Reset previous validation
  setCertData(null);
  setValidationResult(null);
  setOcrLoading(true);
  
  // Extract data from certificate
  const data = await extractCertificateData(file);
  setCertData(data);
  setOcrLoading(false);
  
  if (!data.uan || !data.occupation) {
    setValidationResult({
      valid: false,
      error: 'Could not read certificate. Please upload a clearer image of your e-SHRAM card.',
    });
    return;
  }
  
  // Validate with server
  setCertValidationLoading(true);
  const result = await validateCertificate(data.uan, data.occupation, formData.service_id);
  setValidationResult(result);
  setCertValidationLoading(false);
};

const isFormValid = () => {
  // Original validation logic plus certificate must be valid
  return validationResult?.valid === true;
};
```

**UI changes to certificate upload section:**
```tsx
{/* Certificate Upload */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    e-SHRAM Card Certificate *
  </label>
  <input
    type="file"
    accept="image/*"
    onChange={handleCertificateChange}
    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
  />
  
  {/* OCR Loading */}
  {ocrLoading && (
    <p className="text-sm text-gray-500 mt-1 flex items-center">
      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Scanning certificate...
    </p>
  )}
  
  {/* Validation Status */}
  {validationResult && (
    <div className={`mt-2 p-3 rounded-md ${validationResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
      {validationResult.valid ? (
        <div className="flex items-center">
          <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-green-700 font-medium">Certificate verified ✓</span>
        </div>
      ) : (
        <div className="flex items-start">
          <svg className="h-5 w-5 text-red-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-red-700">{validationResult.error}</span>
        </div>
      )}
    </div>
  )}
</div>
```

**Update "Next" button to check validation:**
```tsx
<button
  type="submit"
  disabled={!isFormValid() || loading}
  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
    isFormValid() && !loading
      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
  }`}
>
  {loading ? 'Registering...' : 'Next'}
</button>
```

- [ ] **Step 1: Read current ProviderOnboarding.tsx to understand structure**

```bash
head -100 src/pages/ProviderOnboarding.tsx
```

- [ ] **Step 2: Add imports for eshram utilities**

Add at top of file:
```typescript
import { extractCertificateData, validateCertificate, CertificateData, ValidationResult } from '@/lib/eshram';
```

- [ ] **Step 3: Add state for certificate validation**

Find existing `useState` declarations and add:
```typescript
const [certData, setCertData] = useState<CertificateData | null>(null);
const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
const [certValidationLoading, setCertValidationLoading] = useState(false);
const [ocrLoading, setOcrLoading] = useState(false);
```

- [ ] **Step 4: Add certificate change handler**

Add before the `handleSubmit` function:
```typescript
const handleCertificateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  setCertData(null);
  setValidationResult(null);
  setOcrLoading(true);
  
  const data = await extractCertificateData(file);
  setCertData(data);
  setOcrLoading(false);
  
  if (!data.uan || !data.occupation) {
    setValidationResult({
      valid: false,
      error: 'Could not read certificate. Please upload a clearer image of your e-SHRAM card.',
    });
    return;
  }
  
  setCertValidationLoading(true);
  const result = await validateCertificate(data.uan, data.occupation, formData.service_id);
  setValidationResult(result);
  setCertValidationLoading(false);
};
```

- [ ] **Step 5: Update form validation to include certificate**

Find where form validation is checked and update to include certificate validity:
```typescript
const isFormValid = () => {
  // Existing checks...
  // Add:
  return validationResult?.valid === true;
};
```

- [ ] **Step 6: Update certificate file input to use handler**

Change file input `onChange` from direct handler to:
```typescript
onChange={handleCertificateChange}
```

- [ ] **Step 7: Add validation status UI**

Add after the file input with the validation badge/error display code.

- [ ] **Step 8: Update Next button to be disabled when certificate invalid**

Update button's `disabled` attribute and classes.

- [ ] **Step 9: Run build to verify**

```bash
npm run build
```

- [ ] **Step 10: Commit**

```bash
git add src/pages/ProviderOnboarding.tsx
git commit -m "feat: add e-SHRAM certificate validation UI in provider onboarding"
```

---

## Task 4: Update registerProvider to Track UAN

**Files:**
- Modify: `src/lib/providers.ts`

**Interfaces:**
- Consumes: `p_uan` parameter in registerProvider call
- Produces: UAN marked as registered in database after successful registration

**Change to registerProvider function:**
Add `uan?: string` to payload type and pass to RPC:
```typescript
export const registerProvider = async (payload: {
  // ... existing fields ...
  uan?: string | null
}): Promise<{ user: User; provider: ServiceProvider }> => {
  // In the RPC call, add:
  p_uan: payload.uan ?? null,
  // ... rest of RPC parameters
```

- [ ] **Step 1: Add uan to registerProvider payload type**

```typescript
export const registerProvider = async (payload: {
  // ... existing fields ...
  uan?: string | null
}): Promise<{ user: User; provider: ServiceProvider }> => {
```

- [ ] **Step 2: Pass uan to RPC call**

In the `supabase.rpc('register_provider', {...})` call, add:
```typescript
p_uan: payload.uan ?? null,
```

- [ ] **Step 3: Update ProviderOnboarding.tsx to pass uan**

After validation passes, when calling `registerProvider`, pass the validated UAN:
```typescript
await registerProvider({
  // ... existing fields ...
  uan: certData?.uan ?? null,
});
```

- [ ] **Step 4: Run build to verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/providers.ts src/pages/ProviderOnboarding.tsx
git commit -m "feat: pass validated UAN to registerProvider for tracking"
```

---

## Task 5: Integration Test

**Files:**
- Test: `src/lib/__tests__/eshram.test.ts` (NEW)

**Test cases:**
```typescript
import { extractCertificateData } from '@/lib/eshram';

// Mock Tesseract
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn().mockResolvedValue({
    recognize: jest.fn().mockResolvedValue({
      data: { text: 'Sample OCR text' },
    }),
    terminate: jest.fn().mockResolvedValue(undefined),
  }),
}));
```

**Manual test steps:**
1. Run `npm run dev`
2. Navigate to provider onboarding step 2
3. Upload an e-SHRAM card image
4. Verify OCR runs and shows "Scanning certificate..."
5. If valid: verify green badge appears and Next button enables
6. If invalid: verify error message appears and Next button stays disabled
7. Try uploading a different image and verify validation resets

- [ ] **Step 1: Write unit tests for eshram.ts**

```typescript
// Create src/lib/__tests__/eshram.test.ts with tests for:
// - UAN regex matching
// - Occupation extraction patterns
// - Error handling for invalid inputs
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

- [ ] **Step 3: Manual integration test**

Follow manual test steps above.

- [ ] **Step 4: Commit tests**

```bash
git add src/lib/__tests__/eshram.test.ts
git commit -m "test: add unit tests for e-SHRAM validation"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| Tesseract.js OCR extraction | Task 2 |
| UAN 12-digit validation | Task 1 (DB constraint), Task 2 (regex) |
| Occupation mapping to service_id | Task 1 (occupation_mappings table) |
| Fraud prevention (registered_by) | Task 1 (DB schema + RPC) |
| Client-side validation RPC | Task 1 (validate_provider_certificate) |
| Form blocking until valid | Task 3 (UI update) |
| Error messages per spec | Task 2 + Task 3 |
| UAN tracking in registration | Task 4 |

All spec requirements covered.

---

## Plan Complete

**Plan saved to:** `docs/superpowers/plans/2026-09-15-eshram-certificate-validation-implementation.md`

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**