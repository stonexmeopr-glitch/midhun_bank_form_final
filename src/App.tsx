import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { PinCodeAddressSection } from './components/PinCodeAddressSection';
import { SignaturePad, SignaturePadHandle } from './components/SignaturePad';
import { LoginPage } from './components/LoginPage';
import { ApplicationFormData, SubmittedApplication, AuthUser } from './types';
import { generateApplicationPdf } from './services/pdfGenerator';
import {
  sendApplicationPdfToGmail,
  TARGET_GMAIL_RECIPIENT,
} from './services/gmailService';
import { sendConfirmationEmailToServer } from './services/emailService';
import { getCachedAccessToken } from './services/firebaseAuth';
import { saveApplicationToFirestore } from './services/firestoreService';
import {
  Send,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  X,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [formData, setFormData] = useState<ApplicationFormData>({
    name: '',
    fatherName: '',
    gender: '',
    dob: '',
    age: '',
    pincode: '',
    state: '',
    district: '',
    postal: '',
    address: '',
    qualification: '',
    mobileNo: '',
    email: '',
    place: '',
    date: new Date().toISOString().split('T')[0],
    consentAgreed: false,
    signatureDataUrl: '',
    referredBy: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [lastSubmittedInfo, setLastSubmittedInfo] = useState<{
    applicationId: string;
    name?: string;
    email?: string;
  } | null>(null);

  // Reset form to allow submitting another application with same/new details
  // Toast notification state
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'info',
  });

  const signatureRef = useRef<SignaturePadHandle | null>(null);

  // Load auth session from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('pbtu_auth_user');
      if (storedUser) {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
        setFormData((prev) => ({
          ...prev,
          email: parsedUser.email,
          name: prev.name || parsedUser.name,
        }));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4500);
  };

  const handleLoginSuccess = async (user: AuthUser) => {
    setLastSubmittedInfo(null);
    setCurrentUser(user);
    try {
      localStorage.setItem('pbtu_auth_user', JSON.stringify(user));
    } catch {
      // ignore
    }

    setFormData((prev) => ({
      ...prev,
      email: user.email,
      name: prev.name || user.name,
    }));

    showToast(`Authenticated as ${user.email}.`, 'success');
  };

  // Age calculation from DOB
  const calculateAge = (dobString: string) => {
    if (!dobString) return '';
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return '';

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age.toString() : '0';
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dobValue = e.target.value;
    const computedAge = calculateAge(dobValue);
    setFormData((prev) => ({
      ...prev,
      dob: dobValue,
      age: computedAge,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressFieldChange = (
    field: 'pincode' | 'state' | 'district' | 'postal' | 'address',
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAutoSetPlace = (placeName: string) => {
    if (placeName) {
      setFormData((prev) => ({
        ...prev,
        place: placeName,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedEmail = (formData.email || currentUser?.email || '').trim().toLowerCase();
    const cleanMobile = formData.mobileNo.replace(/\D/g, '').slice(-10);

    // Email validation
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      showToast('Please provide a valid email address.', 'error');
      const emailEl = document.getElementById('applicantEmail');
      emailEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      emailEl?.focus();
      return;
    }

    // 1. PIN code & Address check
    if (!formData.pincode || formData.pincode.length !== 6) {
      showToast('Please enter a valid 6-digit PIN code to auto-fetch State, District and Postal location.', 'error');
      const pinEl = document.getElementById('pincode');
      pinEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pinEl?.focus();
      return;
    }

    if (!formData.address.trim()) {
      showToast('Please enter your house/kiosk/street address.', 'error');
      const addrEl = document.getElementById('address');
      addrEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      addrEl?.focus();
      return;
    }

    // 2. Qualification check
    if (!formData.qualification) {
      showToast('Please select your qualification from the dropdown list.', 'error');
      const qualEl = document.getElementById('qualification');
      qualEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      qualEl?.focus();
      return;
    }

    // 3. Mobile number check (10 digits)
    if (!formData.mobileNo || formData.mobileNo.length < 10) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      const mobileEl = document.getElementById('mobileNo');
      mobileEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mobileEl?.focus();
      return;
    }

    // 4. Tick mark for Consent check
    if (!formData.consentAgreed) {
      showToast('Please tick the Declaration & Consent checkbox to confirm your voluntary consent.', 'error');
      const consentEl = document.getElementById('consentAgreed');
      consentEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      consentEl?.focus();
      return;
    }

    // 5. Signature verification check
    const signatureData = signatureRef.current?.getDataUrl() || '';
    if (!signatureData || signatureRef.current?.isEmpty()) {
      showToast('Please provide your signature in the designated signature box.', 'error');
      const sigEl = document.getElementById('signatureCanvas');
      sigEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);

    try {
      const applicantEmail = (formData.email || currentUser?.email || '').trim();

      // Generate unique Application Reference ID
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const appId = `PBATU-${dateStr}-${randomNum}`;

      const submission: SubmittedApplication = {
        ...formData,
        email: applicantEmail,
        signatureDataUrl: signatureData,
        applicationId: appId,
        submittedAt: new Date().toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        status: 'Verified',
        pdfSentTo: TARGET_GMAIL_RECIPIENT,
      };

      // Generate official PDF format in background
      const pdfResult = await generateApplicationPdf(submission);
      submission.pdfFilename = pdfResult.filename;

      // Persist application in Firestore database
      try {
        await saveApplicationToFirestore(submission);
      } catch (dbErr) {
        console.warn('Firestore database save warning:', dbErr);
      }

      // 1. Dispatch confirmation email with PDF attachment via full-stack server endpoint
      let deliveryMode: 'live_smtp' | 'test_transport' | 'gmail_api' = 'test_transport';

      try {
        const serverMailRes = await sendConfirmationEmailToServer(
          submission,
          pdfResult.base64,
          pdfResult.filename
        );
        if (serverMailRes.success) {
          submission.pdfMessageId = serverMailRes.messageId;
          if (serverMailRes.mode === 'live_smtp') {
            deliveryMode = 'live_smtp';
            submission.pdfSentStatus = 'sent';
          } else {
            deliveryMode = 'test_transport';
            submission.pdfSentStatus = 'prepared';
          }
        }
      } catch (serverMailErr) {
        console.warn('Backend email dispatch log:', serverMailErr);
      }

      // 2. Also attempt client Gmail OAuth API if token available and live SMTP was not used
      const token = getCachedAccessToken();
      if (token && deliveryMode !== 'live_smtp') {
        try {
          const sendRes = await sendApplicationPdfToGmail(
            token,
            submission,
            pdfResult.base64,
            pdfResult.filename,
            applicantEmail
          );
          if (sendRes.success && sendRes.method === 'gmail_api') {
            deliveryMode = 'gmail_api';
            submission.pdfSentStatus = 'sent';
            submission.pdfMessageId = sendRes.messageId;
          }
        } catch (mailErr) {
          console.warn('Gmail API dispatch log:', mailErr);
        }
      }

      setSubmittedRef(appId);
      setLastSubmittedInfo({
        applicationId: appId,
        name: formData.name,
        email: applicantEmail,
      });

      showToast(`Application ${appId} submitted successfully.`, 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      showToast(`Error submitting application: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f9] text-[#000] py-6 px-3 sm:px-6 font-sans">
      {/* Toast feedback */}
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-md px-4 py-3 rounded-lg shadow-lg border text-sm flex items-start gap-2.5 animate-in slide-in-from-top duration-300 ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-900 border-red-200'
              : toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-neutral-900 text-white border-neutral-700'
          }`}
        >
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <CheckCircle2 className="w-5 h-5 text-neutral-300 shrink-0 mt-0.5" />}
          <div className="flex-1 font-medium">{toast.message}</div>
          <button
            onClick={() => setToast((prev) => ({ ...prev, show: false }))}
            className="text-gray-400 hover:text-gray-600 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* If user is not logged in, show Google Auth Login Page */}
      {!currentUser ? (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          lastSubmittedInfo={lastSubmittedInfo}
          onClearSubmittedInfo={() => setLastSubmittedInfo(null)}
        />
      ) : (
        <>
          {/* Top Status Bar - Clean & Minimal */}
          <div className="max-w-[760px] mx-auto mb-3 flex items-center justify-between gap-2 text-xs text-neutral-600 print:hidden px-1">
            <div className="flex items-center gap-1.5 text-xs text-neutral-700">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-neutral-700">Union Portal Session Active</span>
            </div>
          </div>

          <main className="max-w-[760px] mx-auto bg-[#ffffff] p-6 sm:p-10 shadow-lg border-t-[5px] border-t-[#8B9A6E] rounded-xs">
            {/* Header Component */}
            <Header />

            {/* If application was submitted, show Feedback Reference Number and Message ONLY */}
            {submittedRef ? (
              <div className="py-10 px-4 text-center space-y-6">
                <div className="w-16 h-16 bg-[#f3f6ee] text-[#69794e] border border-[#c4cfb5] rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-neutral-900 tracking-tight uppercase">
                    Application Submitted
                  </h3>
                </div>

                <div className="p-4 sm:p-5 bg-[#f8faf4] border-2 border-[#8B9A6E] rounded-md max-w-md mx-auto">
                  <span className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
                    Application Reference Number
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-neutral-900 tracking-wide select-all">
                    {submittedRef}
                  </span>
                </div>

                <p className="text-base font-semibold text-neutral-800">
                  We will get back to you.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name of the Applicant */}
                <div className="form-group">
                  <label htmlFor="name" className="block font-bold text-sm mb-1.5 text-neutral-900">
                    Name of the Applicant: <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Full Name (as per official ID)"
                    required
                    className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white"
                  />
                </div>

                {/* Father's / Husband's Name */}
                <div className="form-group">
                  <label htmlFor="fatherName" className="block font-bold text-sm mb-1.5 text-neutral-900">
                    Father's / Husband's Name: <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="fatherName"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleChange}
                    placeholder="Father's or Husband's Full Name"
                    required
                    className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white"
                  />
                </div>

                {/* Gender and DOB/Age Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Gender */}
                  <div className="form-group">
                    <label htmlFor="gender" className="block font-bold text-sm mb-1.5 text-neutral-900">
                      Gender: <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      required
                      className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white cursor-pointer"
                    >
                      <option value="" disabled>
                        -- Select Gender --
                      </option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Date of Birth & Computed Age */}
                  <div className="form-group">
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="dob" className="block font-bold text-sm text-neutral-900">
                        Date of Birth: <span className="text-red-600">*</span>
                      </label>
                      {formData.age && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-[#f3f6ee] border border-[#c4cfb5] rounded text-[#3d4a29]">
                          Age: {formData.age} Years
                        </span>
                      )}
                    </div>
                    <input
                      type="date"
                      id="dob"
                      name="dob"
                      value={formData.dob}
                      onChange={handleDobChange}
                      min="1947-01-01"
                      max="2500-12-31"
                      required
                      className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white cursor-pointer"
                    />
                  </div>
                </div>

                {/* PIN Code Lookup & Address Auto-fill */}
                <div className="form-group">
                  <PinCodeAddressSection
                    pincode={formData.pincode}
                    state={formData.state}
                    district={formData.district}
                    postal={formData.postal}
                    address={formData.address}
                    onChangeField={handleAddressFieldChange}
                    onAutoSetPlace={handleAutoSetPlace}
                    notify={showToast}
                  />
                </div>

                {/* Qualification - Dropdown menu (SSLC, PLUS TWO, DEGREE, POST GRADUATION) */}
                <div className="form-group">
                  <label htmlFor="qualification" className="block font-bold text-sm mb-1.5 text-neutral-900">
                    Qualification: <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="qualification"
                      name="qualification"
                      value={formData.qualification}
                      onChange={handleChange}
                      required
                      className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white cursor-pointer appearance-none pr-10 font-medium text-neutral-900"
                    >
                      <option value="" disabled>
                        -- Select Qualification --
                      </option>
                      <option value="SSLC">SSLC</option>
                      <option value="PLUS TWO (+2)">PLUS TWO (+2)</option>
                      <option value="DEGREE">DEGREE</option>
                      <option value="POST GRADUATION">POST GRADUATION</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-600">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Mobile Number (Standard direct input) */}
                <div className="form-group pt-1">
                  <label htmlFor="mobileNo" className="block font-bold text-sm mb-1.5 text-neutral-900">
                    Mobile Number: <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-3 py-2.5 rounded-l-md border border-r-0 border-gray-300 bg-[#f3f6ee] text-[#3b4728] text-sm font-semibold">
                      +91
                    </span>
                    <input
                      type="tel"
                      id="mobileNo"
                      name="mobileNo"
                      maxLength={10}
                      value={formData.mobileNo}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData((prev) => ({ ...prev, mobileNo: digits }));
                      }}
                      placeholder="10-digit mobile number"
                      required
                      className="w-full p-2.5 text-sm border rounded-r-md focus:outline-none bg-white font-mono border-gray-300 focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E]"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="form-group pt-1">
                  <label htmlFor="applicantEmail" className="block font-bold text-sm mb-1.5 text-neutral-900">
                    Email ID: <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    id="applicantEmail"
                    name="email"
                    value={formData.email || currentUser?.email || ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setFormData((prev) => ({ ...prev, email: val }));
                    }}
                    placeholder="name@example.com"
                    required
                    className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Official confirmation and membership details will be sent to this email address.
                  </p>
                </div>

                {/* Declaration & Consent with Mandatory Tick Mark */}
                <div className="my-6 p-4 sm:p-5 bg-neutral-50 border-2 border-neutral-300 rounded-md space-y-3">
                  <div>
                    <strong className="block text-black font-bold uppercase tracking-wide text-xs mb-1.5">
                      DECLARATION &amp; CONSENT
                    </strong>
                    <p className="text-xs sm:text-sm leading-relaxed text-justify text-neutral-800">
                      I hereby declare that the information furnished above is true and correct. I voluntarily
                      consent to become a{' '}
                      <strong className="font-bold text-black">
                        member of the Proposed Banking Agents Trade Union
                      </strong>{' '}
                      and agree to abide by its Constitution, Rules and lawful decisions. I support the
                      objectives of the Union for the unity, welfare and legitimate rights and interests of
                      Banking Agents.
                    </p>
                  </div>

                  {/* Tick mark checkbox for consent */}
                  <label
                    htmlFor="consentAgreed"
                    className={`flex items-start gap-3 p-3 rounded-md border transition-all cursor-pointer select-none ${
                      formData.consentAgreed
                        ? 'bg-[#f3f6ee] border-[#8B9A6E] shadow-2xs'
                        : 'bg-white border-neutral-300 hover:border-[#8B9A6E]'
                    }`}
                  >
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input
                        type="checkbox"
                        id="consentAgreed"
                        name="consentAgreed"
                        checked={formData.consentAgreed}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, consentAgreed: e.target.checked }))
                        }
                        required
                        className="w-5 h-5 text-[#8B9A6E] border-2 border-gray-400 rounded focus:ring-[#8B9A6E] accent-[#8B9A6E] cursor-pointer"
                      />
                    </div>
                    <div className="text-xs sm:text-sm">
                      <span className="font-bold text-neutral-900 block">
                        I agree and provide voluntary consent to become a member <span className="text-red-600">*</span>
                      </span>
                      <span className="text-neutral-500 text-[11px] block mt-0.5">
                        Tick mark this box to confirm your declaration and voluntary union membership consent.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Place and Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-group">
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="place" className="block font-bold text-sm text-neutral-900">
                        Place: <span className="text-red-600">*</span>
                      </label>
                      {formData.place && (
                        <span className="text-[11px] text-[#42502b] bg-[#f0f4eb] px-2 py-0.5 rounded border border-[#c4cfb5] font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#64764b]" />
                          Auto-filled from PIN
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      id="place"
                      name="place"
                      value={formData.place}
                      onChange={handleChange}
                      placeholder="City / Village / District (Auto-filled from PIN)"
                      required
                      className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="date" className="block font-bold text-sm mb-1.5 text-neutral-900">
                      Date: <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      min="1947-01-01"
                      max="2500-12-31"
                      required
                      className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white cursor-pointer"
                    />
                  </div>
                </div>

                {/* Signature Section */}
                <div className="form-group pt-2">
                  <label className="block font-bold text-sm mb-1.5 text-neutral-900">
                    Applicant's Signature: <span className="text-red-600">*</span>
                  </label>
                  <SignaturePad
                    ref={signatureRef}
                    onSignatureChange={() => {}}
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    id="submitBtn"
                    disabled={isSubmitting}
                    className="w-full bg-[#8B9A6E] hover:bg-[#78875c] active:bg-[#66744d] text-white py-3.5 px-6 rounded font-bold text-base uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Submit Application</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </main>

          {/* Footer info */}
          <footer className="max-w-[760px] mx-auto text-center mt-6 text-xs text-gray-500 print:hidden">
            Proposed Banking Agents Trade Union
          </footer>
        </>
      )}
    </div>
  );
}
