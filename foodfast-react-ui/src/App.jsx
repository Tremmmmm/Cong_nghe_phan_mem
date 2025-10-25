// src/App.jsx
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'

// Layout
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'

// Pages (Public)
import Home from './pages/Home.jsx'
import Menu from './pages/Menu.jsx'
import Favorites from './pages/Favorites.jsx'
import Cart from './pages/Cart.jsx'
import SearchResults from './pages/SearchResults.jsx'
import Confirmation from './pages/Confirmation.jsx'
import DetailsHistory from './pages/DetailsHistory.jsx'
import Profile from './pages/Profile.jsx'            // Settings/Profile (user)

// Auth pages
import SignIn from './pages/SignIn.jsx'
import SignUp from './pages/SignUp.jsx'

// Feature pages
import Checkout from './pages/Checkout.jsx'
import Orders from './pages/Orders.jsx'              // My Orders (user)

// Admin pages
import AdminOrders from './pages/AdminOrders.jsx'
import AdminSignIn from './pages/AdminSignIn.jsx'    // nếu bạn có trang này

// Guards
import { RequireAuth, RequireAdmin } from './context/AuthContext.jsx'

// Simple layout to keep Header/Footer persistent
function AppLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Wrap everything with a layout that shows Header/Footer once */}
      <Route element={<AppLayout />}>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/history" element={<DetailsHistory />} />
        <Route path="/profile" element={<Profile />} />

        {/* Auth (user) */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <Checkout />
            </RequireAuth>
          }
        />
        <Route
          path="/orders"   // <-- My Orders (dropdown)
          element={
            <RequireAuth>
              <Orders />
            </RequireAuth>
          }
        />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminSignIn />} />
        <Route
          path="/admin/orders"
          element={
            <RequireAdmin>
              <AdminOrders />
            </RequireAdmin>
          }
        />
        <Route path="/admin" element={<Navigate to="/admin/orders" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
