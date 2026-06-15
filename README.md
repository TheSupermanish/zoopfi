# 💳 SuperPay

A full-featured cryptocurrency wallet built on Movement Network, enabling username-based payments, QR codes, payment requests, and gamified rewards.

## ✨ Features

### Core Wallet Features
- **Username-based Payments** - Send crypto using @usernames instead of long addresses
- **QR Code Payments** - Generate and scan QR codes for quick payments
- **Payment Requests** - Request payments from specific users or anyone
- **Transaction History** - Full history with filtering and blockchain explorer links
- **Contacts** - Save frequent recipients for quick access

### Wallet Support
- **Privy Social Login** - Email, Google, Twitter, Discord, GitHub
- **Native Wallets** - Nightly and other Aptos-compatible wallets
- **Auto Wallet Creation** - Seamless embedded wallet setup for new users

### Gamification
- **Daily Streaks** - Maintain activity for growing streak rewards
- **Transfer Milestones** - Unlock badges at 10, 50, 100, 500 transfers
- **Counter Game** - On-chain counter game integrated from original template
- **Level System** - Progress through levels with visual indicators

### User Experience
- **Dark Mode Design** - Modern, sleek dark interface
- **Real-time Notifications** - In-app alerts for incoming payments
- **Mobile-First** - Responsive design with bottom navigation
- **Instant Feedback** - Toast notifications and loading states

## 🏗️ Tech Stack

### Frontend
- **Next.js 16** with React 19
- **TypeScript** for type safety
- **Tailwind CSS 4** for styling
- **Radix UI** for accessible components

### Backend
- **Express.js** REST API
- **MongoDB** with Mongoose ODM
- **TypeScript** throughout

### Blockchain
- **Movement Network** (Aptos-based L2)
- **Aptos SDK** for transactions
- **Privy SDK** for social login wallets
- **Aptos Wallet Adapter** for native wallets

## 📁 Project Structure

```
superpay-app/
├── app/                          # Next.js frontend
│   ├── page.tsx                  # Landing/login
│   ├── onboarding/               # Username registration
│   ├── dashboard/                # Main wallet view
│   ├── send/                     # Send payments
│   ├── receive/                  # QR codes & requests
│   ├── history/                  # Transaction history
│   ├── contacts/                 # Saved contacts
│   ├── rewards/                  # Gamification & counter game
│   ├── settings/                 # Profile & settings
│   ├── components/               # React components
│   └── lib/                      # Utilities & API client
├── backend/                      # Express API
│   └── src/
│       ├── index.ts              # Server entry
│       ├── models/               # Mongoose schemas
│       └── routes/               # API endpoints
└── modules/                      # Move smart contracts
    └── sources/
        └── counter.move
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Movement CLI (for contract deployment)

### 1. Frontend Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your values:
# NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
# NEXT_PUBLIC_API_URL=http://localhost:4000

# Start development server
npm run dev
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with:
# MONGODB_URI=mongodb://localhost:27017/superpay
# PORT=4000

# Start backend
npm run dev
```

### 3. Smart Contract (Optional)

```bash
cd modules

# Initialize Movement CLI
movement init --network custom \
  --rest-url https://testnet.movementnetwork.xyz/v1 \
  --faucet-url https://faucet.testnet.movementnetwork.xyz/

# Deploy counter contract
movement move deploy
```

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register username |
| `/api/auth/check-username/:username` | GET | Check availability |
| `/api/users/:username` | GET | Get user by username |
| `/api/users/address/:address` | GET | Get user by wallet |
| `/api/transactions` | GET/POST | Transaction history |
| `/api/contacts` | GET/POST/DELETE | Manage contacts |
| `/api/requests` | GET/POST/PUT | Payment requests |
| `/api/rewards/streak` | GET/POST | Streak tracking |

## 🔐 Security

- Non-custodial - users control their own keys
- No private keys stored in frontend or backend
- Wallet signature verification for auth
- All transactions require user approval
- Privy handles embedded wallet security

## 🌐 Network Configuration

Edit `app/lib/aptos.ts` to switch networks:

```typescript
export const CURRENT_NETWORK = 'testnet'; // or 'mainnet'

export const MOVEMENT_CONFIGS = {
  mainnet: {
    chainId: 126,
    fullnode: "https://full.mainnet.movementinfra.xyz/v1",
  },
  testnet: {
    chainId: 250,
    fullnode: "https://testnet.movementnetwork.xyz/v1",
  }
};
```

## 🎨 Design System

SuperPay uses a modern dark theme with emerald accents:

- **Background**: `#0a0a0f` (near black)
- **Cards**: `#1a1a2e` to `#16213e` gradients
- **Accent**: `#10b981` (emerald)
- **Text**: White with gray variants
- **Borders**: `rgba(255,255,255,0.1)`

## 📱 Screens

1. **Login** - Connect wallet options
2. **Onboarding** - Username registration
3. **Dashboard** - Balance, quick actions, recent activity
4. **Send** - 4-step flow: recipient → amount → confirm → success
5. **Receive** - QR code & payment requests
6. **History** - Filterable transaction list
7. **Contacts** - Saved recipients
8. **Rewards** - Streaks, milestones, counter game
9. **Settings** - Profile, wallet info, logout

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines first.

## 📄 License

MIT License - see LICENSE file for details.

---

Built with ❤️ on Movement Network
