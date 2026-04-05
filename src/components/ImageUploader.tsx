import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { uploadImageToCloudinary } from '../lib/cloudinary';
import { cn } from '../lib/utils';

interface ImageUploaderProps {
  onUploadSuccess: (url: string) => void;
  className?: string;
  initialImage?: string;
}

export function ImageUploader({ onUploadSuccess, className, initialImage }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
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
    } catch (err) {
      setError('Failed to upload image. Please try again.');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess]);

  const dropzoneOptions: DropzoneOptions = {
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
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
