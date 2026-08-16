// ── Car enums (matches Car.java) ──────────────────────────
export const CAR_CATEGORIES = [
  { value: 'HATCHBACK',       label: 'Hatchback'       },
  { value: 'SEDAN',           label: 'Sedan'           },
  { value: 'SUV',             label: 'SUV'             },
  { value: 'LUXURY',          label: 'Luxury'          },
  { value: 'VAN',             label: 'Van'             },
  { value: 'TEMPO_TRAVELLER', label: 'Tempo Traveller' },
]

export const FUEL_TYPES = [
  { value: 'PETROL',   label: 'Petrol'   },
  { value: 'DIESEL',   label: 'Diesel'   },
  { value: 'CNG',      label: 'CNG'      },
  { value: 'ELECTRIC', label: 'Electric' },
  { value: 'HYBRID',   label: 'Hybrid'   },
]

export const TRANSMISSION_TYPES = [
  { value: 'MANUAL',    label: 'Manual'    },
  { value: 'AUTOMATIC', label: 'Automatic' },
]

export const AVAILABILITY_STATUS = [
  { value: 'AVAILABLE',         label: 'Available',         color: 'success' },
  { value: 'BOOKED',            label: 'Booked',            color: 'warning' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance', color: 'danger'  },
  { value: 'RETIRED',           label: 'Retired',           color: 'gray'    },
]

// ── Reservation enums ─────────────────────────────────────
export const RESERVATION_STATUS = [
  { value: 'PENDING',   label: 'Pending',   color: 'warning' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'info'    },
  { value: 'CANCELLED', label: 'Cancelled', color: 'danger'  },
  { value: 'COMPLETED', label: 'Completed', color: 'success' },
  { value: 'REJECTED',  label: 'Rejected',  color: 'danger'  },
]

// ── Rental enums ──────────────────────────────────────────
export const RENTAL_STATUS = [
  { value: 'ACTIVE',    label: 'Active',    color: 'info'    },
  { value: 'COMPLETED', label: 'Completed', color: 'success' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'danger'  },
  { value: 'OVERDUE',   label: 'Overdue',   color: 'danger'  },
]

// ── Payment enums ─────────────────────────────────────────
export const PAYMENT_METHODS = [
  { value: 'UPI',         label: 'UPI'         },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD',  label: 'Debit Card'  },
  { value: 'NET_BANKING', label: 'Net Banking' },
  { value: 'CASH',        label: 'Cash'        },
  { value: 'WALLET',      label: 'Wallet'      },
]

export const PAYMENT_STATUS = [
  { value: 'PENDING',            label: 'Pending',            color: 'warning' },
  { value: 'SUCCESS',            label: 'Success',            color: 'success' },
  { value: 'FAILED',             label: 'Failed',             color: 'danger'  },
  { value: 'REFUNDED',           label: 'Refunded',           color: 'info'    },
  { value: 'PARTIALLY_REFUNDED', label: 'Partially Refunded', color: 'warning' },
]

// ── Staff enums ───────────────────────────────────────────
export const STAFF_ROLES = [
  { value: 'AGENT',    label: 'Agent'    },
  { value: 'MECHANIC', label: 'Mechanic' },
  { value: 'MANAGER',  label: 'Manager'  },
]

export const SHIFTS = [
  { value: 'MORNING',   label: 'Morning   (06:00–14:00)' },
  { value: 'AFTERNOON', label: 'Afternoon (14:00–22:00)' },
  { value: 'NIGHT',     label: 'Night     (22:00–06:00)' },
]

export const STAFF_ACCOUNT_STATUS = [
  { value: 'ACTIVE',     label: 'Active'     },
  { value: 'INACTIVE',   label: 'Inactive'   },
  { value: 'ON_LEAVE',   label: 'On Leave'   },
  { value: 'TERMINATED', label: 'Terminated' },
]

// ── Customer enums ────────────────────────────────────────
export const CUSTOMER_ACCOUNT_STATUS = [
  { value: 'ACTIVE',               label: 'Active'               },
  { value: 'INACTIVE',             label: 'Inactive'             },
  { value: 'BLOCKED',              label: 'Blocked'              },
  { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
]

export const GENDERS = [
  { value: 'MALE',   label: 'Male'   },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER',  label: 'Other'  },
]

// ── Maintenance enums ─────────────────────────────────────
export const MAINTENANCE_TYPES = [
  { value: 'ROUTINE_SERVICE',   label: 'Routine Service'   },
  { value: 'OIL_CHANGE',        label: 'Oil Change'        },
  { value: 'TYRE_REPLACEMENT',  label: 'Tyre Replacement'  },
  { value: 'BRAKE_SERVICE',     label: 'Brake Service'     },
  { value: 'ENGINE_REPAIR',     label: 'Engine Repair'     },
  { value: 'AC_SERVICE',        label: 'AC Service'        },
  { value: 'BODY_REPAIR',       label: 'Body Repair'       },
  { value: 'ELECTRICAL_REPAIR', label: 'Electrical Repair' },
  { value: 'FULL_SERVICE',      label: 'Full Service'      },
  { value: 'OTHER',             label: 'Other'             },
]

export const MAINTENANCE_STATUS = [
  { value: 'SCHEDULED',   label: 'Scheduled',   color: 'info'    },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'warning' },
  { value: 'COMPLETED',   label: 'Completed',   color: 'success' },
  { value: 'CANCELLED',   label: 'Cancelled',   color: 'danger'  },
]

// (GST rate used in calculateGST() in helpers.js — hardcoded there, not read from here)

// ── Indian States ─────────────────────────────────────────
export const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi',
  'Jammu and Kashmir','Ladakh','Chandigarh','Puducherry',
]
