export const PHONE_VN = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

export const isPhoneVN = (s) => {
  const v = String(s ?? "").trim();
  return PHONE_VN.test(v);
};
