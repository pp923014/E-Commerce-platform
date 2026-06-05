import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./store/store.js";
import { Toaster } from "./components/ui/toaster.jsx";
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Provider store={store}>
      <Elements stripe={stripePromise}>
        <App />
      </Elements>
      <Toaster />
    </Provider>
  </BrowserRouter>
);
