import "react-native-get-random-values";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as aesjs from "aes-js";
import { AppState } from "react-native";
import { ENV } from "./env";

/**
 * LargeSecureStore — encrypts data with AES-256 before storing in AsyncStorage.
 * The AES key is stored in expo-secure-store (which has a 2048-byte limit,
 * but the 32-byte AES key fits easily).
 *
 * This is the pattern recommended by Supabase for React Native.
 */
class LargeSecureStore {
  private async _getEncryptionKey(): Promise<Uint8Array> {
    const KEY_NAME = "orpheus_supabase_aes_key";

    const existing = await SecureStore.getItemAsync(KEY_NAME);
    if (existing) {
      return aesjs.utils.hex.toBytes(existing);
    }

    // Generate a new 256-bit key
    const key = new Uint8Array(32);
    crypto.getRandomValues(key);
    await SecureStore.setItemAsync(
      KEY_NAME,
      aesjs.utils.hex.fromBytes(key)
    );
    return key;
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;

    const encryptionKey = await this._getEncryptionKey();
    const encryptedBytes = aesjs.utils.hex.toBytes(encrypted);
    const aesCtr = new aesjs.ModeOfOperation.ctr(encryptionKey);
    const decryptedBytes = aesCtr.decrypt(encryptedBytes);
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encryptionKey = await this._getEncryptionKey();
    const valueBytes = aesjs.utils.utf8.toBytes(value);
    const aesCtr = new aesjs.ModeOfOperation.ctr(encryptionKey);
    const encryptedBytes = aesCtr.encrypt(valueBytes);
    await AsyncStorage.setItem(
      key,
      aesjs.utils.hex.fromBytes(encryptedBytes)
    );
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
}

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auto-refresh token when app comes to foreground
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
