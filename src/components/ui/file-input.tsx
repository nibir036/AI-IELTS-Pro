'use client';

import * as React from 'react';
import { Upload } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Input, type InputProps } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FileInputProps extends Omit<InputProps, 'name'> {
  name: string;
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, name, ...props }, ref) => {
    // Check if form context exists. If not, this component might be used outside a form.
    const formContext = useFormContext();
    const hasFormContext = !!formContext;

    const [fileName, setFileName] = React.useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      setFileName(file?.name || null);
      if (hasFormContext) {
        formContext.setValue(name, e.target.files);
      }
      props.onChange?.(e);
    };

    const inputProps: InputProps = hasFormContext 
      ? { ...formContext.register(name), ...props, onChange: handleFileChange }
      : { ...props, name, onChange: handleFileChange };

    return (
      <div className={cn('relative w-full', className)}>
        <Label
          htmlFor={name}
          className={cn(
            "flex items-center justify-center w-full h-24 px-4 transition bg-background border-2 border-dashed rounded-md appearance-none cursor-pointer hover:border-primary focus:outline-none",
            formContext?.formState.errors[name] && 'border-destructive text-destructive'
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
          {...inputProps}
          ref={ref}
        />
      </div>
    );
  }
);
FileInput.displayName = 'FileInput';

export { FileInput };
