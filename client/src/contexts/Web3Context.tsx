import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useAddress, useSDK, useConnect, metamaskWallet } from "@thirdweb-dev/react";
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
  connectWallet: () => Promise<void>;
  mintNFT: () => Promise<string>;
  getBalance: () => Promise<Balance>;
  getNFTs: () => Promise<NFT[]>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

// Constants
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const NFT_CONTRACT_ADDRESS = "0x859078e89E58B0Ab0021755B95360f48fBa763dd";
const BASE_CHAIN_ID = 8453;

// ABIs
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const ERC721_ABI = [
  "function mint(address to) payable returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function mintPrice() view returns (uint256)",
];

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  
  const address = useAddress();
  const sdk = useSDK();
  const connect = useConnect();

  const wallet: Wallet | null = address && sdk ? {
    address: address,
    chainId: BASE_CHAIN_ID,
    isConnected: true,
  } : null;

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    try {
      const metamask = metamaskWallet();
      await connect(metamask, { chainId: BASE_CHAIN_ID });
    } catch (error) {
      console.error("Connection error:", error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [connect]);

  const mintNFT = useCallback(async (): Promise<string> => {
    if (!wallet || !sdk) throw new Error("Wallet not connected");

    try {
      const signer = sdk.getSigner();
      if (!signer) throw new Error("No signer available");
      
      console.log("Starting mint process...");
      
      // Check if contract needs payment
      const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, ERC721_ABI, signer);
      
      // Try to get mint price (if contract has this function)
      let mintPrice = ethers.BigNumber.from(0);
      try {
        mintPrice = await nftContract.mintPrice();
        console.log("Mint price:", ethers.utils.formatEther(mintPrice), "ETH");
      } catch (e) {
        console.log("No mint price function, assuming free mint");
      }
      
      // Send mint transaction with value if needed
      const tx = await nftContract.mint(wallet.address, {
        value: mintPrice,
        gasLimit: 300000, // Set gas limit to prevent stuck transactions
      });
      
      console.log("Transaction sent:", tx.hash);
      console.log("Waiting for confirmation...");
      
      const receipt = await tx.wait();
      console.log("Transaction confirmed!");
      
      return receipt.transactionHash;
    } catch (error: any) {
      console.error("Mint error:", error);
      
      // Better error messages
      if (error.code === 4001) {
        throw new Error("Transaction rejected by user");
      } else if (error.code === -32603) {
        throw new Error("Insufficient funds for gas");
      } else if (error.message?.includes("execution reverted")) {
        throw new Error("Contract rejected transaction - check mint requirements");
      }
      
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
        usdc: ethers.utils.formatUnits(usdcBalance, usdcDecimals),
        native: ethers.utils.formatEther(nativeBalance),
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
        connectWallet,
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
