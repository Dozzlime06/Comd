import { createContext, useContext, ReactNode } from "react";
import { useActiveAccount } from "thirdweb/react";
import { client, baseChain, USDC_ADDRESS, NFT_CONTRACT_ADDRESS, TOKEN_ID } from "@/lib/thirdweb";
import { getContract, sendTransaction, readContract, prepareContractCall } from "thirdweb";
import { balanceOf as erc1155BalanceOf } from "thirdweb/extensions/erc1155";

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

// ERC20 ABI for USDC
const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ERC1155 Drop ABI
const DROP_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "_receiver", "type": "address"},
      {"internalType": "uint256", "name": "_tokenId", "type": "uint256"},
      {"internalType": "uint256", "name": "_quantity", "type": "uint256"},
      {"internalType": "address", "name": "_currency", "type": "address"},
      {"internalType": "uint256", "name": "_pricePerToken", "type": "uint256"},
      {
        "components": [
          {"internalType": "bytes32[]", "name": "proof", "type": "bytes32[]"},
          {"internalType": "uint256", "name": "quantityLimitPerWallet", "type": "uint256"},
          {"internalType": "uint256", "name": "pricePerToken", "type": "uint256"},
          {"internalType": "address", "name": "currency", "type": "address"}
        ],
        "internalType": "struct IDropClaimCondition_V1.AllowlistProof",
        "name": "_allowlistProof",
        "type": "tuple"
      },
      {"internalType": "bytes", "name": "_data", "type": "bytes"}
    ],
    "name": "claim",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "account", "type": "address"},
      {"internalType": "uint256", "name": "id", "type": "uint256"}
    ],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_tokenId", "type": "uint256"}],
    "name": "getActiveClaimConditionId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const account = useActiveAccount();

  const isConnecting = false;

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
        abi: ERC20_ABI,
      });

      console.log("Step 2: Checking USDC allowance...");
      
      const currentAllowance = await readContract({
        contract: usdcContract,
        method: "function allowance(address owner, address spender) view returns (uint256)",
        params: [account.address, NFT_CONTRACT_ADDRESS],
      });

      const pricePerToken = BigInt("1000000"); // 1 USDC

      if (currentAllowance < pricePerToken) {
        console.log("Step 3: Approving USDC...");
        
        const approveTx = prepareContractCall({
          contract: usdcContract,
          method: "function approve(address spender, uint256 amount) returns (bool)",
          params: [NFT_CONTRACT_ADDRESS, pricePerToken],
        });

        await sendTransaction({
          transaction: approveTx,
          account,
        });

        console.log("✓ USDC approved");
      }

      console.log("Step 4: Claiming NFT...");

      const nftContractWithAbi = getContract({
        client,
        chain: baseChain,
        address: NFT_CONTRACT_ADDRESS,
        abi: DROP_ABI,
      });

      const claimTx = prepareContractCall({
        contract: nftContractWithAbi,
        method: "function claim(address _receiver, uint256 _tokenId, uint256 _quantity, address _currency, uint256 _pricePerToken, tuple(bytes32[] proof, uint256 quantityLimitPerWallet, uint256 pricePerToken, address currency) _allowlistProof, bytes _data) payable",
        params: [
          account.address,
          BigInt(TOKEN_ID),
          BigInt(1),
          USDC_ADDRESS,
          pricePerToken,
          {
            proof: [],
            quantityLimitPerWallet: BigInt(0),
            pricePerToken: pricePerToken,
            currency: USDC_ADDRESS,
          },
          "0x",
        ],
      });

      const receipt = await sendTransaction({
        transaction: claimTx,
        account,
      });

      console.log("✓ NFT claimed successfully!");
      return receipt.transactionHash;

    } catch (error: any) {
      console.error("Mint error:", error);

      if (error.message?.includes("user rejected")) {
        throw new Error("Transaction rejected by user");
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
        abi: ERC20_ABI,
      });

      const usdcBalance = await readContract({
        contract: usdcContract,
        method: "function balanceOf(address account) view returns (uint256)",
        params: [account.address],
      });

      const usdcDecimals = await readContract({
        contract: usdcContract,
        method: "function decimals() view returns (uint8)",
        params: [],
      });

      return {
        usdc: (Number(usdcBalance) / Math.pow(10, Number(usdcDecimals))).toFixed(6),
        native: "0",
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
        abi: DROP_ABI,
      });

      const balance = await readContract({
        contract: nftContract,
        method: "function balanceOf(address account, uint256 id) view returns (uint256)",
        params: [account.address, BigInt(TOKEN_ID)],
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
