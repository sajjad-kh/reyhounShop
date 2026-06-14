import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { adminService } from '../../services/adminService';
import { categoryService } from '../../services/categoryService';
import { Product, ProductImage } from '../../types/product';
import { Plus, Edit, Trash2, Search, X, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { validateImagesWithDimensions, ERROR_MESSAGES } from '../../utils/imageValidation';
import ImagePreviewCard from '../../components/ui/ImagePreviewCard';
import { getImageUrl } from '../../utils/constants';
import { ConditionalTooltip } from '../../components/ui/ConditionalTooltip';


const ProductManagement: React.FC = () => {
    const location = useLocation();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    // Fetch products when page, searchQuery, or location changes
    useEffect(() => {
        fetchProducts();
    }, [page, searchQuery, location.pathname]);

    // Auto-hide toast after 3 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    // Check if product is from Basalam
    const isBasalamProduct = (productName: string): boolean => {
        return productName.includes('Basalam-');
    };

    // Extract Basalam ID from product name
    const extractBasalamId = (productName: string): string | null => {
        const match = productName.match(/Basalam-(\d+)/);
        return match ? match[1] : null;
    };

    // Remove (Basalam-ID) from product name for display
    const cleanProductName = (productName: string): string => {
        return productName.replace(/\s*\(Basalam-\d+\)\s*/g, '').trim();
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await adminService.getAllProducts({
                page,
                limit: 10,
                search: searchQuery || undefined,
            });

            console.log("qqqqq",response)
            console.log('Products from API:', response.data);
            console.log('First product images:', response.data[0]?.images);
            setProducts(response.data);
            if (response.pagination) {
                setTotalPages((response.pagination.total/response.pagination.limit)+1);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProduct = (productId: number) => {
        setSelectedProducts((prev) =>
            prev.includes(productId)
                ? prev.filter((id) => id !== productId)
                : [...prev, productId]
        );
    };

    const handleSelectAll = () => {
        if (selectedProducts.length === products.length) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(products.map((p) => p.id));
        }
    };

    const handleDeleteProduct = (productId: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'حذف محصول',
            message: 'آیا مطمئن هستید که می‌خواهید این محصول را حذف کنید؟',
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, isOpen: false });

                try {
                    await adminService.deleteProduct(productId);

                    // Remove product from local state immediately
                    setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));

                    // Show success toast
                    showToast('محصول با موفقیت حذف شد', 'success');
                } catch (err: any) {
                    showToast(err.message || 'خطا در حذف محصول', 'error');
                }
            },
        });
    };

    const handleBulkDelete = () => {
        if (selectedProducts.length === 0) return;

        setConfirmModal({
            isOpen: true,
            title: 'حذف گروهی محصولات',
            message: `آیا مطمئن هستید که می‌خواهید ${selectedProducts.length} محصول را حذف کنید؟`,
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, isOpen: false });

                try {
                    await adminService.bulkDeleteProducts(selectedProducts);

                    // Remove products from local state immediately
                    setProducts(prevProducts =>
                        prevProducts.filter(p => !selectedProducts.includes(p.id))
                    );
                    setSelectedProducts([]);

                    // Show success toast
                    showToast(`${selectedProducts.length} محصول با موفقیت حذف شد`, 'success');
                } catch (err: any) {
                    showToast(err.message || 'خطا در حذف محصولات', 'error');
                }
            },
        });
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setShowModal(true);
    };

    const handleCommentProduct = (product: Product) => {
        setEditingProduct(product);
        setShowModal(true);
    };

    const handleCreateProduct = () => {
        setEditingProduct(null);
        setShowModal(true);
    };



    if (loading && products.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-primary p-6" dir="rtl">
                <div className="max-w-7xl mx-auto">
                    <GlassCard className="p-8 text-center">
                        <div className="glass-spinner w-12 h-12 mx-auto mb-4" />
                        <p className="text-text-secondary">در حال بارگذاری محصولات...</p>
                    </GlassCard>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-primary pt-6" dir="rtl">
            <div className="max-w-full mx-auto space-y-6 px-2">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
                            مدیریت محصولات
                        </h1>
                        <p className="text-text-secondary text-sm md:text-base">
                            مدیریت کاتالوگ محصولات شما
                        </p>
                    </div>
                    <div className="flex items-center space-x-3 space-x-reverse">
                        <GlassButton
                            variant="accent"
                            onClick={handleCreateProduct}
                            className="flex items-center space-x-2 space-x-reverse w-full md:w-auto justify-center"
                            aria-label="افزودن محصول جدید"
                        >
                            <Plus className="w-5 h-5" aria-hidden="true" />
                            <span>افزودن محصول</span>
                        </GlassButton>
                    </div>
                </div>

                {/* Search and Bulk Actions */}
                <GlassCard className="p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative flex-1 w-full md:w-auto">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" aria-hidden="true" />
                            <GlassInput
                                type="text"
                                placeholder="جستجوی محصولات..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 w-full"
                                aria-label="جستجوی محصولات"
                            />
                        </div>
                        {selectedProducts.length > 0 && (
                            <GlassButton
                                variant="secondary"
                                onClick={handleBulkDelete}
                                className="flex items-center space-x-2"
                                aria-label={`حذف ${selectedProducts.length} محصول انتخاب شده`}
                            >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                                <span>حذف انتخاب شده ({selectedProducts.length})</span>
                            </GlassButton>
                        )}
                    </div>
                </GlassCard>

                {/* Products Table */}
                <GlassCard className="p-6">
                    {error ? (
                        <div className="text-center py-8">
                            <p className="text-error-color mb-4">{error}</p>
                            <GlassButton onClick={fetchProducts}>تلاش مجدد</GlassButton>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-text-secondary">محصولی یافت نشد</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="overflow-x-auto hidden md:block">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border-glass-light">
                                            <th className="text-right py-3 px-4 w-1">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        selectedProducts.length === products.length
                                                    }
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 rounded"
                                                    aria-label="انتخاب همه محصولات"
                                                />
                                            </th>
                                            <th className="text-center py-3 px-4 text-text-secondary font-medium">
                                                محصول
                                            </th>
                                            {/* <th className="text-center py-3 px-4 text-text-secondary font-medium">
                                                توضیحات
                                            </th> */}
                                            <th className="text-center py-3 px-4 text-text-secondary font-medium">
                                                دسته‌بندی
                                            </th>
                                            <th className="text-center py-3 px-4 text-text-secondary font-medium">
                                                قیمت (ریال)
                                            </th>
                                            <th className="text-center py-3 px-4 text-text-secondary font-medium">
                                                موجودی
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map((product) => (
                                            <tr
                                                key={product.id}
                                                className="border-b border-border-glass-light hover:bg-glass-light transition-colors"
                                            >
                                                <td className="py-3 px-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProducts.includes(
                                                            product.id
                                                        )}
                                                        onChange={() =>
                                                            handleSelectProduct(product.id)
                                                        }
                                                        className="w-4 h-4 rounded"
                                                        aria-label={`انتخاب محصول ${cleanProductName(product.name)}`}
                                                    />
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex flex-col gap-1">
                                                                <button
                                                                    onClick={() => handleEditProduct(product)}
                                                                    className="p-1.5 rounded-lg bg-glass-light hover:bg-glass-medium transition-colors"
                                                                    title="ویرایش محصول"
                                                                    aria-label={`ویرایش محصول ${cleanProductName(product.name)}`}
                                                                >
                                                                    <Edit className="w-3.5 h-3.5 text-accent-primary" aria-hidden="true" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteProduct(product.id)}
                                                                    className="p-1.5 rounded-lg bg-glass-light hover:bg-glass-medium transition-colors"
                                                                    title="حذف محصول"
                                                                    aria-label={`حذف محصول ${cleanProductName(product.name)}`}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 text-error-color" aria-hidden="true" />
                                                                </button>
                                                            </div>
                                                            <img
                                                                onClick={() => handleCommentProduct(product)}
                                                                src={getImageUrl(product.images?.[0]?.url)}
                                                                alt={`تصویر محصول ${cleanProductName(product.name)}`}
                                                                className="w-12 h-12 rounded-lg object-cover ml-1"
                                                            />
                                                        </div>
                                                        <div>
                                                            <ConditionalTooltip content={cleanProductName(product.name)} maxLength={30} position="top">
                                                                <p className={`text-text-primary font-medium line-clamp-1 ${cleanProductName(product.name).length > 30 ? 'cursor-help' : ''}`}>
                                                                    {cleanProductName(product.name)}
                                                                </p>
                                                            </ConditionalTooltip>
                                                            <p className="text-text-muted text-sm">
                                                                ID: {product.id}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* <td className="py-3 px-4 text-text-secondary text-center max-w-xs">
                                                    {product.description ? (
                                                        <ConditionalTooltip content={product.description} maxLength={50} position="top">
                                                            <p className={`line-clamp-2 text-sm ${product.description.length > 50 ? 'cursor-help' : ''}`}>
                                                                {product.description}
                                                            </p>
                                                        </ConditionalTooltip>
                                                    ) : (
                                                        <p className="line-clamp-2 text-sm text-text-muted">
                                                            بدون توضیحات
                                                        </p>
                                                    )}
                                                </td> */}
                                                <td className="py-3 px-4 text-text-primary text-center">
                                                    {isBasalamProduct(product.name) ? (
                                                        <div className="flex flex-col items-center">
                                                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-text-primary">
                                                                باسلام
                                                            </span>
                                                            <span className="text-xs text-text-muted mt-1">
                                                                ({extractBasalamId(product.name)})
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        product.category.name
                                                    )}
                                                </td>
                                                <td className="py-3 px-4  text-center">
                                                    <div>
                                                        <p className="text-text-primary font-semibold">
                                                            {product.effectivePrice.toLocaleString('fa-IR')}
                                                        </p>
                                                        {product.discountPrice && product.discountPrice < product.price && (
                                                            <p className="text-text-muted text-sm line-through">
                                                                {product.price.toLocaleString('fa-IR')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4  text-center">
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-xs font-medium ${product.stock > 10
                                                            ? 'bg-success-color/20 text-success-color'
                                                            : product.stock > 0
                                                                ? 'bg-warning-color/20 text-warning-color'
                                                                : 'bg-error-color/20 text-error-color'
                                                            }`}
                                                    >
                                                        {product.stock} عدد
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-4">
                                {products.map((product) => (
                                    <div key={product.id} className="bg-glass-light rounded-xl p-4 space-y-3">
                                        {/* Header with checkbox and actions */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProducts.includes(product.id)}
                                                    onChange={() => handleSelectProduct(product.id)}
                                                    className="w-4 h-4 rounded mt-1"
                                                    aria-label={`انتخاب محصول ${cleanProductName(product.name)}`}
                                                />
                                                <img
                                                    src={getImageUrl(product.images?.[0]?.url)}
                                                    alt={`تصویر محصول ${cleanProductName(product.name)}`}
                                                    className="w-20 h-20 rounded-lg object-cover"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditProduct(product)}
                                                    className="p-2 rounded-lg bg-glass-medium hover:bg-glass-dark transition-colors"
                                                    title="ویرایش محصول"
                                                    aria-label={`ویرایش محصول ${cleanProductName(product.name)}`}
                                                >
                                                    <Edit className="w-4 h-4 text-accent-primary" aria-hidden="true" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProduct(product.id)}
                                                    className="p-2 rounded-lg bg-glass-medium hover:bg-glass-dark transition-colors"
                                                    title="حذف محصول"
                                                    aria-label={`حذف محصول ${cleanProductName(product.name)}`}
                                                >
                                                    <Trash2 className="w-4 h-4 text-error-color" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Product Info */}
                                        <div>
                                            <ConditionalTooltip content={cleanProductName(product.name)} maxLength={30} position="top">
                                                <h3 className={`text-text-primary font-medium mb-1 line-clamp-1 ${cleanProductName(product.name).length > 30 ? 'cursor-help' : ''}`}>
                                                    {cleanProductName(product.name)}
                                                </h3>
                                            </ConditionalTooltip>
                                            <p className="text-text-muted text-xs mb-2">ID: {product.id}</p>
                                            {product.description && (
                                                <ConditionalTooltip content={product.description} maxLength={50} position="top">
                                                    <p className={`text-text-secondary text-xs line-clamp-2 mb-2 ${product.description.length > 50 ? 'cursor-help' : ''}`}>
                                                        {product.description}
                                                    </p>
                                                </ConditionalTooltip>
                                            )}
                                        </div>

                                        {/* Details Grid */}
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <div className="text-text-muted text-xs mb-1">دسته‌بندی</div>
                                                <div className="text-text-primary">
                                                    {isBasalamProduct(product.name) ? (
                                                        <div className="flex flex-col">
                                                            <span>باسلام</span>
                                                            <span className="text-xs text-text-muted">
                                                                ({extractBasalamId(product.name)})
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        product.category.name
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-text-muted text-xs mb-1">موجودی</div>
                                                <span
                                                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${product.stock > 10
                                                        ? 'bg-success-color/20 text-success-color'
                                                        : product.stock > 0
                                                            ? 'bg-warning-color/20 text-warning-color'
                                                            : 'bg-error-color/20 text-error-color'
                                                        }`}
                                                >
                                                    {product.stock} عدد
                                                </span>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="text-text-muted text-xs mb-1">قیمت</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-text-primary font-semibold">
                                                        {product.effectivePrice.toLocaleString('fa-IR')} ریال
                                                    </span>
                                                    {product.discountPrice && product.discountPrice < product.price && (
                                                        <span className="text-text-muted text-xs line-through">
                                                            {product.price.toLocaleString('fa-IR')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}

                            {totalPages > 1 && (
                                <div className="flex items-center justify-center space-x-2 mt-6" role="navigation" aria-label="صفحه‌بندی محصولات">
                                    <GlassButton
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        aria-label={`رفتن به صفحه قبلی (صفحه ${page - 1})`}
                                    >
                                        قبلی
                                    </GlassButton>
                                    <span className="text-text-secondary px-4" aria-current="page" aria-label={`صفحه فعلی ${page} از ${totalPages}`}>
                                        صفحه {page} از {totalPages}
                                    </span>
                                    <GlassButton
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        aria-label={`رفتن به صفحه بعدی (صفحه ${page + 1})`}
                                    >
                                        بعدی
                                    </GlassButton>
                                </div>
                            )}
                        </>
                    )}
                </GlassCard>

                {/* Product Form Modal */}
                {showModal && (
                    <ProductFormModal
                        product={editingProduct}
                        onClose={() => {
                            setShowModal(false);
                            setEditingProduct(null);
                        }}
                        onSave={async () => {
                            setShowModal(false);
                            setEditingProduct(null);
                            // Clear cache and fetch fresh data
                            await fetchProducts();
                        }}
                    />
                )}



                {/* Confirm Modal */}
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    type={confirmModal.type}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                />

                {/* Toast Notification */}
                {toast && (
                    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
                        <div className={`flex items-center space-x-2 space-x-reverse px-4 py-3 rounded-xl shadow-lg ${toast.type === 'success'
                            ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                            : 'bg-red-500/20 text-red-500 border border-red-500/30'
                            }`}>
                            {toast.type === 'success' ? (
                                <CheckCircle className="w-5 h-5" />
                            ) : (
                                <AlertCircle className="w-5 h-5" />
                            )}
                            <span className="font-medium">{toast.message}</span>
                            <button
                                onClick={() => setToast(null)}
                                className="ml-2 p-1 rounded-lg hover:bg-black/10 transition-colors"
                                aria-label="بستن پیام"
                            >
                                <X className="w-4 h-4" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Product Form Modal Component
interface ProductFormModalProps {
    product: Product | null;
    onClose: () => void;
    onSave: () => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ product, onClose, onSave }) => {
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        name: product?.name || '',
        description: product?.description || '',
        price: product?.price || 0,
        discountPrice: product?.discountPrice || 0,
        stock: product?.stock || 0,
        categoryId: 0, // Will be set automatically to "داخلی" category
    });
    const [loading, setLoading] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;



    // Get or create "داخلی" category on mount
    useEffect(() => {
        const ensureInternalCategory = async () => {
            try {
                // Fetch categories using categoryService
                const categoriesList = await categoryService.getCategories();
                console.log('Fetched categories:', categoriesList);

                // Look for "داخلی" category
                let internalCategory = categoriesList.find((cat: any) => cat.name === 'داخلی');

                if (!internalCategory) {
                    // Create "داخلی" category using categoryService
                    console.log('"داخلی" category not found, creating it');
                    try {
                        const newCategory = await categoryService.createCategory({ name: 'داخلی' });
                        internalCategory = newCategory;
                        console.log('Created "داخلی" category:', internalCategory);
                    } catch (createError) {
                        console.error('Failed to create category:', createError);
                    }
                }

                if (internalCategory) {
                    console.log('Using "داخلی" category:', internalCategory.id);
                    setFormData(prev => ({ ...prev, categoryId: internalCategory.id }));
                } else {
                    console.error('Could not find or create "داخلی" category');
                    addToast({
                        type: 'error',
                        message: 'خطا در تنظیم دسته‌بندی. لطفا دوباره تلاش کنید.',
                    });
                }
            } catch (error: any) {
                console.error('Error fetching categories:', error);
                addToast({
                    type: 'error',
                    message: 'خطا در دریافت دسته‌بندی‌ها',
                });
            }
        };

        ensureInternalCategory();
    }, [addToast]);

    // Keyboard navigation: Close modal on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !loading && !uploadingImages) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [loading, uploadingImages, onClose]);

    // Image state management
    const [existingImages, setExistingImages] = useState<ProductImage[]>(product?.images || []);
    const [newImages, setNewImages] = useState<File[]>([]);
    const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
    const [mainImageId, setMainImageId] = useState<number | null>(
        product?.images?.find(img => img.isMain)?.id || null
    );
    const [newMainImageIndex, setNewMainImageIndex] = useState<number | null>(null);

    // Image handler functions
    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const fileArray = Array.from(files);

        // Check if adding these files would exceed the limit
        const totalImages = existingImages.length + newImages.length + fileArray.length;
        if (totalImages > 5) {
            addToast({
                type: 'error',
                message: ERROR_MESSAGES.TOO_MANY_FILES,
            });
            return;
        }

        // Validate images with dimensions
        const validation = await validateImagesWithDimensions(fileArray);

        // Show errors if any
        if (validation.errors.length > 0) {
            validation.errors.forEach(error => {
                addToast({
                    type: 'error',
                    message: error,
                });
            });
        }

        // Show warnings if any
        if (validation.warnings.length > 0) {
            validation.warnings.forEach(warning => {
                addToast({
                    type: 'warning',
                    message: warning,
                });
            });
        }

        // Add valid files
        if (validation.validFiles.length > 0) {
            setNewImages(prev => [...prev, ...validation.validFiles]);

            // Set first image as main if no main image exists
            if (!mainImageId && existingImages.length === 0 && newImages.length === 0) {
                // Will be handled by index 0 of newImages
            }

            // Show success message
            addToast({
                type: 'success',
                message: `${validation.validFiles.length} تصویر با موفقیت انتخاب شد`,
            });
        }

        // Reset input value to allow selecting the same file again
        e.target.value = '';
    };

    const markImageForDeletion = (imageId: number) => {
        setImagesToDelete(prev => [...prev, imageId]);
        setExistingImages(prev => prev.filter(img => img.id !== imageId));

        // If deleted image was main, clear mainImageId
        if (mainImageId === imageId) {
            setMainImageId(null);
        }
    };

    const removeNewImage = (index: number) => {
        setNewImages(prev => prev.filter((_, i) => i !== index));

        // If removed image was the new main image, clear it
        if (newMainImageIndex === index) {
            setNewMainImageIndex(null);
        } else if (newMainImageIndex !== null && newMainImageIndex > index) {
            // Adjust index if a previous image was removed
            setNewMainImageIndex(newMainImageIndex - 1);
        }
    };

    const setMainImage = (imageId: number | null) => {
        setMainImageId(imageId);
        setNewMainImageIndex(null); // Clear new image main selection
    };

    const setMainNewImage = (index: number) => {
        setNewMainImageIndex(index);
        setMainImageId(null); // Clear existing image main selection
    };

    // Helper function to detect network errors
    const isNetworkError = (error: any): boolean => {
        return (
            !error.response ||
            error.code === 'ECONNABORTED' ||
            error.code === 'ERR_NETWORK' ||
            error.message?.toLowerCase().includes('network') ||
            error.message?.toLowerCase().includes('timeout')
        );
    };

    // Helper function to upload images with retry mechanism
    const uploadImagesWithRetry = async (
        productId: number,
        files: File[],
        attempt: number = 1
    ): Promise<any[]> => {
        try {
            setUploadError(null);
            const uploadResponse = await adminService.uploadProductImages(productId, files);
            setRetryCount(0); // Reset retry count on success
            return uploadResponse.data || [];
        } catch (err: any) {
            const isNetwork = isNetworkError(err);
            const errorMessage = isNetwork
                ? 'خطای شبکه: اتصال به سرور برقرار نشد'
                : err.message || 'خطا در آپلود تصاویر';

            setUploadError(errorMessage);

            // Retry logic for network errors
            if (isNetwork && attempt < MAX_RETRIES) {
                setRetryCount(attempt);
                addToast({
                    type: 'warning',
                    message: `تلاش مجدد برای آپلود... (${attempt}/${MAX_RETRIES})`,
                });

                // Exponential backoff: 2s, 4s, 8s
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));

                return uploadImagesWithRetry(productId, files, attempt + 1);
            }

            // If all retries failed or non-network error
            if (isNetwork && attempt >= MAX_RETRIES) {
                addToast({
                    type: 'error',
                    message: `آپلود تصاویر پس از ${MAX_RETRIES} تلاش ناموفق بود. لطفاً اتصال اینترنت خود را بررسی کنید.`,
                });
            } else {
                addToast({
                    type: 'error',
                    message: errorMessage,
                });
            }

            throw err;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate categoryId is set
        if (!formData.categoryId || formData.categoryId === 0) {
            addToast({
                type: 'error',
                message: 'در حال تنظیم دسته‌بندی... لطفاً چند لحظه صبر کنید',
            });
            return;
        }

        // Task 7.4: Validate that at least one image exists (optional - allow products without images)
        // const totalImages = existingImages.length + newImages.length;
        // if (totalImages === 0) {
        //     addToast({
        //         type: 'warning',
        //         message: 'توجه: محصول بدون تصویر ایجاد می‌شود',
        //     });
        // }

        setLoading(true);

        try {
            let productId: number;
            let uploadedImages: any[] = [];

            // Prepare product data
            const productData = formData;

            // Create or update the product
            if (product) {
                // Update existing product with images
                setUploadingImages(newImages.length > 0);
                try {
                    const response = await adminService.updateProduct(product.id, productData, newImages);
                    productId = product.id;

                    // Get uploaded images from response if available
                    if (response.data.images) {
                        uploadedImages = response.data.images;
                    }

                    if (newImages.length > 0) {
                        addToast({
                            type: 'success',
                            message: `محصول با ${newImages.length} تصویر جدید بروزرسانی شد`,
                        });
                    }
                } catch (err: any) {
                    throw err;
                } finally {
                    setUploadingImages(false);
                }
            } else {
                // Create new product with images
                setUploadingImages(true);
                try {
                    const response = await adminService.createProduct(productData, newImages);
                    productId = response.data.id;

                    // Images are already uploaded with the product
                    if (newImages.length > 0) {
                        addToast({
                            type: 'success',
                            message: `محصول با ${newImages.length} تصویر ایجاد شد`,
                        });
                    }

                    // Get uploaded images from response if available
                    if (response.data.images) {
                        uploadedImages = response.data.images;
                    }
                } catch (err: any) {
                    throw err; // Re-throw to be caught by outer catch
                } finally {
                    setUploadingImages(false);
                }
            }

            // Task 7.2: Delete marked images with network error handling
            if (imagesToDelete.length > 0) {
                try {
                    await Promise.all(
                        imagesToDelete.map(imageId =>
                            adminService.deleteProductImage(productId, imageId)
                        )
                    );
                    addToast({
                        type: 'success',
                        message: `${imagesToDelete.length} تصویر با موفقیت حذف شد`,
                    });
                } catch (err: any) {
                    const isNetwork = isNetworkError(err);
                    const errorMessage = isNetwork
                        ? 'خطای شبکه: امکان حذف تصاویر وجود ندارد. لطفاً اتصال اینترنت خود را بررسی کنید.'
                        : err.message || 'خطا در حذف تصاویر';

                    addToast({
                        type: 'error',
                        message: errorMessage,
                    });
                    // Continue with other operations even if delete fails
                }
            }

            // Task 7.3: Set main image
            // Determine which image should be main
            let mainImageToSet: number | null = null;

            console.log('mainImageId:', mainImageId);
            console.log('newMainImageIndex:', newMainImageIndex);
            console.log('uploadedImages:', uploadedImages);

            if (mainImageId) {
                // Existing image is set as main
                mainImageToSet = mainImageId;
            } else if (newMainImageIndex !== null && uploadedImages.length > 0) {
                // New image is set as main - get the ID from uploaded images
                if (uploadedImages[newMainImageIndex]?.id) {
                    mainImageToSet = uploadedImages[newMainImageIndex].id;
                }
            }

            console.log('mainImageToSet:', mainImageToSet);

            if (mainImageToSet) {
                try {
                    console.log('Setting main image:', productId, mainImageToSet);
                    await adminService.setMainProductImage(productId, mainImageToSet);
                    addToast({
                        type: 'success',
                        message: 'تصویر اصلی با موفقیت تنظیم شد',
                    });
                } catch (err: any) {
                    const isNetwork = isNetworkError(err);
                    const errorMessage = isNetwork
                        ? 'خطای شبکه: امکان تنظیم تصویر اصلی وجود ندارد. لطفاً اتصال اینترنت خود را بررسی کنید.'
                        : err.message || 'خطا در تنظیم تصویر اصلی';

                    addToast({
                        type: 'error',
                        message: errorMessage,
                    });
                    // Continue even if setting main image fails
                }
            }

            // Show success message
            addToast({
                type: 'success',
                message: product ? 'محصول با موفقیت بروزرسانی شد' : 'محصول با موفقیت ایجاد شد',
            });

            onSave();
        } catch (err: any) {
            const isNetwork = isNetworkError(err);
            const errorMessage = isNetwork
                ? 'خطای شبکه: امکان ذخیره محصول وجود ندارد. لطفاً اتصال اینترنت خود را بررسی کنید.'
                : err.message || 'خطا در ذخیره محصول';

            addToast({
                type: 'error',
                message: errorMessage,
            });
        } finally {
            setLoading(false);
            setUploadError(null);
            setRetryCount(0);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-form-title"
        >
            <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 id="product-form-title" className="text-2xl font-bold text-text-primary">
                        {product ? 'ویرایش محصول' : 'ایجاد محصول'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-glass-light hover:bg-glass-medium transition-colors"
                        aria-label="بستن فرم محصول"
                    >
                        <X className="w-5 h-5 text-text-primary" aria-hidden="true" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="product-name" className="block text-text-secondary text-sm mb-2">
                            نام محصول
                        </label>
                        <GlassInput
                            id="product-name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="نام محصول را وارد کنید"
                            aria-label="نام محصول"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="product-description" className="block text-text-secondary text-sm mb-2">
                            توضیحات
                        </label>
                        <textarea
                            id="product-description"
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                            placeholder="توضیحات محصول را وارد کنید"
                            className="glass-input w-full min-h-[100px] resize-none"
                            aria-label="توضیحات محصول"
                            required
                        />
                    </div>

                    {/* Category is automatically set to "داخلی" - no need to show in form */}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="product-price" className="block text-text-secondary text-sm mb-2">قیمت</label>
                            <GlassInput
                                id="product-price"
                                type="number"
                                value={formData.price.toString()}
                                onChange={(e) =>
                                    setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                                }
                                placeholder="0.00"
                                aria-label="قیمت محصول به ریال"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="product-discount-price" className="block text-text-secondary text-sm mb-2">
                                قیمت تخفیف
                            </label>
                            <GlassInput
                                id="product-discount-price"
                                type="number"
                                value={formData.discountPrice.toString()}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        discountPrice: parseFloat(e.target.value) || 0,
                                    })
                                }
                                placeholder="0.00"
                                aria-label="قیمت تخفیف محصول به ریال"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="product-stock" className="block text-text-secondary text-sm mb-2">موجودی</label>
                        <GlassInput
                            id="product-stock"
                            type="number"
                            value={formData.stock.toString()}
                            onChange={(e) =>
                                setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                            }
                            placeholder="0"
                            aria-label="تعداد موجودی محصول"
                            required
                        />
                    </div>

                    {/* Image Upload Section */}
                    <div className="space-y-4 pt-4 border-t border-border-glass-light">
                        <div className="flex items-center justify-between">
                            <label className="block text-text-secondary text-sm">
                                تصاویر محصول
                            </label>
                            <span className="text-xs text-text-muted">
                                {existingImages.length + newImages.length} / 5 تصویر
                            </span>
                        </div>

                        {/* File Input (Hidden) */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            multiple
                            onChange={handleImageSelect}
                            className="hidden"
                            aria-label="انتخاب فایل‌های تصویر محصول"
                            aria-describedby="image-upload-instructions"
                        />

                        {/* Upload Button */}
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border-glass-light rounded-xl hover:border-accent-primary/50 transition-colors">
                            <GlassButton
                                type="button"
                                variant="secondary"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center space-x-2 space-x-reverse mb-2"
                                disabled={existingImages.length + newImages.length >= 5 || loading || uploadingImages}
                                aria-label="انتخاب تصاویر محصول از کامپیوتر"
                            >
                                <Upload className="w-5 h-5" aria-hidden="true" />
                                <span>انتخاب تصویر</span>
                            </GlassButton>
                            <p className="text-xs text-text-muted text-center" id="image-upload-instructions">
                                حداکثر 5 تصویر، هر کدام حداکثر 5MB
                                <br />
                                فرمت‌های مجاز: JPG, PNG, WebP
                            </p>
                        </div>

                        {/* Image Preview Grid */}
                        {(existingImages.length > 0 || newImages.length > 0) && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {/* Existing Images */}
                                {existingImages.map((image) => (
                                    <ImagePreviewCard
                                        key={image.id}
                                        image={image}
                                        isMain={image.id === mainImageId}
                                        onSetMain={() => setMainImage(image.id)}
                                        onDelete={() => markImageForDeletion(image.id)}
                                    />
                                ))}

                                {/* New Images */}
                                {newImages.map((file, index) => (
                                    <ImagePreviewCard
                                        key={`new-${index}`}
                                        file={file}
                                        isMain={
                                            existingImages.length === 0 && newImages.length > 0
                                                ? index === (newMainImageIndex ?? 0)
                                                : index === newMainImageIndex
                                        }
                                        onSetMain={() => setMainNewImage(index)}
                                        onDelete={() => removeNewImage(index)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end space-x-4 pt-4">
                        <GlassButton
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading || uploadingImages}
                            aria-label="لغو و بستن فرم بدون ذخیره تغییرات"
                        >
                            لغو
                        </GlassButton>
                        <GlassButton
                            type="submit"
                            variant="accent"
                            loading={loading || uploadingImages}
                            disabled={loading || uploadingImages || formData.categoryId === 0}
                            aria-label={product ? 'ذخیره تغییرات محصول' : 'ایجاد محصول جدید'}
                        >
                            {formData.categoryId === 0
                                ? 'در حال تنظیم دسته‌بندی...'
                                : uploadingImages
                                    ? 'در حال آپلود تصاویر...'
                                    : loading
                                        ? 'در حال ذخیره...'
                                        : product ? 'بروزرسانی محصول' : 'ایجاد محصول'
                            }
                        </GlassButton>
                    </div>
                </form>

                {/* Upload Progress Overlay */}
                {uploadingImages && (
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                        <div className="glass-card p-6 flex flex-col items-center space-y-4 max-w-md">
                            <div className="glass-spinner w-12 h-12" />
                            <p className="text-text-primary font-medium">
                                در حال آپلود تصاویر...
                            </p>
                            {retryCount > 0 && (
                                <p className="text-warning-color text-sm">
                                    تلاش مجدد {retryCount} از {MAX_RETRIES}
                                </p>
                            )}
                            {uploadError && (
                                <div className="bg-error-color/10 border border-error-color/30 rounded-lg p-3 w-full">
                                    <p className="text-error-color text-sm text-center">
                                        {uploadError}
                                    </p>
                                </div>
                            )}
                            <p className="text-text-muted text-sm text-center">
                                {uploadError
                                    ? 'در حال تلاش مجدد...'
                                    : 'لطفاً صبر کنید'
                                }
                            </p>
                        </div>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};



export default ProductManagement;
