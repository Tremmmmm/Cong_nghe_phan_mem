// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchMerchants, fetchMenuItems } from '../utils/merchantAPI.js'; // 💡 Tái sử dụng 100%
import { useAuth } from '../context/AuthContext.jsx'; // 💡 Tái sử dụng
import { useToast } from '../context/ToastContext.jsx'; // 💡 Tái sử dụng

const { width } = Dimensions.get('window');
const MERCHANT_CARD_WIDTH = width - 32; // Chiều rộng thẻ merchant
const DISH_CARD_WIDTH = (width - 48) / 2; // Chiều rộng thẻ món ăn cho lưới 2 cột

// --- COMPONENT THẺ NHÀ HÀNG ---
const MerchantCard = React.memo(({ item, onNavigate }) => {
  const currentHour = new Date().getHours();
  const currentDayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
  const openHour = item.operatingHours?.[currentDayKey]?.open;
  const closeHour = item.operatingHours?.[currentDayKey]?.close;
  const isOpen = openHour !== undefined && closeHour !== undefined && currentHour >= openHour && currentHour < closeHour && !item.isManuallyClosed;

  return (
    <TouchableOpacity style={styles.merchantCard} onPress={() => onNavigate(item.id)}>
      <Image
        source={{ uri: item.logo || 'https://via.placeholder.com/400x200.png?text=Restaurant' }}
        style={styles.merchantLogo}
        resizeMode="cover"
      />
      <View style={styles.merchantInfo}>
        <Text style={styles.merchantName}>{item.storeName}</Text>
        <Text style={styles.merchantAddress} numberOfLines={1}>{item.address}</Text>
        {openHour !== undefined ? (
          <Text style={[styles.merchantHours, { color: isOpen ? '#27ae60' : '#e74c3c' }]}>
            {isOpen ? `Đang mở cửa (Đóng lúc ${closeHour}h)` : 'Đang đóng cửa'}
          </Text>
        ) : (
          <Text style={styles.merchantHours}>Chưa có giờ hoạt động</Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

// --- COMPONENT THẺ MÓN ĂN ---
const DishCard = React.memo(({ item, merchantName, onNavigate }) => {
  return (
    <TouchableOpacity style={styles.dishCard} onPress={() => onNavigate(item.merchantId)}>
      <Image
        source={{ uri: item.image || 'https://via.placeholder.com/300x200.png?text=Dish' }}
        style={styles.dishCardImg}
        resizeMode="cover"
      />
      <View style={styles.dishCardBody}>
        <Text style={styles.dishCardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.dishCardMerchant} numberOfLines={1}>{merchantName}</Text>
        <View style={styles.dishCardFooter}>
          <Text style={styles.dishCardPrice}>{item.price ? item.price.toLocaleString('vi-VN') : 0}đ</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});


// --- MÀN HÌNH CHÍNH ---
export default function HomeScreen() {
  const [merchants, setMerchants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuth();
  const navigation = useNavigation(); // 💡 Hook để điều hướng trong React Native
  const toast = useToast();

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [merchantsData, menuItemsData] = await Promise.all([
        fetchMerchants(),
        fetchMenuItems(),
      ]);
      setMerchants(merchantsData);
      setMenuItems(menuItemsData.slice(0, 8));
    } catch (err) {
      setError('Không thể tải dữ liệu trang chủ.');
      console.error("Failed to fetch home data:", err);
      toast.show('Không thể tải dữ liệu trang chủ.', 'error');
    }
  }, [toast]);

  // Lần đầu tải dữ liệu
  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // Xử lý "Kéo để làm mới" (Pull to refresh)
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleNavigateToMenu = (merchantId) => {
    // 💡 Điều hướng đến màn hình Menu, truyền merchantId theo
    navigation.navigate('MenuScreen', { merchantId: merchantId });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#ff7a59" />
        <Text style={{ marginTop: 10 }}>Đang tải dữ liệu...</Text>
      </SafeAreaView>
    );
  }

  if (error && merchants.length === 0) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>
      </SafeAreaView>
    );
  }

  // --- RENDER GIAO DIỆN ---
  return (
    <SafeAreaView style={styles.flexOne}>
      <FlatList
        ListHeaderComponent={
          <>
            {user && (
              <View style={styles.welcomeBox}>
                <Text>Chào mừng, <Text style={{ fontWeight: 'bold' }}>{user.name || user.email}</Text>!</Text>
              </View>
            )}
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>Khám phá Quán ăn</Text>
              <Text style={styles.heroSubtitle}>Đặt món ngon từ các nhà hàng yêu thích!</Text>
            </View>
            <Text style={styles.sectionTitle}>Nhà hàng nổi bật</Text>
          </>
        }
        data={merchants}
        renderItem={({ item }) => <MerchantCard item={item} onNavigate={handleNavigateToMenu} />}
        keyExtractor={item => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        // Phần Footer sẽ chứa danh sách món ăn gợi ý
        ListFooterComponent={
          <>
            <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Món ngon gần bạn</Text>
            <FlatList
              data={menuItems}
              renderItem={({ item }) => (
                <DishCard
                  item={item}
                  merchantName={merchants.find(m => m.id === item.merchantId)?.storeName || '...'}
                  onNavigate={handleNavigateToMenu}
                />
              )}
              keyExtractor={item => item.id.toString()}
              numColumns={2} // 💡 Tạo lưới 2 cột
              columnWrapperStyle={{ justifyContent: 'space-between' }} // Để các item giãn ra
              scrollEnabled={false} // Tắt cuộn của FlatList lồng nhau
            />
          </>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#ff7a59"]} />
        }
      />
    </SafeAreaView>
  );
}

// 💡 CSS được chuyển thành StyleSheet
const styles = StyleSheet.create({
  flexOne: { flex: 1, backgroundColor: '#fff' },
  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  welcomeBox: { marginTop: 10, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 10, alignItems: 'center' },
  hero: { backgroundColor: '#fbe9e2', padding: 25, borderRadius: 18, marginVertical: 20, alignItems: 'center' },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#333' },
  heroSubtitle: { fontSize: 16, color: '#555', marginTop: 8 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#333', marginBottom: 15 },

  // --- Thẻ Nhà hàng ---
  merchantCard: {
    width: MERCHANT_CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    // --- Box Shadow for Android & iOS ---
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  merchantLogo: { width: '100%', height: 150 },
  merchantInfo: { padding: 15 },
  merchantName: { fontSize: 20, fontWeight: '700', color: '#333' },
  merchantAddress: { fontSize: 14, color: '#666', marginTop: 4 },
  merchantHours: { fontSize: 13, fontWeight: '600', marginTop: 8 },

  // --- Thẻ Món ăn ---
  dishCard: {
    width: DISH_CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  dishCardImg: { width: '100%', aspectRatio: 16 / 10 },
  dishCardBody: { padding: 12 },
  dishCardTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  dishCardMerchant: { fontSize: 12, color: '#666', marginTop: 4, marginBottom: 8 },
  dishCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dishCardPrice: { fontSize: 15, fontWeight: '700', color: '#ff7a59' },
});
