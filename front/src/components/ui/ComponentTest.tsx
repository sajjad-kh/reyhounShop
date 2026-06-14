import { GlassCard, GlassButton, GlassInput, GlassNavbar } from './index';

export const ComponentTest = () => {
    const mockUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
    };

    return (
        <div className="min-h-screen bg-gradient-primary p-8 space-y-8">
            {/* Navbar Test */}
            <GlassNavbar
                user={mockUser}
                cartItemCount={3}
                onSearch={(query) => console.log('Search:', query)}
                onCartClick={() => console.log('Cart clicked')}
                onProfileClick={() => console.log('Profile clicked')}
                onLogoClick={() => console.log('Logo clicked')}
            />

            {/* Add top margin to account for fixed navbar */}
            <div className="pt-20">
                {/* Card Test */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <GlassCard variant="light" hover>
                        <h3 className="text-xl font-semibold mb-2">Light Glass Card</h3>
                        <p className="text-text-secondary">This is a light variant glass card with hover effects.</p>
                    </GlassCard>

                    <GlassCard variant="medium" hover>
                        <h3 className="text-xl font-semibold mb-2">Medium Glass Card</h3>
                        <p className="text-text-secondary">This is a medium variant glass card with hover effects.</p>
                    </GlassCard>

                    <GlassCard variant="heavy" hover>
                        <h3 className="text-xl font-semibold mb-2">Heavy Glass Card</h3>
                        <p className="text-text-secondary">This is a heavy variant glass card with hover effects.</p>
                    </GlassCard>
                </div>

                {/* Button Test */}
                <GlassCard className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Glass Buttons</h3>
                    <div className="flex flex-wrap gap-4">
                        <GlassButton variant="primary" size="sm">
                            Primary Small
                        </GlassButton>
                        <GlassButton variant="secondary" size="md">
                            Secondary Medium
                        </GlassButton>
                        <GlassButton variant="accent" size="lg">
                            Accent Large
                        </GlassButton>
                        <GlassButton variant="primary" loading>
                            Loading Button
                        </GlassButton>
                    </div>
                </GlassCard>

                {/* Input Test */}
                <GlassCard>
                    <h3 className="text-xl font-semibold mb-4">Glass Inputs</h3>
                    <div className="space-y-4">
                        <GlassInput
                            label="Email Address"
                            type="email"
                            placeholder="Enter your email"
                            icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                </svg>
                            }
                        />

                        <GlassInput
                            label="Password"
                            type="password"
                            placeholder="Enter your password"
                            icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            }
                        />

                        <GlassInput
                            label="Search"
                            type="search"
                            placeholder="Search products..."
                            error="Please enter a valid search term"
                            icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            }
                        />

                        <GlassInput
                            placeholder="Input without label"
                            helperText="This input doesn't have a floating label"
                            size="lg"
                            variant="filled"
                        />
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};