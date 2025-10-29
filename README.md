# Increase Blue - React DApp

A React-based decentralized application (DApp) that allows users to connect their wallet and increment a global counter stored on the Base Mainnet blockchain.

## Features

- 🔗 **Wallet Connection**: Connect MetaMask or other Web3 wallets
- ⚡ **Base Mainnet**: Built specifically for Base blockchain
- 🔢 **Global Counter**: Increment a shared counter stored on-chain
- 🎨 **Modern UI**: Clean, responsive design with Base branding
- ✅ **Real-time Updates**: Live counter updates after transactions

## Technology Stack

- **Frontend**: React 18 with Vite
- **Blockchain**: Base Mainnet (Ethereum L2)
- **Web3 Library**: Web3.js
- **Styling**: CSS3 with CSS Variables
- **Font**: Inter from Google Fonts

## Smart Contract

- **Address**: `0x78776b0d6185D97Ca9a9A822bf1E192e3B44307f`
- **Network**: Base Mainnet
- **Chain ID**: `0x2105` (8453)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MetaMask browser extension
- Base Mainnet added to your wallet

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3000`

### Usage

1. **Connect Wallet**: Click "Connect Wallet" to connect your MetaMask
2. **Switch Network**: The app will prompt you to switch to Base Mainnet if needed
3. **Increase Counter**: Click "Increase" to increment the global counter
4. **View Transactions**: All transactions are viewable on BaseScan

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Network Configuration

The DApp automatically handles Base Mainnet configuration:

```javascript
{
  chainId: '0x2105',
  chainName: 'Base Mainnet',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org']
}
```

## Contract Functions

- `increment()`: Increases the counter by 1
- `getCount()`: Returns the current counter value
- `CounterIncreased` event: Emitted when counter is incremented

## Author

Created by **bituzin**

## License

MIT License