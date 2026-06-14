import { useState } from 'react';
import { UserNavbar } from '../components/ui/UserNavbar';
import { CartProvider } from '../context/CartContext';

/**
 * Example page showing how to use the UserNavbar component
 * 
 * Features:
 * - User name display
 * - Cart items count (updates automatically)
 * - Total orders count from Basalam
 * - Pending orders notification
 * - Dropdown menu with stats
 * - Mobile responsive
 */

const UserNavbarExample = () => {
    const [searchQuery, setSearchQuery] = useState('');

    // Example user data - in real app, this comes from auth context
    const user = {
        id: 1,
        name: 'علی احمدی',
        email: 'ali@example.com',
        avatar: undefined, // or provide image URL
    };

    const handleSearch = (query: string) => {
        console.log('جستجو برای:', query);
        setSearchQuery(query);
        // Implement search logic here
    };

    const handleCartClick = () => {
        console.log('کلیک روی سبد خرید');
        // Navigate to cart page or open cart drawer
        window.location.href = '/cart';
    };

    const handleOrdersClick = () => {
        console.log('کلیک روی سفارش‌ها');
        // Navigate to orders page
        window.location.href = '/orders';
    };

    const handleProfileClick = () => {
        console.log('کلیک روی پروفایل');
        // Navigate to profile page
        window.location.href = '/profile';
    };

    const handleLoginClick = () => {
        console.log('کلیک روی ورود');
        // Navigate to login page
        window.location.href = '/login';
    };

    const handleLogoClick = () => {
        console.log('کلیک روی لوگو');
        // Navigate to home page
        window.location.href = '/';
    };

    return (
        <CartProvider>
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900">
                {/* Navbar */}
                <UserNavbar
                    user={user}
                    onSearch={handleSearch}
                    onCartClick={handleCartClick}
                    onOrdersClick={handleOrdersClick}
                    onProfileClick={handleProfileClick}
                    onLoginClick={handleLoginClick}
                    onLogoClick={handleLogoClick}
                    scrollBlur={true}
                />

                {/* Page Content */}
                <div className="pt-24 px-4 max-w-7xl mx-auto">
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl p-8">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                            نمونه Navbar کاربر
                        </h1>

                        <div className="space-y-6">
                            {/* Features */}
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                                    ویژگی‌ها:
                                </h2>
                                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                                    <li>نمایش نام کاربر</li>
                                    <li>نمایش تعداد محصولات در سبد خرید (با انیمیشن)</li>
                                    <li>نمایش تعداد کل سفارش‌های Basalam</li>
                                    <li>نمایش سفارش‌های در انتظار پرداخت</li>
                                    <li>منوی کشویی با آمار کامل</li>
                                    <li>Tooltip برای دکمه‌ها</li>
                                    <li>طراحی ریسپانسیو (موبایل و دسکتاپ)</li>
                                    <li>پشتیبانی از حالت تاریک</li>
                                    <li>انیمیشن‌های روان</li>
                                </ul>
                            </div>

                            {/* Usage */}
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                                    نحوه استفاده:
                                </h2>
                                <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-x-auto">
                                    <pre className="text-sm text-gray-800 dark:text-gray-200">
                                        {`import { UserNavbar } from '../components/ui/UserNavbar';
import { CartProvider } from '../context/CartContext';

function App() {
  const user = {
    id: 1,
    name: 'علی احمدی',
    email: 'ali@example.com',
  };

  return (
    <CartProvider>
      <UserNavbar
        user={user}
        onSearch={(query) => console.log(query)}
        onCartClick={() => navigate('/cart')}
        onOrdersClick={() => navigate('/orders')}
        onProfileClick={() => navigate('/profile')}
        onLoginClick={() => navigate('/login')}
        onLogoClick={() => navigate('/')}
      />
      {/* Your page content */}
    </CartProvider>
  );
}`}
                                    </pre>
                                </div>
                            </div>

                            {/* Data Sources */}
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                                    منابع داده:
                                </h2>
                                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                                    <li>
                                        <strong>تعداد سبد خرید:</strong> از <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">useCart()</code> hook
                                    </li>
                                    <li>
                                        <strong>آمار سفارش‌ها:</strong> از <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">useOrderStats(userId)</code> hook
                                    </li>
                                    <li>
                                        <strong>اطلاعات کاربر:</strong> از props یا auth context
                                    </li>
                                </ul>
                            </div>

                            {/* API Endpoints */}
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                                    API Endpoints مورد استفاده:
                                </h2>
                                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                                    <li>
                                        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">GET /api/v1/basalam/orders</code> - دریافت لیست سفارش‌ها
                                    </li>
                                    <li>
                                        <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">GET /api/v1/cart</code> - دریافت سبد خرید
                                    </li>
                                </ul>
                            </div>

                            {/* Test Instructions */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                                <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-200 mb-4">
                                    تست کردن:
                                </h2>
                                <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-300">
                                    <li>محصولی به سبد خرید اضافه کنید - تعداد سبد خرید باید آپدیت شود</li>
                                    <li>سفارشی ثبت کنید - تعداد سفارش‌ها باید افزایش یابد</li>
                                    <li>روی دکمه سفارش‌ها hover کنید - tooltip با آمار نمایش داده می‌شود</li>
                                    <li>روی نام کاربر کلیک کنید - منوی کشویی با آمار کامل باز می‌شود</li>
                                    <li>در موبایل تست کنید - منوی موبایل با آمار نمایش داده می‌شود</li>
                                </ol>
                            </div>

                            {/* Current Search Query */}
                            {searchQuery && (
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                                    <p className="text-green-800 dark:text-green-200">
                                        <strong>جستجوی فعلی:</strong> {searchQuery}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </CartProvider>
    );
};

export default UserNavbarExample;
