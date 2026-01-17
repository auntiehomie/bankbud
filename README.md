# BankBud 🏦

A community-driven bank rate comparison platform that helps users find the best rates for checking, savings, CDs, and other banking products.

## Features

- 🔍 **Rate Comparison**: Compare rates across different banks and account types
- 👥 **Community-Driven**: Users can submit and verify rates they find
- 🤖 **AI Recommendations**: Get personalized bank recommendations based on your needs
- 📊 **Real-time Updates**: Stay updated with the latest rates from the community
- ⭐ **Rate Verification**: Community voting system to ensure rate accuracy
- 📈 **Calculators**: Interest and savings calculators

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- Zustand for state management
- React Router for navigation
- Lucide React for icons

### Backend
- Node.js + Express
- TypeScript
- MongoDB with Mongoose
- OpenAI API for AI recommendations
- Rate limiting for API protection

## Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- OpenAI API key (optional, for AI features)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# In server/.env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/bankbud
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=development
```

4. Start the development servers:
```bash
npm run dev
```

This will start:
- Client on http://localhost:5173
- Server on http://localhost:3001

## Project Structure

```
bankbud/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
├── server/          # Express backend
│   ├── src/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── index.ts
│   └── package.json
└── package.json     # Root package
```

## Contributing

Community contributions are what make BankBud valuable! Feel free to submit rates, verify existing ones, and help improve the platform.

## License

MIT
