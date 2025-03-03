export interface IWallet {
  ordinalsAddress: string;
  ordinalsPublicKey: string;
  paymentAddress: string;
  paymentPublicKey: string;
  wallet: SUPPORTED_WALLETS;
  network?: NETWORK_TYPE; // Add network property
};

export interface IAuthContext {
  loginWithWallet: (wallet: IWallet) => void;
  logout: () => void;
  wallet: IWallet | null;
  loading: boolean;
  network: NETWORK_TYPE; // Add network to context
  setNetwork?: (network: NETWORK_TYPE) => void; // Optional setter for network
};

export enum SUPPORTED_WALLETS {
  UNISAT = 'unisat',
  XVERSE = 'xverse',
  MAGIC_EDEN = 'magic-eden',
  LEATHER = 'leather'
};

export enum NETWORK_TYPE {
  MAINNET = 'Mainnet',
  TESTNET = 'Testnet',
  SIGNET = 'Signet'
};
