import type { Wallet } from "../wallet/index.js";
import type { ExecuteOptions, Token } from "../types/index.js";
import { type Call, CallData, uint256 } from "starknet";
import type { Tx } from "../tx/index.js";

export class Erc20 {
  private readonly token: Token;

  constructor(token: Token) {
    this.token = token;
  }

  /**
   * Transfer tokens to one or more addresses.
   * @param args.from - Wallet to transfer tokens from
   * @param args.transfers - Array of transfer objects, each containing a to address and an amount
   * @param args.options - Optional execution options
   */
  public async transfer(args: {
    from: Wallet;
    transfers: { to: string; amount: string }[];
    options?: ExecuteOptions;
  }): Promise<Tx> {
    const calls: Call[] = args.transfers.map((transfer) => {
      return {
        contractAddress: this.token.address,
        entrypoint: "transfer",
        calldata: CallData.compile([
          transfer.to,
          uint256.bnToUint256(transfer.amount.toString()), // TODO check that
        ]),
      };
    });

    return await args.from.execute(calls, args.options);
  }

  /**
   * Get the balance in a wallet.
   * @param args.wallet - Wallet to check the balance of
   */
  public async balanceOf(args: { wallet: Wallet }): Promise<bigint> {
    const provider = args.wallet.getProvider();
    const address = args.wallet.address;
    const result = await provider.callContract({
      contractAddress: this.token.address,
      entrypoint: "balanceOf",
      calldata: CallData.compile([address]),
    });
    return uint256.uint256ToBN({
      low: result[0] as string,
      high: result[1] as string,
    });
  }
}
