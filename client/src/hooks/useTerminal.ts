import { useState, useEffect, useRef, useCallback } from "react";
import { type TerminalLine, type CommandType } from "@shared/schema";
import { useWeb3 } from "@/contexts/Web3Context";
import { useToast } from "@/hooks/use-toast";

export function useTerminal() {
  const { wallet, connectWallet, getBalance, getNFTs, mintNFT, isConnecting } = useWeb3();
  const { toast } = useToast();
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeLines: TerminalLine[] = [
      {
        id: "welcome-1",
        type: "info",
        text: "CMD402 NFT Terminal v1.0.0",
        timestamp: Date.now(),
      },
      {
        id: "welcome-2",
        type: "info",
        text: "Base Chain NFT Minting Interface",
        timestamp: Date.now() + 1,
      },
      {
        id: "welcome-3",
        type: "info",
        text: "Contract: 0x859078e89E58B0Ab0021755B95360f48fBa763dd",
        timestamp: Date.now() + 2,
      },
      {
        id: "welcome-4",
        type: "info",
        text: "",
        timestamp: Date.now() + 3,
      },
      {
        id: "welcome-5",
        type: "info",
        text: "Type 'help' for available commands",
        timestamp: Date.now() + 4,
      },
      {
        id: "welcome-6",
        type: "info",
        text: "",
        timestamp: Date.now() + 5,
      },
    ];
    setLines(welcomeLines);
  }, []);

  const addLine = useCallback((type: TerminalLine["type"], text: string) => {
    const newLine: TerminalLine = {
      id: `line-${Date.now()}-${Math.random()}`,
      type,
      text,
      timestamp: Date.now(),
    };
    setLines((prev) => [...prev, newLine]);
  }, []);

  const executeCommand = useCallback(async (input: string) => {
    if (!input.trim()) return;

    const trimmedInput = input.trim();
    const command = trimmedInput.toLowerCase().split(" ")[0] as CommandType;

    // Add command to history
    setCommandHistory((prev) => [...prev, trimmedInput]);
    setHistoryIndex(-1);

    // Display the command
    addLine("command", `> ${trimmedInput}`);

    setIsProcessing(true);

    try {
      switch (command) {
        case "help":
          addLine("output", "");
          addLine("output", "Available commands:");
          addLine("output", "  connect    - Connect your wallet to Base chain");
          addLine("output", "  mint       - Mint a new NFT (requires USDC payment)");
          addLine("output", "  balance    - Check your USDC and ETH balances");
          addLine("output", "  nfts       - Display your NFT collection");
          addLine("output", "  clear      - Clear terminal screen");
          addLine("output", "  help       - Show this help message");
          addLine("output", "");
          break;

        case "clear":
          const welcomeLines: TerminalLine[] = [
            {
              id: "welcome-1",
              type: "info",
              text: "CMD402 NFT Terminal v1.0.0",
              timestamp: Date.now(),
            },
            {
              id: "welcome-2",
              type: "info",
              text: "Base Chain NFT Minting Interface",
              timestamp: Date.now() + 1,
            },
            {
              id: "welcome-3",
              type: "info",
              text: "Contract: 0x859078e89E58B0Ab0021755B95360f48fBa763dd",
              timestamp: Date.now() + 2,
            },
            {
              id: "welcome-4",
              type: "info",
              text: "",
              timestamp: Date.now() + 3,
            },
            {
              id: "welcome-5",
              type: "info",
              text: "Type 'help' for available commands",
              timestamp: Date.now() + 4,
            },
            {
              id: "welcome-6",
              type: "info",
              text: "",
              timestamp: Date.now() + 5,
            },
          ];
          setLines(welcomeLines);
          break;

        case "connect":
          addLine("output", "");
          if (wallet?.isConnected) {
            addLine("info", `Already connected: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`);
            addLine("info", `Chain ID: ${wallet.chainId} (Base)`);
          } else {
            addLine("info", "Initializing wallet connection...");
            addLine("info", "Please approve the connection in your wallet");
            try {
              await connectWallet();
              // Give a small delay for state to update
              await new Promise(resolve => setTimeout(resolve, 500));
              addLine("info", "✓ Wallet connected successfully");
              addLine("info", "✓ Base Chain active");
            } catch (error) {
              addLine("error", `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
          }
          addLine("output", "");
          break;

        case "mint":
          addLine("output", "");
          if (!wallet?.isConnected) {
            addLine("error", "Wallet not connected. Run 'connect' first.");
          } else {
            addLine("info", "Preparing to mint NFT...");
            addLine("info", "This requires USDC payment approval");
            try {
              const txHash = await mintNFT();
              addLine("info", `✓ NFT minted successfully`);
              addLine("info", `Transaction: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`);
            } catch (error) {
              addLine("error", `Mint failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
          }
          addLine("output", "");
          break;

        case "balance":
          addLine("output", "");
          if (!wallet?.isConnected) {
            addLine("error", "Wallet not connected. Run 'connect' first.");
          } else {
            addLine("info", "Fetching balances...");
            try {
              const balances = await getBalance();
              addLine("output", "");
              addLine("info", `USDC Balance: ${balances.usdc} USDC`);
              addLine("info", `ETH Balance:  ${balances.native} ETH`);
            } catch (error) {
              addLine("error", `Failed to fetch balances: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
          }
          addLine("output", "");
          break;

        case "nfts":
          addLine("output", "");
          if (!wallet?.isConnected) {
            addLine("error", "Wallet not connected. Run 'connect' first.");
          } else {
            addLine("info", "Loading your NFT collection...");
            try {
              const nfts = await getNFTs();
              addLine("output", "");
              if (nfts.length === 0) {
                addLine("info", "No NFTs found in your wallet");
              } else {
                addLine("info", `Found ${nfts.length} NFT${nfts.length > 1 ? "s" : ""}:`);
                nfts.forEach((nft, index) => {
                  addLine("output", `  ${index + 1}. ${nft.name} (Token #${nft.tokenId})`);
                });
              }
            } catch (error) {
              addLine("error", `Failed to load NFTs: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
          }
          addLine("output", "");
          break;

        default:
          addLine("error", `Command not found: ${command}`);
          addLine("output", "Type 'help' for available commands");
          addLine("output", "");
      }
    } catch (error) {
      addLine("error", `Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      addLine("output", "");
    } finally {
      setIsProcessing(false);
    }
  }, [addLine, wallet, connectWallet, mintNFT, getBalance, getNFTs]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isProcessing) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (currentInput.trim()) {
          executeCommand(currentInput);
          setCurrentInput("");
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (commandHistory.length > 0) {
          const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[newIndex]);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex !== -1) {
          const newIndex = historyIndex + 1;
          if (newIndex >= commandHistory.length) {
            setHistoryIndex(-1);
            setCurrentInput("");
          } else {
            setHistoryIndex(newIndex);
            setCurrentInput(commandHistory[newIndex]);
          }
        }
      }
    },
    [currentInput, commandHistory, historyIndex, isProcessing, executeCommand]
  );

  return {
    lines,
    currentInput,
    setCurrentInput,
    isProcessing,
    scrollRef,
    handleKeyDown,
    addLine,
  };
}
