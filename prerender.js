import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, 'dist');
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html');

if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error('dist/index.html not found! Run "vite build" first.');
  process.exit(1);
}

const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

// Business constants
const PHONE = '+91 7686022245';
const PHONE_RAW = '+917686022245';
const EMAIL = 'hi.rydeit@gmail.com';
const ADDRESS = '6C, Mohammadan Burial Ground Lane, Kolkata - 700023, West Bengal';

const BIKES = [
  { id: 15, name: 'Suzuki Burgman', category: 'Scooter', rate: 700, desc: 'Powerful, premium 125cc scooter with luxury ride comfort & front glovebox', img: '/images/suziki-burgman.jpg' },
  { id: 16, name: 'Honda Activa 125', category: 'Scooter', rate: 700, desc: 'India’s most trusted 125cc scooter with metal body & silent start', img: '/images/honda-activa-125.jpg' },
  { id: 17, name: 'TVS Jupiter 125', category: 'Scooter', rate: 700, desc: 'Comfortable family scooter with massive 33L under-seat storage', img: '/images/tvs-jupiter-125.jpg' },
  { id: 18, name: 'Honda Dio 125', category: 'Scooter', rate: 700, desc: 'Sporty youth scooter with sharp styling and agile city handling', img: '/images/honda-dio-125.jpg' },
  { id: 19, name: 'Ather 450X', category: 'Scooter', rate: 900, desc: 'Tech-packed premium electric scooter with warp mode acceleration', img: '/images/ather-450x.jpg' },
  { id: 1, name: 'Hero Xtreme 125r', category: 'Bikes', rate: 700, desc: 'Sport-commuter with muscular stance, sprint capability & 60+ kmpl efficiency', img: '/images/hero-xtreme-125r.jpg' },
  { id: 3, name: 'Honda Shine 125', category: 'Bikes', rate: 700, desc: 'Smooth, reliable 125cc 5-speed commuter with refined eSP engine', img: '/images/honda-shine-125.jpg' },
  { id: 5, name: 'Bajaj Pulsar 150', category: 'Bikes', rate: 700, desc: 'Iconic sport-commuter with timeless wolf-eyed styling and punchy torque', img: '/images/bajaj-pulsar-150.jpg' },
  { id: 6, name: 'TVS Apache RTR 160 4V', category: 'Bikes', rate: 900, desc: 'Race-tuned 160cc streetfighter with 4-valve oil-cooled motor & dual riding modes', img: '/images/tvs-apache-rtr-160.jpg' },
  { id: 8, name: 'RE Hunter 350', category: 'Royal Enfield', rate: 1500, desc: 'Compact urban cruiser powered by 349cc J-series engine, agile & stylish', img: '/images/re-hunter-350.jpg' },
  { id: 12, name: 'RE Classic 350', category: 'Royal Enfield', rate: 1600, desc: 'Timeless retro cruiser with signature thump, cushioned split seats & ABS', img: '/images/re-classic-350.jpg' },
  { id: 9, name: 'Bajaj Pulsar NS200', category: 'Sports', rate: 1200, desc: 'Liquid-cooled 200cc naked sports machine with perimeter frame & 6-speed gearbox', img: '/images/bajaj-pulsar-ns200.jpg' },
  { id: 10, name: 'Yamaha R15 V4', category: 'Sports', rate: 1800, desc: 'Track-bred supersport with Variable Valve Actuation (VVA) and aerodynamic fairing', img: '/images/yamaha-r15-v4.jpg' },
  { id: 11, name: 'KTM Duke 390', category: 'Sports', rate: 2200, desc: 'Corner rocket with 43.5 PS output, slipper clutch and trellis chassis', img: '/images/ktm-duke-390.jpg' }
];

const FAQS = [
  { q: 'What documents are required to rent a two-wheeler in Kolkata?', a: 'You must provide a valid original Driving License (Learner License is not permitted) and a Government ID proof (Aadhaar Card, Voter ID, or Passport). Both documents are verified online during booking or at the garage.' },
  { q: 'How much is the security deposit and when is it refunded?', a: 'We collect a flat refundable security deposit of ₹1,000 per two-wheeler. The deposit is refunded immediately upon vehicle return and inspection at the garage via UPI or bank transfer.' },
  { q: 'Are helmets provided with the rental?', a: 'Yes, one complimentary ISI-certified safety helmet is provided free of cost with every bike and scooter rental. An extra helmet for a pillion co-rider is available upon request.' },
  { q: 'Can I take the bike outside Kolkata for outstation trips?', a: 'Yes! Outstation travel to destinations like Digha, Mandarmani, Bakkhali, Mayapur, and Shantiniketan is permitted with a nominal daily outstation surcharge of ₹99/day. Please specify your destination during booking.' },
  { q: 'Is doorstep home delivery and pickup available in Kolkata?', a: 'Yes, we offer doorstep delivery and pickup across Kolkata (including Salt Lake, New Town, Howrah Station, Sealdah Station, Ballygunge, Park Street, and Kolkata Airport) for ₹199 each way.' },
  { q: 'What is the fuel policy for bike and scooter rentals?', a: 'Vehicles are rented without fuel. We provide sufficient fuel to reach the nearest petrol pump (at least 1-2 liters in the tank). You should return the bike with the same fuel level as provided at pickup.' },
  { q: 'Can I add a pillion co-rider to my booking?', a: 'Yes, during booking you can select whether you have a pillion rider. Once your booking is confirmed, the admin verifies pillion details and emergency contacts prior to dispatch for passenger safety and insurance compliance.' },
  { q: 'What happens in case of a mechanical breakdown or puncture?', a: 'All our vehicles are rigorously inspected and serviced with fresh engine oil. In the rare event of a mechanical breakdown within Kolkata city limits, our roadside assistance team will provide on-site support or a replacement machine promptly.' },
  { q: 'What is the minimum age requirement?', a: 'The primary rider must be at least 18 years of age and legally licensed to ride gearless two-wheelers or geared motorcycles in India.' },
  { q: 'Where is the Rydeit garage located in Kolkata?', a: `Our main garage is conveniently located at ${ADDRESS}. We are open daily from 06:00 AM to 10:00 PM for pickups, drop-offs, and test rides.` }
];

const sharedHeader = `
<header class="bg-brand-black/95 border-b border-white/5 py-4 px-4 md:px-8">
  <div class="container mx-auto flex justify-between items-center">
    <a href="/" class="flex flex-col leading-none">
      <span class="font-heading text-2xl md:text-3xl text-white tracking-tighter uppercase">RYDE<span class="text-[#FF5F1F]">IT</span></span>
      <span class="text-[8px] md:text-[9px] font-bold tracking-[0.2em] text-[#38BDF8] uppercase">Premium Rentals Kolkata</span>
    </a>
    <nav class="hidden md:flex items-center space-x-6 text-sm font-semibold">
      <a href="/" class="text-white hover:text-amber-400">Home</a>
      <a href="/bikes" class="text-white hover:text-amber-400">Fleet</a>
      <a href="/scooters" class="text-white hover:text-amber-400">Scooters</a>
      <a href="/motorcycles" class="text-white hover:text-amber-400">Motorcycles</a>
      <a href="/rates" class="text-white hover:text-amber-400">Rates</a>
      <a href="/faqs" class="text-white hover:text-amber-400">FAQs</a>
      <a href="/about" class="text-white hover:text-amber-400">About</a>
      <a href="/contact" class="text-white hover:text-amber-400">Contact</a>
      <a href="/book" class="bg-[#FF5F1F] text-white py-2 px-5 rounded-full uppercase text-xs tracking-wider font-bold hover:bg-amber-400 hover:text-black transition-all">Book Now</a>
    </nav>
    <a href="/book" class="md:hidden bg-[#FF5F1F] text-white py-1.5 px-4 rounded-full uppercase text-xs tracking-wider font-bold">Book</a>
  </div>
</header>
`;

const sharedFooter = `
<footer class="bg-[#0A0A0A] py-12 border-t border-white/5 text-neutral-400 text-xs">
  <div class="container mx-auto px-4 text-center space-y-6">
    <div class="font-heading text-3xl text-white uppercase">RYDE<span class="text-[#FF5F1F]">IT</span></div>
    <p class="font-bold tracking-[0.3em] text-[#38BDF8] uppercase">Kolkata's Premier Bike & Scooter Rental Service</p>
    <nav class="flex flex-wrap justify-center gap-4 md:gap-8 text-neutral-300 font-semibold uppercase text-xs">
      <a href="/" class="hover:text-amber-400">Home</a>
      <a href="/bikes" class="hover:text-amber-400">All Bikes</a>
      <a href="/scooters" class="hover:text-amber-400">Scooters for Rent</a>
      <a href="/motorcycles" class="hover:text-amber-400">Motorcycles & Cruisers</a>
      <a href="/rates" class="hover:text-amber-400">Pricing & Rates</a>
      <a href="/faqs" class="hover:text-amber-400">FAQs</a>
      <a href="/about" class="hover:text-amber-400">About Us</a>
      <a href="/contact" class="hover:text-amber-400">Garage Location</a>
      <a href="/book" class="hover:text-amber-400">Book Online</a>
    </nav>
    <div class="pt-6 border-t border-white/5 text-neutral-500 space-y-1">
      <p>© ${new Date().getFullYear()} Rydeit Rentals. 6C, Mohammadan Burial Ground Lane, Kolkata - 700023, West Bengal.</p>
      <p>Direct Phone: <a href="tel:${PHONE_RAW}" class="text-neutral-400 hover:text-white underline">${PHONE}</a> • Email: <a href="mailto:${EMAIL}" class="text-neutral-400 hover:text-white underline">${EMAIL}</a></p>
    </div>
  </div>
</footer>
`;

// Define page configurations
const pages = [
  {
    path: '/',
    outPath: 'index.html',
    title: 'Rydeit | Bike & Scooter Rentals in Kolkata - From ₹99/hr',
    description: "Kolkata's most reliable bike and scooter rental service. Activa, Burgman, Royal Enfield Classic 350 & Duke 390. Doorstep delivery across Kolkata. Free ISI helmet.",
    canonical: 'https://rydeit.in',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'AutoRental',
      'name': 'Rydeit - Bike & Scooter Rentals in Kolkata',
      'image': 'https://rydeit.in/images/re-hunter-350.jpg',
      'url': 'https://rydeit.in',
      'telephone': PHONE_RAW,
      'email': EMAIL,
      'priceRange': '₹₹',
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': '6C, Mohammadan Burial Ground Lane',
        'addressLocality': 'Kolkata',
        'addressRegion': 'West Bengal',
        'postalCode': '700023',
        'addressCountry': 'IN'
      },
      'geo': {
        '@type': 'GeoCoordinates',
        'latitude': 22.5329,
        'longitude': 88.3193
      },
      'openingHoursSpecification': [{
        '@type': 'OpeningHoursSpecification',
        'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        'opens': '06:00',
        'closes': '22:00'
      }],
      'areaServed': ['Kolkata', 'Salt Lake', 'New Town', 'Howrah', 'Sealdah', 'Park Street', 'Ballygunge']
    },
    content: `
      ${sharedHeader}
      <main class="min-h-screen bg-black text-white">
        <section class="py-20 px-4 text-center max-w-5xl mx-auto space-y-6">
          <span class="text-[#FF5F1F] text-xs font-black uppercase tracking-[0.4em] block">Kolkata's #1 Self-Drive Two-Wheeler Rentals</span>
          <h1 class="text-4xl md:text-7xl font-heading uppercase tracking-tight">Bike &amp; Scooter Rentals in <span class="text-[#FF5F1F]">Kolkata</span></h1>
          <p class="text-base md:text-xl text-neutral-300 max-w-3xl mx-auto leading-relaxed">
            Rent premium, fully serviced bikes and automatic scooters starting at just ₹700/day (hourly from ₹99/hr).
            Enjoy instant paperless KYC, ₹1,000 refundable security deposit, complimentary ISI helmet, and optional doorstep delivery anywhere in Kolkata.
          </p>
          <div class="flex flex-wrap justify-center gap-4 pt-4">
            <a href="/book" class="bg-[#FF5F1F] hover:bg-amber-400 hover:text-black text-white py-4 px-10 rounded-full font-heading text-xs tracking-widest uppercase font-bold shadow-xl transition-all">Book a Ride Online</a>
            <a href="/bikes" class="bg-white/10 hover:bg-white/20 text-white py-4 px-10 rounded-full font-heading text-xs tracking-widest uppercase font-bold transition-all">Explore All Fleet</a>
          </div>
        </section>

        <!-- Fleet Highlights -->
        <section class="py-16 px-4 max-w-7xl mx-auto">
          <div class="text-center mb-12 space-y-2">
            <h2 class="text-3xl md:text-4xl font-heading uppercase">Featured Machines in Kolkata</h2>
            <p class="text-xs uppercase tracking-widest text-neutral-400">Regularly Sanitized • Certified Roadworthy • ISI Helmet Included</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${BIKES.slice(0, 8).map(b => `
              <article class="bg-[#0A0A0A] rounded-2xl overflow-hidden border border-white/5 flex flex-col justify-between">
                <img src="${b.img}" alt="${b.name} rental in Kolkata" class="w-full h-48 object-cover" loading="lazy" />
                <div class="p-5 space-y-3">
                  <div class="flex justify-between items-start">
                    <h3 class="font-heading text-lg font-bold uppercase">${b.name}</h3>
                    <span class="text-amber-400 font-heading text-lg font-bold">₹${b.rate}<span class="text-xs text-neutral-400 font-normal">/day</span></span>
                  </div>
                  <p class="text-xs text-neutral-400">${b.desc}</p>
                  <a href="/book?bikeId=${b.id}" class="block text-center bg-[#FF5F1F] hover:bg-amber-400 hover:text-black text-white py-2.5 rounded-xl font-heading text-xs tracking-wider uppercase font-bold transition-all">Rent ${b.name}</a>
                </div>
              </article>
            `).join('')}
          </div>
          <div class="text-center pt-10">
            <a href="/bikes" class="inline-block text-[#38BDF8] hover:text-amber-400 font-bold uppercase text-xs tracking-widest">View All 14 Fleet Models →</a>
          </div>
        </section>

        <!-- Why Choose Rydeit -->
        <section class="py-16 bg-[#0A0A0A] border-y border-white/5">
          <div class="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div class="space-y-2">
              <div class="text-3xl">⚡</div>
              <h3 class="font-heading text-base font-bold uppercase">Instant Booking</h3>
              <p class="text-xs text-neutral-400">Lock your ride in under 60 seconds with ₹500 advance payment.</p>
            </div>
            <div class="space-y-2">
              <div class="text-3xl">🛡️</div>
              <h3 class="font-heading text-base font-bold uppercase">₹1000 Flat Deposit</h3>
              <p class="text-xs text-neutral-400">Lowest deposit in Kolkata, refunded immediately at vehicle return.</p>
            </div>
            <div class="space-y-2">
              <div class="text-3xl">🚚</div>
              <h3 class="font-heading text-base font-bold uppercase">Doorstep Delivery</h3>
              <p class="text-xs text-neutral-400">Delivered directly to Howrah, Sealdah, Airport, Salt Lake, or hotel.</p>
            </div>
            <div class="space-y-2">
              <div class="text-3xl">🪖</div>
              <h3 class="font-heading text-base font-bold uppercase">Complimentary Helmet</h3>
              <p class="text-xs text-neutral-400">Clean, ISI-certified safety helmets provided with every vehicle.</p>
            </div>
          </div>
        </section>

        <!-- Garage Address & Contact Details -->
        <section class="py-16 px-4 max-w-4xl mx-auto text-center space-y-4">
          <h2 class="text-2xl font-heading uppercase">Visit Our Kolkata Hub</h2>
          <address class="not-italic text-sm text-neutral-300">${ADDRESS}</address>
          <p class="text-xs text-neutral-400">Open Daily from 06:00 AM to 10:00 PM • Phone: <a href="tel:${PHONE_RAW}" class="text-white hover:text-amber-400 font-bold">${PHONE}</a></p>
        </section>
      </main>
      ${sharedFooter}
    `
  },
  {
    path: '/bikes',
    outPath: 'bikes/index.html',
    title: 'Two-Wheeler Rental Fleet in Kolkata - Bikes & Scooters | Rydeit',
    description: 'Explore the full self-drive fleet in Kolkata: Activa, Burgman, Jupiter, Pulsar, Apache 160, RE Classic 350, Hunter 350, Duke 390 & Yamaha R15. Transparent rates from ₹700/day.',
    canonical: 'https://rydeit.in/bikes',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'name': 'Rydeit Two-Wheeler Rental Fleet Kolkata',
      'itemListElement': BIKES.map((b, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'item': {
          '@type': 'Vehicle',
          'name': b.name,
          'description': b.desc,
          'image': `https://rydeit.in${b.img}`,
          'offers': {
            '@type': 'Offer',
            'price': b.rate,
            'priceCurrency': 'INR'
          }
        }
      }))
    },
    content: `
      ${sharedHeader}
      <main class="min-h-screen bg-black text-white py-16 px-4">
        <div class="max-w-7xl mx-auto space-y-12">
          <div class="text-center space-y-3">
            <span class="text-[#FF5F1F] text-xs font-black uppercase tracking-[0.4em] block">Verified Vehicles</span>
            <h1 class="text-4xl md:text-6xl font-heading uppercase">Two-Wheeler Rental Fleet in <span class="text-[#FF5F1F]">Kolkata</span></h1>
            <p class="text-sm text-neutral-400 max-w-2xl mx-auto">From fuel-efficient city scooties to powerful Royal Enfield cruisers and supersports. Check rates and book instantly online.</p>
            <div class="flex flex-wrap justify-center gap-3 pt-4">
              <a href="/scooters" class="px-5 py-2 rounded-full bg-white/10 hover:bg-[#FF5F1F] text-xs font-bold uppercase transition-all">View Scooters (Activa, Burgman, etc.)</a>
              <a href="/motorcycles" class="px-5 py-2 rounded-full bg-white/10 hover:bg-[#FF5F1F] text-xs font-bold uppercase transition-all">View Motorcycles (Royal Enfield, Duke, etc.)</a>
              <a href="/rates" class="px-5 py-2 rounded-full bg-white/10 hover:bg-[#FF5F1F] text-xs font-bold uppercase transition-all">Full Rate Card</a>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${BIKES.map(b => `
              <article class="bg-[#0A0A0A] rounded-2xl overflow-hidden border border-white/5 flex flex-col justify-between shadow-xl">
                <img src="${b.img}" alt="${b.name} rental in Kolkata" class="w-full h-56 object-cover" loading="lazy" />
                <div class="p-6 space-y-4">
                  <div class="flex justify-between items-start">
                    <div>
                      <span class="text-[10px] font-mono text-[#FF5F1F] uppercase font-bold">${b.category}</span>
                      <h2 class="font-heading text-xl font-bold uppercase text-white">${b.name}</h2>
                    </div>
                    <div class="text-right">
                      <span class="text-2xl font-heading text-amber-400 font-extrabold">₹${b.rate}</span>
                      <span class="text-[10px] text-neutral-400 block uppercase font-bold">/ 24 Hours</span>
                    </div>
                  </div>
                  <p class="text-xs text-neutral-400">${b.desc}</p>
                  <a href="/book?bikeId=${b.id}" class="block text-center bg-[#FF5F1F] hover:bg-amber-400 hover:text-black text-white py-3 rounded-xl font-heading text-xs tracking-wider uppercase font-bold transition-all">Book ${b.name}</a>
                </div>
              </article>
            `).join('')}
          </div>
        </div>
      </main>
      ${sharedFooter}
    `
  },
  {
    path: '/scooters',
    outPath: 'scooters/index.html',
    title: 'Scooter Rentals in Kolkata - Honda Activa, Burgman, Jupiter | Rydeit',
    description: 'Rent self-drive scooters in Kolkata starting at ₹700/day. Honda Activa 125, Suzuki Burgman & TVS Jupiter with complimentary helmet, doorstep delivery & instant booking.',
    canonical: 'https://rydeit.in/scooters',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'name': 'Scooter Rentals in Kolkata',
      'itemListElement': BIKES.filter(b => b.category === 'Scooter').map((b, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'item': {
          '@type': 'Vehicle',
          'name': b.name,
          'description': b.desc,
          'image': `https://rydeit.in${b.img}`,
          'offers': { '@type': 'Offer', 'price': b.rate, 'priceCurrency': 'INR' }
        }
      }))
    },
    content: `
      ${sharedHeader}
      <main class="min-h-screen bg-black text-white py-16 px-4">
        <div class="max-w-6xl mx-auto space-y-12">
          <div class="text-center space-y-4">
            <span class="text-[#FF5F1F] text-xs font-black uppercase tracking-[0.4em] block">Effortless City Commuting</span>
            <h1 class="text-4xl md:text-6xl font-heading uppercase">Scooter Rentals in <span class="text-[#FF5F1F]">Kolkata</span></h1>
            <p class="text-sm md:text-base text-neutral-300 max-w-2xl mx-auto">
              Beat Kolkata traffic with gearless automatic scooters. Roomy underseat storage, 45-55 kmpl fuel efficiency, and rates starting at ₹700/day.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${BIKES.filter(b => b.category === 'Scooter').map(s => `
              <article class="bg-[#0A0A0A] rounded-2xl overflow-hidden border border-white/5 flex flex-col justify-between shadow-xl">
                <img src="${s.img}" alt="${s.name} scooter rental in Kolkata" class="w-full h-56 object-cover" loading="lazy" />
                <div class="p-6 space-y-4">
                  <div class="flex justify-between items-start">
                    <h2 class="font-heading text-xl font-bold uppercase text-white">${s.name}</h2>
                    <span class="text-2xl font-heading text-amber-400 font-extrabold">₹${s.rate}<span class="text-xs text-neutral-400 font-normal">/day</span></span>
                  </div>
                  <p class="text-xs text-neutral-400">${s.desc}</p>
                  <a href="/book?bikeId=${s.id}" class="block text-center bg-[#FF5F1F] hover:bg-amber-400 hover:text-black text-white py-3 rounded-xl font-heading text-xs tracking-wider uppercase font-bold transition-all">Rent ${s.name}</a>
                </div>
              </article>
            `).join('')}
          </div>
        </div>
      </main>
      ${sharedFooter}
    `
  },
  {
    path: '/motorcycles',
    outPath: 'motorcycles/index.html',
    title: 'Motorcycle Rentals in Kolkata - Royal Enfield, KTM, Yamaha | Rydeit',
    description: 'Rent self-drive motorcycles in Kolkata. Royal Enfield Classic 350, Hunter 350, KTM Duke 390 & Yamaha R15 V4. Complimentary helmet, outstation permitted & doorstep delivery.',
    canonical: 'https://rydeit.in/motorcycles',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'name': 'Motorcycle Rentals in Kolkata',
      'itemListElement': BIKES.filter(b => b.category !== 'Scooter').map((b, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'item': {
          '@type': 'Vehicle',
          'name': b.name,
          'description': b.desc,
          'image': `https://rydeit.in${b.img}`,
          'offers': { '@type': 'Offer', 'price': b.rate, 'priceCurrency': 'INR' }
        }
      }))
    },
    content: `
      ${sharedHeader}
      <main class="min-h-screen bg-black text-white py-16 px-4">
        <div class="max-w-6xl mx-auto space-y-12">
          <div class="text-center space-y-4">
            <span class="text-[#FF5F1F] text-xs font-black uppercase tracking-[0.4em] block">Cruisers, Sports &amp; Commuters</span>
            <h1 class="text-4xl md:text-6xl font-heading uppercase">Motorcycle Rentals in <span class="text-[#FF5F1F]">Kolkata</span></h1>
            <p class="text-sm md:text-base text-neutral-300 max-w-2xl mx-auto">
              From Royal Enfield Classic 350 cruisers for Digha highway tours to precision cornering on the Yamaha R15 and KTM Duke 390.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${BIKES.filter(b => b.category !== 'Scooter').map(m => `
              <article class="bg-[#0A0A0A] rounded-2xl overflow-hidden border border-white/5 flex flex-col justify-between shadow-xl">
                <img src="${m.img}" alt="${m.name} motorcycle rental in Kolkata" class="w-full h-56 object-cover" loading="lazy" />
                <div class="p-6 space-y-4">
                  <div class="flex justify-between items-start">
                    <div>
                      <span class="text-[10px] font-mono text-[#FF5F1F] uppercase font-bold">${m.category}</span>
                      <h2 class="font-heading text-xl font-bold uppercase text-white">${m.name}</h2>
                    </div>
                    <span class="text-2xl font-heading text-amber-400 font-extrabold">₹${m.rate}<span class="text-xs text-neutral-400 font-normal">/day</span></span>
                  </div>
                  <p class="text-xs text-neutral-400">${m.desc}</p>
                  <a href="/book?bikeId=${m.id}" class="block text-center bg-[#FF5F1F] hover:bg-amber-400 hover:text-black text-white py-3 rounded-xl font-heading text-xs tracking-wider uppercase font-bold transition-all">Rent ${m.name}</a>
                </div>
              </article>
            `).join('')}
          </div>
        </div>
      </main>
      ${sharedFooter}
    `
  },
  {
    path: '/rates',
    outPath: 'rates/index.html',
    title: 'Bike Rental Rates & Pricing in Kolkata - Transparent Rates | Rydeit',
    description: 'Check transparent 24-hour daily, weekly & monthly bike rental rates in Kolkata. Scooters from ₹700/day, Royal Enfield from ₹1,500/day. ₹1,000 flat refundable deposit.',
    canonical: 'https://rydeit.in/rates',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Table',
      'about': 'Rydeit Kolkata Bike and Scooter Rental Pricing Sheet'
    },
    content: `
      ${sharedHeader}
      <main class="min-h-screen bg-black text-white py-16 px-4">
        <div class="max-w-5xl mx-auto space-y-12">
          <div class="text-center space-y-3">
            <span class="text-[#FF5F1F] text-xs font-black uppercase tracking-[0.4em] block">Zero Hidden Fees</span>
            <h1 class="text-4xl md:text-6xl font-heading uppercase">Rental Rates &amp; <span class="text-[#FF5F1F]">Pricing</span></h1>
            <p class="text-sm text-neutral-400">All prices in Indian Rupees (INR). Hourly rates start at ₹99/hr. 24-hour daily billing with instant booking.</p>
          </div>
          <div class="bg-[#0A0A0A] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs md:text-sm">
                <thead class="bg-white/5 uppercase text-neutral-300 font-heading tracking-wider border-b border-white/10">
                  <tr>
                    <th class="p-4 md:p-6">Machine Model</th>
                    <th class="p-4 md:p-6">Category</th>
                    <th class="p-4 md:p-6">Daily (24h)</th>
                    <th class="p-4 md:p-6">Weekly (7 Days)</th>
                    <th class="p-4 md:p-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  ${BIKES.map(b => `
                    <tr class="hover:bg-white/[0.02]">
                      <td class="p-4 md:p-6 font-bold text-white uppercase">${b.name}</td>
                      <td class="p-4 md:p-6 text-neutral-400">${b.category}</td>
                      <td class="p-4 md:p-6 text-amber-400 font-bold">₹${b.rate}</td>
                      <td class="p-4 md:p-6 text-neutral-300">₹${Math.round(b.rate * 6.2)}</td>
                      <td class="p-4 md:p-6 text-right">
                        <a href="/book?bikeId=${b.id}" class="bg-[#FF5F1F] hover:bg-amber-400 hover:text-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider inline-block">Book</a>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0A0A0A] p-6 md:p-8 rounded-2xl border border-white/5 text-xs text-neutral-300">
            <div>
              <h3 class="font-bold text-white uppercase mb-1">Refundable Security Deposit</h3>
              <p class="text-neutral-400">Flat ₹1,000 refundable deposit per bike, refunded on vehicle return.</p>
            </div>
            <div>
              <h3 class="font-bold text-white uppercase mb-1">Doorstep Delivery (Optional)</h3>
              <p class="text-neutral-400">₹199 across Kolkata (including Airport, Howrah, Sealdah, Salt Lake).</p>
            </div>
            <div>
              <h3 class="font-bold text-white uppercase mb-1">Outstation Trips</h3>
              <p class="text-neutral-400">₹99/day outstation surcharge for highway trips outside Kolkata city limits.</p>
            </div>
          </div>
        </div>
      </main>
      ${sharedFooter}
    `
  },
  {
    path: '/faqs',
    outPath: 'faqs/index.html',
    title: 'Frequently Asked Questions - Bike & Scooter Rentals in Kolkata | Rydeit',
    description: 'Got questions about renting a two-wheeler in Kolkata? Find answers on documents required, ₹1,000 security deposit, free helmets, doorstep delivery & outstation trips.',
    canonical: 'https://rydeit.in/faqs',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': FAQS.map(f => ({
        '@type': 'Question',
        'name': f.q,
        'acceptedAnswer': { '@type': 'Answer', 'text': f.a }
      }))
    },
    content: `
      ${sharedHeader}
      <main class="min-h-screen bg-black text-white py-16 px-4">
        <div class="max-w-4xl mx-auto space-y-12">
          <div class="text-center space-y-3">
            <span class="text-[#FF5F1F] text-xs font-black uppercase tracking-[0.4em] block">Got Questions?</span>
            <h1 class="text-4xl md:text-5xl font-heading uppercase">Frequently Asked <span class="text-[#FF5F1F]">Questions</span></h1>
            <p class="text-sm text-neutral-400">Everything you need to know about two-wheeler rentals in Kolkata.</p>
          </div>
          <div class="space-y-4">
            ${FAQS.map(f => `
              <article class="bg-[#0A0A0A] p-6 rounded-2xl border border-white/5 space-y-2">
                <h2 class="text-base font-heading uppercase text-white font-bold">${f.q}</h2>
                <p class="text-xs md:text-sm text-neutral-300 leading-relaxed font-sans">${f.a}</p>
              </article>
            `).join('')}
          </div>
          <div class="text-center pt-8">
            <a href="/book" class="inline-block bg-[#FF5F1F] hover:bg-amber-400 hover:text-black text-white font-heading text-xs tracking-widest uppercase py-4 px-10 rounded-full font-bold shadow-xl transition-all">Book Online Now</a>
          </div>
        </div>
      </main>
      ${sharedFooter}
    `
  },
  {
    path: '/contact',
    outPath: 'contact/index.html',
    title: 'Contact & Garage Location in Kolkata - Rydeit Rentals',
    description: 'Visit Rydeit at 6C, Mohammadan Burial Ground Lane, Kolkata - 700023. Call +91 7686022245 or email hi.rydeit@gmail.com. Open daily 06:00 AM - 10:00 PM.',
    canonical: 'https://rydeit.in/contact',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      'name': 'Rydeit Bike Rentals Kolkata',
      'image': 'https://rydeit.in/images/re-hunter-350.jpg',
      'telephone': PHONE_RAW,
      'email': EMAIL,
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': '6C, Mohammadan Burial Ground Lane',
        'addressLocality': 'Kolkata',
        'addressRegion': 'West Bengal',
        'postalCode': '700023',
        'addressCountry': 'IN'
      },
      'geo': {
        '@type': 'GeoCoordinates',
        'latitude': 22.5329,
        'longitude': 88.3193
      },
      'openingHours': 'Mo-Su 06:00-22:00'
    },
    content: `
      ${sharedHeader}
      <main class="min-h-screen bg-black text-white py-16 px-4">
        <div class="max-w-5xl mx-auto space-y-12">
          <div class="text-center space-y-3">
            <span class="text-[#FF5F1F] text-xs font-black uppercase tracking-[0.4em] block">Connect With Us</span>
            <h1 class="text-4xl md:text-5xl font-heading uppercase">Garage Location &amp; <span class="text-[#FF5F1F]">Contact</span></h1>
            <p class="text-sm text-neutral-400">Reach out for bookings, corporate rentals, or outstation itineraries.</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[#0A0A0A] p-8 md:p-12 rounded-3xl border border-white/5">
            <div class="space-y-6">
              <h2 class="text-2xl font-heading uppercase text-amber-400">Main Garage</h2>
              <div class="space-y-4 text-sm text-neutral-300">
                <p>📍 <strong>Address:</strong><br />${ADDRESS}</p>
                <p>📞 <strong>Phone / WhatsApp:</strong><br /><a href="tel:${PHONE_RAW}" class="text-white hover:text-amber-400 font-bold">${PHONE}</a></p>
                <p>✉️ <strong>Email:</strong><br /><a href="mailto:${EMAIL}" class="text-white hover:text-amber-400 underline">${EMAIL}</a></p>
                <p>🕒 <strong>Hours:</strong><br />Daily: 06:00 AM - 10:00 PM</p>
              </div>
              <div class="pt-4 flex flex-wrap gap-4">
                <a href="https://wa.me/917686022245" class="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider inline-block">WhatsApp Us</a>
                <a href="/book" class="bg-[#FF5F1F] hover:bg-amber-400 hover:text-black text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider inline-block">Book Online</a>
              </div>
            </div>
            <div class="rounded-2xl overflow-hidden min-h-[300px] border border-white/10">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3685.234097644702!2d88.31931617561203!3d22.532901834423534!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a02798825490315%3A0xeac2564de0b1ba3b!2sRydeit%20Bike%20Rentals!5e0!3m2!1sen!2sin!4v1770009032451!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style="border:0; min-height: 320px;"
                allowfullscreen=""
                loading="lazy"
                title="Rydeit Garage Google Map"
              ></iframe>
            </div>
          </div>
        </div>
      </main>
      ${sharedFooter}
    `
  },
  {
    path: '/about',
    outPath: 'about/index.html',
    title: 'About Rydeit - Self-Drive Bike & Scooter Rentals Kolkata',
    description: 'Learn about Rydeit, Kolkata premier self-drive two-wheeler rental company. Certified roadworthy machines, delivery partner support and weekend touring fleets.',
    canonical: 'https://rydeit.in/about',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      'name': 'About Rydeit Bike Rentals Kolkata'
    },
    content: `
      ${sharedHeader}
      <main class="min-h-screen bg-black text-white py-16 px-4">
        <div class="max-w-4xl mx-auto space-y-8">
          <div class="text-center space-y-3">
            <span class="text-[#FF5F1F] text-xs font-black uppercase tracking-[0.4em] block">Our Mission</span>
            <h1 class="text-4xl md:text-5xl font-heading uppercase">About <span class="text-[#FF5F1F]">Rydeit</span></h1>
            <p class="text-sm text-neutral-300 leading-relaxed max-w-2xl mx-auto">
              Kolkata's hub for unlimited self-drive two-wheeler freedom.
            </p>
          </div>
          <div class="bg-[#0A0A0A] p-8 md:p-12 rounded-3xl border border-white/5 space-y-6 text-sm text-neutral-300 leading-relaxed font-sans">
            <p>
              Looking for a dependable ride in the City of Joy? <strong class="text-white">Rydeit</strong> is Kolkata's premier destination for bike and scooter rentals, catering to everyone from adventurous tourists and highway tourers to daily commuters and gig-economy delivery professionals.
            </p>
            <p>
              Whether you need an automatic 125cc scooty like the Honda Activa or Suzuki Burgman for navigating Kolkata's busy streets, or a heavy-duty Royal Enfield Classic 350 or KTM Duke 390 for a weekend road trip to Digha or Shantiniketan, our well-maintained fleet has you covered.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 text-xs">
              <div class="bg-black/40 p-4 rounded-xl border border-white/5">
                <h3 class="font-bold text-[#38BDF8] uppercase mb-1">Daily Commuting</h3>
                <p class="text-neutral-400">Agile scooties and commuters available instantly with doorstep delivery across Kolkata.</p>
              </div>
              <div class="bg-black/40 p-4 rounded-xl border border-white/5">
                <h3 class="font-bold text-[#FF5F1F] uppercase mb-1">Highway Touring</h3>
                <p class="text-neutral-400">Outstation permitted on all cruisers and sports bikes with full safety checkups.</p>
              </div>
            </div>
            <p>
              Located in Kolkata at ${ADDRESS}, we take pride in transparent pricing, zero hidden costs, low ₹1,000 deposits, and complimentary ISI helmets.
            </p>
            <div class="pt-4 text-center">
              <a href="/book" class="inline-block bg-[#FF5F1F] hover:bg-amber-400 hover:text-black text-white font-heading text-xs tracking-widest uppercase py-3.5 px-8 rounded-full font-bold shadow-xl transition-all">Book Your Ride</a>
            </div>
          </div>
        </div>
      </main>
      ${sharedFooter}
    `
  },
  {
    path: '/book',
    outPath: 'book/index.html',
    title: 'Book a Bike or Scooter Online - Instant Confirmation | Rydeit',
    description: 'Reserve your two-wheeler online in Kolkata with Rydeit. Real-time availability, instant price calculation, paperless KYC, and doorstep delivery options.',
    canonical: 'https://rydeit.in/book',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Rydeit Two-Wheeler Online Booking Kolkata'
    },
    content: `
      ${sharedHeader}
      <main class="min-h-screen bg-black text-white py-16 px-4">
        <div class="max-w-4xl mx-auto space-y-8 text-center">
          <span class="text-[#FF5F1F] text-xs font-black uppercase tracking-[0.4em] block">Online Reservation</span>
          <h1 class="text-4xl md:text-5xl font-heading uppercase">Book a Bike or Scooter in <span class="text-[#FF5F1F]">Kolkata</span></h1>
          <p class="text-sm text-neutral-300 max-w-xl mx-auto">
            Select your dates, pick your machine from our fleet, choose doorstep delivery or garage pickup, and confirm your booking securely.
          </p>
          <div class="bg-[#0A0A0A] p-8 rounded-3xl border border-white/5 max-w-xl mx-auto space-y-4 text-left text-xs text-neutral-300">
            <h2 class="text-white font-bold uppercase text-sm">Booking Guidelines:</h2>
            <ul class="space-y-2 list-disc pl-5">
              <li>Original Driving License &amp; Aadhaar Card required at verification.</li>
              <li>Flat ₹1,000 refundable security deposit payable at pickup/delivery.</li>
              <li>Free ISI-certified safety helmet included with every booking.</li>
              <li>Pillion co-rider option available for verified group rides.</li>
            </ul>
            <div class="pt-4">
              <noscript>
                <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
                  JavaScript is required to interact with the real-time booking form. You can also call or WhatsApp us directly at <a href="tel:${PHONE_RAW}" class="underline font-bold text-white">${PHONE}</a> to book immediately.
                </div>
              </noscript>
            </div>
          </div>
        </div>
      </main>
      ${sharedFooter}
    `
  }
];

// Generate static HTML for each page
pages.forEach(page => {
  let html = template;

  // Replace Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${page.title}</title>`);

  // Replace or add Meta Description
  if (html.includes('name="description"')) {
    html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${page.description}" />`);
  } else {
    html = html.replace('</head>', `  <meta name="description" content="${page.description}" />\n</head>`);
  }

  // Replace or add Canonical Link
  if (html.includes('rel="canonical"')) {
    html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, `<link rel="canonical" href="${page.canonical}" />`);
  } else {
    html = html.replace('</head>', `  <link rel="canonical" href="${page.canonical}" />\n</head>`);
  }

  // OpenGraph & Twitter tags
  const ogTags = `
  <meta property="og:title" content="${page.title}" />
  <meta property="og:description" content="${page.description}" />
  <meta property="og:url" content="${page.canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Rydeit Rentals Kolkata" />
  <meta property="og:image" content="https://rydeit.in/images/re-hunter-350.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${page.title}" />
  <meta name="twitter:description" content="${page.description}" />
  <meta name="twitter:image" content="https://rydeit.in/images/re-hunter-350.jpg" />
  <script type="application/ld+json">
${JSON.stringify(page.schema, null, 2)}
  </script>
`;
  html = html.replace('</head>', `${ogTags}\n</head>`);

  // Inject content inside <div id="root">
  html = html.replace('<div id="root" class="min-h-screen bg-black"></div>', `<div id="root" class="min-h-screen bg-black">${page.content}</div>`);

  // Write file
  const targetFile = path.join(DIST_DIR, page.outPath);
  const targetDir = path.dirname(targetFile);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.writeFileSync(targetFile, html, 'utf-8');
  console.log(`Prerendered: ${page.path} -> dist/${page.outPath}`);
});

console.log('All static pages successfully prerendered!');
