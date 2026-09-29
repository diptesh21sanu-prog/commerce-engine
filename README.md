# 🛍️ Commerce Engine

### AI-Powered Multi-Vendor E-Commerce Marketplace

Commerce Engine is a full-stack, AI-powered multi-vendor e-commerce marketplace designed to handle the complete shopping journey — from product discovery and recommendations to cart, checkout, orders, seller management, and administration.

The platform supports three major roles:

- 👤 Customer
- 🏪 Seller
- 🛡️ Admin

AI is used to improve product discovery and customer assistance, while core commerce operations remain controlled by the application backend.

---

## ✨ Features

### 👤 Customer
- Browse products and categories
- Product search and filtering
- Product details and variants
- Shopping cart
- Wishlist
- Checkout
- Order placement and tracking
- Order history
- AI Shopping Assistant

### 🏪 Seller
- Seller dashboard
- Product management
- Inventory management
- Product variants
- Order management
- Seller analytics
- Seller-specific product management

### 🛡️ Admin
- Admin dashboard
- User management
- Seller management
- Product management
- Order management
- Category management
- Platform-level analytics

### 🤖 AI Shopping Assistant
- Natural-language product search
- Product recommendations
- Category-aware recommendations
- Product discovery assistance
- Product-specific "View Item" navigation
- Customer support assistance

---

## 🔐 Core Architecture Principle

AI is **not the source of truth** for core commerce operations.

The application backend remains authoritative for:

- Product availability
- Inventory
- Product prices
- Cart totals
- Orders
- Payment status
- Seller data
- Order status

AI is used only to enhance discovery, recommendations, and customer interaction.

---

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Tailwind CSS
- Vite

### Backend
- Python
- Flask
- REST API

### Database
- PostgreSQL / MySQL

### AI & Data
- LangChain
- Hosted LLM API
- Embeddings
- Vector Search
- Pandas
- Scikit-learn

---

## 📦 Demo Data

The project includes marketplace demo data with:

- Multiple sellers
- 200+ products
- Product categories
- SKU variants
- Shipping zones
- Coupons
- Tax and shipping rules
- Customer, seller and admin workflows

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd commerce-engine