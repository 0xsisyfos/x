import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useWalletStore, PRESETS, NETWORKS } from "@/stores/wallet";

const CHAIN_OPTIONS = [
  { label: "Sepolia", value: "SN_SEPOLIA" as const },
  { label: "Mainnet", value: "SN_MAIN" as const },
];

export default function HomeScreen() {
  const {
    // Network config
    isConfigured,
    selectedNetworkIndex,
    customRpcUrl,
    customChainId,
    chainId,
    selectNetwork,
    selectCustomNetwork,
    setCustomRpcUrl,
    setCustomChainId,
    confirmNetworkConfig,
    resetNetworkConfig,
    // Wallet
    privateKey,
    selectedPreset,
    wallet,
    isConnecting,
    isDeployed,
    isCheckingStatus,
    logs,
    setPrivateKey,
    setSelectedPreset,
    connect,
    disconnect,
    checkDeploymentStatus,
    deploy,
  } = useWalletStore();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <ThemedView style={styles.header}>
          <ThemedText type="title">Starknet SDK</ThemedText>
          <ThemedText style={styles.subtitle}>Mobile Example</ThemedText>
        </ThemedView>

        {!isConfigured ? (
          // Network Configuration
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Select Network</ThemedText>

            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.label}>Network Presets</ThemedText>
              <ThemedView style={styles.presetContainer}>
                {NETWORKS.map((network, index) => (
                  <TouchableOpacity
                    key={network.name}
                    style={[
                      styles.presetButton,
                      selectedNetworkIndex === index &&
                        styles.presetButtonActive,
                    ]}
                    onPress={() => selectNetwork(index)}
                  >
                    <ThemedText
                      style={[
                        styles.presetButtonText,
                        selectedNetworkIndex === index &&
                          styles.presetButtonTextActive,
                      ]}
                    >
                      {network.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.presetButton,
                    selectedNetworkIndex === null && styles.presetButtonActive,
                  ]}
                  onPress={selectCustomNetwork}
                >
                  <ThemedText
                    style={[
                      styles.presetButtonText,
                      selectedNetworkIndex === null &&
                        styles.presetButtonTextActive,
                    ]}
                  >
                    Custom
                  </ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>

            {selectedNetworkIndex === null && (
              <>
                <ThemedView style={styles.inputContainer}>
                  <ThemedText style={styles.label}>RPC URL</ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="https://your-rpc-url.com"
                    placeholderTextColor="#888"
                    value={customRpcUrl}
                    onChangeText={setCustomRpcUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </ThemedView>

                <ThemedView style={styles.inputContainer}>
                  <ThemedText style={styles.label}>Chain</ThemedText>
                  <ThemedView style={styles.presetContainer}>
                    {CHAIN_OPTIONS.map((chain) => (
                      <TouchableOpacity
                        key={chain.value}
                        style={[
                          styles.presetButton,
                          customChainId === chain.value &&
                            styles.presetButtonActive,
                        ]}
                        onPress={() => setCustomChainId(chain.value)}
                      >
                        <ThemedText
                          style={[
                            styles.presetButtonText,
                            customChainId === chain.value &&
                              styles.presetButtonTextActive,
                          ]}
                        >
                          {chain.label}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ThemedView>
                </ThemedView>
              </>
            )}

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={confirmNetworkConfig}
            >
              <ThemedText style={styles.buttonText}>Continue</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : !wallet ? (
          // Connection Form
          <ThemedView style={styles.card}>
            <ThemedView style={styles.cardHeader}>
              <ThemedText type="subtitle">Connect Wallet</ThemedText>
              <ThemedView style={styles.networkBadge}>
                <ThemedText style={styles.networkBadgeText}>
                  {NETWORKS.find((n) => n.chainId === chainId)?.name ||
                    "Custom"}
                </ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.label}>Private Key</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter your private key"
                placeholderTextColor="#888"
                value={privateKey}
                onChangeText={setPrivateKey}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </ThemedView>

            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.label}>Account Type</ThemedText>
              <ThemedView style={styles.presetContainer}>
                {Object.keys(PRESETS).map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetButton,
                      selectedPreset === preset && styles.presetButtonActive,
                    ]}
                    onPress={() => setSelectedPreset(preset)}
                  >
                    <ThemedText
                      style={[
                        styles.presetButtonText,
                        selectedPreset === preset &&
                          styles.presetButtonTextActive,
                      ]}
                    >
                      {preset}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ThemedView>
            </ThemedView>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={connect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Connect</ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={resetNetworkConfig}
            >
              <ThemedText style={styles.buttonTextSecondary}>
                Change Network
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          // Connected Wallet View
          <ThemedView style={styles.card}>
            <ThemedView style={styles.cardHeader}>
              <ThemedText type="subtitle">Connected Wallet</ThemedText>
              <ThemedView style={styles.networkBadge}>
                <ThemedText style={styles.networkBadgeText}>
                  {NETWORKS.find((n) => n.chainId === chainId)?.name ||
                    "Custom"}
                </ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.walletInfo}>
              <ThemedText style={styles.label}>Address</ThemedText>
              <ThemedText style={styles.address}>{wallet.address}</ThemedText>

              <ThemedView style={styles.statusRow}>
                <ThemedText style={styles.label}>Status</ThemedText>
                <ThemedView
                  style={[
                    styles.statusBadge,
                    isDeployed
                      ? styles.statusDeployed
                      : styles.statusNotDeployed,
                  ]}
                >
                  <ThemedText style={styles.statusText}>
                    {isCheckingStatus
                      ? "Checking..."
                      : isDeployed
                        ? "Deployed"
                        : "Not Deployed"}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.buttonSecondary,
                  styles.buttonFlex,
                ]}
                onPress={checkDeploymentStatus}
                disabled={isCheckingStatus}
              >
                <ThemedText style={styles.buttonTextSecondary}>
                  Check Status
                </ThemedText>
              </TouchableOpacity>

              {!isDeployed && (
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.buttonPrimary,
                    styles.buttonFlex,
                  ]}
                  onPress={deploy}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.buttonText}>Deploy</ThemedText>
                  )}
                </TouchableOpacity>
              )}
            </ThemedView>

            <TouchableOpacity
              style={[styles.button, styles.buttonDanger]}
              onPress={disconnect}
            >
              <ThemedText style={styles.buttonText}>Disconnect</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}

        {/* Logs Section */}
        {logs.length > 0 && (
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Logs</ThemedText>
            <ThemedView style={styles.logContainer}>
              {logs.map((log, index) => (
                <ThemedText key={index} style={styles.logEntry}>
                  {log}
                </ThemedText>
              ))}
            </ThemedView>
          </ThemedView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 4,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "rgba(128, 128, 128, 0.1)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  networkBadge: {
    backgroundColor: "#0a7ea4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  networkBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  inputContainer: {
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.3)",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#fff",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  presetContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.3)",
  },
  presetButtonActive: {
    backgroundColor: "#0a7ea4",
    borderColor: "#0a7ea4",
  },
  presetButtonText: {
    fontSize: 14,
  },
  presetButtonTextActive: {
    color: "#fff",
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  buttonPrimary: {
    backgroundColor: "#0a7ea4",
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#0a7ea4",
  },
  buttonDanger: {
    backgroundColor: "#dc3545",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextSecondary: {
    color: "#0a7ea4",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  buttonFlex: {
    flex: 1,
  },
  walletInfo: {
    marginTop: 16,
  },
  address: {
    fontFamily: "monospace",
    fontSize: 12,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    padding: 12,
    borderRadius: 8,
    overflow: "hidden",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDeployed: {
    backgroundColor: "#28a745",
  },
  statusNotDeployed: {
    backgroundColor: "#ffc107",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  logContainer: {
    marginTop: 12,
    maxHeight: 200,
  },
  logEntry: {
    fontSize: 12,
    fontFamily: "monospace",
    opacity: 0.8,
    marginBottom: 4,
  },
});
