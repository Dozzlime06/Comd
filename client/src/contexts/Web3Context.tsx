import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAddress, useSDK, useContract, useContractRead } from "@thirdweb-dev/react";
import { ethers } from "ethers";

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
const BASE_CHAIN_ID = 8453; // Base L2
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const NFT_CONTRACT_ADDRESS = "0x859078e89E58B0Ab0021755B95360f48fBa763dd";
const MINT_PRICE = ethers.utils.parseUnits("1", 6); // 1 USDC (6 decimals)

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Use the correct hooks
  const address = useAddress();
  const sdk = useSDK();

  // Get contract instances
  const { contract: usdcContract } = useContract(USDC_ADDRESS, "token");
  const { contract: nftContract } = useContract(NFT_CONTRACT_ADDRESS, "nft-collection");

  useEffect(() => {
    if (address && sdk) {
      setWallet({
        address: address,
        chainId: BASE_CHAIN_ID,
        isConnected: true,
      });
    } else {
      setWallet(null);
    }
  }, [address, sdk]);

  const checkUSDCBalance = useCallback(async (requiredAmount: ethers.BigNumber) => {
    if (!wallet || !usdcContract) return false;
    
    try {
      const balance = await usdcContract.erc20.balanceOf(wallet.address);
      return balance.value.gte(requiredAmount);
    } catch (error) {
      console.error("Error checking USDC balance:", error);
      return false;
    }
  }, [wallet, usdcContract]);

  const mintNFT = useCallback(async (): Promise<string> => {
    if (!wallet) throw new Error("Wallet not connected");
    if (!sdk) throw new Error("SDK not initialized");
    if (!usdcContract) throw new Error("USDC contract not loaded");
    if (!nftContract) throw new Error("NFT contract not loaded");

    try {
      // 1. Check USDC balance
      const hasEnough = await checkUSDCBalance(MINT_PRICE);
      if (!hasEnough) throw new Error("Insufficient USDC balance to mint.");

      // 2. Approve NFT contract to spend USDC
      console.log("Approving USDC...");
      const approveTx = await usdcContract.erc20.setAllowance(
        NFT_CONTRACT_ADDRESS,
        MINT_PRICE.toString()
      );
      console.log("Approval tx:", approveTx);

      // 3. Mint NFT
      console.log("Minting NFT...");
      const mintTx = await nftContract.erc721.mint({
        name: `CMD402 NFT`,
        description: "Minimalist 2D Terminal NFT",
        image: "", // Optional: Add your IPFS or image URL
      });

      return mintTx.receipt.transactionHash;
    } catch (error) {
      console.error("Mint error:", error);
      throw error;
    }
  }, [wallet, sdk, usdcContract, nftContract, checkUSDCBalance]);

  const getBalance = useCallback(async (): Promise<Balance> => {
    if (!wallet) throw new Error("Wallet not connected");
    if (!sdk) throw new Error("SDK not initialized");
    if (!usdcContract) throw new Error("USDC contract not loaded");

    try {
      // Get USDC balance
      const usdcBalance = await usdcContract.erc20.balanceOf(wallet.address);
      
      // Get native ETH balance
      const provider = sdk.getProvider();
      const nativeBalance = await provider.getBalance(wallet.address);

      return {
        usdc: ethers.utils.formatUnits(usdcBalance.value, 6),
        native: ethers.utils.formatEther(nativeBalance),
      };
    } catch (error) {
      console.error("Error fetching balance:", error);
      throw error;
    }
  }, [wallet, sdk, usdcContract]);

  const getNFTs = useCallback(async (): Promise<NFT[]> => {
    if (!wallet) throw new Error("Wallet not connected");
    if (!nftContract) throw new Error("NFT contract not loaded");

    try {
      const owned = await nftContract.erc721.getOwned(wallet.address);
      
      return owned.map(nft => ({
        tokenId: nft.metadata.id,
        name: nft.metadata.name || "Unnamed NFT",
        image: nft.metadata.image || "",
        owner: nft.owner,
      }));
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      return [];
    }
  }, [wallet, nftContract]);

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
