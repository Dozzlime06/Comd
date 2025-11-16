import { createContext, useContext, ReactNode } from "react";
import { useActiveAccount, useWalletBalance, useSendTransaction } from "thirdweb/react";
import { getContract, readContract, prepareTransaction, prepareContractCall, sendTransaction } from "thirdweb";
import { client, chain } from "@/lib/thirdweb";
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

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const NFT_CONTRACT_ADDRESS = "0x859078e89E58B0Ab0021755B95360f48fBa763dd";
const TOKEN_ID = 0;
const MINT_PRICE = 1000000n; // 1 USDC (6 decimals)

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
      console.log("Step 1: Checking USDC allowance...");
      
      // Check USDC allowance
      const usdcContract = getContract({
        client,
        chain,
        address: USDC_ADDRESS,
      });
      
      const allowance = await readContract({
        contract: usdcContract,
        method: "function allowance(address owner, address spender) view returns (uint256)",
        params: [wallet.address, NFT_CONTRACT_ADDRESS],
      });
      
      console.log("Current allowance:", allowance.toString());
      
      // If allowance is insufficient, approve first
      if (BigInt(allowance) < MINT_PRICE) {
        console.log("Step 2: Approving USDC...");
        
        const approveTransaction = prepareContractCall({
          contract: usdcContract,
          method: "function approve(address spender, uint256 amount) returns (bool)",
          params: [NFT_CONTRACT_ADDRESS, MINT_PRICE],
        });
        
        const approveResult = await sendTransaction({
          transaction: approveTransaction,
          account,
        });
        
        console.log("✓ USDC approved:", approveResult.transactionHash);
        
        // Wait a bit for the approval to be confirmed
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log("✓ USDC already approved");
      }
      
      console.log("Step 3: Encoding claim transaction...");
      
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const functionSelector = "0x84bb1e42";
      
      const encodedParams = abiCoder.encode(
        [
          "address",
          "uint256", 
          "uint256",
          "address",
          "uint256",
          "tuple(bytes32[],uint256,uint256,address)",
          "bytes"
        ],
        [
          account.address,
          TOKEN_ID,
          1,
          USDC_ADDRESS,
          Number(MINT_PRICE),
          [[], 0, Number(MINT_PRICE), USDC_ADDRESS],
          "0x"
        ]
      );
      
      const callData = functionSelector + encodedParams.slice(2);
      
      console.log("Step 4: Preparing claim transaction...");
      
      const transaction = prepareTransaction({
        client,
        chain,
        to: NFT_CONTRACT_ADDRESS,
        data: callData,
        value: 0n,
      });
      
      console.log("Step 5: Sending claim transaction...");
      
      const result = await sendTx(transaction);
      
      console.log("✓ NFT claimed successfully!");
      
      return result.transactionHash;
    } catch (error: any) {
      console.error("Mint error:", error);
      
      if (error.message?.includes("rejected")) {
        throw new Error("Transaction rejected by user");
      } else if (error.message?.includes("insufficient")) {
        throw new Error("Insufficient USDC balance");
      } else if (error.message?.includes("DropNoActiveCondition")) {
        throw new Error("No active claim condition");
      } else if (error.message?.includes("DropClaimExceedLimit")) {
        throw new Error("Already claimed maximum amount");
      } else if (error.message?.includes("execution reverted")) {
        throw new Error("Claim failed - check if mint is active");
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
