import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useAddress, useSDK, useConnect, metamaskWallet, useConnectionStatus } from "@thirdweb-dev/react";
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

// Constants - FIXED CHECKSUM
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const NFT_CONTRACT_ADDRESS = "0x859078e89E58B0Ab0021755B95360f48fBa763dd"; // Fixed capital E
const BASE_CHAIN_ID = 8453;
const MINT_PRICE_USDC = "1";

// ABIs
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const ERC721_ABI = [
  "function mint(address to) returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
];

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const address = useAddress();
  const sdk = useSDK();
  const connect = useConnect();
  const connectionStatus = useConnectionStatus();

  const isConnecting = connectionStatus === "connecting";

  const wallet: Wallet | null = address && sdk ? {
    address: address,
    chainId: BASE_CHAIN_ID,
    isConnected: true,
  } : null;

  const connectWallet = useCallback(async () => {
    try {
      const metamask = metamaskWallet();
      await connect(metamask, { chainId: BASE_CHAIN_ID });
    } catch (error) {
      console.error("Connection error:", error);
      throw error;
    }
  }, [connect]);

  const mintNFT = useCallback(async (): Promise<string> => {
    if (!wallet || !sdk) throw new Error("Wallet not connected");

    try {
      const signer = sdk.getSigner();
      if (!signer) throw new Error("No signer available");
      
      console.log("Step 1: Checking USDC balance...");
      
      const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
      const balance = await usdcContract.balanceOf(wallet.address);
      const decimals = await usdcContract.decimals();
      const mintPrice = ethers.utils.parseUnits(MINT_PRICE_USDC, decimals);
      
      if (balance.lt(mintPrice)) {
        throw new Error(`Insufficient USDC. You need ${MINT_PRICE_USDC} USDC to mint`);
      }
      
      console.log("Step 2: Checking USDC allowance...");
      
      const currentAllowance = await usdcContract.allowance(wallet.address, NFT_CONTRACT_ADDRESS);
      
      if (currentAllowance.lt(mintPrice)) {
        console.log("Step 3: Approving USDC spend...");
        const approveTx = await usdcContract.approve(NFT_CONTRACT_ADDRESS, mintPrice);
        console.log("Approval tx sent:", approveTx.hash);
        await approveTx.wait();
        console.log("✓ USDC approved");
      } else {
        console.log("✓ USDC already approved");
      }
      
      console.log("Step 4: Minting NFT...");
      
      const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, ERC721_ABI, signer);
      const tx = await nftContract.mint(wallet.address, {
        gasLimit: 300000,
      });
      
      console.log("Mint tx sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("✓ NFT minted successfully!");
      
      return receipt.transactionHash;
    } catch (error: any) {
      console.error("Mint error:", error);
      
      if (error.code === 4001) {
        throw new Error("Transaction rejected by user");
      } else if (error.message?.includes("Insufficient USDC")) {
        throw error;
      } else if (error.message?.includes("execution reverted")) {
        throw new Error("Mint failed - check if you have enough USDC");
      }
      
      throw error;
    }
  }, [wallet, sdk]);

  const getBalance = useCallback(async (): Promise<Balance> => {
    if (!wallet || !sdk) throw new Error("Wallet not connected");

    try {
      const provider = sdk.getProvider();
      
      const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
      const usdcBalance = await usdcContract.balanceOf(wallet.address);
      const usdcDecimals = await usdcContract.decimals();
      
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
