import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { X, Check, AlertTriangle, Upload, Trash2 } from 'lucide-react';
import { inventoryItemService } from '../../services/inventoryItemService';
import { toast } from '../../utils/toast';
import { formatNumber } from '../../utils/format';
import { GlassModal } from '../../components/ui/GlassModal';

interface ImportItem {
  name: string;
  sku: string | null;
  quantity: number;
  unit: string | null;
  costPrice: number | null;
  sellPrice: number | null;
  lowStockAlert: number;
  location: string | null;
  supplier: string | null;
  description: string | null;
  minOrderQty: number;
  rowIndex: number;
  isDuplicate: boolean;
  duplicateType: string | null;
  existingId: number | null;
}

interface ImportPreviewModalProps {
  file: File;
  items: ImportItem[];
  parseErrors: { row: number; name: string; error: string }[];
  totalRows: number;
  validRows: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  file,
  items,
  parseErrors,
  totalRows,
  validRows,
  onClose,
  onSuccess,
}) => {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(items.map((item, idx) => !item.isDuplicate ? idx : -1).filter((i) => i >= 0))
  );
  const [importing, setImporting] = useState(false);

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    const nonDupIndices = items.map((item, idx) => !item.isDuplicate ? idx : -1).filter((i) => i >= 0);
    if (selected.size === nonDupIndices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(nonDupIndices));
    }
  };

  const handleConfirm = async () => {
    if (selected.size === 0) {
      toast.error('هیچ آیتمی انتخاب نشده');
      return;
    }
    setImporting(true);
    try {
      const selectedItems = items.filter((_, idx) => selected.has(idx));
      const result = await inventoryItemService.confirmImport(file, selectedItems);
      if (result.success && result.data) {
        const { success, errors } = result.data;
        if (success > 0) {
          toast.success(`${formatNumber(success)} کالا با موفقیت اضافه شد`);
          onSuccess();
        }
        if (errors.length > 0) {
          const errMsg = errors.map((e) => `${e.name}: ${e.error}`).join('، ');
          toast.error(`${formatNumber(errors.length)} خطا: ${errMsg}`);
        }
        onClose();
      } else {
        toast.error(result.error || 'خطا در ورود اطلاعات');
      }
    } catch {
      toast.error('خطا در ورود اطلاعات');
    } finally {
      setImporting(false);
    }
  };

  return (
    <GlassModal isOpen={true} onClose={onClose} size="xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-glass-light">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-accent-primary" />
          <h2 className="text-lg font-bold text-text-primary">پیش‌نمایش ورود اطلاعات</h2>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-text-primary inline-block"></span>کل: <b>{formatNumber(totalRows)}</b></span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>معتبر: <b className="text-emerald-400">{formatNumber(validRows)}</b></span>
          {parseErrors.length > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>خطا: <b className="text-red-400">{formatNumber(parseErrors.length)}</b></span>}
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>تکراری: <b className="text-amber-400">{formatNumber(items.filter((i) => i.isDuplicate).length)}</b></span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent-primary inline-block"></span>انتخاب: <b className="text-accent-primary">{formatNumber(selected.size)}</b></span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

        {/* Parse Errors */}
        {parseErrors.length > 0 && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm">
            <p className="font-bold text-red-400 mb-1">خطاهای فایل:</p>
            {parseErrors.map((e, i) => (
              <p key={i} className="text-red-300 text-xs">ردیف {e.row}: {e.error}</p>
            ))}
          </div>
        )}

        {/* Items Table */}
        <div className="flex-1 overflow-auto px-5 py-3">
          {items.length === 0 ? (
            <p className="text-center text-text-secondary py-8">آیتمی یافت نشد</p>
          ) : (
            <div className="space-y-2">
              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="py-2.5 px-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={selected.size === items.filter((i) => !i.isDuplicate).length && items.filter((i) => !i.isDuplicate).length > 0}
                          onChange={toggleAll}
                          className="w-4 h-4 accent-accent-primary"
                        />
                      </th>
                      <th className="text-right py-2.5 px-3 text-text-muted font-medium">نام کالا</th>
                      <th className="text-right py-2.5 px-3 text-text-muted font-medium">کد</th>
                      <th className="text-right py-2.5 px-3 text-text-muted font-medium">تعداد</th>
                      <th className="text-right py-2.5 px-3 text-text-muted font-medium">واحد</th>
                      <th className="text-right py-2.5 px-3 text-text-muted font-medium">قیمت خرید</th>
                      <th className="text-right py-2.5 px-3 text-text-muted font-medium">قیمت فروش</th>
                      <th className="text-right py-2.5 px-3 text-text-muted font-medium">محل</th>
                      <th className="text-right py-2.5 px-3 text-text-muted font-medium">تامین کننده</th>
                      <th className="text-center py-2.5 px-3 text-text-muted font-medium">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-white/5 transition-colors ${
                          item.isDuplicate
                            ? 'bg-amber-400/5'
                            : selected.has(idx)
                            ? 'bg-emerald-400/5'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={selected.has(idx)}
                            disabled={item.isDuplicate}
                            onChange={() => toggleSelect(idx)}
                            className="w-4 h-4 accent-accent-primary disabled:opacity-30"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-text-primary font-medium">{item.name}</td>
                        <td className="py-2.5 px-3 text-text-secondary font-mono text-xs">{item.sku || '-'}</td>
                        <td className="py-2.5 px-3 text-text-primary">{formatNumber(item.quantity)}</td>
                        <td className="py-2.5 px-3 text-text-secondary">{item.unit || '-'}</td>
                        <td className="py-2.5 px-3 text-text-secondary">{formatNumber(item.costPrice)}</td>
                        <td className="py-2.5 px-3 text-text-secondary">{formatNumber(item.sellPrice)}</td>
                        <td className="py-2.5 px-3 text-text-secondary text-xs">{item.location || '-'}</td>
                        <td className="py-2.5 px-3 text-text-secondary text-xs">{item.supplier || '-'}</td>
                        <td className="py-2.5 px-3 text-center">
                          {item.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              تکراری
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" />
                              جدید
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-border-glass-light">
          <GlassButton variant="secondary" onClick={onClose}>لغو</GlassButton>
          <GlassButton variant="primary" loading={importing} onClick={handleConfirm} disabled={selected.size === 0}>
            <Check className="w-4 h-4 ml-2" />
            تایید و ورود ({formatNumber(selected.size)} آیتم)
          </GlassButton>
        </div>
      </GlassModal>
    );
  };
