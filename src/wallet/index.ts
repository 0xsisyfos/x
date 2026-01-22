import {
  Account,
  RpcProvider,
  type Call,
  type PaymasterTimeBounds,
  TransactionFinalityStatus,
} from "starknet";
import { Tx } from "../tx/index.js";
import { AccountProvider } from "./accounts/provider.js";
import type {
  EnsureReadyOptions,
  ExecuteOptions,
  FeeMode,
  PreflightOptions,
  PreflightResult,
} from "../types/wallet.js";
import type { SDKConfig } from "../types/config.js";

/**
 * Represents a connected Starknet wallet.
 * Provides methods for deployment, transaction execution, and preflight checks.
 *
 * Sponsored transactions use AVNU's paymaster (built into starknet.js).
 */
export class Wallet {
  /** The wallet's Starknet address */
  readonly address: string;

  private readonly provider: RpcProvider;
  private readonly account: Account;
  private readonly accountProvider: AccountProvider;
  private readonly config: SDKConfig;
  private readonly defaultFeeMode: FeeMode;
  private readonly defaultTimeBounds: PaymasterTimeBounds | undefined;

  private constructor(
    address: string,
    accountProvider: AccountProvider,
    account: Account,
    provider: RpcProvider,
    config: SDKConfig,
    defaultFeeMode: FeeMode = "user_pays",
    defaultTimeBounds?: PaymasterTimeBounds
  ) {
    this.address = address;
    this.accountProvider = accountProvider;
    this.account = account;
    this.provider = provider;
    this.config = config;
    this.defaultFeeMode = defaultFeeMode;
    this.defaultTimeBounds = defaultTimeBounds;
  }

  /**
   * Create a new Wallet instance.
   * Use this instead of constructor since address computation is async.
   */
  static async create(
    accountProvider: AccountProvider,
    provider: RpcProvider,
    config: SDKConfig,
    defaultFeeMode: FeeMode = "user_pays",
    defaultTimeBounds?: PaymasterTimeBounds
  ): Promise<Wallet> {
    const address = await accountProvider.getAddress();
    const signer = accountProvider.getSigner();

    // Create account with optional custom paymaster
    const accountOptions = {
      provider,
      address,
      signer: signer._getStarknetSigner(),
      ...(config.paymaster && { paymaster: config.paymaster }),
    };
    const account = new Account(accountOptions);

    return new Wallet(
      address,
      accountProvider,
      account,
      provider,
      config,
      defaultFeeMode,
      defaultTimeBounds
    );
  }

  /**
   * Check if the account contract is deployed on-chain.
   */
  async isDeployed(): Promise<boolean> {
    try {
      const classHash = await this.provider.getClassHashAt(this.address);
      return !!classHash;
    } catch {
      return false;
    }
  }

  /**
   * Ensure the wallet is ready for transactions.
   * Optionally deploys the account if needed.
   */
  async ensureReady(options: EnsureReadyOptions = {}): Promise<void> {
    const { deploy = "if_needed", onProgress } = options;

    onProgress?.({ step: "CONNECTED" });

    onProgress?.({ step: "CHECK_DEPLOYED" });
    const deployed = await this.isDeployed();

    if (deployed && deploy !== "always") {
      onProgress?.({ step: "READY" });
      return;
    }

    if (!deployed && deploy === "never") {
      throw new Error("Account not deployed and deploy mode is 'never'");
    }

    onProgress?.({ step: "DEPLOYING" });
    const tx = await this.deploy();
    await tx.wait({
      successStates: [
        TransactionFinalityStatus.ACCEPTED_ON_L2,
        TransactionFinalityStatus.ACCEPTED_ON_L1,
      ],
    });

    onProgress?.({ step: "READY" });
  }

  /**
   * Deploy the account contract.
   * Returns a Tx object to track the deployment.
   *
   * Note: Sponsored deployment is not yet supported by AVNU paymaster.
   * Deployment always uses user_pays fee mode.
   */
  async deploy(): Promise<Tx> {
    const classHash = this.accountProvider.getClassHash();
    const publicKey = await this.accountProvider.getPublicKey();
    const constructorCalldata =
      this.accountProvider.getConstructorCalldata(publicKey);

    // Note: AVNU paymaster doesn't support account deployment yet
    // Always use regular deployment
    const { transaction_hash } = await this.account.deployAccount({
      classHash,
      constructorCalldata,
      addressSalt: publicKey,
    });

    return new Tx(transaction_hash, this.provider, this.config.explorer);
  }

  /**
   * Execute one or more contract calls.
   * Returns a Tx object to track the transaction.
   *
   * When feeMode="sponsored", uses AVNU paymaster for gasless transactions.
   */
  async execute(calls: Call[], options: ExecuteOptions = {}): Promise<Tx> {
    const feeMode = options.feeMode ?? this.defaultFeeMode;
    const timeBounds = options.timeBounds ?? this.defaultTimeBounds;

    if (feeMode === "sponsored") {
      // Use AVNU paymaster for sponsored transactions
      const paymasterDetails = {
        feeMode: { mode: "sponsored" as const },
        ...(timeBounds && { timeBounds }),
      };

      const { transaction_hash } =
        await this.account.executePaymasterTransaction(calls, paymasterDetails);

      return new Tx(transaction_hash, this.provider, this.config.explorer);
    }

    // User pays: let starknet.js estimate fees
    const { transaction_hash } = await this.account.execute(calls);

    return new Tx(transaction_hash, this.provider, this.config.explorer);
  }

  /**
   * Check if an operation can succeed before attempting it.
   */
  async preflight(options: PreflightOptions): Promise<PreflightResult> {
    const { kind, calls = [] } = options;

    try {
      // Check deployment status
      const deployed = await this.isDeployed();
      if (!deployed && kind !== "execute") {
        return { ok: false, reason: "Account not deployed" };
      }

      // Simulate transaction if calls provided
      if (calls.length > 0) {
        const simulation = await this.account.simulateTransaction([
          { type: "INVOKE", payload: calls },
        ]);

        const result = simulation[0];
        if (
          result &&
          "transaction_trace" in result &&
          result.transaction_trace
        ) {
          const trace = result.transaction_trace;
          if (
            "execute_invocation" in trace &&
            trace.execute_invocation &&
            "revert_reason" in trace.execute_invocation
          ) {
            return {
              ok: false,
              reason:
                trace.execute_invocation.revert_reason ?? "Simulation failed",
            };
          }
        }
      }

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get the underlying starknet.js Account instance.
   */
  getAccount(): Account {
    return this.account;
  }
}
