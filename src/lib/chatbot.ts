/**
 * Sahaay Platform Chatbot
 * Rule-based chatbot trained on platform FAQs, services, and common questions
 */

interface ChatResponse {
  message: string
  quickReplies?: string[]
}

// Simple pattern matching function
function matchPattern(input: string, keywords: string[]): boolean {
  const lowerInput = input.toLowerCase().trim()
  return keywords.some(keyword => lowerInput.includes(keyword.toLowerCase()))
}

// Keyword-based response patterns - ordered by specificity
const PATTERNS: Array<{
  keywords: string[]
  response: ChatResponse
}> = [
  // Greetings
  {
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'greetings', 'howdy', 'helo'],
    response: {
      message: 'Hello! 👋 Welcome to Sahaay. I can help you with:\n\n• Booking a service\n• Service pricing\n• How it works\n• Provider information\n• Support & help\n\nWhat would you like to know?',
      quickReplies: ['Book a service', 'Pricing', 'How it works'],
    },
  },
  // Services - specific
  {
    keywords: ['book electrician', 'need electrician', 'electrician', 'electrical', 'fan repair', 'switch repair', 'wiring', 'light fitting'],
    response: {
      message: '⚡ Electrician Service\n\nStarting at ₹199\n\nWe handle:\n• Fan repair (ceiling, table, exhaust)\n• Switch & socket repair\n• Light installation (LED, tube)\n• Wiring & MCB/fuse\n• Inverter repair\n• Doorbell\n\nReady to book?',
      quickReplies: ['Book now', 'See pricing', 'More info'],
    },
  },
  {
    keywords: ['book plumber', 'need plumber', 'plumber', 'plumbing', 'tap repair', 'pipe leak', 'drain blocked', 'toilet'],
    response: {
      message: '🔧 Plumber Service\n\nStarting at ₹199\n\nWe handle:\n• Tap & faucet repair\n• Pipe leakage\n• Drain blockage\n• Toilet repair\n• Flush tank\n• Bathroom/kitchen plumbing\n\nNeed a plumber?',
      quickReplies: ['Book now', 'Emergency', 'Pricing'],
    },
  },
  {
    keywords: ['book carpenter', 'need carpenter', 'carpenter', 'carpentry', 'door repair', 'furniture', 'cabinet', 'shelf'],
    response: {
      message: '🪚 Carpenter Service\n\nStarting at ₹249\n\nWe handle:\n• Door repair & fitting\n• Furniture repair & assembly\n• Cabinet installation\n• Shelf installation\n• Bed & table repair\n• Lock repair\n\nLet me book a carpenter!',
      quickReplies: ['Book now', 'Furniture repair', 'Pricing'],
    },
  },
  {
    keywords: ['book painter', 'need painter', 'painter', 'painting', 'wall paint', 'room paint', 'exterior', 'interior'],
    response: {
      message: '🎨 Painter Service\n\nStarting at ₹299 (per sq.ft)\n\nWe handle:\n• Wall painting\n• Room painting (bedroom, living)\n• Interior & exterior\n• Touch-up & repairs\n• Ceiling painting\n• Door & window frames\n\nGet a quote today!',
      quickReplies: ['Book now', 'Interior', 'How much?'],
    },
  },
  {
    keywords: ['book driver', 'need driver', 'driver', 'chauffeur', 'drive', 'outstation', 'airport'],
    response: {
      message: '🚗 Driver Service\n\nStarting at ₹500\n\nWe provide:\n• Hourly driver (point-to-point)\n• Half-day / Full-day driver\n• Outstation trips\n• Airport pickup/drop\n• Event driver\n• Personal driver\n\nWhen do you need a driver?',
      quickReplies: ['Book now', 'Airport transfer', 'Outstation'],
    },
  },
  {
    keywords: ['book cleaner', 'need cleaner', 'cleaner', 'cleaning', 'maid', 'house cleaning', 'bathroom cleaning'],
    response: {
      message: '🧹 Cleaning Service\n\n₹120-240 per visit\n\nOptions:\n• 1 Hour - Quick cleaning (₹120)\n• 1.5 Hours - Regular (₹180)\n• 2 Hours - Comprehensive (₹240)\n\nIncludes: Kitchen, dishes, mopping, bathroom, dusting\n\nWhich duration?',
      quickReplies: ['Book 1 hour', 'Book 2 hours', 'Deep cleaning'],
    },
  },
  {
    keywords: ['book caregiver', 'need caregiver', 'caregiver', 'care taker', 'elder care', 'patient care', 'nurse'],
    response: {
      message: '❤️ Caregiver Service\n\n₹150-800 (time-based)\n\nTypes:\n• Elderly assistance\n• Patient care (post-surgery)\n• Child care\n• Companion care\n• Mobility assistance\n• Post-hospital care\n\nWhat type of care needed?',
      quickReplies: ['Elder care', 'Patient care', 'Child care'],
    },
  },
  {
    keywords: ['book technician', 'need technician', 'technician', 'ac repair', 'fridge repair', 'washing machine', 'microwave', 'geyser'],
    response: {
      message: '🔨 Technician Service\n\nStarting at ₹299\n\nWe repair:\n• AC (split, window)\n• Refrigerator\n• Washing machine\n• Microwave\n• Water purifier (RO)\n• Geyser\n• Chimney\n\nWhat needs repair?',
      quickReplies: ['AC repair', 'Fridge repair', 'Book now'],
    },
  },
  // Generic services
  {
    keywords: ['what service', 'what do you offer', 'available services', 'service list', 'categories'],
    response: {
      message: 'Sahaay offers 8 service categories:\n\n⚡ Electrician (₹199+)\n🔧 Plumber (₹199+)\n🪚 Carpenter (₹249+)\n🎨 Painter (₹299+)\n🚗 Driver (₹500+)\n🧹 Cleaner (₹120-240)\n❤️ Caregiver (₹150-800)\n🔨 Technician (₹299+)\n\nWhich service do you need?',
      quickReplies: ['Electrician', 'Plumber', 'Cleaner', 'All services'],
    },
  },
  // How it works
  {
    keywords: ['how it work', 'how to use', 'how do i book', 'steps', 'process', 'guide'],
    response: {
      message: 'How to book on Sahaay:\n\n1️⃣ Select service category\n2️⃣ Choose problem type\n3️⃣ Pick date & time (within 7 days)\n4️⃣ Select payment (Pay Now or Pay Later)\n5️⃣ Location auto-detected\n6️⃣ Provider within 10km accepts\n7️⃣ Service done, pay securely\n\nSimple as that! ✅',
      quickReplies: ['Book now', 'More details', 'Pricing'],
    },
  },
  // Booking
  {
    keywords: ['book', 'request', 'order', 'schedule', 'hire', 'need a', 'want to'],
    response: {
      message: 'To book a service:\n\n1. Go to "Request Service" in your dashboard\n2. Select your service category\n3. Choose problem type\n4. Select date and time\n5. Choose payment method\n6. Location auto-detected\n\nWould you like me to help you book?',
      quickReplies: ['Book Electrician', 'Book Plumber', 'All services'],
    },
  },
  // Cancel
  {
    keywords: ['cancel', 'cancellation', 'abort'],
    response: {
      message: 'Cancel a booking:\n\n1. Go to Bookings\n2. Select the booking\n3. Tap Cancel\n\nNote: Refunds in 5-7 days. Cannot cancel once service starts.',
      quickReplies: ['Reschedule', 'Contact support', 'View bookings'],
    },
  },
  // Payment
  {
    keywords: ['payment', 'pay', 'price', 'cost', 'charge', 'fee', 'rupees', '₹', 'rate', 'how much'],
    response: {
      message: 'Payment Info:\n\n💳 Methods: UPI, Cards, Net Banking, Wallets, Cash\n\n💰 Timing: Pay Now (upfront) or Pay Later (after service)\n\n💵 Starting Prices:\n• Electrician/Plumber: ₹199+\n• Carpenter: ₹249+\n• Painter: ₹299+\n• Driver: ₹500+\n• Cleaner: ₹120-240\n• Caregiver: ₹150-800\n• Technician: ₹299+\n\nPlatform fee: 10-15%',
      quickReplies: ['Book now', 'Refund policy', 'Pay later'],
    },
  },
  // Refund
  {
    keywords: ['refund', 'money back', 'reimbursement'],
    response: {
      message: 'Refund Policy:\n\n• Refunds processed in 5-7 business days\n• Only for cancelled bookings or disputes\n• Contact support@sahaay.app for issues\n\nWe\'re happy to help!',
      quickReplies: ['Contact support', 'Report issue'],
    },
  },
  // Provider - become
  {
    keywords: ['become provider', 'provider signup', 'work as provider', 'join as provider', 'apply', 'hire me', 'offer service'],
    response: {
      message: 'Become a Sahaay Provider:\n\n1. Sign up → Join as Provider\n2. Complete profile (skills, service radius)\n3. Submit documents (ID, address proof)\n4. Verification (2-3 days)\n5. Start earning!\n\nEarnings: 85-90% of service fee\nPayout: Within 24-48 hours\n\nReady to join?',
      quickReplies: ['Join now', 'Documents needed', 'Earnings info'],
    },
  },
  // Provider - verification
  {
    keywords: ['verification', 'verify', 'verified', 'background check', 'police'],
    response: {
      message: 'Provider Verification:\n\nAll providers go through:\n\n1️⃣ Government ID verification\n2️⃣ Address proof check\n3️⃣ Background check\n4️⃣ Skill assessment\n5️⃣ Ongoing monitoring\n\nLook for "Verified" badge! ✅\n\nVerification takes 2-3 business days.',
      quickReplies: ['Become provider', 'Required documents'],
    },
  },
  // Provider - earnings
  {
    keywords: ['earning', 'payout', 'salary', 'income', 'how much can i earn', 'profit'],
    response: {
      message: 'Provider Earnings:\n\n• Earn 85-90% of service fee\n• Platform fee: 10-15%\n• Payout to bank within 24-48 hours\n\nExample:\nService ₹500 → You get ₹425-450\n\nSet your service radius up to 15km!',
      quickReplies: ['Join now', 'Payment details', 'How it works'],
    },
  },
  // Trust & Safety
  {
    keywords: ['safe', 'trust', 'reliable', 'secure', 'safety', 'assured', 'verified'],
    response: {
      message: 'Safety on Sahaay:\n\n✅ All providers background verified\n✅ Government ID & address checked\n✅ Continuous performance monitoring\n✅ 24/7 customer support\n✅ Secure payments\n\nYour safety is our priority!',
      quickReplies: ['How ratings work', 'Dispute', 'Privacy policy'],
    },
  },
  // Ratings
  {
    keywords: ['rating', 'review', 'feedback', 'star', 'stars', 'rate'],
    response: {
      message: 'Ratings & Reviews:\n\n• Rate 1-5 stars after service\n• Reviews visible to all users\n• Helps maintain quality\n• Low-rated providers reviewed\n\nYour feedback matters!',
      quickReplies: ['Leave review', 'Provider ratings'],
    },
  },
  // Dispute
  {
    keywords: ['dispute', 'complaint', 'issue', 'problem', 'not satisfied', 'bad', 'angry', 'escalate'],
    response: {
      message: 'Issue Resolution:\n\n1. Contact provider via Messages\n2. If unresolved: support@sahaay.app\n3. We mediate within 48 hours\n4. Refund if needed\n\nWe\'re here to help!',
      quickReplies: ['Contact support', 'Report provider'],
    },
  },
  // Account - signup
  {
    keywords: ['signup', 'sign up', 'register', 'create account', 'join', 'new user', 'signin'],
    response: {
      message: 'Sign Up on Sahaay:\n\n1. Enter email/phone\n2. Verify with OTP\n3. Choose role (Customer/Provider)\n4. Complete profile\n5. Start using!\n\nAlready have an account? Just login.',
      quickReplies: ['Sign up', 'Login', 'Provider signup'],
    },
  },
  // Account - profile
  {
    keywords: ['profile', 'update profile', 'change address', 'edit account', 'settings'],
    response: {
      message: 'Profile Management:\n\n• Update name, photo, phone\n• Add/update address\n• Set service radius (providers)\n• Change language\n\nGo to Profile section to edit!',
      quickReplies: ['Update address', 'Change photo', 'Language'],
    },
  },
  // Account - delete
  {
    keywords: ['delete account', 'remove account', 'close account', 'deactivate'],
    response: {
      message: 'Delete Account:\n\nEmail support@sahaay.app with your registered email.\n\nWe\'ll verify and delete within 7 days.\nNote: This action cannot be undone.',
      quickReplies: ['Contact support', 'Keep account'],
    },
  },
  // Support
  {
    keywords: ['contact', 'support', 'help', 'customer care', 'helpline', 'call', 'phone', 'email'],
    response: {
      message: 'Contact Support:\n\n📧 Email: support@sahaay.app\n📅 Hours: Mon-Sat, 9 AM - 8 PM IST\n⏱️ Response: Within 24 hours\n\nOr use Help & Support page!',
      quickReplies: ['Email support', 'Help page', 'Chat with us'],
    },
  },
  // Privacy
  {
    keywords: ['privacy', 'data', 'personal', 'information', 'collect', 'share'],
    response: {
      message: 'Privacy & Data:\n\nWe collect:\n• Account info\n• Location (GPS)\n• Service requests\n• Payment data\n\nLocation used only for provider matching (10km radius). We never sell your data.\n\nFull policy: /privacy',
      quickReplies: ['Read privacy policy', 'Data sharing', 'Location'],
    },
  },
  // Location
  {
    keywords: ['location', 'gps', 'address', 'where', 'nearby', '10km', 'radius'],
    response: {
      message: 'Location on Sahaay:\n\n📍 Your location is auto-detected via GPS\n\n👷 Providers within 10km see your request\n\n🔒 Location used only for matching\n\nControl location in device settings!',
      quickReplies: ['Privacy policy', 'How matching works'],
    },
  },
  // Time slots
  {
    keywords: ['time', 'slot', 'when', 'schedule', 'available', 'today', 'tomorrow'],
    response: {
      message: 'Scheduling:\n\n🕐 Time: 9 AM - 6 PM (30-min slots)\n\n📅 Book: Today up to 7 days ahead\n\nNeed help booking?',
      quickReplies: ['Book now', 'Today\'s slots', 'Tomorrow'],
    },
  },
  // Emergency
  {
    keywords: ['emergency', 'urgent', 'fast', 'immediate', 'now', 'asap', 'critical'],
    response: {
      message: 'Emergency Services:\n\nFor urgent needs, contact:\nsupport@sahaay.app\n\nRegular booking: Within 7 days\nEmergency: May have 25% extra charge\n\nWe\'ll help ASAP!',
      quickReplies: ['Contact support', 'Book today'],
    },
  },
  // Status
  {
    keywords: ['status', 'track', 'where', 'journey', 'on way', 'enroute', 'arrived'],
    response: {
      message: 'Track Your Service:\n\n1. Go to Bookings\n2. Select active booking\n3. View status:\n   • Request sent\n   • Provider accepted\n   • On the way\n   • In progress\n   • Completed\n\nNotifications sent at each step!',
      quickReplies: ['My bookings', 'Current status'],
    },
  },
  // Receipt
  {
    keywords: ['receipt', 'invoice', 'bill', 'transaction', 'history', 'download'],
    response: {
      message: 'Receipts & History:\n\n1. Go to Bookings\n2. Select completed booking\n3. View Receipt\n4. Download PDF\n\nAccess all past services from History!',
      quickReplies: ['View receipts', 'Payment history'],
    },
  },
  // Thanks
  {
    keywords: ['thank', 'thanks', 'thx', 'appreciate', 'grateful'],
    response: {
      message: 'You\'re welcome! 😊\n\nAnything else I can help with?',
      quickReplies: ['Book service', 'View bookings', 'No thanks'],
    },
  },
  // Goodbye
  {
    keywords: ['bye', 'goodbye', 'see you', 'later', 'farewell'],
    response: {
      message: 'Goodbye! Have a great day! 👋\n\nFeel free to chat anytime you need help.\n\nSee you soon! 😊',
      quickReplies: [],
    },
  },
]

// Fallback responses
const FALLBACK_RESPONSES = [
  "I didn't quite get that. Try asking about:\n• Services we offer\n• How to book\n• Pricing\n• Becoming a provider\n• Support",
  "I'm not sure I understand. Could you rephrase that?",
  "Ask me about booking, pricing, services, or support - I'll be happy to help!",
]

// Initial suggestions
const INITIAL_SUGGESTIONS = [
  'What services?',
  'How to book?',
  'Pricing',
  'Contact support',
]

export class ChatbotAPI {
  private conversationCount = 0

  async sendMessage(userMessage: string): Promise<ChatResponse> {
    // Simulate slight delay for natural feel
    await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500))

    this.conversationCount++

    // Find matching pattern - first match wins
    for (const pattern of PATTERNS) {
      if (matchPattern(userMessage, pattern.keywords)) {
        return pattern.response
      }
    }

    // Return random fallback
    const fallbackIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.length)
    return {
      message: FALLBACK_RESPONSES[fallbackIndex],
      quickReplies: INITIAL_SUGGESTIONS,
    }
  }

  getInitialSuggestions(): string[] {
    return INITIAL_SUGGESTIONS
  }

  reset() {
    this.conversationCount = 0
  }
}

export const chatbot = new ChatbotAPI()