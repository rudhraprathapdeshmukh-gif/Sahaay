**# Sahaay Project Context**



**## What is Sahaay?**

**Sahaay is a service marketplace that connects customers with nearby workers such as electricians, plumbers, carpenters, painters, cleaners, drivers, gardeners, caregivers and other service providers.**



**Customers should be able to find trusted workers within a selected radius and book their services.**



**## Tech Stack**

**- React**

**- Vite**

**- Supabase**

**- Responsive web application**

**- Currently developing in Antigravity**



**## User Roles**



**### Customer**

**- Search services**

**- Select location**

**- Select radius**

**- Find nearby providers**

**- View provider profiles**

**- Book services**

**- View bookings**

**- Rate providers**



**### Service Provider**

**- Register**

**- Create profile**

**- Add skills/services**

**- Add experience**

**- Set availability**

**- Set service radius**

**- Receive booking requests**

**- Manage bookings**

**- View earnings**

**- Receive ratings**



**### Admin**

**- Manage customers**

**- Manage service providers**

**- Verify providers**

**- Manage services/categories**

**- Manage bookings**

**- View reports**



**## Completed So Far**

**- Sahaay homepage**

**- Sahaay branding and UI theme**

**- Customer / Service Provider / Admin authentication UI**

**- Separate role-based dashboards**

**- Customer service discovery UI**

**- Service Provider dashboard**

**- Admin dashboard**

**- Supabase project setup**

**- Supabase database migration**

**- Supabase environment variables**

**- Real Service Provider registration with Supabase (profile, category, skills, experience, location, radius, availability, persistence, and profile preview)**

**- Service Provider profile page (/provider/profile) connected to Supabase (profile photo, name, category, skills, experience, location, service radius, availability, verification status, and live updates)**



**## Supabase**

**Environment variables:**

**VITE\_SUPABASE\_URL**

**VITE\_SUPABASE\_ANON_KEY**



**The Supabase Publishable key is being used for the frontend key.**



**Database currently includes/plans:**

**- users**

**- service\_providers**

**- services**

**- skills**

**- bookings**



**Migration:**

**supabase/migrations/0001\_init.sql**



**## Design**

**Sahaay should look like a real professional local-service platform.**



**Preferred:**

**- Green/teal primary theme**

**- Warm orange accent**

**- Clean backgrounds**

**- Modern typography**

**- Good spacing**

**- Responsive design**

**- Professional cards and buttons**



**Avoid:**

**- Generic AI-looking UI**

**- Excessive gradients**

**- Excessive rounded cards**

**- Glassmorphism**

**- Huge unnecessary icons**

**- Excessive animations**



**## Development Rule**

**Build ONE feature at a time.**



**Before changing anything:**

**1. Inspect the existing code.**

**2. Reuse existing components.**

**3. Do not rebuild working features.**

**4. Keep the existing design consistent.**

**5. Test the feature.**

**6. Fix errors before stopping.**



**Do not add unnecessary libraries.**



**## Current Next Step**

**STEP 11 — REAL SERVICE PROVIDER REGISTRATION (COMPLETED)**

**- Connected provider onboarding form to Supabase.**
**- Added dynamic category skills selection and custom skills.**
**- Supported name, phone, category, skills, experience, location, availability, and service radius.**
**- Implemented robust error handling, validation, and loading states.**
**- Integrated profile preview loading real saved data from Supabase.**
**- Created consolidated migration script in supabase/migrations/0002_provider_registration_setup.sql.**



**STEP 12 — SERVICE PROVIDER PROFILE (COMPLETED)**

**- Built dedicated Service Provider profile page under /provider/profile.**
**- Integrated profile photo with preview/upload URL and sample avatar picker.**
**- Connected name, phone, city, state, and bio to Supabase.**
**- Added category selector and interactive skills management (category skills + custom tags).**
**- Supported experience selection, service radius slider, and working availability time slots.**
**- Displayed real verification status badge with trust checklist.**
**- Implemented live update and saving to Supabase with instant feedback.**



**STEP 13 — NEARBY PROVIDER DISCOVERY & FILTERING**

**Connect the customer service discovery page to real Supabase provider data.**

**Features:**
**- Fetch and display real registered providers from Supabase**
**- Filter providers by service category, location/city, radius, and availability**
**- Provider profile card showing rating, experience, skills, and verified status**
**- Handle empty states, search/filter criteria, and loading states**




**## Important**

**Read this file before continuing development.**



**Continue from the current project state.**

**Do not start the project again.**

**Do not redesign existing pages unless requested.**

**Work one feature at a time.**

