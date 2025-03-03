import { signOut, useSession } from 'next-auth/react';
import { createContext, ReactNode, useEffect, useState } from 'react';
import { IAuthContext, IWallet, SUPPORTED_WALLETS } from './auth.types';
import { WALLET_COOKIE } from '@/lib/constants';
import { useRouter } from 'next/navigation';

export const AuthContext = createContext<IAuthContext>({} as any);

const AuthContextProvider = ({ children }: { children: NonNullable<ReactNode> }) => {
  const session = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [wallet, setWallet] = useState<IWallet | null>(null);

  // Initialize wallet from localStorage on mount
  useEffect(() => {
    // Try to load wallet from localStorage
    const localWallet = JSON.parse(localStorage.getItem(WALLET_COOKIE) || 'null');
    
    if (localWallet) {
      console.log("Found wallet in localStorage:", localWallet);
      console.log("wallet Information --->", localWallet);
      setWallet(localWallet);
    }
    
    // Attempt to switch wallet network if available
    if (typeof window !== 'undefined') {
      if ('unisat' in window) {
        (window as any).unisat.switchNetwork('signet')
          .catch(console.error);
      }
      if ('xverse' in window) {
        (window as any).xverse.switchNetwork('signet')
          .catch(console.error);
      }
    }
    
    setLoading(false);
  }, []);

  // Connect to Unisat wallet
  const connectUnisat = async () => {
    if (typeof window === 'undefined' || !('unisat' in window)) {
      // toast.error('Unisat wallet not found. Please install the extension.');
      return;
    }

    try {
      const unisat = (window as any).unisat;
      
      // Switch to signet network
      await unisat.switchNetwork('signet');
      
      // Request accounts
      const accounts = await unisat.requestAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }
      
      // Get public key
      const publicKey = await unisat.getPublicKey();
      
      // Create wallet object
      const walletData: IWallet = {
        ordinalsAddress: accounts[0],
        ordinalsPublicKey: publicKey,
        paymentAddress: accounts[0],
        paymentPublicKey: publicKey,
        wallet: SUPPORTED_WALLETS.UNISAT
      };
      
      loginWithWallet(walletData);
      return walletData;
    } catch (error) {
      console.error('Error connecting to Unisat:', error);
      throw error;
    }
  };

  // Connect to Xverse wallet
  const connectXverse = async () => {
    if (typeof window === 'undefined' || !('xverse' in window)) {
      // toast.error('Xverse wallet not found. Please install the extension.');
      return;
    }

    try {
      const xverse = (window as any).xverse;
      
      // Switch to signet network
      await xverse.switchNetwork('signet');
      
      // Request accounts
      const response = await xverse.request({
        method: 'getAddresses',
        params: {
          network: 'signet'
        }
      });
      
      if (!response || !response.addresses || response.addresses.length === 0) {
        throw new Error('No addresses found');
      }
      
      // Create wallet object
      const walletData: IWallet = {
        ordinalsAddress: response.addresses.find((a: any) => a.type === 'p2tr')?.address || response.addresses[0].address,
        ordinalsPublicKey: response.addresses.find((a: any) => a.type === 'p2tr')?.publicKey || '',
        paymentAddress: response.addresses.find((a: any) => a.type === 'p2wpkh')?.address || response.addresses[0].address,
        paymentPublicKey: response.addresses.find((a: any) => a.type === 'p2wpkh')?.publicKey || '',
        wallet: SUPPORTED_WALLETS.XVERSE
      };
      
      loginWithWallet(walletData);
      return walletData;
    } catch (error) {
      console.error('Error connecting to Xverse:', error);
      throw error;
    }
  };

  const loginWithWallet = (wallet: IWallet) => {
    console.log("Logging in with wallet:", wallet);
    localStorage.setItem(WALLET_COOKIE, JSON.stringify(wallet));
    setWallet(wallet);
    router.push('/dashboard');
  };

  const logout = () => {
    console.log("Logging out");
    localStorage.removeItem(WALLET_COOKIE);
    setWallet(null);
    signOut({ redirect: false });
  };

  return (
    <AuthContext.Provider
      value={{
        loginWithWallet,
        connectUnisat,
        connectXverse, 
        logout, 
        loading, 
        wallet
      }}
    >
      { children }
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;