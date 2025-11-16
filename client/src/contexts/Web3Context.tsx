import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAddress, useSDK } from "@thirdweb-dev/react";
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
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const NFT_CONTRACT_ADDRESS = "0x859078e89E58B0Ab0021755B95360f48fBa763dd";
const BASE_CHAIN_ID = 8453; // Base mainnet chain ID

// ABIs
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const ERC721_ABI = [
  "function mint(address to) returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
];

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const address = useAddress();
  const sdk = useSDK();

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

  const mintNFT = useCallback(async (): Promise<string> => {
    if (!wallet || !sdk) throw new Error("Wallet not connected");

    try {
      const signer = sdk.getSigner();
      const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, ERC721_ABI, signer);
      
      const tx = await nftContract.mint(wallet.address);
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      console.error("Mint error:", error);
      throw error;
    }
  }, [wallet, sdk]);

  const getBalance = useCallback(async (): Promise<Balance> => {
    if (!wallet || !sdk) throw new Error("Wallet not connected");

    try {
      const provider = sdk.getProvider();
      
      // Get USDC balance
      const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
      const usdcBalance = await usdcContract.balanceOf(wallet.address);
      const usdcDecimals = await usdcContract.decimals();
      
      // Get native ETH balance
      const nativeBalance = await provider.getBalance(wallet.address);
      
      return {
        usdc: ethers.formatUnits(usdcBalance, usdcDecimals),
        native: ethers.formatEther(nativeBalance),
      };
    } catch (error) {
      console.error("Error fetching balance:", error);
      return {
        usdc: "0",
        native: "0",
      };
    }
  }, [wallet, sdk]);

  const getNFTs = useCallback(async (): Promise<NFT[]> => {
    if (!wallet || !sdk) throw new Error("Wallet not connected");
    
    try {
      const provider = sdk.getProvider();
      const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, ERC721_ABI, provider);
      
      const balance = await nftContract.balanceOf(wallet.address);
      const balanceNum = Number(balance);
      
      const nfts: NFT[] = [];
      for (let i = 0; i < balanceNum; i++) {
        try {
          const tokenId = await nftContract.tokenOfOwnerByIndex(wallet.address, i);
          nfts.push({
            tokenId: tokenId.toString(),
            name: `NFT #${tokenId.toString()}`,
            image: "",
            owner: wallet.address,
          });
        } catch (err) {
          console.error(`Error fetching NFT at index ${i}:`, err);
        }
      }
      
      return nfts;
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      return [];
    }
  }, [wallet, sdk]);

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
