import React from "react";
import ReactDOM from "react-dom/client";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { Base } from "@thirdweb-dev/chains";
import App from "./App";
import "./index.css";

/**
 * Main Entry Point - Alternative if you want to wrap ThirdwebProvider here
 * instead of in App.tsx
 */

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThirdwebProvider
      activeChain={Base}
      clientId={import.meta.env.VITE_THIRDWEB_CLIENT_ID || "your-client-id-here"}
      
      // Do NOT specify supportedWallets to show all 500+ wallets
      // supportedWallets={undefined}
      
      autoSwitch={true}
      dAppMeta={{
        name: "CMDH02 Terminal",
        description: "Web3 Terminal Interface",
        isDarkMode: true,
      }}
    >
      <App />
    </ThirdwebProvider>
  </React.StrictMode>
);
