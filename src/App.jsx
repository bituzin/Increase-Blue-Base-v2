import { useState, useEffect } from 'react';
import Web3 from 'web3'
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import './App.css'

const CONTRACT_ADDRESS = "0x78776b0d6185D97Ca9a9A822bf1E192e3B44307f"
const BASE_CHAIN_ID = "0x2105" // Base Mainnet
const BASESCAN_URL = "https://basescan.org/tx/"

const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "increment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",		
        "name": "newCount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "increasedBy",
        "type": "address"
      }
    ],
    "name": "CounterIncreased",
    "type": "event"
  }
]

function App() {
  const [nightMode, setNightMode] = useState(() => {
    const saved = localStorage.getItem('nightMode')
    return saved === 'true'
  })
  const { open } = useAppKit()
  const { address, isConnected: appKitConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('eip155')
  const [web3, setWeb3] = useState(null)
  const [contract, setContract] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [counterValue, setCounterValue] = useState(0)
  const [showNetworkModal, setShowNetworkModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [loadingTx, setLoadingTx] = useState(false)

  useEffect(() => {
    // Check if user manually disconnected
    const isManuallyDisconnected = localStorage.getItem('walletDisconnected') === 'true'
    
    // Check if wallet is already connected
    if (window.ethereum && !isManuallyDisconnected) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            connectWallet()
          }
        })
    }
  }, [])

  useEffect(() => {
    if (contract) {
      loadCounterValue()
    }
  }, [contract])

  // Sync with AppKit connection state
  useEffect(() => {
    if (appKitConnected && address && walletProvider) {
      setIsConnected(true)
      setWalletAddress(address)
      
      // Initialize Web3 with WalletConnect provider
      const web3Instance = new Web3(walletProvider)
      setWeb3(web3Instance)
      
      const contractInstance = new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS)
      setContract(contractInstance)
    } else if (!appKitConnected) {
      setIsConnected(false)
      setWalletAddress('')
      setContract(null)
      setWeb3(null)
      setCounterValue(0)
    }
  }, [appKitConnected, address, walletProvider])

  useEffect(() => {
    // Load recent transactions when contract is available
    if (contract && web3) {
      loadRecentTransactions()
      
      // Set up interval to refresh transactions every 30 seconds
      const interval = setInterval(loadRecentTransactions, 30000)
      
      return () => clearInterval(interval)
    }
  }, [contract, web3])

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setIsLoading(true)
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        })

        const web3Instance = new Web3(window.ethereum)
        setWeb3(web3Instance)

        const chainId = await web3Instance.eth.getChainId()
        
        if (chainId.toString() !== parseInt(BASE_CHAIN_ID, 16).toString()) {
          setShowNetworkModal(true)
          setIsLoading(false)
          return
        }

        const contractInstance = new web3Instance.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS)
        setContract(contractInstance)
        
        setWalletAddress(accounts[0])
        setIsConnected(true)
        setIsLoading(false)

        // Clear the disconnected flag
        localStorage.removeItem('walletDisconnected')

        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged)
        window.ethereum.on('chainChanged', handleChainChanged)
        
        // Listen for new CounterIncreased events
        contractInstance.events.CounterIncreased()
        .on('data', async (event) => {
          console.log('New increment event:', event)
          
          // Add new transaction to the beginning of the list
          try {
            const block = await web3Instance.eth.getBlock(event.blockNumber)
            const newTx = {
              hash: event.transactionHash,
              from: event.returnValues.increasedBy,
              timestamp: Number(block.timestamp) * 1000,
              blockNumber: Number(event.blockNumber),
              newCount: event.returnValues.newCount
            }
            
            setRecentTransactions(prev => [newTx, ...prev.slice(0, 9)])
          } catch (error) {
            console.error('Error processing new event:', error)
          }
        })
        .on('error', console.error)
        
      } catch (error) {
        console.error('Error connecting wallet:', error)
        setIsLoading(false)
      }
    } else {
      alert('Please install MetaMask to use this DApp!')
    }
  }

  const switchToBaseMainnet = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID }]
      })
      setShowNetworkModal(false)
      connectWallet()
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BASE_CHAIN_ID,
              chainName: 'Base Mainnet',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]
          })
          setShowNetworkModal(false)
          connectWallet()
        } catch (addError) {
          console.error('Error adding Base network:', addError)
        }
      } else {
        console.error('Error switching network:', error)
      }
    }
  }

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setIsConnected(false)
      setWalletAddress('')
      setContract(null)
      setWeb3(null)
    } else {
      setWalletAddress(accounts[0])
    }
  }

  const handleChainChanged = () => {
    window.location.reload()
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setWalletAddress('')
    setContract(null)
    setWeb3(null)
    setCounterValue(0)
    
    localStorage.setItem('walletDisconnected', 'true')
    
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged')
      window.ethereum.removeAllListeners('chainChanged')
    }
  }

  const loadCounterValue = async () => {
    if (contract) {
      try {
        const count = await contract.methods.getCount().call()
        setCounterValue(count.toString())
      } catch (error) {
        console.error('Error loading counter value:', error)
      }
    }
  }

  const increaseCounter = async () => {
    if (!contract || !walletAddress || !web3) {
      alert('Wallet not properly connected. Please reconnect.')
      return
    }

    try {
      setIsLoading(true)
      
      const chainId = await web3.eth.getChainId()
      if (chainId.toString() !== parseInt(BASE_CHAIN_ID, 16).toString()) {
        setShowNetworkModal(true)
        setIsLoading(false)
        return
      }

      const gasEstimate = await contract.methods.increment().estimateGas({
        from: walletAddress
      })

      const transaction = await contract.methods.increment().send({
        from: walletAddress,
        gas: Math.floor(Number(gasEstimate) * 1.2)
      })

      console.log('Transaction successful:', transaction)
      
      setShowSuccessModal(true)
      
      setTimeout(() => {
        loadCounterValue()
        loadRecentTransactions()
      }, 2000)
      
      setIsLoading(false)
    } catch (error) {
      console.error('Error increasing counter:', error)
      setIsLoading(false)
      
      let errorMessage = 'Transaction failed. Please try again.'
      if (error.message.includes('User denied')) {
        errorMessage = 'Transaction was cancelled by user.'
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas fees.'
      }
      
      alert(errorMessage)
    }
  }

  const loadRecentTransactions = async () => {
    if (!web3 || !contract) {
      console.log('Web3 or contract not available yet')
      return
    }

    try {
      setLoadingTx(true)
      
      // Get past events from the last 1000 blocks
      const currentBlock = await web3.eth.getBlockNumber()
      const fromBlock = Math.max(0, Number(currentBlock) - 1000)
      
      console.log('Loading events from block:', fromBlock, 'to', currentBlock)
      
      const events = await contract.getPastEvents('CounterIncreased', {
        fromBlock: fromBlock,
        toBlock: 'latest'
      })
      
      console.log('Found events:', events.length)
      
      if (events.length > 0) {
        // Get block details for timestamps
        const formattedTxs = []
        
        for (let i = Math.max(0, events.length - 10); i < events.length; i++) {
          const event = events[i]
          try {
            const block = await web3.eth.getBlock(event.blockNumber)
            
            formattedTxs.push({
              hash: event.transactionHash,
              from: event.returnValues.increasedBy,
              timestamp: Number(block.timestamp) * 1000, // Convert to milliseconds
              blockNumber: Number(event.blockNumber), // Convert BigInt to Number
              newCount: event.returnValues.newCount
            })
          } catch (blockError) {
            console.error('Error getting block details:', blockError)
          }
        }
        
        // Sort by block number (newest first)
        formattedTxs.sort((a, b) => b.blockNumber - a.blockNumber)
        
        setRecentTransactions(formattedTxs.slice(0, 10))
      } else {
        setRecentTransactions([])
      }
    } catch (error) {
      console.error('Error loading recent transactions:', error)
      setRecentTransactions([])
    } finally {
      setLoadingTx(false)
    }
  }

  const formatTimeAgo = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
  <div className={`App${nightMode ? ' night' : ''}`} style={{ minHeight: '100vh', width: '100vw', overflowX: 'hidden', position: 'relative', background: nightMode ? '#10151c' : 'var(--bg)' }}> 
      {/* Network Modal */}
      {showNetworkModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Switch to Base Mainnet</h3>
            <p>This DApp only works on Base Mainnet. Please switch your wallet network to continue.</p>
            <button className="switch-btn" onClick={switchToBaseMainnet}>
              Switch Network
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="success-modal-content">
            <div className="success-icon" style={{ color: nightMode ? '#b0b8c1' : '', filter: nightMode ? 'brightness(0.7) grayscale(0.5)' : '' }}>👍</div>
            <h3 style={{ color: nightMode ? '#b0b8c1' : '' }}>You Got It!</h3>
            {/* View your increasing link po lewej stronie */}
            <div style={{ margin: '12px 0', textAlign: 'left' }}>
              <a
                href={
                  recentTransactions.length > 0
                    ? `https://basescan.org/tx/${recentTransactions[0].hash}`
                    : `https://basescan.org/address/${CONTRACT_ADDRESS}`
                }
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 500, fontSize: '0.8rem' }}
              >
                View your increasing
              </a>
            </div>
            <button 
              className="switch-btn" 
              onClick={() => setShowSuccessModal(false)}
              style={{ marginTop: '8px', fontSize: '13px', padding: '4px 12px', borderRadius: '6px', background: nightMode ? '#22305a' : '#2563eb', color: nightMode ? '#b0b8c1' : '#fff', border: 'none', cursor: 'pointer', filter: nightMode ? 'brightness(0.7) grayscale(0.5)' : '' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="header" style={{ 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        background: nightMode ? 'linear-gradient(90deg, #181e29, #222b3a)' : '',
        color: nightMode ? '#b0b8c1' : '',
        borderBottom: nightMode ? '1px solid #222b3a' : ''
      }}>
        <div className="brand">
          <div className="title" style={{ color: nightMode ? '#b0b8c1' : '' }}>
            Increase Blue
            <div className="base-symbol" style={{ background: nightMode ? '#222b3a' : 'rgba(255,255,255,0.2)', color: nightMode ? '#b0b8c1' : '' }}>BASE</div>
          </div>
        </div>
        <button 
          style={{
            marginLeft: 'auto',
            padding: '6px 18px',
            borderRadius: '8px',
            border: 'none',
            background: nightMode ? '#222b3a' : '#e3eaf5',
            color: nightMode ? '#b0b8c1' : '#222b3a',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '1rem',
            boxShadow: nightMode ? '0 1px 4px rgba(0,0,0,0.25)' : '0 1px 4px rgba(0,0,0,0.08)',
            marginTop: '8px',
            minWidth: '90px',
            maxWidth: '120px',
            whiteSpace: 'nowrap',
            transition: 'background 0.2s, color 0.2s'
          }}
          onClick={() => {
            setNightMode(m => {
              localStorage.setItem('nightMode', (!m).toString())
              return !m
            })
          }}
        >
          {nightMode ? 'Day' : 'Night'}
        </button>
      </div>

      {/* Main Container */}
  <div className="container" style={{paddingBottom: '60px'}}>
        <div className="left">
          <h2 style={{ color: nightMode ? '' : 'var(--base-blue)' }}>Counter</h2>
          
          <div className="counter-section">
            <div style={{ color: nightMode ? '#b0b8c1' : '' }}>Total Increases</div>
            <div className="counter-value">{counterValue}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Since Deployment</div>
            
            <div className="button-container">
              {!isConnected ? (
                <button 
                  className="connect-btn" 
                  onClick={() => open()}
                >
                  Connect Wallet
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                    Connected: {formatAddress(walletAddress)}
                  </div>
                  <button 
                    className="increase-btn" 
                    onClick={increaseCounter}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Increase'}
                  </button>
                  <button 
                    className="disconnect-btn" 
                    onClick={disconnectWallet}
                    disabled={isLoading}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="right">
          <h2 style={{ color: nightMode ? '' : 'var(--base-blue)' }}>More Info</h2>
          
          <div className="info-section">
            <div className="info-item">
              <div className="info-label">Contract Address</div>
              <div className="info-value">
                <a 
                  href={`https://basescan.org/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="address-link"
                >
                  {formatAddress(CONTRACT_ADDRESS)}
                </a>
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Network</div>
              <div className="info-value" style={{ color: nightMode ? '#3D7FFF' : '#0b1720' }}>Base Mainnet</div>
            </div>
            <div className="info-item">
              <div className="info-label">Status</div>
              <div className="info-value status-connected" style={{ color: nightMode ? (isConnected ? '#4fa87b' : '#b85c5c') : (isConnected ? '#35D07F' : '#dc3545') }}>
                {isConnected 
                  ? <span style={{fontSize:'1.1em', filter: nightMode ? 'grayscale(0.7) brightness(0.7)' : 'none'}}>🟢</span> 
                  : <span style={{fontSize:'1.1em', filter: nightMode ? 'grayscale(0.7) brightness(0.7)' : 'none'}}>🔴</span>
                } 
                <span style={{opacity: nightMode ? 0.8 : 1}}>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
          </div>
          <div className="transactions-section">
            <h3 style={{ fontSize: '0.8rem', marginBottom: '8px' }}>
              <a
                href="https://basescan.org/address/0x78776b0d6185D97Ca9a9A822bf1E192e3B44307f"
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  color: nightMode ? '#3D7FFF' : '#2563eb', 
                  textDecoration: 'underline', 
                  fontWeight: 500,
                  background: 'transparent'
                }}
              >
                View All Transactions
              </a>
            </h3>
          </div>
        </div>
      </div>
      <div className="byline-bottom" style={{position: 'fixed', left: 0, bottom: 0, width: '100%', textAlign: 'center', fontSize: '0.9rem', color: nightMode ? '#b0b8c1' : 'var(--muted)', fontStyle: 'italic', background: nightMode ? '#181e29' : 'transparent', zIndex: 999}}>
        by bituzin
      </div>
    </div>
  );
}

export default App;