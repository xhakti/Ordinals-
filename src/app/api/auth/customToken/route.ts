import { Verifier } from 'bip322-js';
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
      // Simply return success with the verified address
      console.log('Signature verified for address:', address);
      
      return NextResponse.json({ 
        success: true, 
        address,
        message: 'Wallet signature verified successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error in signature verification route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error'},
      { status: 500 }
    );
  }
}
