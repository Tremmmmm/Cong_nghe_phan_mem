import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import '/assets/stylesheets/style.css';
import '/assets/stylesheets/orders-admin.css';
import '/assets/stylesheets/toast.css';
import '/assets/stylesheets/theme.css';

import App from './App.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { FavProvider } from './context/FavContext.jsx';
import { OrderProvider } from './context/OrderContext.jsx'; // NEW

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <FavProvider>
              <OrderProvider> {/* NEW: quản lý Orders */}
                <ToastProvider>
                  <App />
                </ToastProvider>
              </OrderProvider>
            </FavProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
