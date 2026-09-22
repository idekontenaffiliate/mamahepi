"use client";

import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";

const EMPTY_PRODUCT = {
  id: "",
  name: "",
  category: "",
  priceNormal: 0,
  priceDiskon: 0,
  sold: 0,
  emoji: "🌶️",
  color: "#C1571A",
  image: "",
  bundle: false,
  active: true,
  order: 0,
};

// Ubah file gambar jadi data URL JPEG yang sudah dikecilkan, supaya muat
// disimpan langsung di sel Google Sheets (tanpa perlu layanan hosting gambar
// terpisah). Dimensi terbesar dibatasi & kualitas dikompres otomatis sampai
// ukurannya aman.
function resizeImageToDataUrl(file, maxSize = 640, maxChars = 45000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("File bukan gambar yang valid"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);

        let quality = 0.75;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > maxChars && quality > 0.35) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        if (dataUrl.length > maxChars) {
          reject(new Error("Gambar masih terlalu besar, coba foto lain atau tempel URL saja"));
          return;
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [uploadingIdx, setUploadingIdx] = useState(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function updateField(idx, field, value) {
    setProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  function addProduct() {
    setProducts((prev) => [...prev, { ...EMPTY_PRODUCT, order: prev.length + 1 }]);
  }

  function removeProduct(idx) {
    setProducts((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleImageFile(idx, file) {
    if (!file) return;
    setUploadingIdx(idx);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      updateField(idx, "image", dataUrl);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingIdx(null);
    }
  }

  async function save() {
    setSaving(true);
    setNote("");
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProducts(data.products);
      setNote("Tersimpan ✓");
      setTimeout(() => setNote(""), 2000);
    } catch (err) {
      setNote("Gagal simpan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-shell">
      <AdminNav />
      <div className="admin-body">
        <div className="section-head">
          <h2>Kelola produk</h2>
        </div>

        {loading ? (
          <div className="skeleton">Memuat produk…</div>
        ) : (
          <>
            {products.map((p, idx) => (
              <div className="admin-product" key={idx}>
                <div className="admin-product-top">
                  <span>Produk #{idx + 1}</span>
                  <button className="del-btn" onClick={() => removeProduct(idx)}>Hapus</button>
                </div>
                <div className="field">
                  <label>Nama produk</label>
                  <input value={p.name} onChange={(e) => updateField(idx, "name", e.target.value)} />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Kategori</label>
                    <input value={p.category} onChange={(e) => updateField(idx, "category", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Emoji</label>
                    <input value={p.emoji} onChange={(e) => updateField(idx, "emoji", e.target.value)} />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Harga normal</label>
                    <input type="number" value={p.priceNormal} onChange={(e) => updateField(idx, "priceNormal", Number(e.target.value))} />
                  </div>
                  <div className="field">
                    <label>Harga diskon (0 = tanpa diskon)</label>
                    <input type="number" value={p.priceDiskon} onChange={(e) => updateField(idx, "priceDiskon", Number(e.target.value))} />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Terjual</label>
                    <input type="number" value={p.sold} onChange={(e) => updateField(idx, "sold", Number(e.target.value))} />
                  </div>
                  <div className="field">
                    <label>Urutan tampil</label>
                    <input type="number" value={p.order} onChange={(e) => updateField(idx, "order", Number(e.target.value))} />
                  </div>
                </div>
                <div className="field">
                  <label>Foto produk (opsional, kosongkan untuk pakai emoji)</label>
                  <div className="image-upload-row">
                    <div className="image-preview">
                      {p.image ? <img src={p.image} alt="" /> : (p.emoji || "🖼️")}
                    </div>
                    <label className="upload-btn" style={{ cursor: "pointer" }}>
                      {uploadingIdx === idx ? "Memproses…" : "Ganti foto"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => handleImageFile(idx, e.target.files?.[0])}
                      />
                    </label>
                    {p.image && (
                      <button className="del-btn" onClick={() => updateField(idx, "image", "")}>Hapus foto</button>
                    )}
                  </div>
                  <input
                    value={p.image}
                    onChange={(e) => updateField(idx, "image", e.target.value)}
                    placeholder="atau tempel URL gambar di sini"
                    style={{ marginTop: 6 }}
                  />
                  <div className="upload-hint">Foto otomatis dikecilkan &amp; disimpan langsung ke Google Sheets.</div>
                </div>
                <div className="chk-row">
                  <input type="checkbox" checked={p.bundle} onChange={(e) => updateField(idx, "bundle", e.target.checked)} id={`bundle-${idx}`} />
                  <label htmlFor={`bundle-${idx}`}>Paket hemat</label>
                </div>
                <div className="chk-row">
                  <input type="checkbox" checked={p.active !== false} onChange={(e) => updateField(idx, "active", e.target.checked)} id={`active-${idx}`} />
                  <label htmlFor={`active-${idx}`}>Aktif / tampil di toko</label>
                </div>
              </div>
            ))}

            <button className="add-row-btn" onClick={addProduct}>+ Tambah produk</button>

            {note && <div className="save-note">{note}</div>}
            <button className="save-btn" onClick={save} disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan semua perubahan"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
