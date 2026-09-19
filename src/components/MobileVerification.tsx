import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, KeyRound, AlertCircle, RefreshCw } from 'lucide-react';

interface MobileVerificationProps {
  mobileNo: string;
  onChangeMobile: (val: string) => void;
  isVerified: boolean;
  onVerificationChange: (verified: boolean) => void;
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const MobileVerification = ({
  mobileNo,
  onChangeMobile,
  isVerified,
  onVerificationChange,
  notify,
}: MobileVerificationProps) => {
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const phoneRegex = /^[0-9]{10}$/;

  const handleSendOTP = () => {
    if (!phoneRegex.test(mobileNo.trim())) {
      notify('Please enter a valid 10-digit mobile number first.', 'error');
      return;
    }

    setShowOtpSection(true);
    setOtpSent(true);
    setResendCooldown(30);

    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    notify(`OTP has been sent to +91 ${mobileNo}. (For testing, use: 123456)`, 'info');
  };

  const handleVerifyOTP = () => {
    if (otpInput.trim() === '123456') {
      onVerificationChange(true);
      setShowOtpSection(false);
      notify('Mobile number verified successfully!', 'success');
    } else {
      notify('Invalid OTP. Please try again (Demo OTP is 123456).', 'error');
    }
  };

  const handleResetVerification = () => {
    onVerificationChange(false);
    setShowOtpSection(false);
    setOtpInput('');
    setOtpSent(false);
  };

  return (
    <div className="w-full">
      <label htmlFor="mobileNo" className="block text-sm font-bold text-gray-900 mb-1">
        Mobile No.: <span className="text-red-600">*</span>
      </label>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 font-medium text-sm">
            +91
          </div>
          <input
            type="tel"
            id="mobileNo"
            name="mobileNo"
            maxLength={10}
            pattern="[0-9]{10}"
            value={mobileNo}
            onChange={(e) => {
              // Only digits allowed
              const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
              onChangeMobile(cleaned);
              if (isVerified) onVerificationChange(false);
            }}
            readOnly={isVerified}
            placeholder="Enter 10-digit mobile number"
            required
            className={`w-full pl-12 pr-4 py-2.5 text-sm border rounded-md transition-all outline-none ${
              isVerified
                ? 'bg-[#f3f6ee] border-[#8B9A6E] text-[#2f3d1b] font-semibold cursor-not-allowed'
                : 'bg-white border-gray-300 focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E]'
            }`}
          />
        </div>

        {!isVerified ? (
          <button
            type="button"
            id="sendOtpBtn"
            onClick={handleSendOTP}
            disabled={resendCooldown > 0}
            className="px-4 py-2.5 bg-[#8B9A6E] text-white hover:bg-[#78875c] active:bg-[#66744d] disabled:bg-gray-400 text-sm font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs"
          >
            {resendCooldown > 0 ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Resend in {resendCooldown}s
              </>
            ) : otpSent ? (
              'Resend OTP'
            ) : (
              'Verify Mobile'
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleResetVerification}
            className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-black border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            title="Edit mobile number"
          >
            Change Number
          </button>
        )}
      </div>

      {/* Verified Badge */}
      {isVerified && (
        <div
          id="verifiedBadge"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#45532d] bg-[#f0f4eb] border border-[#c4cfb5] px-2.5 py-1 rounded-md"
        >
          <CheckCircle2 className="w-4 h-4 text-[#687a4d]" />
          <span>✓ Mobile Number Verified Successfully</span>
        </div>
      )}

      {/* OTP verification drawer */}
      {showOtpSection && !isVerified && (
        <div
          id="otpSection"
          className="mt-3 p-3.5 bg-gray-50 border border-gray-200 rounded-lg animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-[#8B9A6E]" />
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
              OTP Verification Code
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                id="otpInput"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit OTP (e.g. 123456)"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md font-mono tracking-wider focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                id="confirmOtpBtn"
                onClick={handleVerifyOTP}
                className="px-4 py-2 bg-[#8B9A6E] text-white hover:bg-[#78875c] active:bg-[#66744d] text-sm font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shadow-xs"
              >
                Confirm OTP
              </button>
              <button
                type="button"
                onClick={() => setOtpInput('123456')}
                className="px-2.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-md cursor-pointer"
                title="Quick fill test OTP"
              >
                Fill 123456
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-600">
            <KeyRound className="w-3.5 h-3.5 text-gray-500" />
            <span>
              Demo OTP is: <strong className="text-black font-bold">123456</strong>
            </span>
          </div>
        </div>
      )}

      {!isVerified && !showOtpSection && (
        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-gray-400" />
          Click &quot;Verify Mobile&quot; to receive the verification OTP.
        </p>
      )}
    </div>
  );
};
