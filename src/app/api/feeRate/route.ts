import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Bitcoin fee rate API se data fetch karna
    const response = await fetch('https://mempool.space/api/v1/fees/recommended');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch fee rates: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Fee rate API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fee rates' },
      { status: 500 }
    );
  }
}