import {
  AccountAuthenticatorEd25519,
  Ed25519PublicKey,
  Ed25519Signature,
  generateSigningMessageForTransaction,
} from '@aptos-labs/ts-sdk';
import { aptos, toHex } from './aptos';

export type SignRawHashFunction = (params: {
  address: string;
  chainType: 'aptos';
  hash: `0x${string}`;
}) => Promise<{ signature: string }>;

/**
 * Transfer MOVE tokens using Privy wallet
 */
export const transferWithPrivy = async (
  senderAddress: string,
  receiverAddress: string,
  amount: number, // Amount in MOVE (will be converted to octas)
  publicKeyHex: string,
  signRawHash: SignRawHashFunction
): Promise<string> => {
  try {
    // Convert MOVE to octas (8 decimals)
    const amountInOctas = Math.floor(amount * 100_000_000);

    console.log('[Privy Transfer] Starting transfer:', {
      from: senderAddress,
      to: receiverAddress,
      amount,
      amountInOctas,
    });

    // Build the transfer transaction
    const rawTxn = await aptos.transaction.build.simple({
      sender: senderAddress,
      data: {
        function: '0x1::aptos_account::transfer',
        typeArguments: [],
        functionArguments: [receiverAddress, amountInOctas],
      },
    });

    console.log('[Privy Transfer] Transaction built');

    // Generate signing message
    const message = generateSigningMessageForTransaction(rawTxn);

    // Sign with Privy wallet
    const { signature: rawSignature } = await signRawHash({
      address: senderAddress,
      chainType: 'aptos',
      hash: `0x${toHex(message)}`,
    });

    console.log('[Privy Transfer] Transaction signed');

    // Clean public key
    let cleanPublicKey = publicKeyHex.startsWith('0x') ? publicKeyHex.slice(2) : publicKeyHex;
    if (cleanPublicKey.length === 66) {
      cleanPublicKey = cleanPublicKey.slice(2);
    }

    // Create authenticator
    const senderAuthenticator = new AccountAuthenticatorEd25519(
      new Ed25519PublicKey(cleanPublicKey),
      new Ed25519Signature(rawSignature.startsWith('0x') ? rawSignature.slice(2) : rawSignature)
    );

    // Submit transaction
    const committedTransaction = await aptos.transaction.submit.simple({
      transaction: rawTxn,
      senderAuthenticator,
    });

    console.log('[Privy Transfer] Transaction submitted:', committedTransaction.hash);

    // Wait for confirmation
    const executed = await aptos.waitForTransaction({
      transactionHash: committedTransaction.hash,
    });

    if (!executed.success) {
      throw new Error('Transaction failed');
    }

    console.log('[Privy Transfer] Transaction confirmed');
    return committedTransaction.hash;
  } catch (error) {
    console.error('Error in Privy transfer:', error);
    throw error;
  }
};

/**
 * Transfer MOVE tokens using native wallet adapter
 */
export const transferWithNativeWallet = async (
  senderAddress: string,
  receiverAddress: string,
  amount: number, // Amount in MOVE
  signAndSubmitTransaction: any
): Promise<string> => {
  try {
    // Convert MOVE to octas (8 decimals)
    const amountInOctas = Math.floor(amount * 100_000_000);

    console.log('[Native Transfer] Starting transfer:', {
      from: senderAddress,
      to: receiverAddress,
      amount,
      amountInOctas,
    });

    const response = await signAndSubmitTransaction({
      sender: senderAddress,
      data: {
        function: '0x1::aptos_account::transfer',
        functionArguments: [receiverAddress, amountInOctas],
      },
    });

    console.log('[Native Transfer] Transaction submitted:', response.hash);

    // Wait for confirmation
    const executed = await aptos.waitForTransaction({
      transactionHash: response.hash,
    });

    if (!executed.success) {
      throw new Error('Transaction failed');
    }

    console.log('[Native Transfer] Transaction confirmed');
    return response.hash;
  } catch (error) {
    console.error('Error in native transfer:', error);
    throw error;
  }
};

