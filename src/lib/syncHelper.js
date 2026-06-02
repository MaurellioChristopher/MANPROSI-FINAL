import { supabase } from './supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

/**
 * Mendapatkan data terbaru dari Supabase untuk key tertentu,
 * mensinkronisasikannya ke localStorage, dan mengembalikan datanya.
 * @param {string} key - Kunci penyimpanan (misal: 'agrigems_farms')
 * @returns {Promise<Array>}
 */
export async function syncFromSupabase(key) {
  console.log(`[Sync] Menarik data dari Supabase untuk key: "${key}" | DB URL: ${supabaseUrl}`);
  try {
    const { data, error } = await supabase
      .from('agrigems_sync_data')
      .select('data')
      .eq('key_name', key)
      .maybeSingle();

    if (error) {
      console.error(`[Sync Error] Gagal membaca key "${key}" dari Supabase:`, error.message);
    } else if (data && data.data) {
      console.log(`[Sync Success] Berhasil sinkronisasi key "${key}" dari Supabase. Data:`, data.data);
      localStorage.setItem(key, JSON.stringify(data.data));
      return data.data;
    } else {
      console.log(`[Sync Info] Key "${key}" belum ada di database Supabase. Menggunakan data lokal.`);
    }
  } catch (err) {
    console.error(`[Sync Exception] Kesalahan saat menarik key "${key}":`, err);
  }

  // Fallback ke localStorage jika Supabase bermasalah atau kosong
  const local = localStorage.getItem(key);
  return local ? JSON.parse(local) : [];
}

/**
 * Menyimpan data ke localStorage dan melakukan upsert ke Supabase.
 * @param {string} key - Kunci penyimpanan (misal: 'agrigems_farms')
 * @param {Array|Object} payload - Data yang akan disimpan
 * @returns {Promise<void>}
 */
export async function syncToSupabase(key, payload) {
  console.log(`[Sync] Mengirim data ke Supabase untuk key: "${key}" | DB URL: ${supabaseUrl}`);
  try {
    // 1. Simpan secara lokal
    localStorage.setItem(key, JSON.stringify(payload));

    // 2. Kirim/Upsert ke Supabase
    const { error } = await supabase
      .from('agrigems_sync_data')
      .upsert(
        { key_name: key, data: payload, updated_at: new Date().toISOString() },
        { onConflict: 'key_name' }
      );

    if (error) {
      console.error(`[Sync Error] Gagal mengunggah data ke Supabase untuk key "${key}":`, error.message);
    } else {
      console.log(`[Sync Success] Berhasil mengunggah data key "${key}" ke Supabase.`);
    }
  } catch (err) {
    console.error(`[Sync Exception] Gagal melakukan sync ke Supabase untuk key "${key}":`, err);
  }
}
