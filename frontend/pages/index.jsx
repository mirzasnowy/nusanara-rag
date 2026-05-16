import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const flowDetails = [
  { icon: 'pen-tool', title: 'Input Narasi', text: 'Pengguna menuliskan profil dan tujuan karier secara naratif. Sistem NLP kami memproses teks natural tanpa memerlukan format terstruktur.' },
  { icon: 'search', title: 'Pencarian Hybrid', text: 'Konversi narasi ke vektor 768 dimensi menggunakan nomic-embed-text. Pencarian digabung menggunakan Reciprocal Rank Fusion (RRF) dari metode semantik dan kata kunci.' },
  { icon: 'zap', title: 'Re-Ranking Heuristik', text: 'Kandidat lowongan difilter ulang melalui algoritma penilaian skill dan pengalaman untuk meningkatkan akurasi dari Top-10 menjadi Top-3 yang paling presisi.' },
  { icon: 'fingerprint', title: 'Sintesis LLM', text: 'Top-3 lowongan menjadi konteks bagi Llama 3.1 lokal. LLM dilimitasi (faithfulness constraint) agar menyusun analisis murni berdasarkan data nyata.' },
  { icon: 'target', title: 'Streaming SSE', text: 'Rekomendasi final, mencakup skill gap dan roadmap belajar 7 hari, dirender secara real-time ke antarmuka pengguna tanpa waktu tunggu blokir.' },
]

const flowNodes = [
  { icon: 'pen-tool', label: 'Input Narasi' },
  { icon: 'search', label: 'Hybrid Search' },
  { icon: 'zap', label: 'Re-Ranking' },
  { icon: 'fingerprint', label: 'LLM Synthesis' },
  { icon: 'target', label: 'Real-Time' },
]

const careerCards = [
  { icon: 'monitor', title: 'Teknologi & Software', desc: 'Software Engineer, Web Developer, IT Support, Data Engineer.' },
  { icon: 'bar-chart-2', title: 'Analisis Data', desc: 'Data Analyst, BI Analyst, Data Scientist, Machine Learning.' },
  { icon: 'palette', title: 'Desain & Kreatif', desc: 'UI/UX Designer, Graphic Designer, Content Writer, Video Editor.' },
  { icon: 'megaphone', title: 'Pemasaran Digital', desc: 'Digital Marketing, SEO Specialist, Social Media Admin.' },
  { icon: 'briefcase', title: 'Bisnis & Admin', desc: 'Project Manager, Business Development, Administrasi.' },
  { icon: 'headphones', title: 'Sales & CS', desc: 'Sales Executive, Customer Service, Call Center, Telesales.' },
  { icon: 'pie-chart', title: 'Finance & Akunting', desc: 'Accounting Staff, Finance Analyst, Auditor, Pajak.' },
  { icon: 'book-open', title: 'Edukasi & Training', desc: 'Guru, Tutor, Trainer, Instruktur, Dosen.' },
]

function Icon({ name, className = '', style }) {
  return <i data-lucide={name} className={className} style={style} />
}

export default function IndexPage() {
  const [activeNode, setActiveNode] = useState(0)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/lucide@latest'
    script.onload = () => window.lucide?.createIcons()
    document.body.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  useEffect(() => {
    window.lucide?.createIcons()
  }, [activeNode])

  const detail = flowDetails[activeNode]

  return (
    <>
      <Head>
        <title>NusaNara - Temukan Jalur Kariermu</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.tailwind = window.tailwind || {};
              window.tailwind.config = {
                theme: {
                  extend: {
                    colors: {
                      background: 'hsl(var(--background))',
                      foreground: 'hsl(var(--foreground))',
                      muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
                      primary: 'hsl(var(--primary))',
                      border: 'hsl(var(--border))'
                    }
                  }
                }
              };
            `,
          }}
        />
        <script src="https://cdn.tailwindcss.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          :root {
            --background: 201 100% 13%;
            --foreground: 0 0% 100%;
            --muted-foreground: 240 4% 66%;
            --primary: 35 100% 60%;
            --muted: 0 0% 10%;
            --border: 0 0% 18%;
          }

          html { scroll-behavior: smooth; }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Inter', sans-serif;
            background: hsl(201, 100%, 13%);
            color: #fff;
            overflow-x: hidden;
          }

          .font-serif { font-family: 'Instrument Serif', serif; }

          .liquid-glass {
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            position: relative;
            overflow: hidden;
            box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
          }

          .liquid-glass::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            padding: 1px;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1) 100%);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
          }

          @keyframes fade-rise {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .a0 { animation: fade-rise .8s ease-out both; }
          .a1 { animation: fade-rise .8s ease-out .2s both; }
          .a2 { animation: fade-rise .8s ease-out .4s both; }

          .flow-node {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 16px;
            padding: 24px 20px;
            cursor: pointer;
            transition: all .3s ease;
            position: relative;
          }

          .flow-node:hover,
          .flow-node.active {
            background: rgba(255, 185, 85, 0.1);
            border-color: rgba(255, 185, 85, 0.4);
            transform: translateY(-4px);
            box-shadow: 0 8px 32px rgba(255, 185, 85, 0.15);
          }

          .flow-node.node-active {
            background: linear-gradient(135deg, rgba(255, 176, 103, 0.08) 0%, rgba(255, 176, 103, 0.01) 100%);
            border-color: rgba(255, 176, 103, 0.3);
            box-shadow: 0 0 30px rgba(255, 176, 103, 0.08);
          }

          .flow-node.node-active .icon-container {
            border-color: rgba(255, 176, 103, 0.4);
            background: rgba(255, 176, 103, 0.1);
          }

          .flow-node.node-active .icon-container i {
            color: hsl(35,100%,60%);
          }

          .glass-panel {
            background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 100%);
            backdrop-filter: blur(32px);
            -webkit-backdrop-filter: blur(32px);
            border-top: 1px solid rgba(255,255,255,0.08);
            border-left: 1px solid rgba(255,255,255,0.08);
            border-right: 1px solid rgba(255,255,255,0.02);
            border-bottom: 1px solid rgba(255,255,255,0.02);
            box-shadow: 0 20px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
          }

          .glass-card {
            background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%);
            border: 1px solid rgba(255,255,255,0.05);
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            border-radius: 20px;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .glass-card:hover {
            background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
            border-color: rgba(255, 176, 103, 0.25);
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(255, 176, 103, 0.05), 0 0 20px rgba(255, 176, 103, 0.03);
          }

          .gradient-text {
            background: linear-gradient(135deg, #ffffff 0%, #9ca3af 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .divider-glow {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,176,103,0.3), transparent);
          }

          @keyframes flow-right {
            0% { transform: translateX(-100%); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateX(300%); opacity: 0; }
          }

          @keyframes flow-down {
            0% { transform: translateY(-100%); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(300%); opacity: 0; }
          }

          @media (max-width: 767px) {
            .home-cta { flex-direction: column; gap: 18px; }
            .home-footer { align-items: flex-start; }
          }
        `}</style>
      </Head>

      <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            zIndex: 0,
            pointerEvents: 'none',
            display: 'block',
          }}
        >
          <source
            src="https://res.cloudinary.com/dzyfjpnjg/video/upload/f_auto,q_auto/v1777643453/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31_jn7oid_d8ba54.mp4"
            type="video/mp4"
          />
        </video>

      <div className="min-h-screen flex flex-col">

        <nav style={{ position: 'relative', zIndex: 10 }} className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto w-full">
          <div className="font-serif text-3xl tracking-tight">NusaNara</div>
          <div className="hidden md:flex gap-8 items-center text-sm">
            <a href="#" className="text-white font-medium">Beranda</a>
            <a href="#karier" className="text-white/60 hover:text-white transition-colors">Karier</a>
            <a href="#panduan" className="text-white/60 hover:text-white transition-colors">Panduan</a>
          </div>
          <Link href="/auth" className="liquid-glass rounded-full px-6 py-2.5 text-sm text-white hover:scale-[1.03] transition-transform">
            Masuk
          </Link>
        </nav>

        <main style={{ position: 'relative', zIndex: 10, minHeight: '90vh' }} className="flex flex-col items-center justify-center text-center px-6 pb-24">
          <h1 className="font-serif a0" style={{ fontSize: 'clamp(3rem,8vw,6rem)', lineHeight: .95, letterSpacing: '-2px', maxWidth: 900, fontWeight: 400 }}>
            Temukan Jalur <br /><em className="not-italic" style={{ color: 'hsl(240,4%,66%)' }}>Kariermu.</em>
          </h1>
          <p className="a1 mt-8 text-lg max-w-xl leading-relaxed" style={{ color: 'hsl(240,4%,66%)' }}>
            Ceritakan kisahmu. NusaNara akan mencocokkannya dengan ratusan peluang karier nyata di Indonesia.
          </p>
          <div className="a2 home-cta flex items-center gap-6 mt-12">
            <Link href="/auth" className="liquid-glass rounded-full px-10 py-4 text-base text-white hover:scale-[1.03] transition-transform">
              Mulai Sekarang
            </Link>
            <a href="#cara-kerja" className="text-sm hover:underline underline-offset-4 transition-all" style={{ color: 'hsl(240,4%,66%)' }}>
              Lihat Cara Kerja
            </a>
          </div>
        </main>

        <section id="cara-kerja" className="relative z-10 py-32 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-[#020610]/50 backdrop-blur-[48px] z-[-1]" />
          <div className="divider-glow" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none z-[-1]" />

          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-20 flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6">
                <Icon name="cpu" className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-medium tracking-[0.15em] text-white/80 uppercase">Teknologi RAG</span>
              </div>
              <h2 className="font-serif text-4xl md:text-5xl gradient-text font-normal mb-4">Arsitektur Pencarian Cerdas</h2>
              <p className="text-white/50 text-sm max-w-xl mx-auto font-light leading-relaxed">
                Sistem memproses narasi Anda melalui serangkaian pipeline AI untuk menemukan kecocokan mutlak. <span className="text-white/80">Klik pada node untuk detail teknis.</span>
              </p>
            </div>

            <div className="relative w-full">
              <div className="hidden lg:block absolute top-[45px] left-[10%] right-[10%] h-[1px] bg-white/10 z-0 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-transparent via-primary to-transparent w-1/3 animate-[flow-right_3s_ease-in-out_infinite]" />
              </div>
              <div className="lg:hidden absolute top-[10%] bottom-[10%] left-[45px] w-[1px] bg-white/10 z-0 overflow-hidden">
                <div className="w-full bg-gradient-to-b from-transparent via-primary to-transparent h-1/3 animate-[flow-down_3s_ease-in-out_infinite]" />
              </div>

              <div className="flex flex-col lg:flex-row justify-between gap-4 relative z-10">
                {flowNodes.map((node, index) => (
                  <div
                    key={node.label}
                    className={`flow-node glass-card p-5 flex lg:flex-col items-center gap-4 flex-1 cursor-pointer group ${activeNode === index ? 'node-active' : ''}`}
                    onClick={() => setActiveNode(index)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setActiveNode(index)
                      }
                    }}
                  >
                    <div className="icon-container w-12 h-12 shrink-0 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 transition-all duration-300 shadow-inner group-hover:border-white/20">
                      <Icon name={node.icon} className="w-5 h-5 text-white/60 transition-colors duration-300 group-hover:text-white" />
                    </div>
                    <div className="text-left lg:text-center w-full">
                      <div className="text-[9px] text-primary/80 tracking-[0.15em] uppercase mb-1 font-semibold">Node {String(index + 1).padStart(2, '0')}</div>
                      <div className="font-serif text-xl text-white/90">{node.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div id="flow-detail" className="mt-8 glass-panel p-8 relative overflow-hidden rounded-2xl transition-all duration-500 transform origin-top">
                <div className="absolute -right-24 -top-24 w-64 h-64 bg-primary/10 blur-[50px] rounded-full pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
                  <div id="detail-icon-wrap" className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 shadow-lg">
                    <Icon name={detail.icon} className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 id="detail-title" className="font-serif text-2xl text-white/90 mb-2">{detail.title}</h3>
                    <p id="detail-text" className="text-white/50 text-sm leading-relaxed font-light">{detail.text}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="karier" className="relative z-10 py-32 px-6">
          <div className="absolute inset-0 bg-[#020610]/60 backdrop-blur-[32px] z-[-1]" />
          <div className="divider-glow" />

          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6">
                  <Icon name="database" className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-medium tracking-[0.15em] text-white/80 uppercase">Knowledge Base</span>
                </div>
                <h2 className="font-serif text-4xl md:text-5xl gradient-text font-normal leading-tight">8 Jalur Karier<br />yang Kami Kuasai.</h2>
              </div>
              <p className="text-white/50 text-sm max-w-sm font-light leading-relaxed pb-2">
                720 lowongan pekerjaan aktual dari Glints Indonesia telah dikumpulkan dan dikelompokkan secara otomatis menggunakan pemrosesan bahasa alami (NLP).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {careerCards.map((card) => (
                <div key={card.title} className="glass-card p-6 group flex flex-col h-full relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                    <Icon name={card.icon} className="w-32 h-32 text-white" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 mb-6 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
                    <Icon name={card.icon} className="w-4 h-4 text-white/70 group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="font-serif text-xl text-white/90 mb-2">{card.title}</h3>
                  <p className="text-xs text-white/40 font-light flex-grow leading-relaxed mb-6">{card.desc}</p>
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                    <span className="text-[9px] text-white/30 uppercase tracking-widest">Kapasitas</span>
                    <span className="text-xs font-medium text-primary">90 Lowongan</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/auth" className="liquid-glass rounded-full px-8 py-3 text-sm text-white hover:scale-[1.03] transition-transform inline-block shadow-lg">
                Jelajahi Karier &rarr;
              </Link>
            </div>
          </div>
        </section>

        <section id="panduan" className="relative z-10 py-32 px-6">
          <div className="absolute inset-0 bg-[#020610]/70 backdrop-blur-[48px] z-[-1]" />
          <div className="divider-glow" />

          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6">
                <Icon name="shield-check" className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-medium tracking-[0.15em] text-white/80 uppercase">Kepercayaan</span>
              </div>
              <h2 className="font-serif text-4xl md:text-5xl gradient-text font-normal leading-tight mb-6">Akurasi di Atas<br />Asumsi.</h2>
              <p className="text-white/50 text-sm font-light leading-relaxed mb-8">
                NusaNara menghilangkan tebakan dalam merencanakan karier. Kami menggunakan data asli dari ekosistem kerja Indonesia, dipadukan dengan kecerdasan buatan untuk hasil yang objektif.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                  <Icon name="lock" className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-1">Privasi Mutlak</div>
                    <div className="text-xs text-white/40 font-light">Data narasi Anda aman dan tidak pernah dijual ke pihak ketiga.</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                  <Icon name="check-circle-2" className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-1">Bebas Halusinasi AI</div>
                    <div className="text-xs text-white/40 font-light">Rekomendasi dijamin berasal dari database lokal, bukan karangan AI.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent blur-[60px] -z-10 rounded-full" />
              <div className="glass-panel p-8 rounded-[32px]">
                <h3 className="font-serif text-2xl text-white/90 mb-8 border-b border-white/10 pb-4">Mulai dalam 3 Langkah</h3>

                <div className="space-y-8">
                  <div className="flex gap-6 relative">
                    <div className="absolute left-4 top-10 bottom-[-30px] w-[1px] bg-white/10" />
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 text-primary font-serif text-sm relative z-10">1</div>
                    <div>
                      <div className="text-base text-white/90 mb-1 font-medium">Autentikasi Aman</div>
                      <div className="text-xs text-white/50 font-light leading-relaxed">Masuk menggunakan Google Account. Tanpa biaya, tanpa form rumit.</div>
                    </div>
                  </div>

                  <div className="flex gap-6 relative">
                    <div className="absolute left-4 top-10 bottom-[-30px] w-[1px] bg-white/10" />
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/20 flex items-center justify-center shrink-0 text-white/70 font-serif text-sm relative z-10">2</div>
                    <div>
                      <div className="text-base text-white/90 mb-1 font-medium">Tuliskan Ceritamu</div>
                      <div className="text-xs text-white/50 font-light leading-relaxed mb-3">Tidak perlu CV formal. Ceritakan saja skill, pendidikan, dan mimpimu.</div>
                      <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-[11px] italic text-white/40 font-light">
                        &quot;Lulusan S1 Sistem Informasi, bisa SQL. Ingin kerja di bidang data...&quot;
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-6 relative">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/20 flex items-center justify-center shrink-0 text-white/70 font-serif text-sm relative z-10">3</div>
                    <div>
                      <div className="text-base text-white/90 mb-1 font-medium">Terima Analisis AI</div>
                      <div className="text-xs text-white/50 font-light leading-relaxed">Dapatkan kecocokan lowongan, analisis gap, dan roadmap belajar seketika.</div>
                    </div>
                  </div>
                </div>

                <Link href="/auth" className="mt-10 w-full py-3.5 bg-white text-black hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  Mulai Konsultasi Gratis
                  <Icon name="arrow-right" className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="relative z-10 bg-[#010308] border-t border-white/5 pt-16 pb-8 px-6">
          <div className="home-footer max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-700 flex items-center justify-center">
                <Icon name="compass" className="w-4 h-4 text-white" />
              </div>
              <div className="font-serif text-xl text-white/90">NusaNara</div>
            </div>

            <div className="flex gap-8 text-[11px] uppercase tracking-widest text-white/40 font-medium">
              <a href="#cara-kerja" className="hover:text-primary transition-colors">Cara Kerja</a>
              <a href="#karier" className="hover:text-primary transition-colors">Knowledge Base</a>
              <a href="#panduan" className="hover:text-primary transition-colors">Panduan</a>
            </div>

            <div className="text-[11px] text-white/30 font-light">
              &copy; 2026 NusaNara. UI/UX Prototype.
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
