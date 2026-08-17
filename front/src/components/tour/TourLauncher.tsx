import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { useTour, pageFromPath } from '../../hooks/useTour';
import Tour from './Tour';

// For pages whose tour depends on a concrete record existing (e.g. a real
// product detail page), navigate to that URL when the help is launched so the
// highlighted element is guaranteed to be present. The user is returned to
// their previous location once the tour closes ("return to normal state").
const TOUR_LANDING: Record<string, string> = {
    'product-detail': '/products/26',
};

export const TourLauncher: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const page = pageFromPath(location.pathname);
    const { steps, isOpen, start, close } = useTour(page);

    const returnPathRef = useRef<string | null>(null);
    const pendingStartRef = useRef(false);

    const launch = () => {
        const landing = TOUR_LANDING[page];
        if (landing && !location.pathname.startsWith(landing)) {
            // Remember where we came from so we can return after the tour.
            returnPathRef.current =
                location.pathname + location.search + location.hash;
            pendingStartRef.current = true;
            navigate(landing);
        } else {
            start();
        }
    };

    // After navigating to a tour landing URL, open the tour there.
    useEffect(() => {
        if (
            pendingStartRef.current &&
            TOUR_LANDING[page] &&
            location.pathname.startsWith(TOUR_LANDING[page])
        ) {
            pendingStartRef.current = false;
            start();
        }
    }, [location.pathname, page, start]);

    // Return the user to where they were once the landing-page tour closes.
    const handleClose = (persist?: boolean) => {
        close(persist);
        if (returnPathRef.current) {
            const rp = returnPathRef.current;
            returnPathRef.current = null;
            navigate(rp);
        }
    };

    // Allow other parts of the app (e.g. the profile page) to trigger the tour
    useEffect(() => {
        const onReplay = () => {
            localStorage.removeItem(`tour-seen-${page}`);
            start();
        };
        const onReset = () => {
            Object.keys(localStorage)
                .filter((k) => k.startsWith('tour-seen-'))
                .forEach((k) => localStorage.removeItem(k));
            start();
        };

        window.addEventListener('tour:replay', onReplay);
        window.addEventListener('tour:reset', onReset);
        return () => {
            window.removeEventListener('tour:replay', onReplay);
            window.removeEventListener('tour:reset', onReset);
        };
    }, [page, start]);

    return (
        <>
            {/* Floating help button available on every user section */}
            <button
                onClick={launch}
                title="راهنمای صفحه"
                aria-label="راهنمای صفحه"
                className="fixed bottom-20 sm:bottom-6 left-6 z-[900] w-12 h-12 rounded-full bg-gradient-accent text-white shadow-glass flex items-center justify-center hover:brightness-110 transition-all"
            >
                <HelpCircle className="w-6 h-6" />
            </button>

            <Tour steps={steps} isOpen={isOpen} onClose={handleClose} />
        </>
    );
};

export default TourLauncher;
