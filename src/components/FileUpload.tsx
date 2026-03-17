"use client";

type FileUploadProps = {
  isLoading?: boolean;
  fileNames: string[];
  onSelect: (files: FileList) => void | Promise<void>;
  onRemove?: (fileName: string) => void;
};

export function FileUpload({
  isLoading,
  fileNames,
  onSelect,
  onRemove,
}: FileUploadProps) {
  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 sm:w-auto">
        <input
          type="file"
          className="hidden"
          accept=".txt,.md,.docx,.pdf"
          multiple
          disabled={isLoading}
          onChange={(event) => {
            if (event.target.files?.length) {
              void onSelect(event.target.files);
              event.target.value = "";
            }
          }}
        />
        上传附件
      </label>

      <div className="flex flex-wrap gap-2">
        {fileNames.map((fileName) => (
          <span
            key={fileName}
            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
          >
            {fileName}
            {onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(fileName)}
                className="text-slate-400 transition hover:text-slate-700"
              >
                x
              </button>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}
