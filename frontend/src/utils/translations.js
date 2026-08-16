// Lightweight translation dictionary. Add more keys as needed — falls back to
// the English value (or the key itself) if a translation is missing.
export const translations = {
  // Navigation
  dashboard:       { en: 'Dashboard',    hi: 'डैशबोर्ड' },
  browseCars:      { en: 'Browse Cars',  hi: 'कार देखें' },
  myBookings:      { en: 'My Bookings',  hi: 'मेरी बुकिंग' },
  referAndEarn:    { en: 'Refer & Earn', hi: 'रेफर करें और कमाएं' },
  profile:         { en: 'Profile',      hi: 'प्रोफाइल' },
  logout:          { en: 'Logout',       hi: 'लॉगआउट' },

  // Common actions
  bookNow:         { en: 'Book Now',           hi: 'अभी बुक करें' },
  viewAndBook:      { en: 'View & Book',        hi: 'देखें और बुक करें' },
  cancel:          { en: 'Cancel',             hi: 'रद्द करें' },
  reschedule:      { en: 'Reschedule',         hi: 'समय बदलें' },
  extendRental:    { en: 'Extend Rental',      hi: 'किराया बढ़ाएं' },
  giveFeedback:    { en: 'Give Feedback',      hi: 'प्रतिक्रिया दें' },
  payNow:          { en: 'Pay Now',            hi: 'अभी भुगतान करें' },
  applyPromo:      { en: 'Apply',              hi: 'लागू करें' },
  continueToPayment:{ en: 'Continue to Payment', hi: 'भुगतान की ओर बढ़ें' },
  confirmBooking:  { en: 'Confirm Booking',    hi: 'बुकिंग की पुष्टि करें' },
  search:          { en: 'Search',             hi: 'खोजें' },
  filters:         { en: 'Filters',            hi: 'फ़िल्टर' },
  compare:         { en: 'Compare',            hi: 'तुलना करें' },

  // Trip / booking
  local:           { en: 'Local (Patna)',      hi: 'स्थानीय (पटना)' },
  outstation:      { en: 'Outstation',         hi: 'आउटस्टेशन' },
  pickupDate:      { en: 'Pickup Date',        hi: 'पिकअप तिथि' },
  returnDate:      { en: 'Return Date',        hi: 'वापसी तिथि' },
  pickupLocation:  { en: 'Pickup Location',    hi: 'पिकअप स्थान' },
  dropLocation:    { en: 'Drop Location',      hi: 'ड्रॉप स्थान' },
  estimatedTotal:  { en: 'Estimated Total',    hi: 'अनुमानित कुल राशि' },
  balanceDue:      { en: 'Balance Due',        hi: 'शेष राशि' },
  available:       { en: 'Available',          hi: 'उपलब्ध' },
  booked:          { en: 'Booked',             hi: 'बुक हो चुका' },

  // Headers
  welcomeBack:     { en: 'Welcome back',       hi: 'वापसी पर स्वागत है' },
  yourBookings:    { en: 'Your Bookings',      hi: 'आपकी बुकिंग' },
  savedCars:       { en: "Cars you've saved for later", hi: 'आपके द्वारा सहेजी गई कारें' },
}

export function translate(key, language) {
  const entry = translations[key]
  if (!entry) return key
  return entry[language] || entry.en || key
}
