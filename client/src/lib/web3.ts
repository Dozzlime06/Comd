import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { createWallet, injectedProvider } from "thirdweb/wallets";
import { ethers } from "ethers";

// Thirdweb client ID - now reading from environment variable
const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID || "053fc1b5db7ca4a50a1d63e596228c09";

// NFT Contract address on Base
const NFT_CONTRACT_ADDRESS = "0x859078e89E58B0Ab0021755B95360f48fBa763dd";

// USDC Contract address on Base
const USDC_CONTRACT_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Create Thirdweb client
export const client = createThirdwebClient({
  clientId: THIRDWEB_CLIENT_ID,
});

// Use Base chain from Thirdweb
export const baseChain = base;


// Get NFT contract
export const getNFTContract = () => {
  return getContract({
    client,
    chain: baseChain,
    address: NFT_CONTRACT_ADDRESS,
  });
};

// Get USDC contract
export const getUSDCContract = () => {
  return getContract({
    client,
    chain: baseChain,
    address: USDC_CONTRACT_ADDRESS,
  });
};

// ERC20 ABI for balance checking
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

// ERC721 ABI for NFT interactions
const ERC721_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function mint(address to) returns (uint256)",
];

// Get USDC balance
export async function getUSDCBalance(address: string): Promise<string> {
  try {
    if (!window.ethereum) {
      return "0.00";
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, ERC20_ABI, provider);
    
    const balance = await usdcContract.balanceOf(address);
    const decimals = await usdcContract.decimals();
    
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error("Error fetching USDC balance:", error);
    return "0.00";
  }
}

// Get native ETH balance
export async function getETHBalance(address: string): Promise<string> {
  try {
    if (!window.ethereum) {
      return "0.00";
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const balance = await provider.getBalance(address);
    
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Error fetching ETH balance:", error);
    return "0.00";
  }
}

// Get owned NFTs
export async function getOwnedNFTs(address: string): Promise<any[]> {
  try {
    if (!window.ethereum) {
      return [];
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, ERC721_ABI, provider);
    
    const balance = await nftContract.balanceOf(address);
    const balanceNumber = Number(balance);
    
    const nfts = [];
    for (let i = 0; i < balanceNumber; i++) {
      try {
        const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
        const tokenURI = await nftContract.tokenURI(tokenId);
        
        nfts.push({
          tokenId: tokenId.toString(),
          name: `NFT #${tokenId.toString()}`,
          tokenURI,
          owner: address,
        });
      } catch (error) {
        console.error(`Error fetching NFT at index ${i}:`, error);
      }
    }
    
    return nfts;
  } catch (error) {
    console.error("Error fetching NFTs:", error);
    return [];
  }
}

// Mint NFT with USDC payment
export async function mintNFT(address: string): Promise<string> {
  try {
    if (!window.ethereum) {
      throw new Error("No Web3 wallet detected");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // First, approve USDC spending (assuming a mint costs some USDC)
    const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, ERC20_ABI, signer);
    const mintPrice = ethers.parseUnits("10", 6); // Example: 10 USDC
    
    // Check allowance
    const allowance = await usdcContract.allowance(address, NFT_CONTRACT_ADDRESS);
    
    if (allowance < mintPrice) {
      // Approve USDC spending
      const approveTx = await usdcContract.approve(NFT_CONTRACT_ADDRESS, mintPrice);
      await approveTx.wait();
    }
    
    const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, ERC721_ABI, signer);
    
    // Call mint function
    const tx = await nftContract.mint(address);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    return receipt.hash;
  } catch (error) {
    console.error("Error minting NFT:", error);
    throw error;
  }
}

// Approve USDC spending
export async function approveUSDC(amount: string): Promise<string> {
  try {
    if (!window.ethereum) {
      throw new Error("No Web3 wallet detected");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, ERC20_ABI, signer);
    
    // Approve spending
    const tx = await usdcContract.approve(
      NFT_CONTRACT_ADDRESS,
      ethers.parseUnits(amount, 6) // USDC has 6 decimals
    );
    
    const receipt = await tx.wait();
    
    return receipt.hash;
  } catch (error) {
    console.error("Error approving USDC:", error);
    throw error;
  }
}

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
