import { useState, useEffect } from 'react';
import Web3 from 'web3';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import './App.css';
          <button
            style={{
              marginLeft: 'auto',
              padding: '6px 18px',
              borderRadius: '50%',
              border: 'none',
              background: nightMode ? '#222b3a' : '#e3eaf5',
              color: nightMode ? '#f7e06e' : '#222b3a',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1.5rem',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: nightMode ? '0 1px 4px rgba(0,0,0,0.25)' : '0 1px 4px rgba(0,0,0,0.08)',
              transition: 'background 0.2s, color 0.2s'
            }}
            title={nightMode ? 'Przełącz na tryb dzienny' : 'Przełącz na tryb nocny'}
            onClick={() => {
              setNightMode(m => {
                localStorage.setItem('nightMode', (!m).toString())
                return !m
              })
            }}
          >
            {nightMode ? '☀️' : '🌙'}
          </button>
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

  // EIP-5792: Batch Increasing with FALLBACK (IMPROVED VERSION)

  const batchIncrement = async () => {
    console.log('🚀 batchIncrement called');
    if (!contract) {
      alert('Contract is not ready. Try connecting your wallet or wait for initialization.');
      return;
    }
    if (!walletAddress || !web3) {
      alert('Wallet is not connected.');
      return;
    }
    setBatchLoading(true);
    setBatchStatus(null);
  // Spinner overlay
  const Spinner = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.3)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 60,
        height: 60,
        border: '8px solid #3D7FFF',
        borderTop: '8px solid #fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        background: 'transparent',
      }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`}</style>
    </div>
  );

  // Step 1: Check if EIP-5792 is supported
  console.log('🔍 Checking if wallet supports EIP-5792...');
  console.log('WalletProvider:', walletProvider);
  console.log('Wallet address:', walletAddress);
    
    let supportsEIP5792 = false;
    
    if (walletProvider) {
      try {
        const capabilities = await walletProvider.request({
          method: 'wallet_getCapabilities',
          params: [walletAddress]
        });
        console.log('✅ EIP-5792 supported! Capabilities:', capabilities);
        supportsEIP5792 = true;
      } catch (err) {
        console.log('❌ wallet_getCapabilities not working:', err.message);
        supportsEIP5792 = false;
      }
    }

  // Step 2: If EIP-5792 is supported, try wallet_sendCalls
    if (supportsEIP5792 && walletProvider) {
      console.log('💎 Trying EIP-5792 wallet_sendCalls...');
      
      try {
        const calls = Array.from({length: batchCount}, () => ({
          to: CONTRACT_ADDRESS,
          value: '0x0',
          data: contract.methods.increment().encodeABI()
        }));

        const batchId = await walletProvider.request({
          method: 'wallet_sendCalls',
          params: [{
            from: walletAddress,
            chainId: BASE_CHAIN_ID,
            atomicRequired: false,
            calls
          }]
        });

  console.log('✅ Batch sent! ID:', batchId);

        // Polling statusu
        let attempts = 0;
        const maxAttempts = 30;
        
        const pollInterval = setInterval(async () => {
          attempts++;
          
          try {
            const status = await walletProvider.request({
              method: 'wallet_getCallsStatus',
              params: [batchId]
            });

            console.log(`📊 Batch status (attempt ${attempts}):`, status);

            if (status.status === 'CONFIRMED') {
              clearInterval(pollInterval);
              setBatchStatus({
                atomic: status.atomic,
                receipts: status.receipts
              });
              alert('✅ Batch wykonany pomyślnie przez EIP-5792!');
              setTimeout(() => {
                loadCounterValue();
                loadRecentTransactions();
              }, 2000);
              setBatchLoading(false);
            } else if (status.status === 'FAILED') {
              clearInterval(pollInterval);
              setBatchStatus({ error: 'Batch failed' });
              alert('❌ Batch nie powiódł się');
              setBatchLoading(false);
            }
          } catch (statusErr) {
            console.error('Błąd sprawdzania statusu:', statusErr);
          }
          
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setBatchStatus({ error: '⏱️ Timeout checking batch status' });
            setShowSuccessModal(true);
            setBatchLoading(false);
          }
        }, 2000);

        return; // Sukces - wyjdź z funkcji
        
      } catch (sendCallsError) {
        console.log('❌ wallet_sendCalls nie zadziałało:', sendCallsError.message);
        console.log('🔄 Przełączam na fallback...');
        // Kontynuuj do fallback poniżej
      }
    }

    // Krok 3: FALLBACK - wykonaj 2 osobne transakcje
    console.log(`🔄 Fallback: wykonuję ${batchCount} osobnych transakcji sekwencyjnie`);
    console.log('Contract:', contract);
    console.log('Web3:', web3);
    
    try {
      const gasEstimate = await contract.methods.increment().estimateGas({
        from: walletAddress
      });

      console.log('⛽ Gas estimate:', gasEstimate);

      // Pierwsza transakcja
      console.log('📤 Wysyłam transakcję #1...');
      const tx1 = await contract.methods.increment().send({
        from: walletAddress,
        gas: Math.floor(Number(gasEstimate) * 1.2)
      });
      console.log('✅ Transakcja #1 wykonana:', tx1.transactionHash);

      // Druga transakcja
      console.log('📤 Wysyłam transakcję #2...');
      const tx2 = await contract.methods.increment().send({
        from: walletAddress,
        gas: Math.floor(Number(gasEstimate) * 1.2)
      });
      console.log('✅ Transakcja #2 wykonana:', tx2.transactionHash);

      setBatchStatus({ 
        atomic: false, 
        receipts: [
          { transactionHash: tx1.transactionHash, status: '0x1' },
          { transactionHash: tx2.transactionHash, status: '0x1' }
        ],
        success: '✅ 2 transactions successfully executed! (fallback - no atomic batch)'
      });
      setShowSuccessModal(true);
      setTimeout(() => {
        loadCounterValue();
        loadRecentTransactions();
      }, 2000);
      setBatchLoading(false);

    } catch (fallbackError) {
      console.error('❌ Fallback error:', fallbackError);
      let errorMessage = 'Transaction error: ' + fallbackError.message;
      if (fallbackError.message.includes('User denied')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (fallbackError.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas fees';
      }
      setBatchStatus({ error: errorMessage });
      setShowSuccessModal(true);
      setBatchLoading(false);
    }
  };

  useEffect(() => {
    console.log('useEffect: check wallet connection')
    const isManuallyDisconnected = localStorage.getItem('walletDisconnected') === 'true'
    
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
    console.log('useEffect: contract changed', contract)
    if (contract) {
      loadCounterValue()
    }
  }, [contract])

  useEffect(() => {
    console.log('useEffect: appKitConnected', appKitConnected, 'address', address, 'walletProvider', walletProvider)
    if (appKitConnected && address && walletProvider) {
      setIsConnected(true)
      setWalletAddress(address)
      
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
    console.log('useEffect: contract/web3 for recent tx', contract, web3)
    if (contract && web3) {
      loadRecentTransactions()
      const interval = setInterval(loadRecentTransactions, 30000)
      return () => clearInterval(interval)
    }
  }, [contract, web3])

  const connectWallet = async () => {
    console.log('connectWallet called')
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

        localStorage.removeItem('walletDisconnected')

        if (window.ethereum && window.ethereum.on) {
          if (window.ethereum && window.ethereum.on) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
          }
          if (window.ethereum && window.ethereum.on) {
            window.ethereum.on('chainChanged', handleChainChanged);
          }
        }
        
        contractInstance.events.CounterIncreased()
        .on('data', async (event) => {
          console.log('New increment event:', event)
          
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
    console.log('switchToBaseMainnet called')
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
    console.log('handleAccountsChanged', accounts)
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
    console.log('handleChainChanged')
    window.location.reload()
  }

  const disconnectWallet = () => {
    console.log('disconnectWallet called')
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
    console.log('loadCounterValue called')
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
    console.log('increaseCounter called')
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
    console.log('loadRecentTransactions called')
    if (!web3 || !contract) {
      console.log('Web3 or contract not available yet')
      return
    }

    try {
      setLoadingTx(true)
      
      const currentBlock = await web3.eth.getBlockNumber()
      const fromBlock = Math.max(0, Number(currentBlock) - 1000)
      
      console.log('Loading events from block:', fromBlock, 'to', currentBlock)
      
      const events = await contract.getPastEvents('CounterIncreased', {
        fromBlock: fromBlock,
        toBlock: 'latest'
      })
      
      console.log('Found events:', events.length)
      
      if (events.length > 0) {
        const formattedTxs = []
        
        for (let i = Math.max(0, events.length - 10); i < events.length; i++) {
          const event = events[i]
          try {
            const block = await web3.eth.getBlock(event.blockNumber)
            
            formattedTxs.push({
              hash: event.transactionHash,
              from: event.returnValues.increasedBy,
              timestamp: Number(block.timestamp) * 1000,
              blockNumber: Number(event.blockNumber),
              newCount: event.returnValues.newCount
            })
          } catch (blockError) {
            console.error('Error getting block details:', blockError)
          }
        }
        
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
    <div>
      <div className={`App${nightMode ? ' night' : ''}`} style={{ minHeight: '100vh', width: '100vw', overflowX: 'hidden', position: 'relative', background: nightMode ? '#10151c' : 'var(--bg)' }}> 
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

        {showSuccessModal && (
          <div className="modal-overlay">
            <div className="success-modal-content">
              <div className="success-icon" style={{ color: nightMode ? '#b0b8c1' : '', filter: nightMode ? 'brightness(0.7) grayscale(0.5)' : '' }}>👍</div>
              <h3 style={{ color: nightMode ? '#b0b8c1' : '' }}>You Got It!</h3>
              <div style={{ margin: '12px 0', textAlign: 'left' }}>
                {batchStatus && Array.isArray(batchStatus.receipts) && batchStatus.receipts.length > 0 ? (
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: '6px' }}>Batch transaction links:</div>
                    <ul style={{ paddingLeft: '18px', margin: 0 }}>
                      {batchStatus.receipts.map((r, i) => (
                        r.transactionHash ? (
                          <li key={i} style={{ marginBottom: '4px' }}>
                            <a
                              href={`https://basescan.org/tx/${r.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 500, fontSize: '0.8rem' }}
                            >
                              Tx #{i + 1}: {r.transactionHash.slice(0, 10)}...
                            </a>
                          </li>
                        ) : null
                      ))}
                    </ul>
                  </div>
                ) : (
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
                )}
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
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                      <button 
                        className="increase-btn" 
                        onClick={batchIncrement}
                        disabled={batchLoading || isLoading}
                        style={{ background: nightMode ? '#1c2a4d' : '#2563eb', color: '#fff', filter: nightMode ? 'brightness(0.85)' : 'brightness(0.92)' }}
                      >
                        {batchLoading ? 'Batching...' : 'Batch Increasing'}
                      </button>
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        <label htmlFor="batchCount" style={{ fontSize: '13px', marginRight: '6px', color: nightMode ? '#b0b8c1' : '#222b3a' }}>Tx count:</label>
                        <select
                          id="batchCount"
                          <select
                            value={batchCount}
                            onChange={e => setBatchCount(Number(e.target.value))}
                            disabled={batchLoading || isLoading}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #ccc',
                              background: nightMode ? '#222b3a' : '#f6faf7',
                              color: nightMode ? '#b0b8c1' : '#222b3a',
                              fontWeight: 500,
                              fontSize: '1rem',
                              cursor: batchLoading || isLoading ? 'not-allowed' : 'pointer',
                              minWidth: '48px'
                            }}
                          >
                            {[2,3,4,5,6,7,8,9,10].map(n => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                      </span>
                    </div>
                    {/* Batch status details: show links to txs if batchStatus.receipts */}
                    {batchStatus && batchStatus.receipts && (
                      <div style={{marginTop: '12px'}}>
                        <div style={{fontWeight:600, marginBottom:4}}>Batch Transactions:</div>
                        <ul style={{paddingLeft:16}}>
                          {batchStatus.receipts.map((r, i) => (
                            <li key={i}>
                              <a href={`https://basescan.org/tx/${r.transactionHash}`} target="_blank" rel="noopener noreferrer">
                                Tx {i+1}: {r.transactionHash.slice(0,10)}...{r.transactionHash.slice(-6)}
                              </a> {r.status === '0x1' ? '✅' : '❌'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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

      {batchLoading && <Spinner />}
    </div>
  );
}

export default App;