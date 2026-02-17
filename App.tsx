
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
  ShieldCheck,
  Check
} from 'lucide-react';

const App: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [highAccuracy, setHighAccuracy] = useState(true);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'original' | 'extracted'>('extracted');
  const [userKey, setUserKey] = useState(localStorage.getItem('USER_GEMINI_API_KEY') || '');
  const [showKeySaved, setShowKeySaved] = useState(false);

  const selectedFile = files.find(f => f.id === selectedFileId);

  // Sync key to localStorage and global process.env for the service
  useEffect(() => {
    localStorage.setItem('USER_GEMINI_API_KEY', userKey);
    // Explicitly set the environment variable in the current window context for the service to find it
    if (!(window as any).process) (window as any).process = { env: {} };
    (window as any).process.env.API_KEY = userKey || (window as any).process.env.API_KEY;
  }, [userKey]);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserKey(e.target.value);
    setShowKeySaved(true);
    setTimeout(() => setShowKeySaved(false), 2000);
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
    if (!userKey && !process.env.API_KEY) {
      alert("상단에 Gemini API 키를 입력해 주세요!");
      return;
    }

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
      alert("AI 작업 중 오류가 발생했습니다. API 키를 확인해 주세요.");
    }
  };

  const copyToClipboard = () => {
    if (selectedFile?.extractedText) {
      navigator.clipboard.writeText(selectedFile.extractedText);
      alert("클립보드에 복사되었습니다!");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] animate-in fade-in duration-700 pb-24 md:pb-10">
      {/* Top API Key Bar: User Requested */}
      <div className="w-full bg-white border-b border-yellow-100 py-3 px-4 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3 text-gray-500">
          <ShieldCheck className="w-5 h-5 text-yellow-500" />
          <span className="text-sm font-bold tracking-tight">API 설정</span>
        </div>
        <div className="relative flex-1 max-w-xl w-full">
          <label className="absolute -top-2 left-4 px-2 bg-white text-[10px] font-bold text-yellow-600 uppercase tracking-widest z-10">Your API Key</label>
          <div className="relative">
            <input 
              type="password"
              placeholder="Gemini API 키를 여기에 붙여넣으세요..."
              value={userKey}
              onChange={handleKeyChange}
              className="w-full pl-12 pr-12 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm focus:border-yellow-400 focus:bg-white transition-all outline-none font-medium"
            />
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
            {showKeySaved && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 flex items-center gap-1 animate-in slide-in-from-right-2 duration-300">
                <Check className="w-4 h-4" />
                <span className="text-[10px] font-bold">SAVED</span>
              </div>
            )}
          </div>
        </div>
        <div className="hidden sm:block text-[11px] text-gray-300 font-medium">
          브라우저에 로컬 저장됩니다
        </div>
      </div>

      <div className="p-4 sm:p-6 md:p-10">
        {/* Header: Matches User Screenshot */}
        <header className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <div className="flex items-center gap-5 w-full md:w-auto justify-center md:justify-start">
            <div className="bg-[#FFD600] p-4 rounded-[1.5rem] shadow-xl shadow-yellow-200/40 flex items-center justify-center shrink-0">
              <Sun className="w-10 h-10 text-white" />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight leading-none mb-2">써니 OCR Booster</h1>
              <p className="text-sm sm:text-lg text-gray-400 font-medium italic">나만의 똑똑한 공부 파트너</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 bg-white p-2 rounded-[2.5rem] shadow-sm border border-yellow-100 w-full md:w-auto">
            <button 
              onClick={() => setHighAccuracy(!highAccuracy)} 
              className={`px-6 py-3 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${highAccuracy ? 'bg-[#FFB800] text-white shadow-md' : 'text-gray-500 bg-gray-50'}`}
            >
              <Sparkles className="w-4 h-4" /> 정밀 스캔 {highAccuracy ? 'ON' : 'OFF'}
            </button>
            <button 
              onClick={handleProcessAll} 
              disabled={isProcessingAll || files.length === 0} 
              className="px-8 py-3 rounded-full bg-[#9499A1] text-white text-sm font-bold hover:bg-gray-600 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {isProcessingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Layout className="w-5 h-5" />} 전체 스캔
            </button>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Area */}
          <div className="lg:col-span-4 flex flex-col gap-10">
            <FileUploader onFilesSelected={handleFilesSelected} />
            
            <div className="bg-white rounded-[4rem] p-10 shadow-xl border border-yellow-50 min-h-[400px] flex flex-col">
              <h2 className="text-2xl font-bold text-gray-800 mb-8">파일 목록 <span className="text-lg font-medium text-gray-300 ml-2">({files.length})</span></h2>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                {files.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-300 opacity-60 py-20">
                    <FileSearch className="w-16 h-16 mb-4" />
                    <p className="text-base font-bold">업로드된 파일이 없습니다.</p>
                    <div className="mt-6 px-6 py-2.5 bg-gray-50 rounded-full border border-gray-100 text-xs font-bold text-gray-400 flex items-center gap-2">
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
                <button onClick={() => setFiles([])} className="mt-6 w-full py-3 text-xs text-red-300 hover:text-red-500 font-bold flex items-center justify-center gap-2 transition-colors">
                  <Trash2 className="w-4 h-4" /> 목록 비우기
                </button>
              )}
            </div>
          </div>

          {/* Right Area */}
          <div id="main-viewer" className="lg:col-span-8 bg-white rounded-[4rem] shadow-2xl border border-yellow-50 overflow-hidden flex flex-col min-h-[700px]">
            {selectedFile ? (
              <>
                <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-6 bg-white sticky top-0 z-20">
                  <div className="flex bg-gray-100 p-1.5 rounded-full w-full sm:w-auto shadow-inner">
                    <button onClick={() => setActiveTab('original')} className={`flex-1 sm:flex-none px-8 py-3 rounded-full text-base font-bold transition-all ${activeTab === 'original' ? 'bg-white shadow-md text-gray-900' : 'text-gray-400'}`}>이미지</button>
                    <button onClick={() => setActiveTab('extracted')} className={`flex-1 sm:flex-none px-8 py-3 rounded-full text-base font-bold transition-all ${activeTab === 'extracted' ? 'bg-white shadow-md text-gray-900' : 'text-gray-400'}`}>추출 텍스트</button>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button onClick={() => handleRefine('correction')} disabled={!selectedFile.extractedText || selectedFile.status === 'processing'} className="px-5 py-3 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-all flex items-center gap-2 text-sm font-bold disabled:opacity-50 border border-green-100 shadow-sm"><Wand2 className="w-4 h-4" /> 교정</button>
                    <button onClick={() => handleRefine('summary')} disabled={!selectedFile.extractedText || selectedFile.status === 'processing'} className="px-5 py-3 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-all flex items-center gap-2 text-sm font-bold disabled:opacity-50 border border-purple-100 shadow-sm"><FileText className="w-4 h-4" /> 요약</button>
                    <div className="w-[1px] h-8 bg-gray-200 mx-1 hidden sm:block" />
                    <button onClick={copyToClipboard} className="p-3.5 bg-gray-50 text-gray-500 rounded-full hover:bg-gray-100 shadow-sm active:scale-95 transition-all"><Copy className="w-5 h-5" /></button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-gray-50/10">
                  <div className={`${activeTab === 'original' ? 'flex' : 'hidden md:flex md:w-1/2'} h-full p-10 items-start justify-center overflow-auto custom-scrollbar border-r border-gray-100`}>
                    {selectedFile.type === 'image' ? (
                      <img src={selectedFile.previewUrl} alt="original" className="max-w-full h-auto rounded-3xl shadow-2xl border border-gray-200" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-white rounded-[3rem] border border-dashed border-gray-200 p-12">
                        <FileText className="w-24 h-24 mb-6 opacity-20" />
                        <p className="font-extrabold text-2xl text-gray-500">PDF 원본</p>
                      </div>
                    )}
                  </div>

                  <div className={`${activeTab === 'extracted' ? 'flex' : 'hidden md:flex md:w-1/2'} flex-1 p-10 sm:p-14 flex-col bg-white overflow-hidden`}>
                    {selectedFile.status === 'processing' ? (
                      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                        <div className="relative"><div className="w-28 h-28 border-[6px] border-yellow-50 rounded-full animate-spin border-t-[#FFD600]"></div><div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-12 h-12 text-[#FFD600]" /></div></div>
                        <div className="text-center"><p className="text-2xl font-extrabold text-gray-800">문서를 분석하고 있어요</p><p className="text-base text-gray-400 mt-3 font-medium">수식과 표까지 꼼꼼하게 추출 중입니다...</p></div>
                      </div>
                    ) : selectedFile.extractedText ? (
                      <textarea 
                        className="flex-1 w-full h-full p-6 sm:p-10 text-gray-900 bg-white font-medium text-xl sm:text-2xl lg:text-3xl leading-[1.8] resize-none custom-scrollbar outline-none focus:ring-0 placeholder-gray-200"
                        value={selectedFile.extractedText}
                        onChange={(e) => setFiles(prev => prev.map(f => f.id === selectedFileId ? { ...f, extractedText: e.target.value } : f))}
                      />
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3rem] border border-dashed border-gray-100">
                        <div className="bg-yellow-50 p-12 rounded-full mb-10 shadow-inner"><Sparkles className="w-16 h-16 text-[#FFD600]" /></div>
                        <h3 className="text-3xl font-extrabold text-gray-800 mb-8 tracking-tight">AI 스캔 대기 중</h3>
                        <button onClick={() => processFile(selectedFile.id)} className="px-14 py-5 bg-[#FFD600] text-white rounded-full font-bold shadow-2xl shadow-yellow-200 hover:scale-105 active:scale-95 transition-all text-xl">지금 분석하기</button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-10 sm:p-20 text-center bg-white h-full">
                <div className="bg-[#F8F9FA] p-20 sm:p-28 rounded-[5rem] mb-12 shadow-inner group">
                  <FileSearch className="w-28 h-28 sm:w-40 sm:h-40 text-gray-200 group-hover:scale-110 transition-transform duration-500" />
                </div>
                <h3 className="text-3xl sm:text-4xl font-extrabold text-[#111827] mb-6 tracking-tight">어떤 문서를 도와드릴까요?</h3>
                <p className="text-gray-400 text-lg sm:text-xl max-w-lg mx-auto font-medium mb-12">분석할 파일을 선택하거나 새로 업로드해 보세요.</p>
                
                <div className="flex flex-wrap justify-center gap-4">
                  <div className="flex items-center gap-2 px-8 py-3.5 bg-yellow-50 text-yellow-600 rounded-full text-sm font-bold border border-yellow-100 shadow-sm"><Camera className="w-5 h-5" /> 카메라 촬영 지원</div>
                  <div className="flex items-center gap-2 px-8 py-3.5 bg-blue-50 text-blue-600 rounded-full text-sm font-bold border border-blue-100 shadow-sm"><FileText className="w-5 h-5" /> PDF 수식 추출 최적화</div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Sticky Bar */}
      <footer className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] z-50">
        <div className="bg-[#111827]/90 backdrop-blur-2xl p-4 rounded-full shadow-2xl flex justify-between items-center border border-white/10 px-12">
          <button className="flex flex-col items-center gap-2 text-white/40 hover:text-white" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><Sun className="w-7 h-7" /><span className="text-[10px] font-bold uppercase tracking-widest">Home</span></button>
          <div className="w-16 h-16 bg-[#FFD600] rounded-full flex items-center justify-center shadow-2xl shadow-yellow-400/40 -mt-12 border-4 border-white active:scale-90 transition-transform" onClick={() => document.getElementById('file-input')?.click()}><Camera className="w-9 h-9 text-white" /></div>
          <button className="flex flex-col items-center gap-2 text-white/40 hover:text-white" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><Key className="w-7 h-7" /><span className="text-[10px] font-bold uppercase tracking-widest">Key</span></button>
        </div>
      </footer>
    </div>
  );
};

export default App;
