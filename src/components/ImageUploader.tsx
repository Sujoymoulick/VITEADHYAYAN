import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { UploadCloud, X, Loader2, Info } from 'lucide-react';
import { uploadImageToCloudinary } from '../lib/cloudinary';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';

interface ImageUploaderProps {
  onUploadSuccess: (url: string) => void;
  onUploadStateChange?: (isUploading: boolean) => void;
  className?: string;
  initialImage?: string;
}

export function ImageUploader({ onUploadSuccess, onUploadStateChange, className, initialImage }: ImageUploaderProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isUploading, _setIsUploading] = useState(false);
  
  const setIsUploading = (val: boolean) => {
    _setIsUploading(val);
    onUploadStateChange?.(val);
  };
  const [preview, setPreview] = useState<string | null>(initialImage || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialImage) {
      setPreview(initialImage);
    }
  }, [initialImage]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    // Create local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      const url = await uploadImageToCloudinary(file);
      onUploadSuccess(url);
    } catch (err: any) {
      console.error('[Cloudinary] Upload failed. Config:', {
        cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
        uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ? 'SET' : 'MISSING',
        apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY ? 'SET' : 'MISSING'
      });
      console.error('[Cloudinary] Error details:', err);

      if (err.message?.includes('missing in environment')) {
        setError('Config Error: Cloudinary keys not found in .env');
      } else {
        setError('Upload failed. Please check your internet or Vercel settings.');
      }
      // Keep preview so user sees what they tried to upload
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess]);

  const dropzoneOptions: any = {
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    multiple: false
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneOptions);

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onUploadSuccess('');
  };

  return (
    <div className={cn("w-full h-64", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-xl cursor-pointer transition-colors overflow-hidden group",
          isDragActive ? "border-teal-400 bg-teal-400/10" : "border-gray-600 hover:border-teal-500 hover:bg-white/5",
          preview ? "border-none" : ""
        )}
      >
        <input {...getInputProps()} />
        
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white font-medium">Click or drag to replace</p>
            </div>
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full hover:bg-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-400">
            {isUploading ? (
              <Loader2 className="w-10 h-10 mb-3 animate-spin text-teal-400" />
            ) : (
              <UploadCloud className="w-10 h-10 mb-3 group-hover:text-teal-400 transition-colors" />
            )}
            <p className="mb-2 text-sm">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs">SVG, PNG, JPG or WEBP (MAX. 800x400px)</p>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm text-red-500 font-medium">{error}</p>
          <div className="group relative">
            <div className={cn("p-1 rounded-full cursor-help", isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500")}>
              <Info className="w-4 h-4" />
            </div>
            <div className={cn(
              "absolute bottom-full right-0 mb-2 w-64 p-3 rounded-xl border text-[10px] leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50",
              isDark ? "bg-gray-900 border-white/10 text-gray-400 shadow-2xl" : "bg-white border-gray-200 text-gray-600 shadow-xl"
            )}>
              <p className="font-bold mb-1 text-red-400 uppercase tracking-wider">Configuration Checklist:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your local .env file</li>
                <li>Ensure keys are in Vercel Dashboard</li>
                <li>Wait for Cloudinary preset to propagate</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
