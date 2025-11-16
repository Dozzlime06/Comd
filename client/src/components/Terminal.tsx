import { useEffect, useRef } from "react";
import { useTerminal } from "@/hooks/useTerminal";
import { type TerminalLine } from "@shared/schema";
import { ConnectButton } from "thirdweb/react";
import { client, chain } from "@/lib/thirdweb";

const ASCII_HEADER = `
 ██████╗███╗   ███╗██████╗ ██╗  ██╗ ██████╗ ██████╗ 
██╔════╝████╗ ████║██╔══██╗██║  ██║██╔═████╗╚════██╗
██║     ██╔████╔██║██║  ██║███████║██║██╔██║ █████╔╝
██║     ██║╚██╔╝██║██║  ██║╚════██║████╔╝██║██╔═══╝ 
╚██████╗██║ ╚═╝ ██║██████╔╝     ██║╚██████╔╝███████╗
 ╚═════╝╚═╝     ╚═╝╚═════╝      ╚═╝ ╚═════╝ ╚══════╝
`;

export function Terminal() {
  const { lines, currentInput, setCurrentInput, isProcessing, scrollRef, handleKeyDown } = useTerminal();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && !isProcessing) {
      inputRef.current.focus();
    }
  }, [isProcessing, lines]);

  const getLineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "command":
        return "text-foreground";
      case "output":
        return "text-foreground";
      case "error":
        return "text-destructive";
      case "info":
        return "text-accent";
      default:
        return "text-foreground";
    }
  };

  return (
    <div 
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: "#0f0f0f" }}
      data-testid="terminal-container"
    >
      {/* ASCII Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        <pre 
          className="text-foreground text-xs leading-tight select-none"
          data-testid="ascii-header"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {ASCII_HEADER}
        </pre>
        <div className="h-px bg-border my-4" />
      </div>

      {/* Terminal Output Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6 space-y-1"
        data-testid="terminal-output"
      >
        {lines.map((line) => (
          <div
            key={line.id}
            className={`font-mono text-sm leading-relaxed ${getLineColor(line.type)}`}
            data-testid={`terminal-line-${line.type}`}
          >
            {line.text}
          </div>
        ))}

        {/* Current Input Line with Inline Cursor */}
        <div className="flex items-center font-mono text-sm leading-relaxed text-foreground">
          <span className="mr-2" data-testid="prompt-symbol">&gt;</span>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              className="w-full bg-transparent border-none outline-none text-foreground caret-transparent font-mono text-sm"
              style={{ caretColor: "transparent" }}
              data-testid="input-command"
              autoComplete="off"
              spellCheck="false"
            />
            {/* Blinking Cursor */}
            <span
              className="absolute text-accent animate-blink pointer-events-none font-mono text-sm"
              style={{
                left: `${currentInput.length * 0.6}ch`,
                top: "0",
              }}
              data-testid="cursor-blink"
            >
              █
            </span>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center space-x-2 text-accent font-mono text-sm" data-testid="processing-indicator">
            <span className="animate-pulse">Processing...</span>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div 
        className="flex-shrink-0 px-6 py-3 border-t border-border flex items-center justify-between text-xs font-mono"
        data-testid="status-bar"
      >
        <div className="text-muted-foreground">
          Base Chain | NFT Contract Active
        </div>
        <div className="text-accent">
          Ready
        </div>
      </div>

      {/* Hidden Thirdweb v5 Connect Button */}
      <div id="thirdweb-connect-btn" style={{ position: 'absolute', left: '-9999px' }}>
        <ConnectButton 
          client={client}
          chain={chain}
          theme="dark"
        />
      </div>
    </div>
  );
}
