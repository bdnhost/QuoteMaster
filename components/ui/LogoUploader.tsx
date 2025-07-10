
import React from 'react';

interface LogoUploaderProps {
  logoUrl: string | null;
  onLogoChange: (file: File | null) => void;
}

const LogoUploader: React.FC<LogoUploaderProps> = ({ logoUrl, onLogoChange }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onLogoChange(event.target.files[0]);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
        {logoUrl ? (
          <img src={logoUrl} alt="לוגו עסק" className="w-full h-full object-cover" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      <div>
        <label htmlFor="logo-upload" className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium">
          העלאת לוגו
        </label>
        <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF עד 10MB</p>
      </div>
    </div>
  );
};

export default LogoUploader;
