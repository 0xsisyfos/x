import type { Address } from "./address.js";

/**
 * ERC20 token configuration.
 *
 * @example
 * ```ts
 * // Use a preset
 * import { TBTC, USDC } from "x";
 * sdk.erc20({ token: TBTC });
 *
 * // Or define custom
 * sdk.erc20({
 *   token: {
 *     name: "My Token",
 *     address: "0x...",
 *     decimals: 18,
 *     symbol: "MY_TOKEN",
 *   }
 * });
 * ```
 */
export interface Token {
  /** Human-readable name of the token */
  name: string;
  /** Contract address of the token */
  address: Address;
  /** Number of decimal places (e.g., 18 for ETH, 6 for USDC, 8 for BTC) */
  decimals: number;
  /** Token symbol for display */
  symbol: string;
}
