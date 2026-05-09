import React, { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  folder?: string;
}

export function ImageUpload({ onUpload, folder = 'submissions' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max 5MB.');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const prog = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setProgress(prog);
      },
      (error) => {
        console.error(error);
        toast.error('Upload failed');
        setUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        onUpload(downloadURL);
        setUploading(false);
        toast.success('Image uploaded!');
      }
    );
  };

  return (
    <div className="w-full">
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-50">
          <img src={preview} alt="Preview" className="w-full h-full object-contain" />
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white flex-col">
              <Loader2 className="animate-spin mb-2" />
              <span className="text-xs font-bold">{progress}%</span>
            </div>
          )}
          {!uploading && (
            <button 
              onClick={() => { setPreview(null); setProgress(0); }}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors group">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
              <ImageIcon className="w-6 h-6 text-slate-400" />
            </div>
            <p className="mb-1 text-sm text-slate-600 font-bold">Click to upload photo</p>
            <p className="text-xs text-slate-400 tracking-tight">PNG, JPG or WEBP (MAX. 5MB)</p>
          </div>
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
        </label>
      )}
    </div>
  );
}
