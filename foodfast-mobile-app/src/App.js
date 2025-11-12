// App.js (React Native)

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';

// --- Context ---
import { useAuth, AuthProvider } from './context/AuthContext'; // Bạn cần tạo lại file này cho RN

// --- Import các màn hình (screens) ---
// Public Screens
import HomeScreen from './screens/HomeScreen';
import MenuScreen from './screens/MenuScreen'; // Tương đương Menu.jsx
import CartScreen from './screens/CartScreen';   // Tương đương Cart.jsx
import ProfileScreen from './screens/ProfileScreen'; // Tương đương Profile.jsx
import SignInScreen from './screens/SignInScreen'; // Tương đương SignIn.jsx

// Merchant Screens
import MerchantDashboardScreen from './screens/merchant/DashboardScreen';
import MerchantOrdersScreen from './screens/merchant/OrdersScreen';

// Super Admin Screens
import AdminDashboardScreen from './screens/admin/DashboardScreen';
import AdminMerchantsScreen from './screens/admin/MerchantsScreen';

// Khởi tạo các bộ điều hướng
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// === BỘ ĐIỀU HƯỚNG CHO KHÁCH HÀNG (PUBLIC) ===
// Dùng Tab Navigator cho các màn hình chính
function CustomerTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Trang chủ' }} />
      <Tab.Screen name="CartTab" component={CartScreen} options={{ title: 'Giỏ hàng' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Tài khoản' }} />
    </Tab.Navigator>
  );
}

// === BỘ ĐIỀU HƯỚNG CHO MERCHANT ===
// Dùng Drawer Navigator để có menu bên cạnh giống web
function MerchantDrawerNavigator() {
  return (
    <Drawer.Navigator>
      <Drawer.Screen name="MerchantDashboard" component={MerchantDashboardScreen} options={{ title: 'Bảng điều khiển' }} />
      <Drawer.Screen name="MerchantOrders" component={MerchantOrdersScreen} options={{ title: 'Quản lý đơn hàng' }}/>
      {/* Thêm các màn hình khác của merchant ở đây */}
    </Drawer.Navigator>
  );
}

// === BỘ ĐIỀU HƯỚNG CHO SUPER ADMIN ===
function AdminDrawerNavigator() {
    return (
      <Drawer.Navigator>
        <Drawer.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Tổng quan hệ thống' }} />
        <Drawer.Screen name="AdminMerchants" component={AdminMerchantsScreen} options={{ title: 'Quản lý nhà hàng' }}/>
        {/* Thêm các màn hình khác của admin ở đây */}
      </Drawer.Navigator>
    );
}


// === BỘ ĐIỀU HƯỚNG GỐC (ROOT NAVIGATOR) ===
// Quyết định hiển thị màn hình nào dựa trên trạng thái đăng nhập và vai trò
function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    // Hiển thị màn hình chờ trong khi xác thực
    return <SplashScreen />;
  }

  // Nếu người dùng đã đăng nhập, kiểm tra vai trò
  if (user) {
    if (user.role === 'resadmin') {
      return <MerchantDrawerNavigator />;
    }
    if (user.role === 'svadmin') {
      return <AdminDrawerNavigator />;
    }
    // Mặc định là 'customer'
    return (
        <Stack.Navigator>
            <Stack.Screen name="CustomerTabs" component={CustomerTabNavigator} options={{ headerShown: false }} />
            {/* Các màn hình không có trong Tab nhưng vẫn thuộc flow của customer */}
            <Stack.Screen name="MenuScreen" component={MenuScreen} />
            {/* ... các màn hình khác như Checkout, OrderDetails... */}
        </Stack.Navigator>
    );
  }

  // Nếu chưa đăng nhập, chỉ hiển thị các màn hình đăng nhập/đăng ký
  return (
    <Stack.Navigator>
      <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
      {/* <Stack.Screen name="SignUp" component={SignUpScreen} /> */}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    // Bọc toàn bộ ứng dụng trong AuthProvider và NavigationContainer
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
