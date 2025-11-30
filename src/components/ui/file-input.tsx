'use client';

import * as React from 'react';
import { Upload } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Input, type InputProps } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FileInputProps extends Omit<InputProps, 'name' | 'type'> {
  name: string;
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, name, ...props }, ref) => {
    const { register, watch, setValue, formState: { errors } } = useFormContext();

    const fileList = watch(name) as FileList | null;
    const fileName = fileList?.[0]?.name;

    const { ref: fieldRef, ...fieldProps } = register(name, {
        onChange: (e) => {
            setValue(name, e.target.files);
        },
    });

    return (
      <div className={cn('relative w-full', className)}>
        <Label
          htmlFor={name}
          className={cn(
            "flex items-center justify-center w-full h-24 px-4 transition bg-background border-2 border-dashed rounded-md appearance-none cursor-pointer hover:border-primary focus:outline-none",
            errors[name] && 'border-destructive text-destructive'
          )}
        >
          <span className="flex items-center space-x-2">
            <Upload className="w-6 h-6" />
            <span className="font-medium text-center">
              {fileName || 'Click to select a file'}
            </span>
          </span>
        </Label>
        <Input
          id={name}
          type="file"
          className="sr-only"
          {...fieldProps}
          {...props}
          ref={(e) => {
            fieldRef(e);
            if (ref) {
              (ref as React.MutableRefObject<HTMLInputElement | null>).current = e;
            }
          }}
        />
      </div>
    );
  }
);
FileInput.displayName = 'FileInput';

export { FileInput };
