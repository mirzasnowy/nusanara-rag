import Head from 'next/head'
import { useState } from 'react'
import AppShell from '../components/AppShell'

const AVATAR_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuASWbYZQ3YBCgqY2_JHCdONborxOnZWXQ8Vx-Ygx5FzCVYPMgitwmaiZ-Yeqp6XkQHAupwrQTgcxv8xzVRPyJ7E0D7Q4m0cdzg8n0NZSfRQ2fNicfT3BdBMiwmOep91_gdBh4CmY4Q4gmK2zRuKxYiaXpnEtYC-ax8beOSBvhiiVsPNovO-EffecRz-BdikecfIfG74v6ShRf4Kdr2ntP5L32-FsLZrc-xbwVaxik3kCZcs5-w2tYvW8wr3k4Y7Fkz1hlTYWrb-UwcY'

const SKILLS = ['Python', 'SQL', 'Data Analysis', 'Microsoft Excel', 'Komunikasi', 'Manajemen Tim']
const INTEREST_OPTIONS = ['Teknologi & Software','Analisis Data','Desain & Kreatif','Pemasaran Digital','Bisnis & Admin','Finance & Akunting','Edukasi & Training','Sales & CS']

export default function ProfilPage() {
  const [activeTab, setActiveTab] = useState('profil')
  const [savedMsg, setSavedMsg] = useState(false)
  const [interests, setInterests] = useState(['Analisis Data', 'Teknologi & Software'])

  function toggleInterest(item) {
    setInterests(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item])
  }

  function handleSave() {
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2500)
  }

  const TABS = [
    { id:'profil',    label:'Profil',    icon:'person'          },
    { id:'karier',    label:'Minat Karier', icon:'work'         },
    { id:'akun',      label:'Akun',      icon:'manage_accounts' },
  ]

  return (
    <>
      <Head>
        <title>Profil — NusaNara</title>
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          .pf-avatar-ring {
            width:96px; height:96px; border-radius:50%;
            border: 2px solid rgba(255,153,51,0.35);
            padding:3px; flex-shrink:0;
          }
          .pf-avatar-img {
            width:100%; height:100%; border-radius:50%;
            object-fit:cover;
          }

          .pf-tabs { display:flex; gap:4px; background:rgba(255,255,255,0.04); border-radius:14px; padding:5px; border:1px solid rgba(255,255,255,0.06); width:fit-content; }
          .pf-tab {
            display:flex; align-items:center; gap:7px;
            padding:9px 18px; border-radius:10px; border:none;
            font-size:13px; font-weight:500; font-family:'Inter',sans-serif;
            cursor:pointer; transition:all .25s; white-space:nowrap;
          }
          .pf-tab.active { background:rgba(255,255,255,0.09); color:rgba(255,255,255,0.92); }
          .pf-tab.inactive { background:transparent; color:rgba(255,255,255,0.35); }
          .pf-tab.inactive:hover { color:rgba(255,255,255,0.65); }

          .pf-section { background:rgba(7,24,48,0.6); border:1px solid rgba(255,255,255,0.07); border-radius:18px; padding:28px 32px; backdrop-filter:blur(12px); }
          .pf-section-title { font-size:10px; text-transform:uppercase; letter-spacing:0.13em; color:rgba(255,255,255,0.3); margin-bottom:24px; display:flex; align-items:center; gap:8px; }
          .pf-section-title::after { content:''; flex:1; height:1px; background:rgba(255,255,255,0.05); }

          .pf-field { display:flex; flex-direction:column; gap:8px; }
          .pf-label { font-size:10px; font-weight:500; letter-spacing:0.06em; color:rgba(255,255,255,0.5); text-transform:uppercase; }
          .pf-input {
            background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);
            color:rgba(255,255,255,0.88); border-radius:12px;
            padding:13px 16px; font-size:14px; font-family:'Inter',sans-serif;
            outline:none; transition:all .25s;
          }
          .pf-input::placeholder { color:rgba(255,255,255,0.2); }
          .pf-input:focus { background:rgba(255,255,255,0.07); border-color:rgba(255,255,255,0.18); box-shadow:0 0 0 3px rgba(255,255,255,0.04); }
          .pf-textarea { resize:vertical; min-height:110px; line-height:1.75; }

          .pf-skill-tag {
            display:inline-flex; align-items:center; gap:6px;
            padding:6px 14px; border-radius:20px;
            background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
            font-size:12px; color:rgba(255,255,255,0.65); transition:all .2s; cursor:default;
          }

          .pf-interest-btn {
            padding:8px 16px; border-radius:20px; border:none; cursor:pointer;
            font-size:12px; font-family:'Inter',sans-serif; transition:all .25s; font-weight:500;
          }
          .pf-interest-btn.selected { background:rgba(255,153,51,0.12); color:hsl(35,100%,60%); border:1px solid rgba(255,153,51,0.25); }
          .pf-interest-btn.unselected { background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.4); border:1px solid rgba(255,255,255,0.07); }
          .pf-interest-btn.unselected:hover { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.7); }

          .pf-danger-zone { background:rgba(40,8,8,0.5); border:1px solid rgba(255,80,80,0.15); border-radius:18px; padding:28px 32px; }

          .pf-save-btn {
            display:inline-flex; align-items:center; gap:8px;
            background:hsl(35,100%,60%); color:#04111E;
            padding:13px 28px; border-radius:11px; border:none; cursor:pointer;
            font-size:14px; font-weight:600; font-family:'Inter',sans-serif;
            transition:all .3s cubic-bezier(0.16,1,0.3,1);
          }
          .pf-save-btn:hover { transform:translateY(-2px); box-shadow:0 12px 30px rgba(255,153,51,0.28); filter:brightness(1.05); }
          .pf-save-btn.saved { background:rgba(60,180,100,0.85); color:#fff; }

          .pf-delete-btn {
            display:inline-flex; align-items:center; gap:8px;
            background:rgba(255,60,60,0.1); color:rgba(255,120,120,0.85);
            padding:12px 24px; border-radius:11px;
            border:1px solid rgba(255,60,60,0.2); cursor:pointer;
            font-size:13px; font-weight:500; font-family:'Inter',sans-serif;
            transition:all .25s;
          }
          .pf-delete-btn:hover { background:rgba(255,60,60,0.18); border-color:rgba(255,60,60,0.35); color:rgba(255,140,140,1); }

          @keyframes pf-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
          .pf-panel { animation:pf-in .3s ease both; }

          .pf-progress-bar { height:4px; border-radius:4px; background:linear-gradient(90deg, hsl(35,100%,60%), hsl(35,100%,72%)); transition:width .4s ease; }
        `}</style>
      </Head>

      <AppShell active="/profil" topbarTitle="Profil Saya">
        <div style={{ maxWidth:740, width:'100%', display:'flex', flexDirection:'column', gap:28 }}>

          {/* ── PROFILE CARD ── */}
          <div className="nn-a0" style={{ background:'linear-gradient(135deg,rgba(7,30,56,0.9) 0%,rgba(4,17,30,0.95) 100%)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:'36px 40px', position:'relative', overflow:'hidden', backdropFilter:'blur(12px)' }}>
            {/* glow */}
            <div style={{ position:'absolute', top:-60, right:-40, width:320, height:320, background:'radial-gradient(circle,rgba(255,153,51,0.11) 0%,transparent 65%)', pointerEvents:'none' }} />
            <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', gap:28, flexWrap:'wrap' }}>
              <div className="pf-avatar-ring">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={AVATAR_URL} alt="Avatar" className="pf-avatar-img" />
              </div>
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                  <h2 style={{ fontFamily:'Instrument Serif,serif', fontSize:'clamp(1.6rem,3vw,2.2rem)', fontWeight:400, color:'rgba(255,255,255,0.92)', letterSpacing:-0.8 }}>
                    Budi Santoso
                  </h2>
                  <span style={{ fontSize:9, color:'hsl(35,100%,60%)', background:'rgba(255,153,51,0.1)', border:'1px solid rgba(255,153,51,0.2)', padding:'3px 9px', borderRadius:20, textTransform:'uppercase', letterSpacing:'0.1em' }}>
                    Career Explorer
                  </span>
                </div>
                <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:16 }}>mahasiswa@unsika.ac.id</p>
                <div style={{ display:'flex', gap:24 }}>
                  {[{ label:'Sesi', val:'0'},{ label:'Lowongan Dilihat', val:'0'},{ label:'Karier Dieksplorasi', val:'0'}].map((s,i) => (
                    <div key={i}>
                      <div style={{ fontFamily:'Instrument Serif,serif', fontSize:22, color:'rgba(255,255,255,0.9)', letterSpacing:-1, lineHeight:1 }}>{s.val}</div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, alignSelf:'flex-start' }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginBottom:4 }}>Kelengkapan Profil</div>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:120, height:4, borderRadius:4, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                    <div className="pf-progress-bar" style={{ width:'40%' }} />
                  </div>
                  <span style={{ fontSize:12, color:'hsl(35,100%,60%)', fontWeight:600 }}>40%</span>
                </div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>Lengkapi untuk hasil lebih akurat</div>
              </div>
            </div>
          </div>

          {/* ── TABS ── */}
          <div className="nn-a1">
            <div className="pf-tabs">
              {TABS.map(t => (
                <button key={t.id} className={`pf-tab${activeTab===t.id?' active':' inactive'}`} onClick={() => setActiveTab(t.id)}>
                  <span className="material-symbols-outlined" style={{ fontSize:16 }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── TAB: PROFIL ── */}
          {activeTab === 'profil' && (
            <div className="pf-panel nn-a2" style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div className="pf-section">
                <div className="pf-section-title">
                  <span className="material-symbols-outlined" style={{ fontSize:14 }}>badge</span>
                  Informasi Dasar
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  <div className="pf-field">
                    <label className="pf-label">Nama Lengkap</label>
                    <input type="text" className="pf-input" defaultValue="Budi Santoso" />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Nama Panggilan</label>
                    <input type="text" className="pf-input" defaultValue="Budi" />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Universitas</label>
                    <input type="text" className="pf-input" defaultValue="Universitas Singaperbangsa Karawang" />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Program Studi</label>
                    <input type="text" className="pf-input" defaultValue="Sistem Informasi" />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Semester</label>
                    <input type="text" className="pf-input" defaultValue="6" />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">IPK (opsional)</label>
                    <input type="text" className="pf-input" placeholder="Contoh: 3.72" />
                  </div>
                </div>
              </div>

              <div className="pf-section">
                <div className="pf-section-title">
                  <span className="material-symbols-outlined" style={{ fontSize:14 }}>description</span>
                  Narasi Singkat
                </div>
                <div className="pf-field">
                  <label className="pf-label">Ceritakan dirimu</label>
                  <textarea className="pf-input pf-textarea" placeholder="Tuliskan ringkasan pengalaman, skill, dan aspirasi karier Anda..." defaultValue="Mahasiswa Sistem Informasi semester 6 yang tertarik di bidang data dan teknologi. Memiliki pengalaman sebagai ketua divisi IT dalam organisasi kampus." />
                </div>
              </div>

              <div className="pf-section">
                <div className="pf-section-title">
                  <span className="material-symbols-outlined" style={{ fontSize:14 }}>build</span>
                  Skill Utama
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                  {SKILLS.map(s => (
                    <span key={s} className="pf-skill-tag">
                      {s}
                      <span className="material-symbols-outlined" style={{ fontSize:12, cursor:'pointer', opacity:.5 }}>close</span>
                    </span>
                  ))}
                </div>
                <input type="text" className="pf-input" placeholder="Tambah skill baru (tekan Enter)..." />
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button className={`pf-save-btn${savedMsg?' saved':''}`} onClick={handleSave}>
                  <span className="material-symbols-outlined" style={{ fontSize:17 }}>{savedMsg ? 'check' : 'save'}</span>
                  {savedMsg ? 'Tersimpan!' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          )}

          {/* ── TAB: MINAT KARIER ── */}
          {activeTab === 'karier' && (
            <div className="pf-panel nn-a2" style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div className="pf-section">
                <div className="pf-section-title">
                  <span className="material-symbols-outlined" style={{ fontSize:14 }}>favorite</span>
                  Bidang yang Diminati
                </div>
                <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:20, lineHeight:1.7 }}>
                  Pilih bidang karier yang paling sesuai dengan minat Anda. Informasi ini membantu AI memberikan rekomendasi yang lebih personal.
                </p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {INTEREST_OPTIONS.map(item => (
                    <button key={item}
                      className={`pf-interest-btn${interests.includes(item) ? ' selected' : ' unselected'}`}
                      onClick={() => toggleInterest(item)}>
                      {interests.includes(item) && <span style={{ marginRight:4 }}>✓</span>}
                      {item}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop:20, padding:'14px 16px', background:'rgba(255,153,51,0.06)', border:'1px solid rgba(255,153,51,0.12)', borderRadius:12, fontSize:12, color:'rgba(255,255,255,0.4)' }}>
                  <span style={{ color:'hsl(35,100%,60%)' }}>💡</span>
                  {' '}Memilih 2–4 bidang menghasilkan rekomendasi yang paling tepat sasaran.
                </div>
              </div>

              <div className="pf-section">
                <div className="pf-section-title">
                  <span className="material-symbols-outlined" style={{ fontSize:14 }}>location_on</span>
                  Preferensi Lokasi
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="pf-field">
                    <label className="pf-label">Lokasi Preferensi</label>
                    <input type="text" className="pf-input" placeholder="Contoh: Jakarta, Bandung" />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Mode Kerja</label>
                    <select className="pf-input" style={{ appearance:'none', cursor:'pointer' }}>
                      <option value="">Pilih mode kerja</option>
                      <option>Remote</option>
                      <option>Onsite</option>
                      <option>Hybrid</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button className={`pf-save-btn${savedMsg?' saved':''}`} onClick={handleSave}>
                  <span className="material-symbols-outlined" style={{ fontSize:17 }}>{savedMsg ? 'check' : 'save'}</span>
                  {savedMsg ? 'Tersimpan!' : 'Simpan Preferensi'}
                </button>
              </div>
            </div>
          )}

          {/* ── TAB: AKUN ── */}
          {activeTab === 'akun' && (
            <div className="pf-panel nn-a2" style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div className="pf-section">
                <div className="pf-section-title">
                  <span className="material-symbols-outlined" style={{ fontSize:14 }}>email</span>
                  Informasi Akun
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div className="pf-field">
                    <label className="pf-label">Email Akademik</label>
                    <input type="email" className="pf-input" defaultValue="mahasiswa@unsika.ac.id" />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Kata Sandi Baru</label>
                    <input type="password" className="pf-input" placeholder="Kosongkan jika tidak ingin mengubah" />
                  </div>
                  <div className="pf-field">
                    <label className="pf-label">Konfirmasi Kata Sandi</label>
                    <input type="password" className="pf-input" placeholder="Ulangi kata sandi baru" />
                  </div>
                </div>
              </div>

              <div className="pf-section">
                <div className="pf-section-title">
                  <span className="material-symbols-outlined" style={{ fontSize:14 }}>notifications</span>
                  Notifikasi
                </div>
                {[
                  { label:'Rekomendasi Karier Baru', desc:'Notifikasi saat ada lowongan baru yang cocok dengan profilmu', on:true },
                  { label:'Tips & Panduan', desc:'Artikel dan panduan pengembangan karier', on:false },
                  { label:'Pembaruan Sistem', desc:'Informasi fitur baru NusaNara', on:true },
                ].map((n,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom: i<2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div>
                      <div style={{ fontSize:13, color:'rgba(255,255,255,0.8)', fontWeight:500, marginBottom:3 }}>{n.label}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>{n.desc}</div>
                    </div>
                    <div style={{ width:40, height:22, borderRadius:11, background: n.on ? 'rgba(255,153,51,0.8)' : 'rgba(255,255,255,0.1)', position:'relative', cursor:'pointer', flexShrink:0, transition:'background .25s' }}>
                      <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left: n.on ? 'calc(100% - 19px)' : 3, transition:'left .25s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button className={`pf-save-btn${savedMsg?' saved':''}`} onClick={handleSave}>
                  <span className="material-symbols-outlined" style={{ fontSize:17 }}>{savedMsg ? 'check' : 'save'}</span>
                  {savedMsg ? 'Tersimpan!' : 'Simpan Pengaturan'}
                </button>
              </div>

              {/* Danger Zone */}
              <div className="pf-danger-zone">
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.13em', color:'rgba(255,100,100,0.6)', marginBottom:16 }}>⚠ Zona Berbahaya</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
                  <div>
                    <div style={{ fontSize:14, color:'rgba(255,255,255,0.75)', fontWeight:500, marginBottom:4 }}>Hapus Akun</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', lineHeight:1.65 }}>
                      Aksi ini bersifat permanen dan tidak dapat dibatalkan.
                    </div>
                  </div>
                  <button className="pf-delete-btn">
                    <span className="material-symbols-outlined" style={{ fontSize:16 }}>delete_forever</span>
                    Hapus Akun
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </AppShell>
    </>
  )
}
