import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';
import { SafeSpotProvider } from '../context/SafeSpotContext';
import AppLayout from '../components/AppLayout';

function MyApp({ Component, pageProps }) {
  return (
    <SafeSpotProvider>
      <AppLayout>
        <Component {...pageProps} />
        <Toaster position="top-right" />
      </AppLayout>
    </SafeSpotProvider>
  );
}

export default MyApp;
