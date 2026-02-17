
import React from 'react';
import { FileData } from '../types';
import { CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react';

interface FileItemProps {
  item: FileData;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: (id: string) => void;
}

export const FileItem: React.FC<FileItemProps> = ({ item, isSelected, onSelect, onRemove }) => {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'processing': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = () => {
    if (isSelected) return 'bg-orange-100 border-orange-200';
    switch (item.status) {
      case 'completed': return 'bg-green-50 border-green-100';
      case 'processing': return 'bg-blue-50 border-blue-100';
      case 'error': return 'bg-red-50 border-red-100';
      default: return 'bg-white border-gray-100';
    }
  };

  return (
    <div 
      onClick={onSelect}
      className={`relative p-4 border-2 rounded-[2rem] cursor-pointer transition-all ${getStatusColor()} flex items-center gap-4 group mb-3 shadow-sm`}
    >
      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
        {item.type === 'image' ? (
          <img src={item.previewUrl} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-xs">PDF</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold truncate text-gray-700">{item.file.name}</h4>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${item.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`} 
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 font-medium">{item.progress}%</span>
        </div>
      </div>

      <div className="flex-shrink-0 ml-2">
        {getStatusIcon()}
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        className="absolute -top-2 -right-2 bg-white shadow-md rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
      </button>
    </div>
  );
};
