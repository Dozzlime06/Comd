import { z } from "zod";

// Terminal command line entry
export const terminalLineSchema = z.object({
  id: z.string(),
  type: z.enum(["command", "output", "error", "info"]),
  text: z.string(),
  timestamp: z.number(),
});

export type TerminalLine = z.infer<typeof terminalLineSchema>;

// Wallet connection state
export const walletSchema = z.object({
  address: z.string(),
  chainId: z.number(),
  isConnected: z.boolean(),
});

export type Wallet = z.infer<typeof walletSchema>;

// NFT metadata
export const nftSchema = z.object({
  tokenId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
  owner: z.string(),
});

export type NFT = z.infer<typeof nftSchema>;

// Transaction result
export const transactionSchema = z.object({
  hash: z.string(),
  status: z.enum(["pending", "confirmed", "failed"]),
  blockNumber: z.number().optional(),
});

export type Transaction = z.infer<typeof transactionSchema>;

// Balance info
export const balanceSchema = z.object({
  usdc: z.string(),
  native: z.string(),
});

export type Balance = z.infer<typeof balanceSchema>;

// Command types
export type CommandType = "connect" | "mint" | "balance" | "nfts" | "help" | "clear";

// Command result
export const commandResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
});

export type CommandResult = z.infer<typeof commandResultSchema>;
