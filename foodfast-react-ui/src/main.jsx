import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import '/assets/stylesheets/style.css';
import '/assets/stylesheets/orders-admin.css';
import '/assets/stylesheets/toast.css';
import '/assets/stylesheets/theme.css';

import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { FavProvider } from './context/FavContext.jsx';
import { OrderProvider } from './context/OrderContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render( 
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        {/* AuthProvider bọc ngoài cùng để quản lý trạng thái đăng nhập toàn app */}
        <AuthProvider> 
          <ToastProvider> 
             <OrderProvider>
                <CartProvider>
                  <FavProvider>
                    <App />
                  </FavProvider>
                </CartProvider>
              </OrderProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
  {/*
    <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>  
          <MerchantAdminProvider>   
          <CartProvider>
            <FavProvider>
              <OrderProvider>   
                  <App /> 
              </OrderProvider>
            </FavProvider>
          </CartProvider>
          </MerchantAdminProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>, 
    Nếu là dùng AppAdmin.jsx  thì xài code này và đẩy đoạn trên vô chỗ này , thay cái  trong này lên trên*/}
);
