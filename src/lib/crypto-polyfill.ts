/**
 * Supabase Auth PKCE needs WebCrypto (`crypto.subtle.digest`).
 * Hermes/React Native does not ship it — bridge SHA-256 through expo-crypto.
 */
import * as ExpoCrypto from 'expo-crypto';
import webCrypto from 'expo-standard-web-crypto';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  const subtle = {
    digest(algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer> {
      const name =
        typeof algorithm === 'string' ? algorithm : (algorithm as Algorithm).name;

      const digestAlgorithm =
        name === 'SHA-512'
          ? ExpoCrypto.CryptoDigestAlgorithm.SHA512
          : name === 'SHA-256'
            ? ExpoCrypto.CryptoDigestAlgorithm.SHA256
            : null;

      if (!digestAlgorithm) {
        return Promise.reject(
          new Error(`Unsupported digest algorithm: ${name ?? 'unknown'}`),
        );
      }

      const bytes =
        data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

      const message = new TextDecoder().decode(bytes);

      return ExpoCrypto.digestStringAsync(digestAlgorithm, message, {
        encoding: ExpoCrypto.CryptoEncoding.HEX,
      }).then((hashHex) => {
        const out = new Uint8Array(hashHex.length / 2);
        for (let i = 0; i < out.length; i++) {
          out[i] = parseInt(hashHex.slice(i * 2, i * 2 + 2), 16);
        }
        return out.buffer;
      });
    },
  };

  const existing = globalThis.crypto;

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    enumerable: true,
    value: {
      ...existing,
      getRandomValues: existing?.getRandomValues?.bind(existing) ?? webCrypto.getRandomValues.bind(webCrypto),
      subtle: existing?.subtle ?? subtle,
    },
  });
}
