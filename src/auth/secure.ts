import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'

const PIN_HASH = 'finx_pin_hash'
const PIN_SALT = 'finx_pin_salt'
const BIOMETRIC = 'finx_biometric_enabled'

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hash(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`)
}

export async function hasPin(): Promise<boolean> {
  return (await SecureStore.getItemAsync(PIN_HASH)) !== null
}

export async function setPin(pin: string): Promise<void> {
  const salt = toHex(Crypto.getRandomBytes(16))
  const digest = await hash(pin, salt)
  await SecureStore.setItemAsync(PIN_SALT, salt)
  await SecureStore.setItemAsync(PIN_HASH, digest)
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = await SecureStore.getItemAsync(PIN_SALT)
  const stored = await SecureStore.getItemAsync(PIN_HASH)
  if (!salt || !stored) return false
  const digest = await hash(pin, salt)
  return digest === stored
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(BIOMETRIC)) === '1'
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) await SecureStore.setItemAsync(BIOMETRIC, '1')
  else await SecureStore.deleteItemAsync(BIOMETRIC)
}
