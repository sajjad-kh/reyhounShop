export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface TourStep {
    id: number;
    page: string;
    selector: string;
    title: string;
    description: string;
    order: number;
    placement: TourPlacement;
    isActive: boolean;
}

export interface TourStepInput {
    page: string;
    selector: string;
    title: string;
    description: string;
    order: number;
    placement: TourPlacement;
    isActive: boolean;
}
