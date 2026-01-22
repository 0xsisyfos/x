import { describe, it, expect, vi } from "vitest";
import { StarkSigner } from "../src/signer/stark.js";
import { testPrivateKeys, devnetAccount } from "./config.js";

describe("StarkSigner", () => {
  describe("getPubKey", () => {
    it("should derive public key from private key", async () => {
      const signer = new StarkSigner(testPrivateKeys.key1);
      const pubKey = await signer.getPubKey();

      expect(pubKey).toBeDefined();
      expect(pubKey).toMatch(/^0x[a-fA-F0-9]+$/);
    });

    it("should return same public key on multiple calls", async () => {
      const signer = new StarkSigner(testPrivateKeys.key1);

      const pubKey1 = await signer.getPubKey();
      const pubKey2 = await signer.getPubKey();

      expect(pubKey1).toBe(pubKey2);
    });

    it("should derive different public keys for different private keys", async () => {
      const signer1 = new StarkSigner(testPrivateKeys.key1);
      const signer2 = new StarkSigner(testPrivateKeys.key2);

      const pubKey1 = await signer1.getPubKey();
      const pubKey2 = await signer2.getPubKey();

      expect(pubKey1).not.toBe(pubKey2);
    });
  });

  describe("_getStarknetSigner", () => {
    it("should have internal starknet signer", () => {
      const signer = new StarkSigner(testPrivateKeys.key1);
      const starknetSigner = signer._getStarknetSigner();

      expect(starknetSigner).toBeDefined();
      expect(typeof starknetSigner.signTransaction).toBe("function");
    });

    it("should return same signer instance", () => {
      const signer = new StarkSigner(testPrivateKeys.key1);

      const starknetSigner1 = signer._getStarknetSigner();
      const starknetSigner2 = signer._getStarknetSigner();

      expect(starknetSigner1).toBe(starknetSigner2);
    });
  });

  describe("signMessage", () => {
    it("should call underlying signer signMessage", async () => {
      const signer = new StarkSigner(devnetAccount.privateKey);
      const starknetSigner = signer._getStarknetSigner();

      // Mock the underlying signer
      const mockSignature = ["0x123", "0x456"];
      const signMessageSpy = vi
        .spyOn(starknetSigner, "signMessage")
        .mockResolvedValue(mockSignature);

      const typedData = {
        types: {
          StarknetDomain: [
            { name: "name", type: "shortstring" },
            { name: "version", type: "shortstring" },
            { name: "chainId", type: "shortstring" },
          ],
          Message: [{ name: "content", type: "felt" }],
        },
        primaryType: "Message" as const,
        domain: {
          name: "TestApp",
          version: "1",
          chainId: "SN_SEPOLIA",
        },
        message: {
          content: "0x1234",
        },
      };

      const signature = await signer.signMessage(
        typedData,
        devnetAccount.address
      );

      expect(signMessageSpy).toHaveBeenCalledWith(
        typedData,
        devnetAccount.address
      );
      expect(signature).toEqual(mockSignature);

      signMessageSpy.mockRestore();
    });
  });

  describe("signTransaction", () => {
    it("should call underlying signer signTransaction", async () => {
      const signer = new StarkSigner(devnetAccount.privateKey);
      const starknetSigner = signer._getStarknetSigner();

      // Mock the underlying signer
      const mockSignature = ["0xabc", "0xdef"];
      const signTransactionSpy = vi
        .spyOn(starknetSigner, "signTransaction")
        .mockResolvedValue(mockSignature);

      const calls = [
        {
          contractAddress: "0x123",
          entrypoint: "transfer",
          calldata: ["0x456", "100", "0"],
        },
      ];

      const transactionDetails = {
        walletAddress: devnetAccount.address,
        chainId: "0x534e5f5345504f4c4941" as const,
        nonce: 0n,
        version: "0x3" as const,
        maxFee: 0n,
        cairoVersion: "1" as const,
        resourceBounds: {
          l1_gas: { max_amount: 1000n, max_price_per_unit: 1000000n },
          l2_gas: { max_amount: 0n, max_price_per_unit: 0n },
          l1_data_gas: { max_amount: 0n, max_price_per_unit: 0n },
        },
        tip: 0n,
        paymasterData: [],
        accountDeploymentData: [],
        nonceDataAvailabilityMode: 0 as const,
        feeDataAvailabilityMode: 0 as const,
      };

      const signature = await signer.signTransaction(calls, transactionDetails);

      expect(signTransactionSpy).toHaveBeenCalledWith(
        calls,
        transactionDetails
      );
      expect(signature).toEqual(mockSignature);

      signTransactionSpy.mockRestore();
    });
  });
});
