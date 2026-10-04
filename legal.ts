
import type { LegalContent } from './types';

export const PRIVACY_POLICY: LegalContent = {
  title: 'Privacy Policy',
  content: `
    <div class="space-y-6 font-sans text-brand-gray-light text-sm leading-relaxed">
      <section>
        <h3 class="text-lg font-bold text-brand-yellow uppercase mb-2">1. Overview</h3>
        <p>At Rydeit Rentals, we are committed to protecting your personal information and your right to privacy. This policy outlines how we handle your data when you use our website and rental services.</p>
      </section>

      <section>
        <h3 class="text-lg font-bold text-brand-yellow uppercase mb-2">2. Information We Collect</h3>
        <ul class="list-disc pl-5 space-y-2">
          <li><strong>Personal Identification:</strong> Name, Email, WhatsApp number, and address provided during booking.</li>
          <li><strong>Verification Documents:</strong> Images of Driving Licenses and Government IDs required for legal compliance and insurance.</li>
          <li><strong>Booking History:</strong> Details of your previous rides, preferences, and payment records.</li>
          <li><strong>Technical Data:</strong> IP addresses, browser types, and usage patterns collected via cookies for site optimization.</li>
        </ul>
      </section>

      <section>
        <h3 class="text-lg font-bold text-brand-yellow uppercase mb-2">3. How We Use Your Data</h3>
        <p>Your information is used exclusively to:</p>
        <ul class="list-disc pl-5 space-y-1">
          <li>Process and verify your rental requests.</li>
          <li>Communicate ride updates and emergency information.</li>
          <li>Prevent fraudulent activities and unauthorized use of vehicles.</li>
          <li>Improve our fleet management and customer service experience.</li>
        </ul>
      </section>

      <section>
        <h3 class="text-lg font-bold text-brand-yellow uppercase mb-2">4. Data Security</h3>
        <p>We implement industry-standard security measures to safeguard your personal information against unauthorized access, alteration, or disclosure. Your sensitive documents are encrypted and accessible only to authorized personnel during the verification window.</p>
      </section>

      <section>
        <h3 class="text-lg font-bold text-brand-yellow uppercase mb-2">5. Third-Party Sharing</h3>
        <p>We do not sell or rent your personal data to third parties. Information is only shared with law enforcement agencies if required by Indian law or in the event of an accident/legal dispute involving the rented vehicle.</p>
      </section>
    </div>
  `
};

export const REFUND_POLICY: LegalContent = {
    title: 'Refund & Cancellation Policy',
    content: `
      <div class="space-y-6 font-sans text-brand-gray-light text-sm leading-relaxed">
        <section>
          <h3 class="text-lg font-bold text-brand-yellow uppercase mb-2">1. Cancellation by Rider</h3>
          <p>Refunds on the advance booking amount are processed based on the timing of the cancellation request relative to the scheduled pickup:</p>
          <div class="bg-brand-black/40 rounded-xl overflow-hidden border border-white/5 mt-4">
            <table class="w-full text-left text-[11px] uppercase tracking-wider">
              <thead class="bg-brand-gray-dark/50 text-brand-teal">
                <tr>
                  <th class="p-4">Time Window</th>
                  <th class="p-4">Refund %</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                <tr>
                  <td class="p-4">More than 48 hours before</td>
                  <td class="p-4 font-bold text-green-400">100% Refund</td>
                </tr>
                <tr>
                  <td class="p-4">36 to 48 hours before</td>
                  <td class="p-4">75% Refund</td>
                </tr>
                <tr>
                  <td class="p-4">24 to 36 hours before</td>
                  <td class="p-4">50% Refund</td>
                </tr>
                <tr>
                  <td class="p-4">12 to 24 hours before</td>
                  <td class="p-4">25% Refund</td>
                </tr>
                <tr>
                  <td class="p-4">Less than 12 hours before</td>
                  <td class="p-4 font-bold text-brand-orange">No Refund</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 class="text-lg font-bold text-brand-yellow uppercase mb-2">2. Cancellation by Rydeit</h3>
          <p>In the rare event that Rydeit Rentals must cancel your booking due to vehicle maintenance issues or unforeseen circumstances, a <strong>100% Full Refund</strong> will be issued immediately to your original payment method.</p>
        </section>

        <section>
          <h3 class="text-lg font-bold text-brand-yellow uppercase mb-2">3. No-Show Policy</h3>
          <p>If the rider fails to arrive within 2 hours of the scheduled pickup time without prior communication, the booking will be treated as a "No-Show," and the advance payment will be forfeited in full.</p>
        </section>
      </div>
    `
};

export const TERMS_AND_CONDITIONS: LegalContent = {
    title: 'Terms & Conditions',
    content: `
      <div class="space-y-6 font-sans text-brand-gray-light text-sm leading-relaxed">
        <section>
          <h3 class="text-lg font-bold text-brand-yellow uppercase mb-2">🕒 1) Operating Hours & Surcharges</h3>
          <p>Standard operating hours are <strong>06:00 AM to 10:00 PM</strong>.</p>
          <ul class="list-disc pl-5 space-y-1">
            <li><strong>Early Pickup/Late Drop:</strong> Pickups or drops outside of 08:00 AM to 08:00 PM incur a convenience fee of ₹99.</li>
            <li><strong>Late Return Penalty:</strong> Any vehicle returned after the scheduled drop time will incur a late fee of <strong>₹120 per hour</strong>.</li>
          </ul>
          <p class="mt-2">Riders must strictly adhere to the scheduled return time to avoid cascading delays for subsequent bookings.</p>
        </section>

        <section>
          <h3 class="text-lg font-bold text-brand-yellow uppercase mb-2">🛠️ 2) Service & Breakdown Limits</h3>
          <p>Rydeit provides mechanical support and fixing services <strong>only within a 5 KM radius</strong> of our main garage. For breakdowns beyond this limit:</p>
          <ul class="list-disc pl-5 space-y-1">
            <li>The rider is responsible for transporting the vehicle back to the garage or an authorized service center at their own expense.</li>
            <li>Rydeit is not liable for towing charges, hotel stays, or logistics outside the 5 KM zone.</li>
          </ul>
        </section>

        <section>
          <h3 class="text-lg font-bold text-brand-yellow uppercase mb-2">⚠️ 3) Damages & Security Deposit</h3>
          <p>A <strong>Refundable Security Deposit</strong> (Standard: ₹1000) is mandatory for all rides.</p>
          <ul class="list-disc pl-5 space-y-1">
            <li><strong>Damage Forfeiture:</strong> If the vehicle is returned with any new physical or mechanical damage, the deposit is forfeited immediately.</li>
            <li><strong>Excess Liability:</strong> If repair costs exceed the deposit amount, the rider is legally obligated to pay the full repair estimate provided by an authorized workshop.</li>
            <li><strong>Inspection:</strong> Riders must record a walk-around video of the vehicle at the time of pickup; claims of pre-existing damage without video proof will not be entertained.</li>
          </ul>
        </section>

        <section>
          <h3 class="text-lg font-bold text-brand-yellow uppercase mb-2">⚖️ 4) Liability & Legal Compliance</h3>
          <p>• <strong>No Liability:</strong> Rydeit Rentals is not liable for any accidents, injuries, or fatalities involving the rider, pillion, or third parties.</p>
          <p>• <strong>Challans:</strong> Any traffic fines or e-challans generated during the rental duration are the sole responsibility of the rider.</p>
          <p>• <strong>Illegal Use:</strong> Using the vehicle for racing, commercial delivery, or transport of illegal substances is strictly prohibited and will result in immediate termination of the contract without refund.</p>
        </section>
        
        <div class="mt-4 p-4 bg-brand-black/40 border border-brand-orange/20 rounded-xl">
          <p class="text-[10px] font-black text-brand-orange uppercase tracking-widest text-center">By confirming your booking, you agree to bear 100% responsibility for the vehicle and your personal safety.</p>
        </div>
      </div>
    `
};
