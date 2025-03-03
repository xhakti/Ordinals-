'use client';

import ordinalsbot from '@/lib/ob';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from '@tanstack/react-form';
import * as v from 'valibot';
import { useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { valibotValidator } from '@tanstack/valibot-form-adapter';
// Remove Firebase storage import
import { EXPLORER_URL, MEMPOOL_URL, ONE_MINUTE, ONE_SECOND, USE_LOW_POSTAGE } from '@/lib/constants';
import { DirectInscriptionOrder, InscriptionOrderState, type InscriptionFile } from 'ordinalsbot/dist/types/v1';
import { useQuery } from '@tanstack/react-query';
import Order from '@/components/Order';
import Charge from '@/components/Charge';
import { LoaderPinwheel } from 'lucide-react';
import { AuthContext } from '@/app/providers/AuthContext';

const directInscribeSchema = v.object({
  file: v.nullable(
    v.pipe(
      v.file(),
      v.mimeType(['image/jpeg', 'image/png', 'text/plain'], 'Please upload one of the supported filetypes'),
      v.maxSize(1024 * 1024 * 10, 'Please select a file smaller than 10 MB.')
    )
  )
});

type TDirectInscribeForm = v.InferInput<typeof directInscribeSchema>;

export default function Inscribe() {
  const { wallet, network, loginWithWallet } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<DirectInscriptionOrder | null>(null);

  // Enhanced logging for wallet debugging
  useEffect(() => {
    console.log("Wallet context on component mount:", wallet);
    console.log("Network on component mount:", network);
    
    // Check if wallet has the expected structure
    if (wallet) {
      console.log("Wallet ordinalsAddress:", wallet.ordinalsAddress);
      console.log("Wallet paymentAddress:", wallet.paymentAddress);
      console.log("Wallet type:", wallet.wallet);
    } else {
      console.log("No wallet connected yet");
      
      // Check if we're coming from a wallet connection
      const urlParams = new URLSearchParams(window.location.search);
      const walletParam = urlParams.get('wallet');
      if (walletParam) {
        console.log("Found wallet param in URL:", walletParam);
        try {
          // Try to recover wallet data if it exists in URL params
          const walletData = JSON.parse(decodeURIComponent(walletParam));
          console.log("Recovered wallet data:", walletData);
          if (walletData && walletData.ordinalsAddress) {
            console.log("Attempting to login with recovered wallet");
            loginWithWallet(walletData);
          }
        } catch (e) {
          console.error("Error parsing wallet data from URL:", e);
        }
      }
    }
    
    // Check localStorage for wallet data
    const storedWallet = localStorage.getItem('ordinals-wallet');
    console.log("Stored wallet in localStorage:", storedWallet);
    
    if (!wallet && storedWallet) {
      try {
        const parsedWallet = JSON.parse(storedWallet);
        console.log("Found wallet in localStorage, attempting to restore:", parsedWallet);
        if (parsedWallet && parsedWallet.ordinalsAddress) {
          loginWithWallet(parsedWallet);
        }
      } catch (e) {
        console.error("Error parsing stored wallet:", e);
      }
    }
  }, [wallet, network, loginWithWallet]);

  // Add a debug button to manually set wallet (for testing)
  const debugSetWallet = () => {
    const testWallet = {
      ordinalsAddress: "tb1pfakagp5n2x7tj4llcnhp9xtdrn97f6yhexqxngs2m8e3gqqgg3ns8k4kcz",
      ordinalsPublicKey: "test_pubkey",
      paymentAddress: "tb1qq3se78es2nz2f69nxm5muw6c6ph8ep776pp03z",
      paymentPublicKey: "test_pubkey",
      wallet: "UNISAT" as any,
      network: "Signet"
    };
    console.log("Setting test wallet:", testWallet);
    loginWithWallet(testWallet);
  };

  const { data, error, isLoading } = useQuery({
    queryFn: async () => {
      return ordinalsbot.Inscription().getOrder(order?.id!);
    },
    queryKey: ['order', order?.id],
    enabled: !!order,
    staleTime: ONE_SECOND.toMillis() * 5,
    // The refetch interval is based on whether or not we have the charge address. If we do, then we can poll every 20 seconds, instead of every 5
    refetchInterval: () => {
      if (order?.charge.address) return ONE_MINUTE.toMillis() / 3;
      return ONE_SECOND.toMillis() * 5;
    }
  });

  const { data: feeRate, isLoading: feeRateLoading, error: feeRateError } = useQuery(
    {
      queryFn: async () => fetch('/api/feeRate').then(res => res.json()),
      queryKey: ['feeRate']
    }
  );

  useEffect(() => {
    if (isLoading) return;
    setOrder(data as DirectInscriptionOrder);
  }, [data]);

  const form = useForm({
    defaultValues: {
      file: null,
    },
    onSubmit: async ({ value }: { value: TDirectInscribeForm}) => {
      setLoading(true);
      console.log("Form submission started");

      if (
        (loading || error) ||
        (feeRateLoading || feeRateError)
      ) return; // Don't submit if we're loading or have an error

      try {
        v.parse(directInscribeSchema, value);
      } catch (err: any) {
        setLoading(false);
        return toast.error(err.message);
      }

      if (!value.file) {
        setLoading(false);
        return toast.error('Please select a file');
      }

      // Enhanced wallet debugging
      console.log("Current wallet state at submission:", wallet);
      console.log("Wallet type:", wallet?.wallet);
      console.log("Wallet network:", network);
      
      if (!wallet) {
        console.log("Wallet is null or undefined");
        setLoading(false);
        return toast.error('Please connect a wallet');
      }

      if (!wallet.ordinalsAddress) {
        console.log("Wallet connected but ordinalsAddress is missing");
        console.log("Full wallet object:", JSON.stringify(wallet));
        setLoading(false);
        return toast.error('Wallet connected but ordinals address is missing');
      }

      try {
        const { file } = value;
        
        // Read file as data URL instead of uploading to Firebase
        const reader = new FileReader();
        
        reader.onload = async () => {
          try {
            const dataURL = reader.result as string;
            const { type, name, size } = file;
            
            console.log("File loaded as data URL, size:", dataURL.length);
            console.log("Creating order with address:", wallet.ordinalsAddress);
            console.log("Fee rate:", feeRate?.fastestFee || 1);
            
            const directInscribeResponse = await ordinalsbot.Inscription().createDirectOrder({
              files: [{
                dataURL, // Use dataURL directly instead of a storage URL
                name, 
                size, 
                type
              }],
              lowPostage: USE_LOW_POSTAGE,
              fee: feeRate?.fastestFee || 1,
              receiveAddress: wallet.ordinalsAddress
            });

            setOrder(directInscribeResponse);
            toast.success('Order created successfully');
          } catch (error) {
            console.error('Error creating inscription:', error);
            toast.error('Failed to create inscription order');
          } finally {
            setLoading(false);
          }
        };
        
        reader.onerror = () => {
          console.error('Error reading file');
          toast.error('Failed to read file');
          setLoading(false);
        };
        
        // Start reading the file as a data URL
        reader.readAsDataURL(file as File);
        
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error('Failed to process file');
        setLoading(false);
      }
    },
    validatorAdapter: valibotValidator()
  });
  
  return (
    <div className='flex flex-row flex-wrap justify-center w-full pt-10 px-10 gap-5'>
      <div className='flex flex-col justify-between w-2/3 h-48 gap-5'>
        <h2 className='text-2xl'>Inscribe a File</h2>
        
        {/* Add debug button in development mode */}
        {process.env.NODE_ENV === 'development' && !wallet && (
          <Button onClick={debugSetWallet} className="mb-4">
            Debug: Set Test Wallet
          </Button>
        )}
        
        {/* Show wallet status */}
        <div className="mb-4">
          <p>Wallet Status: {wallet ? `Connected (${wallet.ordinalsAddress.substring(0, 10)}...)` : 'Not Connected'}</p>
          <p>Network: {network}</p>
        </div>
        
        {/* Existing form */}
        <form
          className='flex flex-col'
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field
            name='file'
            children={(field) => {
              const { name } = field;
              return (
                <div className='flex flex-row items-center justify-between gap-2'>
                  <label className='uppercase' htmlFor={name}>{name}</label>
                  <Input
                    className='font-black ring-1'
                    type='file'
                    id={name}
                    name={name}
                    onChange={(e) => {
                      //@ts-ignore
                      form.setFieldValue(name, e?.target?.files?.[0]);
                    }}
                  />
                </div>
              );
            }}
          />

          <div className='flex flex-row justify-end mt-5'>
            <Button type='submit' disabled={loading || feeRateLoading}>Inscribe { loading && <LoaderPinwheel className='animate-spin' /> }</Button>
          </div>
        </form>
      </div>

      <div className='w-1/3'>
        <Order loading={isLoading} order={order} />
      </div>

      <div className='w-1/3'>
        <Charge 
          loading={isLoading} 
          charge={order?.charge}
          feeRate={feeRate}
        />
      </div>

      {
        [InscriptionOrderState.QUEUED, InscriptionOrderState.COMPLETED].includes(order?.state!) && <div className='w-2/3'>
          <h3 className='text-2xl'>Inscription Status</h3>
          { 
            order?.files?.map((file: InscriptionFile, index: number) => {
              return (
                <div className='flex flex-row justify-between rounded-sm border-solid border-2 border-neutral-500 h-12 items-center px-5' key={index}>
                  <div className='flex-1'>{index + 1}</div>
                  <div className='flex-1'>{file.name}</div>
                  <div className='flex-1'>{file.status}</div>
                  <div className='flex flex-col 2'>
                    <div className='text-sm'><a href={`${EXPLORER_URL}/${file.inscriptionId}`} target='_blank'>{file.inscriptionId}</a></div>
                    <div className='text-xs'><a href={`${MEMPOOL_URL}/tx/${file.sent}`} target='_blank'>{file.sent}</a></div>
                  </div>
                </div>
              );
            })
          }
        </div>
      }
    </div>
  );
}