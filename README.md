# 📱 Price and Stock Alert Application

A mobile and web-based application that monitors product prices and stock availability from e-commerce platforms. Users can create a personalized watchlist, set target prices, and receive real-time notifications whenever prices drop or products are back in stock.

> 🎓 Bachelor of Science in Information Technology (BSIT) Capstone Project

---

## 📖 Project Overview

The **Price and Stock Alert Application** is designed to help online shoppers save time and money by automatically monitoring products from supported e-commerce platforms.

Instead of manually checking product pages every day, users can simply add a product to their watchlist and receive notifications when:

- 📉 The product price decreases
- 🎯 The target price is reached
- 📦 The product becomes available again

The system also provides an administrative dashboard for managing users, monitored products, notifications, and monitoring logs.

---

# ✨ Features

## 👤 User Features

- User Registration and Login
- Email Verification
- Forgot Password
- Profile Management
- Product Watchlist
- Target Price Alerts
- Stock Availability Alerts
- Price History
- Push Notifications
- Email Notifications
- Share Watchlist
- Offline Support

---

## 👨‍💼 Admin Features

- Secure Admin Login
- Dashboard Analytics
- User Management
- Product Monitoring
- Notification Management
- Monitoring Logs
- System Settings
- User Activity Logs

---

# 🛠️ Tech Stack

## Frontend

- React Native
- Expo
- React Navigation
- Axios

## Backend

- Laravel
- PHP 8.2
- Laravel Sanctum
- Queue Jobs
- Scheduler

## Database

- MySQL

## Deployment

- Docker
- Nginx
- Cloudflare

## Notifications

- Expo Push Notifications
- Email Notifications

---

# 📂 Project Structure

```
Price-and-Stock-Alert-Application
│
├── backend/
│   └── price-alert-api/
│
├── frontend/
│   └── PriceandStockAlertApplication/
│
└── .gitignore
```

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/Gelyn03/Price-and-Stock-Alert-Application.git
```

---

## Backend

```bash
cd backend/price-alert-api

composer install

cp .env.example .env

php artisan key:generate

php artisan migrate

php artisan serve
```

---

## Frontend

```bash
cd frontend/PriceandStockAlertApplication

npm install

npx expo start
```

---

# ⚙️ Requirements

- PHP 8.2+
- Composer
- Node.js
- npm
- Expo CLI
- MySQL
- Docker (Optional)

---

# 📸 Screenshots

You may add screenshots here after completing the project.

Example:

- Login Screen
- Home Screen
- Watchlist
- Notifications
- Admin Dashboard

---

# 🔒 Security Features

- Password Hashing
- Authentication using Laravel Sanctum
- Protected API Routes
- Admin Authorization
- Email Verification
- Secure Password Reset

---

# 📊 Future Improvements

- Multi-store support
- Product comparison
- AI-based price prediction
- Wishlist recommendations
- Advanced analytics
- Mobile push notification enhancements

---

# 👨‍💻 Developers

**BSIT Capstone Project**

Developed by:

- Gelyn M. Natividad
- *(Add your group members here if applicable.)*

---

# 📄 License

This project is developed for educational purposes as part of the Bachelor of Science in Information Technology (BSIT) Capstone Project.
