import { showToast } from '../components/ui/Toast';

type ToastFn = ((msg: string) => void) & {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
};

const base = ((msg: string) => showToast.info(msg)) as ToastFn;
base.success = (msg: string) => showToast.success(msg);
base.error = (msg: string) => showToast.error(msg);
base.info = (msg: string) => showToast.info(msg);

export const toast = base;

export default toast;
