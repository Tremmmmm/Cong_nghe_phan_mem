// src/components/TrackDroneButton.jsx
import { Link } from "react-router-dom";

const normalizeStatus = (s = "") => {
  const x = s.toLowerCase();
  if (["delivering"].includes(x)) return "delivery";
  if (["delivered", "completed", "done"].includes(x)) return "done";
  if (["cancelled", "canceled"].includes(x)) return "cancelled";
  if (["accepted", "preparing", "ready"].includes(x)) return "processing";
  if (["new", "pending", "confirmed"].includes(x)) return "order";
  return "order";
};

const isDroneOrder = (o) =>
  ((o?.deliveryMode || "").toLowerCase() === "drone") ||
  ((o?.courier || "").toLowerCase() === "drone") ||
  !!o?.droneMissionId;

const isDelivering = (o) => normalizeStatus(o?.status) === "delivery";

export default function TrackDroneButton({ order, className = "" }) {
  const show = isDroneOrder(order) && isDelivering(order);
  const orderParam = encodeURIComponent(String(order?.id ?? "").replace(/^#/, ""));

  if (!show) {
    // Không hiển thị gì khi không thoả điều kiện
    return null;
  }

  return (
    <Link
      to={`/orders/${orderParam}/tracking`}
      className={className || "px-3 py-1.5 rounded-xl bg-black text-white inline-flex items-center justify-center"}
      style={{ textDecoration: "none" }}
      aria-label={`Xem hành trình đơn #${order?.id}`}
      title="Xem hành trình Drone"
    >
      Xem hành trình
    </Link>
  );
}
