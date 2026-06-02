import { supabase } from './supabase';

/**
 * Mendapatkan data terbaru dari Supabase untuk key tertentu,
 * mensinkronisasikannya ke localStorage, dan mengembalikan datanya.
 * @param {string} key - Kunci penyimpanan (misal: 'agrigems_farms')
 * @returns {Promise<Array>}
 */
export async function syncFromSupabase(key) {
  try {
    const { data, error } = await supabase
      .from('agrigems_sync_data')
      .select('data')
      .eq('key_name', key)
      .maybeSingle();

    if (error) {
      console.warn(`Supabase read error for key "${key}":`, error.message);
    } else if (data && data.data) {
      localStorage.setItem(key, JSON.stringify(data.data));
      return data.data;
    }
  } catch (err) {
    console.error(`Gagal melakukan sync dari Supabase untuk key "${key}":`, err);
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
      console.error(`Gagal mengunggah data ke Supabase untuk key "${key}":`, error.message);
    }
  } catch (err) {
    console.error(`Gagal melakukan sync ke Supabase untuk key "${key}":`, err);
  }
}
