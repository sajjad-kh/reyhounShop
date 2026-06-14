import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Store, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';

// Import basalam functions
const getUserInfo = async (token: string) => {
    const response = await fetch('https://openapi.basalam.com/v1/users/me', {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    return await response.json();
};

const getVendorProducts = async (vendorId: string, token: string, page: number = 1) => {
    const url = `https://openapi.basalam.com/v1/vendors/${vendorId}/products?page=${page}`;
    const response = await fetch(url, {
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};


interface BasalamProduct {
    id: number;
    title: string;
    price: number;
    photo: {
        id: number;
        original: string;
        xs: string;
        sm: string;
        md: string;
        lg: string;
    };
    status: {
        name: string;
        value: number;
    };
    inventory: number;
    is_wholesale: boolean;
}

interface BasalamResponse {
    data: BasalamProduct[];
    total_count: number;
    result_count: number;
    total_page: number;
    page: number;
    per_page: number;
}



const BasalamPage: React.FC = () => {
    const [token, setToken] = useState(() => localStorage.getItem('basalam_token') || '');
    const [isTokenSet, setIsTokenSet] = useState(() => !!localStorage.getItem('basalam_token'));
    const [userInfo, setUserInfo] = useState<any>(null);
    const [products, setProducts] = useState<BasalamProduct[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [syncStatus, setSyncStatus] = useState<{ [key: number]: 'synced' | 'new' | 'error' }>({});

    // Load user info automatically if token exists
    useEffect(() => {
        const savedToken = localStorage.getItem('basalam_token');
        if (savedToken && !userInfo) {
            handleTokenSubmit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTokenSubmit = async () => {
        if (!token.trim()) {
            setError('لطفا توکن را وارد کنید');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const info = await getUserInfo(token);
            if (info.vendor) {
                // Save token to localStorage for future use
                localStorage.setItem('basalam_token', token);
                setUserInfo(info);
                setIsTokenSet(true);
                // Automatically fetch products after getting user info
                await fetchProducts(info.vendor.id);
            } else {
                setError('اطلاعات فروشنده یافت نشد');
            }
        } catch (err) {
            setError('خطا در دریافت اطلاعات کاربر. لطفا توکن را بررسی کنید');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async (vendorId: string, page: number = 1) => {
        setLoading(true);
        setError('');

        try {
            const response: BasalamResponse = await getVendorProducts(vendorId, token, page);
            setProducts(response.data);
            setCurrentPage(response.page);
            setTotalPages(response.total_page);
        } catch (err) {
            setError('خطا در دریافت محصولات');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleProductSelection = (productId: number) => {
        const newSelected = new Set(selectedProducts);
        if (newSelected.has(productId)) {
            newSelected.delete(productId);
        } else {
            newSelected.add(productId);
        }
        setSelectedProducts(newSelected);
    };

    const removeDeletedProducts = async () => {
        setLoading(true);
        setError('');

        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

            // Check if user is authenticated
            if (!authService.isAuthenticated()) {
                setError('لطفا ابتدا به عنوان Admin وارد شوید');
                setLoading(false);
                return;
            }

            const authToken = authService.getAuthToken();
            if (!authToken) {
                setError('لطفا ابتدا به عنوان Admin وارد شوید');
                setLoading(false);
                return;
            }

            // Get all products from our database that are from Basalam
            const allProductsResponse = await fetch(`${API_BASE_URL}/products?search=Basalam-&limit=1000`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                }
            });

            if (!allProductsResponse.ok) {
                throw new Error('Failed to fetch products from database');
            }

            const allProductsData = await allProductsResponse.json();
            const databaseProducts = allProductsData.data?.products || [];

            // Get current Basalam product IDs
            const currentBasalamIds = new Set(products.map(p => p.id));

            let deletedCount = 0;

            // Check each database product
            for (const dbProduct of databaseProducts) {
                // Extract Basalam ID from product name
                const match = dbProduct.name.match(/Basalam-(\d+)/);
                if (match) {
                    const basalamId = parseInt(match[1]);

                    // If this Basalam product is not in current products, delete it
                    if (!currentBasalamIds.has(basalamId)) {
                        try {
                            console.log(`Deleting product ${dbProduct.name} (ID: ${dbProduct.id}) - not found in Basalam`);

                            const deleteResponse = await fetch(`${API_BASE_URL}/products/${dbProduct.id}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${authToken}`,
                                }
                            });

                            if (deleteResponse.ok) {
                                deletedCount++;
                                console.log(`Successfully deleted product: ${dbProduct.name}`);
                            } else {
                                console.error(`Failed to delete product ${dbProduct.name}:`, deleteResponse.status);
                            }
                        } catch (deleteErr) {
                            console.error(`Error deleting product ${dbProduct.name}:`, deleteErr);
                        }
                    }
                }
            }

            if (deletedCount > 0) {
                setError(`${deletedCount} محصول حذف شده از باسلام، از دیتابیس نیز حذف شد`);
            } else {
                setError('هیچ محصول حذف شده‌ای یافت نشد');
            }

        } catch (err) {
            setError('خطا در حذف محصولات');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const syncSelectedProducts = async () => {
        if (selectedProducts.size === 0) {
            setError('لطفا حداقل یک محصول را انتخاب کنید');
            return;
        }

        setLoading(true);
        setError('');
        const newSyncStatus: { [key: number]: 'synced' | 'new' | 'error' } = {};

        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

            // Check if user is authenticated
            if (!authService.isAuthenticated()) {
                setError('لطفا ابتدا به عنوان Admin وارد شوید');
                setLoading(false);
                return;
            }

            const authToken = authService.getAuthToken();
            if (!authToken) {
                setError('لطفا ابتدا به عنوان Admin وارد شوید');
                setLoading(false);
                return;
            }

            // Get or create "باسلام" category for Basalam products
            let basalamCategoryId = 1;
            try {
                const categoriesResponse = await fetch(`${API_BASE_URL}/products/categories`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                    }
                });
                if (categoriesResponse.ok) {
                    const categoriesData = await categoriesResponse.json();
                    if (categoriesData.success && categoriesData.data && categoriesData.data.length > 0) {
                        // Look for existing "باسلام" category
                        const basalamCategory = categoriesData.data.find((cat: any) => cat.name === 'باسلام');
                        if (basalamCategory) {
                            basalamCategoryId = basalamCategory.id;
                            console.log('Found existing Basalam category with ID:', basalamCategoryId);
                        } else {
                            // Create "باسلام" category
                            console.log('Creating Basalam category...');
                            const createCategoryResponse = await fetch(`${API_BASE_URL}/categories`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${authToken}`,
                                },
                                body: JSON.stringify({
                                    name: 'باسلام'
                                })
                            });

                            if (createCategoryResponse.ok) {
                                const newCategoryData = await createCategoryResponse.json();
                                if (newCategoryData.success && newCategoryData.data) {
                                    basalamCategoryId = newCategoryData.data.id;
                                    console.log('Basalam category created with ID:', basalamCategoryId);
                                }
                            }
                        }
                    } else {
                        // No categories exist, create "باسلام" category
                        console.log('No categories found, creating Basalam category...');
                        const createCategoryResponse = await fetch(`${API_BASE_URL}/categories`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${authToken}`,
                            },
                            body: JSON.stringify({
                                name: 'باسلام'
                            })
                        });

                        if (createCategoryResponse.ok) {
                            const newCategoryData = await createCategoryResponse.json();
                            if (newCategoryData.success && newCategoryData.data) {
                                basalamCategoryId = newCategoryData.data.id;
                                console.log('Basalam category created with ID:', basalamCategoryId);
                            }
                        }
                    }
                }
            } catch (catErr) {
                console.warn('Failed to fetch/create Basalam category, using default categoryId=1:', catErr);
            }

            for (const productId of selectedProducts) {
                const product = products.find(p => p.id === productId);
                if (!product) continue;

                try {
                    // Use the dedicated Basalam sync endpoint
                    const syncResponse = await fetch(`${API_BASE_URL}/admin/basalam/sync-product`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`,
                        },
                        body: JSON.stringify({
                            basalamId: product.id.toString(),
                            name: product.title,
                            description: product.title,
                            price: product.price, // Basalam price is already in Toman
                            stock: product.inventory,
                            imageUrl: product.photo.original,
                            categoryId: basalamCategoryId
                        })
                    });

                    if (!syncResponse.ok) {
                        const errorData = await syncResponse.json();
                        console.error('Sync error:', errorData);
                        throw new Error(errorData.error?.message || 'Failed to sync product');
                    }

                    const syncResult = await syncResponse.json();
                    console.log('Product synced:', syncResult);

                    // Set status based on whether it was an update or new product
                    newSyncStatus[productId] = syncResult.meta?.isUpdate ? 'synced' : 'new';

                } catch (err: any) {
                    console.error(`Error syncing product ${productId}:`, err);
                    console.error('Error details:', err.message);
                    newSyncStatus[productId] = 'error';
                }
            }

            setSyncStatus(newSyncStatus);
            setSelectedProducts(new Set());

            // Show success message
            const successCount = Object.values(newSyncStatus).filter(s => s === 'synced' || s === 'new').length;
            const errorCount = Object.values(newSyncStatus).filter(s => s === 'error').length;

            if (errorCount === 0) {
                setError('');
            } else {
                setError(`${successCount} محصول با موفقیت همگام‌سازی شد، ${errorCount} محصول با خطا مواجه شد`);
            }
        } catch (err) {
            setError('خطا در همگام‌سازی محصولات');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isTokenSet) {
        return (
            <div className="p-6" dir="rtl">
                <GlassCard className="max-w-2xl mx-auto p-8">
                    <div className="text-center mb-6">
                        <Store className="w-16 h-16 mx-auto mb-4 text-accent-primary" />
                        <h2 className="text-2xl font-bold text-text-primary mb-2">
                            اتصال به باسلام
                        </h2>
                        <p className="text-text-muted">
                            برای دریافت محصولات، توکن API خود را وارد کنید
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-text-primary mb-2 font-medium">
                                توکن API باسلام
                            </label>
                            <input
                                type="text"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="توکن خود را وارد کنید"
                                className="w-full px-4 py-3 rounded-xl bg-glass-light border border-border-glass-light text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
                                dir="ltr"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center space-x-2 space-x-reverse text-red-500 bg-red-500/10 px-4 py-3 rounded-xl">
                                <AlertCircle className="w-5 h-5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            onClick={handleTokenSubmit}
                            disabled={loading}
                            className="w-full px-6 py-3 bg-gradient-accent text-white rounded-xl font-medium hover:shadow-glass transition-all disabled:opacity-50"
                        >
                            {loading ? 'در حال بررسی...' : 'اتصال'}
                        </button>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="p-6" dir="rtl">
            <div className="mb-6">
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 space-x-reverse">
                            <Store className="w-8 h-8 text-accent-primary" />
                            <div>
                                <h2 className="text-xl font-bold text-text-primary">
                                    محصولات باسلام
                                </h2>
                                {userInfo && (
                                    <p className="text-text-muted text-sm">
                                        فروشگاه: {userInfo.vendor.name}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                            {selectedProducts.size > 0 && (
                                <>
                                    <span className="text-text-primary text-sm">
                                        {selectedProducts.size} محصول انتخاب شده
                                    </span>
                                    <button
                                        onClick={syncSelectedProducts}
                                        disabled={loading}
                                        className="px-4 py-2 bg-gradient-accent text-white rounded-xl font-medium hover:shadow-glass transition-all disabled:opacity-50"
                                    >
                                        همگام‌سازی با دیتابیس
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => fetchProducts(userInfo.vendor.id)}
                                disabled={loading}
                                className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-glass-light hover:bg-glass-medium rounded-xl transition-all disabled:opacity-50"
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                                <span>بروزرسانی</span>
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('basalam_token');
                                    setToken('');
                                    setIsTokenSet(false);
                                    setUserInfo(null);
                                    setProducts([]);
                                    setSelectedProducts(new Set());
                                }}
                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-xl transition-all"
                            >
                                قطع اتصال
                            </button>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {error && (
                <div className="mb-6">
                    <div className="flex items-center space-x-2 space-x-reverse text-red-500 bg-red-500/10 px-4 py-3 rounded-xl">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                </div>
            )}



            <GlassCard className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border-glass-light">
                                <th className="px-4 py-3 text-right text-text-primary font-semibold">
                                    <input
                                        type="checkbox"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedProducts(new Set(products.map(p => p.id)));
                                            } else {
                                                setSelectedProducts(new Set());
                                            }
                                        }}
                                        checked={selectedProducts.size === products.length && products.length > 0}
                                        className="w-4 h-4 rounded border-border-glass-light"
                                    />
                                </th>
                                <th className="px-4 py-3 text-right text-text-primary font-semibold">تصویر</th>
                                <th className="px-4 py-3 text-right text-text-primary font-semibold">شناسه</th>
                                <th className="px-4 py-3 text-right text-text-primary font-semibold">نام محصول</th>
                                <th className="px-4 py-3 text-right text-text-primary font-semibold">قیمت (ریال)</th>
                                <th className="px-4 py-3 text-right text-text-primary font-semibold">موجودی</th>
                                <th className="px-4 py-3 text-right text-text-primary font-semibold">وضعیت</th>
                                <th className="px-4 py-3 text-right text-text-primary font-semibold">همگام‌سازی</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr
                                    key={product.id}
                                    className={`border-b border-border-glass-light hover:bg-glass-light transition-colors ${selectedProducts.has(product.id) ? 'bg-accent-primary/10' : ''
                                        }`}
                                >
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedProducts.has(product.id)}
                                            onChange={() => toggleProductSelection(product.id)}
                                            className="w-4 h-4 rounded border-border-glass-light"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <img
                                            src={product.photo.sm}
                                            alt={product.title}
                                            className="w-16 h-16 object-cover rounded-lg"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-text-muted font-mono text-sm">
                                        {product.id}
                                    </td>
                                    <td className="px-4 py-3 text-text-primary font-medium max-w-xs">
                                        <div className="line-clamp-2">{product.title}</div>
                                    </td>
                                    <td className="px-4 py-3 text-accent-primary font-bold">
                                        {product.price.toLocaleString('fa-IR')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`font-semibold ${product.inventory > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {product.inventory.toLocaleString('fa-IR')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-text-muted text-sm">
                                        {product.status.name}
                                    </td>
                                    <td className="px-4 py-3">
                                        {syncStatus[product.id] && (
                                            <div>
                                                {syncStatus[product.id] === 'synced' && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-green-500/20 text-green-500">
                                                        <CheckCircle className="w-3 h-3 ml-1" />
                                                        بروز شد
                                                    </span>
                                                )}
                                                {syncStatus[product.id] === 'new' && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-blue-500/20 text-blue-500">
                                                        <CheckCircle className="w-3 h-3 ml-1" />
                                                        جدید
                                                    </span>
                                                )}
                                                {syncStatus[product.id] === 'error' && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-red-500/20 text-red-500">
                                                        <AlertCircle className="w-3 h-3 ml-1" />
                                                        خطا
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            {totalPages > 1 && (
                <div className="mt-6">
                    <GlassCard className="p-4">
                        <div className="flex items-center justify-center space-x-2 space-x-reverse">
                            <button
                                onClick={() => fetchProducts(userInfo.vendor.id, currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                                className="px-4 py-2 bg-glass-light hover:bg-glass-medium rounded-xl transition-all disabled:opacity-50"
                            >
                                قبلی
                            </button>
                            <span className="text-text-primary px-4">
                                صفحه {currentPage} از {totalPages}
                            </span>
                            <button
                                onClick={() => fetchProducts(userInfo.vendor.id, currentPage + 1)}
                                disabled={currentPage === totalPages || loading}
                                className="px-4 py-2 bg-glass-light hover:bg-glass-medium rounded-xl transition-all disabled:opacity-50"
                            >
                                بعدی
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};

export default BasalamPage;
