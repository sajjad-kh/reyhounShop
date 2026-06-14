import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud, Expand, ChevronDown, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  toggle: () => void;

  fileInputRef: React.RefObject<HTMLInputElement>;
  selectedDesignFile: File | null;
  previewUrl: string | null;

  adminComment: string;
  setAdminComment: (v: string) => void;

  isUploading: boolean;
  uploadProgress: number;

  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  onSubmit: () => void;

  onOpenLightbox: () => void;
};

export default function DesignActionsPanel({
  isOpen,
  toggle,
  fileInputRef,
  selectedDesignFile,
  previewUrl,
  adminComment,
  setAdminComment,
  isUploading,
  uploadProgress,
  onFileSelect,
  onRemoveFile,
  onSubmit,
  onOpenLightbox,
}: Props) {
  return (
    <div className="mx-8 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] backdrop-blur-xl shadow-xl overflow-hidden min-h-[8%]">

      {/* HEADER */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition"
      >
        <h3 className="text-white font-semibold">
          ارسال طرح و پیام
        </h3>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          <ChevronDown className="w-5 h-5 text-white/70" />
        </motion.div>
      </button>

      {/* BODY */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">

              {/* UPLOAD */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-dashed border-white/15 hover:border-accent-primary/40 transition"
                >
                  <UploadCloud className="w-5 h-5 text-white/70" />
                  <div className="text-right">
                    <p className="text-sm text-white">
                      انتخاب تصویر طراحی
                    </p>
                    <p className="text-[10px] text-white/40">
                      PNG / JPG / WEBP
                    </p>
                  </div>
                </button>

                {/* PREVIEW */}
                {previewUrl && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-white/10 bg-black/20">

                    <div className="relative group">
                      <img
                        src={previewUrl}
                        className="w-full h-24 object-cover"
                      />

                      <button
                        onClick={onOpenLightbox}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"
                      >
                        <Expand className="w-5 h-5 text-white" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center p-2">
                      <p className="text-xs text-white/60 truncate">
                        {selectedDesignFile?.name}
                      </p>

                      <button
                        onClick={onRemoveFile}
                        className="text-[10px] px-2 py-1 rounded-md bg-red-500/10 text-red-300"
                      >
                        حذف
                      </button>
                    </div>

                    {isUploading && (
                      <div className="px-2 pb-2">
                        <div className="flex justify-between text-[10px] text-white/50 mb-1">
                          <span>Uploading...</span>
                          <span className="text-accent-primary">
                            {uploadProgress}%
                          </span>
                        </div>

                        <div className="h-1 bg-white/10 rounded overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-accent-primary to-purple-500"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* COMMENT */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-white/60">
                    توضیحات
                  </span>
                  <span className="text-[10px] text-white/30">
                    {adminComment.length}/500
                  </span>
                </div>

                <textarea
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  maxLength={500}
                  className="w-full h-24 p-3 rounded-xl bg-black/20 border border-white/10 text-white resize-none text-sm"
                />
              </div>

              {/* SUBMIT */}
              <button
                onClick={onSubmit}
                disabled={
                  isUploading ||
                  (!selectedDesignFile && !adminComment?.trim())
                }
                className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-primary to-purple-600 text-white font-medium disabled:opacity-50"
              >
                {isUploading ? "در حال آپلود..." : "ثبت و ارسال"}
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}