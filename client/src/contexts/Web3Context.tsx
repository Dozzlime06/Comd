import { createContext, useContext, ReactNode } from "react";
import { useActiveAccount, useWalletBalance, useSendTransaction } from "thirdweb/react";
import { getContract, readContract, prepareTransaction } from "thirdweb";
import { client, chain } from "@/lib/thirdweb";
import { toHex } from "thirdweb/utils";

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
  const { mutateAsync: sendTx } = useSendTransaction();
  const { data: ethBalance } = useWalletBalance({
    client,
    chain,
    address: account?.address,
  });

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
      console.log("Step 1: Encoding claim transaction...");
      
      // Manual ABI encoding for claim function
      // Function signature: claim(address,uint256,uint256,address,uint256,(bytes32[],uint256,uint256,address),bytes)
      const abiCoder = new (await import('ethers')).AbiCoder();
      
      const functionSignature = "0x84bb1e42"; // keccak256("claim(address,uint256,uint256,address,uint256,(bytes32[],uint256,uint256,address),bytes)").slice(0,10)
      
      const params = abiCoder.encode(
        ["address", "uint256", "uint256", "address", "uint256", "tuple(bytes32[],uint256,uint256,address)", "bytes"],
        [
          account.address,
          TOKEN_ID,
          1,
          USDC_ADDRESS,
          1000000,
          [[], 0, 1000000, USDC_ADDRESS],
          "0x"
        ]
      );
      
      const data = functionSignature + params.slice(2);
      
      console.log("Step 2: Preparing transaction...");
      
      const transaction = prepareTransaction({
        client,
        chain,
        to: NFT_CONTRACT_ADDRESS,
        data: data,
        value: 0n,
      });
      
      console.log("Step 3: Sending transaction...");
      
      const result = await sendTx(transaction);
      
      console.log("✓ NFT claimed successfully!");
      
      return result.transactionHash;
    } catch (error: any) {
      console.error("Mint error:", error);
      
      if (error.message?.includes("rejected")) {
        throw new Error("Transaction rejected by user");
      } else if (error.message?.includes("insufficient")) {
        throw new Error("Insufficient funds");
      }
      
      throw error;
    }
  };

  const getBalance = async (): Promise<Balance> => {
    if (!wallet) throw new Error("Wallet not connected");
    
    try {
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
      
      const ethFormatted = ethBalance?.displayValue 
        ? parseFloat(ethBalance.displayValue).toFixed(4) 
        : "0.0000";
      
      return {
        usdc: usdcFormatted,
        native: ethFormatted,
      };
    } catch (error) {
      console.error("Error fetching balance:", error);
      return {
        usdc: "0.00",
        native: "0.0000",
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
