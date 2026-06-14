const axios = require('axios');

class PayirService {
  constructor() {
    this.apiKey = process.env.PAYIR_API_KEY;
    this.baseUrl = 'https://pay.ir/pg';
  }

  /**
   * Request payment from Pay.ir
   * @param {Object} paymentData - Payment information
   * @param {number} paymentData.amount - Amount in Rials
   * @param {string} paymentData.description - Payment description
   * @param {string} paymentData.callbackUrl - Callback URL
   * @param {string} paymentData.mobile - Customer mobile (optional)
   * @param {string} paymentData.factorNumber - Invoice number (optional)
   * @returns {Promise<Object>} Payment request result
   */
  async requestPayment(paymentData) {
    try {
      const { amount, description, callbackUrl, mobile, factorNumber } = paymentData;

      const requestData = {
        api: this.apiKey,
        amount: amount,
        redirect: callbackUrl,
        mobile: mobile || '',
        factorNumber: factorNumber || '',
        description: description
      };

      const response = await axios.post(`${this.baseUrl}/send`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data.status === 1) {
        const token = response.data.token;
        return {
          success: true,
          token: token,
          paymentUrl: `https://pay.ir/pg/${token}`,
          gatewayResponse: response.data
        };
      } else {
        return {
          success: false,
          error: this.getErrorMessage(response.data.errorCode),
          errorCode: response.data.errorCode,
          gatewayResponse: response.data
        };
      }
    } catch (error) {
      console.error('Pay.ir request payment error:', error);
      return {
        success: false,
        error: 'Payment gateway connection failed',
        details: error.message
      };
    }
  }

  /**
   * Verify payment with Pay.ir
   * @param {Object} verificationData - Verification information
   * @param {string} verificationData.token - Payment token
   * @returns {Promise<Object>} Verification result
   */
  async verifyPayment(verificationData) {
    try {
      const { token } = verificationData;

      const requestData = {
        api: this.apiKey,
        token: token
      };

      const response = await axios.post(`${this.baseUrl}/verify`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data.status === 1) {
        return {
          success: true,
          verified: true,
          transId: response.data.transId,
          amount: response.data.amount,
          factorNumber: response.data.factorNumber,
          mobile: response.data.mobile,
          description: response.data.description,
          cardNumber: response.data.cardNumber,
          traceNumber: response.data.traceNumber,
          gatewayResponse: response.data
        };
      } else {
        return {
          success: false,
          verified: false,
          error: this.getErrorMessage(response.data.errorCode),
          errorCode: response.data.errorCode,
          gatewayResponse: response.data
        };
      }
    } catch (error) {
      console.error('Pay.ir verify payment error:', error);
      return {
        success: false,
        verified: false,
        error: 'Payment verification failed',
        details: error.message
      };
    }
  }

  /**
   * Get transaction details
   * @param {string} transId - Transaction ID
   * @returns {Promise<Object>} Transaction details
   */
  async getTransaction(transId) {
    try {
      const requestData = {
        api: this.apiKey,
        transId: transId
      };

      const response = await axios.post(`${this.baseUrl}/inquiry`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data.status === 1) {
        return {
          success: true,
          transaction: response.data,
          gatewayResponse: response.data
        };
      } else {
        return {
          success: false,
          error: this.getErrorMessage(response.data.errorCode),
          errorCode: response.data.errorCode,
          gatewayResponse: response.data
        };
      }
    } catch (error) {
      console.error('Pay.ir get transaction error:', error);
      return {
        success: false,
        error: 'Transaction inquiry failed',
        details: error.message
      };
    }
  }

  /**
   * Get error message for Pay.ir error codes
   * @param {number} errorCode - Error code from Pay.ir
   * @returns {string} Error message
   */
  getErrorMessage(errorCode) {
    const errorMessages = {
      '-1': 'ارسال api الزامی می باشد',
      '-2': 'ارسال amount الزامی می باشد',
      '-3': 'amount باید عددی باشد',
      '-4': 'amount نمی تواند کمتر از 1000 ریال باشد',
      '-5': 'ارسال redirect الزامی می باشد',
      '-6': 'درگاه پرداختی با api ارسالی یافت نشد یا غیر فعال می باشد',
      '-7': 'فروشنده غیر فعال می باشد',
      '-8': 'آدرس بازگشتی با آدرس درگاه ثبت شده مطابقت ندارد',
      '-9': 'تراکنش با مبلغ درخواستی یافت نشد',
      '-10': 'امکان تایید پرداخت وجود ندارد',
      '-11': 'تراکنش قبلا تایید شده است',
      '-12': 'تراکنش ناموفق بوده است',
      '-13': 'اطلاعات پرداخت یافت نشد',
      '-14': 'مبلغ تراکنش کمتر از حد مجاز می باشد',
      '-15': 'IP سرور مجاز نمی باشد'
    };

    return errorMessages[errorCode?.toString()] || `خطای ناشناخته: ${errorCode}`;
  }
}

module.exports = PayirService;