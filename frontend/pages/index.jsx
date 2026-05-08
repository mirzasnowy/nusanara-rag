import Head from 'next/head'
import Link from 'next/link'
import { useEffect } from 'react'

export default function IndexPage() {
  useEffect(() => {
    // ── Smooth scroll for anchor links ──
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href').slice(1)
        const el = document.getElementById(id)
        if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
      })
    })

    // ── IntersectionObserver scroll-reveal ──
    const revealEls = document.querySelectorAll('.reveal')
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('revealed')
          io.unobserve(en.target)
        }
      })
    }, { threshold: 0.12 })
    revealEls.forEach(el => io.observe(el))

    // ── Flow node interaction ──
    const details = [
      { icon: 'pen-tool', title: 'Input Narasi', text: 'Pengguna menuliskan profil dan tujuan karier secara naratif. Sistem NLP kami memproses teks natural tanpa memerlukan format terstruktur.' },
      { icon: 'search', title: 'Pencarian Hybrid', text: 'Konversi narasi ke vektor 768 dimensi menggunakan nomic-embed-text. Pencarian digabung menggunakan Reciprocal Rank Fusion (RRF) dari metode semantik dan kata kunci.' },
      { icon: 'zap', title: 'Re-Ranking Heuristik', text: 'Kandidat lowongan difilter ulang melalui algoritma penilaian skill dan pengalaman untuk meningkatkan akurasi dari Top-10 menjadi Top-3 yang paling presisi.' },
      { icon: 'fingerprint', title: 'Sintesis LLM', text: 'Top-3 lowongan menjadi konteks bagi Llama 3.1 lokal. LLM dilimitasi (faithfulness constraint) agar menyusun analisis murni berdasarkan data nyata.' },
      { icon: 'target', title: 'Streaming SSE', text: 'Rekomendasi final, mencakup skill gap dan roadmap belajar 7 hari, dirender secara real-time ke antarmuka pengguna tanpa waktu tunggu blokir.' },
    ]

    function showDetail(index) {
      document.querySelectorAll('.flow-node').forEach((node, i) => {
        node.classList.toggle('node-active', i === index)
      })
      const d = details[index]
      const panel = document.getElementById('flow-detail')
      panel.style.opacity = '0'
      panel.style.transform = 'translateY(8px)'
      setTimeout(() => {
        document.getElementById('detail-title').textContent = d.title
        document.getElementById('detail-text').textContent = d.text
        const iw = document.getElementById('detail-icon-wrap')
        iw.innerHTML = `<i data-lucide="${d.icon}" style="width:28px;height:28px;color:hsl(35,100%,60%)"></i>`
        if (window.lucide) window.lucide.createIcons()
        panel.style.opacity = '1'
        panel.style.transform = 'translateY(0)'
      }, 220)
    }

    window.showDetail = showDetail

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/lucide@latest'
    script.onload = () => { window.lucide.createIcons(); showDetail(0) }
    document.body.appendChild(script)

    return () => { io.disconnect(); delete window.showDetail }
  }, [])

  return (
    <>
      <Head>
        <title>NusaNara — Temukan Jalur Kariermu</title>
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html { scroll-behavior: smooth; }
          body { background: #04111E; }

          /* ── Tokens ── */
          :root {
            --accent: hsl(35,100%,60%);
            --text: rgba(255,255,255,0.92);
            --muted: rgba(255,255,255,0.45);
            --faint: rgba(255,255,255,0.18);
            --border: rgba(255,255,255,0.08);
            --glass: rgba(255,255,255,0.04);
            --serif: 'Instrument Serif', serif;
            --sans: 'Inter', sans-serif;
          }

          /* ── Scroll reveal ── */
          .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.7s ease, transform 0.7s ease; }
          .reveal.revealed { opacity: 1; transform: translateY(0); }
          .reveal-delay-1 { transition-delay: 0.1s; }
          .reveal-delay-2 { transition-delay: 0.2s; }
          .reveal-delay-3 { transition-delay: 0.3s; }
          .reveal-delay-4 { transition-delay: 0.4s; }

          /* ── Hero anims ── */
          @keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
          .ha0 { animation: fadeUp .8s ease both .1s; }
          .ha1 { animation: fadeUp .8s ease both .3s; }
          .ha2 { animation: fadeUp .8s ease both .5s; }

          /* ── Liquid glass ── */
          .glass-btn {
            background: rgba(255,255,255,0.06);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.15);
            color: #fff; border-radius: 999px;
            padding: 12px 32px; font-size: 15px;
            cursor: pointer; font-family: var(--sans);
            transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
            text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
          }
          .glass-btn:hover {
            background: rgba(255,255,255,0.1);
            border-color: rgba(255,255,255,0.25);
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          }

          /* ── Section ── */
          .section-bg {
            background: rgba(2,8,18,0.55);
            backdrop-filter: blur(40px);
          }
          .section-divider {
            position: absolute; top: 0; left: 0; right: 0; height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          }

          /* ── Glass card ── */
          .g-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 20px;
            transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
          }
          .g-card:hover {
            background: rgba(255,255,255,0.055);
            border-color: rgba(255,153,51,0.25);
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(255,153,51,0.05);
          }

          /* ── Flow node ── */
          .flow-node {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 18px; padding: 22px 18px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
            flex: 1;
          }
          .flow-node:hover {
            background: rgba(255,153,51,0.08);
            border-color: rgba(255,153,51,0.3);
            transform: translateY(-3px);
          }
          .flow-node.node-active {
            background: rgba(255,153,51,0.1);
            border-color: rgba(255,153,51,0.35);
            box-shadow: 0 0 28px rgba(255,153,51,0.08);
          }

          /* ── Flow detail panel ── */
          #flow-detail {
            transition: opacity 0.25s ease, transform 0.25s ease;
            background: rgba(7,24,40,0.7);
            border: 1px solid rgba(255,255,255,0.08);
            backdrop-filter: blur(24px);
            border-radius: 20px; padding: 32px;
            margin-top: 24px;
            position: relative; overflow: hidden;
          }
          #flow-detail::before {
            content: ''; position: absolute;
            top: 0; right: 0; width: 200px; height: 200px;
            background: radial-gradient(circle, rgba(255,153,51,0.08) 0%, transparent 70%);
            pointer-events: none;
          }

          /* ── Gradient text ── */
          .grad-text {
            background: linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.55) 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          /* ── Noise bg ── */
          .noise {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          }
        `}</style>
      </Head>

      <div style={{ fontFamily: 'var(--sans)', background: '#04111E', color: '#fff', minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>

        {/* VIDEO BG */}
        <video autoPlay loop muted playsInline
          style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, pointerEvents: 'none' }}>
          <source src="https://res.cloudinary.com/dzyfjpnjg/video/upload/f_auto,q_auto/v1777643453/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31_jn7oid_d8ba54.mp4" type="video/mp4" />
        </video>
        {/* subtle dark overlay so text is readable */}
        <div style={{ position:'fixed', inset:0, background:'linear-gradient(to bottom, rgba(4,17,30,0.35) 0%, rgba(4,17,30,0.15) 50%, rgba(4,17,30,0.6) 100%)', zIndex:1, pointerEvents:'none' }} />

        {/* ── NAV ── */}
        <nav style={{ position:'relative', zIndex:10 }}
          className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto w-full">
          <div style={{ fontFamily:'var(--serif)', fontSize:28, letterSpacing:'-0.5px' }}>NusaNara</div>
          <div className="hidden md:flex gap-8 items-center" style={{ fontSize:14 }}>
            <a href="#" style={{ color:'#fff', fontWeight:500, textDecoration:'none' }}>Beranda</a>
            <a href="#karier" style={{ color:'var(--muted)', textDecoration:'none', transition:'color .2s' }}
              onMouseOver={e=>e.target.style.color='#fff'} onMouseOut={e=>e.target.style.color='var(--muted)'}>Karier</a>
            <a href="#panduan" style={{ color:'var(--muted)', textDecoration:'none', transition:'color .2s' }}
              onMouseOver={e=>e.target.style.color='#fff'} onMouseOut={e=>e.target.style.color='var(--muted)'}>Panduan</a>
          </div>
          <Link href="/auth" className="glass-btn" style={{ fontSize:14, padding:'10px 24px' }}>Masuk</Link>
        </nav>

        {/* ── HERO ── */}
        <section style={{ position:'relative', zIndex:10, minHeight:'92vh' }}
          className="flex flex-col items-center justify-center text-center px-6 pb-24">
          <h1 className="ha0" style={{ fontFamily:'var(--serif)', fontSize:'clamp(3rem,8vw,6rem)', lineHeight:.95, letterSpacing:'-2px', maxWidth:900, fontWeight:400 }}>
            Temukan Jalur <em style={{ color:'hsl(240,4%,66%)', fontStyle:'normal' }}>Kariermu.</em>
          </h1>
          <p className="ha1" style={{ marginTop:32, fontSize:18, maxWidth:520, lineHeight:1.7, color:'var(--muted)' }}>
            Ceritakan kisahmu. NusaNara akan mencocokkannya dengan ratusan peluang karier nyata di Indonesia.
          </p>
          <div className="ha2" style={{ display:'flex', alignItems:'center', gap:24, marginTop:48 }}>
            <Link href="/auth" className="glass-btn" style={{ fontSize:16, padding:'14px 40px', fontWeight:500 }}>Mulai Sekarang</Link>
            <a href="#cara-kerja" style={{ fontSize:14, color:'var(--muted)', textDecoration:'none', transition:'all .2s' }}
              onMouseOver={e=>e.target.style.color='#fff'} onMouseOut={e=>e.target.style.color='var(--muted)'}>
              Lihat Cara Kerja ↓
            </a>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="cara-kerja" style={{ position:'relative', zIndex:10, padding:'128px 24px', overflow:'hidden' }}
          className="section-bg">
          <div className="section-divider" />
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:300, background:'radial-gradient(ellipse, rgba(255,153,51,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />

          <div style={{ maxWidth:900, margin:'0 auto' }}>
            <div className="reveal" style={{ textAlign:'center', marginBottom:72 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', borderRadius:999, border:'1px solid var(--border)', background:'var(--glass)', marginBottom:20 }}>
                <i data-lucide="cpu" style={{ width:14, height:14, color:'var(--accent)' }}></i>
                <span style={{ fontSize:10, letterSpacing:'0.15em', color:'rgba(255,255,255,0.7)', textTransform:'uppercase' }}>Teknologi RAG</span>
              </div>
              <h2 className="grad-text" style={{ fontFamily:'var(--serif)', fontSize:'clamp(2rem,5vw,3.5rem)', fontWeight:400, marginBottom:16, letterSpacing:-1 }}>
                Arsitektur Pencarian Cerdas
              </h2>
              <p style={{ color:'var(--muted)', fontSize:14, maxWidth:540, margin:'0 auto', lineHeight:1.7 }}>
                Sistem memproses narasi Anda melalui serangkaian pipeline AI. <span style={{ color:'rgba(255,255,255,0.75)' }}>Klik pada node untuk detail teknis.</span>
              </p>
            </div>

            <div className="reveal" style={{ display:'flex', flexDirection:'row', gap:12, position:'relative', flexWrap:'wrap' }}>
              {/* animated connector */}
              <div style={{ position:'absolute', top:44, left:'8%', right:'8%', height:1, background:'rgba(255,255,255,0.06)', overflow:'hidden', zIndex:0 }}>
                <div style={{ height:'100%', background:'linear-gradient(90deg, transparent, var(--accent), transparent)', width:'33%', animation:'flowR 2.5s ease-in-out infinite' }} />
              </div>
              <style>{`@keyframes flowR{0%{transform:translateX(-150%)}100%{transform:translateX(450%)}}`}</style>

              {[
                { num:'01', icon:'pen-tool',    label:'Input Narasi' },
                { num:'02', icon:'search',      label:'Hybrid Search' },
                { num:'03', icon:'zap',         label:'Re-Ranking' },
                { num:'04', icon:'fingerprint', label:'LLM Synthesis' },
                { num:'05', icon:'target',      label:'Real-Time' },
              ].map((node, i) => (
                <div key={i} className="flow-node" style={{ zIndex:1 }} onClick={() => window.showDetail(i)}>
                  <div style={{ width:42, height:42, borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14, transition:'all .3s' }}>
                    <i data-lucide={node.icon} style={{ width:18, height:18, color:'rgba(255,255,255,0.5)' }}></i>
                  </div>
                  <div style={{ fontSize:9, color:'rgba(255,153,51,0.75)', letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:6, fontWeight:600 }}>Node {node.num}</div>
                  <div style={{ fontFamily:'var(--serif)', fontSize:17, color:'rgba(255,255,255,0.85)' }}>{node.label}</div>
                </div>
              ))}
            </div>

            <div id="flow-detail">
              <div style={{ display:'flex', gap:20, alignItems:'flex-start', position:'relative', zIndex:1 }}>
                <div id="detail-icon-wrap" style={{ width:56, height:56, borderRadius:16, background:'rgba(255,153,51,0.08)', border:'1px solid rgba(255,153,51,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }} />
                <div>
                  <div id="detail-title" style={{ fontFamily:'var(--serif)', fontSize:22, color:'rgba(255,255,255,0.9)', marginBottom:10, letterSpacing:-0.3 }} />
                  <div id="detail-text" style={{ fontSize:14, color:'var(--muted)', lineHeight:1.75 }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── KARIER ── */}
        <section id="karier" style={{ position:'relative', zIndex:10, padding:'128px 24px' }} className="section-bg">
          <div className="section-divider" />
          <div style={{ maxWidth:1100, margin:'0 auto' }}>
            <div className="reveal" style={{ display:'flex', flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end', marginBottom:60, gap:32, flexWrap:'wrap' }}>
              <div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', borderRadius:999, border:'1px solid var(--border)', background:'var(--glass)', marginBottom:20 }}>
                  <i data-lucide="database" style={{ width:14, height:14, color:'var(--accent)' }}></i>
                  <span style={{ fontSize:10, letterSpacing:'0.15em', color:'rgba(255,255,255,0.7)', textTransform:'uppercase' }}>Knowledge Base</span>
                </div>
                <h2 className="grad-text" style={{ fontFamily:'var(--serif)', fontSize:'clamp(2rem,5vw,3.5rem)', fontWeight:400, lineHeight:1.1, letterSpacing:-1 }}>
                  8 Jalur Karier<br />yang Kami Kuasai.
                </h2>
              </div>
              <p style={{ fontSize:14, color:'var(--muted)', maxWidth:320, lineHeight:1.75 }}>
                720 lowongan pekerjaan aktual dari Glints Indonesia, dikelompokkan otomatis menggunakan NLP.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon:'monitor',     title:'Teknologi & Software', desc:'Software Engineer, Web Developer, IT Support, Data Engineer.' },
                { icon:'bar-chart-2', title:'Analisis Data',        desc:'Data Analyst, BI Analyst, Data Scientist, Machine Learning.' },
                { icon:'palette',     title:'Desain & Kreatif',     desc:'UI/UX Designer, Graphic Designer, Content Writer, Video Editor.' },
                { icon:'megaphone',   title:'Pemasaran Digital',    desc:'Digital Marketing, SEO Specialist, Social Media Admin.' },
                { icon:'briefcase',   title:'Bisnis & Admin',       desc:'Project Manager, Business Development, Administrasi.' },
                { icon:'headphones',  title:'Sales & CS',           desc:'Sales Executive, Customer Service, Call Center, Telesales.' },
                { icon:'pie-chart',   title:'Finance & Akunting',   desc:'Accounting Staff, Finance Analyst, Auditor, Pajak.' },
                { icon:'book-open',   title:'Edukasi & Training',   desc:'Guru, Tutor, Trainer, Instruktur, Dosen.' },
              ].map((card, i) => (
                <div key={i} className={`g-card p-6 flex flex-col h-full reveal reveal-delay-${(i%4)+1}`}>
                  <div style={{ width:40, height:40, borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, transition:'all .3s' }}>
                    <i data-lucide={card.icon} style={{ width:16, height:16, color:'rgba(255,255,255,0.55)' }}></i>
                  </div>
                  <div style={{ fontFamily:'var(--serif)', fontSize:19, color:'rgba(255,255,255,0.88)', marginBottom:8 }}>{card.title}</div>
                  <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.65, flexGrow:1 }}>{card.desc}</div>
                  <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:9, color:'var(--faint)', textTransform:'uppercase', letterSpacing:'0.12em' }}>Kapasitas</span>
                    <span style={{ fontSize:12, color:'var(--accent)', fontWeight:500 }}>90 Lowongan</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="reveal" style={{ textAlign:'center', marginTop:48 }}>
              <Link href="/auth" className="glass-btn">Jelajahi Karier →</Link>
            </div>
          </div>
        </section>

        {/* ── PANDUAN ── */}
        <section id="panduan" style={{ position:'relative', zIndex:10, padding:'128px 24px' }} className="section-bg">
          <div className="section-divider" />
          <div style={{ maxWidth:960, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}
            className="reveal">
            {/* Left */}
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', borderRadius:999, border:'1px solid var(--border)', background:'var(--glass)', marginBottom:24 }}>
                <i data-lucide="shield-check" style={{ width:14, height:14, color:'var(--accent)' }}></i>
                <span style={{ fontSize:10, letterSpacing:'0.15em', color:'rgba(255,255,255,0.7)', textTransform:'uppercase' }}>Kepercayaan</span>
              </div>
              <h2 className="grad-text" style={{ fontFamily:'var(--serif)', fontSize:'clamp(2rem,4vw,3rem)', fontWeight:400, lineHeight:1.1, letterSpacing:-1, marginBottom:20 }}>
                Akurasi di Atas Asumsi.
              </h2>
              <p style={{ fontSize:14, color:'var(--muted)', lineHeight:1.8, marginBottom:32 }}>
                NusaNara menghilangkan tebakan dalam merencanakan karier. Kami menggunakan data asli dari ekosistem kerja Indonesia, dipadukan dengan kecerdasan buatan untuk hasil yang objektif.
              </p>
              {[
                { icon:'lock', title:'Privasi Mutlak', desc:'Data narasi Anda aman dan tidak pernah dijual ke pihak ketiga.' },
                { icon:'check-circle-2', title:'Bebas Halusinasi AI', desc:'Rekomendasi dijamin berasal dari database lokal, bukan karangan AI.' },
              ].map((f, i) => (
                <div key={i} style={{ display:'flex', gap:16, padding:16, borderRadius:16, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', marginBottom:12, transition:'border-color .2s' }}>
                  <i data-lucide={f.icon} style={{ width:18, height:18, color:'var(--accent)', marginTop:2, flexShrink:0 }}></i>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500, color:'rgba(255,255,255,0.88)', marginBottom:4 }}>{f.title}</div>
                    <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.6 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right */}
            <div style={{ position:'relative' }}>
              <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 0%, rgba(255,153,51,0.1) 0%, transparent 70%)', pointerEvents:'none', borderRadius:'50%', filter:'blur(40px)' }} />
              <div style={{ background:'rgba(7,24,40,0.7)', border:'1px solid var(--border)', backdropFilter:'blur(24px)', borderRadius:28, padding:36, position:'relative' }}>
                <h3 style={{ fontFamily:'var(--serif)', fontSize:22, color:'rgba(255,255,255,0.88)', marginBottom:28, paddingBottom:20, borderBottom:'1px solid rgba(255,255,255,0.08)' }}>Mulai dalam 3 Langkah</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
                  {[
                    { n:'1', title:'Autentikasi Aman', desc:'Masuk menggunakan Google Account. Tanpa biaya, tanpa form rumit.', accent:true },
                    { n:'2', title:'Tuliskan Ceritamu', desc:'Tidak perlu CV formal. Ceritakan saja skill, pendidikan, dan mimpimu.' },
                    { n:'3', title:'Terima Analisis AI', desc:'Dapatkan kecocokan lowongan, analisis gap, dan roadmap belajar seketika.' },
                  ].map((step, i) => (
                    <div key={i} style={{ display:'flex', gap:18, position:'relative' }}>
                      {i < 2 && <div style={{ position:'absolute', left:15, top:34, bottom:-28, width:1, background:'rgba(255,255,255,0.08)' }} />}
                      <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:'var(--serif)', fontSize:14, position:'relative', zIndex:1, background: step.accent ? 'rgba(255,153,51,0.15)' : 'rgba(255,255,255,0.04)', border: step.accent ? '1px solid rgba(255,153,51,0.35)' : '1px solid rgba(255,255,255,0.12)', color: step.accent ? 'var(--accent)' : 'rgba(255,255,255,0.6)' }}>
                        {step.n}
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:500, color:'rgba(255,255,255,0.88)', marginBottom:4 }}>{step.title}</div>
                        <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.65 }}>{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/auth" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', marginTop:32, padding:'14px', background:'#fff', color:'#04111E', borderRadius:12, fontSize:14, fontWeight:600, textDecoration:'none', transition:'all .2s' }}>
                  Mulai Konsultasi Gratis
                  <i data-lucide="arrow-right" style={{ width:16, height:16 }}></i>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ position:'relative', zIndex:10, background:'rgba(2,8,18,0.9)', borderTop:'1px solid rgba(255,255,255,0.05)', padding:'48px 24px' }}>
          <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg, var(--accent), hsl(25,100%,48%))', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <i data-lucide="compass" style={{ width:16, height:16, color:'#04111E' }}></i>
              </div>
              <span style={{ fontFamily:'var(--serif)', fontSize:20, color:'rgba(255,255,255,0.88)' }}>NusaNara</span>
            </div>
            <div style={{ display:'flex', gap:32, fontSize:11, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--faint)' }}>
              <a href="#cara-kerja" style={{ color:'inherit', textDecoration:'none', transition:'color .2s' }}>Cara Kerja</a>
              <a href="#karier" style={{ color:'inherit', textDecoration:'none', transition:'color .2s' }}>Knowledge Base</a>
              <a href="#panduan" style={{ color:'inherit', textDecoration:'none', transition:'color .2s' }}>Panduan</a>
            </div>
            <div style={{ fontSize:11, color:'var(--faint)' }}>© 2026 NusaNara. UI/UX Prototype.</div>
          </div>
        </footer>

      </div>
    </>
  )
}
