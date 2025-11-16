import { createThirdwebClient, defineChain } from "thirdweb";

// Your client ID from thirdweb dashboard
export const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || "",
});

// Base chain configuration
export const baseChain = defineChain({
  id: 8453,
  name: "Base",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "BaseScan",
      url: "https://basescan.org",
    },
  ],
});

// Contract addresses
export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const NFT_CONTRACT_ADDRESS = "0x859078e89E58B0Ab0021755B95360f48fBa763dd";
export const TOKEN_ID = 0;
