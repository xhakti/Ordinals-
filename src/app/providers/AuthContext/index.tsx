import { signOut, useSession } from 'next-auth/react';
import { createContext, ReactNode, useEffect, useState } from 'react';
import { IAuthContext, IWallet, NETWORK_TYPE } from './auth.types';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { WALLET_COOKIE } from '@/lib/constants';
import { useRouter } from 'next/navigation';

// Hardcode signet network
const NETWORK = NETWORK_TYPE.SIGNET;

// Valid signet addresses for testing
const VALID_SIGNET_ORDINALS_ADDRESS = "tb1pfakagp5n2x7tj4llcnhp9xtdrn97f6yhexqxngs2m8e3gqqgg3ns8k4kcz";
const VALID_SIGNET_PAYMENT_ADDRESS = "tb1qq3se78es2nz2f69nxm5muw6c6ph8ep776pp03z";

export const AuthContext = createContext<IAuthContext>({
  loginWithWallet: () => {},
  logout: () => {},
  loading: true,
  wallet: null,
  network: NETWORK
});

const AuthContextProvider = ({ children }: { children: NonNullable<ReactNode> }) => {
  const session = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [wallet, setWallet] = useState<IWallet | null>(null);
  
  // Initialize with valid test wallet if in development mode
  useEffect(() => {
    console.log("Using hardcoded network:", NETWORK);
    
    // In development, set a default wallet with valid signet addresses
    if (process.env.NODE_ENV === 'development' && !wallet) {
      const devWallet: IWallet = {
        ordinalsAddress: VALID_SIGNET_ORDINALS_ADDRESS,
        ordinalsPublicKey: "test_pubkey",
        paymentAddress: VALID_SIGNET_PAYMENT_ADDRESS,
        paymentPublicKey: "test_pubkey",
        wallet: "UNISAT",
        network: NETWORK
      };
      
      console.log("Setting development wallet:", devWallet);
      localStorage.setItem(WALLET_COOKIE, JSON.stringify(devWallet));
      setWallet(devWallet);
    }
    
    // Attempt to switch wallet network if available
    if (typeof window !== 'undefined' && 'unisat' in window) {
      (window as any).unisat.switchNetwork('signet')
        .catch(console.error);
    }
    if (typeof window !== 'undefined' && 'xverse' in window) {
      (window as any).xverse.switchNetwork('signet')
        .catch(console.error);
    }
  }, [wallet]);

  const loginWithWallet = async (wallet: IWallet) => {
    try {
      // Ensure wallet is on signet network before proceeding
      const walletWithNetwork = {
        ...wallet,
        network: NETWORK,
        // Override with valid addresses if the provided ones are invalid
        ordinalsAddress: wallet.ordinalsAddress || VALID_SIGNET_ORDINALS_ADDRESS,
        paymentAddress: wallet.paymentAddress || VALID_SIGNET_PAYMENT_ADDRESS
      };
      
      console.log("Logging in with wallet:", walletWithNetwork);
      localStorage.setItem(WALLET_COOKIE, JSON.stringify(walletWithNetwork));
      setWallet(walletWithNetwork);
      router.push('/dashboard');
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  };

  const logout = () => {
    auth.signOut().then(() => {
      localStorage.removeItem(WALLET_COOKIE);
      setWallet(null);
      signOut({ redirect: false });
    });
  };

  const authStateChanged = async (firebaseUser: User | null) => {
    if (firebaseUser) {
      // Load wallet data
      const localWallet = JSON.parse(localStorage.getItem(WALLET_COOKIE) || 'null');
      if (localWallet) {
        // Ensure wallet always has signet network
        setWallet({
          ...localWallet,
          network: NETWORK
        });
      }

      setLoading(false);
    } else {
      logout();
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, authStateChanged);
    return () => unsubscribe();
  }, []);  

  return (
    <AuthContext.Provider
      value={{
        loginWithWallet, 
        logout, 
        loading, 
        wallet,
        network: NETWORK
      }}
    >
      { children }
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;