import sys

with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

# find index of <!-- STATS SECTION -->
start_idx = -1
for i, line in enumerate(lines):
    if "<!-- STATS SECTION -->" in line:
        start_idx = i
        break

if start_idx == -1:
    print("Could not find STATS SECTION")
    sys.exit(1)

# keep everything before STATS SECTION
new_lines = lines[:start_idx]

# Our new Dribbble standard UI to append
new_ui = """
    <!-- CUSTOM CSS UNTUK DRIBBLE UI (HANYA BERLAKU DI BAWAH HERO) -->
    <style>
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
    .gradient-text-primary {
        background: linear-gradient(135deg, hsl(35,100%,70%) 0%, hsl(35,100%,50%) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
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

    .node-active {
        background: linear-gradient(135deg, rgba(255, 176, 103, 0.08) 0%, rgba(255, 176, 103, 0.01) 100%);
        border-color: rgba(255, 176, 103, 0.3);
        box-shadow: 0 0 30px rgba(255, 176, 103, 0.08);
    }
    .node-active .icon-container {
        border-color: rgba(255, 176, 103, 0.4);
        background: rgba(255, 176, 103, 0.1);
    }
    .node-active .icon-container i {
        color: hsl(35,100%,60%);
    }

    .divider-glow {
        position: absolute;
        top: 0; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,176,103,0.3), transparent);
    }
    </style>

    <!-- STATS SECTION -->
    <section class="relative z-20 -mt-12 px-6 max-w-5xl mx-auto pointer-events-none">
    <div class="glass-panel rounded-2xl p-6 md:p-10 grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-white/10 pointer-events-auto">
        <div class="text-center px-4">
        <div class="font-serif text-4xl gradient-text-primary mb-1">720</div>
        <div class="text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium">Lowongan</div>
        </div>
        <div class="text-center px-4">
        <div class="font-serif text-4xl gradient-text-primary mb-1">8</div>
        <div class="text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium">Klaster Karier</div>
        </div>
        <div class="text-center px-4">
        <div class="font-serif text-4xl gradient-text-primary mb-1">0.84</div>
        <div class="text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium">Skor MRR</div>
        </div>
        <div class="text-center px-4">
        <div class="font-serif text-4xl text-white/90 mb-1">Gratis</div>
        <div class="text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium">Akses Penuh</div>
        </div>
    </div>
    </section>

    <!-- HOW IT WORKS (REACT FLOW STYLE) -->
    <section id="cara-kerja" class="relative z-10 py-32 px-6 overflow-hidden">
    <!-- Subtle blurred background that lets the video show through -->
    <div class="absolute inset-0 bg-[#020610]/50 backdrop-blur-[48px] z-[-1]"></div>
    <div class="divider-glow"></div>
    
    <!-- Aurora Gradients -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none z-[-1]"></div>

    <div class="max-w-5xl mx-auto">
        <div class="text-center mb-20 flex flex-col items-center">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6">
            <i data-lucide="cpu" class="w-3.5 h-3.5 text-primary"></i>
            <span class="text-[10px] font-medium tracking-[0.15em] text-white/80 uppercase">Teknologi RAG</span>
        </div>
        <h2 class="font-serif text-4xl md:text-5xl gradient-text font-normal mb-4">Arsitektur Pencarian Cerdas</h2>
        <p class="text-white/50 text-sm max-w-xl mx-auto font-light leading-relaxed">Sistem memproses narasi Anda melalui serangkaian pipeline AI untuk menemukan kecocokan mutlak. <span class="text-white/80">Klik pada node untuk detail teknis.</span></p>
        </div>

        <!-- Custom React Flow / Node Graph Component -->
        <div class="relative w-full">
        <!-- Horizontal Animated Edge (Desktop) -->
        <div class="hidden lg:block absolute top-[45px] left-[10%] right-[10%] h-[1px] bg-white/10 z-0 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-transparent via-primary to-transparent w-1/3 animate-[flow-right_3s_ease-in-out_infinite]"></div>
        </div>
        
        <!-- Vertical Animated Edge (Mobile) -->
        <div class="lg:hidden absolute top-[10%] bottom-[10%] left-[45px] w-[1px] bg-white/10 z-0 overflow-hidden">
            <div class="w-full bg-gradient-to-b from-transparent via-primary to-transparent h-1/3 animate-[flow-down_3s_ease-in-out_infinite]"></div>
        </div>

        <div class="flex flex-col lg:flex-row justify-between gap-4 relative z-10">
            
            <!-- Nodes -->
            <div class="flow-node glass-card p-5 flex lg:flex-col items-center gap-4 flex-1 cursor-pointer group" onclick="showDetail(0)" id="node0">
                <div class="icon-container w-12 h-12 shrink-0 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 transition-all duration-300 shadow-inner group-hover:border-white/20">
                    <i data-lucide="pen-tool" class="w-5 h-5 text-white/60 transition-colors duration-300 group-hover:text-white"></i>
                </div>
                <div class="text-left lg:text-center w-full">
                    <div class="text-[9px] text-primary/80 tracking-[0.15em] uppercase mb-1 font-semibold">Node 01</div>
                    <div class="font-serif text-xl text-white/90">Input Narasi</div>
                </div>
            </div>

            <div class="flow-node glass-card p-5 flex lg:flex-col items-center gap-4 flex-1 cursor-pointer group" onclick="showDetail(1)" id="node1">
                <div class="icon-container w-12 h-12 shrink-0 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 transition-all duration-300 shadow-inner group-hover:border-white/20">
                    <i data-lucide="search" class="w-5 h-5 text-white/60 transition-colors duration-300 group-hover:text-white"></i>
                </div>
                <div class="text-left lg:text-center w-full">
                    <div class="text-[9px] text-primary/80 tracking-[0.15em] uppercase mb-1 font-semibold">Node 02</div>
                    <div class="font-serif text-xl text-white/90">Hybrid Search</div>
                </div>
            </div>

            <div class="flow-node glass-card p-5 flex lg:flex-col items-center gap-4 flex-1 cursor-pointer group" onclick="showDetail(2)" id="node2">
                <div class="icon-container w-12 h-12 shrink-0 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 transition-all duration-300 shadow-inner group-hover:border-white/20">
                    <i data-lucide="zap" class="w-5 h-5 text-white/60 transition-colors duration-300 group-hover:text-white"></i>
                </div>
                <div class="text-left lg:text-center w-full">
                    <div class="text-[9px] text-primary/80 tracking-[0.15em] uppercase mb-1 font-semibold">Node 03</div>
                    <div class="font-serif text-xl text-white/90">Re-Ranking</div>
                </div>
            </div>

            <div class="flow-node glass-card p-5 flex lg:flex-col items-center gap-4 flex-1 cursor-pointer group" onclick="showDetail(3)" id="node3">
                <div class="icon-container w-12 h-12 shrink-0 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 transition-all duration-300 shadow-inner group-hover:border-white/20">
                    <i data-lucide="fingerprint" class="w-5 h-5 text-white/60 transition-colors duration-300 group-hover:text-white"></i>
                </div>
                <div class="text-left lg:text-center w-full">
                    <div class="text-[9px] text-primary/80 tracking-[0.15em] uppercase mb-1 font-semibold">Node 04</div>
                    <div class="font-serif text-xl text-white/90">LLM Synthesis</div>
                </div>
            </div>

            <div class="flow-node glass-card p-5 flex lg:flex-col items-center gap-4 flex-1 cursor-pointer group" onclick="showDetail(4)" id="node4">
                <div class="icon-container w-12 h-12 shrink-0 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 transition-all duration-300 shadow-inner group-hover:border-white/20">
                    <i data-lucide="target" class="w-5 h-5 text-white/60 transition-colors duration-300 group-hover:text-white"></i>
                </div>
                <div class="text-left lg:text-center w-full">
                    <div class="text-[9px] text-primary/80 tracking-[0.15em] uppercase mb-1 font-semibold">Node 05</div>
                    <div class="font-serif text-xl text-white/90">Real-Time</div>
                </div>
            </div>

        </div>

        <!-- Interactive Detail Panel -->
        <div id="flow-detail" class="mt-8 glass-panel p-8 relative overflow-hidden rounded-2xl transition-all duration-500 transform origin-top">
            <div class="absolute -right-24 -top-24 w-64 h-64 bg-primary/10 blur-[50px] rounded-full pointer-events-none"></div>
            
            <div class="relative z-10 flex flex-col md:flex-row gap-6 items-start">
                <div id="detail-icon-wrap" class="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 shadow-lg">
                    <!-- Icon injected by JS -->
                </div>
                <div>
                    <h3 id="detail-title" class="font-serif text-2xl text-white/90 mb-2">Memuat...</h3>
                    <p id="detail-text" class="text-white/50 text-sm leading-relaxed font-light">Mohon tunggu sebentar.</p>
                </div>
            </div>
        </div>

        </div>
    </div>
    </section>

    <!-- KARIER (Knowledge Base) -->
    <section id="karier" class="relative z-10 py-32 px-6">
    <div class="absolute inset-0 bg-[#020610]/60 backdrop-blur-[32px] z-[-1]"></div>
    <div class="divider-glow"></div>
    
    <div class="max-w-6xl mx-auto">
        <div class="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
        <div>
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6">
            <i data-lucide="database" class="w-3.5 h-3.5 text-primary"></i>
            <span class="text-[10px] font-medium tracking-[0.15em] text-white/80 uppercase">Knowledge Base</span>
            </div>
            <h2 class="font-serif text-4xl md:text-5xl gradient-text font-normal leading-tight">8 Jalur Karier<br>yang Kami Kuasai.</h2>
        </div>
        <p class="text-white/50 text-sm max-w-sm font-light leading-relaxed pb-2">Ratusan data pekerjaan aktual di Indonesia, diekstraksi dan dikelompokkan menggunakan pemrosesan bahasa alami.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <!-- Card Template -->
        <div class="glass-card p-6 group flex flex-col h-full relative overflow-hidden">
            <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
            <i data-lucide="monitor" class="w-32 h-32 text-white"></i>
            </div>
            <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 mb-6 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
            <i data-lucide="monitor" class="w-4 h-4 text-white/70 group-hover:text-primary transition-colors"></i>
            </div>
            <h3 class="font-serif text-xl text-white/90 mb-2">Teknologi & Software</h3>
            <p class="text-xs text-white/40 font-light flex-grow leading-relaxed mb-6">Software Engineer, Web Developer, IT Support, Data Engineer.</p>
            <div class="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
            <span class="text-[9px] text-white/30 uppercase tracking-widest">Kapasitas</span>
            <span class="text-xs font-medium text-primary">90 Lowongan</span>
            </div>
        </div>
        
        <div class="glass-card p-6 group flex flex-col h-full relative overflow-hidden">
            <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
            <i data-lucide="bar-chart-2" class="w-32 h-32 text-white"></i>
            </div>
            <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 mb-6 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
            <i data-lucide="bar-chart-2" class="w-4 h-4 text-white/70 group-hover:text-primary transition-colors"></i>
            </div>
            <h3 class="font-serif text-xl text-white/90 mb-2">Analisis Data</h3>
            <p class="text-xs text-white/40 font-light flex-grow leading-relaxed mb-6">Data Analyst, BI Analyst, Data Scientist, Machine Learning.</p>
            <div class="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
            <span class="text-[9px] text-white/30 uppercase tracking-widest">Kapasitas</span>
            <span class="text-xs font-medium text-primary">90 Lowongan</span>
            </div>
        </div>

        <div class="glass-card p-6 group flex flex-col h-full relative overflow-hidden">
            <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
            <i data-lucide="palette" class="w-32 h-32 text-white"></i>
            </div>
            <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 mb-6 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
            <i data-lucide="palette" class="w-4 h-4 text-white/70 group-hover:text-primary transition-colors"></i>
            </div>
            <h3 class="font-serif text-xl text-white/90 mb-2">Desain & Kreatif</h3>
            <p class="text-xs text-white/40 font-light flex-grow leading-relaxed mb-6">UI/UX Designer, Graphic Designer, Content Writer, Video Editor.</p>
            <div class="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
            <span class="text-[9px] text-white/30 uppercase tracking-widest">Kapasitas</span>
            <span class="text-xs font-medium text-primary">90 Lowongan</span>
            </div>
        </div>

        <div class="glass-card p-6 group flex flex-col h-full relative overflow-hidden">
            <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
            <i data-lucide="megaphone" class="w-32 h-32 text-white"></i>
            </div>
            <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 mb-6 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
            <i data-lucide="megaphone" class="w-4 h-4 text-white/70 group-hover:text-primary transition-colors"></i>
            </div>
            <h3 class="font-serif text-xl text-white/90 mb-2">Pemasaran Digital</h3>
            <p class="text-xs text-white/40 font-light flex-grow leading-relaxed mb-6">Digital Marketing, SEO Specialist, Social Media Admin.</p>
            <div class="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
            <span class="text-[9px] text-white/30 uppercase tracking-widest">Kapasitas</span>
            <span class="text-xs font-medium text-primary">90 Lowongan</span>
            </div>
        </div>

        <div class="glass-card p-6 group flex flex-col h-full relative overflow-hidden">
            <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
            <i data-lucide="briefcase" class="w-32 h-32 text-white"></i>
            </div>
            <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 mb-6 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
            <i data-lucide="briefcase" class="w-4 h-4 text-white/70 group-hover:text-primary transition-colors"></i>
            </div>
            <h3 class="font-serif text-xl text-white/90 mb-2">Bisnis & Admin</h3>
            <p class="text-xs text-white/40 font-light flex-grow leading-relaxed mb-6">Project Manager, Business Development, Administrasi.</p>
            <div class="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
            <span class="text-[9px] text-white/30 uppercase tracking-widest">Kapasitas</span>
            <span class="text-xs font-medium text-primary">90 Lowongan</span>
            </div>
        </div>

        <div class="glass-card p-6 group flex flex-col h-full relative overflow-hidden">
            <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
            <i data-lucide="headphones" class="w-32 h-32 text-white"></i>
            </div>
            <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 mb-6 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
            <i data-lucide="headphones" class="w-4 h-4 text-white/70 group-hover:text-primary transition-colors"></i>
            </div>
            <h3 class="font-serif text-xl text-white/90 mb-2">Sales & CS</h3>
            <p class="text-xs text-white/40 font-light flex-grow leading-relaxed mb-6">Sales Executive, Customer Service, Call Center, Telesales.</p>
            <div class="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
            <span class="text-[9px] text-white/30 uppercase tracking-widest">Kapasitas</span>
            <span class="text-xs font-medium text-primary">90 Lowongan</span>
            </div>
        </div>

        <div class="glass-card p-6 group flex flex-col h-full relative overflow-hidden">
            <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
            <i data-lucide="pie-chart" class="w-32 h-32 text-white"></i>
            </div>
            <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 mb-6 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
            <i data-lucide="pie-chart" class="w-4 h-4 text-white/70 group-hover:text-primary transition-colors"></i>
            </div>
            <h3 class="font-serif text-xl text-white/90 mb-2">Finance & Akunting</h3>
            <p class="text-xs text-white/40 font-light flex-grow leading-relaxed mb-6">Accounting Staff, Finance Analyst, Auditor, Pajak.</p>
            <div class="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
            <span class="text-[9px] text-white/30 uppercase tracking-widest">Kapasitas</span>
            <span class="text-xs font-medium text-primary">90 Lowongan</span>
            </div>
        </div>

        <div class="glass-card p-6 group flex flex-col h-full relative overflow-hidden">
            <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
            <i data-lucide="book-open" class="w-32 h-32 text-white"></i>
            </div>
            <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 mb-6 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
            <i data-lucide="book-open" class="w-4 h-4 text-white/70 group-hover:text-primary transition-colors"></i>
            </div>
            <h3 class="font-serif text-xl text-white/90 mb-2">Edukasi & Training</h3>
            <p class="text-xs text-white/40 font-light flex-grow leading-relaxed mb-6">Guru, Tutor, Trainer, Instruktur, Dosen.</p>
            <div class="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
            <span class="text-[9px] text-white/30 uppercase tracking-widest">Kapasitas</span>
            <span class="text-xs font-medium text-primary">90 Lowongan</span>
            </div>
        </div>
        </div>
        
        <div class="text-center mt-12">
        <a href="auth.html" class="liquid-glass rounded-full px-8 py-3 text-sm text-white hover:scale-[1.03] transition-transform inline-block shadow-lg">Jelajahi Karier →</a>
        </div>
    </div>
    </section>

    <!-- TENTANG & PANDUAN (COMBINED EDITORIAL SECTION) -->
    <section id="panduan" class="relative z-10 py-32 px-6">
    <div class="absolute inset-0 bg-[#020610]/70 backdrop-blur-[48px] z-[-1]"></div>
    <div class="divider-glow"></div>

    <div class="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <!-- Kolom Kiri: Tentang -->
        <div>
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6">
            <i data-lucide="shield-check" class="w-3.5 h-3.5 text-primary"></i>
            <span class="text-[10px] font-medium tracking-[0.15em] text-white/80 uppercase">Kepercayaan</span>
        </div>
        <h2 class="font-serif text-4xl md:text-5xl gradient-text font-normal leading-tight mb-6">Akurasi di Atas<br>Asumsi.</h2>
        <p class="text-white/50 text-sm font-light leading-relaxed mb-8">
            NusaNara menghilangkan tebakan dalam merencanakan karier. Kami menggunakan data asli dari ekosistem kerja Indonesia, dipadukan dengan kecerdasan buatan untuk hasil yang objektif.
        </p>
        
        <div class="space-y-4">
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                <i data-lucide="lock" class="w-5 h-5 text-primary mt-0.5"></i>
                <div>
                    <div class="text-sm font-medium text-white/90 mb-1">Privasi Mutlak</div>
                    <div class="text-xs text-white/40 font-light">Data narasi Anda aman dan tidak pernah dijual ke pihak ketiga.</div>
                </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                <i data-lucide="check-circle-2" class="w-5 h-5 text-primary mt-0.5"></i>
                <div>
                    <div class="text-sm font-medium text-white/90 mb-1">Bebas Halusinasi AI</div>
                    <div class="text-xs text-white/40 font-light">Rekomendasi dijamin berasal dari database lokal, bukan karangan AI.</div>
                </div>
            </div>
        </div>
        </div>

        <!-- Kolom Kanan: Panduan 3 Langkah -->
        <div class="relative">
        <!-- Dekorasi background untuk kolom kanan -->
        <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent blur-[60px] -z-10 rounded-full"></div>
        
        <div class="glass-panel p-8 rounded-[32px]">
            <h3 class="font-serif text-2xl text-white/90 mb-8 border-b border-white/10 pb-4">Mulai dalam 3 Langkah</h3>
            
            <div class="space-y-8">
                <div class="flex gap-6 relative">
                    <!-- Garis konektor -->
                    <div class="absolute left-4 top-10 bottom-[-30px] w-[1px] bg-white/10"></div>
                    
                    <div class="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 text-primary font-serif text-sm relative z-10">1</div>
                    <div>
                    <div class="text-base text-white/90 mb-1 font-medium">Autentikasi Aman</div>
                    <div class="text-xs text-white/50 font-light leading-relaxed">Masuk menggunakan Google Account. Tanpa biaya, tanpa form rumit.</div>
                    </div>
                </div>
                
                <div class="flex gap-6 relative">
                    <div class="absolute left-4 top-10 bottom-[-30px] w-[1px] bg-white/10"></div>
                    
                    <div class="w-8 h-8 rounded-full bg-white/5 border border-white/20 flex items-center justify-center shrink-0 text-white/70 font-serif text-sm relative z-10">2</div>
                    <div>
                    <div class="text-base text-white/90 mb-1 font-medium">Tuliskan Ceritamu</div>
                    <div class="text-xs text-white/50 font-light leading-relaxed mb-3">Tidak perlu CV formal. Ceritakan saja skill, pendidikan, dan mimpimu.</div>
                    <div class="p-3 rounded-xl bg-black/20 border border-white/5 text-[11px] italic text-white/40 font-light">
                        "Lulusan S1 Sistem Informasi, bisa SQL. Ingin kerja di bidang data..."
                    </div>
                    </div>
                </div>
                
                <div class="flex gap-6 relative">
                    <div class="w-8 h-8 rounded-full bg-white/5 border border-white/20 flex items-center justify-center shrink-0 text-white/70 font-serif text-sm relative z-10">3</div>
                    <div>
                    <div class="text-base text-white/90 mb-1 font-medium">Terima Analisis AI</div>
                    <div class="text-xs text-white/50 font-light leading-relaxed">Dapatkan kecocokan lowongan, analisis gap, dan roadmap belajar seketika.</div>
                    </div>
                </div>
            </div>
            
            <a href="auth.html" class="mt-10 w-full py-3.5 bg-white text-black hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                Mulai Konsultasi Gratis
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </a>
        </div>
        </div>
    </div>
    </section>

    <!-- FOOTER -->
    <footer class="relative z-10 bg-[#010308] border-t border-white/5 pt-16 pb-8 px-6">
    <div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-700 flex items-center justify-center">
            <i data-lucide="compass" class="w-4 h-4 text-white"></i>
        </div>
        <div class="font-serif text-xl text-white/90">NusaNara</div>
        </div>
        
        <div class="flex gap-8 text-[11px] uppercase tracking-widest text-white/40 font-medium">
        <a href="#cara-kerja" class="hover:text-primary transition-colors">Cara Kerja</a>
        <a href="#karier" class="hover:text-primary transition-colors">Knowledge Base</a>
        <a href="#panduan" class="hover:text-primary transition-colors">Panduan</a>
        </div>
        
        <div class="text-[11px] text-white/30 font-light">
        © 2026 NusaNara. UI/UX Prototype.
        </div>
    </div>
    </footer>

    <!-- SCRIPTS -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <script>
    // Initialize minimal sleek icons
    lucide.createIcons();

    // Data for React Flow style interactive component
    const details = [
        { icon: 'pen-tool', title: 'Input Narasi', text: 'Pengguna menuliskan profil dan tujuan karier secara naratif. Sistem NLP kami memproses teks natural tanpa memerlukan format terstruktur.' },
        { icon: 'search', title: 'Pencarian Hybrid', text: 'Konversi narasi ke vektor 768 dimensi menggunakan nomic-embed-text. Pencarian digabung menggunakan Reciprocal Rank Fusion (RRF) dari metode semantik dan kata kunci.' },
        { icon: 'zap', title: 'Re-Ranking Heuristik', text: 'Kandidat lowongan difilter ulang melalui algoritma penilaian skill dan pengalaman untuk meningkatkan akurasi dari Top-10 menjadi Top-3 yang paling presisi.' },
        { icon: 'fingerprint', title: 'Sintesis LLM', text: 'Top-3 lowongan menjadi konteks bagi Llama 3.1 lokal. LLM dilimitasi (faithfulness constraint) agar menyusun analisis murni berdasarkan data nyata.' },
        { icon: 'target', title: 'Streaming SSE', text: 'Rekomendasi final, mencakup skill gap dan roadmap belajar 7 hari, dirender secara real-time ke antarmuka pengguna tanpa waktu tunggu blokir.' },
    ];

    function showDetail(index) {
        // 1. Reset all nodes
        document.querySelectorAll('.flow-node').forEach((node, i) => {
        if(i === index) {
            node.classList.add('node-active');
            node.classList.remove('border-white/10', 'bg-white/5');
        } else {
            node.classList.remove('node-active');
            node.classList.add('border-white/10', 'bg-white/5');
        }
        });

        const d = details[index];
        const panel = document.getElementById('flow-detail');
        
        // 2. Animate out
        panel.style.opacity = '0';
        panel.style.transform = 'scale(0.98)';
        
        setTimeout(() => {
        // 3. Swap content
        document.getElementById('detail-title').textContent = d.title;
        document.getElementById('detail-text').textContent = d.text;
        
        const iconWrap = document.getElementById('detail-icon-wrap');
        iconWrap.innerHTML = `<i data-lucide="${d.icon}" class="w-8 h-8 text-primary"></i>`;
        lucide.createIcons();

        // 4. Animate in
        panel.style.opacity = '1';
        panel.style.transform = 'scale(1)';
        }, 250);
    }

    // Initialize first node
    showDetail(0);
    </script>
</body>
</html>
"""

new_lines.append(new_ui)

with open("index.html", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
print("Updated successfully")
