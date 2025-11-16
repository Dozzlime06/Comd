import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThirdwebProvider, metamaskWallet, coinbaseWallet, walletConnect } from "@thirdweb-dev/react";
import { Web3Provider } from "@/contexts/Web3Context";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider 
        activeChain="base"
        clientId={import.meta.env.VITE_THIRDWEB_CLIENT_ID || "053fc1b5db7ca4a50a1d63e596228c09"}
        supportedWallets={[
          metamaskWallet(),
          coinbaseWallet(),
          walletConnect(),
        ]}
      >
        <Web3Provider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </Web3Provider>
      </ThirdwebProvider>
    </QueryClientProvider>
  );
}

export default App;
