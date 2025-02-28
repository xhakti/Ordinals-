import { Verifier } from 'bip322-js';
import admin from '@/app/api/firebase';
import { NextResponse } from 'next/server';

const MESSAGE = 'Sign into NextJS Ordinals Application';

export async function POST(req: Request) {
  try {
    const { address, signature } = await req.json();
    
    if (!address || !signature) {
      return NextResponse.json(
        { success: false, error: 'Address and signature are required' },
        { status: 400 }
      );
    }
    
    // verifySignature requires that the entire signature object be passed to it
    const signedResult = Verifier.verifySignature(address, MESSAGE, signature);

    if (signedResult) {
      try {
        const encodedAddress = encodeBitcoinAddressToBase64(address);
        console.log('Creating custom token for address:', address, 'encoded as:', encodedAddress);
        
        const customToken = await admin.auth().createCustomToken(encodedAddress);
        return NextResponse.json({ success: true, customToken, address });
      } catch (tokenError) {
        console.error('Error creating Firebase custom token:', tokenError);
        return NextResponse.json(
          { success: false, error: 'Failed to create authentication token', details: tokenError.message },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error in custom token route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

const encodeBitcoinAddressToBase64 = (address: string) => {
  return Buffer.from(address).toString('base64');
};
