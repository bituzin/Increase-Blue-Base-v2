import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { base } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

// 1. Get projectId from https://cloud.reown.com
const projectId = 'c12e4a814a2dd9dcb0dd714c65a86c62'

// 2. Create wagmiAdapter
const wagmiAdapter = new WagmiAdapter({
  networks: [base],
  projectId,
  ssr: false
})

// 3. Create modal
createAppKit({
  adapters: [wagmiAdapter],
  networks: [base],
  projectId,
  metadata: {
    name: 'Increase Blue',
    description: 'Increase Blue DApp on Base Mainnet',
    url: 'http://localhost:3000',
    icons: ['https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Logo/Blue%20(Default)/Logo%20(Blue)%20-%20Large.png']
  },
  features: {
    analytics: true,
    email: false,
    socials: []
  }
})

// 4. Create query client
const queryClient = new QueryClient()

export function WagmiConfig({ children }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}