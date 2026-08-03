import React from 'react';
import { UploadCloud, File, X, CheckCircle2 } from 'lucide-react';
import { Attachment } from '../../types';
import { uploadFileAttachment } from '../../services/api';

interface FileDropzoneProps {
  onFileUploaded: (attachment: Attachment) => void;
  pendingAttachments: Attachment[];
  onRemoveAttachment: (id: string) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileUploaded,
  pendingAttachments,
  onRemoveAttachment,
}) => {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const attachment = await uploadFileAttachment(files[i]);
        onFileUploaded(attachment);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Pending Uploaded Attachments Chips */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 rounded-xl glass-card border border-cyan-500/30">
          {pendingAttachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs text-cyan-300"
            >
              <File className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px]">{att.originalName}</span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(att.id)}
                className="text-slate-400 hover:text-rose-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
