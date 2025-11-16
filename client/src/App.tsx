import { ThirdwebProvider } from "@thirdweb-dev/react";
import { Base } from "@thirdweb-dev/chains";
import { Web3Provider } from "./contexts/web3context";
import { Terminal } from "./components/terminal";

/**
 * Main App Component with ThirdwebProvider Configuration
 * 
 * IMPORTANT: To show all 500+ wallet options (MetaMask, Coinbase, WalletConnect, 
 * Rainbow, Rabby, OKX, etc.), do NOT specify supportedWallets prop or set it to undefined.
 */

function App() {
  return (
    <ThirdwebProvider
      // Active chain - Base mainnet
      activeChain={Base}
      
      // Your Thirdweb Client ID (get from https://thirdweb.com/dashboard)
      clientId={import.meta.env.VITE_THIRDWEB_CLIENT_ID || "your-client-id-here"}
      
      // CRITICAL: Remove supportedWallets or set to undefined to show ALL wallets
      // This will automatically display 500+ wallet options including:
      // - MetaMask (recommended)
      // - Coinbase Wallet
      // - WalletConnect
      // - Rainbow
      // - Rabby
      // - OKX Wallet
      // - Trust Wallet
      // - Zerion
      // - And 500+ more...
      
      // Option 1: Don't specify supportedWallets at all (RECOMMENDED)
      // This is the current setup - no supportedWallets prop
      
      // Option 2: Explicitly set to undefined
      // supportedWallets={undefined}
      
      // Option 3: If you want to customize wallet order (NOT RECOMMENDED if you want all wallets)
      /*
      supportedWallets={[
        metamaskWallet({ recommended: true }),
        coinbaseWallet(),
        walletConnect(),
        rainbowWallet(),
        trustWallet(),
        rabbyWallet(),
        okxWallet(),
        zerionWallet(),
      ]}
      */
      
      // Automatically switch to the active chain when connecting
      autoSwitch={true}
      
      // Additional configuration
      dAppMeta={{
        name: "CMDH02 Terminal",
        description: "Web3 Terminal Interface",
        logoUrl: "https://your-logo-url.com/logo.png", // Optional
        url: "https://your-app-url.com", // Optional
        isDarkMode: true,
      }}
    >
      <Web3Provider>
        <Terminal />
      </Web3Provider>
    </ThirdwebProvider>
  );
}

export default App;
