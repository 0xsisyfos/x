import type { PaymasterOptions } from "starknet";

/** Supported Starknet chain identifiers */
export type ChainId = "SN_MAIN" | "SN_SEPOLIA";

/** Supported block explorer providers */
export type ExplorerProvider = "voyager" | "starkscan";

/**
 * Configuration for building explorer URLs.
 *
 * @example
 * ```ts
 * // Use a known provider
 * { provider: "voyager" }
 *
 * // Use a custom explorer
 * { baseUrl: "https://my-explorer.com" }
 * ```
 */
export interface ExplorerConfig {
  /** Use a known explorer provider */
  provider?: ExplorerProvider;
  /** Or provide a custom base URL (takes precedence over provider) */
  baseUrl?: string;
}

/**
 * Main configuration for the StarkSDK.
 *
 * Sponsored transactions use AVNU's paymaster (built into starknet.js).
 * You can optionally configure a custom paymaster endpoint.
 *
 * @example
 * ```ts
 * // Basic config (uses default AVNU paymaster for sponsored txs)
 * const sdk = new StarkSDK({
 *   rpcUrl: "https://starknet-mainnet.infura.io/v3/YOUR_KEY",
 *   chainId: "SN_MAIN",
 * });
 *
 * // With custom paymaster endpoint
 * const sdk = new StarkSDK({
 *   rpcUrl: "https://starknet-mainnet.infura.io/v3/YOUR_KEY",
 *   chainId: "SN_MAIN",
 *   paymaster: { nodeUrl: "https://custom-paymaster.example.com" },
 * });
 * ```
 */
export interface SDKConfig {
  /** Starknet JSON-RPC endpoint URL */
  rpcUrl: string;
  /** Target chain (mainnet or testnet) */
  chainId: ChainId;
  /** Optional: custom paymaster config (default: AVNU paymaster) */
  paymaster?: PaymasterOptions;
  /** Optional: configures how explorer URLs are built */
  explorer?: ExplorerConfig;
}
