
import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { FileItem } from './components/FileItem';
import { FileData } from './types';
import { performOCR, refineText } from './services/geminiService';
import { 
  Copy, 
  Download, 
  Sparkles, 
  FileText, 
  Trash2, 
  Layout, 
  Wand2,
  FileSearch,
  Loader2,
  Camera,
  Sun,
  ClipboardPaste,
  Key,
  ExternalLink,
  ShieldCheck,
  Monitor
} from 'lucide-react';

const App: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [highAccuracy, setHighAccuracy] = useState(true);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'original' | 'extracted'>('extracted');
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const selectedFile = files.find(f => f.id === selectedFileId);

  useEffect(() => {
    const checkKey = async () => {
      // Strict check for API Key selection availability
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      } else {
        // Outside AI Studio environment, we show the key required screen if the user wants strictly private keys
        // or let it pass if process.env.API_KEY is expected to be present.
        // For the user's specific request to "prompt for key", we default to false if not in aistudio.
        setHasApiKey(false); 
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    } else {
      alert("이 배포 환경에서는 Google AI Studio의 자동 키 선택 기능을 직접 호출할 수 없습니다. 배포 환경의 환경 변수(Environment Variables) 설정을 확인해 주세요.");
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
    }
  }, [selectedFileId]);

  const handleFilesSelected = (fileList: FileList) => {
    addFiles(Array.from(fileList));
  };

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
      setFiles(prev => prev.map(f => f.id === id ? { 
        ...f, 
        status: 'error', 
        error: error.message || '분석 중 오류가 발생했습니다.' 
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
      setFiles(prev => prev.map(f => f.id === selectedFileId ? { ...f, status: 'completed', extractedText: refined } : f));
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

  if (hasApiKey === null) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center"><Loader2 className="w-10 h-10 text-yellow-400 animate-spin" /></div>;

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-2xl shadow-yellow-100 border border-yellow-50 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <Key className="w-10 h-10 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800 mb-4 tracking-tight">API 키 설정이 필요합니다</h1>
          <p className="text-gray-500 mb-10 leading-relaxed text-sm">
            배포된 사이트에서 AI 기능을 사용하려면 <span className="text-gray-800 font-bold underline decoration-yellow-400">구글 Gemini API 키</span> 연동이 필수입니다. 아래 안내를 따라 설정을 완료해 주세요.
          </p>
          <button onClick={handleOpenKeySelector} className="w-full py-4 bg-gray-900 text-white rounded-full font-bold shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-3 mb-4 active:scale-95">
            <Key className="w-5 h-5" /> API 키 선택하기
          </button>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 font-medium hover:text-gray-600 transition-colors inline-flex items-center gap-1">
            결제 및 비용 안내 <ExternalLink className="w-3 h-3" />
          </a>
          <div className="mt-10 p-4 bg-gray-50 rounded-2xl flex items-start gap-3 text-left">
            <ShieldCheck className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-400 leading-snug">보안 가이드라인에 따라, API 키는 사용자 본인의 관리 하에 안전하게 사용되어야 합니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-4 sm:p-6 md:p-10 lg:p-12 animate-in fade-in duration-700 pb-24 md:pb-10">
      {/* Header: Exact Match to Screenshot */}
      <header className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 mb-10 md:mb-16">
        <div className="flex items-center gap-5 w-full md:w-auto justify-center md:justify-start">
          <div className="bg-[#FFD600] p-3.5 sm:p-4 rounded-[1.5rem] shadow-xl shadow-yellow-200/50 flex items-center justify-center shrink-0">
            <Sun className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111827] tracking-tight leading-none mb-2">써니 OCR Booster</h1>
            <p className="text-sm sm:text-lg text-gray-400 font-medium italic">나만의 똑똑한 공부 파트너</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 bg-white/80 backdrop-blur-md p-2 rounded-[2.5rem] shadow-sm border border-yellow-100 w-full md:w-auto">
          <button onClick={() => setHighAccuracy(!highAccuracy)} className={`px-5 sm:px-8 py-3 rounded-full text-sm sm:text-base font-bold transition-all flex items-center gap-2 ${highAccuracy ? 'bg-[#FFB800] text-white' : 'text-gray-500 bg-gray-50'}`}>
            <Sparkles className="w-4 h-4" /> 정밀 스캔 {highAccuracy ? 'ON' : 'OFF'}
          </button>
          <button onClick={handleProcessAll} disabled={isProcessingAll || files.length === 0} className="px-6 sm:px-10 py-3 rounded-full bg-[#9499A1] text-white text-sm sm:text-base font-bold hover:bg-gray-600 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg">
            {isProcessingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Layout className="w-5 h-5" />} 전체 스캔
          </button>
          <button onClick={handleOpenKeySelector} className="p-3.5 bg-white border border-gray-100 text-gray-400 rounded-full hover:text-gray-600 active:scale-90 shadow-sm">
            <Key className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Area: Upload & Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <FileUploader onFilesSelected={handleFilesSelected} />
          
          <div className="bg-white rounded-[3.5rem] p-8 sm:p-10 shadow-xl border border-yellow-50 min-h-[450px] flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 px-2">파일 목록 <span className="text-lg font-medium text-gray-300 ml-2">({files.length})</span></h2>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
              {files.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 opacity-60 py-20">
                  <FileSearch className="w-16 h-16 mb-4" />
                  <p className="text-base font-bold">업로드된 파일이 없습니다.</p>
                  <div className="mt-6 px-5 py-2.5 bg-gray-50 rounded-full border border-gray-100 text-xs font-bold text-gray-400 flex items-center gap-2">
                    <ClipboardPaste className="w-4 h-4" /> 붙여넣기(Ctrl+V) 지원
                  </div>
                </div>
              ) : (
                files.map(f => (
                  <FileItem 
                    key={f.id} 
                    item={f} 
                    isSelected={selectedFileId === f.id}
                    onSelect={() => {
                      setSelectedFileId(f.id);
                      if (window.innerWidth < 1024) document.getElementById('main-viewer')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    onRemove={removeFile}
                  />
                ))
              )}
            </div>
            {files.length > 0 && (
              <button onClick={() => setFiles([])} className="mt-6 w-full py-3 text-sm text-red-400 hover:text-red-500 font-bold flex items-center justify-center gap-2 transition-colors">
                <Trash2 className="w-4 h-4" /> 목록 비우기
              </button>
            )}
          </div>
        </div>

        {/* Right Area: Result Viewer */}
        <div id="main-viewer" className="lg:col-span-8 bg-white rounded-[4rem] shadow-2xl border border-yellow-50 overflow-hidden flex flex-col min-h-[600px]">
          {selectedFile ? (
            <>
              <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-6 bg-white sticky top-0 z-20">
                <div className="flex bg-gray-100 p-1.5 rounded-full w-full sm:w-auto shadow-inner">
                  <button onClick={() => setActiveTab('original')} className={`flex-1 sm:flex-none px-8 py-3 rounded-full text-base font-bold transition-all ${activeTab === 'original' ? 'bg-white shadow-md text-gray-900' : 'text-gray-400'}`}>이미지</button>
                  <button onClick={() => setActiveTab('extracted')} className={`flex-1 sm:flex-none px-8 py-3 rounded-full text-base font-bold transition-all ${activeTab === 'extracted' ? 'bg-white shadow-md text-gray-900' : 'text-gray-400'}`}>추출 텍스트</button>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button onClick={() => handleRefine('correction')} disabled={!selectedFile.extractedText || selectedFile.status === 'processing'} className="px-5 py-3 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-all flex items-center gap-2 text-sm font-bold disabled:opacity-50 active:scale-95 border border-green-100 shadow-sm"><Wand2 className="w-4 h-4" /> 교정</button>
                  <button onClick={() => handleRefine('summary')} disabled={!selectedFile.extractedText || selectedFile.status === 'processing'} className="px-5 py-3 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-all flex items-center gap-2 text-sm font-bold disabled:opacity-50 active:scale-95 border border-purple-100 shadow-sm"><FileText className="w-4 h-4" /> 요약</button>
                  <div className="w-[1px] h-8 bg-gray-200 mx-1 hidden sm:block" />
                  <button onClick={copyToClipboard} className="p-3.5 bg-gray-50 text-gray-500 rounded-full hover:bg-gray-100 transition-all shadow-sm"><Copy className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="flex-1 flex flex-col md:flex-row h-[600px] sm:h-[750px] lg:h-[850px] overflow-hidden">
                <div className={`${activeTab === 'original' ? 'flex' : 'hidden md:flex md:w-1/2'} h-full p-10 items-start justify-center overflow-auto custom-scrollbar border-r border-gray-100 bg-gray-50/20`}>
                  {selectedFile.type === 'image' ? (
                    <img src={selectedFile.previewUrl} alt="original" className="max-w-full h-auto rounded-2xl shadow-2xl border border-gray-200" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-white rounded-[3rem] border border-dashed border-gray-200 p-12 text-center">
                      <FileText className="w-20 h-20 mb-6 opacity-20" />
                      <p className="font-extrabold text-xl text-gray-500">PDF 원본 보기</p>
                    </div>
                  )}
                </div>

                <div className={`${activeTab === 'extracted' ? 'flex' : 'hidden md:flex md:w-1/2'} flex-1 p-8 sm:p-12 flex-col bg-white overflow-hidden`}>
                  {selectedFile.status === 'processing' ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                      <div className="relative"><div className="w-24 h-24 sm:w-32 sm:h-32 border-[6px] border-yellow-50 rounded-full animate-spin border-t-[#FFD600]"></div><div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-10 h-10 text-[#FFD600]" /></div></div>
                      <div className="text-center"><p className="text-2xl font-extrabold text-gray-800">문서를 분석하고 있어요</p><p className="text-base text-gray-400 mt-3 font-medium">수식과 표까지 꼼꼼하게 추출 중입니다...</p></div>
                    </div>
                  ) : selectedFile.extractedText ? (
                    <textarea 
                      className="flex-1 w-full h-full p-8 sm:p-12 text-gray-900 bg-white font-medium text-lg sm:text-2xl lg:text-3xl leading-[1.8] resize-none custom-scrollbar outline-none focus:ring-0 placeholder-gray-200"
                      value={selectedFile.extractedText}
                      onChange={(e) => setFiles(prev => prev.map(f => f.id === selectedFileId ? { ...f, extractedText: e.target.value } : f))}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3rem] border border-dashed border-gray-100">
                      <div className="bg-yellow-50 p-10 rounded-full mb-10 shadow-inner"><Sparkles className="w-16 h-16 text-[#FFD600]" /></div>
                      <h3 className="text-3xl font-extrabold text-gray-800 mb-6 tracking-tight">AI 스캔 준비 완료</h3>
                      <button onClick={() => processFile(selectedFile.id)} className="px-14 py-5 bg-[#FFD600] text-white rounded-full font-bold shadow-2xl shadow-yellow-200 hover:scale-105 active:scale-95 transition-all text-xl">분석 시작하기</button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-white h-full">
              <div className="bg-[#F8F9FA] p-16 sm:p-24 rounded-[5rem] mb-12 shadow-inner"><FileSearch className="w-24 h-24 sm:w-32 sm:h-32 text-gray-200" /></div>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-[#111827] mb-6 tracking-tight">어떤 문서를 도와드릴까요?</h3>
              <p className="text-gray-400 text-lg sm:text-xl max-w-lg mx-auto font-medium mb-12">분석할 파일을 선택하거나 새로 업로드해 보세요.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <span className="px-6 py-2.5 bg-yellow-50 text-yellow-600 rounded-full text-sm font-bold border border-yellow-100 shadow-sm flex items-center gap-2"><Camera className="w-4 h-4" /> 카메라 촬영 지원</span>
                <span className="px-6 py-2.5 bg-blue-50 text-blue-600 rounded-full text-sm font-bold border border-blue-100 shadow-sm flex items-center gap-2"><FileText className="w-4 h-4" /> PDF 수식 추출 최적화</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Floating Bar */}
      <footer className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] z-50">
        <div className="bg-[#111827]/95 backdrop-blur-2xl p-4 rounded-full shadow-2xl flex justify-between items-center border border-white/10 px-10">
          <button className="flex flex-col items-center gap-2 text-white/40 hover:text-white" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><Sun className="w-6 h-6" /><span className="text-[10px] font-bold">홈</span></button>
          <div className="w-16 h-16 bg-[#FFD600] rounded-full flex items-center justify-center shadow-2xl shadow-yellow-400/30 -mt-12 border-4 border-white active:scale-90 transition-transform" onClick={() => document.getElementById('file-input')?.click()}><Camera className="w-8 h-8 text-white" /></div>
          <button onClick={handleOpenKeySelector} className="flex flex-col items-center gap-2 text-white/40 hover:text-white"><Key className="w-6 h-6" /><span className="text-[10px] font-bold">설정</span></button>
        </div>
      </footer>
    </div>
  );
};

export default App;
