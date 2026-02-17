
import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { FileItem } from './components/FileItem';
import { FileData, ProcessingStatus } from './types';
import { performOCR, refineText } from './services/geminiService';
import { 
  Copy, 
  Download, 
  Sparkles, 
  FileText, 
  Trash2, 
  Layout, 
  CheckCircle2, 
  Wand2,
  FileSearch,
  BookOpen,
  Loader2,
  Camera,
  Sun,
  ClipboardPaste,
  Key,
  ExternalLink,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

const App: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [highAccuracy, setHighAccuracy] = useState(true);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'original' | 'extracted'>('extracted');
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const selectedFile = files.find(f => f.id === selectedFileId);

  // Check for API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      } else {
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const addFiles = useCallback((incomingFiles: File[]) => {
    const newFiles: FileData[] = incomingFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'waiting',
      progress: 0,
      type: file.type.includes('pdf') ? 'pdf' : 'image',
    }));
    setFiles(prev => [...prev, ...newFiles]);
    if (!selectedFileId && newFiles.length > 0) {
      setSelectedFileId(newFiles[0].id);
      // On mobile, auto-scroll to the viewer might be helpful, but keeping it simple for now
    }
  }, [selectedFileId]);

  const handleFilesSelected = (fileList: FileList) => {
    addFiles(Array.from(fileList));
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const timestamp = new Date().toLocaleTimeString();
            const renamedFile = new File([file], `Pasted Image ${timestamp}.png`, { type: file.type });
            pastedFiles.push(renamedFile);
          }
        }
      }

      if (pastedFiles.length > 0) {
        addFiles(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addFiles]);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);
      if (selectedFileId === id) {
        setSelectedFileId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const processFile = async (id: string) => {
    const target = files.find(f => f.id === id);
    if (!target || target.status === 'processing') return;

    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'processing', progress: 10 } : f));

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
      });
      reader.readAsDataURL(target.file);
      const base64Data = await base64Promise;

      setFiles(prev => prev.map(f => f.id === id ? { ...f, progress: 40 } : f));

      const text = await performOCR(base64Data, target.file.type, highAccuracy);

      setFiles(prev => prev.map(f => f.id === id ? { 
        ...f, 
        status: 'completed', 
        progress: 100, 
        extractedText: text 
      } : f));
    } catch (error: any) {
      if (error.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
      }
      setFiles(prev => prev.map(f => f.id === id ? { 
        ...f, 
        status: 'error', 
        error: error.message || 'OCR 처리 중 오류가 발생했습니다.' 
      } : f));
    }
  };

  const handleProcessAll = async () => {
    setIsProcessingAll(true);
    const waiting = files.filter(f => f.status === 'waiting' || f.status === 'error');
    for (const f of waiting) {
      await processFile(f.id);
    }
    setIsProcessingAll(false);
  };

  const handleRefine = async (mode: 'summary' | 'correction') => {
    if (!selectedFile?.extractedText) return;

    setFiles(prev => prev.map(f => f.id === selectedFileId ? { ...f, status: 'processing' } : f));
    try {
      const refined = await refineText(selectedFile.extractedText, mode);
      setFiles(prev => prev.map(f => f.id === selectedFileId ? { 
        ...f, 
        status: 'completed', 
        extractedText: refined 
      } : f));
    } catch (error) {
      alert("AI 작업 중 오류가 발생했습니다.");
    }
  };

  const copyToClipboard = () => {
    if (selectedFile?.extractedText) {
      navigator.clipboard.writeText(selectedFile.extractedText);
      alert("클립보드에 복사되었습니다!");
    }
  };

  const downloadTxt = () => {
    if (!selectedFile?.extractedText) return;
    const blob = new Blob([selectedFile.extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFile.file.name.split('.')[0]}_extracted.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (hasApiKey === null) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-8">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
      </div>
    );
  }

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-10 shadow-2xl shadow-yellow-100 border border-yellow-50 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
            <Key className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800 mb-4">API 키 연결이 필요합니다</h1>
          <p className="text-sm sm:text-base text-gray-500 mb-8 leading-relaxed px-2">
            Sunny OCR Booster는 더욱 안전하고 쾌적한 사용을 위해 <span className="font-bold text-gray-700 underline decoration-yellow-300">사용자 본인의 API 키</span> 사용을 권장합니다.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={handleOpenKeySelector}
              className="w-full py-3.5 sm:py-4 bg-gray-900 text-white rounded-full font-bold shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-3 text-base"
            >
              <Key className="w-5 h-5" /> API 키 선택하기
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-[13px] text-gray-400 font-medium hover:text-gray-600 transition-colors py-2"
            >
              결제 및 비용 관련 안내 <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-2xl flex items-start gap-3 text-left border border-gray-100">
            <ShieldCheck className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] sm:text-[12px] text-gray-400 leading-snug">
              사용자의 API 키 정보는 서버에 저장되지 않으며, 브라우저 세션 내에서만 안전하게 관리됩니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-3 sm:p-6 md:p-8 animate-in fade-in duration-700 pb-24 md:pb-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 mb-8 md:mb-10">
        <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-start">
          <div className="bg-yellow-400 p-2.5 sm:p-3 rounded-[1.2rem] sm:rounded-[1.5rem] shadow-lg shadow-yellow-100 rotate-3 shrink-0">
            <Sun className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 tracking-tight leading-none">써니 OCR Booster</h1>
            <p className="text-[13px] sm:text-sm text-gray-400 font-medium italic mt-1">나만의 똑똑한 공부 파트너</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 bg-white/60 backdrop-blur-sm p-1.5 rounded-[1.8rem] sm:rounded-[2rem] shadow-sm border border-yellow-100 w-full md:w-auto">
          <button 
            onClick={() => setHighAccuracy(!highAccuracy)}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-[13px] sm:text-sm font-bold transition-all flex items-center gap-2 ${
              highAccuracy ? 'bg-yellow-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${highAccuracy ? 'animate-pulse' : ''}`} />
            정밀 스캔 {highAccuracy ? 'ON' : 'OFF'}
          </button>
          <button 
            onClick={handleProcessAll}
            disabled={isProcessingAll || files.length === 0}
            className="px-5 sm:px-8 py-2 sm:py-2.5 rounded-full bg-gray-800 text-white text-[13px] sm:text-sm font-bold hover:bg-gray-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
          >
            {isProcessingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layout className="w-4 h-4" />}
            전체 스캔
          </button>
          <button 
            onClick={handleOpenKeySelector}
            className="p-2 sm:p-2.5 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-all active:scale-95"
            title="API 키 변경"
          >
            <Key className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* Left: Sidebar & Upload Area */}
        <div className="lg:col-span-4 space-y-6">
          <FileUploader onFilesSelected={handleFilesSelected} />
          
          <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-5 md:p-6 shadow-sm border border-yellow-50 min-h-[300px]">
            <div className="flex justify-between items-center mb-5 px-2">
              <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                파일 목록 <span className="text-sm font-normal text-gray-400">({files.length})</span>
              </h2>
              {files.length > 0 && (
                <button onClick={() => setFiles([])} className="text-[11px] text-red-400 hover:text-red-600 flex items-center gap-1 font-bold active:scale-95">
                  <Trash2 className="w-3 h-3" /> 전체삭제
                </button>
              )}
            </div>
            
            <div className="max-h-[400px] lg:max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                  <FileSearch className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-[13px] font-medium">업로드된 파일이 없습니다.</p>
                  <p className="text-[10px] text-gray-400 mt-3 font-bold px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100 flex items-center gap-1">
                    <ClipboardPaste className="w-3 h-3" /> 붙여넣기(Ctrl+V) 지원
                  </p>
                </div>
              ) : (
                files.map(f => (
                  <FileItem 
                    key={f.id} 
                    item={f} 
                    isSelected={selectedFileId === f.id}
                    onSelect={() => {
                      setSelectedFileId(f.id);
                      // Scroll viewer into view on small screens
                      if (window.innerWidth < 1024) {
                        document.getElementById('result-viewer')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    onRemove={removeFile}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Result Viewer */}
        <div id="result-viewer" className="lg:col-span-8 bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-xl border border-yellow-50 overflow-hidden flex flex-col min-h-[500px] md:min-h-0">
          {selectedFile ? (
            <>
              {/* Tab Selector for Mobile (Sticky) */}
              <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/90 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex bg-gray-100 p-1 rounded-full w-full sm:w-auto">
                  <button 
                    onClick={() => setActiveTab('original')}
                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-full text-[13px] sm:text-sm font-bold transition-all ${activeTab === 'original' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}
                  >
                    원본
                  </button>
                  <button 
                    onClick={() => setActiveTab('extracted')}
                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-full text-[13px] sm:text-sm font-bold transition-all ${activeTab === 'extracted' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}
                  >
                    추출 텍스트
                  </button>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  <button 
                    onClick={() => handleRefine('correction')}
                    disabled={!selectedFile.extractedText || selectedFile.status === 'processing'}
                    className="flex-1 sm:flex-none px-3 py-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-all flex items-center justify-center gap-2 text-[12px] sm:text-sm font-bold disabled:opacity-50 active:scale-95"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>오타 교정</span>
                  </button>
                  <button 
                    onClick={() => handleRefine('summary')}
                    disabled={!selectedFile.extractedText || selectedFile.status === 'processing'}
                    className="flex-1 sm:flex-none px-3 py-2 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-all flex items-center justify-center gap-2 text-[12px] sm:text-sm font-bold disabled:opacity-50 active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>요약</span>
                  </button>
                  <div className="w-[1px] h-6 bg-gray-200 mx-0.5 hidden sm:block" />
                  <button 
                    onClick={copyToClipboard}
                    className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition-all active:scale-95 shrink-0"
                    title="복사"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={downloadTxt}
                    className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition-all active:scale-95 shrink-0"
                    title="저장"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* View Content Area */}
              <div className="flex-1 flex flex-col md:flex-row h-[450px] sm:h-[600px] lg:h-[700px] bg-gray-50/20 overflow-hidden">
                {/* Mobile Tabbed View logic: Only show active on mobile, split on large if needed, but tabs are better for clarity */}
                
                {/* Original View */}
                <div className={`${activeTab === 'original' ? 'flex' : 'hidden md:hidden'} md:hidden flex-1 p-4 items-start justify-center overflow-auto custom-scrollbar`}>
                  {selectedFile.type === 'image' ? (
                    <img 
                      src={selectedFile.previewUrl} 
                      alt="original" 
                      className="max-w-full h-auto rounded-xl shadow-lg border border-gray-200"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                      <FileText className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-bold text-sm">PDF 뷰어</p>
                      <p className="text-[11px] mt-2 leading-relaxed">원본은 브라우저 PDF 설정에 따라 다르게 보일 수 있습니다.</p>
                    </div>
                  )}
                </div>

                {/* Desktop Split Original (Optional, currently using tabs for both mobile and desktop for consistency) */}
                <div className={`${activeTab === 'original' ? 'md:flex' : 'md:hidden'} hidden flex-1 p-8 items-start justify-center overflow-auto border-r border-gray-100`}>
                   {selectedFile.type === 'image' ? (
                    <img src={selectedFile.previewUrl} alt="original" className="max-w-full h-auto rounded-xl shadow-lg border border-gray-200" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-100">
                      <FileText className="w-12 h-12 mb-2 opacity-20" />
                      <p className="font-medium">PDF 원본</p>
                    </div>
                  )}
                </div>

                {/* Extracted Text View - Consistent White Background & Clear Text */}
                <div className={`${activeTab === 'extracted' ? 'flex' : 'hidden'} flex-1 p-4 sm:p-6 lg:p-8 flex-col bg-white overflow-hidden`}>
                  {selectedFile.status === 'processing' ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-5 bg-white">
                      <div className="relative">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 border-[3px] border-yellow-100 rounded-full animate-spin border-t-yellow-400"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
                        </div>
                      </div>
                      <div className="text-center px-4">
                        <p className="text-base sm:text-lg font-bold text-gray-700">AI가 문서를 정독하고 있어요</p>
                        <p className="text-[12px] sm:text-sm text-gray-400 mt-1">텍스트, 수식, 표를 꼼꼼하게 추출하고 있습니다...</p>
                      </div>
                    </div>
                  ) : selectedFile.extractedText ? (
                    <div className="flex-1 flex flex-col bg-white shadow-inner rounded-2xl border border-gray-100 overflow-hidden">
                      <textarea 
                        className="flex-1 w-full h-full p-5 sm:p-8 text-gray-900 bg-white font-medium text-base sm:text-lg leading-relaxed resize-none custom-scrollbar outline-none focus:ring-0"
                        style={{ color: '#111827', backgroundColor: '#ffffff', fontSize: '1.1rem' }}
                        value={selectedFile.extractedText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFiles(prev => prev.map(f => f.id === selectedFileId ? { ...f, extractedText: val } : f));
                        }}
                        placeholder="분석된 내용이 표시됩니다."
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-12 bg-white rounded-2xl border border-dashed border-gray-100">
                      <div className="bg-yellow-50 p-6 rounded-full mb-6">
                        <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-300" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-700 mb-2">분석을 시작해보세요!</h3>
                      <p className="text-[13px] sm:text-sm text-gray-400 mb-8 max-w-xs mx-auto">상단 혹은 아래 버튼을 눌러 AI 스캔을 진행하세요.</p>
                      <button 
                        onClick={() => processFile(selectedFile.id)}
                        className="px-8 sm:px-12 py-3.5 sm:py-4 bg-yellow-400 text-white rounded-full font-bold shadow-lg shadow-yellow-100 hover:scale-105 active:scale-95 transition-all text-sm sm:text-base"
                      >
                        이 파일 스캔하기
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 sm:p-20 text-center bg-white">
              <div className="bg-gray-50 p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3rem] mb-6 shadow-inner">
                <FileSearch className="w-12 h-12 sm:w-16 sm:h-16 text-gray-200" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-700 mb-2">어떤 문서를 도와드릴까요?</h3>
              <p className="text-gray-400 text-[13px] sm:text-sm max-w-xs mx-auto">분석할 파일을 선택하거나 새로 업로드해 보세요.</p>
              
              <div className="mt-10 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-yellow-50 text-yellow-600 rounded-full text-[11px] font-bold border border-yellow-100">
                  <Camera className="w-3.5 h-3.5" /> 카메라 촬영 지원
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[11px] font-bold border border-blue-100">
                  <FileText className="w-3.5 h-3.5" /> PDF 수식 추출 최적화
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Sticky Floating Action Button Bar */}
      <footer className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] z-50">
        <div className="bg-gray-900/90 backdrop-blur-lg p-3 sm:p-4 rounded-full shadow-2xl flex justify-between items-center border border-white/10 px-8">
          <button 
            className="flex flex-col items-center gap-1 text-white/40 hover:text-white transition-colors"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <Sun className="w-5 h-5" />
            <span className="text-[9px] font-bold">홈</span>
          </button>
          
          <div 
            className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg -mt-10 border-4 border-[#FDFBF7] cursor-pointer active:scale-90 transition-transform shadow-yellow-400/30"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Camera className="w-7 h-7 text-white" />
          </div>
          
          <button 
            onClick={handleOpenKeySelector}
            className="flex flex-col items-center gap-1 text-white/40 hover:text-white transition-colors"
          >
            <Key className="w-5 h-5" />
            <span className="text-[9px] font-bold">보안/키</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
