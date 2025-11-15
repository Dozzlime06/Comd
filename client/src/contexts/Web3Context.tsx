import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { type Wallet as WalletType, type NFT, type Balance } from "@shared/schema";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { prepareContractCall, sendTransaction, getContract, readContract } from "thirdweb";
import { client, baseChain } from "@/lib/web3";

interface Web3ContextType {
  wallet: WalletType | null;
  isConnecting: boolean;
  mintNFT: () => Promise<string>;
  getBalance: () => Promise<Balance>;
  getNFTs: () => Promise<NFT[]>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

// Contract addresses
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base mainnet
// const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia testnet (uncomment if using testnet)
const NFT_CONTRACT_ADDRESS = "0x859078e89E58B0Ab0021755B95360f48fBa763dd";
const MINT_PRICE = BigInt("1000000"); // 1 USDC (6 decimals) - ADJUST THIS TO YOUR ACTUAL MINT PRICE

export function Web3Provider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  
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

  // Check USDC balance
  const checkUSDCBalance = useCallback(async (requiredAmount: bigint): Promise<boolean> => {
    if (!activeAccount) return false;
    
    try {
      const usdcContract = getContract({
        client,
        chain: baseChain,
        address: USDC_ADDRESS,
      });

      const balance = await readContract({
        contract: usdcContract,
        method: "function balanceOf(address account) view returns (uint256)",
        params: [activeAccount.address],
      });

      return balance >= requiredAmount;
    } catch (error) {
      console.error("Balance check error:", error);
      return false;
    }
  }, [activeAccount]);

  // Mint NFT with USDC payment
  const mintNFT = useCallback(async (): Promise<string> => {
    if (!activeAccount || !activeWallet) {
      throw new Error("Wallet not connected");
    }
    
    try {
      // Step 1: Check USDC balance
      console.log("Checking USDC balance...");
      const hasEnoughUSDC = await checkUSDCBalance(MINT_PRICE);
      
      if (!hasEnoughUSDC) {
        throw new Error(`Insufficient USDC balance. You need at least ${Number(MINT_PRICE) / 1000000} USDC to mint.`);
      }

      // Step 2: Approve USDC spending
      console.log("Approving USDC spending...");
      const usdcContract = getContract({
        client,
        chain: baseChain,
        address: USDC_ADDRESS,
      });

      const approveTransaction = prepareContractCall({
        contract: usdcContract,
        method: "function approve(address spender, uint256 amount)",
        params: [NFT_CONTRACT_ADDRESS, MINT_PRICE],
      });

      const approvalResult = await sendTransaction({
        transaction: approveTransaction,
        account: activeAccount,
      });

      console.log("USDC approved, tx hash:", approvalResult.transactionHash);

      // Wait for approval confirmation
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 3: Mint NFT
      console.log("Minting NFT...");
      const nftContract = getContract({
        client,
        chain: baseChain,
        address: NFT_CONTRACT_ADDRESS,
      });

      const mintTransaction = prepareContractCall({
        contract: nftContract,
        method: "function mint(address to)",
        params: [activeAccount.address],
      });

      const mintResult = await sendTransaction({
        transaction: mintTransaction,
        account: activeAccount,
      });

      console.log("NFT minted successfully! Tx hash:", mintResult.transactionHash);
      return mintResult.transactionHash;
      
    } catch (error: any) {
      console.error("Mint error details:", error);
      
      // User rejected transaction
      if (error.message?.includes("user rejected") || error.code === 4001) {
        throw new Error("Transaction cancelled by user");
      }
      
      // Insufficient USDC
      if (error.message?.includes("insufficient") || error.message?.includes("USDC balance")) {
        throw new Error(error.message);
      }
      
      // Contract execution reverted
      if (error.code === 3 || error.message?.includes("execution reverted")) {
        throw new Error("Mint failed: Contract rejected the transaction. Please ensure you have enough USDC and the contract is active.");
      }
      
      // Generic error
      throw new Error(error.message || "Failed to mint NFT. Please try again.");
    }
  }, [activeAccount, activeWallet, checkUSDCBalance]);

  // Get wallet balances
  const getBalance = useCallback(async (): Promise<Balance> => {
    if (!wallet) {
      throw new Error("Wallet not connected");
    }
    
    try {
      const { getUSDCBalance, getETHBalance } = await import("@/lib/web3");
      const [usdc, native] = await Promise.all([
        getUSDCBalance(wallet.address),
        getETHBalance(wallet.address),
      ]);

      return {
        usdc: parseFloat(usdc).toFixed(2),
        native: parseFloat(native).toFixed(4),
      };
    } catch (error) {
      console.error("Get balance error:", error);
      return {
        usdc: "0.00",
        native: "0.0000",
      };
    }
  }, [wallet]);

  // Get owned NFTs
  const getNFTs = useCallback(async (): Promise<NFT[]> => {
    if (!wallet) {
      throw new Error("Wallet not connected");
    }
    
    try {
      const { getOwnedNFTs } = await import("@/lib/web3");
      const nfts = await getOwnedNFTs(wallet.address);
      
      return nfts.map((nft) => ({
        tokenId: nft.tokenId,
        name: nft.name,
        description: undefined,
        image: nft.tokenURI,
        owner: nft.owner,
      }));
    } catch (error) {
      console.error("Get NFTs error:", error);
      return [];
    }
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
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}
