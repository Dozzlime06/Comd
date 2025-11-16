import { createContext, useContext, ReactNode } from "react";
import { useActiveAccount, useWalletBalance, useSendTransaction } from "thirdweb/react";
import { getContract, readContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
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
  disconnectWallet: () => Promise<void>;
  mintNFT: (quantity: number) => Promise<string>;
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

  const disconnectWallet = async () => {
    try {
      console.log("Disconnecting wallet...");
      
      // Click the thirdweb disconnect button
      const container = document.getElementById('thirdweb-connect-btn');
      const button = container?.querySelector('button');
      
      if (button && account) {
        button.click();
        
        // Wait for dropdown/modal to appear, then click disconnect
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Try to find and click disconnect option
        const disconnectButton = document.querySelector('[data-test="disconnect-wallet"]') || 
                                 document.querySelector('button:has-text("Disconnect")') ||
                                 Array.from(document.querySelectorAll('button')).find(
                                   btn => btn.textContent?.toLowerCase().includes('disconnect')
                                 );
        
        if (disconnectButton) {
          (disconnectButton as HTMLElement).click();
          console.log("✓ Wallet disconnected");
        } else {
          console.log("Note: Please disconnect manually from the wallet UI");
        }
      } else {
        console.log("No wallet connected");
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      throw error;
    }
  };

  const mintNFT = async (quantity: number = 1): Promise<string> => {
    if (!wallet || !account) throw new Error("Wallet not connected");
    
    if (quantity < 1 || quantity > 100) {
      throw new Error("Quantity must be between 1 and 100");
    }
    
    const totalPrice = MINT_PRICE * BigInt(quantity);
    
    try {
      console.log("=== Starting Mint Process ===");
      console.log("Wallet:", wallet.address);
      console.log("NFT Contract:", NFT_CONTRACT_ADDRESS);
      console.log("USDC Address:", USDC_ADDRESS);
      console.log("Quantity:", quantity);
      console.log("Price per NFT:", (Number(MINT_PRICE) / 1000000).toFixed(2), "USDC");
      console.log("Total Price:", (Number(totalPrice) / 1000000).toFixed(2), "USDC");
      
      // Step 1: Check USDC balance
      console.log("\n[1/5] Checking USDC balance...");
      const usdcContract = getContract({
        client,
        chain,
        address: USDC_ADDRESS,
      });
      
      const balance = await readContract({
        contract: usdcContract,
        method: "function balanceOf(address) view returns (uint256)",
        params: [wallet.address],
      });
      
      console.log("USDC Balance:", balance.toString(), `(${(Number(balance) / 1000000).toFixed(2)} USDC)`);
      
      if (BigInt(balance) < totalPrice) {
        throw new Error(`Insufficient USDC balance. Need ${(Number(totalPrice) / 1000000).toFixed(2)} USDC, have ${(Number(balance) / 1000000).toFixed(2)} USDC`);
      }
      
      // Step 2: Check allowance
      console.log("\n[2/5] Checking USDC allowance...");
      const allowance = await readContract({
        contract: usdcContract,
        method: "function allowance(address owner, address spender) view returns (uint256)",
        params: [wallet.address, NFT_CONTRACT_ADDRESS],
      });
      
      console.log("Current Allowance:", allowance.toString());
      
      // Step 3: Approve if needed
      if (BigInt(allowance) < totalPrice) {
        console.log("\n[3/5] Approving USDC spend...");
        console.log("Approving amount:", totalPrice.toString());
        
        const approveTransaction = prepareContractCall({
          contract: usdcContract,
          method: "function approve(address spender, uint256 amount) returns (bool)",
          params: [NFT_CONTRACT_ADDRESS, totalPrice],
        });
        
        const approveResult = await sendTransaction({
          transaction: approveTransaction,
          account,
        });
        
        console.log("Approval TX Hash:", approveResult.transactionHash);
        console.log("Waiting for approval confirmation...");
        
        // Wait for approval confirmation
        const receipt = await waitForReceipt({
          client,
          chain,
          transactionHash: approveResult.transactionHash,
        });
        
        console.log("✓ Approval confirmed! Block:", receipt.blockNumber);
      } else {
        console.log("\n[3/5] ✓ USDC already approved");
      }
      
      // Step 4: Prepare claim transaction
      console.log("\n[4/5] Preparing claim transaction...");
      
      const nftContract = getContract({
        client,
        chain,
        address: NFT_CONTRACT_ADDRESS,
      });
      
      // Try using direct contract call instead of manual encoding
      try {
        console.log("Attempting direct contract call...");
        
        const claimTransaction = prepareContractCall({
          contract: nftContract,
          method: "function claim(address receiver, uint256 tokenId, uint256 quantity, address currency, uint256 pricePerToken, (bytes32[],uint256,uint256,address) allowlistProof, bytes data)",
          params: [
            account.address,      // receiver
            BigInt(TOKEN_ID),     // tokenId
            BigInt(quantity),     // quantity
            USDC_ADDRESS,         // currency
            MINT_PRICE,           // pricePerToken
            [[], 0n, MINT_PRICE, USDC_ADDRESS], // allowlistProof
            "0x"                  // data
          ],
        });
        
        console.log("\n[5/5] Sending claim transaction...");
        const result = await sendTx(claimTransaction);
        
        console.log("Claim TX Hash:", result.transactionHash);
        console.log(`✓ ${quantity} NFT(s) claimed successfully!`);
        console.log("=== Mint Complete ===\n");
        
        return result.transactionHash;
        
      } catch (directCallError: any) {
        console.error("Direct call failed:", directCallError);
        console.log("\nFalling back to manual encoding...");
        
        // Fallback to manual encoding
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
            quantity,
            USDC_ADDRESS,
            Number(MINT_PRICE),
            [[], 0, Number(MINT_PRICE), USDC_ADDRESS],
            "0x"
          ]
        );
        
        const callData = functionSelector + encodedParams.slice(2);
        console.log("Encoded call data:", callData);
        
        const transaction = {
          to: NFT_CONTRACT_ADDRESS,
          data: callData,
          value: 0n,
          chain,
          client,
        };
        
        console.log("\n[5/5] Sending manually encoded transaction...");
        const result = await sendTx(transaction);
        
        console.log("Claim TX Hash:", result.transactionHash);
        console.log(`✓ ${quantity} NFT(s) claimed successfully!`);
        console.log("=== Mint Complete ===\n");
        
        return result.transactionHash;
      }
      
    } catch (error: any) {
      console.error("\n=== MINT ERROR ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Full error:", error);
      
      // Log stack trace if available
      if (error.stack) {
        console.error("Stack trace:", error.stack);
      }
      
      // Log additional error properties
      if (error.data) {
        console.error("Error data:", error.data);
      }
      if (error.code) {
        console.error("Error code:", error.code);
      }
      if (error.reason) {
        console.error("Error reason:", error.reason);
      }
      
      // Parse specific error messages
      if (error.message?.includes("rejected") || error.message?.includes("denied")) {
        throw new Error("Transaction rejected by user");
      } else if (error.message?.includes("insufficient funds") || error.message?.includes("insufficient balance")) {
        throw new Error("Insufficient USDC or ETH balance");
      } else if (error.message?.includes("DropNoActiveCondition")) {
        throw new Error("No active claim condition - minting may be paused");
      } else if (error.message?.includes("DropClaimExceedLimit") || error.message?.includes("exceed")) {
        throw new Error("Already claimed maximum amount");
      } else if (error.message?.includes("allowance")) {
        throw new Error("USDC allowance issue - try again");
      } else if (error.message?.includes("execution reverted")) {
        const revertReason = error.message.match(/reverted: (.+)/)?.[1] || "unknown reason";
        throw new Error(`Transaction reverted: ${revertReason}`);
      }
      
      // If we couldn't parse the error, throw the original
      throw new Error(`Mint failed: ${error.message || "Unknown error - check console for details"}`);
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
        disconnectWallet,
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
