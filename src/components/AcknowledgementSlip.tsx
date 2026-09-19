import React, { useState } from 'react';
import { SubmittedApplication } from '../types';
import {
  CheckCircle2,
  Landmark,
  Copy,
  Check,
  Share2,
  Link as LinkIcon,
  Users,
  UserCheck,
  PlusCircle,
} from 'lucide-react';
import { buildShortReferralUrl, getShortReferralCode } from '../services/referralUtils';

interface AcknowledgementSlipProps {
  application: SubmittedApplication;
  referredApplicants?: SubmittedApplication[];
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNewApplication?: () => void;
}

export const AcknowledgementSlip: React.FC<AcknowledgementSlipProps> = ({
  application,
  referredApplicants = [],
  onNotify,
  onNewApplication,
}) => {
  const [copied, setCopied] = useState(false);

  // Generate clean, short referral URL and short code
  const { url: referralUrl, shortCode } = buildShortReferralUrl(application.applicationId);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referralUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = referralUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      if (onNotify) {
        onNotify('Short referral link copied to clipboard!', 'success');
      }
      setTimeout(() => setCopied(false), 2500);
    } catch {
      if (onNotify) {
        onNotify('Unable to copy automatically. Please copy the link manually.', 'error');
      }
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Join the Proposed Banking Agents Trade Union! Register using my official referral link:\n${referralUrl}\n(Referral Code: ${shortCode})`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Quick Action to Submit Another Application */}
      {onNewApplication && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-[#f3f6ee] border border-[#c4cfb5] rounded-lg print:hidden">
          <div className="text-xs text-[#3b4728]">
            <p className="font-bold text-[12px]">Need to register another member or submit another form?</p>
            <p className="text-[11px] text-[#4d5c36] mt-0.5">
              Multiple applications using the same email or mobile number are fully allowed.
            </p>
          </div>
          <button
            type="button"
            onClick={onNewApplication}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#8B9A6E] hover:bg-[#78875c] active:bg-[#66744d] text-white text-xs font-bold rounded-md transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Another Application</span>
          </button>
        </div>
      )}

      {/* Referral Link & Sharing Card */}
      <div className="bg-white border border-neutral-300 rounded-lg shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#8B9A6E] text-white rounded shadow-xs">
              <LinkIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Your Official Referral Link</h3>
              <p className="text-[11px] text-neutral-500">
                Share this short link to invite fellow banking agents. Referral Code ({shortCode}) is linked automatically.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold bg-[#f3f6ee] text-[#4b5b32] px-2.5 py-1 rounded border border-[#c4cfb5]">
            Code: {shortCode}
          </span>
        </div>

        {/* Link Bar */}
        <div className="mt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 flex items-center bg-neutral-50 border border-neutral-300 rounded px-3 py-2 text-xs font-mono font-medium text-neutral-800 break-all select-all">
            <span className="truncate">{referralUrl}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#8B9A6E] text-white hover:bg-[#78875c] active:bg-[#66744d] text-xs font-bold rounded transition-colors cursor-pointer shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Short Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 text-xs font-bold rounded transition-colors cursor-pointer shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Members Referred by this User */}
        <div className="mt-4 pt-3.5 border-t border-neutral-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-800 inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-neutral-700" />
              Members Referred By You
            </span>
            <span className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
              Total: {referredApplicants.length}
            </span>
          </div>

          {referredApplicants.length > 0 ? (
            <div className="space-y-2 mt-2">
              {referredApplicants.map((referred) => (
                <div
                  key={referred.applicationId}
                  className="flex items-center justify-between p-2.5 bg-neutral-50 border border-neutral-200 rounded text-xs"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-neutral-900">{referred.name}</span>
                      <span className="text-neutral-500 text-[11px] block sm:inline sm:ml-2">
                        {referred.place && `${referred.place}, `}{referred.state}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-neutral-900 bg-white border border-neutral-300 px-2 py-0.5 rounded text-[11px]">
                      {referred.applicationId}
                    </span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      {referred.date || referred.submittedAt?.split(' ')[0]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-neutral-500 italic">
              No members have registered using your referral link yet. Share your link above to build union solidarity!
            </p>
          )}
        </div>
      </div>

      {/* Printable Official Document Slip */}
      <div
        id="printableSlip"
        className="bg-white border-2 border-black p-6 sm:p-8 rounded-lg shadow-sm print:border-none print:shadow-none print:p-0"
      >
        {/* Union Letterhead Header */}
        <div className="text-center border-b-2 border-[#8B9A6E] pb-4 mb-6">
          <div className="inline-flex items-center justify-center p-2.5 rounded-full bg-[#8B9A6E] text-white mb-2 shadow-xs">
            <Landmark className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neutral-900">
            Proposed Banking Agents Trade Union
          </h2>
          <p className="text-xs sm:text-sm font-bold text-[#56643f] uppercase tracking-wider mt-0.5">
            Official Membership Application & Acknowledgment Slip
          </p>
          <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-0.5 bg-[#f3f6ee] border border-[#c4cfb5] rounded text-[11px] font-mono font-bold text-[#3e4a2b]">
            Ref No: {application.applicationId}
          </div>
        </div>

        {/* Status bar */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded text-xs mb-6">
          <div>
            <span className="text-neutral-500 block text-[10px] uppercase font-bold">Submission Date & Time</span>
            <span className="font-semibold text-neutral-900">{application.submittedAt}</span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[10px] uppercase font-bold">Status</span>
            <span className="font-semibold text-[#4e5f35] inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6b7c50]" />
              Submitted & Registered
            </span>
          </div>
        </div>

        {/* Particulars Table */}
        <div className="mb-6 overflow-hidden border border-neutral-300 rounded">
          <div className="bg-[#8B9A6E] text-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider">
            Applicant Particulars
          </div>
          <table className="w-full text-xs text-left border-collapse">
            <tbody>
              <tr className="border-b border-neutral-200">
                <td className="w-1/3 px-3 py-2 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">
                  Full Name
                </td>
                <td className="px-3 py-2 font-semibold text-neutral-900">{application.name}</td>
              </tr>
              <tr className="border-b border-neutral-200">
                <td className="px-3 py-2 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">
                  Father's / Husband's Name
                </td>
                <td className="px-3 py-2 text-neutral-900">{application.fatherName}</td>
              </tr>
              <tr className="border-b border-neutral-200">
                <td className="px-3 py-2 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">
                  Gender
                </td>
                <td className="px-3 py-2 text-neutral-900">{application.gender}</td>
              </tr>
              <tr className="border-b border-neutral-200">
                <td className="px-3 py-2 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">
                  Date of Birth & Age
                </td>
                <td className="px-3 py-2 text-neutral-900">
                  {application.dob} ({application.age} Years)
                </td>
              </tr>
              <tr className="border-b border-neutral-200">
                <td className="px-3 py-2 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">
                  Address
                </td>
                <td className="px-3 py-2 text-neutral-900">{application.address}</td>
              </tr>
              {application.postal && (
                <tr className="border-b border-neutral-200">
                  <td className="px-3 py-2 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">
                    Post Office / Postal
                  </td>
                  <td className="px-3 py-2 text-neutral-900">{application.postal}</td>
                </tr>
              )}
              {(application.district || application.state) && (
                <tr className="border-b border-neutral-200">
                  <td className="px-3 py-2 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">
                    District & State
                  </td>
                  <td className="px-3 py-2 text-neutral-900">
                    {[application.district, application.state].filter(Boolean).join(', ')}
                  </td>
                </tr>
              )}
              {application.pincode && (
                <tr className="border-b border-neutral-200">
                  <td className="px-3 py-2 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">
                    PIN Code
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold text-neutral-900">{application.pincode}</td>
                </tr>
              )}
              <tr className="border-b border-neutral-200">
                <td className="px-3 py-2 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">
                  Qualification
                </td>
                <td className="px-3 py-2 text-neutral-900">{application.qualification}</td>
              </tr>
              <tr className="border-b border-neutral-200">
                <td className="px-3 py-2 font-bold bg-neutral-50 text-neutral-700 border-r border-neutral-200">
                  Mobile Number
                </td>
                <td className="px-3 py-2 font-mono text-neutral-900 font-semibold">
                  +91 {application.mobileNo}
                </td>
              </tr>
              {application.referredBy && (
                <tr>
                  <td className="px-3 py-2 font-bold bg-emerald-50 text-emerald-900 border-r border-neutral-200">
                    Referred By (App Ref)
                  </td>
                  <td className="px-3 py-2 font-mono text-emerald-900 font-bold">
                    {application.referredBy}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Declaration & Consent Box */}
        <div className="bg-neutral-50 border border-neutral-300 rounded p-3.5 mb-6 text-xs text-neutral-800 leading-relaxed text-justify">
          <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-neutral-200">
            <strong className="text-black font-bold uppercase text-[11px]">
              DECLARATION & CONSENT:
            </strong>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Voluntary Consent Ticked & Confirmed
            </span>
          </div>
          I hereby declare that the information furnished above is true and correct. I voluntarily
          consent to become a{' '}
          <strong className="text-black">member of the Proposed Banking Agents Trade Union</strong> and
          agree to abide by its Constitution, Rules and lawful decisions. I support the objectives of
          the Union for the unity, welfare and legitimate rights and interests of Banking Agents.
        </div>

        {/* Signature & Location Section */}
        <div className="grid grid-cols-2 gap-4 items-end pt-3 border-t border-neutral-300">
          <div className="text-xs space-y-1">
            <p>
              <strong className="text-neutral-700">Place:</strong>{' '}
              <span className="font-semibold text-neutral-900">{application.place}</span>
            </p>
            <p>
              <strong className="text-neutral-700">Date:</strong>{' '}
              <span className="font-semibold text-neutral-900">{application.date}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Signature of Applicant
            </span>
            {application.signatureDataUrl ? (
              <div className="inline-block border border-neutral-300 bg-white p-1 rounded">
                <img
                  src={application.signatureDataUrl}
                  alt="Applicant Signature"
                  className="max-h-14 max-w-[160px] object-contain"
                />
              </div>
            ) : (
              <div className="inline-block border border-dashed border-neutral-400 p-3 text-xs italic text-neutral-500">
                (Digitally Confirmed)
              </div>
            )}
          </div>
        </div>

        {/* Official seal & record watermark */}
        <div className="mt-8 pt-3 border-t border-dashed border-neutral-300 text-center text-[10px] text-neutral-500">
          Proposed Banking Agents Trade Union • Official Application Document
        </div>
      </div>
    </div>
  );
};
