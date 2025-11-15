import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { prepareContractCall, sendTransaction, readContract, getContract } from "thirdweb";
import { createThirdwebClient } from "thirdweb";
import { base } from "thirdweb/chains";

interface Wallet {
  address: string;
  chainId: number;
  isConnected: boolean;
}

interface Balance {
  usdc: string;
  native: string;
}

interface NFT {
  tokenId: string;
  name: string;
  image: string;
  owner: string;
}

interface Web3ContextType {
  wallet: Wallet | null;
  isConnecting: boolean;
  mintNFT: () => Promise<string>;
  getBalance: () => Promise<Balance>;
  getNFTs: () => Promise<NFT[]>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

// Constants
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const NFT_CONTRACT_ADDRESS = "0x859078e89E58B0Ab0021755B95360f48fBa763dd";

// Initialize Thirdweb client - GET YOUR CLIENT ID FROM https://thirdweb.com/dashboard
const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || "your-client-id-here",
});

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const account = useActiveAccount();
  const activeWallet = useActiveWallet();

  useEffect(() => {
    if (account && activeWallet) {
      setWallet({
        address: account.address,
        chainId: base.id,
        isConnected: true,
      });
    } else {
      setWallet(null);
    }
  }, [account, activeWallet]);

  const mintNFT = useCallback(async (): Promise<string> => {
    if (!wallet || !account) throw new Error("Wallet not connected");

    try {
      // Get NFT contract
      const nftContract = getContract({
        client,
        chain: base,
        address: NFT_CONTRACT_ADDRESS,
      });

      // Prepare mint transaction
      const transaction = prepareContractCall({
        contract: nftContract,
        method: "function mint(address to)",
        params: [wallet.address],
      });

      // Send transaction
      const result = await sendTransaction({
        transaction,
        account,
      });

      return result.transactionHash;
    } catch (error) {
      console.error("Mint error:", error);
      throw error;
    }
  }, [wallet, account]);

  const getBalance = useCallback(async (): Promise<Balance> => {
    if (!wallet || !account) throw new Error("Wallet not connected");

    try {
      // Get USDC contract
      const usdcContract = getContract({
        client,
        chain: base,
        address: USDC_ADDRESS,
      });

      // Read USDC balance
      const usdcBalance = await readContract({
        contract: usdcContract,
        method: "function balanceOf(address) view returns (uint256)",
        params: [wallet.address],
      });

      // Get native ETH balance (placeholder for now)
      const nativeBalance = "0";

      return {
        usdc: (Number(usdcBalance) / 1e6).toString(),
        native: nativeBalance,
      };
    } catch (error) {
      console.error("Error fetching balance:", error);
      throw error;
    }
  }, [wallet, account]);

  const getNFTs = useCallback(async (): Promise<NFT[]> => {
    if (!wallet) throw new Error("Wallet not connected");
    
    // This needs to be implemented based on your NFT contract
    return [];
  }, [wallet]);

  return (
    <Web3Context.Provider
      value={{
        wallet,
        isConnecting,
        mintNFT,
        getBalance,
        getNFTs,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) throw new Error("useWeb3 must be used within a Web3Provider");
  return context;
}
