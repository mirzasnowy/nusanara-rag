-- ============================================================
-- schema.sql — NusaNara Database Schema
-- Jalankan: psql -h localhost -U mirza -d nusanara_dev -f schema.sql
-- ============================================================

-- ── Ekstensi ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;      -- pgvector untuk embedding
CREATE EXTENSION IF NOT EXISTS unaccent;    -- normalisasi teks (é → e)
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- trigram similarity (opsional)

-- ── Tabel knowledge_base ─────────────────────────────────────
-- Menyimpan 476 data lowongan dari Glints beserta embedding vector
CREATE TABLE IF NOT EXISTS knowledge_base (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(200)   NOT NULL,
    company         VARCHAR(200),
    location        VARCHAR(200),
    salary_text     VARCHAR(100),
    salary_min      INTEGER,                    -- untuk filtering gaji
    salary_max      INTEGER,
    requirements    TEXT,
    skills          TEXT[],                     -- array: ['Python', 'SQL', 'ML']
    cluster         VARCHAR(50),                -- 'Teknologi', 'Kreatif', dst
    experience_min  INTEGER DEFAULT 0,
    content         TEXT NOT NULL DEFAULT '',   -- teks gabungan untuk embedding
    embedding       VECTOR(768),                -- nomic-embed-text output dimension
    search_vector   TSVECTOR,                   -- untuk full-text search
    date_posted     VARCHAR(50),
    source_url      VARCHAR(500),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Index untuk vector similarity search (cosine)
-- Catatan: lists = sqrt(jumlah_baris) — untuk 476 baris, 50 sudah cukup
CREATE INDEX IF NOT EXISTS idx_kb_embedding
    ON knowledge_base
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

-- Index untuk full-text search
CREATE INDEX IF NOT EXISTS idx_kb_fts
    ON knowledge_base
    USING GIN (search_vector);

-- Index untuk filtering per klaster karier
CREATE INDEX IF NOT EXISTS idx_kb_cluster ON knowledge_base (cluster);

-- Fungsi: otomatis update search_vector saat insert/update
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('indonesian',
        coalesce(NEW.title, '')       || ' ' ||
        coalesce(array_to_string(NEW.skills, ' '), '') || ' ' ||
        coalesce(NEW.location, '')    || ' ' ||
        coalesce(NEW.requirements, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: jalankan fungsi saat insert atau update
DROP TRIGGER IF EXISTS trig_kb_search_vector ON knowledge_base;
CREATE TRIGGER trig_kb_search_vector
    BEFORE INSERT OR UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- ── Tabel user_profiles ──────────────────────────────────────
-- Menyimpan profil adaptif pengguna yang diperbarui setiap sesi
-- Ini adalah inti dari fitur "adaptif" NusaNara
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id              VARCHAR(200) PRIMARY KEY,  -- Clerk user ID (format: user_xxxx)
    email                VARCHAR(200),
    full_name            VARCHAR(200),
    profile_summary      TEXT,           -- ringkasan naratif terkini hasil summarization LLM
    identified_skills    TEXT[],         -- skill yang terdeteksi dari narasi
    career_interests     TEXT[],         -- minat karier yang terdeteksi
    education_level      VARCHAR(50),    -- 'SMA', 'SMK', 'Mahasiswa', 'Lulus'
    preferred_location   VARCHAR(100),
    preferred_clusters   TEXT[],         -- klaster yang sering dicari
    session_count        INTEGER DEFAULT 0,
    last_active          TIMESTAMP,
    created_at           TIMESTAMP DEFAULT NOW(),
    updated_at           TIMESTAMP DEFAULT NOW()
);

-- Fungsi: otomatis update updated_at
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trig_profile_updated_at ON user_profiles;
CREATE TRIGGER trig_profile_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Tabel recommendation_history ─────────────────────────────
-- Menyimpan seluruh riwayat rekomendasi untuk:
-- - Fitur lihat riwayat pengguna
-- - Evaluasi akurasi RAG (retrieved_chunks)
-- - Evaluasi performa sistem (response_time_ms)
CREATE TABLE IF NOT EXISTS recommendation_history (
    id                   SERIAL PRIMARY KEY,
    user_id              VARCHAR(200) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    narrative_input      TEXT NOT NULL,              -- narasi yang dikirim user
    profile_at_time      TEXT,                       -- snapshot profil saat itu
    retrieved_chunks     JSONB,                      -- dokumen top-3 yang diambil RAG
    recommendation       TEXT NOT NULL,              -- output lengkap dari LLM
    identified_positions TEXT[],                     -- posisi karier yang direkomendasikan
    response_time_ms     INTEGER,                    -- untuk evaluasi performa
    tokens_generated     INTEGER,                    -- jumlah token yang di-generate
    created_at           TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rh_user_id ON recommendation_history (user_id);
CREATE INDEX IF NOT EXISTS idx_rh_created ON recommendation_history (created_at DESC);

-- ── Query Berguna (Development & Evaluasi) ───────────────────

-- Cek distribusi knowledge base per cluster:
-- SELECT cluster, COUNT(*) as jumlah FROM knowledge_base GROUP BY cluster ORDER BY jumlah DESC;

-- Cek status embedding:
-- SELECT COUNT(*) as total, COUNT(embedding) as sudah_embed,
--        COUNT(*) - COUNT(embedding) as belum_embed FROM knowledge_base;

-- Rata-rata response time (untuk bab evaluasi):
-- SELECT AVG(response_time_ms) as avg_ms, MIN(response_time_ms) as min_ms,
--        MAX(response_time_ms) as max_ms,
--        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_ms
-- FROM recommendation_history;
