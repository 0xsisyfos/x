import type { Token } from "./token.js";

/**
 * Input type for creating Amount instances.
 * Accepts string, number, or bigint values.
 *
 * @example
 * ```ts
 * // All of these are valid AmountInput values:
 * "1.5"      // string with decimals
 * "100"      // string integer
 * 1.5        // number with decimals
 * 100        // number integer
 * 100n       // bigint
 * ```
 */
export type AmountInput = string | number | bigint;

/**
 * Represents a token amount with precision handling for blockchain operations.
 *
 * The Amount class provides a safe way to handle token amounts by distinguishing between:
 * - **Unit values**: Human-readable values (e.g., 1.5 ETH, 100 USDC)
 * - **Base values**: Raw blockchain values with full precision (e.g., 1500000000000000000 wei)
 *
 * This separation prevents common precision errors when working with blockchain token amounts.
 *
 * @example
 * ```ts
 * // Creating from human-readable unit values
 * const ethAmount = Amount.fromUnit("1.5", 18, "ETH");
 * const usdcAmount = Amount.fromUnit(100, 6, "USDC");
 *
 * // Creating from raw blockchain values
 * const rawAmount = Amount.fromBase(1500000000000000000n, 18, "ETH");
 *
 * // Using with Token presets
 * const strkAmount = Amount.fromTokenUnit("10", STRK);
 *
 * // Converting for display or contract calls
 * console.log(ethAmount.toUnit());      // "1.5"
 * console.log(ethAmount.toBase());      // 1500000000000000000n
 * console.log(ethAmount.toFormatted()); // "1.5 ETH" (locale-formatted)
 * ```
 */
export class Amount {
  /**
   * The raw base value (e.g., FRI, wei) - Single Source of Truth.
   * All conversions derive from this value.
   */
  private readonly baseValue: bigint;

  /**
   * Number of decimal places for this token (e.g., 18 for ETH, 6 for USDC).
   */
  private readonly decimals: number;

  /**
   * Optional token symbol for display purposes (e.g., "ETH", "STRK").
   */
  private readonly symbol: string | undefined;

  private constructor(value: bigint, decimals: number, symbol?: string) {
    this.baseValue = value;
    this.decimals = decimals;
    this.symbol = symbol;
  }

  /**
   * Creates an Amount from a human-readable unit value using a Token definition.
   *
   * This is the recommended method when working with known tokens as it automatically
   * uses the correct decimals and symbol from the token configuration.
   *
   * @param amount - The unit amount as string, number, or bigint (e.g., "1.5", 100, 10n)
   * @param token - Token definition containing decimals and symbol
   * @returns A new Amount instance
   * @throws Error if the amount format is invalid or exceeds token precision
   *
   * @example
   * ```ts
   * import { STRK, USDC } from "x";
   *
   * const strkAmount = Amount.fromTokenUnit("1.5", STRK);
   * const usdcAmount = Amount.fromTokenUnit(100, USDC);
   * ```
   */
  static fromTokenUnit(amount: AmountInput, token: Token): Amount {
    return this.fromUnit(amount, token.decimals, token.symbol);
  }

  /**
   * Creates an Amount from a human-readable unit value (e.g., "1.5" ETH).
   *
   * Use this method when you have a value that a user would recognize,
   * like "1.5" for 1.5 ETH or "100" for 100 USDC.
   *
   * @param amount - The unit amount as string, number, or bigint
   * @param decimals - Number of decimal places for the token (e.g., 18 for ETH, 6 for USDC)
   * @param symbol - Optional token symbol for display formatting
   * @returns A new Amount instance
   * @throws Error if the amount format is invalid (negative, non-numeric)
   * @throws Error if the amount exceeds the specified decimal precision
   *
   * @example
   * ```ts
   * // From string (most precise)
   * Amount.fromUnit("1.5", 18, "ETH")     // 1.5 ETH = 1500000000000000000 wei
   *
   * // From number (be careful with floating point)
   * Amount.fromUnit(1.5, 18, "ETH")       // Same as above
   *
   * // From bigint (treated as whole units)
   * Amount.fromUnit(10n, 18, "ETH")       // 10 ETH = 10000000000000000000 wei
   *
   * // With different decimals
   * Amount.fromUnit("100", 6, "USDC")     // 100 USDC = 100000000 base units
   * Amount.fromUnit("0.5", 8, "BTC")      // 0.5 BTC = 50000000 satoshis
   * ```
   */
  static fromUnit(
    amount: AmountInput,
    decimals: number,
    symbol?: string
  ): Amount {
    // If someone passes a raw bigint here, it's ambiguous.
    // We treat it as whole units (e.g., 10n -> 10 STRK).
    const amountStr = amount.toString();

    if (!amountStr.match(/^\d+(\.\d+)?$/)) {
      throw new Error(
        `Invalid unit amount: "${amountStr}". Must be a positive number.`
      );
    }

    const [integer, fraction = ""] = amountStr.split(".");

    if (fraction.length > decimals) {
      throw new Error(
        `Precision overflow: "${amountStr}" exceeds ${decimals} decimal places.`
      );
    }

    // Pad right: "1.5" (18 decimals) -> "1" + "5" + "000..."
    const paddedFraction = fraction.padEnd(decimals, "0");
    const baseValue = BigInt(`${integer}${paddedFraction}`);

    return new Amount(baseValue, decimals, symbol);
  }

  /**
   * Creates an Amount from a raw base value using a Token definition.
   *
   * This is the recommended method when receiving values from blockchain
   * contracts or APIs, as it automatically uses the correct decimals
   * and symbol from the token configuration.
   *
   * @param amount - The base amount as string, number, or bigint (e.g., raw contract value)
   * @param token - Token definition containing decimals and symbol
   * @returns A new Amount instance
   *
   * @example
   * ```ts
   * import { STRK } from "x";
   *
   * // From a contract call that returns raw FRI value
   * const balance = await contract.balanceOf(address);
   * const amount = Amount.fromTokenBase(balance, STRK);
   * console.log(amount.toUnit()); // Human-readable balance
   * ```
   */
  static fromTokenBase(amount: AmountInput, token: Token): Amount {
    return this.fromBase(amount, token.decimals, token.symbol);
  }

  /**
   * Creates an Amount directly from a raw base value (e.g., wei, FRI, satoshis).
   *
   * Use this method when you have a value directly from the blockchain,
   * such as a balance query or transaction amount.
   *
   * @param amount - The raw base amount as string, number, or bigint
   * @param decimals - Number of decimal places for the token
   * @param symbol - Optional token symbol for display formatting
   * @returns A new Amount instance
   *
   * @example
   * ```ts
   * // From bigint (typical blockchain response)
   * Amount.fromBase(1500000000000000000n, 18, "ETH")  // 1.5 ETH
   *
   * // From string (e.g., from JSON response)
   * Amount.fromBase("1500000000000000000", 18, "ETH") // 1.5 ETH
   *
   * // From number (be careful with large values)
   * Amount.fromBase(1000000, 6, "USDC")               // 1 USDC
   * ```
   */
  static fromBase(
    amount: AmountInput,
    decimals: number,
    symbol?: string
  ): Amount {
    const baseValue = BigInt(amount);
    return new Amount(baseValue, decimals, symbol);
  }

  /**
   * Returns the raw base value as a bigint for use in smart contract calls.
   *
   * This is the value you should pass to Starknet contracts and other
   * blockchain operations that expect raw token amounts.
   *
   * @returns The raw base value as bigint (e.g., wei, FRI)
   *
   * @example
   * ```ts
   * const amount = Amount.fromUnit("1.5", 18, "ETH");
   * const rawValue = amount.toBase(); // 1500000000000000000n
   *
   * // Use in contract call
   * await contract.transfer(recipient, rawValue);
   * ```
   */
  public toBase(): bigint {
    return this.baseValue;
  }

  /**
   * Returns the human-readable unit value as a string.
   *
   * This is the value suitable for displaying to users. Trailing zeros
   * after the decimal point are automatically removed.
   *
   * @returns The unit value as a string (e.g., "1.5", "100", "0.001")
   *
   * @example
   * ```ts
   * Amount.fromBase(1500000000000000000n, 18).toUnit()  // "1.5"
   * Amount.fromBase(1000000000000000000n, 18).toUnit()  // "1"
   * Amount.fromBase(500n, 18).toUnit()                   // "0.0000000000000005"
   * Amount.fromBase(100000000n, 6).toUnit()              // "100"
   * ```
   */
  public toUnit(): string {
    // Special case: no decimals means base value equals unit value
    if (this.decimals === 0) {
      return this.baseValue.toString();
    }

    const valueStr = this.baseValue.toString();

    // Pad left to handle small numbers (e.g. 500 FRI)
    // decimals + 1 char for integer part
    const padded = valueStr.padStart(this.decimals + 1, "0");

    const integer = padded.slice(0, -this.decimals);
    const fraction = padded.slice(-this.decimals);

    // Strip trailing zeros from decimal part
    const cleanFraction = fraction.replace(/0+$/, "");

    return cleanFraction ? `${integer}.${cleanFraction}` : integer;
  }

  /**
   * Returns a locale-formatted string with the token symbol for UI display.
   *
   * Uses the device's preferred locale for number formatting, including
   * appropriate thousand separators and decimal notation.
   *
   * @param compressed - If true, limits decimal places to 4 for compact display (default: false)
   * @returns Formatted string with symbol (e.g., "1,500.50 ETH", "0.0001 STRK")
   *
   * @example
   * ```ts
   * const amount = Amount.fromUnit("1500.123456", 18, "ETH");
   *
   * amount.toFormatted()       // "1,500.123456 ETH" (full precision)
   * amount.toFormatted(true)   // "1,500.1235 ETH" (compressed to 4 decimals)
   *
   * // Without symbol
   * const noSymbol = Amount.fromUnit("100", 6);
   * noSymbol.toFormatted()     // "100" (no symbol appended)
   * ```
   */
  public toFormatted(compressed: boolean = false): string {
    return tokenAmountToFormatted(
      compressed,
      this.baseValue,
      this.decimals,
      this.symbol ?? ""
    );
  }

  /**
   * Returns the number of decimal places for this amount.
   *
   * Useful for validation when working with specific token contracts.
   *
   * @returns The number of decimal places (e.g., 18 for ETH, 6 for USDC)
   *
   * @example
   * ```ts
   * const ethAmount = Amount.fromUnit("1.5", 18, "ETH");
   * console.log(ethAmount.getDecimals()); // 18
   *
   * const usdcAmount = Amount.fromTokenUnit("100", USDC);
   * console.log(usdcAmount.getDecimals()); // 6
   * ```
   */
  public getDecimals(): number {
    return this.decimals;
  }

  /**
   * Returns the token symbol for this amount, if set.
   *
   * Useful for validation when working with specific token contracts.
   *
   * @returns The token symbol (e.g., "ETH", "USDC") or undefined if not set
   *
   * @example
   * ```ts
   * const ethAmount = Amount.fromUnit("1.5", 18, "ETH");
   * console.log(ethAmount.getSymbol()); // "ETH"
   *
   * const noSymbol = Amount.fromUnit("1.5", 18);
   * console.log(noSymbol.getSymbol()); // undefined
   * ```
   */
  public getSymbol(): string | undefined {
    return this.symbol;
  }

  /**
   * Checks if another Amount is compatible for operations.
   * Two amounts are compatible if they have the same decimals and symbol.
   *
   * @param other - The other Amount to check against
   * @returns true if compatible, false otherwise
   */
  private isCompatible(other: Amount): boolean {
    if (this.decimals !== other.decimals) {
      return false;
    }

    // Only check symbols if both are set
    if (
      this.symbol !== undefined &&
      other.symbol !== undefined &&
      this.symbol !== other.symbol
    ) {
      return false;
    }

    return true;
  }

  /**
   * Validates that another Amount is compatible for arithmetic operations.
   * Two amounts are compatible if they have the same decimals and symbol.
   *
   * @param other - The other Amount to validate against
   * @throws Error if decimals don't match
   * @throws Error if symbols don't match (when both are set)
   */
  private assertCompatible(other: Amount): void {
    if (this.decimals !== other.decimals) {
      throw new Error(
        `Cannot perform arithmetic on amounts with different decimals: ${this.decimals} vs ${other.decimals}`
      );
    }

    // Only validate symbols if both are set
    if (
      this.symbol !== undefined &&
      other.symbol !== undefined &&
      this.symbol !== other.symbol
    ) {
      throw new Error(
        `Cannot perform arithmetic on amounts with different symbols: "${this.symbol}" vs "${other.symbol}"`
      );
    }
  }

  /**
   * Adds another Amount to this one.
   *
   * Both amounts must have the same decimals and symbol (if set).
   *
   * @param other - The Amount to add
   * @returns A new Amount representing the sum
   * @throws Error if decimals don't match
   * @throws Error if symbols don't match (when both are set)
   *
   * @example
   * ```ts
   * const a = Amount.fromUnit("1.5", 18, "ETH");
   * const b = Amount.fromUnit("2.5", 18, "ETH");
   * const sum = a.add(b);
   * console.log(sum.toUnit()); // "4"
   * ```
   */
  public add(other: Amount): Amount {
    this.assertCompatible(other);
    return new Amount(
      this.baseValue + other.baseValue,
      this.decimals,
      this.symbol ?? other.symbol
    );
  }

  /**
   * Subtracts another Amount from this one.
   *
   * Both amounts must have the same decimals and symbol (if set).
   * Note: This can result in a negative base value if other > this.
   *
   * @param other - The Amount to subtract
   * @returns A new Amount representing the difference
   * @throws Error if decimals don't match
   * @throws Error if symbols don't match (when both are set)
   *
   * @example
   * ```ts
   * const a = Amount.fromUnit("5", 18, "ETH");
   * const b = Amount.fromUnit("2", 18, "ETH");
   * const diff = a.subtract(b);
   * console.log(diff.toUnit()); // "3"
   * ```
   */
  public subtract(other: Amount): Amount {
    this.assertCompatible(other);
    return new Amount(
      this.baseValue - other.baseValue,
      this.decimals,
      this.symbol ?? other.symbol
    );
  }

  /**
   * Multiplies this Amount by a scalar value.
   *
   * The scalar can be a string, number, or bigint. Fractional multipliers
   * are supported (e.g., "0.5" to halve the amount).
   *
   * @param multiplier - The scalar value to multiply by
   * @returns A new Amount representing the product
   * @throws Error if multiplier is negative or invalid
   *
   * @example
   * ```ts
   * const amount = Amount.fromUnit("10", 18, "ETH");
   *
   * amount.multiply(2).toUnit();     // "20"
   * amount.multiply("0.5").toUnit(); // "5"
   * amount.multiply("1.5").toUnit(); // "15"
   * ```
   */
  public multiply(multiplier: AmountInput): Amount {
    const multiplierStr = multiplier.toString();

    if (!multiplierStr.match(/^\d+(\.\d+)?$/)) {
      throw new Error(
        `Invalid multiplier: "${multiplierStr}". Must be a positive number.`
      );
    }

    // Use high precision for scalar operations
    const PRECISION = 18;
    const scaleFactor = 10n ** BigInt(PRECISION);

    // Convert multiplier to scaled bigint
    const [integer, fraction = ""] = multiplierStr.split(".");
    const paddedFraction = fraction.padEnd(PRECISION, "0").slice(0, PRECISION);
    const scaledMultiplier = BigInt(`${integer}${paddedFraction}`);

    // Multiply and scale back down
    const result = (this.baseValue * scaledMultiplier) / scaleFactor;

    return new Amount(result, this.decimals, this.symbol);
  }

  /**
   * Divides this Amount by a scalar value.
   *
   * The scalar can be a string, number, or bigint. Fractional divisors
   * are supported (e.g., "0.5" to double the amount).
   *
   * Note: Division uses integer arithmetic and rounds down (floor).
   *
   * @param divisor - The scalar value to divide by
   * @returns A new Amount representing the quotient
   * @throws Error if divisor is zero
   * @throws Error if divisor is negative or invalid
   *
   * @example
   * ```ts
   * const amount = Amount.fromUnit("10", 18, "ETH");
   *
   * amount.divide(2).toUnit();     // "5"
   * amount.divide("0.5").toUnit(); // "20"
   * amount.divide(4).toUnit();     // "2.5"
   * ```
   */
  public divide(divisor: AmountInput): Amount {
    const divisorStr = divisor.toString();

    if (!divisorStr.match(/^\d+(\.\d+)?$/)) {
      throw new Error(
        `Invalid divisor: "${divisorStr}". Must be a positive number.`
      );
    }

    // Use high precision for scalar operations
    const PRECISION = 18;
    const scaleFactor = 10n ** BigInt(PRECISION);

    // Convert divisor to scaled bigint
    const [integer, fraction = ""] = divisorStr.split(".");
    const paddedFraction = fraction.padEnd(PRECISION, "0").slice(0, PRECISION);
    const scaledDivisor = BigInt(`${integer}${paddedFraction}`);

    if (scaledDivisor === 0n) {
      throw new Error("Division by zero");
    }

    // Scale up the base value before division to maintain precision
    const scaledBase = this.baseValue * scaleFactor;
    const result = scaledBase / scaledDivisor;

    return new Amount(result, this.decimals, this.symbol);
  }

  /**
   * Checks if this Amount is equal to another Amount.
   *
   * Returns false if amounts have different decimals or symbols.
   *
   * @param other - The Amount to compare with
   * @returns true if the amounts are equal and compatible, false otherwise
   *
   * @example
   * ```ts
   * const a = Amount.fromUnit("1.5", 18, "ETH");
   * const b = Amount.fromUnit("1.5", 18, "ETH");
   * const c = Amount.fromUnit("2", 18, "ETH");
   * const usdc = Amount.fromUnit("1.5", 6, "USDC");
   *
   * a.eq(b);    // true
   * a.eq(c);    // false
   * a.eq(usdc); // false (incompatible)
   * ```
   */
  public eq(other: Amount): boolean {
    if (!this.isCompatible(other)) {
      return false;
    }
    return this.baseValue === other.baseValue;
  }

  /**
   * Checks if this Amount is greater than another Amount.
   *
   * Returns false if amounts have different decimals or symbols.
   *
   * @param other - The Amount to compare with
   * @returns true if this amount is greater and compatible, false otherwise
   *
   * @example
   * ```ts
   * const a = Amount.fromUnit("2", 18, "ETH");
   * const b = Amount.fromUnit("1", 18, "ETH");
   * const usdc = Amount.fromUnit("1", 6, "USDC");
   *
   * a.gt(b);    // true
   * b.gt(a);    // false
   * a.gt(usdc); // false (incompatible)
   * ```
   */
  public gt(other: Amount): boolean {
    if (!this.isCompatible(other)) {
      return false;
    }
    return this.baseValue > other.baseValue;
  }

  /**
   * Checks if this Amount is greater than or equal to another Amount.
   *
   * Returns false if amounts have different decimals or symbols.
   *
   * @param other - The Amount to compare with
   * @returns true if this amount is greater or equal and compatible, false otherwise
   *
   * @example
   * ```ts
   * const a = Amount.fromUnit("2", 18, "ETH");
   * const b = Amount.fromUnit("2", 18, "ETH");
   * const usdc = Amount.fromUnit("2", 6, "USDC");
   *
   * a.gte(b);    // true
   * a.gte(usdc); // false (incompatible)
   * ```
   */
  public gte(other: Amount): boolean {
    if (!this.isCompatible(other)) {
      return false;
    }
    return this.baseValue >= other.baseValue;
  }

  /**
   * Checks if this Amount is less than another Amount.
   *
   * Returns false if amounts have different decimals or symbols.
   *
   * @param other - The Amount to compare with
   * @returns true if this amount is less and compatible, false otherwise
   *
   * @example
   * ```ts
   * const a = Amount.fromUnit("1", 18, "ETH");
   * const b = Amount.fromUnit("2", 18, "ETH");
   * const usdc = Amount.fromUnit("2", 6, "USDC");
   *
   * a.lt(b);    // true
   * b.lt(a);    // false
   * a.lt(usdc); // false (incompatible)
   * ```
   */
  public lt(other: Amount): boolean {
    if (!this.isCompatible(other)) {
      return false;
    }
    return this.baseValue < other.baseValue;
  }

  /**
   * Checks if this Amount is less than or equal to another Amount.
   *
   * Returns false if amounts have different decimals or symbols.
   *
   * @param other - The Amount to compare with
   * @returns true if this amount is less or equal and compatible, false otherwise
   *
   * @example
   * ```ts
   * const a = Amount.fromUnit("2", 18, "ETH");
   * const b = Amount.fromUnit("2", 18, "ETH");
   * const usdc = Amount.fromUnit("2", 6, "USDC");
   *
   * a.lte(b);    // true
   * a.lte(usdc); // false (incompatible)
   * ```
   */
  public lte(other: Amount): boolean {
    if (!this.isCompatible(other)) {
      return false;
    }
    return this.baseValue <= other.baseValue;
  }

  /**
   * Checks if this Amount is zero.
   *
   * @returns true if the amount is zero, false otherwise
   *
   * @example
   * ```ts
   * Amount.fromUnit("0", 18, "ETH").isZero();   // true
   * Amount.fromUnit("0.1", 18, "ETH").isZero(); // false
   * ```
   */
  public isZero(): boolean {
    return this.baseValue === 0n;
  }

  /**
   * Checks if this Amount is positive (greater than zero).
   *
   * @returns true if the amount is positive, false otherwise
   *
   * @example
   * ```ts
   * Amount.fromUnit("1", 18, "ETH").isPositive(); // true
   * Amount.fromUnit("0", 18, "ETH").isPositive(); // false
   * ```
   */
  public isPositive(): boolean {
    return this.baseValue > 0n;
  }
}

/**
 * Formats a token amount for display in the UI with locale-aware number formatting.
 *
 * This standalone function is useful when you have raw balance data and want to
 * format it without creating an Amount instance. For most cases, prefer using
 * `Amount.toFormatted()` instead.
 *
 * @param compressed - If true, limits decimal places to 4 for compact display
 * @param balance - Raw base value as bigint (e.g., wei, FRI)
 * @param decimals - Number of decimal places for the token
 * @param symbol - Token symbol to append (e.g., "ETH", "STRK")
 * @returns Locale-formatted string with symbol
 *
 * @remarks
 * Current implementation converts to float for formatting, which may lose precision
 * for very large or very precise values. A future improvement would use
 * `Intl.NumberFormat.formatToParts` for lossless formatting, but this is not
 * currently polyfilled for React Native.
 *
 * @example
 * ```ts
 * // Basic usage
 * tokenAmountToFormatted(false, 1500000000000000000n, 18, "ETH")
 * // Returns: "1.5 ETH" (exact format depends on locale)
 *
 * // Compressed format for UI
 * tokenAmountToFormatted(true, 1234567890123456789n, 18, "ETH")
 * // Returns: "1.2346 ETH" (rounded to 4 decimal places)
 *
 * // Large numbers with thousand separators
 * tokenAmountToFormatted(false, 1500000000000n, 6, "USDC")
 * // Returns: "1,500,000 USDC" (in US locale)
 * ```
 */
export function tokenAmountToFormatted(
  compressed: boolean = false,
  balance: bigint,
  decimals: number,
  symbol: string
): string {
  const divisor = BigInt(10) ** BigInt(decimals);
  const integerPart = (balance / divisor).toString();
  const fractionalPart = (balance % divisor).toString().padStart(decimals, "0");
  const maxFractionDigits = compressed ? Math.min(4, decimals) : decimals;

  const decimalString = `${integerPart}.${fractionalPart}`;
  const numberValue = parseFloat(decimalString);

  // Using formatter to get the device's preferred locale
  // USD symbol will be replaced with the token's symbol
  const formatter = Intl.NumberFormat("default", {
    style: "currency",
    currency: "USD", // This will help replace USD with this token's symbol,
    currencyDisplay: "code",
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });

  const formattedUSDLike = formatter.format(numberValue);
  return formattedUSDLike.replace("USD", symbol);
}
