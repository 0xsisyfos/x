import { create } from "zustand";
import { Alert } from "react-native";
import {
  StarkSDK,
  StarkSigner,
  OpenZeppelinPreset,
  ArgentPreset,
  BraavosPreset,
  DevnetPreset,
  type WalletInterface,
  type AccountClassConfig,
  type ChainId,
} from "x";

// Network configuration type
export interface NetworkConfig {
  name: string;
  chainId: ChainId;
  rpcUrl: string;
}

// Available network presets
export const NETWORKS: NetworkConfig[] = [
  {
    name: "Sepolia",
    chainId: "SN_SEPOLIA",
    rpcUrl: "https://api.cartridge.gg/x/starknet/sepolia/rpc/v0_9",
  },
  {
    name: "Mainnet",
    chainId: "SN_MAIN",
    rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9",
  },
];

// Default network (index into NETWORKS array, or null for custom)
export const DEFAULT_NETWORK_INDEX = 0;

// Account presets
export const PRESETS: Record<string, AccountClassConfig> = {
  OpenZeppelin: OpenZeppelinPreset,
  Argent: ArgentPreset,
  Braavos: BraavosPreset,
  Devnet: DevnetPreset,
};

interface WalletState {
  // SDK configuration
  rpcUrl: string;
  chainId: ChainId;
  sdk: StarkSDK | null;
  isConfigured: boolean;
  selectedNetworkIndex: number | null; // null means custom

  // Form state for custom network
  customRpcUrl: string;
  customChainId: ChainId;

  // Form state
  privateKey: string;
  selectedPreset: string;

  // Wallet state
  wallet: WalletInterface | null;
  isDeployed: boolean | null;

  // Loading states
  isConnecting: boolean;
  isCheckingStatus: boolean;

  // Logs
  logs: string[];

  // Network configuration actions
  selectNetwork: (index: number) => void;
  selectCustomNetwork: () => void;
  setCustomRpcUrl: (url: string) => void;
  setCustomChainId: (chainId: ChainId) => void;
  confirmNetworkConfig: () => void;
  resetNetworkConfig: () => void;

  // Actions
  setPrivateKey: (key: string) => void;
  setSelectedPreset: (preset: string) => void;
  addLog: (message: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  checkDeploymentStatus: () => Promise<void>;
  deploy: () => Promise<void>;
}

const truncateAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const defaultNetwork = NETWORKS[DEFAULT_NETWORK_INDEX];

export const useWalletStore = create<WalletState>((set, get) => ({
  // SDK configuration - starts unconfigured
  rpcUrl: defaultNetwork.rpcUrl,
  chainId: defaultNetwork.chainId,
  sdk: null,
  isConfigured: false,
  selectedNetworkIndex: DEFAULT_NETWORK_INDEX,

  // Custom network form state
  customRpcUrl: "",
  customChainId: "SN_SEPOLIA",

  // Initial state
  privateKey: "",
  selectedPreset: "OpenZeppelin",
  wallet: null,
  isDeployed: null,
  isConnecting: false,
  isCheckingStatus: false,
  logs: [],

  // Network configuration actions
  selectNetwork: (index) => {
    const network = NETWORKS[index];
    if (network) {
      set({
        selectedNetworkIndex: index,
        rpcUrl: network.rpcUrl,
        chainId: network.chainId,
      });
    }
  },

  selectCustomNetwork: () => {
    set({ selectedNetworkIndex: null });
  },

  setCustomRpcUrl: (url) => set({ customRpcUrl: url }),

  setCustomChainId: (chainId) => set({ customChainId: chainId }),

  confirmNetworkConfig: () => {
    const { selectedNetworkIndex, customRpcUrl, customChainId, addLog } = get();

    let rpcUrl: string;
    let chainId: ChainId;

    if (selectedNetworkIndex !== null) {
      const network = NETWORKS[selectedNetworkIndex];
      rpcUrl = network.rpcUrl;
      chainId = network.chainId;
    } else {
      // Custom network
      if (!customRpcUrl.trim()) {
        Alert.alert("Error", "Please enter a valid RPC URL");
        return;
      }
      rpcUrl = customRpcUrl.trim();
      chainId = customChainId;
    }

    const newSdk = new StarkSDK({ rpcUrl, chainId });
    set({
      sdk: newSdk,
      rpcUrl,
      chainId,
      isConfigured: true,
      logs: [
        `SDK configured with ${selectedNetworkIndex !== null ? NETWORKS[selectedNetworkIndex].name : "Custom Network"}`,
      ],
    });
    addLog(`RPC: ${rpcUrl}`);
    addLog(`Chain: ${chainId}`);
  },

  resetNetworkConfig: () => {
    const { addLog } = get();
    set({
      sdk: null,
      isConfigured: false,
      wallet: null,
      isDeployed: null,
      privateKey: "",
      selectedNetworkIndex: DEFAULT_NETWORK_INDEX,
      rpcUrl: defaultNetwork.rpcUrl,
      chainId: defaultNetwork.chainId,
    });
    addLog("Network configuration reset");
  },

  // Actions
  setPrivateKey: (key) => set({ privateKey: key }),

  setSelectedPreset: (preset) => set({ selectedPreset: preset }),

  addLog: (message) =>
    set((state) => ({
      logs: [...state.logs, `[${new Date().toLocaleTimeString()}] ${message}`],
    })),

  connect: async () => {
    const { privateKey, selectedPreset, sdk, addLog } = get();

    if (!sdk) {
      Alert.alert(
        "Error",
        "SDK not configured. Please configure network first."
      );
      return;
    }

    if (!privateKey.trim()) {
      Alert.alert("Error", "Please enter a private key");
      return;
    }

    set({ isConnecting: true });
    addLog(`Connecting with ${selectedPreset} account...`);

    try {
      const signer = new StarkSigner(privateKey.trim());
      const connectedWallet = await sdk.connectWallet({
        account: {
          signer,
          accountClass: PRESETS[selectedPreset],
        },
      });

      set({ wallet: connectedWallet });
      addLog(`Connected: ${truncateAddress(connectedWallet.address)}`);

      // Check deployment status after connecting
      await get().checkDeploymentStatus();
    } catch (err) {
      addLog(`Connection failed: ${err}`);
      Alert.alert("Connection Failed", String(err));
    } finally {
      set({ isConnecting: false });
    }
  },

  disconnect: () => {
    const { addLog } = get();
    set({
      wallet: null,
      isDeployed: null,
      privateKey: "",
    });
    addLog("Disconnected");
  },

  checkDeploymentStatus: async () => {
    const { wallet, addLog } = get();
    if (!wallet) return;

    set({ isCheckingStatus: true });
    try {
      const deployed = await wallet.isDeployed();
      set({ isDeployed: deployed });
      addLog(`Account is ${deployed ? "deployed ✓" : "not deployed"}`);
    } catch (err) {
      addLog(`Failed to check status: ${err}`);
    } finally {
      set({ isCheckingStatus: false });
    }
  },

  deploy: async () => {
    const { wallet, addLog, checkDeploymentStatus } = get();
    if (!wallet) return;

    set({ isConnecting: true });
    addLog("Deploying account...");

    try {
      const tx = await wallet.deploy();
      addLog(`Deploy tx submitted: ${truncateAddress(tx.hash)}`);

      addLog("Waiting for confirmation...");
      await tx.wait();

      addLog("Account deployed successfully!");
      await checkDeploymentStatus();
    } catch (err) {
      addLog(`Deployment failed: ${err}`);
      Alert.alert("Deployment Failed", String(err));
    } finally {
      set({ isConnecting: false });
    }
  },
}));
