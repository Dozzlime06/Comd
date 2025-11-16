import React from "react";
import ReactDOM from "react-dom/client";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { Base } from "@thirdweb-dev/chains";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThirdwebProvider
      activeChain={Base}
      clientId={import.meta.env.VITE_THIRDWEB_CLIENT_ID}
      // CRITICAL: Explicitly remove supportedWallets
      supportedWallets={undefined}
    >
      <App />
    </ThirdwebProvider>
  </React.StrictMode>
);
