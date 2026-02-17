
import React, { useCallback } from 'react';
import { Upload, Camera, FileText, Image as ImageIcon } from 'lucide-react';

interface FileUploaderProps {
  onFilesSelected: (files: FileList) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected }) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      onFilesSelected(e.dataTransfer.files);
    }
  }, [onFilesSelected]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(e.target.files);
    }
  };

  return (
    <div 
      className="w-full h-auto border-4 border-dashed border-yellow-200 rounded-[3rem] bg-white hover:bg-yellow-50/30 transition-all flex flex-col items-center justify-center p-6 md:p-8 text-center cursor-pointer group"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input 
        id="file-input" 
        type="file" 
        multiple 
        accept="image/*,application/pdf" 
        className="hidden" 
        onChange={handleInput}
      />
      
      <div className="bg-yellow-100 p-5 rounded-full mb-4 group-hover:scale-110 transition-transform">
        <Upload className="w-10 h-10 text-yellow-600" />
      </div>
      
      <h3 className="text-xl font-bold text-gray-700 mb-2">이미지 또는 PDF를 올려주세요</h3>
      <p className="text-gray-500 max-w-xs text-sm">
        파일을 드래그하거나 클릭하여 업로드하세요.<br/>
        시험지, 강의자료, 스캔본 모두 환영합니다.
      </p>

      {/* Improved Button Grid Layout */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-50 rounded-[1.5rem] text-orange-600 text-[13px] font-bold shadow-sm border border-orange-100/50">
          <ImageIcon className="w-4 h-4" /> 이미지
        </div>
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 rounded-[1.5rem] text-blue-600 text-[13px] font-bold shadow-sm border border-blue-100/50">
          <FileText className="w-4 h-4" /> PDF
        </div>
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 rounded-[1.5rem] text-purple-600 text-[13px] font-bold shadow-sm border border-purple-100/50 col-span-2 sm:col-span-1">
          <Camera className="w-4 h-4" /> 카메라
        </div>
      </div>
    </div>
  );
};
