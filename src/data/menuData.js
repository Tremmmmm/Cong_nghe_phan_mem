// Bạn cứ thêm/sửa tại đây cho tiện. image: để trống sẽ dùng ảnh placeholder.
export const SINGLES = [
  {
    id: "sg-1",
    name: "Beef Burger",
    price: 45000,
    desc: "Bánh burger bò nướng, rau tươi, sốt đặc biệt.",
    image: "/assets/images/menu/beefburger.jpg",
  },
  {
    id: "sg-2",
    name: "Cheese Burger",
    price: 52000,
    desc: "Burger bò phô mai béo ngậy.",
    image: "/assets/images/menu/cheeseburger.webp",
  },
  {
    id: "sg-3",
    name: "Fried Chicken",
    price: 52000,
    desc: "Gà rán giòn rụm, vị cay nhẹ.",
    image: "/assets/images/menu/friedchicken.webp",
  },
  {
    id: "sg-4",
    name: "French Fries",
    price: 29000,
    desc: "Khoai tây chiên giòn, muối nhẹ.",
    image: "/assets/images/menu/frenchfries.jpg",
  },
  {
    id: "sg-5",
    name: "Cheese Pizza (slice)",
    price: 39000,
    desc: "Pizza phô mai lát, nướng lò.",
    image: "/assets/images/menu/cheesepizza.webp",
  },
  {
    id: "sg-6",
    name: "Cola",
    price: 15000,
    desc: "Nước ngọt có ga 330ml.",
    image: "/assets/images/menu/cocacola.jpg",
  },
];

export const COMBOS = [
  {
    id: "cb-1",
    name: "Combo1 Burger + Coke",
    price: 59000,
    desc: "Burger bò + Cola 330ml.",
    image: "/assets/images/menu/combo1.webp",
  },
  {
    id: "cb-2",
    name: "Combo2 Chicken + Fries",
    price: 69000,
    desc: "2 miếng gà rán + Khoai tây chiên.",
    image: "/assets/images/menu/combo2.webp",
  },
  {
    id: "cb-3",
    name: "Combo3 Pizza + Coke",
    price: 99000,
    desc: "Pizza phô mai (m) + Cola 330ml.",
    image: "/assets/images/menu/combo3.jpg",
  },
];

const MENU_ALL = [...SINGLES, ...COMBOS];
export default MENU_ALL;
