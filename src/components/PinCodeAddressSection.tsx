import React, { useState, useEffect } from 'react';
import { MapPin, Search, Loader2, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';

export interface PostOfficeDetail {
  Name: string;
  BranchType: string;
  DeliveryStatus: string;
  District: string;
  State: string;
  Pincode: string;
}

interface PinCodeAddressSectionProps {
  pincode: string;
  state: string;
  district: string;
  postal: string;
  address: string;
  onChangeField: (field: 'pincode' | 'state' | 'district' | 'postal' | 'address', value: string) => void;
  onAutoSetPlace?: (place: string) => void;
  notify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Built-in postal prefix lookup for instant response & offline resiliency
const PIN_PREFIX_MAP: Record<string, { state: string; district: string; place: string }> = {
  // Kerala
  '682': { state: 'Kerala', district: 'Ernakulam', place: 'Kochi' },
  '695': { state: 'Kerala', district: 'Thiruvananthapuram', place: 'Thiruvananthapuram' },
  '673': { state: 'Kerala', district: 'Kozhikode', place: 'Kozhikode' },
  '680': { state: 'Kerala', district: 'Thrissur', place: 'Thrissur' },
  '686': { state: 'Kerala', district: 'Kottayam', place: 'Kottayam' },
  '670': { state: 'Kerala', district: 'Kannur', place: 'Kannur' },
  '678': { state: 'Kerala', district: 'Palakkad', place: 'Palakkad' },
  '691': { state: 'Kerala', district: 'Kollam', place: 'Kollam' },
  '689': { state: 'Kerala', district: 'Pathanamthitta', place: 'Pathanamthitta' },
  '688': { state: 'Kerala', district: 'Alappuzha', place: 'Alappuzha' },
  '685': { state: 'Kerala', district: 'Idukki', place: 'Painavu' },
  '676': { state: 'Kerala', district: 'Malappuram', place: 'Malappuram' },
  '671': { state: 'Kerala', district: 'Kasaragod', place: 'Kasaragod' },
  '679': { state: 'Kerala', district: 'Palakkad', place: 'Ottapalam' },
  '683': { state: 'Kerala', district: 'Ernakulam', place: 'Aluva' },
  '690': { state: 'Kerala', district: 'Alappuzha', place: 'Kayamkulam' },
  // Major Metros & States
  '110': { state: 'Delhi', district: 'New Delhi', place: 'New Delhi' },
  '400': { state: 'Maharashtra', district: 'Mumbai', place: 'Mumbai' },
  '411': { state: 'Maharashtra', district: 'Pune', place: 'Pune' },
  '560': { state: 'Karnataka', district: 'Bengaluru', place: 'Bengaluru' },
  '600': { state: 'Tamil Nadu', district: 'Chennai', place: 'Chennai' },
  '641': { state: 'Tamil Nadu', district: 'Coimbatore', place: 'Coimbatore' },
  '625': { state: 'Tamil Nadu', district: 'Madurai', place: 'Madurai' },
  '500': { state: 'Telangana', district: 'Hyderabad', place: 'Hyderabad' },
  '530': { state: 'Andhra Pradesh', district: 'Visakhapatnam', place: 'Visakhapatnam' },
  '700': { state: 'West Bengal', district: 'Kolkata', place: 'Kolkata' },
  '226': { state: 'Uttar Pradesh', district: 'Lucknow', place: 'Lucknow' },
  '201': { state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', place: 'Noida' },
  '380': { state: 'Gujarat', district: 'Ahmedabad', place: 'Ahmedabad' },
  '302': { state: 'Rajasthan', district: 'Jaipur', place: 'Jaipur' },
  '160': { state: 'Chandigarh', district: 'Chandigarh', place: 'Chandigarh' },
  '800': { state: 'Bihar', district: 'Patna', place: 'Patna' },
  '751': { state: 'Odisha', district: 'Khurda', place: 'Bhubaneswar' },
  '781': { state: 'Assam', district: 'Kamrup', place: 'Guwahati' },
  '452': { state: 'Madhya Pradesh', district: 'Indore', place: 'Indore' },
};

export const PinCodeAddressSection: React.FC<PinCodeAddressSectionProps> = ({
  pincode,
  state,
  district,
  postal,
  address,
  onChangeField,
  onAutoSetPlace,
  notify,
}) => {
  const [loading, setLoading] = useState(false);
  const [postOffices, setPostOffices] = useState<PostOfficeDetail[]>([]);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'success' | 'not_found' | 'error'>('idle');
  const [lastFetchedPin, setLastFetchedPin] = useState('');

  // Auto fetch when 6 numeric digits are entered
  useEffect(() => {
    const cleanPin = pincode.replace(/\D/g, '');
    if (cleanPin.length === 6 && cleanPin !== lastFetchedPin) {
      // Instant prefix match for immediate UI response
      const prefix = cleanPin.slice(0, 3);
      if (PIN_PREFIX_MAP[prefix]) {
        const quick = PIN_PREFIX_MAP[prefix];
        if (!state) onChangeField('state', quick.state);
        if (!district) onChangeField('district', quick.district);
        if (onAutoSetPlace) {
          onAutoSetPlace(quick.place);
        }
      }

      fetchPincodeData(cleanPin);
    } else if (cleanPin.length < 6) {
      setFetchStatus('idle');
      setPostOffices([]);
    }
  }, [pincode]);

  const fetchPincodeData = async (pinToFetch: string) => {
    setLoading(true);
    setFetchStatus('idle');

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pinToFetch}`);
      if (!response.ok) {
        throw new Error('Network error');
      }

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0 && data[0].Status === 'Success' && Array.isArray(data[0].PostOffice) && data[0].PostOffice.length > 0) {
        const offices: PostOfficeDetail[] = data[0].PostOffice;
        setPostOffices(offices);
        setFetchStatus('success');
        setLastFetchedPin(pinToFetch);

        const primaryOffice = offices[0];
        const fetchedState = primaryOffice.State || '';
        const fetchedDistrict = primaryOffice.District || '';
        const fetchedPostal = primaryOffice.Name || '';
        const resolvedPlace = fetchedDistrict || fetchedPostal;

        onChangeField('state', fetchedState);
        onChangeField('district', fetchedDistrict);
        onChangeField('postal', fetchedPostal);

        // Auto-fill place whenever PIN code data is retrieved
        if (onAutoSetPlace) {
          onAutoSetPlace(resolvedPlace);
        }

        if (notify) {
          notify(`Auto-filled Place (${resolvedPlace}), ${fetchedDistrict}, ${fetchedState} from PIN`, 'success');
        }
      } else {
        // Check if prefix map had a fallback
        const prefix = pinToFetch.slice(0, 3);
        if (PIN_PREFIX_MAP[prefix]) {
          const quick = PIN_PREFIX_MAP[prefix];
          onChangeField('state', quick.state);
          onChangeField('district', quick.district);
          if (onAutoSetPlace) {
            onAutoSetPlace(quick.place);
          }
          setFetchStatus('success');
          if (notify) {
            notify(`Auto-filled Place (${quick.place}) for PIN ${pinToFetch}`, 'success');
          }
        } else {
          setFetchStatus('not_found');
          setPostOffices([]);
          if (notify) {
            notify(`PIN code ${pinToFetch} not found in Postal Directory. Please enter details manually.`, 'error');
          }
        }
      }
    } catch {
      // Fallback on network error
      const prefix = pinToFetch.slice(0, 3);
      if (PIN_PREFIX_MAP[prefix]) {
        const quick = PIN_PREFIX_MAP[prefix];
        onChangeField('state', quick.state);
        onChangeField('district', quick.district);
        if (onAutoSetPlace) {
          onAutoSetPlace(quick.place);
        }
        setFetchStatus('success');
        if (notify) {
          notify(`Auto-filled Place (${quick.place}) from PIN prefix`, 'info');
        }
      } else {
        setFetchStatus('error');
        setPostOffices([]);
        if (notify) {
          notify('Could not reach postal service. Please enter place and address manually.', 'error');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    onChangeField('pincode', val);
  };

  const handlePostalSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    onChangeField('postal', selectedName);
    if (onAutoSetPlace) {
      onAutoSetPlace(selectedName || district);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-neutral-50/70 border border-neutral-300 rounded-md">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#8B9A6E]" />
          <span className="font-bold text-sm text-neutral-900 uppercase tracking-tight">
            Address & Postal Location
          </span>
        </div>
        <span className="text-[11px] text-neutral-500 font-medium">
          Auto-fills State, District & Postal from PIN
        </span>
      </div>

      {/* PIN Code Lookup Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        <div className="sm:col-span-5">
          <label htmlFor="pincode" className="block font-bold text-xs mb-1 text-neutral-900">
            PIN Code: <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="pincode"
              name="pincode"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={handlePincodeChange}
              placeholder="e.g. 682001 or 110001"
              required
              className="w-full p-2.5 pr-10 text-sm font-mono tracking-widest border border-gray-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              {loading ? (
                <Loader2 className="w-4 h-4 text-neutral-600 animate-spin" />
              ) : fetchStatus === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Search className="w-4 h-4 text-neutral-400" />
              )}
            </div>
          </div>
        </div>

        <div className="sm:col-span-7 flex items-center gap-2">
          <button
            type="button"
            disabled={loading || pincode.length !== 6}
            onClick={() => fetchPincodeData(pincode)}
            className="px-3.5 py-2.5 bg-[#8B9A6E] hover:bg-[#78875c] active:bg-[#66744d] text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Fetch Location</span>
              </>
            )}
          </button>

          {/* Inline fetch status feedback */}
          <div className="text-xs flex-1">
            {fetchStatus === 'success' && (
              <span className="text-[#4b5b32] font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#697a4e]" />
                <span>Location Auto-Filled</span>
              </span>
            )}
            {fetchStatus === 'not_found' && (
              <span className="text-amber-700 font-medium inline-flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>PIN not found. Enter below manually.</span>
              </span>
            )}
            {fetchStatus === 'idle' && pincode.length < 6 && (
              <span className="text-neutral-500 text-[11px]">Enter 6 digits to auto-fetch</span>
            )}
          </div>
        </div>
      </div>

      {/* Auto-filled Location Details: State, District, Postal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* State */}
        <div>
          <label htmlFor="state" className="block font-bold text-xs mb-1 text-neutral-900">
            State: <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="state"
            name="state"
            value={state}
            onChange={(e) => onChangeField('state', e.target.value)}
            placeholder="Auto-filled State"
            required
            className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white font-medium"
          />
        </div>

        {/* District */}
        <div>
          <label htmlFor="district" className="block font-bold text-xs mb-1 text-neutral-900">
            District: <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="district"
            name="district"
            value={district}
            onChange={(e) => onChangeField('district', e.target.value)}
            placeholder="Auto-filled District"
            required
            className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white font-medium"
          />
        </div>

        {/* Postal / Post Office */}
        <div>
          <label htmlFor="postal" className="block font-bold text-xs mb-1 text-neutral-900">
            Postal / Post Office: <span className="text-red-600">*</span>
          </label>
          {postOffices.length > 1 ? (
            <select
              id="postal"
              name="postal"
              value={postal}
              onChange={handlePostalSelect}
              required
              className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white font-medium cursor-pointer"
            >
              {postOffices.map((po, idx) => (
                <option key={`${po.Name}-${idx}`} value={po.Name}>
                  {po.Name} ({po.BranchType})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              id="postal"
              name="postal"
              value={postal}
              onChange={(e) => onChangeField('postal', e.target.value)}
              placeholder="Auto-filled Post Office"
              required
              className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white font-medium"
            />
          )}
        </div>
      </div>

      {/* House / Street / Premises Address */}
      <div>
        <label htmlFor="address" className="block font-bold text-xs mb-1 text-neutral-900">
          House / Kiosk / Street / Landmark Address: <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          id="address"
          name="address"
          value={address}
          onChange={(e) => onChangeField('address', e.target.value)}
          placeholder="e.g. Shop No. 12, Main Road, Near SBI Branch"
          required
          className="w-full p-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-[#8B9A6E] focus:ring-1 focus:ring-[#8B9A6E] bg-white"
        />
      </div>

      {/* Complete Address preview if fields are populated */}
      {(address || postal || district || state || pincode) && (
        <div className="text-[11px] text-neutral-600 bg-white p-2.5 rounded border border-neutral-200 flex items-start gap-2">
          <Building2 className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-neutral-800">Complete Address: </span>
            <span>
              {[address, postal ? `P.O. ${postal}` : '', district, state, pincode ? `PIN: ${pincode}` : '']
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
