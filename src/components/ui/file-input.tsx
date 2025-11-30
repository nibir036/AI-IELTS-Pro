
'use client';

import * as React from 'react';
import { Upload } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface FileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {
  name: string;
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, name, ...props }, ref) => {
    const { register, setValue, watch } = useFormContext();
    const [fileName, setFileName] = React.useState<string | null>(null);

    const fileList = watch(name);

    React.useEffect(() => {
        if (fileList && fileList.length > 0) {
            setFileName(fileList[0].name);
        } else {
            setFileName(null);
        }
    }, [fileList]);
    
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
          type="file"
          className="sr-only"
          {...register(name)}
          {...props}
          ref={ref}
        />
      </div>
    );
  }
);
FileInput.displayName = 'FileInput';

export { FileInput };
