import React, { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

interface FileUploadWithProgressProps {
  label: string;
  id: string;
  accept?: string;
  multiple?: boolean;
  onUploadComplete: (url: string | string[]) => void;
  existingValue?: string | string[];
}

export default function FileUploadWithProgress({ label, id, accept, multiple, onUploadComplete, existingValue }: FileUploadWithProgressProps) {
  const [progress, setProgress] = useState<{ [filename: string]: number }>({});
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingUrls = Array.isArray(existingValue) ? existingValue : (existingValue ? [existingValue] : []);

  const handleFiles = (filesList: FileList | File[]) => {
    if (!filesList?.length) return;
    
    setError(null);
    const files = Array.from(filesList);
    
    const completedUrls: string[] = [];
    let uploadCount = 0;

    files.forEach((file) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
      const storageRef = ref(storage, `uploads/${uniqueName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);

      setProgress(prev => ({ ...prev, [file.name]: 0 }));

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(prev => ({ ...prev, [file.name]: Math.round(p) }));
        },
        (err) => {
          console.error('Upload failed:', err);
          setError(`Upload failed for ${file.name}`);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
          
          completedUrls.push(downloadURL);
          uploadCount++;

          if (uploadCount === files.length) {
            if (multiple) {
              onUploadComplete([...existingUrls, ...completedUrls]);
            } else {
              onUploadComplete(completedUrls[0]);
            }
          }
        }
      );
    });
  };

  const handleClear = (urlToRemove: string) => {
    if (multiple) {
      onUploadComplete(existingUrls.filter(u => u !== urlToRemove));
    } else {
      onUploadComplete('');
    }
  };

  const isImage = (url: string) => {
    return url.match(/\.(jpeg|jpg|gif|png|svg|webp|bmp)(\?.*)?$/i) != null;
  };

  const showDropzone = multiple || existingUrls.length === 0;

  return (
    <div className="mb-4">
      <label className="input-label" htmlFor={id}>{label}</label>
      
      <div className="flex flex-col gap-3">
        
        {/* Existing / Uploaded Files Preview */}
        {existingUrls.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {existingUrls.map((url, i) => (
              <div key={i} className={`relative border border-border rounded-lg overflow-hidden flex items-center ${isImage(url) ? 'w-[120px] h-[120px] p-0' : 'w-full h-auto py-2 px-3'}`}>
                {isImage(url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand no-underline max-w-[85%] truncate">
                    {url.split('/').pop()?.split('?')[0]}
                  </a>
                )}
                
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); handleClear(url); }}
                  className={`absolute bg-danger text-white border-none rounded-full w-6 h-6 flex items-center justify-center cursor-pointer text-sm shadow-md ${isImage(url) ? 'top-1 right-1' : 'top-1/2 right-2 -translate-y-1/2'}`}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {showDropzone && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-lg py-8 px-4 text-center cursor-pointer transition-all flex flex-col items-center gap-2 ${isDragging ? 'border-brand bg-[rgba(79,70,229,0.05)]' : 'border-border bg-bg-secondary'}`}
          >
            <div className="text-2xl">📥</div>
            <div className="font-medium text-text-primary">Click or drag file to this area to upload</div>
            <div className="text-xs text-text-secondary">Supports {accept || 'images, PDF, documents, etc.'}</div>
            
            <input 
              id={id}
              type="file" 
              accept={accept} 
              multiple={multiple} 
              onChange={(e) => handleFiles(e.target.files!)}
              ref={fileInputRef}
              className="hidden"
            />
          </div>
        )}
        
        {error && <div className="text-danger text-[13px]">{error}</div>}

        {/* Progress indicators */}
        {Object.entries(progress).map(([filename, p]) => (
          <div key={filename} className="flex items-center gap-3 text-[13px] bg-bg-secondary py-2 px-3 rounded-md">
            <div className="flex-1 truncate">{filename}</div>
            <div className="flex-[2] h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${p}%` }} />
            </div>
            <div className="w-10 text-right font-semibold">{p}%</div>
          </div>
        ))}

      </div>
    </div>
  );
}
