
'use client';

import * as React from 'react';
import { Upload } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface FileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, name, ...props }, ref) => {
    const context = useFormContext();
    const [fileName, setFileName] = React.useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        setFileName(e.target.files[0].name);
        if (context) {
          context.setValue(name, e.target.files, { shouldValidate: true });
        }
      } else {
        setFileName(null);
        if (context) {
          context.setValue(name, null, { shouldValidate: true });
        }
      }
    };
    
    return (
      <div className={cn('relative', className)}>
        <label
          htmlFor={name}
          className="flex items-center justify-center w-full h-24 px-4 transition bg-background border-2 border-dashed rounded-md appearance-none cursor-pointer hover:border-primary focus:outline-none"
        >
          <span className="flex items-center space-x-2">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">
              {fileName || 'Click to select a file'}
            </span>
          </span>
        </label>
        <Input
          id={name}
          name={name}
          type="file"
          className="sr-only"
          onChange={handleFileChange}
          {...props}
          ref={ref}
        />
      </div>
    );
  }
);
FileInput.displayName = 'FileInput';

export { FileInput };
