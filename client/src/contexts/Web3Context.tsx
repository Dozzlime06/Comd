import { createContext, useContext, ReactNode } from "react";
import { useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall, sendTransaction, readContract, eth_getBalance } from "thirdweb";
import { client, chain } from "@/lib/thirdweb";

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

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const NFT_CONTRACT_ADDRESS = "0x859078e89E58B0Ab0021755B95360f48fBa763dd";
const TOKEN_ID = 0;

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const account = useActiveAccount();

  const wallet: Wallet | null = account ? {
    address: account.address,
    chainId: 8453,
    isConnected: true,
  } : null;

  const connectWallet = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const container = document.getElementById('thirdweb-connect-btn');
      const button = container?.querySelector('button');
      
      if (button) {
        button.click();
      } else {
        throw new Error("Connect button not found. Please refresh the page.");
      }
    } catch (error) {
      console.error("Connection error:", error);
      throw error;
    }
  };

  const mintNFT = async (): Promise<string> => {
    if (!wallet || !account) throw new Error("Wallet not connected");
    
    try {
      console.log("Step 1: Getting contract...");
      
      const contract = getContract({
        client,
        chain,
        address: NFT_CONTRACT_ADDRESS,
      });
      
      console.log("Step 2: Preparing claim transaction...");
      
      // Prepare allowlist proof as an array
      const allowlistProof = [
        [], // proof array
        BigInt(0), // quantityLimitPerWallet
        BigInt(1000000), // pricePerToken (1 USDC)
        USDC_ADDRESS // currency
      ];
      
      const transaction = prepareContractCall({
        contract,
        method: "function claim(address _receiver, uint256 _tokenId, uint256 _quantity, address _currency, uint256 _pricePerToken, tuple(bytes32[], uint256, uint256, address) _allowlistProof, bytes _data) payable",
        params: [
          wallet.address,
          BigInt(TOKEN_ID),
          BigInt(1),
          USDC_ADDRESS,
          BigInt(1000000),
          allowlistProof,
          "0x"
        ],
      });
      
      console.log("Step 3: Sending transaction...");
      
      const result = await sendTransaction({
        transaction,
        account,
      });
      
      console.log("✓ NFT claimed successfully!");
      
      return result.transactionHash;
    } catch (error: any) {
      console.error("Mint error:", error);
      
      if (error.message?.includes("rejected")) {
        throw new Error("Transaction rejected by user");
      } else if (error.message?.includes("insufficient")) {
        throw new Error("Insufficient funds");
      } else if (error.message?.includes("DropNoActiveCondition")) {
        throw new Error("No active claim condition");
      } else if (error.message?.includes("DropClaimExceedLimit")) {
        throw new Error("You've already claimed the maximum amount");
      }
      
      throw error;
    }
  };

  const getBalance = async (): Promise<Balance> => {
    if (!wallet) throw new Error("Wallet not connected");
    
    try {
      // Get USDC balance
      const usdcContract = getContract({
        client,
        chain,
        address: USDC_ADDRESS,
      });
      
      const usdcBalance = await readContract({
        contract: usdcContract,
        method: "function balanceOf(address) view returns (uint256)",
        params: [wallet.address],
      });
      
      const usdcFormatted = (Number(usdcBalance) / 1000000).toFixed(2);
      
      // Get native ETH balance using Thirdweb v5
      const ethBalanceWei = await eth_getBalance({
        client,
        chain,
        address: wallet.address,
      });
      
      // Convert from wei to ETH (18 decimals)
      const ethBalanceFormatted = (Number(ethBalanceWei) / 1e18).toFixed(4);
      
      return {
        usdc: usdcFormatted,
        native: ethBalanceFormatted,
      };
    } catch (error) {
      console.error("Error fetching balance:", error);
      return {
        usdc: "0.00",
        native: "0.00",
      };
    }
  };

  const getNFTs = async (): Promise<NFT[]> => {
    if (!wallet) throw new Error("Wallet not connected");
    
    try {
      const nftContract = getContract({
        client,
        chain,
        address: NFT_CONTRACT_ADDRESS,
      });
      
      const balance = await readContract({
        contract: nftContract,
        method: "function balanceOf(address, uint256) view returns (uint256)",
        params: [wallet.address, BigInt(TOKEN_ID)],
      });
      
      if (Number(balance) > 0) {
        return [{
          tokenId: TOKEN_ID.toString(),
          name: `NFT #${TOKEN_ID} (x${balance.toString()})`,
          image: "",
          owner: wallet.address,
        }];
      }
      
      return [];
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      return [];
    }
  };

  return (
    <Web3Context.Provider
      value={{
        wallet,
        isConnecting: false,
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
