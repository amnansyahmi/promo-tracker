import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, ImageIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  onUpload: (urls: string[]) => void;
  folder?: string;
  initialImages?: string[];
}

export function ImageUpload({ onUpload, folder = 'submissions', initialImages = [] }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>(initialImages);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (files.some(file => file.size > 20 * 1024 * 1024)) {
      toast.error('Some files are too large. Max 20MB per file.');
      return;
    }

    setUploading(true);

    const newPreviews: string[] = [];

    const processNext = (index: number) => {
      if (index >= files.length) {
        const updatedPreviews = [...previews, ...newPreviews];
        setPreviews(updatedPreviews);
        onUpload(updatedPreviews);
        setUploading(false);
        toast.success(`Processed ${files.length} file(s)!`);
        return;
      }

      const file = files[index];
      
      // Handle Video
      if (file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push(e.target?.result as string);
          processNext(index + 1);
        };
        reader.onerror = () => processNext(index + 1);
        reader.readAsDataURL(file);
        return;
      }

      // Handle Image
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            newPreviews.push(dataUrl);
            processNext(index + 1);
          } else {
            processNext(index + 1);
          }
        };
        img.onerror = () => {
          processNext(index + 1);
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        processNext(index + 1);
      };
      reader.readAsDataURL(file);
    };

    processNext(0);
  };

  const removeImage = (index: number) => {
    const newPrevs = previews.filter((_, i) => i !== index);
    setPreviews(newPrevs);
    onUpload(newPrevs);
  };

  return (
    <div className="w-full space-y-4">
      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {previews.map((preview, idx) => {
            const isVid = preview.startsWith('data:video/') || preview.match(/\.(mp4|webm|mov|ogg)$/i);
            return (
              <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-50">
                {isVid ? (
                  <video src={preview} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={preview} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                )}
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImage(idx); }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg z-10"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {uploading ? (
        <div className="w-full h-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <Loader2 className="animate-spin mb-2 text-slate-400" />
          <span className="text-xs font-bold text-slate-500">Processing images...</span>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors group">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <div className="flex items-center text-slate-600 font-bold text-sm">
              <Plus className="w-4 h-4 mr-1 text-slate-400" /> Add Photo or Video
            </div>
          </div>
          <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={handleUpload} disabled={uploading} />
        </label>
      )}
    </div>
  );
}
