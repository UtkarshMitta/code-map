import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CodeMapLogo,
  GraphIcon,
  ScanIcon,
  ErrorDetectIcon,
  RecursiveIcon,
  SpeedIcon,
  WebhookIcon,
  GitHubIcon,
  ArrowRightIcon,
  LoaderIcon,
} from "@/components/icons";

function HeroGraphSVG() {
  return (
    <svg viewBox="0 0 800 500" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="hero-edge-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="hero-edge-emerald" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="hero-edge-red" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
        </linearGradient>
        <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </radialGradient>
        <filter id="glow-sm">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <circle cx="400" cy="250" r="200" fill="url(#hero-glow)" />

      <path d="M200 180 Q300 120 400 160" stroke="url(#hero-edge-cyan)" strokeWidth="1.5" className="hero-edge hero-edge-1" />
      <path d="M400 160 Q500 200 580 140" stroke="url(#hero-edge-cyan)" strokeWidth="1.5" className="hero-edge hero-edge-2" />
      <path d="M400 160 Q420 250 400 320" stroke="url(#hero-edge-emerald)" strokeWidth="1.5" className="hero-edge hero-edge-3" />
      <path d="M200 180 Q180 280 220 350" stroke="url(#hero-edge-cyan)" strokeWidth="1" className="hero-edge hero-edge-4" />
      <path d="M220 350 Q320 380 400 320" stroke="url(#hero-edge-emerald)" strokeWidth="1" className="hero-edge hero-edge-5" />
      <path d="M580 140 Q620 220 600 300" stroke="url(#hero-edge-red)" strokeWidth="1.5" className="hero-edge hero-edge-6" />
      <path d="M400 320 Q500 340 600 300" stroke="url(#hero-edge-red)" strokeWidth="1" className="hero-edge hero-edge-7" />
      <path d="M120 280 Q160 230 200 180" stroke="url(#hero-edge-cyan)" strokeWidth="1" className="hero-edge hero-edge-8" opacity="0.5" />
      <path d="M680 220 Q640 180 580 140" stroke="url(#hero-edge-cyan)" strokeWidth="1" className="hero-edge hero-edge-9" opacity="0.5" />

      {/* Folder nodes */}
      <g className="hero-node hero-node-1" filter="url(#glow-sm)">
        <rect x="165" y="155" width="70" height="50" rx="8" fill="#0f172a" stroke="#06b6d4" strokeWidth="1.5" />
        <text x="200" y="177" textAnchor="middle" fill="#06b6d4" fontSize="10" fontFamily="monospace">src/</text>
        <text x="200" y="193" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">12 files</text>
      </g>

      <g className="hero-node hero-node-2" filter="url(#glow-sm)">
        <rect x="365" y="135" width="70" height="50" rx="8" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
        <text x="400" y="157" textAnchor="middle" fill="#10b981" fontSize="10" fontFamily="monospace">lib/</text>
        <text x="400" y="173" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">8 files</text>
      </g>

      <g className="hero-node hero-node-3" filter="url(#glow-sm)">
        <rect x="545" y="115" width="70" height="50" rx="8" fill="#0f172a" stroke="#06b6d4" strokeWidth="1.5" />
        <text x="580" y="137" textAnchor="middle" fill="#06b6d4" fontSize="10" fontFamily="monospace">api/</text>
        <text x="580" y="153" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">5 files</text>
      </g>

      <g className="hero-node hero-node-4">
        <rect x="185" y="325" width="70" height="50" rx="8" fill="#0f172a" stroke="#06b6d4" strokeWidth="1" opacity="0.7" />
        <text x="220" y="347" textAnchor="middle" fill="#06b6d4" fontSize="10" fontFamily="monospace" opacity="0.7">utils/</text>
        <text x="220" y="363" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace" opacity="0.5">3 files</text>
      </g>

      <g className="hero-node hero-node-5" filter="url(#glow-sm)">
        <rect x="365" y="295" width="70" height="50" rx="8" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
        <text x="400" y="317" textAnchor="middle" fill="#10b981" fontSize="10" fontFamily="monospace">hooks/</text>
        <text x="400" y="333" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">6 files</text>
      </g>

      {/* Error node */}
      <g className="hero-node hero-node-6">
        <rect x="565" y="275" width="70" height="50" rx="8" fill="#0f172a" stroke="#ef4444" strokeWidth="1.5" />
        <text x="600" y="297" textAnchor="middle" fill="#ef4444" fontSize="10" fontFamily="monospace">auth/</text>
        <text x="600" y="313" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="monospace">2 errors</text>
        <circle cx="570" cy="280" r="6" fill="#0f172a" stroke="#ef4444" strokeWidth="1" />
        <text x="570" y="283" textAnchor="middle" fill="#ef4444" fontSize="7" fontWeight="bold">!</text>
      </g>

      {/* Peripheral dim nodes */}
      <g opacity="0.3">
        <rect x="85" y="255" width="60" height="40" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
        <text x="115" y="278" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">config/</text>
      </g>
      <g opacity="0.3">
        <rect x="645" y="195" width="60" height="40" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
        <text x="675" y="218" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">tests/</text>
      </g>
    </svg>
  );
}

function StreamingPreview() {
  const [tokens, setTokens] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const streamText = "Analyzing repository structure... Found 47 directories with 312 source files. Dependency graph built with 128 edges. Detected 3 potential issues in auth module: unused imports in middleware.ts, missing error boundary in AuthProvider.tsx. Intent analysis complete. Generating visual map...";

  useEffect(() => {
    const words = streamText.split(' ');
    let i = 0;
    const interval = setInterval(() => {
      if (i < words.length) {
        setTokens(prev => [...prev, words[i]]);
        i++;
      } else {
        i = 0;
        setTokens([]);
      }
    }, 120);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [tokens]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-800/60 bg-[#050a14]">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/40 bg-slate-900/30">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-mono text-slate-400">AI Agent - Streaming Analysis</span>
      </div>
      <div ref={containerRef} className="p-4 h-32 overflow-hidden font-mono text-xs leading-relaxed">
        <span className="text-slate-400">
          {tokens.map((token, i) => {
            const isError = token.includes('issues') || token.includes('unused') || token.includes('missing');
            const isSuccess = token.includes('complete') || token.includes('Built') || token.includes('Found');
            return (
              <span
                key={i}
                className={`inline ${isError ? 'text-red-400' : isSuccess ? 'text-emerald-400' : 'text-slate-300'}`}
              >
                {token}{' '}
              </span>
            );
          })}
          <span className="inline-block w-1.5 h-4 bg-cyan-400 animate-pulse ml-0.5 align-text-bottom" />
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) {
      toast.error("Please enter a GitHub repository URL");
      return;
    }

    setIsAnalyzing(true);

    try {
      let raw = repoUrl.trim()
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/^github\.com\//i, '')
        .split('#')[0]
        .split('?')[0]
        .replace(/\/+$/, '')
        .replace(/\.git$/i, '');

      const parts = raw.split('/');
      const owner = parts[0];
      const repoName = parts[1];

      if (!owner || !repoName) {
        toast.error('Invalid GitHub URL. Use format: github.com/owner/repo');
        setIsAnalyzing(false);
        return;
      }

      localStorage.setItem('codemap_current_repo', JSON.stringify({ url: repoUrl, owner, repoName }));
      navigate(`/repo/${owner}/${repoName}`);

    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("Failed to start analysis. Please try again.");
      setIsAnalyzing(false);
    }
  };

  const features = [
    {
      icon: <ScanIcon className="text-cyan-400" size={28} />,
      title: "Intent-Aware Analysis",
      description: "AI agents read READMEs, docstrings, and comments to understand what code is supposed to do, then verify it actually does.",
    },
    {
      icon: <GraphIcon className="text-emerald-400" size={28} />,
      title: "Visual Dependency Maps",
      description: "Navigate your codebase as an interactive graph. Click any directory to drill down. See import relationships as flowing edges.",
    },
    {
      icon: <ErrorDetectIcon className="text-red-400" size={28} />,
      title: "Error Detection",
      description: "Red-highlighted nodes instantly reveal where code diverges from its stated intent. Error propagation flows through the entire tree.",
    },
    {
      icon: <WebhookIcon className="text-amber-400" size={28} />,
      title: "Auto Re-analysis",
      description: "Connect GitHub webhooks to automatically re-analyze on every push. Stay ahead of regressions without manual effort.",
    },
    {
      icon: <RecursiveIcon className="text-purple-400" size={28} />,
      title: "Recursive Architecture",
      description: "One AI agent per directory. Each agent understands its scope and reports up to its parent, exactly how your team operates.",
    },
    {
      icon: <SpeedIcon className="text-blue-400" size={28} />,
      title: "Instant Navigation",
      description: "Generated static maps load instantly. Navigate complex repositories without waiting for repeated analyses.",
    },
  ];

  const showcaseItems = [
    {
      label: "Dependency Graph",
      desc: "See every import relationship as an interactive, navigable map.",
    },
    {
      label: "Error Propagation",
      desc: "Errors in leaf files bubble up to parent directories, highlighted in real-time.",
    },
    {
      label: "AI Streaming",
      desc: "Watch the AI analyze your codebase in real-time with live token streaming.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Background ambient effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-white/[0.06] bg-[#030712]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CodeMapLogo size={28} />
            <span className="text-lg font-semibold tracking-tight text-white">CodeMap</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Dashboard
            </button>
            <button
              className="px-5 py-2 text-sm font-medium text-white bg-white/[0.08] hover:bg-white/[0.12] rounded-full border border-white/[0.08] transition-all"
              onClick={() => {
                document.getElementById('analyze-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main className="relative pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-12 items-center py-20">
            {/* Left - Text */}
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] text-xs text-slate-400 mb-8">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Powered by AI Agents
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
                <span className="text-white">Understand</span>
                <br />
                <span className="text-white">any codebase</span>
                <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                  instantly.
                </span>
              </h1>

              <p className="text-lg text-slate-400 leading-relaxed max-w-lg mb-10">
                AI-powered recursive analysis that maps dependencies,
                detects intent mismatches, and surfaces errors visually.
                Paste a GitHub URL. Get a complete map.
              </p>

              <div id="analyze-section" className="max-w-lg">
                <form onSubmit={handleAnalyze} className="relative">
                  <div className="flex items-center bg-white/[0.05] border border-white/[0.1] rounded-2xl p-1.5 focus-within:border-cyan-500/40 focus-within:bg-white/[0.07] transition-all shadow-2xl shadow-black/40">
                    <div className="pl-3">
                      <GitHubIcon className="text-slate-500" size={20} />
                    </div>
                    <Input
                      placeholder="github.com/owner/repo"
                      className="border-0 bg-transparent focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 text-base text-white placeholder:text-slate-600 shadow-none"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                    />
                    <Button
                      type="submit"
                      className="h-10 px-6 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-medium rounded-xl border-0 shadow-lg shadow-cyan-500/20 transition-all shrink-0"
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <span className="flex items-center gap-2">
                          <LoaderIcon size={16} /> Analyzing
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Analyze <ArrowRightIcon size={16} />
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
                <p className="text-xs text-slate-600 mt-3 pl-1">
                  No sign-up required. Works with any public repository.
                </p>
              </div>
            </div>

            {/* Right - Animated Graph Preview */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-r from-[#030712] via-transparent to-transparent z-10 pointer-events-none" />
              <div className="hero-graph-container relative">
                <HeroGraphSVG />
              </div>
            </div>
          </div>
        </section>

        {/* Product Showcase - "Give users a taste" */}
        <section className="relative py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
                See it in action
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Watch how CodeMap transforms a GitHub URL into a complete, navigable dependency map with AI-powered error detection.
              </p>
            </div>

            <div className="grid lg:grid-cols-5 gap-8 items-start">
              {/* Left - Feature tabs */}
              <div className="lg:col-span-2 space-y-3">
                {showcaseItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveFeature(i)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all duration-500 ${
                      activeFeature === i
                        ? 'bg-white/[0.06] border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                        : 'bg-transparent border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-1.5 h-1.5 rounded-full transition-colors ${activeFeature === i ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                      <span className={`text-sm font-semibold transition-colors ${activeFeature === i ? 'text-white' : 'text-slate-400'}`}>
                        {item.label}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed pl-[18px] transition-colors ${activeFeature === i ? 'text-slate-300' : 'text-slate-500'}`}>
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>

              {/* Right - Visual preview */}
              <div className="lg:col-span-3">
                <div className="rounded-2xl border border-white/[0.06] bg-[#0a0f1a] overflow-hidden shadow-2xl shadow-black/50">
                  {/* Window chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.04] bg-white/[0.02]">
                    <div className="w-3 h-3 rounded-full bg-white/[0.08]" />
                    <div className="w-3 h-3 rounded-full bg-white/[0.08]" />
                    <div className="w-3 h-3 rounded-full bg-white/[0.08]" />
                    <div className="flex-1 mx-4">
                      <div className="bg-white/[0.04] rounded-md px-3 py-1 text-xs text-slate-500 font-mono text-center">
                        codemap.dev/repo/facebook/react
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {activeFeature === 0 && (
                      <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="aspect-[16/9] relative">
                          <HeroGraphSVG />
                        </div>
                      </div>
                    )}
                    {activeFeature === 1 && (
                      <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="grid grid-cols-3 gap-3">
                          {['src/', 'components/', 'auth/'].map((name, i) => (
                            <div
                              key={name}
                              className={`p-4 rounded-xl border text-center ${
                                i === 2
                                  ? 'border-red-500/40 bg-red-950/20'
                                  : i === 1
                                  ? 'border-amber-500/30 bg-amber-950/10'
                                  : 'border-slate-700/50 bg-slate-900/30'
                              }`}
                            >
                              <FolderIcon className={i === 2 ? 'text-red-400 mx-auto mb-2' : i === 1 ? 'text-amber-400 mx-auto mb-2' : 'text-cyan-400 mx-auto mb-2'} size={24} />
                              <div className="text-xs font-mono text-slate-300">{name}</div>
                              {i === 2 && <div className="text-[10px] text-red-400 mt-1">2 errors</div>}
                              {i === 1 && <div className="text-[10px] text-amber-400 mt-1">propagated</div>}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2">
                          <div className="w-3 h-[1px] bg-red-500" />
                          <span>Error propagation flows from leaf files up through parent directories</span>
                        </div>
                      </div>
                    )}
                    {activeFeature === 2 && (
                      <div className="animate-in fade-in duration-500">
                        <StreamingPreview />
                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/40">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Input Tokens</div>
                            <div className="text-lg font-mono text-slate-200 mt-1">2,847</div>
                          </div>
                          <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/40">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Output Tokens</div>
                            <div className="text-lg font-mono text-cyan-400 mt-1">1,203</div>
                          </div>
                          <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/40">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Latency</div>
                            <div className="text-lg font-mono text-emerald-400 mt-1">0.8s</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="relative py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
                Built for understanding
              </h2>
              <p className="text-lg text-slate-400 max-w-xl mx-auto">
                Every feature is designed to help you navigate and comprehend complex codebases faster.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="group p-6 rounded-2xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="relative py-32 border-t border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-4xl sm:text-5xl font-bold text-center text-white tracking-tight mb-20">
              Three steps. No setup.
            </h2>

            <div className="grid md:grid-cols-3 gap-12">
              {[
                { n: "01", title: "Paste a URL", desc: "Enter any public GitHub repository URL. No authentication or sign-up required." },
                { n: "02", title: "AI Analyzes", desc: "Recursive agents parse every directory, extract imports, and detect intent mismatches." },
                { n: "03", title: "Explore the Map", desc: "Navigate an interactive dependency graph. Click directories to drill down. Spot errors instantly." },
              ].map((step, i) => (
                <div key={i} className="relative text-center">
                  <div className="text-5xl font-bold text-white/[0.05] mb-4 font-mono">{step.n}</div>
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-8 -right-6 text-slate-700">
                      <ArrowRightIcon size={20} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-32">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-6">
              Ready to map your codebase?
            </h2>
            <p className="text-lg text-slate-400 mb-10">
              Paste a GitHub URL above and see your repository come alive as an interactive dependency graph.
            </p>
            <button
              onClick={() => document.getElementById('analyze-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-medium text-white bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 rounded-full shadow-lg shadow-cyan-500/20 transition-all"
            >
              Get Started <ArrowRightIcon size={18} />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.04] py-8 text-center text-slate-600 text-sm">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CodeMapLogo size={20} />
            <span className="text-slate-500">CodeMap</span>
          </div>
          <p>Built for hackathons. Powered by AI + Convex.</p>
        </div>
      </footer>
    </div>
  );
}

function FolderIcon({ className = '', size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 7V5a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}
