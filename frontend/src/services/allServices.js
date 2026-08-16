import api from './api'

// ── Auth ──────────────────────────────────────────────────
// POST /api/customers/login        body: { username, password }
// POST /api/customers/register     body: RegisterRequest
// POST /api/customers/login/otp/send      body: { identifier }        -> sends OTP to registered email
// POST /api/customers/login/otp/verify    body: { identifier, otp }   -> returns AuthResponseDTO (token, etc)
// POST /api/customers/forgot-password/send-otp   body: { identifier }
// POST /api/customers/forgot-password/verify-otp body: { identifier, otp }
// POST /api/customers/forgot-password/reset      body: { identifier, otp, newPassword }
// POST /api/drivers/login          body: { email, password }
// POST /api/admin/login            body: { username, password }
export const authService = {
  unifiedLogin:     (data) => api.post('/auth/login', data), // POST /api/auth/login body: { username, password } -> auto-detects role
  customerLogin:    (data) => api.post('/customers/login', data),
  customerRegister: (data) => api.post('/customers/register', data),
  driverLogin:      (data) => api.post('/drivers/login', data),
  adminLogin:       (data) => api.post('/admin/login', data),

  // OTP Login
  sendLoginOtp:     (identifier)          => api.post('/customers/login/otp/send', { identifier }),
  verifyLoginOtp:   (identifier, otp)     => api.post('/customers/login/otp/verify', { identifier, otp }),

  // Forgot Password
  sendForgotPasswordOtp:   (identifier)               => api.post('/customers/forgot-password/send-otp', { identifier }),
  verifyForgotPasswordOtp: (identifier, otp)          => api.post('/customers/forgot-password/verify-otp', { identifier, otp }),
  resetPassword:           (identifier, otp, newPassword) =>
      api.post('/customers/forgot-password/reset', { identifier, otp, newPassword }),
}

// ── Admin profile ───────────────────────────────────────────
// GET   /api/admin/profile
// PUT   /api/admin/profile          body: { name, email }
// PATCH /api/admin/change-password  body: { currentPassword, newPassword }
export const adminService = {
  getProfile:     ()     => api.get('/admin/profile'),
  updateProfile:  (data) => api.put('/admin/profile', data),
  changePassword: (data) => api.patch('/admin/change-password', data),
}

// ── Cars ──────────────────────────────────────────────────
// GET  /api/cars
// GET  /api/cars/:carId
// GET  /api/cars/available
// GET  /api/cars/search?keyword=
// GET  /api/cars/category/:category
// GET  /api/cars/available-between?pickupDate=&returnDate=
// POST /api/cars                   ADMIN only
// PUT  /api/cars/:carId            ADMIN only
// DELETE /api/cars/:carId          ADMIN only
// PATCH /api/cars/:carId/status    ADMIN
export const carService = {
  getAll:             ()                    => api.get('/cars'),
  getById:            (id)                  => api.get('/cars/' + id),
  getAvailable:       ()                    => api.get('/cars/available'),
  search:             (keyword)             => api.get('/cars/search?keyword=' + encodeURIComponent(keyword)),
  getByCategory:      (category)            => api.get('/cars/category/' + category),
  getAvailableBetween:(pickup, ret)         => api.get('/cars/available-between?pickupDate=' + pickup + '&returnDate=' + ret),
  add:                (data)                => api.post('/cars', data),
  update:             (id, data)            => api.put('/cars/' + id, data),
  delete:             (id)                  => api.delete('/cars/' + id),
  updateStatus:       (id, status)          => api.patch('/cars/' + id + '/status?status=' + status),
}

// ── Customers ─────────────────────────────────────────────
// GET  /api/customers              ADMIN only
// GET  /api/customers/:id          ADMIN/CUSTOMER
// PUT  /api/customers/:id          ADMIN/CUSTOMER
// GET  /api/customers/search?keyword=  ADMIN
// PATCH /api/customers/:id/status  ADMIN
// DELETE /api/customers/:id        ADMIN
export const customerService = {
  getAll:         ()              => api.get('/customers'),
  getById:        (id)            => api.get('/customers/' + id),
  update:         (id, data)      => api.put('/customers/' + id, data),
  search:         (keyword)       => api.get('/customers/search?keyword=' + encodeURIComponent(keyword)),
  updateStatus:   (id, status)    => api.patch('/customers/' + id + '/status?status=' + status),
  delete:         (id)            => api.delete('/customers/' + id),
  getReferral:    (id)            => api.get('/customers/' + id + '/referral'),
}

// ── Drivers ───────────────────────────────────────────────
// GET  /api/drivers                  ADMIN
// GET  /api/drivers/:id
// POST /api/drivers                  ADMIN
// PUT  /api/drivers/:id
// DELETE /api/drivers/:id            ADMIN
// GET  /api/drivers/status/:status   ADMIN
// PATCH /api/drivers/:id/status      ADMIN
export const driverService = {
  getAll:           ()              => api.get('/drivers'),
  getById:          (id)            => api.get('/drivers/' + id),
  register:         (data)          => api.post('/drivers', data),
  update:           (id, data)      => api.put('/drivers/' + id, data),
  delete:           (id)            => api.delete('/drivers/' + id),
  getByStatus:      (status)        => api.get('/drivers/status/' + status),
  updateStatus:     (id, status)    => api.patch('/drivers/' + id + '/status?status=' + status),
}

// ── Reservations ──────────────────────────────────────────
// POST /api/reservations/customer/:customerId
// GET  /api/reservations                    ADMIN
// GET  /api/reservations/:id
// GET  /api/reservations/customer/:customerId
// PATCH /api/reservations/:id/status        ADMIN
// PATCH /api/reservations/:id/cancel        ADMIN/CUSTOMER
export const reservationService = {
  create:       (customerId, data) => api.post('/reservations/customer/' + customerId, data),
  estimate:     (data)             => api.post('/reservations/estimate', data),
  pay:          (reservationId, data) => api.post('/reservations/' + reservationId + '/pay', data),
  getAll:       ()                 => api.get('/reservations'),
  getById:      (id)               => api.get('/reservations/' + id),
  getByCustomer:(customerId)       => api.get('/reservations/customer/' + customerId),
  getAvailability: (carId)         => api.get('/reservations/car/' + carId + '/availability'),
  reschedule:   (id, data)         => api.patch('/reservations/' + id + '/reschedule', data),
  assignDriver: (id, driverId)     => api.patch('/reservations/' + id + '/assign-driver', { driverId }),
  getPendingPickups: (driverId)    => api.get('/reservations/driver/' + driverId + '/pending-pickups'),
  updateStatus: (id, data)         => api.patch('/reservations/' + id + '/status', data),
  cancel:       (id)               => api.patch('/reservations/' + id + '/cancel'),
}

// ── Locations (Bihar) ────────────────────────────────────────
// GET /api/locations/bihar   -> [{ name, district, latitude, longitude }]
export const locationService = {
  getBiharLocations: () => api.get('/locations/bihar'),
}

// ── File Upload (DL/Aadhar photos) ──────────────────────────
export const fileService = {
  upload: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    // Don't hardcode 'multipart/form-data' — the browser needs to add its own boundary param.
    // Overriding the axios instance's default 'application/json' with undefined lets it do that.
    return api.post('/files/upload', formData, { headers: { 'Content-Type': undefined } })
  },
}

// ── Promo Codes ──────────────────────────────────────────────
export const promoCodeService = {
  validate: (code, bookingAmount) => api.post('/promo-codes/validate', { code, bookingAmount }),
  getAll:   ()                    => api.get('/promo-codes'),
  create:   (data)                => api.post('/promo-codes', data),
  update:   (id, data)            => api.put('/promo-codes/' + id, data),
  delete:   (id)                  => api.delete('/promo-codes/' + id),
}

// POST /api/feedback/customer/{customerId}         body: { rentalId, carCondition, staffBehavior, valueForMoney, bookingProcess, overallService, comments }
// GET  /api/feedback/customer/{customerId}          -> customer's own feedback
// GET  /api/feedback/rental/{rentalId}/exists        -> boolean
// GET  /api/feedback                                 ADMIN only -> all feedback
export const feedbackService = {
  submit:            (customerId, data) => api.post('/feedback/customer/' + customerId, data),
  getForCustomer:    (customerId)       => api.get('/feedback/customer/' + customerId),
  existsForRental:   (rentalId)         => api.get('/feedback/rental/' + rentalId + '/exists'),
  getAll:            ()                 => api.get('/feedback'),
  getAllRatings:     ()                 => api.get('/feedback/ratings'),
  getForCar:         (carId)            => api.get('/feedback/car/' + carId),
}

// ── In-app Notifications (bell icon) ────────────────────────
export const notificationService = {
  getForCustomer:  (customerId) => api.get('/notifications/customer/' + customerId),
  getUnreadCount:  (customerId) => api.get('/notifications/customer/' + customerId + '/unread-count'),
  markAsRead:      (id)         => api.patch('/notifications/' + id + '/read'),
  markAllAsRead:   (customerId) => api.patch('/notifications/customer/' + customerId + '/read-all'),
  getForDriver:        (driverId) => api.get('/notifications/driver/' + driverId),
  getUnreadCountDriver: (driverId) => api.get('/notifications/driver/' + driverId + '/unread-count'),
  markAllAsReadDriver:  (driverId) => api.patch('/notifications/driver/' + driverId + '/read-all'),
}

// ── Rentals ───────────────────────────────────────────────
// POST /api/rentals/pickup         ADMIN/DRIVER
// PATCH /api/rentals/:id/return    ADMIN/DRIVER
// GET  /api/rentals                ADMIN
// GET  /api/rentals/:id
// GET  /api/rentals/active         ADMIN/DRIVER
// GET  /api/rentals/customer/:id
// GET  /api/rentals/driver/:id
// GET  /api/rentals/revenue/total  ADMIN
// GET  /api/rentals/revenue/monthly?month=&year=  ADMIN
export const rentalService = {
  pickup:         (data)          => api.post('/rentals/pickup', data),
  returnCar:      (id, data)      => api.patch('/rentals/' + id + '/return', data),
  extend:         (id, data)      => api.patch('/rentals/' + id + '/extend', data),
  getAll:         ()              => api.get('/rentals'),
  getById:        (id)            => api.get('/rentals/' + id),
  getActive:      ()              => api.get('/rentals/active'),
  getByCustomer:  (id)            => api.get('/rentals/customer/' + id),
  getByDriver:    (id)            => api.get('/rentals/driver/' + id),
  getTotalRevenue:()              => api.get('/rentals/revenue/total'),
  getMonthlyRevenue:(m, y)        => api.get('/rentals/revenue/monthly?month=' + m + '&year=' + y),
}

// ── Payments ──────────────────────────────────────────────
// POST /api/payments/create-order  body: { rentalId, paymentMethod }
// POST /api/payments/verify        body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
// GET  /api/payments               ADMIN
// GET  /api/payments/:id
// GET  /api/payments/rental/:rentalId
// GET  /api/payments/customer/:customerId
export const paymentService = {
  createOrder:    (data)          => api.post('/payments/create-order', data),
  verify:         (data)          => api.post('/payments/verify', data),
  getAll:         ()              => api.get('/payments'),
  getById:        (id)            => api.get('/payments/' + id),
  getByRental:    (rentalId)      => api.get('/payments/rental/' + rentalId),
  getByReservation: (reservationId) => api.get('/payments/reservation/' + reservationId),
  getByCustomer:  (customerId)    => api.get('/payments/customer/' + customerId),
  // Booking-confirmation payment (full or ₹1000+ deposit), scoped to a Reservation
  createReservationOrder: (data) => api.post('/payments/reservation/create-order', data),
  verifyReservationPayment: (data) => api.post('/payments/reservation/verify', data),
  // Customer-downloadable PDF receipt — generated fresh from the payment + its booking
  downloadReceipt: (paymentId)   => api.get('/payments/' + paymentId + '/receipt', { responseType: 'blob' }),
  downloadConsolidatedReceipt: (reservationId) => api.get('/payments/reservation/' + reservationId + '/consolidated-receipt', { responseType: 'blob' }),
}


