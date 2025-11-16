import { createContext, useContext, ReactNode } from "react";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { client, baseChain, USDC_ADDRESS, NFT_CONTRACT_ADDRESS, TOKEN_ID } from "@/lib/thirdweb";
import { getContract, prepareContractCall, sendTransaction, readContract } from "thirdweb";
import { approve, allowance, balanceOf as erc20BalanceOf, decimals } from "thirdweb/extensions/erc20";
import { claimTo, balanceOf as erc1155BalanceOf } from "thirdweb/extensions/erc1155";
import { defineChain } from "thirdweb/chains";

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

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const account = useActiveAccount();
  const wallet = useActiveWallet();

  const isConnecting = wallet?.getConnectionStatus() === "connecting";

  const walletInfo: Wallet | null = account ? {
    address: account.address,
    chainId: 8453,
    isConnected: true,
  } : null;

  const mintNFT = async (): Promise<string> => {
    if (!account) throw new Error("Wallet not connected");

    try {
      console.log("Step 1: Setting up contracts...");
      
      const nftContract = getContract({
        client,
        chain: baseChain,
        address: NFT_CONTRACT_ADDRESS,
      });

      const usdcContract = getContract({
        client,
        chain: baseChain,
        address: USDC_ADDRESS,
      });

      console.log("Step 2: Checking USDC allowance...");
      
      const currentAllowance = await allowance({
        contract: usdcContract,
        owner: account.address,
        spender: NFT_CONTRACT_ADDRESS,
      });

      // Price is typically set in the claim condition - adjust as needed
      const pricePerToken = BigInt("1000000"); // 1 USDC (6 decimals)

      if (currentAllowance < pricePerToken) {
        console.log("Step 3: Approving USDC...");
        
        const approveTransaction = approve({
          contract: usdcContract,
          spender: NFT_CONTRACT_ADDRESS,
          amount: pricePerToken,
        });

        await sendTransaction({
          transaction: approveTransaction,
          account,
        });

        console.log("✓ USDC approved");
      }

      console.log("Step 4: Claiming NFT...");

      const claimTransaction = claimTo({
        contract: nftContract,
        to: account.address,
        tokenId: BigInt(TOKEN_ID),
        quantity: BigInt(1),
      });

      const receipt = await sendTransaction({
        transaction: claimTransaction,
        account,
      });

      console.log("✓ NFT claimed successfully!");
      return receipt.transactionHash;

    } catch (error: any) {
      console.error("Mint error:", error);

      if (error.message?.includes("user rejected")) {
        throw new Error("Transaction rejected by user");
      } else if (error.message?.includes("insufficient funds")) {
        throw new Error("Insufficient funds for transaction");
      }

      throw error;
    }
  };

  const getBalance = async (): Promise<Balance> => {
    if (!account) throw new Error("Wallet not connected");

    try {
      const usdcContract = getContract({
        client,
        chain: baseChain,
        address: USDC_ADDRESS,
      });

      const usdcBalance = await erc20BalanceOf({
        contract: usdcContract,
        address: account.address,
      });

      const usdcDecimals = await decimals({ contract: usdcContract });

      // For native balance, you'd need to use getRpcClient
      const nativeBalance = "0"; // Simplified for now

      return {
        usdc: (Number(usdcBalance) / Math.pow(10, usdcDecimals)).toFixed(6),
        native: nativeBalance,
      };
    } catch (error) {
      console.error("Error fetching balance:", error);
      return {
        usdc: "0",
        native: "0",
      };
    }
  };

  const getNFTs = async (): Promise<NFT[]> => {
    if (!account) throw new Error("Wallet not connected");

    try {
      const nftContract = getContract({
        client,
        chain: baseChain,
        address: NFT_CONTRACT_ADDRESS,
      });

      const balance = await erc1155BalanceOf({
        contract: nftContract,
        owner: account.address,
        tokenId: BigInt(TOKEN_ID),
      });

      if (balance > 0n) {
        return [{
          tokenId: TOKEN_ID.toString(),
          name: `NFT #${TOKEN_ID} (x${balance.toString()})`,
          image: "",
          owner: account.address,
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
        wallet: walletInfo,
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
