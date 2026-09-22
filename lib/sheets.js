import { google } from "googleapis";

// ---------------------------------------------------------------------------
// Google Sheets dipakai sebagai "database". Struktur sheet yang dibutuhkan
// (nama tab harus persis sama, huruf besar/kecil berpengaruh):
//
//   Settings   -> kolom: key | value
//   Products   -> kolom: id | name | category | priceNormal | priceDiskon |
//                         sold | emoji | color | image | bundle | active | order
//   Coupons    -> kolom: code | percent | active
//   Orders     -> kolom: timestamp | orderId | status | customerName | phone |
//                         address | notes | items | subtotal | discount |
//                         total | couponCode
//   Admins     -> kolom: id | name | email | passwordHash | phone |
//                         phoneVerified | birthDate | gender | createdAt |
//                         active
//
// Baris pertama tiap tab adalah header (boleh diisi bebas, tidak dibaca oleh
// kode ini secara khusus, hanya dilewati).
// ---------------------------------------------------------------------------

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Private key di env var biasanya menyimpan literal "\n", ubah jadi baris baru asli.
  const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!email || !key || !SHEET_ID) {
    throw new Error(
      "Konfigurasi Google Sheets belum lengkap. Cek GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID di .env"
    );
  }
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsApi() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

async function readRange(range) {
  const sheets = getSheetsApi();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  });
  return res.data.values || [];
}

async function writeRange(range, values) {
  const sheets = getSheetsApi();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

async function clearRange(range) {
  const sheets = getSheetsApi();
  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range });
}

async function appendRow(range, row) {
  const sheets = getSheetsApi();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

// ---------------- Settings ----------------

const SETTINGS_DEFAULTS = {
  shopName: "Mamahepi",
  tagline: "Siomay hangat, jus segar, dan template Excel siap pakai",
  timerEnd: "",
  waNumber: "",
  lynkUrl: "",
  bankName: "",
  bankAccount: "",
  bankHolder: "",
  ownerEmail: "",
  ownerWaNumber: "",
};

export async function getSettings() {
  const rows = await readRange("Settings!A2:B");
  const settings = { ...SETTINGS_DEFAULTS };
  rows.forEach(([key, value]) => {
    if (key) settings[key] = value ?? "";
  });
  return settings;
}

export async function saveSettings(settings) {
  const merged = { ...SETTINGS_DEFAULTS, ...settings };
  const rows = Object.entries(merged).map(([k, v]) => [k, String(v ?? "")]);
  await clearRange("Settings!A2:B1000");
  await writeRange("Settings!A2", rows);
  return merged;
}

// ---------------- Products ----------------

const PRODUCT_COLUMNS = [
  "id",
  "name",
  "category",
  "priceNormal",
  "priceDiskon",
  "sold",
  "emoji",
  "color",
  "image",
  "bundle",
  "active",
  "order",
];

function rowToProduct(row) {
  const p = {};
  PRODUCT_COLUMNS.forEach((col, i) => {
    p[col] = row[i] ?? "";
  });
  p.priceNormal = Number(p.priceNormal || 0);
  p.priceDiskon = Number(p.priceDiskon || 0);
  p.sold = Number(p.sold || 0);
  p.order = Number(p.order || 0);
  p.bundle = String(p.bundle).toLowerCase() === "true";
  p.active = String(p.active) !== "false"; // default true kalau kosong
  return p;
}

function productToRow(p) {
  return [
    p.id,
    p.name,
    p.category,
    p.priceNormal,
    p.priceDiskon,
    p.sold,
    p.emoji,
    p.color,
    p.image,
    p.bundle ? "true" : "false",
    p.active === false ? "false" : "true",
    p.order,
  ];
}

export async function getAllProducts() {
  const rows = await readRange("Products!A2:L");
  return rows.filter((r) => r[0]).map(rowToProduct);
}

export async function getActiveProducts() {
  const all = await getAllProducts();
  return all
    .filter((p) => p.active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function saveAllProducts(products) {
  const rows = products.map(productToRow);
  await clearRange("Products!A2:L5000");
  if (rows.length) await writeRange("Products!A2", rows);
  return products;
}

// ---------------- Coupons ----------------

export async function getAllCoupons() {
  const rows = await readRange("Coupons!A2:C");
  return rows
    .filter((r) => r[0])
    .map(([code, percent, active]) => ({
      code: String(code || "").trim(),
      percent: Number(percent || 0),
      active: String(active).toLowerCase() !== "false",
    }));
}

export async function saveAllCoupons(coupons) {
  const rows = coupons.map((c) => [
    c.code,
    c.percent,
    c.active === false ? "false" : "true",
  ]);
  await clearRange("Coupons!A2:C2000");
  if (rows.length) await writeRange("Coupons!A2", rows);
  return coupons;
}

// ---------------- Orders ----------------

export async function appendOrder(order) {
  const row = [
    order.timestamp,
    order.orderId,
    order.status || "Baru",
    order.customerName,
    order.phone,
    order.address,
    order.notes || "",
    JSON.stringify(order.items || []),
    order.subtotal,
    order.discount,
    order.total,
    order.couponCode || "",
  ];
  await appendRow("Orders!A:L", row);
  return order;
}

export async function getAllOrders() {
  const rows = await readRange("Orders!A2:L");
  return rows
    .filter((r) => r[1]) // orderId ada
    .map((r) => ({
      timestamp: r[0] || "",
      orderId: r[1] || "",
      status: r[2] || "Baru",
      customerName: r[3] || "",
      phone: r[4] || "",
      address: r[5] || "",
      notes: r[6] || "",
      items: (() => {
        try {
          return JSON.parse(r[7] || "[]");
        } catch {
          return [];
        }
      })(),
      subtotal: Number(r[8] || 0),
      discount: Number(r[9] || 0),
      total: Number(r[10] || 0),
      couponCode: r[11] || "",
    }))
    .reverse(); // terbaru dulu
}

// ---------------- Visits (untuk dashboard: jumlah pengunjung) ----------------
//
// Tab `Visits` -> kolom: timestamp | path
// Satu baris = satu kunjungan (dicatat sekali per sesi browser dari halaman toko).
// Kalau tab ini belum dibuat di Google Sheet, dianggap kosong (tidak error),
// jadi dashboard tetap jalan meski kamu belum menambahkan tab-nya.

export async function logVisit(path) {
  try {
    await appendRow("Visits!A:B", [new Date().toISOString(), path || "/"]);
  } catch {
    // tab belum ada / gagal catat -> jangan ganggu pengalaman pengunjung
  }
}

export async function getAllVisits() {
  try {
    const rows = await readRange("Visits!A2:B");
    return rows
      .filter((r) => r[0])
      .map((r) => ({ timestamp: r[0], path: r[1] || "/" }));
  } catch {
    return [];
  }
}

// ---------------- Admins (akun admin yang mendaftar sendiri) ----------------
//
// Setiap orang yang daftar lewat /admin/register jadi satu baris di sini,
// dengan role "admin" (beda dari "administrator" pemilik toko yang login
// pakai ADMIN_EMAIL/ADMIN_PASSWORD di .env). Nomor telepon dianggap valid
// begitu diisi saat daftar — tidak ada proses verifikasi OTP/SMS terpisah.

const ADMIN_COLUMNS = [
  "id",
  "name",
  "email",
  "passwordHash",
  "phone",
  "phoneVerified",
  "birthDate",
  "gender",
  "createdAt",
  "active",
  "resetCode",
  "resetCodeExpiry",
];

function rowToAdmin(row) {
  const a = {};
  ADMIN_COLUMNS.forEach((col, i) => {
    a[col] = row[i] ?? "";
  });
  a.phoneVerified = String(a.phoneVerified).toLowerCase() === "true";
  a.active = String(a.active) !== "false"; // default true kalau kosong
  return a;
}

function adminToRow(a) {
  return [
    a.id,
    a.name,
    a.email,
    a.passwordHash,
    a.phone,
    a.phoneVerified ? "true" : "false",
    a.birthDate || "",
    a.gender || "",
    a.createdAt,
    a.active === false ? "false" : "true",
    a.resetCode || "",
    a.resetCodeExpiry || "",
  ];
}

export async function getAllAdmins() {
  const rows = await readRange("Admins!A2:L");
  return rows.filter((r) => r[0]).map(rowToAdmin);
}

export async function getAdminByEmail(email) {
  const needle = String(email || "").trim().toLowerCase();
  if (!needle) return null;
  const admins = await getAllAdmins();
  return admins.find((a) => String(a.email).trim().toLowerCase() === needle) || null;
}

export async function addAdmin(admin) {
  await appendRow("Admins!A:L", adminToRow(admin));
  return admin;
}

async function findAdminRowNumber(email) {
  const needle = String(email || "").trim().toLowerCase();
  const rows = await readRange("Admins!A2:L");
  const idx = rows.findIndex((r) => String(r[2] || "").trim().toLowerCase() === needle);
  if (idx === -1) return null;
  return idx + 2; // +2 karena mulai baris 2 dan idx 0-based
}

// Ganti password (dipakai baik oleh menu "ganti password" maupun setelah
// verifikasi kode OTP lupa password). Kolom D = passwordHash.
export async function updateAdminPasswordHash(email, passwordHash) {
  const rowNumber = await findAdminRowNumber(email);
  if (!rowNumber) throw new Error("Akun admin tidak ditemukan");
  const sheets = getSheetsApi();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Admins!D${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[passwordHash]] },
  });
  return true;
}

// Simpan kode OTP 6 digit untuk lupa password. Kolom K = resetCode,
// kolom L = resetCodeExpiry (ISO string, kadaluarsa ~10 menit).
export async function setAdminResetCode(email, code, expiryISO) {
  const rowNumber = await findAdminRowNumber(email);
  if (!rowNumber) throw new Error("Akun admin tidak ditemukan");
  const sheets = getSheetsApi();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Admins!K${rowNumber}:L${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[code, expiryISO]] },
  });
  return true;
}

// Hapus kode OTP setelah dipakai (atau setelah reset berhasil), supaya kode
// yang sama tidak bisa dipakai berulang kali.
export async function clearAdminResetCode(email) {
  const rowNumber = await findAdminRowNumber(email);
  if (!rowNumber) return false;
  const sheets = getSheetsApi();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Admins!K${rowNumber}:L${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [["", ""]] },
  });
  return true;
}

export async function updateOrderStatus(orderId, status) {
  const sheets = getSheetsApi();
  const rows = await readRange("Orders!A2:L");
  const idx = rows.findIndex((r) => r[1] === orderId);
  if (idx === -1) throw new Error("Order tidak ditemukan");
  const rowNumber = idx + 2; // +2 karena mulai baris 2 dan idx 0-based
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Orders!C${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[status]] },
  });
  return true;
}
