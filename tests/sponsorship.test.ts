import { describe, it, expect, vi, beforeEach } from "vitest";
import { StarkSDK, StarkSigner, OpenZeppelinPreset } from "../src/index.js";
import type {
  SponsorshipRequest,
  SponsorshipResponse,
} from "../src/types/sponsorship.js";
import { devnetConfig } from "./config.js";

describe("Sponsorship", () => {
  const config = devnetConfig;
  // Valid Stark curve private key for testing
  const privateKey =
    "0x0000000000000000000000000000000071d7bb07b9a64f6f78ac4c816aff4da9";

  describe("SDK configuration validation", () => {
    it("should throw when feeMode=sponsored but no sponsor configured", async () => {
      const sdk = new StarkSDK({
        rpcUrl: config.rpcUrl,
        chainId: config.chainId,
        // No sponsor configured
      });

      await expect(
        sdk.connectWallet({
          account: {
            signer: new StarkSigner(privateKey),
            accountClass: OpenZeppelinPreset,
          },
          feeMode: "sponsored",
        })
      ).rejects.toThrow(
        "Cannot use feeMode='sponsored' without configuring sponsor"
      );
    });

    it("should accept feeMode=sponsored when sponsor is configured", async () => {
      const mockGetSponsorship = vi.fn().mockResolvedValue({
        resourceBounds: {
          l1_gas: {
            max_amount: 1000n,
            max_price_per_unit: 1000000000n,
          },
          l2_gas: { max_amount: 0n, max_price_per_unit: 0n },
          l1_data_gas: { max_amount: 0n, max_price_per_unit: 0n },
        },
      } satisfies SponsorshipResponse);

      const sdk = new StarkSDK({
        rpcUrl: config.rpcUrl,
        chainId: config.chainId,
        sponsor: { getSponsorship: mockGetSponsorship },
      });

      const wallet = await sdk.connectWallet({
        account: {
          signer: new StarkSigner(privateKey),
          accountClass: OpenZeppelinPreset,
        },
        feeMode: "sponsored",
      });

      expect(wallet).toBeDefined();
      expect(wallet.address).toMatch(/^0x[0-9a-fA-F]+$/);
    });
  });

  describe("Sponsorship request", () => {
    let mockGetSponsorship: ReturnType<typeof vi.fn>;
    let sdk: StarkSDK;

    beforeEach(() => {
      mockGetSponsorship = vi.fn().mockResolvedValue({
        resourceBounds: {
          l1_gas: {
            max_amount: 1000n,
            max_price_per_unit: 1000000000n,
          },
          l2_gas: { max_amount: 0n, max_price_per_unit: 0n },
          l1_data_gas: { max_amount: 0n, max_price_per_unit: 0n },
        },
      } satisfies SponsorshipResponse);

      sdk = new StarkSDK({
        rpcUrl: config.rpcUrl,
        chainId: config.chainId,
        sponsor: { getSponsorship: mockGetSponsorship },
      });
    });

    it("should pass policy hint to sponsor callback", async () => {
      const wallet = await sdk.connectWallet({
        account: {
          signer: new StarkSigner(privateKey),
          accountClass: OpenZeppelinPreset,
        },
        feeMode: "sponsored",
        sponsorPolicyHint: { action: "onboarding", userId: "test_123" },
      });

      // Trigger a deploy to call the sponsorship
      try {
        await wallet.deploy();
      } catch {
        // Expected to fail (devnet not running), but sponsorship should be called
      }

      expect(mockGetSponsorship).toHaveBeenCalled();
      const request: SponsorshipRequest = mockGetSponsorship.mock.calls[0][0];
      expect(request.policyHint).toEqual({
        action: "onboarding",
        userId: "test_123",
      });
      expect(request.callerAddress).toBe(wallet.address);
      expect(request.chainId).toBe(config.chainId);
    });

    it("should include calls in sponsorship request for execute", async () => {
      const wallet = await sdk.connectWallet({
        account: {
          signer: new StarkSigner(privateKey),
          accountClass: OpenZeppelinPreset,
        },
        feeMode: "sponsored",
      });

      const testCalls = [
        {
          contractAddress: "0x123",
          entrypoint: "transfer",
          calldata: ["0x456", "100"],
        },
      ];

      try {
        await wallet.execute(testCalls);
      } catch {
        // Expected to fail, but sponsorship should be called
      }

      expect(mockGetSponsorship).toHaveBeenCalled();
      const request: SponsorshipRequest = mockGetSponsorship.mock.calls[0][0];
      expect(request.calls).toEqual(testCalls);
    });

    it("should allow overriding feeMode per-operation", async () => {
      // Connect with sponsored by default
      const wallet = await sdk.connectWallet({
        account: {
          signer: new StarkSigner(privateKey),
          accountClass: OpenZeppelinPreset,
        },
        feeMode: "sponsored",
      });

      // Execute with user_pays override - should NOT call sponsor
      try {
        await wallet.execute(
          [
            {
              contractAddress: "0x123",
              entrypoint: "test",
              calldata: [],
            },
          ],
          { feeMode: "user_pays" }
        );
      } catch {
        // Expected to fail
      }

      // Sponsor should not be called when feeMode is overridden to user_pays
      expect(mockGetSponsorship).not.toHaveBeenCalled();
    });
  });

  describe("Sponsorship error handling", () => {
    it("should wrap sponsor rejection in a clear error", async () => {
      const mockGetSponsorship = vi
        .fn()
        .mockRejectedValue(new Error("Rate limit exceeded"));

      const sdk = new StarkSDK({
        rpcUrl: config.rpcUrl,
        chainId: config.chainId,
        sponsor: { getSponsorship: mockGetSponsorship },
      });

      const wallet = await sdk.connectWallet({
        account: {
          signer: new StarkSigner(privateKey),
          accountClass: OpenZeppelinPreset,
        },
        feeMode: "sponsored",
      });

      await expect(
        wallet.execute([
          {
            contractAddress: "0x123",
            entrypoint: "test",
            calldata: [],
          },
        ])
      ).rejects.toThrow("Sponsorship rejected: Rate limit exceeded");
    });
  });

  describe("Preflight with sponsorship", () => {
    it("should return error if sponsor not configured for sponsored preflight", async () => {
      const sdk = new StarkSDK({
        rpcUrl: config.rpcUrl,
        chainId: config.chainId,
        // No sponsor
      });

      const wallet = await sdk.connectWallet({
        account: {
          signer: new StarkSigner(privateKey),
          accountClass: OpenZeppelinPreset,
        },
        // user_pays by default
      });

      const result = await wallet.preflight({
        kind: "execute",
        feeMode: "sponsored",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("Sponsor not configured");
      }
    });
  });
});
