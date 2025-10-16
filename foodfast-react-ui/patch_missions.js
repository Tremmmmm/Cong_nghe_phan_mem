/**
 * Patch missions cho json-server dựa theo trạng thái đơn trong "Khu nhà hàng".
 * Cách dùng:
 *    node patch_missions.js api/db.json
 *
 * Mapping:
 *  - accepted / preparing / ready  -> mission.status = "queued"
 *  - delivering                    -> "enroute"
 *  - completed / delivered / done  -> "landed"
 *  - cancelled / canceled          -> "cancelled"
 *
 * Tác vụ:
 *  - Tạo mission nếu chưa có; hoặc đồng bộ status nếu đã có.
 *  - Gán order.droneMissionId = mission.id (chuẩn hoá).
 *  - Tạo ít nhất 1-2 dòng dronePositions cho đơn Delivering (để có tọa độ + "Cập nhật").
 */

const fs = require('fs');
const path = require('path');

const FILE = process.argv[2] || 'api/db.json';

// Tọa độ mặc định nhà hàng (bạn có thể sửa cho đúng nhà hàng của bạn)
const RESTAURANT = { lat: 10.776889, lng: 106.700806 };
const DEFAULT_SPEED = 35;  // km/h
const DEFAULT_BATTERY = 88;
const NOW = Date.now();

// ===== helpers =====
const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJSON = (p, data) =>
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');

function ensureArray(obj, key) {
  if (!Array.isArray(obj[key])) obj[key] = [];
}

function statusToMission(orderStatus = '') {
  const s = String(orderStatus).toLowerCase();
  if (['accepted', 'preparing', 'ready'].includes(s)) return 'queued';
  if (s === 'delivering') return 'enroute';
  if (['completed', 'delivered', 'done'].includes(s)) return 'landed';
  if (['cancelled', 'canceled'].includes(s)) return 'cancelled';
  return null; // bỏ qua trạng thái khác
}

const haversineKm = (a, b) => {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const normOrderId = (x) => String(x).replace(/^#/, '');
const makeMissionId = (orderId) => `DM-${String(orderId).toUpperCase()}`;
const toPath = (origin, destination) => [
  { lat: origin.lat, lng: origin.lng },
  { lat: destination.lat, lng: destination.lng },
];

function main() {
  if (!fs.existsSync(FILE)) {
    console.error('❌ Không tìm thấy file:', FILE);
    process.exit(1);
  }

  const db = readJSON(FILE);
  ensureArray(db, 'orders');
  ensureArray(db, 'droneMissions');
  ensureArray(db, 'dronePositions');

  // Index nhiệm vụ theo id và theo orderId
  const missionById = Object.fromEntries(
    db.droneMissions.map((m) => [String(m.id), m])
  );
  const missionByOrder = {};
  for (const m of db.droneMissions) {
    if (m && m.orderId != null) {
      missionByOrder[String(m.orderId)] = m;
      missionByOrder[normOrderId(String(m.orderId))] = m; // cả 2 dạng có/không '#'
    }
    // Chuẩn hoá status cũ "delivering" -> "enroute" cho đồng bộ
    if (String(m.status).toLowerCase() === 'delivering') m.status = 'enroute';
  }

  let createdM = 0,
    updatedM = 0,
    updatedOrders = 0,
    createdPos = 0;

  for (const o of db.orders) {
    const mStatus = statusToMission(o.status);
    if (!mStatus) continue; // bỏ qua trạng thái không xử lý

    // Ưu tiên: tìm mission theo order.droneMissionId; nếu không, theo orderId
    let m =
      missionById[String(o.droneMissionId)] ||
      missionByOrder[String(o.id)] ||
      missionByOrder[normOrderId(o.id)] ||
      null;

    // Xác định điểm đầu-cuối
    const origin = o.restaurantLocation || RESTAURANT;
    const dest =
      o.customerLocation ||
      // fallback: đích gần gần nhà hàng (để demo)
      {
        lat: +(RESTAURANT.lat + 0.02).toFixed(6),
        lng: +(RESTAURANT.lng - 0.05).toFixed(6),
      };

    if (!m) {
      // Tạo mission mới theo orderId
      const id = makeMissionId(o.id); // ví dụ: DM-W6HV
      const path = toPath(origin, dest);
      const distKm = haversineKm(path[0], path[1]);
      const eta = Math.max(5, Math.round((distKm / DEFAULT_SPEED) * 60));

      m = {
        id,
        orderId: normOrderId(o.id), // lưu dạng không '#'
        status: mStatus,
        startTime: NOW - 5 * 60 * 1000,
        endTime: null,
        path,
        speedKmh: DEFAULT_SPEED,
        eta,
      };

      db.droneMissions.push(m);
      missionById[m.id] = m;
      missionByOrder[m.orderId] = m;
      createdM++;
    } else {
      // Cập nhật status/path nếu thiếu
      if (m.status !== mStatus) {
        m.status = mStatus;
        updatedM++;
      }
      if (!Array.isArray(m.path) || m.path.length < 2) {
        m.path = toPath(origin, dest);
      }
      if (m.speedKmh == null) m.speedKmh = DEFAULT_SPEED;
      if (m.eta == null) {
        const distKm = haversineKm(m.path[0], m.path[1]);
        m.eta = Math.max(5, Math.round((distKm / DEFAULT_SPEED) * 60));
      }
    }

    // Link về order
    if (o.droneMissionId !== m.id) {
      o.droneMissionId = m.id;
      // đảm bảo flag là Drone nếu thiếu
      if (!o.deliveryMode) o.deliveryMode = 'DRONE';
      updatedOrders++;
    }
  }

  // Tạo telemetry cho các đơn đang giao
  const positionCountByMission = {};
  for (const p of db.dronePositions) {
    const mid = String(p.missionId || p.droneId || '');
    positionCountByMission[mid] = (positionCountByMission[mid] || 0) + 1;
  }

  for (const o of db.orders) {
    if (String(o.status).toLowerCase() !== 'delivering') continue;
    const mid = String(o.droneMissionId || '');
    if (!mid) continue;

    const hasAny = positionCountByMission[mid] > 0;
    if (!hasAny) {
      const m =
        missionById[mid] ||
        missionByOrder[String(o.id)] ||
        missionByOrder[normOrderId(o.id)];
      if (!m || !m.path || m.path.length < 2) continue;

      const start = m.path[0];
      const end = m.path[m.path.length - 1];
      const midPoint = {
        lat: +( (start.lat + end.lat) / 2 ).toFixed(6),
        lng: +( (start.lng + end.lng) / 2 ).toFixed(6),
      };

      db.dronePositions.push(
        {
          id: `TP-${mid}-0`,
          missionId: mid,
          lat: start.lat,
          lng: start.lng,
          speed: 0,
          battery: DEFAULT_BATTERY,
          timestamp: NOW - 3 * 60 * 1000,
        },
        {
          id: `TP-${mid}-1`,
          missionId: mid,
          lat: midPoint.lat,
          lng: midPoint.lng,
          speed: DEFAULT_SPEED,
          battery: DEFAULT_BATTERY - 3,
          timestamp: NOW - 60 * 1000,
        }
      );
      createdPos += 2;
    }
  }

  // Ghi file + backup
  const backup = FILE.replace(/\.json$/i, `.backup.${Date.now()}.json`);
  fs.copyFileSync(FILE, backup);
  writeJSON(FILE, db);

  console.log('✅ Done.');
  console.log(' - Missions created:', createdM);
  console.log(' - Missions updated:', updatedM);
  console.log(' - Orders updated  :', updatedOrders);
  console.log(' - Telemetry added :', createdPos);
  console.log('Backup saved at   :', path.resolve(backup));
}

main();
