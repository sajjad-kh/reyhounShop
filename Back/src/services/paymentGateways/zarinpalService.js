const axios = require('axios');

class ZarinpalService {
  constructor() {
    this.merchantId = process.env.ZARINPAL_MERCHANT_ID;
    this.sandboxMode = process.env.NODE_ENV !== 'production';
    this.baseUrl = this.sandboxMode 
      ? 'https://sandbox.zarinpal.com/pg/rest/WebGate'
      : 'https://api.zarinpal.com/pg/rest/WebGate';
    this.paymentUrl = this.sandboxMode
      ? 'https://sandbox.zarinpal.com/pg/StartPay'
      : 'https://www.zarinpal.com/pg/StartPay';
  }

  /**
   * Request payment from Zarinpal
   * @param {Object} paymentData - Payment information
   * @param {number} paymentData.amount - Amount in Rials
   * @param {string} paymentData.description - Payment description
   * @param {string} paymentData.callbackUrl - Callback URL
   * @param {string} paymentData.email - Customer email (optional)
   * @param {string} paymentData.mobile - Customer mobile (optional)
   * @returns {Promise<Object>} Payment request result
   */
  async requestPayment(paymentData) {
    try {
      const { amount, description, callbackUrl, email, mobile } = paymentData;

      const requestData = {
        MerchantID: this.merchantId,
        Amount: amount,
        Description: description,
        CallbackURL: callbackUrl,
        Email: email || '',
        Mobile: mobile || ''
      };

      const response = await axios.post(`${this.baseUrl}/PaymentRequest.json`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const { Status, Authority } = response.data;

      if (Status === 100) {
        return {
          success: true,
          authority: Authority,
          paymentUrl: `${this.paymentUrl}/${Authority}`,
          gatewayResponse: response.data
        };
      } else {
        return {
          success: false,
          error: this.getErrorMessage(Status),
          status: Status,
          gatewayResponse: response.data
        };
      }
    } catch (error) {
      console.error('Zarinpal request payment error:', error);
      return {
        success: false,
        error: 'Payment gateway connection failed',
        details: error.message
      };
    }
  }

  /**
   * Verify payment with Zarinpal
   * @param {Object} verificationData - Verification information
   * @param {string} verificationData.authority - Payment authority
   * @param {number} verificationData.amount - Original amount in Rials
   * @returns {Promise<Object>} Verification result
   */
  async verifyPayment(verificationData) {
    try {
      const { authority, amount } = verificationData;

      const requestData = {
        MerchantID: this.merchantId,
        Authority: authority,
        Amount: amount
      };

      const response = await axios.post(`${this.baseUrl}/PaymentVerification.json`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const { Status, RefID } = response.data;

      if (Status === 100) {
        return {
          success: true,
          verified: true,
          refId: RefID,
          gatewayResponse: response.data
        };
      } else if (Status === 101) {
        return {
          success: true,
          verified: true,
          refId: RefID,
          message: 'Payment already verified',
          gatewayResponse: response.data
        };
      } else {
        return {
          success: false,
          verified: false,
          error: this.getErrorMessage(Status),
          status: Status,
          gatewayResponse: response.data
        };
      }
    } catch (error) {
      console.error('Zarinpal verify payment error:', error);
      return {
        success: false,
        verified: false,
        error: 'Payment verification failed',
        details: error.message
      };
    }
  }

  /**
   * Get error message for Zarinpal status codes
   * @param {number} status - Status code from Zarinpal
   * @returns {string} Error message
   */
  getErrorMessage(status) {
    const errorMessages = {
      '-1': 'اطلاعات ارسال شده ناقص است',
      '-2': 'IP یا مرچنت کد پذیرنده صحیح نیست',
      '-3': 'با توجه به محدودیت‌های شاپرک امکان پردازش وجود ندارد',
      '-4': 'سطح تایید پذیرنده پایین‌تر از سطح نقره‌ای است',
      '-11': 'درخواست مورد نظر یافت نشد',
      '-12': 'امکان ویرایش درخواست میسر نمی‌باشد',
      '-21': 'هیچ نوع عملیات مالی برای این تراکنش یافت نشد',
      '-22': 'تراکنش ناموفق ویا در انتظار تایید است',
      '-33': 'رقم تراکنش با رقم پرداخت شده مطابقت ندارد',
      '-34': 'سقف تقسیم تراکنش از لحاظ تعداد یا رقم عبور نموده است',
      '-40': 'اجازه دسترسی به متد مربوطه وجود ندارد',
      '-41': 'اطلاعات ارسال شده مربوط به AdditionalData غیرمعتبر می‌باشد',
      '-42': 'مدت زمان معتبر طول عمر شناسه پرداخت بایستی بین ۳۰ دقیقه تا ۴۵ روز مشخص گردد',
      '-54': 'درخواست مورد نظر آرشیو شده است'
    };

    return errorMessages[status.toString()] || `خطای ناشناخته: ${status}`;
  }
}

module.exports = ZarinpalService;