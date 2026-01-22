import type { Call, ResourceBoundsBN } from "starknet";

/**
 * A hint passed from the client to your backend to help decide
 * whether to sponsor a transaction.
 *
 * @example
 * ```ts
 * { action: "onboarding" }
 * { action: "btc_payout", userId: "user_123" }
 * ```
 */
export interface SponsorPolicyHint {
  /** The type of action being performed (e.g., "onboarding", "stake_btc") */
  action: string;
  /** Additional context your backend may need */
  [key: string]: unknown;
}

/**
 * The request sent to your backend's sponsorship endpoint.
 *
 * Your backend should:
 * 1. Verify the `calls` match the claimed `policyHint`
 * 2. Check if this user/action qualifies for sponsorship
 * 3. Return a `SponsorshipResponse` or reject
 *
 * @example
 * ```ts
 * {
 *   calls: [{ contractAddress: "0x...", entrypoint: "transfer", calldata: [...] }],
 *   callerAddress: "0xUSER_ADDRESS",
 *   chainId: "SN_MAIN",
 *   policyHint: { action: "onboarding" }
 * }
 * ```
 */
export interface SponsorshipRequest {
  /** The transaction calls to be executed */
  calls: Call[];
  /** The address of the account sending the transaction */
  callerAddress: string;
  /** The Starknet chain ID (e.g., "SN_MAIN", "SN_SEPOLIA") */
  chainId: string;
  /** Optional hint for your backend's sponsorship policy */
  policyHint?: SponsorPolicyHint | undefined;
}

/**
 * The response from your backend's sponsorship endpoint.
 *
 * You can provide either:
 * - `resourceBounds`: V3 transaction resource bounds (preferred)
 * - `maxFee`: Legacy max fee (will be converted to resource bounds)
 *
 * @example
 * ```ts
 * // V3 style with resource bounds (preferred)
 * {
 *   resourceBounds: {
 *     l1_gas: { max_amount: 1000n, max_price_per_unit: 1000000000n },
 *     l2_gas: { max_amount: 0n, max_price_per_unit: 0n },
 *     l1_data_gas: { max_amount: 0n, max_price_per_unit: 0n },
 *   }
 * }
 *
 * // With paymaster data
 * {
 *   resourceBounds: { ... },
 *   paymasterData: ["0x...", "0x..."]
 * }
 * ```
 */
export interface SponsorshipResponse {
  /**
   * V3 transaction resource bounds.
   * Specifies the maximum resources the sponsor will cover.
   */
  resourceBounds?: ResourceBoundsBN;
  /**
   * Optional: Additional data for the paymaster contract.
   * Format depends on your paymaster implementation.
   */
  paymasterData?: bigint[];
  /**
   * Optional: Account deployment data for first-time deployment sponsorship.
   */
  accountDeploymentData?: bigint[];
  /**
   * Optional: Tip for transaction priority.
   */
  tip?: bigint;
  /** Additional paymaster-specific fields */
  [key: string]: unknown;
}
