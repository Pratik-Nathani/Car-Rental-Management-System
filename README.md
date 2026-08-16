# RentMyRide - Car Rental Management System

RentMyRide is a full-stack car rental management system designed to
manage car rentals, customers, drivers, reservations, rentals, payments,
notifications, promotional codes, and administrative operations through
a web-based application.

## Project Structure

``` text
Car-Rental-Management-System/
├── README.md
├── backend/
│   ├── pom.xml
│   └── src/
└── frontend/
    ├── package.json
    └── src/
```

## Technologies Used

### Frontend

-   React 18
-   Vite
-   React Router
-   Axios
-   React Hook Form
-   React Hot Toast
-   React Icons
-   Recharts
-   Tailwind CSS

### Backend

-   Java 21
-   Spring Boot 3.2.3
-   Spring MVC
-   Spring Data JPA
-   Hibernate
-   Spring Security
-   Spring AOP
-   Spring Validation
-   Spring Mail
-   Maven
-   Lombok

### Database

-   MySQL

### Integrations and Tools

-   JWT authentication
-   Razorpay payment gateway
-   Gmail SMTP for email/OTP
-   Twilio SMS and WhatsApp notifications
-   Swagger / OpenAPI
-   Apache PDFBox for receipt generation

## Main Features

### Customer

-   User registration and login
-   JWT-based authentication
-   Browse available cars
-   View detailed car information
-   Make car reservations
-   Manage bookings and rentals
-   Online payment
-   View payment receipts
-   Customer profile management
-   Submit feedback
-   Referral-related functionality
-   Password recovery

### Driver

-   Driver login and authentication
-   Driver dashboard
-   View assigned rentals
-   Manage driver rental activities
-   Pickup and drop-off workflow

### Administrator

-   Admin authentication
-   Admin dashboard
-   Manage cars
-   Manage customers
-   Manage drivers
-   Manage reservations
-   Manage rentals
-   Manage payments
-   Manage promotional codes
-   Manage feedback
-   Manage application settings

### Backend Services

The backend provides REST APIs for: - Authentication - Cars -
Customers - Drivers - Reservations - Rentals - Payments - Feedback -
Notifications - Promotional codes - File uploads - Locations

## Backend Architecture

The backend follows a layered Spring Boot architecture:

``` text
Controller
    ↓
Service
    ↓
Repository
    ↓
Database
```

The project also contains: - Entity classes - DTOs - Security
components - JWT filter and utilities - Global exception handling -
Configuration classes - Logging and security aspects - Utility classes

## Authentication and Security

The application uses Spring Security with JWT-based authentication.

JWT configuration is supplied through an environment variable rather
than being stored as a real secret in the repository.

## Payment Integration

Razorpay is integrated for payment processing.

The backend contains Razorpay configuration and signature verification
functionality for handling payment-related operations.

## Email and OTP

Gmail SMTP is used for email functionality, including OTP-related
operations.

OTP settings include: - OTP expiry - OTP length - Maximum verification
attempts - Resend cooldown

## Notifications

The backend contains support for SMS and WhatsApp notifications through
Twilio.

Notification credentials are configured through environment variables.

## File Uploads

The application supports file uploads and stores uploaded files outside
the project directory using the configured upload directory.

## API Documentation

Swagger / OpenAPI is configured for the backend.

When the backend is running, Swagger UI is available at:

``` text
http://localhost:8080/swagger-ui.html
```

## Configuration and Environment Variables

Sensitive credentials are intentionally not stored in this repository.

The backend uses environment variables for configuration such as:

``` text
DB_URL
DB_USERNAME
DB_PASSWORD
JWT_SECRET
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
MAIL_USERNAME
MAIL_PASSWORD
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_SMS_FROM
TWILIO_WHATSAPP_FROM
```

## Running the Backend

### Prerequisites

-   Java 21
-   Maven
-   MySQL
-   Required service credentials for features such as Razorpay, email,
    and Twilio

### Steps

1.  Open the `backend` folder in Spring Tool Suite, Eclipse, or another
    Java IDE.
2.  Create/configure the required MySQL database.
3.  Set the required environment variables.
4.  Make sure MySQL is running.
5.  Run the Spring Boot application.

The backend is configured to run on:

``` text
http://localhost:8080
```

## Running the Frontend

### Prerequisites

-   Node.js
-   npm

### Steps

1.  Open a terminal in the `frontend` folder.
2.  Install dependencies:

``` bash
npm install
```

3.  Start the development server:

``` bash
npm run dev
```

4.  Open the local URL displayed by Vite in your browser.

## Frontend API Configuration

The frontend uses Axios for communication with the backend.

The API base URL can be configured using:

``` text
VITE_API_BASE_URL
```

If it is not provided, the frontend uses `/api` as the default API base
path.