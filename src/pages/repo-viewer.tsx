import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  CodeMapLogo,
  FolderIcon,
  FileIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  LoaderIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  StarIcon,
  ExternalLinkIcon,
  InfoIcon,
  BugIcon,
  ZapIcon,
} from '@/components/icons';

const CEREBRAS_API_KEY = import.meta.env.VITE_CEREBRAS_API_KEY as string;

// --- Utility Functions ---

const resolveImportPath = (currentFilePath: string, importPath: string) => {
  if (!currentFilePath || typeof currentFilePath !== 'string') return null;
  if (!importPath || typeof importPath !== 'string') return null;
  if (!importPath.startsWith('.')) return null;

  const stack = currentFilePath.split('/');
  stack.pop();

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

  if (content.includes('SyntaxError')) errors.push("Detected 'SyntaxError' in content");
  if (content.includes('undefined is not')) errors.push("Detected 'undefined is not...' runtime error pattern");
  if (content.includes('Cannot read property')) errors.push("Detected 'Cannot read property...' runtime error pattern");

  const importRegex = /import\s+.*\s+from\s+['"]([^'"]*)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    if (match[1].trim() === '') {
      errors.push("Empty import path detected");
    }
  }

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
        <div className="p-8 text-center bg-[#030712] text-slate-100 min-h-screen flex flex-col items-center justify-center">
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

function XCloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
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

  const [errorFiles, setErrorFiles] = useState<Map<string, string[]>>(new Map());
  const [tokenCounts, setTokenCounts] = useState<Map<string, number>>(new Map());
  const [countingNode, setCountingNode] = useState<string | null>(null);
  const analyzedFilesRef = useRef<Set<string>>(new Set());
  const [analyzeAll, setAnalyzeAll] = useState(false);

  // Generation & Streaming State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showTokenPanel, setShowTokenPanel] = useState(true);
  const [streamedText, setStreamedText] = useState('');
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

  const streamContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streamContainerRef.current) {
      streamContainerRef.current.scrollTop = streamContainerRef.current.scrollHeight;
    }
  }, [streamedText]);

  const simulateGeneration = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setStreamedText('');
    setGenerationStats({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      history: []
    });
    setShowTokenPanel(true);

    await performAnalysis(true);

    setGenerationProgress(20);
    setGenerationStats(prev => ({
      ...prev,
      history: [{ step: "Analyzing Dependencies", input: 1200, output: 150, total: 1350, duration: 800 }],
      inputTokens: 1200,
      outputTokens: 150,
      totalTokens: 150,
    }));

    try {
      const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CEREBRAS_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama3.1-8b",
          messages: [{ role: "user", content: `Analyze the repository ${owner}/${repoName}. Provide a concise summary of the structure, key components, and any potential issues you can identify from the repository name and common patterns.` }],
          max_tokens: 1024,
          stream: true
        })
      });

      if (response.ok && response.body) {
        setGenerationProgress(40);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let tokenCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));

          for (const line of lines) {
            const data = line.replace('data: ', '').trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                accumulated += content;
                tokenCount++;
                setStreamedText(accumulated);
                setGenerationStats(prev => ({
                  ...prev,
                  outputTokens: tokenCount,
                  totalTokens: prev.inputTokens + tokenCount,
                }));
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }

        setGenerationProgress(100);
        setGenerationStats(prev => ({
          ...prev,
          history: [
            ...prev.history,
            { step: "Building Graph", input: 800, output: 300, total: 1100, duration: 600 },
            { step: "AI Analysis (Streamed)", input: prev.inputTokens, output: tokenCount, total: prev.inputTokens + tokenCount, duration: 2000 },
          ],
        }));
      } else {
        // Fallback to non-streaming
        const fallbackRes = await fetch("https://api.cerebras.ai/v1/chat/completions", {
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

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const content = fallbackData.choices?.[0]?.message?.content || '';
          setStreamedText(content);
          if (fallbackData.usage) {
            setGenerationStats(prev => ({
              ...prev,
              inputTokens: fallbackData.usage.prompt_tokens,
              outputTokens: fallbackData.usage.completion_tokens,
              totalTokens: fallbackData.usage.prompt_tokens + fallbackData.usage.completion_tokens,
            }));
          }
        }
        setGenerationProgress(100);
      }
    } catch (e) {
      console.error("Cerebras API Error:", e);
      setStreamedText('Analysis could not be completed. Check your API key and network connection.');
      setGenerationProgress(100);
    }

    setIsGenerating(false);
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
          throw new Error("GitHub rate limit exceeded -- please wait a moment");
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
              throw new Error("GitHub rate limit exceeded -- please wait a moment");
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

    setAnalyzingDeps(true);

    filesToAnalyze.forEach(f => analyzedFilesRef.current.add(f.path));

    const allBatchErrors = new Map<string, string[]>();
    const allBatchDeps = new Map<string, string[]>();

    const processBatch = async (batch: any[]) => {
      await Promise.all(batch.map(async (file) => {
        try {
          const res = await fetch(`https://api.github.com/repos/${owner}/${cleanRepoName}/git/blobs/${file.sha}`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
          });

          if (res.ok) {
            const data = await res.json();
            const content = atob(data.content);
            const extension = file.name.split('.').pop()?.toLowerCase() || '';
            const imports = parseImports(content, extension);

            const errors = analyzeFileForErrors(content, file.path);
            if (errors.length > 0) {
              allBatchErrors.set(file.path, errors);
            }

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
                  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.json'];
                  for (const ext of extensions) {
                    if (allPaths.has(resolveRelative + ext)) return resolveRelative + ext;
                  }
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

    const BATCH_SIZE = forceAll ? 20 : 5;
    for (let i = 0; i < filesToAnalyze.length; i += BATCH_SIZE) {
      const batch = filesToAnalyze.slice(i, i + BATCH_SIZE);
      await processBatch(batch);
    }

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

  useEffect(() => {
    if (!repoMeta || (currentChildren.length === 0 && !analyzeAll)) return;
    if (analyzeAll) {
      performAnalysis(true);
    } else {
      performAnalysis(false);
    }
  }, [performAnalysis, analyzeAll, repoMeta, currentChildren.length]);

  const [directoriesWithErrors, setDirectoriesWithErrors] = useState<Set<string>>(new Set());

  const totalErrors = useMemo(() => {
    let count = 0;
    errorFiles.forEach((errors) => count += errors.length);
    return count;
  }, [errorFiles]);

  useEffect(() => {
    if (!errorFiles || errorFiles.size === 0) {
      setDirectoriesWithErrors(new Set());
      return;
    }

    try {
      const newDirectoriesWithErrors = new Set<string>();

      for (const errorPath of errorFiles.keys()) {
        if (!errorPath || typeof errorPath !== 'string') continue;

        const parts = errorPath.split('/');

        let currentPath = '';
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          newDirectoriesWithErrors.add(currentPath);
        }
      }

      setDirectoriesWithErrors(newDirectoriesWithErrors);
    } catch (e) {
      console.error("Error computing directory errors:", e);
      setDirectoriesWithErrors(new Set());
    }
  }, [errorFiles]);

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
          newEdges.push({
            source: targetNode,
            target: sourceNode,
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
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center text-slate-100">
        <LoaderIcon className="text-cyan-400 mb-4" size={40} />
        <h2 className="text-xl font-mono mb-2">Analyzing {owner}/{repoName}</h2>
        <p className="text-slate-400 text-sm">Fetching repository structure...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center text-slate-100 p-6">
        <div className="bg-[#0a0f1a] border border-red-500/30 p-8 rounded-2xl max-w-lg w-full text-center">
          <AlertTriangleIcon className="text-red-400 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2 text-red-400">Analysis Failed</h2>
          <p className="text-slate-300 mb-6 text-sm">{error}</p>
          <Button
            onClick={() => navigate('/')}
            className="bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white"
          >
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-white/[0.06] bg-[#030712]/80 backdrop-blur-xl flex items-center justify-between px-5 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.06]"
          >
            <ArrowLeftIcon size={18} />
          </button>

          <div className="flex items-center gap-3">
            <CodeMapLogo size={22} />
            <span className="font-mono text-sm font-semibold text-white">
              {owner}/{repoName}
            </span>
            {analyzingDeps && <LoaderIcon className="text-cyan-400" size={14} />}
            {repoMeta && (
              <Badge variant="outline" className="bg-white/[0.04] border-white/[0.08] text-slate-400 font-mono text-[10px] font-normal">
                {repoMeta.default_branch}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-slate-500 hover:text-slate-300 transition-colors p-1">
                  <InfoIcon size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#0a0f1a] border-white/[0.08] text-slate-300 max-w-xs text-xs">
                <p>Open DevTools (F12) to see analysis logs</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {totalErrors > 0 && (
            <div className="flex items-center gap-1.5 text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
              <BugIcon size={14} />
              <span className="font-mono text-xs font-bold">{totalErrors}</span>
            </div>
          )}

          <button
            onClick={() => {
              analyzedFilesRef.current.clear();
              setScanTrigger(prev => prev + 1);
            }}
            className="text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02] transition-all"
          >
            Re-scan
          </button>

          <button
            onClick={simulateGeneration}
            disabled={isGenerating}
            className={`flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-medium transition-all ${
              isGenerating
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/20'
                : 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30'
            }`}
          >
            {isGenerating ? <LoaderIcon size={12} /> : <ZapIcon size={12} />}
            {isGenerating ? 'Generating...' : 'Generate Graph'}
          </button>

          {repoMeta && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <StarIcon className="text-amber-400" size={14} />
              <span className="font-mono text-xs">{repoMeta.stargazers_count.toLocaleString()}</span>
            </div>
          )}

          <a
            href={`https://github.com/${owner}/${repoName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors text-xs"
          >
            <span className="hidden sm:inline">GitHub</span>
            <ExternalLinkIcon size={14} />
          </a>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="h-10 border-b border-white/[0.04] bg-[#030712] flex items-center px-5 gap-1 overflow-x-auto shrink-0">
        <button
          onClick={() => { setCurrentPath(''); setSelectedNode(null); }}
          className={`flex items-center gap-1.5 px-2 h-7 rounded-md text-xs font-mono transition-colors ${currentPath === '' ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <FolderIcon size={14} />
          root
        </button>

        {breadcrumbParts.map((part, i) => {
          const path = breadcrumbParts.slice(0, i + 1).join('/');
          return (
            <React.Fragment key={path}>
              <ChevronRightIcon className="text-slate-700" size={14} />
              <button
                onClick={() => { setCurrentPath(path); setSelectedNode(null); }}
                className={`px-2 h-7 rounded-md text-xs font-mono transition-colors ${currentPath === path ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {part}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div
          className="flex-1 overflow-auto bg-[#030712] relative custom-scrollbar"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedNode(null);
          }}
        >
          {currentPath !== '' && (
            <button
              onClick={() => {
                const parts = currentPath.split('/');
                const parent = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
                setCurrentPath(parent);
                setSelectedNode(null);
              }}
              className="absolute left-5 top-4 z-30 flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-cyan-500/30 rounded-lg transition-all"
            >
              <ArrowLeftIcon size={12} /> Up
            </button>
          )}

          <div style={{ height: canvasHeight, minWidth: 600, position: 'relative' }}>
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                </marker>
                <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
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

                if (edge.sourceType === edge.targetType) {
                  const offset = 40 + (i % 5) * 10;
                  d = `M ${startX} ${startY} C ${startX + offset} ${startY}, ${endX + offset} ${endY}, ${endX + 5} ${endY}`;
                } else {
                  d = `M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX - 5} ${endY}`;
                }

                const hasErrors = errorFiles.has(edge.source.path);

                return (
                  <path
                    key={i}
                    d={d}
                    stroke={hasErrors ? "#ef4444" : "#1e293b"}
                    strokeWidth={hasErrors ? 2 : 1}
                    fill="none"
                    markerEnd={hasErrors ? "url(#arrow-red)" : "url(#arrow)"}
                    opacity={hasErrors ? 0.8 : 0.3}
                  />
                );
              })}
            </svg>

            {/* Directories */}
            <div className="absolute top-[60px] left-10 w-40 flex flex-col gap-[20px]">
              {dirs.map((dir) => {
                const hasErrors = directoriesWithErrors.has(dir.path);

                return (
                  <div
                    key={dir.path}
                    style={{ height: 100 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPath(dir.path);
                      setSelectedNode(null);
                    }}
                    className={`
                      border rounded-xl p-4 cursor-pointer transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-2 relative
                      ${hasErrors
                        ? 'bg-red-950/20 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                        : 'bg-white/[0.03] border-white/[0.06] hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                      }
                    `}
                  >
                    <FolderIcon className={hasErrors ? 'text-red-400' : 'text-cyan-400'} size={28} />
                    <span className="text-xs font-mono truncate w-full text-center text-slate-300">{dir.name}</span>
                    <div className="absolute -right-2 -top-2 bg-[#0a0f1a] text-slate-500 text-[9px] px-1.5 py-0.5 rounded-md border border-white/[0.06] font-mono">
                      DIR
                    </div>
                    {hasErrors && (
                      <div className="absolute -left-1.5 -top-1.5">
                        <AlertCircleIcon className="text-red-500" size={16} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Files */}
            <div className="absolute top-[40px] right-10 w-64 flex flex-col gap-[20px]">
              {files.map((file) => {
                const fileErrors = errorFiles.get(file.path);
                const hasErrors = fileErrors && fileErrors.length > 0;
                const isSelected = selectedNode === file.path;

                return (
                  <div
                    key={file.path}
                    style={{ height: 60 }}
                    onClick={(e) => handleNodeClick(e, file.path)}
                    className={`
                      border rounded-xl px-4 flex items-center gap-3 cursor-pointer transition-all hover:translate-x-1 relative
                      ${isSelected
                        ? 'bg-cyan-500/[0.08] border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                        : hasErrors
                          ? 'bg-red-950/10 border-red-500/20 hover:bg-red-900/10'
                          : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                      }
                    `}
                  >
                    {hasErrors ? (
                      <AlertTriangleIcon className="text-red-400 shrink-0" size={16} />
                    ) : (
                      <FileIcon className={`shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} size={16} />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className={`font-mono text-xs truncate ${hasErrors ? 'text-red-300' : 'text-slate-300'}`}>
                        {file.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                        {hasErrors && <span className="text-[10px] text-red-400">{fileErrors.length} errors</span>}
                      </div>
                    </div>

                    {fileDeps.has(file.path) && fileDeps.get(file.path)!.length > 0 && (
                      <span className="text-[9px] font-mono text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                        {fileDeps.get(file.path)!.length} deps
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Details & Analysis */}
        <div className={`
          w-80 border-l border-white/[0.06] bg-[#0a0f1a] flex flex-col shrink-0 transition-all duration-300
          ${selectedNode ? 'mr-0' : '-mr-80'}
        `}>
          {selectedNode && (() => {
            const node = files.find(n => n.path === selectedNode);
            if (!node) return null;

            const errors = errorFiles.get(node.path) || [];
            const deps = fileDeps.get(node.path) || [];
            const extension = node.name.split('.').pop()?.toLowerCase();

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
                <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileIcon className="text-cyan-400 shrink-0" size={16} />
                    <span className="font-mono font-bold truncate text-sm text-white">{node.name}</span>
                  </div>
                  <button className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/[0.06] transition-colors" onClick={() => setSelectedNode(null)}>
                    <XCloseIcon />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                  {/* Analysis Status */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Analysis Status</h3>
                    <div className="flex items-center gap-2">
                      {errors.length > 0 ? (
                        <Badge variant="destructive" className="bg-red-500/10 text-red-300 border-red-500/20 text-[10px]">
                          {errors.length} Issues Found
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                          No Issues Detected
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-white/[0.08] text-slate-400 text-[10px]">
                        {extension?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Token Counter */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Token Usage</h3>
                      <span className="text-[9px] text-slate-600">Est.</span>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.06]">
                      {countingNode === node.path ? (
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                          <LoaderIcon size={12} /> Counting...
                        </div>
                      ) : tokenCounts.has(node.path) ? (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-xs">Token Count</span>
                          <span className="font-mono text-cyan-400 font-bold text-sm">
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
                      <h3 className="text-[10px] font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangleIcon size={10} /> Errors & Warnings
                      </h3>
                      <div className="space-y-1">
                        {errors.map((err, idx) => (
                          <div key={idx} className="bg-red-500/[0.06] border border-red-500/10 rounded-lg p-2 text-[11px] text-red-300 leading-relaxed">
                            {err}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metrics Chart */}
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" hide domain={[0, 100]} />
                        <YAxis dataKey="name" type="category" width={40} tick={{fontSize: 10, fill: '#64748b'}} />
                        <ChartTooltip
                          contentStyle={{ backgroundColor: '#0a0f1a', borderColor: 'rgba(255,255,255,0.08)', color: '#f8fafc', borderRadius: '8px', fontSize: '11px' }}
                          itemStyle={{ color: '#f8fafc' }}
                          cursor={{fill: 'transparent'}}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Dependencies */}
                  {deps.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Dependencies</h3>
                      <div className="flex flex-wrap gap-1">
                        {deps.map((dep, idx) => (
                          <div key={idx} className="text-[10px] bg-white/[0.03] text-slate-300 px-2 py-1 rounded-md border border-white/[0.06] truncate max-w-full font-mono">
                            {dep.split('/').pop()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/[0.06]">
                    <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-white text-xs h-8 rounded-lg">
                      Open in Editor
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* AI Generation Agent Overlay with Streaming */}
        {showTokenPanel && (
          <div className="absolute bottom-5 left-5 z-40 flex flex-col gap-2">
            <Card className="w-96 bg-[#0a0f1a]/95 backdrop-blur-xl border-white/[0.08] shadow-2xl shadow-black/50 p-0 text-slate-100 overflow-hidden">
              <div className="p-4 border-b border-white/[0.04]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                    <span className="font-mono text-xs font-semibold text-white">AI Agent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isGenerating ? (
                      <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">STREAMING</span>
                    ) : generationStats.totalTokens > 0 ? (
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">COMPLETE</span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">IDLE</span>
                    )}
                    {!isGenerating && generationStats.totalTokens > 0 && (
                      <button
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                        onClick={() => setShowTokenPanel(false)}
                      >
                        <XCloseIcon />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Progress</span>
                    <span>{Math.round(generationProgress)}%</span>
                  </div>
                  <Progress value={generationProgress} className="h-1 bg-white/[0.04]" indicatorClassName="bg-gradient-to-r from-cyan-500 to-emerald-500" />
                </div>
              </div>

              {/* Streamed text output */}
              {streamedText && (
                <div ref={streamContainerRef} className="max-h-40 overflow-y-auto p-4 border-b border-white/[0.04] custom-scrollbar">
                  <p className="text-[11px] text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                    {streamedText}
                    {isGenerating && <span className="inline-block w-1 h-3.5 bg-cyan-400 animate-pulse ml-0.5 align-text-bottom" />}
                  </p>
                </div>
              )}

              {/* Token stats */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/[0.03] p-2 rounded-lg border border-white/[0.04]">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Input</div>
                    <div className="text-sm font-mono text-white mt-0.5">{generationStats.inputTokens.toLocaleString()}</div>
                  </div>
                  <div className="bg-white/[0.03] p-2 rounded-lg border border-white/[0.04]">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Output</div>
                    <div className="text-sm font-mono text-cyan-400 mt-0.5">{generationStats.outputTokens.toLocaleString()}</div>
                  </div>
                  <div className="bg-white/[0.03] p-2 rounded-lg border border-white/[0.04]">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Total</div>
                    <div className="text-sm font-mono text-emerald-400 mt-0.5">{generationStats.totalTokens.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
