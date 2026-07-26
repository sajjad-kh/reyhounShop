import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud, Expand, ChevronDown, Trash2, Send, ImageIcon, MessageSquareText } from "lucide-react";

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
  const hasContent = selectedDesignFile || adminComment?.trim();

  return (
    <div className="rounded-xl sm:rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] backdrop-blur-xl shadow-xl overflow-hidden">

      {/* HEADER */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent-primary/15 border border-accent-primary/20 flex items-center justify-center">
            <Send className="w-3.5 h-3.5 text-accent-primary" />
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-white">ارسال طرح و پیام</h3>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-white/50" />
        </motion.div>
      </button>

      {/* BODY */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="design-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="flex flex-col max-h-[45vh] sm:max-h-none">
              <div className="overflow-y-auto [overscroll-behavior:contain] px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">

                {/* UPLOAD */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileSelect}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
                    <div className="relative group">
                      <img src={previewUrl} className="w-full h-28 sm:h-32 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      <div className="absolute bottom-0 left-0 right-0 p-2.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={onOpenLightbox}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 backdrop-blur-md text-white text-[10px] font-medium hover:bg-white/25 transition"
                        >
                          <Expand className="w-3 h-3" />
                          مشاهده
                        </button>
                        <button
                          onClick={onRemoveFile}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 backdrop-blur-md text-red-300 text-[10px] font-medium hover:bg-red-500/30 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                          حذف
                        </button>
                      </div>
                    </div>

                    <div className="px-3 py-2 flex items-center gap-2 bg-white/[0.03]">
                      <ImageIcon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                      <p className="text-[10px] sm:text-[11px] text-white/50 truncate flex-1">{selectedDesignFile?.name}</p>
                    </div>

                    {isUploading && (
                      <div className="px-3 pb-2.5">
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-accent-primary to-purple-500 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-white/40 mt-1 text-left">{uploadProgress}%</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 py-5 sm:py-6 rounded-xl border border-dashed border-white/12 hover:border-accent-primary/30 bg-white/[0.02] hover:bg-accent-primary/[0.03] transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-accent-primary/10 flex items-center justify-center transition-colors">
                      <UploadCloud className="w-5 h-5 text-white/40 group-hover:text-accent-primary transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] sm:text-xs text-white/60 group-hover:text-white/80 transition-colors">انتخاب تصویر طراحی</p>
                      <p className="text-[9px] text-white/30 mt-0.5">PNG / JPG / WEBP</p>
                    </div>
                  </button>
                )}

                {/* COMMENT */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <MessageSquareText className="w-3 h-3 text-white/30" />
                      <span className="text-[10px] sm:text-[11px] text-white/50">توضیحات</span>
                    </div>
                    <span className="text-[9px] text-white/25 tabular-nums">{adminComment.length}/500</span>
                  </div>
                  <textarea
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    maxLength={500}
                    placeholder="توضیحات ارسال طرح..."
                    className="w-full h-20 sm:h-24 p-2.5 sm:p-3 rounded-xl bg-black/20 border border-white/8 text-white placeholder:text-white/20 resize-none text-xs sm:text-sm focus:outline-none focus:border-accent-primary/30 transition-colors"
                  />
                </div>

              </div>

              {/* SUBMIT */}
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-white/[0.06] bg-[#0A0F1C]/90 backdrop-blur-xl">
                <button
                  onClick={onSubmit}
                  disabled={isUploading || !hasContent}
                  className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-accent-primary to-purple-600 text-white text-xs sm:text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/30 active:scale-[0.98]"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      در حال آپلود...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      ثبت و ارسال
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
