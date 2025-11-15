import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAccount, useWallet } from "@thirdweb-dev/react";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
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
const BASE_CHAIN_ID = 8453; // Base L2
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const NFT_CONTRACT_ADDRESS = "0x859078e89E58B0Ab0021755B95360f48fBa763dd";
const MINT_PRICE = ethers.utils.parseUnits("1", 6); // 1 USDC (6 decimals)

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const account = useAccount();
  const connectedWallet = useWallet();

  const sdk = new ThirdwebSDK("base"); // Base network

  useEffect(() => {
    if (account && connectedWallet) {
      setWallet({
        address: account.address,
        chainId: BASE_CHAIN_ID,
        isConnected: true,
      });
    } else {
      setWallet(null);
    }
  }, [account, connectedWallet]);

  const checkUSDCBalance = useCallback(async (requiredAmount: ethers.BigNumber) => {
    if (!wallet) return false;

    const usdc = await sdk.getERC20(USDC_ADDRESS);
    const balance = await usdc.balanceOf(wallet.address);
    return balance.gte(requiredAmount);
  }, [wallet, sdk]);

  const mintNFT = useCallback(async (): Promise<string> => {
    if (!wallet) throw new Error("Wallet not connected");

    // 1. Check USDC balance
    const hasEnough = await checkUSDCBalance(MINT_PRICE);
    if (!hasEnough) throw new Error("Insufficient USDC balance to mint.");

    // 2. Approve NFT contract to spend USDC
    const usdc = await sdk.getERC20(USDC_ADDRESS);
    const approveTx = await usdc.approve(NFT_CONTRACT_ADDRESS, MINT_PRICE);
    await approveTx.wait();

    // 3. Mint NFT
    const nftContract = await sdk.getNFTCollection(NFT_CONTRACT_ADDRESS);
    const mintTx = await nftContract.mintTo(wallet.address, {
      name: `CMD402 NFT`,
      description: "Minimalist 2D Terminal NFT",
      image: "", // Optional: Add your IPFS or image URL
    });

    return mintTx.receipt.transactionHash;
  }, [wallet, sdk, checkUSDCBalance]);

  const getBalance = useCallback(async (): Promise<Balance> => {
    if (!wallet) throw new Error("Wallet not connected");

    const usdc = await sdk.getERC20(USDC_ADDRESS);
    const usdcBalance = await usdc.balanceOf(wallet.address);
    const nativeBalance = await sdk.getProvider().getBalance(wallet.address);

    return {
      usdc: ethers.utils.formatUnits(usdcBalance, 6),
      native: ethers.utils.formatEther(nativeBalance),
    };
  }, [wallet, sdk]);

  const getNFTs = useCallback(async (): Promise<NFT[]> => {
    if (!wallet) throw new Error("Wallet not connected");

    const nftContract = await sdk.getNFTCollection(NFT_CONTRACT_ADDRESS);
    const owned = await nftContract.getOwned(wallet.address);

    return owned.map(nft => ({
      tokenId: nft.metadata.id,
      name: nft.metadata.name,
      image: nft.metadata.image || "",
      owner: nft.owner,
    }));
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
