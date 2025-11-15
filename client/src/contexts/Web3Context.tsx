import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { type Wallet as WalletType, type NFT, type Balance } from "@shared/schema";
import { useActiveAccount, useActiveWallet, useConnect } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { client, baseChain } from "@/lib/web3";

interface Web3ContextType {
  wallet: WalletType | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  mintNFT: () => Promise<string>;
  getBalance: () => Promise<Balance>;
  getNFTs: () => Promise<NFT[]>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Use Thirdweb hooks
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { connect } = useConnect();
  
  // Update wallet state when active account changes
  useEffect(() => {
    if (activeAccount && activeWallet) {
      setWallet({
        address: activeAccount.address,
        chainId: baseChain.id,
        isConnected: true,
      });
    } else {
      setWallet(null);
    }
  }, [activeAccount, activeWallet]);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Create wallet options for the modal
      const wallets = [
        createWallet("io.metamask"),
        createWallet("com.coinbase.wallet"),
        createWallet("me.rainbow"),
        createWallet("io.rabby"),
        inAppWallet(),
      ];

      // Connect using Thirdweb's connect function with modal
      const connectedWallet = await connect({
        client,
        wallets,
        chain: baseChain,
        appMetadata: {
          name: "CMD402 NFT Terminal",
          url: "https://cmd402.terminal",
        },
        connectModal: {
          size: "wide",
          title: "Connect Wallet",
          titleIcon: "",
          showThirdwebBranding: false,
        },
      });

      return;
    } catch (error) {
      console.error("Wallet connection error:", error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [connect]);

  const disconnectWallet = useCallback(async () => {
    if (activeWallet) {
      await activeWallet.disconnect();
    }
    setWallet(null);
  }, [activeWallet]);

  const mintNFT = useCallback(async (): Promise<string> => {
    if (!wallet) {
      throw new Error("Wallet not connected");
    }

    const { mintNFT: executeMint } = await import("@/lib/web3");
    const txHash = await executeMint(wallet.address);
    return txHash;
  }, [wallet]);

  const getBalance = useCallback(async (): Promise<Balance> => {
    if (!wallet) {
      throw new Error("Wallet not connected");
    }

    const { getUSDCBalance, getETHBalance } = await import("@/lib/web3");
    const [usdc, native] = await Promise.all([
      getUSDCBalance(wallet.address),
      getETHBalance(wallet.address),
    ]);

    return {
      usdc: parseFloat(usdc).toFixed(2),
      native: parseFloat(native).toFixed(4),
    };
  }, [wallet]);

  const getNFTs = useCallback(async (): Promise<NFT[]> => {
    if (!wallet) {
      throw new Error("Wallet not connected");
    }

    const { getOwnedNFTs } = await import("@/lib/web3");
    const nfts = await getOwnedNFTs(wallet.address);
    
    return nfts.map((nft) => ({
      tokenId: nft.tokenId,
      name: nft.name,
      description: undefined,
      image: nft.tokenURI,
      owner: nft.owner,
    }));
  }, [wallet]);

  return (
    <Web3Context.Provider
      value={{
        wallet,
        isConnecting,
        connectWallet,
        disconnectWallet,
        mintNFT,
        getBalance,
        getNFTs,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}

