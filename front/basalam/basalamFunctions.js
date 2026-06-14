// aryafte ettelaate karbar
async function getUserInfo(token) {
    const response = await fetch('https://openapi.basalam.com/v1/users/me', {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    
    return await response.json();
}
//  daryafte mahsolat
async function getVendorProducts(vendorId, token) {
  const url = `https://openapi.basalam.com/v1/vendors/${vendorId}/products`;

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const products = await response.json();
    console.log(products);
    return products;
  } catch (error) {
    console.error("Error fetching vendor products:", error);
  }
}

// daryafte sefareshat moshtari
async function getOrdersCustomer(token) {
    const response = await fetch('https://openapi.basalam.com/v1/customer-orders', {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    
    return await response.json();
}

// daryafte sefareshat ghorfe dar
async function getOrdersGhorfe(token, statuses = []) {
    let url = 'https://openapi.basalam.com/v1/vendor-parcels';
    
    // Add status filters if provided
    if (statuses.length > 0) {
        const statusParams = statuses.map(s => `statuses=${s}`).join('&');
        url += `?${statusParams}`;
    }
    
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    
    return await response.json();
}

// daryafte joziyate sefaresh
async function getOrdersDetails(paracelId, token) {
  const url = `https://openapi.basalam.com/v1/vendor-parcels/${paracelId}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const products = await response.json();
    console.log(products);
    return products;
  } catch (error) {
    console.error("Error fetching vendor products:", error);
  }
}

// sabte sefaresh
async function setOrder(paracelId, token) {
  const url = `https://order.basalam.com/v2/basket/product/${paracelId}/status`;

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const products = await response.json();
    console.log(products);
    return products;
  } catch (error) {
    console.error("Error fetching vendor products:", error);
  }
}

// daryafte raveshhaye ersal
async function getShippingMethods(token) {
    const response = await fetch('https://openapi.basalam.com/v1/shipping-methods/defaults', {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    
    return await response.json();
}

async function getAllReviews(productId) {
  const limit = 20;
  let offset = 0;
  let allReviews = [];
  let totalCount = 0;

  while (true) {
    const url = `https://services.basalam.com/web/v1/review/product/${productId}/reviews?limit=${limit}&sort_by=fdd&offset=${offset}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include"
    });

    const data = await response.json();

    if (!totalCount) {
      totalCount = data.total_count;
    }

    allReviews = allReviews.concat(data.reviews);

    if (!data.has_next) break;

    offset += limit;
  }

  console.log(`✅ همه آیتم‌ها گرفته شد (${allReviews.length} از ${totalCount})`);
  return allReviews;
}
