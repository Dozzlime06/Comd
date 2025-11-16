import { createThirdwebClient } from "thirdweb";
import { base } from "thirdweb/chains";

export const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || "053fc1b5db7ca4a50a1d63e596228c09",
});

export const chain = base;
