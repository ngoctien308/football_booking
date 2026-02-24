import AppRouter from './router/AppRouter';
import { Toaster } from 'react-hot-toast';

const App = () => {
  return (
    <>
      <AppRouter />
      <Toaster position="top-right" />
    </>
  );
}

export default App