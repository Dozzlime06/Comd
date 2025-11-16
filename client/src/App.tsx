import { ThirdwebProvider } from "@thirdweb-dev/react";
import { Base } from "@thirdweb-dev/chains";
import { Web3Provider } from "@/contexts/Web3Context";
import { Terminal } from "@/components/Terminal";  // ← Capital T

function App() {
  return (
    <ThirdwebProvider
      activeChain={Base}
      clientId={import.meta.env.VITE_THIRDWEB_CLIENT_ID}
      autoSwitch={true}
      dAppMeta={{
        name: "CMDH02 Terminal",
        description: "Web3 Terminal Interface",
        isDarkMode: true,
      }}
    >
      <Web3Provider>
        <Terminal />
      </Web3Provider>
    </ThirdwebProvider>
  );
}

export default App;
