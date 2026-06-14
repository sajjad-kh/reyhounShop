// basalamApi.ts
export async function fetchBasalamVendorParcels(token: string, statuses: number[] = []) {
    let url = 'https://openapi.basalam.com/v1/vendor-parcels';

    if (statuses.length > 0) {
        const statusParams = statuses.map((s) => `statuses=${s}`).join('&');
        url += `?${statusParams}`;
    }

    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });

    return response.json();
}