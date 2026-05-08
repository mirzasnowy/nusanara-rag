import Head from 'next/head'
import Link from 'next/link'
import AppShell from '../components/AppShell'

// Simulated empty state — in a real app this would be fetched
const HISTORY_ITEMS = []

// Skeleton placeholder cards to show what a filled state looks like
const SKELETON_CARDS = [
  { label: 'Sesi Terbaru', time: 'Belum ada data', desc: 'Hasil analisis karier akan muncul di sini setelah Anda menjalankan rekomendasi pertama.' },
]

export default function RiwayatPage() {
  const isEmpty = HISTORY_ITEMS.length === 0

  return (
    <>
      <Head>
        <title>Riwayat — NusaNara</title>
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          .rw-empty-hero {
            border-radius: 20px; padding: 64px 48px;
            background: linear-gradient(135deg, rgba(7,30,56,0.8) 0%, rgba(4,17,30,0.9) 100%);
            border: 1px solid rgba(255,255,255,0.07);
            backdrop-filter: blur(12px);
            display: flex; flex-direction: column; align-items: center;
            text-align: center; gap: 20px; position: relative; overflow: hidden;
          }
          .rw-empty-hero::before {
            content:''; position:absolute; top:-60px; left:50%; transform:translateX(-50%);
            width:300px; height:300px;
            background: radial-gradient(circle, rgba(255,153,51,0.08) 0%, transparent 70%);
            pointer-events:none;
          }

          .rw-timeline { display:flex; flex-direction:column; gap:0; }
          .rw-timeline-item { display:flex; gap:20; padding-bottom:32px; position:relative; }
          .rw-timeline-item:last-child { padding-bottom:0; }
          .rw-tl-left { display:flex; flex-direction:column; align-items:center; }
          .rw-tl-dot { width:10px; height:10px; border-radius:50%; background:rgba(255,255,255,0.15); border:2px solid rgba(255,255,255,0.12); flex-shrink:0; margin-top:6px; }
          .rw-tl-dot.active { background:hsl(35,100%,60%); border-color:rgba(255,153,51,0.4); box-shadow:0 0 12px rgba(255,153,51,0.3); }
          .rw-tl-line { width:1px; flex:1; background:rgba(255,255,255,0.06); margin-top:8px; }

          .rw-card {
            background: rgba(7,24,48,0.6); border:1px solid rgba(255,255,255,0.07);
            border-radius:16px; padding:22px 24px; flex:1;
            backdrop-filter:blur(8px);
            transition: border-color .3s, transform .3s;
          }
          .rw-card:hover { border-color:rgba(255,153,51,0.18); transform:translateY(-2px); }

          .rw-card-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
          .rw-card-title { font-family:'Instrument Serif',serif; font-size:17px; color:rgba(255,255,255,0.88); letter-spacing:-0.3px; }
          .rw-card-time { font-size:10px; color:rgba(255,255,255,0.3); background:rgba(255,255,255,0.04); padding:3px 9px; border-radius:20px; border:1px solid rgba(255,255,255,0.06); white-space:nowrap; }
          .rw-card-desc { font-size:13px; color:rgba(255,255,255,0.42); line-height:1.7; margin-bottom:16px; }
          .rw-card-tags { display:flex; flex-wrap:wrap; gap:6px; }
          .rw-tag { font-size:10px; color:hsl(35,100%,60%); background:rgba(255,153,51,0.08); border:1px solid rgba(255,153,51,0.15); padding:3px 10px; border-radius:20px; }
          .rw-tag-gray { font-size:10px; color:rgba(255,255,255,0.35); background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); padding:3px 10px; border-radius:20px; }

          /* Skeleton shimmer */
          .rw-skeleton {
            background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.8s ease infinite;
            border-radius:8px;
          }
          @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        `}</style>
      </Head>

      <AppShell active="/riwayat" topbarTitle="Riwayat Analisis">

        <div style={{ maxWidth: 760, width: '100%', display:'flex', flexDirection:'column', gap:28 }}>

          {/* Page header */}
          <div className="nn-a0">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
              <div>
                <h1 style={{ fontFamily:'Instrument Serif, serif', fontSize:'clamp(1.8rem,4vw,2.5rem)', fontWeight:400, letterSpacing:-1, color:'rgba(255,255,255,0.92)', marginBottom:8 }}>
                  Riwayat Analisis
                </h1>
                <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>
                  Semua sesi rekomendasi karier yang pernah Anda jalankan.
                </p>
              </div>
              <Link href="/rekomendasi" className="nn-btn">
                <span className="material-symbols-outlined mi">add</span>
                Analisis Baru
              </Link>
            </div>
          </div>

          {/* Stats row */}
          <div className="nn-a1" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[
              { label:'Total Sesi',   value:'0', icon:'analytics'  },
              { label:'Lowongan Dianalisis', value:'0', icon:'work'       },
              { label:'Kategori Dieksplorasi', value:'0', icon:'category' },
            ].map((s,i) => (
              <div key={i} style={{ background:'rgba(7,24,48,0.6)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'20px 22px', backdropFilter:'blur(8px)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:16, color:'rgba(255,255,255,0.3)' }}>{s.icon}</span>
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{s.label}</span>
                </div>
                <div style={{ fontFamily:'Instrument Serif, serif', fontSize:36, color:'rgba(255,255,255,0.88)', letterSpacing:-2, lineHeight:1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Timeline or empty state */}
          {isEmpty ? (
            <div className="nn-a2">
              {/* Empty hero */}
              <div className="rw-empty-hero">
                <div style={{ width:64, height:64, borderRadius:18, background:'rgba(255,153,51,0.08)', border:'1px solid rgba(255,153,51,0.15)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', zIndex:1 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:28, color:'hsl(35,100%,60%)' }}>history</span>
                </div>
                <div style={{ position:'relative', zIndex:1 }}>
                  <h2 style={{ fontFamily:'Instrument Serif, serif', fontSize:22, color:'rgba(255,255,255,0.88)', marginBottom:10, letterSpacing:-0.5 }}>
                    Belum ada riwayat
                  </h2>
                  <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)', lineHeight:1.7, maxWidth:380 }}>
                    Jalankan rekomendasi pertamamu dan hasil analisis karier akan tersimpan secara otomatis di sini.
                  </p>
                </div>
                <Link href="/rekomendasi" className="nn-btn" style={{ position:'relative', zIndex:1 }}>
                  Mulai Rekomendasi Pertama
                  <span className="material-symbols-outlined mi">arrow_forward</span>
                </Link>
              </div>

              {/* Skeleton preview — shows what it'll look like */}
              <div style={{ marginTop:32 }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.12em', color:'rgba(255,255,255,0.2)', marginBottom:20 }}>
                  Pratinjau tampilan riwayat
                </div>
                <div className="rw-timeline">
                  {[
                    { active:true,  label:'Analisis Karier Teknis', time:'Beberapa saat lagi', tags:['Software Engineer','Data Analyst','Web Developer'] },
                    { active:false, label:'Sesi Eksplorasi Kreatif', time:'—', tags:['UI/UX Designer','Content Writer'] },
                  ].map((item, i) => (
                    <div key={i} className="rw-timeline-item" style={{ opacity: i===0 ? 0.55 : 0.25 }}>
                      <div className="rw-tl-left">
                        <div className={`rw-tl-dot${item.active ? ' active' : ''}`} />
                        {i < 1 && <div className="rw-tl-line" />}
                      </div>
                      <div className="rw-card">
                        <div className="rw-card-header">
                          <div className="rw-card-title">{item.label}</div>
                          <div className="rw-card-time">{item.time}</div>
                        </div>
                        <div className="rw-card-desc">Hasil rekomendasi mencakup kecocokan lowongan, analisis skill gap, dan roadmap belajar 7 hari.</div>
                        <div className="rw-card-tags">
                          {item.tags.map(t => <span key={t} className="rw-tag">{t}</span>)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rw-timeline nn-a2">
              {HISTORY_ITEMS.map((item, i) => (
                <div key={i} className="rw-timeline-item">
                  <div className="rw-tl-left">
                    <div className={`rw-tl-dot${i === 0 ? ' active' : ''}`} />
                    {i < HISTORY_ITEMS.length - 1 && <div className="rw-tl-line" />}
                  </div>
                  <div className="rw-card">
                    <div className="rw-card-header">
                      <div className="rw-card-title">{item.title}</div>
                      <div className="rw-card-time">{item.time}</div>
                    </div>
                    <div className="rw-card-desc">{item.desc}</div>
                    <div className="rw-card-tags">
                      {item.tags?.map(t => <span key={t} className="rw-tag">{t}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </AppShell>
    </>
  )
}
