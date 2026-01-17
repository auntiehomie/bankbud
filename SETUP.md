# BankBud Setup Guide

## Quick Start (3 Options)

### Option 1: Use MongoDB Atlas (Recommended - No Installation Needed)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier is fine)
3. Get your connection string
4. Update `server/.env`:
   ```
   MONGODB_URI=your_mongodb_atlas_connection_string
   ```

### Option 2: Install MongoDB Locally

1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Install and start MongoDB:
   ```powershell
   # After installation, MongoDB should run automatically
   # Or start it manually:
   net start MongoDB
   ```
3. The default connection string in `.env` should work:
   ```
   MONGODB_URI=mongodb://localhost:27017/bankbud
   ```

### Option 3: Use Docker (If you have Docker installed)

```powershell
docker run -d -p 27017:27017 --name bankbud-mongo mongo:latest
```

## Installation Steps

1. **Install dependencies:**
   ```powershell
   npm install
   ```

2. **Set up environment variables:**
   - Copy `server/.env.example` to `server/.env`
   - Update MongoDB connection string
   - (Optional) Add OpenAI API key for AI recommendations

3. **Seed the database with sample data:**
   ```powershell
   cd server
   npm run seed
   ```

4. **Start the development servers:**
   ```powershell
   # From the root directory
   npm run dev
   ```

   This will start:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Features Overview

### 1. Compare Rates
- View all bank rates submitted by the community
- Filter by account type (savings, checking, CD, money market)
- Sort by highest rate or most verified
- Verify rates you can confirm
- Report inaccurate rates

### 2. AI Recommendations
- Get personalized bank recommendations
- Specify your preferences:
  - Account type
  - Minimum rate
  - Maximum minimum deposit
  - Preferred features
- Receive AI-powered matches with reasoning

### 3. Submit Rates
- Help the community by submitting rates you find
- Include rate details, features, and sources
- Rates are immediately available to other users

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast development server
- **Zustand** - State management
- **React Router** - Navigation
- **Lucide React** - Icons

### Backend
- **Node.js + Express** - API server
- **TypeScript** - Type safety
- **MongoDB + Mongoose** - Database
- **OpenAI API** - AI recommendations (optional)
- **Express Rate Limit** - API protection

## API Endpoints

### Rates
- `GET /api/rates` - Get all rates (with optional filters)
- `GET /api/rates/top?accountType=savings&limit=5` - Get top rates
- `POST /api/rates` - Submit a new rate
- `POST /api/rates/:id/verify` - Verify a rate
- `POST /api/rates/:id/report` - Report a rate

### Recommendations
- `POST /api/recommendations` - Get AI-powered recommendations

### Health
- `GET /api/health` - Server health check

## Configuration

### Environment Variables (server/.env)

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/bankbud
OPENAI_API_KEY=your_openai_api_key_here  # Optional
NODE_ENV=development
```

### OpenAI API (Optional)

The app works without OpenAI API - it uses rule-based scoring as a fallback. To enable AI recommendations:

1. Get an API key from [OpenAI](https://platform.openai.com/)
2. Add it to `server/.env`:
   ```
   OPENAI_API_KEY=sk-...
   ```

## Troubleshooting

### MongoDB Connection Issues

If you see "MongoDB connection error":
- Make sure MongoDB is running
- Check your connection string in `.env`
- Use MongoDB Atlas for cloud hosting (no local installation needed)

### Port Already in Use

If ports 3001 or 5173 are in use:
- Change PORT in `server/.env`
- Change port in `client/vite.config.ts`

### Dependencies Not Installing

Try:
```powershell
# Clear cache and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

## Development Tips

### Hot Reload
Both frontend and backend have hot reload enabled. Just save your changes and the app will automatically update.

### Database Inspection
Use MongoDB Compass to view and edit data:
1. Download from [mongodb.com/products/compass](https://www.mongodb.com/products/compass)
2. Connect to `mongodb://localhost:27017`
3. View the `bankbud` database

### API Testing
Use the built-in REST client or tools like Postman to test the API endpoints.

## Next Steps

1. **Add User Authentication**
   - Track who submits rates
   - Prevent spam
   - Build reputation system

2. **Enhanced AI Features**
   - Learning from user preferences
   - Trend analysis
   - Rate predictions

3. **Mobile App**
   - React Native version
   - Push notifications for rate changes

4. **Advanced Features**
   - Rate change alerts
   - Email notifications
   - Bank account linking
   - Historical rate tracking

## Contributing

The app is designed to be community-driven. Users can:
- Submit new rates they discover
- Verify existing rates
- Report inaccurate information
- Help improve AI recommendations through usage

## License

MIT
