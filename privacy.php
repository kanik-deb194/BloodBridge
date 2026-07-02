<?php
$theme = $_COOKIE['bb-theme'] ?? 'dark';
?><!DOCTYPE html>
<html lang="en" data-theme="<?= htmlspecialchars($theme) ?>">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="BloodBridge Bangladesh — Privacy Policy" />
<title>Privacy Policy — BloodBridge Bangladesh</title>
<link rel="icon" type="image/png" href="blood_bridge_favicon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Noto+Sans+Bengali:wght@400;600;700&family=Playfair+Display:ital,wght@0,700;1,400&display=swap" rel="stylesheet" />
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
:root{--red:#C0162C;--red-light:#E8294A;--red-glow:rgba(192,22,44,0.35);--gold:#f59e0b;--transition:0.5s cubic-bezier(0.23,1,0.32,1);}

[data-theme="dark"]{
  --bg:#080305;--bg2:#0d0306;--text:#F5F0EE;--text-muted:rgba(245,240,238,0.5);--text-sub:rgba(245,240,238,0.28);
  --glass:rgba(255,255,255,0.04);--glass-border:rgba(255,255,255,0.06);--glass-shadow:rgba(0,0,0,0.5);
  --card-bg:rgba(255,255,255,0.03);--card-border:rgba(255,255,255,0.06);--card-hover-border:rgba(192,22,44,0.25);
  --card-glow:rgba(192,22,44,0.08);--card-shadow:rgba(0,0,0,0.4);
  --orb1:rgba(192,22,44,0.18);--orb2:rgba(180,10,30,0.12);--orb3:rgba(220,40,60,0.08);--orb4:rgba(140,10,25,0.1);
  --grid:rgba(255,255,255,0.018);--nav-border:rgba(192,22,44,0.15);
  --hero-glow:radial-gradient(ellipse 60% 40% at 50% 30%,rgba(192,22,44,0.12) 0%,transparent 70%);
  --scrollbar-track:rgba(255,255,255,0.03);--scrollbar-thumb:rgba(192,22,44,0.3);
  --code-bg:rgba(255,255,255,0.04);--badge-bg:rgba(192,22,44,0.12);
}

[data-theme="light"]{
  --bg:#f8f2f4;--bg2:#fef7f9;--text:#1a0508;--text-muted:rgba(30,10,15,0.5);--text-sub:rgba(30,10,15,0.3);
  --glass:rgba(255,255,255,0.7);--glass-border:rgba(192,22,44,0.1);--glass-shadow:rgba(192,22,44,0.06);
  --card-bg:rgba(255,255,255,0.7);--card-border:rgba(192,22,44,0.08);--card-hover-border:rgba(192,22,44,0.2);
  --card-glow:rgba(192,22,44,0.05);--card-shadow:rgba(192,22,44,0.04);
  --orb1:rgba(192,22,44,0.05);--orb2:rgba(180,10,30,0.04);--orb3:rgba(220,40,60,0.03);--orb4:rgba(140,10,25,0.03);
  --grid:rgba(192,22,44,0.025);--nav-border:rgba(192,22,44,0.12);
  --hero-glow:radial-gradient(ellipse 60% 40% at 50% 30%,rgba(192,22,44,0.06) 0%,transparent 70%);
  --scrollbar-track:rgba(192,22,44,0.04);--scrollbar-thumb:rgba(192,22,44,0.2);
  --code-bg:rgba(192,22,44,0.04);--badge-bg:rgba(192,22,44,0.08);
}

html{scroll-behavior:smooth;}
body{
  font-family:'Outfit',sans-serif;background:var(--bg);color:var(--text);
  overflow-x:hidden;min-height:100vh;line-height:1.75;
  transition:background var(--transition),color var(--transition);
}
::-webkit-scrollbar{width:6px;}
::-webkit-scrollbar-track{background:var(--scrollbar-track);}
::-webkit-scrollbar-thumb{background:var(--scrollbar-thumb);border-radius:3px;}

#scrollProgress{position:fixed;top:0;left:0;width:0%;height:3px;z-index:999;background:linear-gradient(90deg,var(--red),var(--red-light),var(--gold));transition:width 0.1s linear;}

.bg-scene{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;background:var(--bg2);transition:background var(--transition);
  background-image:var(--hero-glow),radial-gradient(ellipse 70% 50% at 80% 90%,rgba(80,5,20,0.2) 0%,transparent 55%),radial-gradient(ellipse 50% 70% at 10% 80%,rgba(60,5,15,0.15) 0%,transparent 50%);
}
.grid-overlay{position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:50px 50px;}
.orb{position:absolute;border-radius:50%;filter:blur(100px);opacity:0.5;animation:orbFloat 25s ease-in-out infinite;}
.orb-1{width:550px;height:550px;background:var(--orb1);top:-15%;left:-8%;animation-delay:0s;}
.orb-2{width:450px;height:450px;background:var(--orb2);bottom:-10%;right:-5%;animation-delay:-7s;}
.orb-3{width:350px;height:350px;background:var(--orb3);top:50%;left:60%;animation-delay:-14s;}
.orb-4{width:250px;height:250px;background:var(--orb4);top:20%;right:10%;animation-delay:-21s;}
@keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1);}25%{transform:translate(40px,-40px) scale(1.08);}50%{transform:translate(-30px,20px) scale(0.92);}75%{transform:translate(20px,30px) scale(1.04);}}

#particles-canvas{position:fixed;inset:0;z-index:1;pointer-events:none;}

.drop-container{position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden;}
.blood-drop{
  position:absolute;border-radius:50% 50% 50% 50% / 60% 60% 40% 40%;opacity:0;animation:dropFall linear infinite;
}
.blood-drop::before{content:'';position:absolute;top:-4px;left:50%;transform:translateX(-50%);width:6px;height:6px;border-radius:50%;}
.blood-drop:nth-child(1){left:5%;width:10px;height:14px;background:var(--red);animation-duration:24s;animation-delay:0s;opacity:0.05;}
.blood-drop:nth-child(1)::before{background:var(--red);}
.blood-drop:nth-child(2){left:18%;width:7px;height:11px;background:#ff6b4a;animation-duration:28s;animation-delay:-6s;opacity:0.04;}
.blood-drop:nth-child(2)::before{background:#ff6b4a;}
.blood-drop:nth-child(3){left:32%;width:12px;height:16px;background:var(--red);animation-duration:22s;animation-delay:-11s;opacity:0.05;}
.blood-drop:nth-child(3)::before{background:var(--red);}
.blood-drop:nth-child(4){left:48%;width:8px;height:12px;background:#e84a5f;animation-duration:30s;animation-delay:-4s;opacity:0.04;}
.blood-drop:nth-child(4)::before{background:#e84a5f;}
.blood-drop:nth-child(5){left:60%;width:14px;height:18px;background:var(--red);animation-duration:26s;animation-delay:-9s;opacity:0.05;}
.blood-drop:nth-child(5)::before{background:var(--red);}
.blood-drop:nth-child(6){left:75%;width:7px;height:11px;background:#ff6b4a;animation-duration:32s;animation-delay:-16s;opacity:0.03;}
.blood-drop:nth-child(6)::before{background:#ff6b4a;}
.blood-drop:nth-child(7){left:88%;width:10px;height:14px;background:var(--red);animation-duration:24s;animation-delay:-13s;opacity:0.04;}
.blood-drop:nth-child(7)::before{background:var(--red);}
@keyframes dropFall{0%{transform:translateY(-120px) rotate(0deg);opacity:0;}8%{opacity:0.05;}92%{opacity:0.05;}100%{transform:translateY(calc(100vh + 120px)) rotate(360deg);opacity:0;}}

.float-symbols{position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden;}
.float-sym{position:absolute;font-size:1.6rem;opacity:0;animation:symFloat linear infinite;}
.float-sym:nth-child(1){left:5%;top:15%;animation-duration:18s;animation-delay:0s;}
.float-sym:nth-child(2){left:16%;top:55%;animation-duration:21s;animation-delay:-7s;}
.float-sym:nth-child(3){left:30%;top:30%;animation-duration:16s;animation-delay:-12s;}
.float-sym:nth-child(4){left:42%;top:70%;animation-duration:20s;animation-delay:-5s;}
.float-sym:nth-child(5){left:55%;top:20%;animation-duration:23s;animation-delay:-10s;}
.float-sym:nth-child(6){left:68%;top:60%;animation-duration:17s;animation-delay:-15s;}
.float-sym:nth-child(7){left:82%;top:35%;animation-duration:22s;animation-delay:-8s;}
@keyframes symFloat{0%{transform:translateY(0) scale(0);opacity:0;}10%{opacity:0.1;transform:translateY(0) scale(1);}90%{opacity:0.1;transform:translateY(-60px) scale(0.9);}100%{transform:translateY(-80px) scale(0.5);opacity:0;}}

.pulse-ring{position:fixed;border-radius:50%;border:1px solid var(--red);opacity:0;pointer-events:none;z-index:1;animation:pulseRing 8s ease-out infinite;}
.pulse-ring:nth-child(1){width:300px;height:300px;top:10%;left:-5%;animation-delay:0s;}
.pulse-ring:nth-child(2){width:200px;height:200px;bottom:15%;right:5%;animation-delay:-3s;}
.pulse-ring:nth-child(3){width:250px;height:250px;top:50%;left:60%;animation-delay:-6s;}
@keyframes pulseRing{0%{transform:scale(0.3);opacity:0.15;}100%{transform:scale(2);opacity:0;}}

nav{
  position:fixed;top:0;left:0;right:0;z-index:100;
  padding:16px 36px;display:flex;align-items:center;justify-content:space-between;
  background:var(--glass);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border-bottom:1px solid var(--nav-border);transition:all var(--transition);
}
.nav-logo{display:flex;align-items:center;gap:12px;text-decoration:none;position:relative;}
.nav-logo img{height:38px;width:auto;object-fit:contain;transition:transform 0.3s;}
.nav-logo:hover img{transform:scale(1.05) rotate(-2deg);}
.logo-text{font-size:1.2rem;font-weight:800;color:var(--text);letter-spacing:-0.03em;transition:color var(--transition);}
.logo-text span{color:var(--red-light);}
.nav-right{display:flex;align-items:center;gap:14px;}
.nav-link{padding:8px 20px;border-radius:50px;font-size:0.84rem;font-weight:500;color:var(--text-muted);text-decoration:none;transition:all 0.3s;position:relative;}
.nav-link::after{content:'';position:absolute;bottom:4px;left:50%;transform:translateX(-50%);width:0;height:2px;background:var(--red-light);border-radius:2px;transition:width 0.3s;}
.nav-link:hover{color:var(--text);background:rgba(255,255,255,0.04);}
.nav-link:hover::after{width:20px;}
.nav-cta{
  padding:9px 24px;border-radius:50px;font-size:0.84rem;font-weight:700;
  background:linear-gradient(135deg,var(--red),#8B0020);color:#fff;text-decoration:none;
  box-shadow:0 4px 24px rgba(192,22,44,0.35);transition:all 0.3s;position:relative;overflow:hidden;
}
.nav-cta::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.15),transparent);opacity:0;transition:opacity 0.3s;}
.nav-cta:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(192,22,44,0.5);}
.nav-cta:hover::before{opacity:1;}

.theme-toggle{cursor:pointer;width:52px;height:28px;border-radius:14px;position:relative;transition:all 0.4s ease;overflow:hidden;flex-shrink:0;}
[data-theme="dark"] .theme-toggle{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);}
[data-theme="light"] .theme-toggle{background:rgba(192,22,44,0.1);border:1px solid rgba(192,22,44,0.18);}
.toggle-knob{width:22px;height:22px;border-radius:50%;position:absolute;top:2px;left:2px;transition:all 0.5s cubic-bezier(0.68,-0.55,0.265,1.55);display:flex;align-items:center;justify-content:center;font-size:13px;z-index:2;box-shadow:0 2px 8px rgba(0,0,0,0.2);}
[data-theme="dark"] .toggle-knob{background:linear-gradient(135deg,#3a3a3a,#1a1a1a);left:2px;}
[data-theme="light"] .toggle-knob{background:linear-gradient(135deg,var(--red),#8B0020);left:28px;transform:rotate(360deg);}
.toggle-track{position:absolute;inset:0;border-radius:14px;overflow:hidden;display:flex;align-items:center;justify-content:space-between;padding:0 10px;pointer-events:none;}
.toggle-track .t-icon{font-size:11px;transition:all 0.4s ease;line-height:1;}
[data-theme="dark"] .toggle-track .t-moon{opacity:0.9;color:#fbbf24;}
[data-theme="dark"] .toggle-track .t-sun{opacity:0.3;color:#fbbf24;}
[data-theme="light"] .toggle-track .t-moon{opacity:0.3;color:#C0162C;}
[data-theme="light"] .toggle-track .t-sun{opacity:0.9;color:#C0162C;}

.hero{
  position:relative;z-index:2;min-height:100vh;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:130px 24px 80px;text-align:center;
}
.hero-badge{
  display:inline-flex;align-items:center;gap:8px;
  padding:8px 22px;border-radius:50px;font-size:0.78rem;font-weight:600;
  background:var(--badge-bg);color:var(--red-light);border:1px solid rgba(192,22,44,0.15);
  margin-bottom:28px;animation:fadeUp 0.9s ease both;letter-spacing:0.03em;
  text-transform:uppercase;backdrop-filter:blur(4px);
}
.hero-badge .dot{width:6px;height:6px;border-radius:50%;background:var(--red-light);animation:pulseDot 2s ease-in-out infinite;}
@keyframes pulseDot{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.3;transform:scale(0.7);}}
.hero h1{
  font-size:clamp(2.5rem,7vw,4.8rem);font-weight:900;line-height:1.05;margin-bottom:18px;animation:fadeUp 0.9s ease 0.1s both;letter-spacing:-0.03em;
}
.hero h1 .grad{background:linear-gradient(135deg,var(--text) 0%,var(--text) 40%,var(--red-light) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.hero h1 .grad-accent{background:linear-gradient(135deg,var(--red),#ff6b4a,var(--gold));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.hero p{font-size:clamp(0.95rem,1.8vw,1.15rem);color:var(--text-muted);max-width:640px;line-height:1.85;animation:fadeUp 0.9s ease 0.2s both;}
.hero-meta{display:flex;align-items:center;gap:24px;margin-top:32px;flex-wrap:wrap;justify-content:center;animation:fadeUp 0.9s ease 0.3s both;}
.hero-meta span{display:flex;align-items:center;gap:7px;font-size:0.8rem;color:var(--text-sub);padding:6px 14px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:50px;transition:all 0.3s;}
.hero-meta span:hover{color:var(--text);border-color:var(--card-hover-border);transform:translateY(-1px);}
.hero-meta svg{width:13px;height:13px;opacity:0.5;}
.scroll-indicator{position:absolute;bottom:36px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--text-sub);font-size:0.65rem;letter-spacing:0.08em;animation:fadeUp 0.9s ease 0.5s both;text-transform:uppercase;}
.scroll-line{width:1.5px;height:44px;background:linear-gradient(to bottom,var(--red-light),var(--red),transparent);animation:scrollPulse 2.5s ease-in-out infinite;border-radius:2px;}
@keyframes scrollPulse{0%,100%{opacity:0.5;transform:scaleY(1) translateY(0);}50%{opacity:1;transform:scaleY(1.4) translateY(4px);}}

.content{position:relative;z-index:2;padding:0 24px 100px;max-width:920px;margin:0 auto;}
.last-updated{text-align:center;font-size:0.85rem;color:var(--text-muted);margin-bottom:44px;padding:16px 28px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:16px;animation:fadeUp 0.9s ease both;backdrop-filter:blur(8px);line-height:1.6;transition:all var(--transition);}
.last-updated:hover{border-color:var(--card-hover-border);}

.section{
  background:var(--card-bg);backdrop-filter:blur(16px);
  border:1px solid var(--card-border);border-radius:24px;
  padding:40px 44px;margin-bottom:28px;
  transition:all 0.6s cubic-bezier(0.23,1,0.32,1);
  opacity:0;transform:translateY(50px) scale(0.98);
  position:relative;overflow:hidden;
  box-shadow:0 8px 32px var(--card-shadow);
}
.section.visible{opacity:1;transform:translateY(0) scale(1);}
.section::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--card-glow),transparent 60%);opacity:0;transition:opacity 0.6s;pointer-events:none;}
.section.visible::before{opacity:1;}
.section::after{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,var(--red),var(--red-light),var(--gold),var(--red),transparent);background-size:200% 100%;opacity:0;transition:opacity 0.6s;animation:borderShimmer 3s linear infinite;}
.section.visible::after{opacity:0.7;}
@keyframes borderShimmer{0%{background-position:0% 0;}100%{background-position:200% 0;}}
.section:hover{transform:translateY(-4px) scale(1.003);border-color:var(--card-hover-border);box-shadow:0 24px 80px var(--card-glow),0 8px 32px var(--card-shadow);}
.section-number{position:absolute;top:14px;right:24px;font-size:5rem;font-weight:900;line-height:1;color:rgba(192,22,44,0.2);user-select:none;transition:all 0.5s;font-family:'Playfair Display',serif;}
[data-theme="light"] .section-number{color:rgba(192,22,44,0.25);}
.section:hover .section-number{color:rgba(192,22,44,0.45);transform:scale(1.15) rotate(-3deg);}
[data-theme="light"] .section:hover .section-number{color:rgba(192,22,44,0.5);}
.section-corner{position:absolute;bottom:20px;right:24px;font-size:2rem;opacity:0.04;user-select:none;transition:opacity 0.4s;pointer-events:none;}
.section:hover .section-corner{opacity:0.1;}
.section h2{font-size:1.35rem;font-weight:800;margin-bottom:16px;display:flex;align-items:center;gap:12px;line-height:1.3;}
.section h2 .sec-icon{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(192,22,44,0.12),rgba(192,22,44,0.05));flex-shrink:0;font-size:1.1rem;transition:all 0.4s;border:1px solid rgba(192,22,44,0.1);}
.section:hover h2 .sec-icon{transform:scale(1.1) rotate(-5deg);background:linear-gradient(135deg,rgba(192,22,44,0.18),rgba(192,22,44,0.08));}
.section p{font-size:0.93rem;color:var(--text-muted);line-height:1.85;margin-bottom:12px;transition:color var(--transition);}
.section p:last-child{margin-bottom:0;}
.section ul{padding-left:24px;margin:12px 0;}
.section ul li{font-size:0.9rem;color:var(--text-muted);line-height:1.85;margin-bottom:6px;position:relative;list-style:none;padding-left:20px;transition:color 0.3s;}
.section ul li::before{content:'▸';position:absolute;left:0;color:var(--red-light);font-weight:700;transition:transform 0.3s;}
.section ul li:hover::before{transform:translateX(3px);}
.section ul li:hover{color:var(--text);}
.section ul li strong{color:var(--text);font-weight:600;transition:color var(--transition);}
.section ul li .badge{display:inline-block;padding:1px 8px;border-radius:4px;font-size:0.7rem;font-weight:600;margin-left:4px;background:rgba(192,22,44,0.1);color:var(--red-light);}
.highlight{color:var(--red-light);font-weight:600;}

.privacy-shield{
  display:flex;align-items:center;gap:20px;
  padding:22px 28px;margin-bottom:32px;
  background:var(--badge-bg);border:1px solid rgba(192,22,44,0.1);
  border-radius:18px;transition:all 0.4s;
  position:relative;overflow:hidden;
}
.privacy-shield::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,rgba(192,22,44,0.04),transparent 60%);pointer-events:none;}
.privacy-shield:hover{transform:translateY(-3px);border-color:rgba(192,22,44,0.2);box-shadow:0 12px 40px var(--card-glow);}
.privacy-shield .shield-icon{font-size:2.5rem;flex-shrink:0;position:relative;z-index:1;animation:shieldPulse 3s ease-in-out infinite;}
@keyframes shieldPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.08);}}
.privacy-shield p{font-size:0.9rem;color:var(--text-muted);line-height:1.7;margin:0;position:relative;z-index:1;}
.privacy-shield p strong{color:var(--text);}

.quote-block{margin-top:16px;padding:18px 22px;background:var(--badge-bg);border-radius:14px;border-left:3px solid var(--red-light);transition:all 0.3s;}
.quote-block:hover{border-left-width:4px;background:var(--code-bg);}
.quote-block p{font-size:0.9rem;margin:0;color:var(--text);}
.quote-block p strong{font-weight:700;}

.footer-bar{position:relative;z-index:2;text-align:center;padding:36px 24px;border-top:1px solid var(--card-border);transition:border-color var(--transition);}
.footer-bar p{font-size:0.8rem;color:var(--text-sub);transition:color var(--transition);}
.footer-bar a{color:var(--red-light);text-decoration:none;font-weight:500;transition:all 0.3s;position:relative;}
.footer-bar a::after{content:'';position:absolute;bottom:-2px;left:0;width:0;height:1px;background:var(--red-light);transition:width 0.3s;}
.footer-bar a:hover{color:var(--red);}
.footer-bar a:hover::after{width:100%;}

#backToTop{position:fixed;bottom:32px;right:32px;z-index:50;width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--red),#8B0020);color:#fff;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(192,22,44,0.35);display:flex;align-items:center;justify-content:center;opacity:0;transform:translateY(20px) scale(0.8);transition:all 0.4s cubic-bezier(0.23,1,0.32,1);pointer-events:none;}
#backToTop.show{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}
#backToTop:hover{transform:translateY(-3px) scale(1.05);box-shadow:0 8px 28px rgba(192,22,44,0.5);}
#backToTop svg{width:18px;height:18px;transition:transform 0.3s;}
#backToTop:hover svg{transform:translateY(-2px);}

@keyframes fadeUp{from{opacity:0;transform:translateY(30px);}to{opacity:1;transform:translateY(0);}}

@media(max-width:900px){nav{padding:14px 20px;} .nav-logo img{height:32px;} .section{padding:30px 26px;} .section-number{font-size:3rem;top:12px;right:18px;}}
@media(max-width:640px){
  nav{padding:12px 16px;}.nav-link{display:none;}.nav-logo img{height:28px;}.logo-text{font-size:1rem;}
  .section{padding:24px 18px;border-radius:18px;margin-bottom:20px;}.section-number{font-size:2.2rem;top:10px;right:14px;}
  .section h2{font-size:1.1rem;gap:8px;}.section h2 .sec-icon{width:30px;height:30px;font-size:0.9rem;border-radius:10px;}
  .hero{padding:110px 16px 60px;}.hero-meta{gap:12px;}.hero-meta span{padding:5px 12px;font-size:0.75rem;}
  .content{padding:0 16px 60px;}.last-updated{padding:14px 18px;}
  .privacy-shield{flex-direction:column;text-align:center;padding:18px 20px;}.privacy-shield .shield-icon{font-size:2rem;}
  .quote-block{padding:14px 16px;}.nav-cta{padding:7px 16px;font-size:0.78rem;}
  #backToTop{width:40px;height:40px;bottom:20px;right:20px;}.float-symbols{display:none;}
}
</style>
</head>
<body>

<div id="scrollProgress"></div>
<div class="bg-scene"><div class="orb orb-1"></div><div class="orb orb-2"></div><div class="orb orb-3"></div><div class="orb orb-4"></div></div>
<div class="grid-overlay"></div>
<div class="pulse-ring"></div><div class="pulse-ring"></div><div class="pulse-ring"></div>
<canvas id="particles-canvas"></canvas>
<div class="drop-container">
  <div class="blood-drop"></div><div class="blood-drop"></div><div class="blood-drop"></div>
  <div class="blood-drop"></div><div class="blood-drop"></div><div class="blood-drop"></div>
  <div class="blood-drop"></div>
</div>
<div class="float-symbols">
  <span class="float-sym">🛡️</span><span class="float-sym">🔒</span><span class="float-sym">🩸</span>
  <span class="float-sym">🔐</span><span class="float-sym">❤️</span><span class="float-sym">🩸</span>
  <span class="float-sym">📜</span>
</div>

<nav>
  <a href="landing_page.html" class="nav-logo">
    <img src="blood1.png" alt="BloodBridge" />
    <span class="logo-text">Blood<span>Bridge</span></span>
  </a>
  <div class="nav-right">
    <div class="theme-toggle" id="themeToggle" title="Toggle theme">
      <div class="toggle-track"><span class="t-icon t-moon">🌙</span><span class="t-icon t-sun">☀️</span></div>
      <div class="toggle-knob" id="toggleKnob">🌙</div>
    </div>
    <a href="login.html" class="nav-link">Login</a>
    <a href="signup.html" class="nav-cta">Join the Mission</a>
  </div>
</nav>

<section class="hero">
  <div class="hero-badge"><span class="dot"></span> Privacy — Effective May 22, 2026</div>
  <h1><span class="grad">Privacy</span> <span class="grad-accent">Policy</span></h1>
  <p>Your privacy is at the heart of BloodBridge. This policy explains how we collect, use, protect, and process your personal data when you use our platform to save lives across Bangladesh.</p>
  <div class="hero-meta">
    <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Updated May 22, 2026</span>
    <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Digital Security Act, 2018</span>
    <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> 8 min read</span>
  </div>
  <div class="scroll-indicator"><div class="scroll-line"></div>scroll</div>
</section>

<div class="content">
  <div class="last-updated">🔒 This Privacy Policy explains how <strong>BloodBridge Bangladesh</strong> handles your personal data in compliance with the <strong>Bangladesh Digital Security Act, 2018</strong> and international best practices for health-data protection.</div>

  <div class="privacy-shield">
    <div class="shield-icon">🛡️</div>
    <p><strong>Our Commitment:</strong> BloodBridge will never sell, rent, or trade your personal or medical data. Every piece of information you share is used exclusively to facilitate life-saving blood donation coordination across Bangladesh. Your trust is our most valuable asset.</p>
  </div>

  <div class="section" data-delay="0">
    <div class="section-number">1</div>
    <div class="section-corner">📊</div>
    <h2><span class="sec-icon">📊</span> Information We Collect</h2>
    <p>We collect the following categories of data to provide and improve our services:</p>
    <ul>
      <li><strong>Identity Information:</strong> Full name, date of birth, National ID (NID) number, blood type, photograph.</li>
      <li><strong>Contact Information:</strong> Email address, phone number, current address (district, city, area).</li>
      <li><strong>Medical Information:</strong> Blood group, Rh factor, hemoglobin level, donation history, medical eligibility status.</li>
      <li><strong>Location Data:</strong> Real-time GPS coordinates during active emergency coordination (with your consent).</li>
      <li><strong>Device &amp; Usage Data:</strong> IP address, browser type, device information, pages visited, time spent on platform.</li>
    </ul>
  </div>

  <div class="section" data-delay="30">
    <div class="section-number">2</div>
    <div class="section-corner">🎯</div>
    <h2><span class="sec-icon">🎯</span> How We Use Your Data</h2>
    <p>Your data is used exclusively for the following purposes:</p>
    <ul>
      <li><strong>🩸 Emergency Coordination:</strong> Matching blood donors with recipients in real-time during critical situations.</li>
      <li><strong>📋 Inventory Management:</strong> Helping blood banks and hospitals track available blood units by type and location.</li>
      <li><strong>🔔 Notifications:</strong> Sending alerts for emergency requests, donation reminders, and eligibility updates.</li>
      <li><strong>📈 Platform Improvement:</strong> Analyzing usage patterns to enhance user experience and response times.</li>
      <li><strong>⚖️ Legal Compliance:</strong> Fulfilling reporting obligations under Bangladesh health and digital security regulations.</li>
    </ul>
  </div>

  <div class="section" data-delay="60">
    <div class="section-number">3</div>
    <div class="section-corner">🍪</div>
    <h2><span class="sec-icon">🍪</span> Cookies &amp; Tracking</h2>
    <p>BloodBridge uses cookies and similar technologies to improve functionality and security:</p>
    <ul>
      <li><strong>Essential Cookies:</strong> Required for authentication, session management, and platform security. <span class="badge">Always Active</span></li>
      <li><strong>Preference Cookies:</strong> Remember your theme selection (dark/light mode) and language preferences.</li>
      <li><strong>Analytics Cookies:</strong> Anonymous usage data to help us improve platform performance and responsiveness.</li>
      <li><strong>Remember Me:</strong> Optional persistent login cookie that securely stores an encrypted token (not your password).</li>
    </ul>
    <p>You can control cookie preferences through your browser settings. Disabling essential cookies may impact platform functionality.</p>
  </div>

  <div class="section" data-delay="90">
    <div class="section-number">4</div>
    <div class="section-corner">🔐</div>
    <h2><span class="sec-icon">🔐</span> Data Security &amp; Storage</h2>
    <p>We implement industry-standard security measures to protect your data:</p>
    <ul>
      <li><strong>Encryption at Rest:</strong> All personal and medical data is encrypted using AES-256 before storage.</li>
      <li><strong>Encryption in Transit:</strong> All data transmitted between your device and our servers uses TLS 1.3.</li>
      <li><strong>Server Location:</strong> Data is stored on secure servers physically located within <strong>Bangladesh</strong>.</li>
      <li><strong>Access Control:</strong> Strict role-based access — only authorized personnel can view identifiable user data.</li>
      <li><strong>Regular Audits:</strong> Security audits are conducted quarterly by independent cybersecurity firms.</li>
    </ul>
    <p>In the event of a data breach, we will notify affected users within <strong>72 hours</strong> as required by the Bangladesh Digital Security Act, 2018.</p>
  </div>

  <div class="section" data-delay="120">
    <div class="section-number">5</div>
    <div class="section-corner">🤝</div>
    <h2><span class="sec-icon">🤝</span> Data Sharing &amp; Third Parties</h2>
    <p>We do not share your personal data with third parties except in the following circumstances:</p>
    <ul>
      <li><strong>Healthcare Institutions:</strong> Your blood type and contact information may be shared with registered blood banks and hospitals during emergency requests.</li>
      <li><strong>Legal Authorities:</strong> When required by law, court order, or legitimate request from Bangladesh government agencies.</li>
      <li><strong>Service Providers:</strong> Encrypted payment processing (if applicable) and cloud infrastructure providers bound by strict data processing agreements.</li>
    </ul>
    <div class="quote-block">
      <p><strong>✋ We never share your medical history, NID number, or donation eligibility status with any third party without your explicit written consent.</strong></p>
    </div>
  </div>

  <div class="section" data-delay="150">
    <div class="section-number">6</div>
    <div class="section-corner">👁️</div>
    <h2><span class="sec-icon">👁️</span> Your Rights</h2>
    <p>As a BloodBridge user in Bangladesh, you have the following rights regarding your data:</p>
    <ul>
      <li><strong>🔍 Right to Access:</strong> Request a copy of all personal data we hold about you.</li>
      <li><strong>✏️ Right to Rectification:</strong> Correct inaccurate or incomplete data at any time through your profile settings.</li>
      <li><strong>🗑️ Right to Deletion:</strong> Request permanent deletion of your account and associated data (subject to legal retention requirements).</li>
      <li><strong>⏸️ Right to Restrict:</strong> Limit how we process your data for non-essential purposes.</li>
      <li><strong>📤 Right to Portability:</strong> Receive your data in a structured, machine-readable format.</li>
    </ul>
    <p>To exercise any of these rights, contact our Data Protection Officer at <span class="highlight">privacy@bloodbridge.com.bd</span>. We will respond within <strong>30 calendar days</strong> as mandated by Bangladesh law.</p>
  </div>

  <div class="section" data-delay="180">
    <div class="section-number">7</div>
    <div class="section-corner">📆</div>
    <h2><span class="sec-icon">📆</span> Data Retention</h2>
    <p>We retain your personal data only as long as necessary:</p>
    <ul>
      <li><strong>Active Accounts:</strong> Data is retained for the duration your account is active plus <strong>3 years</strong> after account closure.</li>
      <li><strong>Medical Records:</strong> Donation history is retained for <strong>5 years</strong> in compliance with DGHS guidelines.</li>
      <li><strong>Analytics Data:</strong> Anonymous usage data is retained for <strong>24 months</strong>.</li>
      <li><strong>Legal Holds:</strong> Data subject to ongoing legal proceedings is retained until the matter is resolved.</li>
    </ul>
    <p>After the retention period, all data is permanently and securely deleted from our systems.</p>
  </div>

  <div class="section" data-delay="210">
    <div class="section-number">8</div>
    <div class="section-corner">👶</div>
    <h2><span class="sec-icon">👶</span> Children's Privacy</h2>
    <p>BloodBridge is intended for users who are <strong>18 years of age or older</strong>. We do not knowingly collect personal data from individuals under 18. If we become aware that a minor has provided us with personal data, we will take immediate steps to delete such information and close the associated account.</p>
    <p>Guardians who believe their child has submitted data to BloodBridge should contact us at <span class="highlight">privacy@bloodbridge.com.bd</span> for prompt removal.</p>
  </div>

  <div class="section" data-delay="240">
    <div class="section-number">9</div>
    <div class="section-corner">🔄</div>
    <h2><span class="sec-icon">🔄</span> Policy Updates</h2>
    <p>This Privacy Policy may be updated periodically to reflect changes in our practices or legal requirements. We will notify you of material changes via:</p>
    <ul>
      <li>Email notification to your registered email address.</li>
      <li>A prominent notice on the BloodBridge platform.</li>
      <li>Update of the "Effective Date" at the top of this policy.</li>
    </ul>
    <p>We encourage you to review this policy regularly. Continued use of BloodBridge after changes constitutes acceptance of the updated policy.</p>
  </div>

  <div class="section" data-delay="270">
    <div class="section-number">10</div>
    <div class="section-corner">📞</div>
    <h2><span class="sec-icon">📞</span> Contact &amp; Data Protection Officer</h2>
    <p>If you have questions, concerns, or complaints about this Privacy Policy or our data practices, please contact:</p>
    <ul>
      <li><strong>Data Protection Officer:</strong> Md. Shahidul Islam</li>
      <li><strong>Email:</strong> <span class="highlight">privacy@bloodbridge.com.bd</span></li>
      <li><strong>Phone:</strong> <span class="highlight">+880 1700-000001</span> (10 AM — 6 PM, Sun-Thu)</li>
      <li><strong>Registered Address:</strong> House 42, Road 11, Block F, Banani, Dhaka — 1213, Bangladesh</li>
    </ul>
    <p>You also have the right to lodge a complaint with the <strong>Bangladesh Data Protection Authority</strong> or the <strong>Digital Security Agency (DSA)</strong> if you believe your data has been mishandled.</p>
    <div class="quote-block">
      <p><strong>🇧🇩 Your data, your rights, our responsibility — আপনার গোপনীয়তা, আমাদের অঙ্গীকার।</strong></p>
    </div>
  </div>
</div>

<div class="footer-bar">
  <p>© 2026 <strong>BloodBridge Bangladesh</strong>. All rights reserved. &nbsp;·&nbsp; <a href="terms.php">Terms of Service</a> &nbsp;·&nbsp; <a href="landing_page.html">Home</a></p>
</div>

<button id="backToTop" title="Back to top">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
</button>

<script>
(function(){
  const html = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const knob = document.getElementById('toggleKnob');
  const saved = localStorage.getItem('bb-theme') || 'dark';
  html.setAttribute('data-theme', saved);
  toggle.addEventListener('click', () => {
    const cur = html.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('bb-theme', next);
    document.cookie = 'bb-theme='+next+';path=/;max-age=31536000';
    knob.textContent = next === 'dark' ? '🌙' : '☀️';
  });
  knob.textContent = saved === 'dark' ? '🌙' : '☀️';

  const progressBar = document.getElementById('scrollProgress');
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';
  });

  const backBtn = document.getElementById('backToTop');
  window.addEventListener('scroll', () => backBtn.classList.toggle('show', window.scrollY > 400));
  backBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const canvas = document.getElementById('particles-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [], mouse = {x:0,y:0}, animId;
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  for (let i = 0; i < 80; i++) {
    particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: Math.random() * 2.5 + 0.5, a: Math.random() * 0.3 + 0.04 });
  }
  document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const isDark = html.getAttribute('data-theme') === 'dark';
    const color = isDark ? '255,255,255' : '192,22,44';
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]; p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 160) { p.x -= dx * 0.0025; p.y -= dy * 0.0025; }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},${p.a})`; ctx.fill();
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx2 = p.x - p2.x, dy2 = p.y - p2.y;
        const dist2 = Math.sqrt(dx2*dx2 + dy2*dy2);
        if (dist2 < 130) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(${color},${0.05 * (1 - dist2/130)})`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
    }
    animId = requestAnimationFrame(draw);
  }
  draw();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId); else draw();
  });

  const sections = document.querySelectorAll('.section');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay) || 0;
        setTimeout(() => entry.target.classList.add('visible'), delay);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  sections.forEach(s => observer.observe(s));
})();
</script>
</body>
</html>
