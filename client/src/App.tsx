import { Web3Provider } from "@/contexts/Web3Context";
import { Terminal } from "@/components/Terminal";

function App() {
  return (
    <Web3Provider>
      <Terminal />
    </Web3Provider>
  );
}

export default App;
