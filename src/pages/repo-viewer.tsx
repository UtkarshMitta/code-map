import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { 
  Folder, 
  File, 
  ArrowLeft, 
  ChevronRight, 
  Loader2, 
  X, 
  AlertTriangle,
  Star,
  ExternalLink,
  AlertCircle,
  ChevronDown,
  Info,
  Bug,
  Zap,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer, 
  CartesianGrid
} from 'recharts';
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CEREBRAS_API_KEY = import.meta.env.VITE_CEREBRAS_API_KEY as string;

// --- Utility Functions ---

const resolveImportPath = (currentFilePath: string, importPath: string) => {
  if (!currentFilePath || typeof currentFilePath !== 'string') return null;
  if (!importPath || typeof importPath !== 'string') return null;
  if (!importPath.startsWith('.')) return null; // Ignore node_modules/absolute imports for now
  
  const stack = currentFilePath.split('/');
  stack.pop(); // Remove filename
  
  const parts = importPath.split('/');
  
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  
  return stack.join('/');
};

const resolvePythonImport = (currentFilePath: string, importString: string, allPaths: Set<string>) => {
  if (!currentFilePath || typeof currentFilePath !== 'string') return null;
  if (!importString || typeof importString !== 'string') return null;
  const isExplicitInit = importString.endsWith('__init__');

  // 1. Handle relative imports (starting with .)
  if (importString.startsWith('.')) {
    let dotCount = 0;
    while (dotCount < importString.length && importString[dotCount] === '.') {
      dotCount++;
    }
    
    const parts = importString.slice(dotCount).split('.');
    const validParts = parts.filter(p => p.length > 0);
    
    const currentDirParts = currentFilePath.split('/').slice(0, -1);
    const pops = dotCount - 1;
    
    if (pops > 0) {
      if (pops > currentDirParts.length) return null; 
      currentDirParts.splice(-pops, pops);
    }
    
    const basePath = currentDirParts.join('/');
    const relativePath = validParts.join('/');
    const potentialPath = basePath 
      ? (relativePath ? `${basePath}/${relativePath}` : basePath) 
      : relativePath;

    if (allPaths.has(potentialPath + '.py')) return potentialPath + '.py';
    if (!isExplicitInit && allPaths.has(potentialPath)) return potentialPath;
    if (allPaths.has(potentialPath + '/__init__.py')) return potentialPath + '/__init__.py';
    
    return null;
  }

  // 2. Handle absolute imports
  const parts = importString.split('.');
  const asPath = parts.join('/');
  if (allPaths.has(asPath + '.py')) return asPath + '.py';
  if (!isExplicitInit && allPaths.has(asPath)) return asPath;
  if (allPaths.has(asPath + '/__init__.py')) return asPath + '/__init__.py';
  
  if (parts.length > 1) {
    const parentPath = parts.slice(0, -1).join('/');
    if (allPaths.has(parentPath + '.py')) return parentPath + '.py';
    if (!parentPath.endsWith('__init__') && allPaths.has(parentPath)) return parentPath;
    if (allPaths.has(parentPath + '/__init__.py')) return parentPath + '/__init__.py';
  }

  const commonPrefixes = ['src', 'lib', 'app', 'python'];
  for (const prefix of commonPrefixes) {
    const prefixedPath = `${prefix}/${asPath}`;
    if (allPaths.has(prefixedPath + '.py')) return prefixedPath + '.py';
    if (!isExplicitInit && allPaths.has(prefixedPath)) return prefixedPath;
    if (allPaths.has(prefixedPath + '/__init__.py')) return prefixedPath + '/__init__.py';
  }

  return null;
};

const parseImports = (content: string, fileExtension: string) => {
  const imports: string[] = [];
  
  if (['js', 'jsx', 'ts', 'tsx', 'vue', 'svelte'].includes(fileExtension)) {
    const regex = /(?:import|from|require\(|import\()['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.')) {
         imports.push(importPath); 
      }
    }
  }
  
  if (fileExtension === 'py') {
     const fromRegex = /^\s*from\s+([\.\w]+)\s+import/gm;
     let match;
     while ((match = fromRegex.exec(content)) !== null) {
       imports.push(match[1]);
     }

     const importRegex = /^\s*import\s+([\.\w]+)/gm;
     while ((match = importRegex.exec(content)) !== null) {
       imports.push(match[1]);
     }
  }

  return imports;
};

const analyzeFileForErrors = (content: string, filePath: string): string[] => {
  const errors: string[] = [];
  
  if (!content || content.trim() === '') {
    return ["Empty file"];
  }

  if (content.includes("FORCE_ERROR")) {
    errors.push("Forced error for debugging");
  }

  // Check for unmatched braces/brackets/parentheses
  const stack: string[] = [];
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  
  for (const char of content) {
    if (['(', '[', '{'].includes(char)) {
      stack.push(char);
    } else if ([')', ']', '}'].includes(char)) {
      const last = stack.pop();
      if (!last || pairs[last] !== char) {
        errors.push(`Unmatched closing '${char}'`);
        break; 
      }
    }
  }
  if (stack.length > 0) {
    errors.push(`Unmatched opening '${stack[0]}'`);
  }

  // Detect obvious syntax markers
  if (content.includes('SyntaxError')) errors.push("Detected 'SyntaxError' in content");
  if (content.includes('undefined is not')) errors.push("Detected 'undefined is not...' runtime error pattern");
  if (content.includes('Cannot read property')) errors.push("Detected 'Cannot read property...' runtime error pattern");
  
  // Unresolved imports (heuristic - basic check for empty imports)
  const importRegex = /import\s+.*\s+from\s+['"]([^'"]*)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    if (match[1].trim() === '') {
        errors.push("Empty import path detected");
    }
  }

  // Python specific checks
  if (filePath && filePath.endsWith('.py')) {
    if (content.includes('IndentationError')) errors.push("Detected 'IndentationError'");
    
    const hasTabs = /\t/.test(content);
    const hasSpaces = /  /.test(content);
    if (hasTabs && hasSpaces) {
        errors.push("Mixed tabs and spaces detected");
    }
  }

  return errors;
};

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_: any) {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-[#020817] text-slate-100 min-h-screen flex flex-col items-center justify-center">
          <h2 className="text-xl font-bold text-red-500 mb-4">Something went wrong.</h2>
          <Button onClick={() => window.location.reload()} variant="outline">Reload Page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function RepoViewerPage() {
  return (
    <ErrorBoundary>
      <RepoViewerContent />
    </ErrorBoundary>
  );
}

function RepoViewerContent() {
  const { owner, repoName } = useParams<{ owner: string; repoName: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [dirIndex, setDirIndex] = useState<Map<string, any[]>>(new Map());
  const [allPaths, setAllPaths] = useState<Set<string>>(new Set());
  const [repoMeta, setRepoMeta] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedNode, setSelectedNode] = useState<string|null>(null);
  const [fileDeps, setFileDeps] = useState<Map<string, string[]>>(new Map()); 
  const [analyzingDeps, setAnalyzingDeps] = useState(false);
  
  // New Error State
  const [errorFiles, setErrorFiles] = useState<Map<string, string[]>>(new Map());
  const [tokenCounts, setTokenCounts] = useState<Map<string, number>>(new Map());
  const [countingNode, setCountingNode] = useState<string | null>(null);
  const analyzedFilesRef = useRef<Set<string>>(new Set());
  const [analyzeAll, setAnalyzeAll] = useState(false);

  // Generation & Token Tracking State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showTokenPanel, setShowTokenPanel] = useState(true);
  const [generationStats, setGenerationStats] = useState<{
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    history: Array<{ step: string; input: number; output: number; total: number; duration: number }>;
  }>({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    history: []
  });

  const simulateGeneration = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStats({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      history: []
    });
    setShowTokenPanel(true);

    // Trigger full analysis immediately at start and wait for it to complete
    // This ensures error highlights appear before the simulation steps proceed
    await performAnalysis(true);

    // Start actual generation in background with Cerebras
    let realUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;
    let fullContent = "";
    (async () => {
       try {
          const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${CEREBRAS_API_KEY}`
            },
            body: JSON.stringify({
              model: "llama3.1-8b",
              messages: [{ role: "user", content: `Analyze the repository ${owner}/${repoName}. Provide a summary of the structure and key components.` }],
              max_tokens: 1024
            })
          });

          if (response.ok) {
            const data = await response.json();
            // Extract content as requested
            const content = data.choices?.[0]?.message?.content;
            if (content) fullContent = content;
            console.log("Analysis Result:", content);
            if (data.usage) {
              realUsage = data.usage;
            }
          }
       } catch (e) {
          console.error("Cerebras API Error:", e);
       }
    })();

    const steps = [
      { name: "Analyzing Dependencies", baseInput: 1200, baseOutput: 150 },
      { name: "Building Graph", baseInput: 800, baseOutput: 300 },
      { name: "Detecting Patterns", baseInput: 2500, baseOutput: 600 },
      { name: "Optimizing Layout", baseInput: 1500, baseOutput: 400 },
      { name: "Generating Summary", baseInput: 3000, baseOutput: 1200 }
    ];

    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep >= steps.length) {
        clearInterval(interval);
        setIsGenerating(false);
        setGenerationProgress(100);
        
        // Update with real usage if available
        if (realUsage) {
           setGenerationStats(prev => ({
              ...prev,
              inputTokens: realUsage!.prompt_tokens,
              outputTokens: realUsage!.completion_tokens,
              totalTokens: Math.ceil((fullContent || "").length / 4),
           }));
        }
        return;
      }

      const step = steps[currentStep];
      // Add some randomness
      const input = Math.floor(step.baseInput * (0.8 + Math.random() * 0.4));
      const output = Math.floor(step.baseOutput * (0.8 + Math.random() * 0.4));
      const total = input + output;
      const duration = Math.floor(200 + Math.random() * 800);

      setGenerationStats(prev => {
        const newHistory = [
          ...prev.history, 
          { 
            step: step.name, 
            input, 
            output, 
            total,
            duration
          }
        ];
        return {
          inputTokens: prev.inputTokens + input,
          outputTokens: prev.outputTokens + output,
          totalTokens: prev.totalTokens + output,
          history: newHistory
        };
      });

      setGenerationProgress(((currentStep + 1) / steps.length) * 100);
      currentStep++;
    }, 1500); // 1.5s per step
  };

  // Reset analysis when repo changes
  useEffect(() => {
    analyzedFilesRef.current.clear();
    setFileDeps(new Map());
    setErrorFiles(new Map());
    setAnalyzingDeps(false);
    setTokenCounts(new Map());
  }, [owner, repoName]);

  // Load Repository
  useEffect(() => {
    if (!owner || !repoName) {
      setError("Repository information missing from URL");
      setLoading(false);
      return;
    }

    const loadRepo = async () => {
      try {
        setLoading(true);
        setError(null);

        const cleanRepoName = repoName.replace(/\.git$/i, '');
        const headers = {
          'Accept': 'application/vnd.github.v3+json'
        };

        const metaRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepoName}`, { headers });
        
        if (metaRes.status === 404) throw new Error("Repository not found or is private");
        if (metaRes.status === 403 || metaRes.status === 429) {
          throw new Error("GitHub rate limit exceeded — please wait a moment");
        }
        if (!metaRes.ok) throw new Error(`Failed to fetch repository details (${metaRes.status})`);

        const meta = await metaRes.json();
        setRepoMeta(meta);
        const defaultBranch = meta.default_branch || 'main';

        const branchesToTry = [defaultBranch, 'main', 'master', 'HEAD'];
        const uniqueBranches = [...new Set(branchesToTry)];
        
        let treeData = null;

        for (const branch of uniqueBranches) {
          try {
            const treeRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepoName}/git/trees/${branch}?recursive=1`, { headers });
            
            if (treeRes.ok) {
              treeData = await treeRes.json();
              break;
            }
            
            if (treeRes.status === 403 || treeRes.status === 429) {
              throw new Error("GitHub rate limit exceeded — please wait a moment");
            }
          } catch (e: any) {
             if (e.message.includes("rate limit")) throw e;
          }
        }
        
        if (!treeData) {
           throw new Error("Failed to fetch repository structure");
        }

        const index = new Map<string, any[]>();
        const paths = new Set<string>();
        index.set('', []); 

        if (treeData.truncated) {
          console.warn("Repository tree is truncated (too large)");
        }

        for (const item of treeData.tree) {
          paths.add(item.path);
          const parts = item.path.split('/');
          const name = parts[parts.length - 1];
          const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
          
          if (!index.has(parentPath)) {
            index.set(parentPath, []);
          }
          
          index.get(parentPath)?.push({ ...item, name });
          
          if (item.type === 'tree' && !index.has(item.path)) {
            index.set(item.path, []);
          }
        }

        setDirIndex(index);
        setAllPaths(paths);

      } catch (err: any) {
        console.error(err);
        setError(err.message || "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    loadRepo();
  }, [owner, repoName]);

  const currentChildren = dirIndex.get(currentPath) || [];
  
  currentChildren.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'tree' ? -1 : 1;
  });

  const dirs = currentChildren.filter(n => n.type === 'tree');
  const files = currentChildren.filter(n => n.type === 'blob');

  const contentHeight = Math.max(
    dirs.length * 120 + 60,
    files.length * 80 + 40
  );
  const minHeight = 600;
  const canvasHeight = Math.max(contentHeight, minHeight);

  const breadcrumbParts = currentPath ? currentPath.split('/') : [];

  const [scanTrigger, setScanTrigger] = useState(0);

  const performAnalysis = React.useCallback(async (forceAll: boolean = false) => {
    if (!repoMeta) return;
    
    const cleanRepoName = repoName?.replace(/\.git$/i, '') || '';
    let filesToAnalyze: any[] = [];

    if (forceAll) {
       const allFiles: any[] = [];
       dirIndex.forEach((children) => {
          if (children) allFiles.push(...children.filter(n => n.type === 'blob'));
       });
       
       filesToAnalyze = allFiles.filter(node => 
          ['js', 'jsx', 'ts', 'tsx', 'vue', 'svelte', 'py'].includes(node.name?.split('.').pop()?.toLowerCase() || '') &&
          (!analyzedFilesRef.current.has(node.path) || scanTrigger > 0)
       );
    } else {
       filesToAnalyze = currentChildren.filter(node => 
         node.type === 'blob' && 
         ['js', 'jsx', 'ts', 'tsx', 'vue', 'svelte', 'py'].includes(node.name?.split('.').pop()?.toLowerCase() || '') &&
         (!analyzedFilesRef.current.has(node.path) || scanTrigger > 0)
       );
    }
    
    if (filesToAnalyze.length === 0) {
      if (forceAll) setAnalyzeAll(false);
      return;
    }

    console.log(`[Analysis] Starting analysis for ${forceAll ? 'ALL' : 'current'} files:`, filesToAnalyze.length);

    setAnalyzingDeps(true);
    
    // Mark as analyzing immediately
    filesToAnalyze.forEach(f => analyzedFilesRef.current.add(f.path));

    const allBatchErrors = new Map<string, string[]>();
    const allBatchDeps = new Map<string, string[]>();

    const processBatch = async (batch: any[]) => {
      await Promise.all(batch.map(async (file) => {
        try {
          // console.log(`[Analysis] Fetching ${file.path}...`);
          const res = await fetch(`https://api.github.com/repos/${owner}/${cleanRepoName}/git/blobs/${file.sha}`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
          });
          
          if (res.ok) {
            const data = await res.json();
            const content = atob(data.content);
            const extension = file.name.split('.').pop()?.toLowerCase() || '';
            const imports = parseImports(content, extension);
            
            // Analyze errors
            const errors = analyzeFileForErrors(content, file.path);
            if (errors.length > 0) {
               allBatchErrors.set(file.path, errors);
            }
            
            // Resolve imports
            let resolvedImports: string[] = [];

            if (extension === 'py') {
               resolvedImports = imports
                  .map(imp => resolvePythonImport(file.path, imp, allPaths))
                  .filter((p): p is string => !!p);
            } else {
               resolvedImports = imports.map(imp => {
                   if (allPaths.has(imp)) return imp;
                   const resolveRelative = resolveImportPath(file.path, imp);
                   if (resolveRelative) {
                        if (allPaths.has(resolveRelative)) return resolveRelative;
                        // Try extensions
                        const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.json'];
                        for (const ext of extensions) {
                            if (allPaths.has(resolveRelative + ext)) return resolveRelative + ext;
                        }
                        // Try index
                        for (const ext of extensions) {
                            if (allPaths.has(resolveRelative + '/index' + ext)) return resolveRelative + '/index' + ext;
                        }
                   }
                   return null;
               }).filter((p): p is string => !!p);
            }

            allBatchDeps.set(file.path, resolvedImports);
          }
        } catch (e: any) {
          console.error(`[Analysis] Failed to analyze ${file.path}`, e);
          allBatchErrors.set(file.path, [`Analysis failed: ${e.message || 'Unknown error'}`]);
        }
      }));
    };

    // Parallelize more aggressively for simulation/analyzeAll
    const BATCH_SIZE = forceAll ? 20 : 5; 
    for (let i = 0; i < filesToAnalyze.length; i += BATCH_SIZE) {
      const batch = filesToAnalyze.slice(i, i + BATCH_SIZE);
      await processBatch(batch);
    }

    // Batch update state at the end
    if (allBatchDeps.size > 0) {
        setFileDeps(prev => {
            const next = new Map(prev);
            allBatchDeps.forEach((v, k) => next.set(k, v));
            return next;
        });
    }

    if (allBatchErrors.size > 0) {
        setErrorFiles(prev => {
            const next = new Map(prev);
            allBatchErrors.forEach((v, k) => next.set(k, v));
            return next;
        });
    }

    if (forceAll) setAnalyzeAll(false);
    setAnalyzingDeps(false);
  }, [repoMeta, owner, repoName, dirIndex, currentChildren, allPaths, scanTrigger]);

  // Analyze files for dependencies and errors
  useEffect(() => {
    if (!repoMeta || (currentChildren.length === 0 && !analyzeAll)) return;
    // Only auto-trigger if NOT analyzing all (normal navigation) or if analyzeAll flag is set via state
    // If we call performAnalysis manually, we don't need this to trigger, but it's safe.
    if (analyzeAll) {
        performAnalysis(true);
    } else {
        performAnalysis(false);
    }
  }, [performAnalysis, analyzeAll, repoMeta, currentChildren.length]);

  // Compute directory errors
  const [directoriesWithErrors, setDirectoriesWithErrors] = useState<Set<string>>(new Set());
  
  const totalErrors = useMemo(() => {
    let count = 0;
    errorFiles.forEach((errors) => count += errors.length);
    return count;
  }, [errorFiles]);

  useEffect(() => {
    // Agent-style Propagation Comment:
    // File analysis agents report errors -> errorNodes (errorFiles) Set
    // Parent directory propagation is computed from errorNodes -> directoriesWithErrors Set
    // Edge highlighting reads from errorNodes for source file

    if (!errorFiles || errorFiles.size === 0) {
      setDirectoriesWithErrors(new Set());
      return;
    }

    console.log("[Analysis] Computing directory errors from:", Array.from(errorFiles.keys()));

    try {
      const newDirectoriesWithErrors = new Set<string>();

      for (const errorPath of errorFiles.keys()) {
        if (!errorPath || typeof errorPath !== 'string') continue;
        
        const parts = errorPath.split('/');
        // For src/components/Button.tsx:
        // Ancestors: src, src/components
        
        let currentPath = '';
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          newDirectoriesWithErrors.add(currentPath);
        }
      }

      console.log("[Analysis] Directories with errors:", Array.from(newDirectoriesWithErrors));
      setDirectoriesWithErrors(newDirectoriesWithErrors);
    } catch (e) {
      console.error("Error computing directory errors:", e);
      setDirectoriesWithErrors(new Set());
    }
  }, [errorFiles]);

  // Token Estimation Logic
  useEffect(() => {
    if (!selectedNode || !owner || !repoName) return;
    
    const node = files.find(n => n.path === selectedNode);
    if (!node || node.type !== 'blob') return;

    if (tokenCounts.has(selectedNode)) return;

    const countTokens = async () => {
      try {
        setCountingNode(selectedNode);
        const cleanRepoName = repoName.replace(/\.git$/i, '');
        const res = await fetch(`https://api.github.com/repos/${owner}/${cleanRepoName}/git/blobs/${node.sha}`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        
        if (res.ok) {
            const data = await res.json();
            const content = atob(data.content);
            const count = Math.ceil(content.length / 4);
            setTokenCounts(prev => new Map(prev).set(node.path, count));
        }
      } catch (e) {
        console.error("Token count failed", e);
      } finally {
        setCountingNode(null);
      }
    };

    countTokens();
  }, [selectedNode, owner, repoName, files, tokenCounts]);

  const handleNodeClick = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    setSelectedNode(prev => prev === path ? null : path);
  };

  const edges = useMemo(() => {
    const newEdges: { source: any; target: any; sourceType: 'file' | 'dir'; targetType: 'file' | 'dir' }[] = [];
    const seen = new Set<string>();

    fileDeps.forEach((imports, sourcePath) => {
      let sourceNode = files.find(f => f.path === sourcePath);
      let sourceType: 'file' | 'dir' = 'file';
      
      if (!sourceNode) {
        sourceNode = dirs.find(d => sourcePath.startsWith(d.path + '/'));
        sourceType = 'dir';
      }

      if (!sourceNode) return;

      imports.forEach(importPath => {
        let targetNode = files.find(f => f.path === importPath);
        let targetType: 'file' | 'dir' = 'file';

        if (!targetNode) {
          targetNode = dirs.find(d => d.path === importPath);
          if (targetNode) {
            targetType = 'dir';
          } else {
            targetNode = dirs.find(d => importPath.startsWith(d.path + '/'));
            targetType = 'dir';
          }
        }

        if (!targetNode) return;
        if (sourceNode!.path === targetNode!.path) return;

        const edgeId = `${sourceNode!.path}->${targetNode!.path}`;
        if (!seen.has(edgeId)) {
          seen.add(edgeId);
          // Arrow: from Target (Dependency) to Source (Dependent)
          // Visual direction: target -> source
          newEdges.push({
            source: targetNode, // Dependency
            target: sourceNode, // Dependent
            sourceType: targetType,
            targetType: sourceType
          });
        }
      });
    });

    return newEdges;
  }, [files, dirs, fileDeps]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020817] flex flex-col items-center justify-center text-slate-100">
        <Loader2 className="w-10 h-10 animate-spin text-[#60a5fa] mb-4" />
        <h2 className="text-xl font-mono mb-2">Analyzing {owner}/{repoName}</h2>
        <p className="text-slate-400">Fetching repository structure...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#020817] flex flex-col items-center justify-center text-slate-100 p-6">
        <div className="bg-[#0f172a] border border-[#f43f5e] p-8 rounded-xl max-w-lg w-full text-center">
          <AlertTriangle className="w-12 h-12 text-[#f43f5e] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-[#f43f5e]">Analysis Failed</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <Button 
            onClick={() => navigate('/')}
            className="bg-[#1e293b] hover:bg-[#334155] border border-[#334155]"
          >
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 font-sans overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-[#1e293b] bg-[#0f172a] flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/')} 
            className="text-slate-400 hover:text-white hover:bg-[#1e293b]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-3">
             <span className="font-mono text-lg font-semibold text-slate-100">
               {owner}/{repoName}
             </span>
             {analyzingDeps && <Loader2 className="w-3 h-3 animate-spin text-[#60a5fa]" />}
             {repoMeta && (
               <Badge variant="outline" className="bg-[#1e293b] border-[#334155] text-slate-400 font-mono font-normal">
                 {repoMeta.default_branch}
               </Badge>
             )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help text-slate-500 hover:text-slate-300 transition-colors">
                  <Info className="w-4 h-4" />
                  <span className="text-xs hidden sm:inline">Logs</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-[#1e293b] border-[#334155] text-slate-300 max-w-xs">
                <p>To see analysis logs, open Browser DevTools (F12) → Console tab</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {totalErrors > 0 && (
            <div className="flex items-center gap-2 text-red-500 bg-red-950/30 px-2 py-1 rounded border border-red-900/50">
              <Bug className="w-4 h-4" />
              <span className="font-mono text-xs font-bold">{totalErrors}</span>
            </div>
          )}

          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
                analyzedFilesRef.current.clear();
                setScanTrigger(prev => prev + 1);
            }}
            className="text-slate-400 hover:text-white h-8 text-xs border border-transparent hover:border-slate-700"
            title="Re-scan current folder"
          >
            Re-scan
          </Button>

          <Button 
            variant="default" 
            size="sm"
            onClick={simulateGeneration}
            disabled={isGenerating}
            className={`h-8 text-xs gap-2 ${isGenerating ? 'bg-blue-600/50' : 'bg-blue-600 hover:bg-blue-500'}`}
          >
             {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 fill-current" />}
             {isGenerating ? 'Generating Graph...' : 'Generate Graph'}
          </Button>

          {repoMeta && (
            <div className="flex items-center gap-2 text-slate-400">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-sm">{repoMeta.stargazers_count.toLocaleString()}</span>
            </div>
          )}
          
          <Button 
            asChild
            variant="ghost"
            className="text-slate-400 hover:text-[#60a5fa] hover:bg-transparent transition-colors"
          >
            <a 
              href={`https://github.com/${owner}/${repoName}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <span className="hidden sm:inline">View on GitHub</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="h-12 border-b border-[#1e293b] bg-[#020817] flex items-center px-6 gap-1 overflow-x-auto shrink-0">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => { setCurrentPath(''); setSelectedNode(null); }}
          className={`flex items-center gap-2 px-2 h-8 ${currentPath === '' ? 'text-[#60a5fa] font-bold bg-[#1e293b]/50' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Folder className="w-4 h-4" />
          <span className="font-mono">root</span>
        </Button>
        
        {breadcrumbParts.map((part, i) => {
          const path = breadcrumbParts.slice(0, i + 1).join('/');
          return (
            <React.Fragment key={path}>
              <ChevronRight className="w-4 h-4 text-[#334155]" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCurrentPath(path); setSelectedNode(null); }}
                className={`px-2 h-8 font-mono ${currentPath === path ? 'text-[#60a5fa] font-bold bg-[#1e293b]/50' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {part}
              </Button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div 
          className="flex-1 overflow-auto bg-[#020817] relative custom-scrollbar"
          onClick={(e) => {
             if (e.target === e.currentTarget) setSelectedNode(null);
          }}
        >
          {currentPath !== '' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const parts = currentPath.split('/');
                const parent = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
                setCurrentPath(parent);
                setSelectedNode(null);
              }}
              className="absolute left-6 top-4 z-30 bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white hover:border-[#60a5fa] gap-2 h-8"
            >
              <ArrowLeft className="w-3 h-3" /> Up
            </Button>
          )}

          <div style={{ height: canvasHeight, minWidth: 600, position: 'relative' }}>
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ffffff" />
                </marker>
                <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                </marker>
                <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                </marker>
              </defs>
              
              {edges.map((edge, i) => {
                const sourceIndex = edge.sourceType === 'dir' 
                  ? dirs.findIndex(d => d.path === edge.source.path)
                  : files.findIndex(f => f.path === edge.source.path);
                
                const targetIndex = edge.targetType === 'dir'
                  ? dirs.findIndex(d => d.path === edge.target.path)
                  : files.findIndex(f => f.path === edge.target.path);

                if (sourceIndex === -1 || targetIndex === -1) return null;

                let startX, startY, endX, endY;
                let d = '';

                if (edge.sourceType === 'dir') {
                  startX = 180;
                  startY = 60 + (sourceIndex * 120) + 30;
                } else {
                  startX = edge.targetType === 'dir' ? 260 : 390;
                  startY = 40 + (sourceIndex * 80) + 25;
                }

                if (edge.targetType === 'dir') {
                  endX = 180;
                  endY = 60 + (targetIndex * 120) + 30;
                } else {
                  endX = 390;
                  endY = 40 + (targetIndex * 80) + 25;
                }

                // If same column, curve it
                if (edge.sourceType === edge.targetType) {
                   const offset = 40 + (i % 5) * 10;
                   d = `M ${startX} ${startY} C ${startX + offset} ${startY}, ${endX + offset} ${endY}, ${endX + 5} ${endY}`;
                } else {
                   // Direct
                   d = `M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX - 5} ${endY}`;
                }

                // Error propagation styling
                // Check if source file has errors
                const hasErrors = errorFiles.has(edge.source.path);
                const isErrorFlow = hasErrors; 

                return (
                  <path 
                    key={i} 
                    d={d} 
                    stroke={isErrorFlow ? "#ef4444" : "#334155"} 
                    strokeWidth={isErrorFlow ? 2 : 1}
                    fill="none" 
                    markerEnd={isErrorFlow ? "url(#arrow-red)" : "url(#arrow)"}
                    opacity={isErrorFlow ? 0.8 : 0.4}
                  />
                );
              })}
            </svg>

            {/* Directories */}
            <div className="absolute top-[60px] left-10 w-40 flex flex-col gap-[20px]">
              {dirs.map((dir, i) => {
                 const hasErrors = directoriesWithErrors.has(dir.path);
                 
                 return (
                  <div 
                    key={dir.path} 
                    style={{ height: 100 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        // setCurrentPath(dir.path);
                        // Instead of diving immediately, let's select it first
                        // But actually user expects navigation on folder click often
                        setCurrentPath(dir.path);
                        setSelectedNode(null);
                    }}
                    className={`
                      border rounded-xl p-4 cursor-pointer transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-2 relative
                      ${hasErrors ? 'bg-red-950/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-[#1e293b] border-[#334155] hover:border-[#60a5fa] hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]'}
                    `}
                  >
                    <Folder className={`w-8 h-8 ${hasErrors ? 'text-red-400' : 'text-[#60a5fa]'}`} />
                    <span className="text-sm font-mono truncate w-full text-center text-slate-300">{dir.name}</span>
                    <div className="absolute -right-3 -top-3 bg-[#0f172a] text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-[#334155]">
                      TREE
                    </div>
                    {hasErrors && (
                        <div className="absolute -left-2 -top-2">
                           <AlertCircle className="w-5 h-5 text-red-500 fill-[#0f172a]" />
                        </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Files */}
            <div className="absolute top-[40px] right-10 w-64 flex flex-col gap-[20px]">
              {files.map((file, i) => {
                 const fileErrors = errorFiles.get(file.path);
                 const hasErrors = fileErrors && fileErrors.length > 0;
                 const isSelected = selectedNode === file.path;

                 return (
                  <div 
                    key={file.path} 
                    style={{ height: 60 }}
                    onClick={(e) => handleNodeClick(e, file.path)}
                    className={`
                      border rounded-lg px-4 flex items-center gap-3 cursor-pointer transition-all hover:translate-x-1 relative
                      ${isSelected 
                          ? 'bg-[#1e293b] border-[#60a5fa] ring-1 ring-[#60a5fa] shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
                          : hasErrors 
                             ? 'bg-red-950/10 border-red-500/40 hover:bg-red-900/20' 
                             : 'bg-[#0f172a] border-[#334155] hover:bg-[#1e293b]'
                      }
                    `}
                  >
                    {hasErrors ? (
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                        <File className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#60a5fa]' : 'text-slate-500'}`} />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className={`font-mono text-sm truncate ${hasErrors ? 'text-red-300' : 'text-slate-300'}`}>
                        {file.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                         {hasErrors && <span className="text-[10px] text-red-400">{fileErrors.length} errors</span>}
                      </div>
                    </div>

                    {fileDeps.has(file.path) && fileDeps.get(file.path)!.length > 0 && (
                       <Badge variant="secondary" className="bg-[#1e293b] text-[10px] text-slate-400 h-5 px-1.5 hover:bg-[#334155]">
                         {fileDeps.get(file.path)!.length} deps
                       </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Details & Analysis */}
        <div className={`
           w-80 border-l border-[#1e293b] bg-[#0f172a] flex flex-col shrink-0 transition-all duration-300
           ${selectedNode ? 'mr-0' : '-mr-80'}
        `}>
           {selectedNode && (() => {
              const node = files.find(n => n.path === selectedNode);
              if (!node) return null;

              const errors = errorFiles.get(node.path) || [];
              const deps = fileDeps.get(node.path) || [];
              const extension = node.name.split('.').pop()?.toLowerCase();
              
              // Mock metrics based on file size for demo
              const complexity = Math.min(100, Math.floor(node.size / 50));
              const maintainability = Math.max(0, 100 - complexity - errors.length * 10);
              const reliability = Math.max(0, 100 - errors.length * 20);

              const chartData = [
                { name: 'Complx', value: complexity, fill: '#ef4444' },
                { name: 'Maint', value: maintainability, fill: '#22c55e' },
                { name: 'Relia', value: reliability, fill: '#3b82f6' },
              ];

              return (
                <div className="flex flex-col h-full overflow-hidden">
                   <div className="p-4 border-b border-[#1e293b] flex items-center justify-between bg-[#1e293b]/50">
                      <div className="flex items-center gap-2 overflow-hidden">
                         <File className="w-4 h-4 text-[#60a5fa]" />
                         <span className="font-mono font-bold truncate text-sm">{node.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedNode(null)}>
                         <X className="w-4 h-4" />
                      </Button>
                   </div>

                   <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                      {/* Analysis Status */}
                      <div className="space-y-2">
                         <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Analysis Status</h3>
                         <div className="flex items-center gap-2">
                            {errors.length > 0 ? (
                               <Badge variant="destructive" className="bg-red-900/50 text-red-300 border-red-800">
                                  {errors.length} Issues Found
                               </Badge>
                            ) : (
                               <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                                  No Issues Detected
                               </Badge>
                            )}
                            <Badge variant="outline" className="border-[#334155] text-slate-400">
                               {extension?.toUpperCase()}
                            </Badge>
                         </div>
                      </div>

                      {/* Token Counter */}
                      <div className="space-y-2">
                         <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Token Usage</h3>
                            <span className="text-[10px] text-slate-600">Est.</span>
                         </div>
                         <div className="bg-[#020817] rounded-lg p-3 border border-[#1e293b]">
                             {countingNode === node.path ? (
                                 <div className="flex items-center gap-2 text-slate-400 text-xs">
                                     <Loader2 className="w-3 h-3 animate-spin" /> Counting...
                                 </div>
                             ) : tokenCounts.has(node.path) ? (
                                 <div className="flex items-center justify-between">
                                     <span className="text-slate-400 text-xs">Token Count</span>
                                     <span className="font-mono text-[#60a5fa] font-bold">
                                         {tokenCounts.get(node.path)?.toLocaleString()}
                                     </span>
                                 </div>
                             ) : (
                                 <div className="text-xs text-slate-600 italic">Select to count</div>
                             )}
                         </div>
                      </div>

                      {/* Issues List */}
                      {errors.length > 0 && (
                         <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center gap-2">
                               <AlertTriangle className="w-3 h-3" /> Errors & Warnings
                            </h3>
                            <div className="space-y-1">
                               {errors.map((err, idx) => (
                                  <div key={idx} className="bg-red-950/20 border border-red-900/30 rounded p-2 text-xs text-red-300 leading-relaxed">
                                     {err}
                                  </div>
                               ))}
                            </div>
                         </div>
                      )}

                      {/* Metrics Chart */}
                      <div className="h-40 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                               <XAxis type="number" hide domain={[0, 100]} />
                               <YAxis dataKey="name" type="category" width={40} tick={{fontSize: 10, fill: '#64748b'}} />
                               <ChartTooltip 
                                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                  itemStyle={{ color: '#f8fafc' }}
                                  cursor={{fill: 'transparent'}}
                               />
                               <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                         </ResponsiveContainer>
                      </div>

                      {/* Dependencies */}
                      {deps.length > 0 && (
                         <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dependencies</h3>
                            <div className="flex flex-wrap gap-1">
                               {deps.map((dep, idx) => (
                                  <div key={idx} className="text-[10px] bg-[#1e293b] text-slate-300 px-2 py-1 rounded border border-[#334155] truncate max-w-full">
                                     {dep.split('/').pop()}
                                  </div>
                               ))}
                            </div>
                         </div>
                      )}

                      <div className="pt-4 border-t border-[#1e293b]">
                         <Button className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs h-8">
                            Open in Editor
                         </Button>
                      </div>
                   </div>
                </div>
              );
           })()}
        </div>

        {/* AI Generation Agent Overlay */}
        {showTokenPanel && (
          <div className="absolute bottom-6 left-6 z-40 flex flex-col gap-2">
            <Card className="w-80 bg-[#0f172a]/95 backdrop-blur border-[#334155] shadow-2xl p-4 text-slate-100 animate-in slide-in-from-bottom-5">
               <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                     <span className="font-mono text-sm font-bold">Cerebras Agent</span>
                  </div>
                  {isGenerating ? (
                    <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-400 bg-blue-950/20">PROCESSING</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">IDLE</Badge>
                  )}
               </div>

               <div className="space-y-4">
                  {/* Progress Step */}
                  <div className="space-y-1.5">
                     <div className="flex justify-between text-xs text-slate-400">
                        <span>Current Task</span>
                        <span>{Math.round(generationProgress)}%</span>
                     </div>
                     <Progress value={generationProgress} className="h-1.5 bg-[#1e293b]" indicatorClassName="bg-gradient-to-r from-blue-500 to-indigo-500" />
                     <div className="text-xs font-mono text-slate-300 truncate">
                        {generationStats.history.length > 0 
                           ? `> ${generationStats.history[generationStats.history.length - 1].step}...` 
                           : "> Waiting for input..."}
                     </div>
                  </div>

                  {/* Live Token Stream */}
                  <div className="bg-[#020817] rounded border border-[#1e293b] p-3 space-y-2">
                     <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Total Tokens</span>
                        <span className="text-green-400 font-mono">
                           {generationStats.totalTokens.toLocaleString()}
                        </span>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#1e293b]/50 p-1.5 rounded">
                           <div className="text-[10px] text-slate-500 uppercase">Input</div>
                           <div className="text-sm font-mono text-slate-200">{generationStats.inputTokens.toLocaleString()}</div>
                        </div>
                        <div className="bg-[#1e293b]/50 p-1.5 rounded">
                           <div className="text-[10px] text-slate-500 uppercase">Output</div>
                           <div className="text-sm font-mono text-blue-300">{generationStats.outputTokens.toLocaleString()}</div>
                        </div>
                     </div>
                  </div>
                  
                  {/* Actions */}
                  {!isGenerating && generationStats.totalTokens > 0 && (
                     <Button 
                       size="sm" 
                       variant="outline" 
                       className="w-full h-7 text-xs border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-400"
                       onClick={() => setShowTokenPanel(false)}
                     >
                       Close Panel
                     </Button>
                  )}
               </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
