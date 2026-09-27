/**
 * Pricing Structure for Sahaay
 *
 * This file defines the pricing skeleton for all service categories.
 * Individual services will be added later with specific pricing.
 */

/**
 * Pricing units used across Sahaay categories and subcategories
 */
export type PricingUnit = 'per_visit' | 'per_hour' | 'per_day' | 'per_km' | 'per_sqft'

/**
 * Duration-based pricing option (e.g., 1 Hour, 1.5 Hours, 3 Hours)
 */
export interface DurationPricing {
  durationHours: number
  customerPrice: number // in INR
  providerEarning: number // in INR
  platformFee: number // in INR
}

/**
 * A subcategory inside a service category (e.g. "Switch & Socket" under Electrician).
 * Individual services will be added under these later.
 */
export interface CategorySubcategory {
  name: string
  slug: string
  description?: string
  startingPrice?: number // in INR, optional placeholder; inherits the category price by default
  pricingUnit?: PricingUnit // optional; inherits the category unit by default
  durationHours?: number // for time-based services
  workScope?: string // what can be completed in this duration
  householdSize?: string // typical household this applies to
  durationOptions?: DurationPricing[] // for care services with multiple duration/pricing tiers
}

export interface CategoryPricing {
  categoryName: string
  slug: string
  description: string
  startingPrice: number // in INR
  pricingUnit: PricingUnit
  platformFeePercentage: number // Sahaay's commission (e.g., 15 means 15%)
  providerEarningPercentage: number // Provider's share (e.g., 85 means 85%)
  icon?: string
  subcategories?: CategorySubcategory[]
}

/**
 * Calculate breakdown for a given booking amount
 */
export function calculatePricingBreakdown(amount: number, categorySlug: string) {
  const category = CATEGORY_PRICING.find(c => c.slug === categorySlug)
  if (!category) {
    throw new Error(`Category ${categorySlug} not found`)
  }

  const platformFee = Math.round((amount * category.platformFeePercentage) / 100)
  const providerEarning = amount - platformFee

  return {
    totalAmount: amount,
    platformFee,
    providerEarning,
    platformFeePercentage: category.platformFeePercentage,
    providerEarningPercentage: category.providerEarningPercentage,
  }
}

/**
 * Get pricing for a specific category
 */
export function getCategoryPricing(slug: string): CategoryPricing | undefined {
  return CATEGORY_PRICING.find(c => c.slug === slug)
}

/**
 * Get subcategories for a specific category (empty array when none exist)
 */
export function getSubcategories(slug: string): CategorySubcategory[] {
  return CATEGORY_PRICING.find(c => c.slug === slug)?.subcategories ?? []
}

/**
 * Pricing skeleton for all 8 service categories
 *
 * Note: These are placeholder starting prices. Individual services
 * within each category will have their own specific pricing.
 */
export const CATEGORY_PRICING: CategoryPricing[] = [
  {
    categoryName: 'Electrician',
    slug: 'electrician',
    description: 'Fan Repair, Switch & Socket Repair, Light Installation, Wiring Repair',
    startingPrice: 199,
    pricingUnit: 'per_visit',
    platformFeePercentage: 15,
    providerEarningPercentage: 85,
    icon: '⚡',
    subcategories: [
      { name: 'Switch & Socket', slug: 'switch-socket', description: 'Switch Repair, Socket Replacement, Modular Switches' },
      { name: 'Fan', slug: 'fan', description: 'Ceiling Fan, Table Fan, Exhaust Fan' },
      { name: 'Light', slug: 'light', description: 'Light Installation, LED Fitting, Tube Light' },
      { name: 'Wiring', slug: 'wiring', description: 'Wiring Repair, New Wiring, Short Circuit' },
      { name: 'MCB & Fuse', slug: 'mcb-fuse', description: 'MCB Replacement, Fuse Repair, Distribution Board' },
      { name: 'Inverter', slug: 'inverter', description: 'Inverter Repair, Battery Service, Installation' },
      { name: 'Doorbell', slug: 'doorbell', description: 'Doorbell Repair, Wireless Doorbell' },
      { name: 'Security & Electrical Devices', slug: 'security-electrical-devices', description: 'CCTV, Motion Sensors, Safety Devices' },
      { name: 'Festive Lighting', slug: 'festive-lighting', description: 'Decorative Lighting, Festival Setup' },
    ],
  },
  {
    categoryName: 'Plumber',
    slug: 'plumber',
    description: 'Tap Repair, Pipe Leakage, Drain Blockage, Bathroom Plumbing',
    startingPrice: 199,
    pricingUnit: 'per_visit',
    platformFeePercentage: 15,
    providerEarningPercentage: 85,
    icon: '🔧',
    subcategories: [
      { name: 'Tap & Faucet', slug: 'tap-faucet', description: 'Tap Repair, Faucet Replacement, Mixer Repair' },
      { name: 'Sink', slug: 'sink', description: 'Sink Repair, Sink Installation, Leaking Sink' },
      { name: 'Wash Basin', slug: 'wash-basin', description: 'Wash Basin Installation, Basin Tap Repair' },
      { name: 'Toilet', slug: 'toilet', description: 'Toilet Repair, Toilet Installation, Commode Fitting' },
      { name: 'Flush Tank', slug: 'flush-tank', description: 'Flush Tank Repair, Flush Valve Replacement' },
      { name: 'Pipe & Leakage', slug: 'pipe-leakage', description: 'Pipe Leakage, Pipe Repair, Pipe Replacement' },
      { name: 'Water Tank', slug: 'water-tank', description: 'Water Tank Cleaning, Tank Fitting, Overflow Fix' },
      { name: 'Drainage', slug: 'drainage', description: 'Drain Blockage, Drain Cleaning, Sewerage' },
      { name: 'Bathroom Plumbing', slug: 'bathroom-plumbing', description: 'Bathroom Fittings, Shower, Geyser Installation' },
      { name: 'Kitchen Plumbing', slug: 'kitchen-plumbing', description: 'Kitchen Sink, Pipeline, Water Purifier Installation' },
    ],
  },
  {
    categoryName: 'Carpenter',
    slug: 'carpenter',
    description: 'Door Repair, Furniture Repair, Lock Repair, Shelf Installation',
    startingPrice: 249,
    pricingUnit: 'per_visit',
    platformFeePercentage: 15,
    providerEarningPercentage: 85,
    icon: '🪚',
    subcategories: [
      { name: 'Door', slug: 'door', description: 'Door Repair, Door Fitting, Lock Repair' },
      { name: 'Furniture', slug: 'furniture', description: 'Furniture Repair, Furniture Assembly' },
      { name: 'Cabinet', slug: 'cabinet', description: 'Cabinet Repair, Cabinet Installation' },
      { name: 'Shelf', slug: 'shelf', description: 'Shelf Installation, Shelf Repair' },
      { name: 'Bed', slug: 'bed', description: 'Bed Repair, Bed Assembly' },
      { name: 'Table & Chair', slug: 'table-chair', description: 'Table Repair, Chair Repair, Assembly' },
      { name: 'Curtain & Rod', slug: 'curtain-rod', description: 'Curtain Rod Installation, Curtain Fitting' },
      { name: 'Wood Repair', slug: 'wood-repair', description: 'Wood Rot Repair, Timber Fixing' },
      { name: 'Modular Furniture', slug: 'modular-furniture', description: 'Modular Kitchen, Modular Wardrobe' },
      { name: 'General Carpentry', slug: 'general-carpentry', description: 'General Woodwork, Odd Jobs' },
    ],
  },
  {
    categoryName: 'Painter',
    slug: 'painter',
    description: 'Wall Painting, Room Painting, Touch-up, Exterior Painting',
    startingPrice: 299,
    pricingUnit: 'per_sqft',
    platformFeePercentage: 12,
    providerEarningPercentage: 88,
    icon: '🎨',
    subcategories: [
      { name: 'Interior Painting', slug: 'interior-painting', description: 'Interior Wall Painting, Interior Work' },
      { name: 'Exterior Painting', slug: 'exterior-painting', description: 'Exterior Wall Painting, Facade Painting' },
      { name: 'Room Painting', slug: 'room-painting', description: 'Full Room Painting, Bedroom, Living Room' },
      { name: 'Wall Painting', slug: 'wall-painting', description: 'Single Wall Painting, Accent Wall' },
      { name: 'Ceiling Painting', slug: 'ceiling-painting', description: 'Ceiling Painting, Pop Work' },
      { name: 'Door & Window Painting', slug: 'door-window-painting', description: 'Door Painting, Window Frames' },
      { name: 'Repainting', slug: 'repainting', description: 'Repaint Existing Walls, Color Change' },
      { name: 'Touch-Up Painting', slug: 'touch-up-painting', description: 'Touch-Up, Minor Repairs' },
      { name: 'Putty & Primer', slug: 'putty-primer', description: 'Putty Application, Primer Coating' },
    ],
  },
  {
    categoryName: 'Driver',
    slug: 'driver',
    description: 'Local Driver, Outstation Driver, Full-Day Driver',
    startingPrice: 500,
    pricingUnit: 'per_day',
    platformFeePercentage: 10,
    providerEarningPercentage: 90,
    icon: '🚗',
    subcategories: [
      { name: 'Hourly Driver', slug: 'hourly-driver', description: 'Hourly Chauffeur, Point to Point' },
      { name: 'Half-Day Driver', slug: 'half-day-driver', description: 'Half-Day Chauffeur, Local Errands' },
      { name: 'Full-Day Driver', slug: 'full-day-driver', description: 'Full-Day Chauffeur, Whole Day Driving' },
      { name: 'Outstation Driver', slug: 'outstation-driver', description: 'Outstation Trips, Long Distance' },
      { name: 'Airport Travel', slug: 'airport-travel', description: 'Airport Pickup, Airport Drop' },
      { name: 'Event Driver', slug: 'event-driver', description: 'Wedding, Event Transportation' },
      { name: 'Personal Driver', slug: 'personal-driver', description: 'Personal Chauffeur, Regular Driving' },
    ],
  },
  {
    categoryName: 'Cleaner',
    slug: 'cleaner',
    description: 'Home Cleaning, Bathroom Cleaning, Kitchen Cleaning, Deep Cleaning',
    startingPrice: 299,
    pricingUnit: 'per_visit',
    platformFeePercentage: 15,
    providerEarningPercentage: 85,
    icon: '🧹',
    subcategories: [
      {
        name: '1 Hour',
        slug: '1-hour',
        description: 'Quick cleaning and household help',
        startingPrice: 120,
        pricingUnit: 'per_visit',
        durationHours: 1,
        workScope: 'Kitchen cleaning, dishes, basic sweeping, dusting surfaces',
        householdSize: '4-member household: 40-45 min active work + 15-20 min setup/wrap-up',
      },
      {
        name: '1.5 Hours',
        slug: '1-5-hours',
        description: 'Regular maid service with more coverage',
        startingPrice: 180,
        pricingUnit: 'per_visit',
        durationHours: 1.5,
        workScope: 'Kitchen cleaning, dishes, mopping, laundry start, bathroom touch-up, general tidying',
        householdSize: '4-member household: 1 hour active work + 30 min multi-task setup',
      },
      {
        name: '2 Hours',
        slug: '2-hours',
        description: 'Comprehensive household cleaning and assistance',
        startingPrice: 240,
        pricingUnit: 'per_visit',
        durationHours: 2,
        workScope: 'Full kitchen cleaning, dishes, mopping all areas, laundry (wash + dry), bathroom deep-clean, change bed linens, dusting all surfaces',
        householdSize: '4-member household: 1.5 hours active work + 30 min buffer for laundry management',
      },
    ],
  },
  {
    categoryName: 'Caregiver',
    slug: 'caregiver',
    description: 'Elder Care, Patient Care, Daily Assistance',
    startingPrice: 400,
    pricingUnit: 'per_day',
    platformFeePercentage: 12,
    providerEarningPercentage: 88,
    icon: '❤️',
    subcategories: [
      {
        name: 'Elderly Assistance',
        slug: 'elderly-assistance',
        description: 'Daily assistance for seniors, medication reminders, mobility support',
        durationOptions: [
          { durationHours: 1, customerPrice: 200, providerEarning: 176, platformFee: 24 },
          { durationHours: 1.5, customerPrice: 300, providerEarning: 264, platformFee: 36 },
          { durationHours: 3, customerPrice: 550, providerEarning: 484, platformFee: 66 },
        ],
      },
      {
        name: 'Patient Care',
        slug: 'patient-care',
        description: 'Post-surgery care, medical assistance, health monitoring',
        durationOptions: [
          { durationHours: 1, customerPrice: 250, providerEarning: 220, platformFee: 30 },
          { durationHours: 1.5, customerPrice: 375, providerEarning: 330, platformFee: 45 },
          { durationHours: 3, customerPrice: 700, providerEarning: 616, platformFee: 84 },
        ],
      },
      {
        name: 'Child Care',
        slug: 'child-care',
        description: 'Child supervision, feeding assistance, activity support',
        durationOptions: [
          { durationHours: 1, customerPrice: 180, providerEarning: 158, platformFee: 22 },
          { durationHours: 1.5, customerPrice: 270, providerEarning: 238, platformFee: 32 },
          { durationHours: 3, customerPrice: 500, providerEarning: 440, platformFee: 60 },
        ],
      },
      {
        name: 'Companion Care',
        slug: 'companion-care',
        description: 'Companionship, emotional support, social engagement',
        durationOptions: [
          { durationHours: 1, customerPrice: 150, providerEarning: 132, platformFee: 18 },
          { durationHours: 1.5, customerPrice: 225, providerEarning: 198, platformFee: 27 },
          { durationHours: 3, customerPrice: 420, providerEarning: 370, platformFee: 50 },
        ],
      },
      {
        name: 'Mobility Assistance',
        slug: 'mobility-assistance',
        description: 'Transfer assistance, wheelchair support, walking help',
        durationOptions: [
          { durationHours: 1, customerPrice: 220, providerEarning: 194, platformFee: 26 },
          { durationHours: 1.5, customerPrice: 330, providerEarning: 290, platformFee: 40 },
          { durationHours: 3, customerPrice: 600, providerEarning: 528, platformFee: 72 },
        ],
      },
      {
        name: 'Post-Hospital Care',
        slug: 'post-hospital-care',
        description: 'Recovery support, medication management, wound care assistance',
        durationOptions: [
          { durationHours: 1, customerPrice: 280, providerEarning: 246, platformFee: 34 },
          { durationHours: 1.5, customerPrice: 420, providerEarning: 370, platformFee: 50 },
          { durationHours: 3, customerPrice: 800, providerEarning: 704, platformFee: 96 },
        ],
      },
    ],
  },
  {
    categoryName: 'Technician',
    slug: 'technician',
    description: 'AC Repair, Refrigerator Repair, Washing Machine Repair, TV Repair',
    startingPrice: 299,
    pricingUnit: 'per_visit',
    platformFeePercentage: 15,
    providerEarningPercentage: 85,
    icon: '🔨',
    subcategories: [
      { name: 'AC', slug: 'ac', description: 'AC Repair, AC Service, AC Installation' },
      { name: 'Refrigerator', slug: 'refrigerator', description: 'Fridge Repair, Cooling Issues, Gas Refill' },
      { name: 'Washing Machine', slug: 'washing-machine', description: 'Washing Machine Repair, Spin Issues' },
      { name: 'Microwave', slug: 'microwave', description: 'Microwave Repair, Heating Issues' },
      { name: 'Water Purifier', slug: 'water-purifier', description: 'RO Repair, Filter Change, Service' },
      { name: 'Geyser', slug: 'geyser', description: 'Geyser Repair, Water Heater Service' },
      { name: 'Chimney', slug: 'chimney', description: 'Chimney Repair, Cleaning, Service' },
    ],
  },
]

/**
 * Pricing units display text
 */
export const PRICING_UNIT_LABELS: Record<PricingUnit, string> = {
  per_visit: 'Per Visit',
  per_hour: 'Per Hour',
  per_day: 'Per Day',
  per_km: 'Per Km',
  per_sqft: 'Per Sq.Ft',
}

/**
 * Get display text for pricing unit
 */
export function getPricingUnitLabel(unit: PricingUnit): string {
  return PRICING_UNIT_LABELS[unit] || unit
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, unit?: PricingUnit): string {
  const formattedAmount = `₹${amount.toLocaleString('en-IN')}`
  if (unit) {
    return `${formattedAmount} ${getPricingUnitLabel(unit)}`
  }
  return formattedAmount
}
