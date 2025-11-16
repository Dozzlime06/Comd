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

// Constants
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const NFT_CONTRACT_ADDRESS = "0x859078e89E58B0Ab0021755B95360f48fBa763dd";
const BASE_CHAIN_ID = 8453;
const TOKEN_ID = 0; // ERC1155 token ID - check sa thirdweb dashboard kung anong token ID

// ABIs
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

// ERC1155 Drop ABI - for claim function
const DROP_ABI = [
  "function claim(address _receiver, uint256 _tokenId, uint256 _quantity, address _currency, uint256 _pricePerToken, tuple(bytes32[] proof, uint256 quantityLimitPerWallet, uint256 pricePerToken, address currency) _allowlistProof, bytes _data) payable",
  "function getActiveClaimConditionId(uint256 _tokenId) view returns (uint256)",
  "function getClaimConditionById(uint256 _tokenId, uint256 _conditionId) view returns (tuple(uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata))",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
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
      
      console.log("Step 1: Getting claim conditions...");
      
      const dropContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, DROP_ABI, signer);
      
      // Get active claim condition
      const conditionId = await dropContract.getActiveClaimConditionId(TOKEN_ID);
      const condition = await dropContract.getClaimConditionById(TOKEN_ID, conditionId);
      
      const pricePerToken = condition.pricePerToken;
      const currency = condition.currency;
      
      console.log("Price per token:", ethers.utils.formatUnits(pricePerToken, 6), "USDC");
      console.log("Currency:", currency);
      
      // If price > 0 and using USDC, approve
      if (pricePerToken.gt(0) && currency.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
        console.log("Step 2: Checking USDC allowance...");
        
        const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
        const currentAllowance = await usdcContract.allowance(wallet.address, NFT_CONTRACT_ADDRESS);
        
        if (currentAllowance.lt(pricePerToken)) {
          console.log("Step 3: Approving USDC...");
          const approveTx = await usdcContract.approve(NFT_CONTRACT_ADDRESS, pricePerToken);
          await approveTx.wait();
          console.log("✓ USDC approved");
        }
      }
      
      console.log("Step 4: Claiming NFT...");
      
      // Claim parameters
      const quantity = 1;
      const allowlistProof = {
        proof: [],
        quantityLimitPerWallet: 0,
        pricePerToken: pricePerToken,
        currency: currency
      };
      
      const tx = await dropContract.claim(
        wallet.address,
        TOKEN_ID,
        quantity,
        currency,
        pricePerToken,
        allowlistProof,
        "0x",
        {
          value: currency === ethers.constants.AddressZero ? pricePerToken : 0,
          gasLimit: 400000
        }
      );
      
      console.log("Claim tx sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("✓ NFT claimed successfully!");
      
      return receipt.transactionHash;
    } catch (error: any) {
      console.error("Mint error:", error);
      
      if (error.code === 4001) {
        throw new Error("Transaction rejected by user");
      } else if (error.message?.includes("DropNoActiveCondition")) {
        throw new Error("No active claim condition - contact admin");
      } else if (error.message?.includes("DropClaimExceedLimit")) {
        throw new Error("You've already claimed the maximum amount");
      } else if (error.message?.includes("execution reverted")) {
        throw new Error("Claim failed - check requirements");
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
      const dropContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, DROP_ABI, provider);
      
      // For ERC1155, check balance of token ID 0
      const balance = await dropContract.balanceOf(wallet.address, TOKEN_ID);
      
      if (balance.gt(0)) {
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
