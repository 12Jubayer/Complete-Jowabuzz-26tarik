import { Router } from 'express';
import { registerUser, loginUser, refreshUserToken } from '../controllers/authController.js';
import {
  requestForgotPasswordOtp,
  requestLoginOtp,
  resetPasswordWithOtp,
  verifyForgotPasswordOtp,
  verifyLoginOtp,
} from '../controllers/authOtpController.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshUserToken);
router.post('/login/request-otp', requestLoginOtp);
router.post('/login/verify-otp', verifyLoginOtp);
router.post('/forgot-password/request-otp', requestForgotPasswordOtp);
router.post('/forgot-password/verify-otp', verifyForgotPasswordOtp);
router.post('/forgot-password/reset', resetPasswordWithOtp);

export default router;
