import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { Play, Menu, X, Crosshair, Map, Activity, Shield, ChevronRight, ChevronLeft, Target, Users, Zap, AlignLeft, Hexagon, Cpu } from 'lucide-react';

const LOGO_URL = "https://github.com/MEDELBOU3/Sunset-Forest/raw/main/game-project/assets/images/logo.png";
const BG_IMG = "https://github.com/MEDELBOU3/Sunset-Forest/blob/main/game-project/assets/images/Screenshot%202026-04-26%20200055.png?raw=true";

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative bg-sf-black text-white min-h-screen selection:bg-sf-orange selection:text-sf-black font-inter">
      <div className="noise-overlay" />
      
      {/* Header specific style: Orange with black elements overlay */}
      
      <div className="relative bg-[#FF5A00] text-sf-black clip-path-hero pb-32 z-10 w-full overflow-hidden">
        {/* Background Image Setup */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[#FF5A00] mix-blend-multiply z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#FF5A00] via-[#FF5A00]/80 to-transparent z-10"></div>
          <img src={BG_IMG} alt="Background" className="w-full h-full object-cover filter brightness-[0.4] contrast-200 grayscale" />
        </div>

        {/* Overlay Grid lines */}
        <div className="absolute inset-0 pointer-events-none opacity-20 z-0 hidden md:block">
          <div className="absolute top-0 bottom-0 left-12 w-px bg-sf-black"></div>
          <div className="absolute top-0 bottom-0 right-12 w-px bg-sf-black"></div>
        </div>

        {/* Side Accents */}
        <div className="absolute left-[-40px] top-1/3 -rotate-90 origin-left flex items-center gap-4 text-sf-black font-rajdhani font-bold tracking-widest uppercase text-xs z-20">
          <span className="w-12 h-1 bg-sf-black"></span>
          SYSTEM ONLINE +
        </div>
        
        {/* Social / Side icons */}
        <div className="absolute right-6 top-1/3 flex flex-col items-center gap-6 text-sf-black z-20">
          <div className="w-6 h-6 border-[3px] border-sf-black rounded-full flex justify-center items-center font-bold text-xs" title="Steam">S</div>
          <div className="w-6 h-6 border-[3px] border-sf-black flex justify-center items-center font-bold text-xs" title="Discord">D</div>
          <div className="w-6 h-6 flex flex-col justify-center items-center gap-0.5 mt-2" title="Twitter">
            <span className="w-6 h-[3px] bg-sf-black transform rotate-45 translate-y-1"></span>
            <span className="w-6 h-[3px] bg-sf-black transform -rotate-45 -translate-y-0.5"></span>
          </div>
          <div className="w-6 h-4 border-[3px] border-sf-black rounded-md mt-2" title="YouTube"></div>
        </div>

        <nav className="relative z-50 flex justify-between items-center px-6 md:px-24 py-8">
          <div className="flex items-center gap-6">
             <button className="lg:hidden text-sf-black" onClick={() => setMobileMenuOpen(true)}>
               <AlignLeft size={36} />
             </button>
             <div className="w-8 h-8 lg:hidden border-2 border-sf-black flex items-center justify-center font-bold pb-0.5">+</div>

             <div className="hidden lg:flex gap-8 font-rajdhani font-black text-sm tracking-widest uppercase">
               {['Home', 'About', 'Gameplay', 'World', 'Gallery', 'News', 'Contact'].map((item, idx) => (
                 <a key={idx} href={`#${item.toLowerCase()}`} className={`hover:opacity-60 transition-opacity ${idx === 0 ? 'bg-sf-black text-sf-orange px-6 py-2' : 'py-2'}`}>
                   {item}
                 </a>
               ))}
             </div>
          </div>
          
          <a href="https://MEDELBOU3.github.io/Sunset-Forest/game-project/" target="_blank" rel="noreferrer" className="hidden md:flex items-center gap-4 border-2 border-sf-black px-6 py-2 font-rajdhani font-bold uppercase tracking-widest hover:bg-sf-black hover:text-[#FF5A00] transition-colors bg-[#FF5A00]">
            + PLAY NOW +
          </a>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween" }}
              className="fixed inset-0 bg-[#FF5A00] z-[100] flex flex-col p-8 text-sf-black"
            >
              <div className="flex justify-between items-center mb-16 border-b-2 border-sf-black pb-4">
                <span className="font-orbitron font-black text-2xl tracking-widest">MENU _</span>
                <button onClick={() => setMobileMenuOpen(false)} className="border-2 border-sf-black p-1"><X size={32} /></button>
              </div>
              <div className="flex flex-col gap-8 font-rajdhani font-bold text-2xl tracking-widest uppercase">
                {['Home', 'About', 'Gameplay', 'World', 'Gallery', 'Contact'].map((item) => (
                  <a key={item} href={`#${item.toLowerCase()}`} className="border-b border-sf-black/20 pb-4" onClick={() => setMobileMenuOpen(false)}>{item}</a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-20 max-w-[90rem] mx-auto px-6 md:px-24 pt-16 flex flex-col lg:flex-row items-center lg:items-start gap-16 lg:gap-24">
          {/* Logo Area */}
          <div className="w-full lg:w-1/3 flex justify-center lg:justify-start">
             <img src={LOGO_URL} alt="Logo" className="w-[80%] max-w-[320px] object-contain filter brightness-0" />
          </div>

          {/* Text Area */}
          <div className="w-full lg:w-2/3 flex flex-col text-center lg:text-left">
             <h1 className="font-orbitron font-black uppercase text-6xl md:text-8xl lg:text-[7rem] leading-[0.85] tracking-tighter mb-8">
               SUNSET<br/>FOREST
             </h1>
             
             <p className="font-rajdhani font-black tracking-[0.3em] uppercase text-xl mb-10">
               Explore. Survive. Uncover.
             </p>
             
             <div className="hidden lg:block w-16 h-[3px] bg-sf-black mb-10 mx-auto lg:mx-0"></div>

             <div className="relative p-8 max-w-xl mx-auto lg:mx-0 text-sf-black mb-14">
                <div className="corner-tl border-sf-black"></div>
                <div className="corner-tr border-sf-black"></div>
                <div className="corner-bl border-sf-black"></div>
                <div className="corner-br border-sf-black"></div>
                <p className="font-inter font-medium text-lg leading-relaxed mix-blend-color-burn">
                  A mysterious forest hides ancient secrets.<br/>
                  Step into a world where nature and<br/>
                  technology collide.
                </p>
             </div>

             <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
               <a href="https://MEDELBOU3.github.io/Sunset-Forest/game-project/" target="_blank" rel="noreferrer" className="bg-sf-black text-[#FF5A00] font-rajdhani font-bold uppercase tracking-widest px-12 py-5 flex items-center justify-between sm:justify-center gap-12 group hover:gap-16 transition-all duration-300">
                 <span>PLAY NOW</span>
                 <span className="text-xl">+</span>
               </a>
               <button onClick={() => setVideoModalOpen(true)} className="border-[3px] border-sf-black font-rajdhani font-bold uppercase tracking-widest px-12 py-5 flex items-center justify-between sm:justify-center gap-12 hover:bg-sf-black hover:text-[#FF5A00] transition-colors group">
                 <span>WATCH TRAILER</span>
                 <Play size={18} fill="currentColor" strokeWidth={0} />
               </button>
             </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-24 right-8 lg:right-24 flex items-center gap-6 z-20 text-sf-black hidden md:flex">
          <div className="w-16 h-[2px] bg-sf-black"></div>
          <span className="font-rajdhani font-bold text-xs uppercase tracking-widest">// SCROLL TO EXPLORE</span>
        </div>
      </div>

      {/* Dark Sections */}
      <div className="relative bg-sf-black text-white pt-24 -mt-[80px] z-0 pb-32">
        
        {/* Story Section */}
        <section className="max-w-[90rem] mx-auto px-6 md:px-12 lg:px-24 py-20 relative border-l border-sf-orange/10 ml-6 md:ml-12 lg:ml-24">
           {/* Decorative Top Left Marker */}
           <div className="absolute top-0 left-0 w-24 h-[2px] bg-sf-orange"></div>
           <div className="absolute top-0 left-0 w-[2px] h-8 bg-sf-orange"></div>

           <div className="flex flex-col xl:flex-row gap-16 item-start">
             
             {/* Left Text */}
             <div className="w-full xl:w-5/12 relative pl-8 lg:pl-12">
               <div className="absolute left-[-60px] lg:left-[-72px] top-32 -rotate-90 origin-left text-sf-orange font-rajdhani text-[10px] tracking-[0.3em] uppercase flex items-center gap-4">
                 <span className="w-16 h-px bg-sf-orange"></span>
                 DATA LOG
               </div>
               
               <p className="text-sf-orange font-rajdhani font-bold tracking-[0.2em] uppercase text-sm mb-6">// THE STORY</p>
               
               <h2 className="font-orbitron font-normal text-4xl lg:text-[3.5rem] uppercase leading-tight mb-8">
                 BEYOND THE SUNSET,<br/> LIES THE <span className="text-sf-orange font-bold">UNKNOWN.</span>
               </h2>
               
               <p className="text-gray-400 font-inter leading-relaxed tracking-wide mb-12 text-lg max-w-md">
                 Long ago, the forest was a sanctuary. Now, darkness spreads, and ancient secrets awaken. The truth lies buried beneath the roots.
               </p>
               
               <a href="#" className="inline-flex items-center gap-6 text-sf-orange font-rajdhani font-bold tracking-widest uppercase pb-2 transition-colors border-b-2 border-sf-orange/30 hover:border-sf-orange group">
                 DISCOVER MORE <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
               </a>
             </div>

             {/* Right Graphic Frame */}
             <div className="w-full xl:w-7/12">
               <div className="relative border border-sf-orange/30 p-2 md:p-3 clip-path-cyber-frame bg-gradient-to-br from-sf-charcoal to-sf-black">
                 {/* Decorative outer lines */}
                 <div className="absolute -left-6 top-1/4 w-4 h-px bg-sf-orange"></div>
                 <div className="absolute -right-6 top-3/4 w-4 h-px bg-sf-orange"></div>
                 
                 {/* Internal decorative corners */}
                 <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-sf-orange"></div>
                 <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-sf-orange"></div>
                 <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-sf-orange"></div>
                 <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-sf-orange"></div>
                 
                 <div className="absolute top-3 right-8 text-sf-orange font-rajdhani text-xs tracking-widest uppercase">SYS <span className="mx-2">-</span> 01</div>

                 <div className="relative w-full aspect-[21/9] bg-sf-black overflow-hidden flex items-center justify-center mt-6 mb-2">
                    {/* Simulated sunset graphic from the reference image */}
                    <div className="absolute w-[80%] md:w-[60%] aspect-square bg-[#FF5A00] rounded-full bottom-0 translate-y-1/3 shadow-[0_0_120px_rgba(255,90,0,0.5)]"></div>
                    <img src={BG_IMG} className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-80 filter contrast-200 grayscale" alt="Forest" />
                    <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-sf-black to-transparent"></div>
                 </div>

                 {/* Barcodes and gauges */}
                 <div className="absolute bottom-6 left-8 flex flex-col gap-1">
                   <div className="flex gap-0.5 items-end">
                      {[12, 24, 16, 32, 12, 8, 28, 40, 10, 20, 15, 35, 10].map((h, i) => (
                        <div key={i} className="w-0.5 md:w-1 bg-sf-orange" style={{height: `${h}px`}}></div>
                      ))}
                   </div>
                   <div className="text-[6px] tracking-widest text-sf-orange font-mono">CF-192 / DATA / 0011-B12</div>
                 </div>

                 <div className="absolute bottom-6 right-8 flex gap-1.5 opacity-80">
                   {[1,2,3,4].map(i => <div key={i} className="w-8 h-[3px] bg-sf-orange skew-x-[-45deg]"></div>)}
                 </div>
                 
                 <div className="absolute bottom-4 right-2 text-sf-orange text-xs">+</div>
               </div>
             </div>
           </div>
        </section>

        {/* Features Section */}
        <section className="max-w-[90rem] mx-auto px-6 md:px-12 lg:px-24 py-16 relative">
          <div className="flex justify-between items-center mb-16">
             <div className="flex items-center gap-6 flex-1 border-b border-sf-gray/50 pb-4">
                <span className="text-sf-orange font-rajdhani font-bold tracking-[0.2em] uppercase text-sm block min-w-max">// FEATURES</span>
                <div className="flex-1 hidden md:block"></div>
                <div className="flex gap-3">
                  <button className="border border-sf-gray/50 p-2 hover:border-sf-orange hover:text-sf-orange transition-colors"><ChevronLeft size={16} strokeWidth={3} /></button>
                  <button className="border border-sf-gray/50 p-2 hover:border-sf-orange hover:text-sf-orange transition-colors"><ChevronRight size={16} strokeWidth={3} /></button>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { title: "EXPLORE", desc: "Vast mysterious world filled with secrets.", icon: <Target className="stroke-1 w-12 h-12" /> },
              { title: "COMBAT", desc: "Dynamic realistic combat against creatures.", icon: <Crosshair className="stroke-1 w-12 h-12" /> },
              { title: "DISCOVER", desc: "Uncover the truth behind the forest.", icon: <Activity className="stroke-1 w-12 h-12" /> },
              { title: "UPGRADE", desc: "Enhance your gear and abilities to survive.", icon: <Zap className="stroke-1 w-12 h-12" /> },
              { title: "PROGRESSION", desc: "Evolve your way, unlock new possibilities.", icon: <Shield className="stroke-1 w-12 h-12" /> },
              { title: "CHOICES", desc: "Your decisions shape the world around you.", icon: <Users className="stroke-1 w-12 h-12" /> },
            ].map((f, i) => (
              <div key={i} className="border border-sf-gray/40 bg-[#090909] p-8 hover:border-sf-orange/60 transition-all duration-300 group relative flex flex-col items-center text-center">
                {/* Plus marks in corners */}
                <div className="absolute top-2 left-2 text-sf-gray text-[10px] group-hover:text-sf-orange transition-colors">+</div>
                <div className="absolute top-2 right-2 text-sf-gray text-[10px] group-hover:text-sf-orange transition-colors">+</div>
                <div className="absolute bottom-2 left-2 text-sf-gray text-[10px] group-hover:text-sf-orange transition-colors">+</div>
                <div className="absolute bottom-2 right-2 text-sf-gray text-[10px] group-hover:text-sf-orange transition-colors">+</div>
                
                {/* Top border accent line */}
                <div className="absolute top-0 w-12 h-[2px] bg-sf-orange/30 group-hover:bg-sf-orange transition-colors"></div>

                <div className="text-sf-orange mb-8 group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="font-rajdhani font-bold tracking-[0.2em] text-sf-orange uppercase mb-4 text-sm">{f.title}</h3>
                <p className="font-inter text-[13px] leading-relaxed text-gray-500 group-hover:text-gray-300 transition-colors">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cinematic Trailer Embed Section */}
        <section className="max-w-[90rem] mx-auto px-6 md:px-12 lg:px-24 py-20 relative">
          <div className="flex flex-col lg:flex-row items-center gap-12">
             <div className="w-full lg:w-1/3">
                <span className="text-sf-orange font-rajdhani font-bold tracking-[0.2em] uppercase text-sm mb-4 block">// MEDIA FEED</span>
                <h2 className="font-orbitron font-normal text-3xl lg:text-4xl uppercase leading-tight mb-6">
                  ARCHIVAL <br/><span className="text-sf-orange font-bold">FOOTAGE</span>
                </h2>
                <p className="font-inter text-gray-400 text-sm leading-relaxed mb-8">
                  Review the latest operational footage from the exclusion zone. Survive the night, adapt to the anomalies, and uncover what lies beneath.
                </p>
                <div className="flex flex-col gap-4">
                   <div className="border border-sf-gray/50 p-4 flex justify-between items-center text-xs font-rajdhani uppercase tracking-widest text-sf-orange bg-sf-charcoal/50">
                      <span>LOCATION:</span> <span className="text-white">SECTOR 7-G</span>
                   </div>
                   <div className="border border-sf-gray/50 p-4 flex justify-between items-center text-xs font-rajdhani uppercase tracking-widest text-sf-orange bg-sf-charcoal/50">
                      <span>THREAT LEVEL:</span> <span className="text-white">CRITICAL</span>
                   </div>
                </div>
             </div>
             
             <div className="w-full lg:w-2/3 relative">
                <div className="relative border border-sf-orange/30 p-2 md:p-4 clip-path-cyber-frame bg-gradient-to-br from-sf-charcoal to-sf-black w-full aspect-video z-10">
                   <div className="absolute top-0 right-8 text-sf-orange font-rajdhani text-xs tracking-widest uppercase bg-sf-black px-4 py-1 -translate-y-1/2 z-20 border border-sf-orange/30">
                     LIVE FEED
                   </div>
                   {/* Frame Accents */}
                   <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-sf-orange pointer-events-none"></div>
                   <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-sf-orange pointer-events-none"></div>
                   
                   <iframe 
                      className="w-full h-full object-cover filter contrast-[1.1]" 
                      src="https://www.youtube.com/embed/zepyWyzPxOQ?autoplay=0&showinfo=0&controls=1&rel=0&mute=0" 
                      title="Sunset Forest Trailer"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                   ></iframe>
                </div>
                {/* Background glow for video */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-sf-orange/10 blur-[100px] pointer-events-none z-0"></div>
             </div>
          </div>
        </section>

        {/* Engine Specs / Progression Section */}
        <section className="max-w-[90rem] mx-auto px-6 md:px-12 lg:px-24 py-20 relative border-t border-sf-gray/30 mt-12 bg-[#050505]">
          <div className="flex flex-col text-center items-center mb-16">
            <span className="text-sf-orange font-rajdhani font-bold tracking-[0.2em] uppercase text-sm mb-4">SYSTEM ARCHITECTURE</span>
            <h2 className="font-orbitron font-bold text-3xl lg:text-5xl uppercase text-white">POWERED BY <span className="text-transparent bg-clip-text bg-gradient-to-r from-sf-orange to-sf-ember">CUSTOM TECH</span></h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-sf-gray/50 bg-[#0a0a0a] p-8 lg:p-12 relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-sf-orange scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
               <Hexagon className="text-sf-orange mb-6 w-12 h-12 stroke-[1.5]" />
               <h3 className="font-orbitron font-bold text-2xl uppercase mb-4">Three.js Engine</h3>
               <p className="font-inter text-gray-400 text-sm leading-relaxed mb-6">
                 Built from the ground up using a highly optimized Three.js core. Experience dynamic lighting, thick volumetric fog, and atmospheric audio that pulls you right into the survival experience.
               </p>
               <ul className="font-rajdhani text-xs uppercase tracking-widest text-sf-orange flex flex-col gap-3">
                 <li className="flex items-center gap-3"><span className="w-4 h-px bg-sf-orange"></span> Custom Shaders</li>
                 <li className="flex items-center gap-3"><span className="w-4 h-px bg-sf-orange"></span> Headshot Detection System</li>
                 <li className="flex items-center gap-3"><span className="w-4 h-px bg-sf-orange"></span> Optimized Frame-rates</li>
               </ul>
            </div>
            
            <div className="border border-sf-gray/50 bg-[#0a0a0a] p-8 lg:p-12 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-full h-1 bg-sf-orange scale-x-0 group-hover:scale-x-100 transition-transform origin-right duration-500"></div>
               <Cpu className="text-sf-orange mb-6 w-12 h-12 stroke-[1.5]" />
               <h3 className="font-orbitron font-bold text-2xl uppercase mb-4">Real-time Multiplayer</h3>
               <p className="font-inter text-gray-400 text-sm leading-relaxed mb-6">
                 Powered by Node.js and Firebase. Seamlessly authenticate and drop into the world. Coordinate with fellow survivors, loot together, and hold the line against endless waves.
               </p>
               <ul className="font-rajdhani text-xs uppercase tracking-widest text-sf-orange flex flex-col gap-3">
                 <li className="flex items-center gap-3"><span className="w-4 h-px bg-sf-orange"></span> Firebase Authentication</li>
                 <li className="flex items-center gap-3"><span className="w-4 h-px bg-sf-orange"></span> Real-time Sync</li>
                 <li className="flex items-center gap-3"><span className="w-4 h-px bg-sf-orange"></span> Server-Authoritative Logic</li>
               </ul>
            </div>
          </div>
        </section>

      </div>

      {/* Massive CTA Section / Footer overlap */}
      <section className="relative w-full bg-[#FF5A00] clip-path-cta mt-[-100px] pt-40 pb-12 z-20 text-sf-black overflow-hidden font-rajdhani">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
        
        {/* Giant ghost text */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-10 pointer-events-none">
          <h2 className="font-orbitron font-black text-[25vw] leading-none whitespace-nowrap select-none text-sf-black">READY?</h2>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center pb-24 mb-12">
           <p className="font-bold tracking-[0.4em] uppercase text-sm mb-6">THE JOURNEY AWAITS</p>
           <h2 className="font-orbitron font-black text-6xl md:text-8xl uppercase tracking-tighter mb-16">
             ARE YOU READY?
           </h2>
           <a href="https://MEDELBOU3.github.io/Sunset-Forest/game-project/" target="_blank" rel="noreferrer" className="bg-sf-black text-[#FF5A00] font-bold uppercase tracking-[0.2em] px-16 py-6 flex items-center gap-12 group hover:bg-sf-charcoal transition-all">
             <span>PLAY SUNSET FOREST</span>
             <span className="text-xl group-hover:rotate-90 transition-transform duration-300">+</span>
           </a>
        </div>

        {/* Diagonal accents in bottom corners */}
        <div className="absolute bottom-8 right-8 border-r border-b border-sf-black/30 w-16 h-16 pointer-events-none"></div>

        {/* Footer Link Area within the orange section */}
        <div className="relative z-10 max-w-[90rem] mx-auto px-6 mt-8 flex flex-col lg:flex-row justify-between items-center gap-8 font-bold uppercase tracking-[0.2em] text-xs">
           <div className="flex items-center gap-6 border-r-0 lg:border-r-[1px] border-sf-black/20 lg:pr-8 w-full lg:w-max justify-center lg:justify-start">
             <div className="w-12 h-12 bg-sf-black rounded-full flex items-center justify-center text-[#FF5A00] overflow-hidden p-2">
                 <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain filter invert sepia-[100%] saturate-1000 hue-rotate-[170deg]" />
             </div>
             <div className="flex flex-col leading-tight text-left text-sm">
               <span>SUNSET</span>
               <span>FOREST</span>
             </div>
           </div>

           <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 flex-1">
             <span className="opacity-50 hidden sm:block">+</span>
             {['About', 'Gameplay', 'World', 'News', 'Contact'].map(link => (
                 <a key={link} href="#" className="hover:opacity-60 transition-opacity">{link}</a>
             ))}
             <span className="opacity-50 hidden sm:block">+</span>
           </div>

           <div className="text-center lg:text-right font-inter text-[10px] tracking-widest opacity-80 mt-4 lg:mt-0 flex flex-col gap-2">
             <p>© 2026 Sunset Forest. All rights reserved.</p>
             <a href="#" className="hover:underline">Privacy Policy</a>
           </div>
        </div>
      </section>

      {/* Video Modal */}
      <AnimatePresence>
        {videoModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-sf-black/95 backdrop-blur-sm flex items-center justify-center p-4 lg:p-12"
          >
            <button 
              onClick={() => setVideoModalOpen(false)}
              className="absolute top-6 right-6 lg:top-12 lg:right-12 text-white hover:text-sf-orange transition-colors flex items-center gap-4 font-rajdhani uppercase tracking-widest text-sm"
            >
              CLOSE <X size={32} />
            </button>
            <div className="w-full max-w-6xl aspect-video bg-black border border-sf-orange/50 shadow-[0_0_50px_rgba(255,90,0,0.2)]">
               <iframe 
                  className="w-full h-full" 
                  src="https://www.youtube.com/embed/zepyWyzPxOQ?autoplay=1&showinfo=0&controls=1&rel=0&mute=0" 
                  title="Sunset Forest Trailer Full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
               ></iframe>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
