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
const PHONE = '+91 7980869336';
const PHONE_RAW = '+917980869336';
const EMAIL = 'hi.rydeit@gmail.com';
const ADDRESS = '6C, Mohammadan Burial Ground Lane, Kolkata - 700023, West Bengal';

const bikeSlugMap = {
  15: 'suzuki-burgman',
  16: 'honda-activa-125',
  17: 'tvs-jupiter-125',
  18: 'honda-dio-125',
  19: 'ather-450x',
  1: 'hero-xtreme-125r',
  3: 'honda-shine-125',
  5: 'bajaj-pulsar-150',
  6: 'tvs-apache-rtr-160',
  8: 're-hunter-350',
  12: 're-classic-350',
  9: 'bajaj-pulsar-ns200',
  10: 'yamaha-r15-v4',
  11: 'ktm-duke-390'
};

const BIKES = [
  { id: 15, name: 'Suzuki Burgman', category: 'Scooter', rate: 700, desc: 'Powerful, premium 125cc scooter with luxury ride comfort & front glovebox', img: '/images/suziki-burgman.jpg', slug: 'suzuki-burgman', power: '8.7 PS', mileage: '50 km/L', transmission: 'Automatic CVT' },
  { id: 16, name: 'Honda Activa 125', category: 'Scooter', rate: 700, desc: 'India’s most trusted 125cc scooter with metal body & silent start', img: '/images/honda-activa-125.jpg', slug: 'honda-activa-125', power: '8.3 PS', mileage: '52 km/L', transmission: 'Automatic CVT' },
  { id: 17, name: 'TVS Jupiter 125', category: 'Scooter', rate: 700, desc: 'Comfortable family scooter with massive 33L under-seat storage', img: '/images/tvs-jupiter-125.jpg', slug: 'tvs-jupiter-125', power: '8.1 PS', mileage: '52 km/L', transmission: 'Automatic CVT' },
  { id: 18, name: 'Honda Dio 125', category: 'Scooter', rate: 700, desc: 'Sporty youth scooter with sharp styling and agile city handling', img: '/images/honda-dio-125.jpg', slug: 'honda-dio-125', power: '8.28 PS', mileage: '50 km/L', transmission: 'Automatic' },
  { id: 19, name: 'Ather 450X', category: 'Scooter', rate: 900, desc: 'Tech-packed premium electric scooter with warp mode acceleration', img: '/images/ather-450x.jpg', slug: 'ather-450x', power: '8.16 PS (Peak)', mileage: '110 km TrueRange', transmission: 'Automatic' },
  { id: 1, name: 'Hero Xtreme 125r', category: 'Bikes', rate: 700, desc: 'Sport-commuter with muscular stance, sprint capability & 60+ kmpl efficiency', img: '/images/hero-xtreme-125r.jpg', slug: 'hero-xtreme-125r', power: '11.55 PS', mileage: '60 km/L', transmission: '5-Speed Manual' },
  { id: 3, name: 'Honda Shine 125', category: 'Bikes', rate: 700, desc: 'Smooth, reliable 125cc 5-speed commuter with refined eSP engine', img: '/images/honda-shine-125.jpg', slug: 'honda-shine-125', power: '10.74 PS', mileage: '62 km/L', transmission: '5-Speed Manual' },
  { id: 5, name: 'Bajaj Pulsar 150', category: 'Bikes', rate: 700, desc: 'Iconic sport-commuter with timeless wolf-eyed styling and punchy torque', img: '/images/bajaj-pulsar-150.jpg', slug: 'bajaj-pulsar-150', power: '14 PS', mileage: '48 km/L', transmission: '5-Speed Manual' },
  { id: 6, name: 'TVS Apache RTR 160 4V', category: 'Bikes', rate: 900, desc: 'Race-tuned 160cc streetfighter with 4-valve oil-cooled motor & dual riding modes', img: '/images/tvs-apache-rtr-160.jpg', slug: 'tvs-apache-rtr-160', power: '17.55 PS', mileage: '45 km/L', transmission: '5-Speed Manual' },
  { id: 8, name: 'RE Hunter 350', category: 'Royal Enfield', rate: 1500, desc: 'Compact urban cruiser powered by 349cc J-series engine, agile & stylish', img: '/images/re-hunter-350.jpg', slug: 're-hunter-350', power: '20.2 PS', mileage: '36 km/L', transmission: '5-Speed Constant Mesh' },
  { id: 12, name: 'RE Classic 350', category: 'Royal Enfield', rate: 1600, desc: 'Timeless retro cruiser with signature thump, cushioned split seats & ABS', img: '/images/re-classic-350.jpg', slug: 're-classic-350', power: '20.2 PS', mileage: '35 km/L', transmission: '5-Speed Manual' },
  { id: 9, name: 'Bajaj Pulsar NS200', category: 'Sports', rate: 1200, desc: 'Liquid-cooled 200cc naked sports machine with perimeter frame & 6-speed gearbox', img: '/images/bajaj-pulsar-ns200.jpg', slug: 'bajaj-pulsar-ns200', power: '24.5 PS', mileage: '38 km/L', transmission: '6-Speed Manual' },
  { id: 10, name: 'Yamaha R15 V4', category: 'Sports', rate: 1800, desc: 'Track-bred supersport with Variable Valve Actuation (VVA) and aerodynamic fairing', img: '/images/yamaha-r15-v4.jpg', slug: 'yamaha-r15-v4', power: '18.4 PS', mileage: '42 km/L', transmission: '6-Speed Assist Clutch' },
  { id: 11, name: 'KTM Duke 390', category: 'Sports', rate: 2200, desc: 'Corner rocket with 43.5 PS output, slipper clutch and trellis chassis', img: '/images/ktm-duke-390.jpg', slug: 'ktm-duke-390', power: '43.5 PS', mileage: '28 km/L', transmission: '6-Speed Quickshifter' }
];

const FAQS = [
  { q: 'What documents are required to rent a two-wheeler in Kolkata?', a: 'You must provide a valid original Driving License (Learner License is not permitted) and a Government ID proof (Aadhaar Card, Voter ID, or Passport). Both documents are verified online during booking or at the garage.' },
  { q: 'How much is the security deposit and when is it refunded?', a: 'We collect a flat refundable security deposit of ₹1,000 per two-wheeler. The deposit is refunded immediately upon vehicle return and inspection at the garage via UPI or bank transfer.' },
  { q: 'Are helmets provided with the rental?', a: 'Yes, one complimentary ISI-certified safety helmet is provided free of cost with every bike and scooter rental. An extra helmet for a pillion co-rider is available upon request.' },
  { q: 'Can I take the bike outside Kolkata for outstation trips?', a: 'Yes! Outstation travel to destinations like Digha, Mandarmani, Bakkhali, Mayapur, and Shantiniketan is permitted with a nominal daily outstation surcharge of ₹99/day. Please specify your destination during booking.' },
  { q: 'Is doorstep home delivery and pickup available in Kolkata?', a: 'Yes, we offer doorstep delivery and pickup across Kolkata (including Salt Lake, New Town, Howrah Station, Sealdah Station, Ballygunge, Park Street, and Kolkata Airport) for ₹199 each way.' },
  { q: 'What is the fuel policy for bike and scooter rentals?', a: 'Vehicles are rented without fuel. We provide sufficient fuel to reach the nearest petrol pump (at least 1-2 liters in the tank). You should return the bike with the same fuel level as provided at pickup.' },
  { q: 'Can I add a pillion co-rider to my booking?', a: 'Yes, during booking you can select whether you have a pillion rider. Once your booking is confirmed, the admin verifies pillion details and emergency contacts prior to dispatch for passenger safety and insurance compliance.' },
  { q: 'What happens in case of a mechanical breakdown or puncture?', a: 'All our vehicles are rigorously inspected and serviced with fresh engine oil. In the rare event of a mechanical breakdown within Kolkata city limits, our roadside assistance team will provide on-site support or a replacement machine within 90 minutes.' },
  { q: 'What is the minimum age requirement?', a: 'The primary rider must be at least 18 years of age and legally licensed to ride gearless two-wheelers or geared motorcycles in India.' },
  { q: 'Where is the Rydeit garage located in Kolkata?', a: `Our main garage is conveniently located at ${ADDRESS}. We are open daily from 06:00 AM to 10:00 PM for pickups, drop-offs, and test rides.` }
];

const sharedHeader = `
<header class="bg-brand-black/95 border-b border-white/5 py-4 px-4 md:px-8">
  <div class="container mx-auto flex justify-between items-center">
    <a href="/" class="flex flex-col leading-none">
      <span class="font-heading text-2xl md:text-3xl text-white tracking-tighter uppercase">RYDE<span class="text-[#FF5F1F]">IT</span></span>
      <span class="text-[8px] md:text-[9px] font-bold tracking-[0.2em] text-[#38BDF8] uppercase">Bike Rentals</span>
    </a>
    <nav class="hidden md:flex items-center space-x-6 text-sm font-semibold">
      <a href="/" class="text-white hover:text-amber-400">Home</a>
      <a href="/bikes" class="text-white hover:text-amber-400">Fleet</a>
      <a href="/scooters" class="text-white hover:text-amber-400">Scooters</a>
      <a href="/motorcycles" class="text-white hover:text-amber-400">Motorcycles</a>
      <a href="/pickup-kolkata" class="text-[#38BDF8] hover:text-white">Airport/Station</a>
      <a href="/outstation-bike-rentals" class="text-amber-400 hover:text-white">Outstation</a>
      <a href="/delivery-bike-rentals" class="text-[#FF5F1F] hover:text-white">Gig Delivery</a>
      <a href="/rates" class="text-white hover:text-amber-400">Rates</a>
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
    <nav class="flex flex-wrap justify-center gap-4 md:gap-6 text-neutral-300 font-semibold uppercase text-xs">
      <a href="/" class="hover:text-amber-400">Home</a>
      <a href="/bikes" class="hover:text-amber-400">All Bikes</a>
      <a href="/scooters" class="hover:text-amber-400">Scooters</a>
      <a href="/motorcycles" class="hover:text-amber-400">Motorcycles</a>
      <a href="/pickup-kolkata" class="text-[#38BDF8] hover:text-white">Airport Pickup</a>
      <a href="/outstation-bike-rentals" class="text-amber-400 hover:text-white">Outstation Guides</a>
      <a href="/delivery-bike-rentals" class="text-[#FF5F1F] hover:text-white">Delivery Rentals</a>
      <a href="/rates" class="hover:text-amber-400">Pricing &amp; Rates</a>
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

// Helper for bike cards in lists linking directly to model pages
const renderBikeCard = (b) => `
  <article class="bg-[#0A0A0A] rounded-2xl overflow-hidden border border-white/5 flex flex-col justify-between shadow-xl">
    <a href="/bikes/${b.slug}" class="block overflow-hidden h-52 relative group">
      <img src="${b.img}" alt="${b.name} on rent in Kolkata" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
      <span class="absolute top-3 right-3 bg-black/60 text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border border-white/10">View Specs →</span>
    </a>
    <div class="p-6 space-y-4">
      <div class="flex justify-between items-start">
        <div>
          <span class="text-[10px] font-mono text-[#FF5F1F] uppercase font-bold">${b.category}</span>
          <h2 class="font-heading text-xl font-bold uppercase text-white">
            <a href="/bikes/${b.slug}" class="hover:text-amber-400 transition-colors">${b.name}</a>
          </h2>
        </div>
        <div class="text-right">
          <span class="text-2xl font-heading text-amber-400 font-extrabold">₹${b.rate}</span>
          <span class="text-[10px] text-neutral-400 block uppercase font-bold">/ 24 Hours</span>
        </div>
      </div>
      <p class="text-xs text-neutral-400">${b.desc}</p>
      <div class="grid grid-cols-2 gap-2 pt-2">
        <a href="/bikes/${b.slug}" class="block text-center bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl font-heading text-xs tracking-wider uppercase font-bold transition-all">Specs &amp; FAQs</a>
        <a href="/book?bikeId=${b.id}" class="block text-center bg-[#FF5F1F] hover:bg-amber-400 hover:text-black text-white py-2.5 rounded-xl font-heading text-xs tracking-wider uppercase font-bold transition-all">Book Online</a>
      </div>
    </div>
  </article>
`;

// Define page configurations
const pages = [
  {
    path: '/',
    outPath: 'index.html',
    title: 'Rydeit | Bike & Scooter Rentals in Kolkata - Starting ₹599/day',
    description: "Rental Bikes. Delivered in minutes. Kolkata's most reliable bike and scooter rental service. Activa, Burgman, Royal Enfield Classic 350 & Duke 390. Starting ₹599/day. Free ISI helmet.",
    canonical: 'https://rydeit.in',
    image: 'https://rydeit.in/images/re-hunter-350.jpg',
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
          <h1 class="text-4xl md:text-7xl font-heading uppercase tracking-tight">Rental Bikes. <br /><span class="text-[#38BDF8]">Delivered in minutes</span></h1>
          <p class="text-base md:text-xl text-neutral-300 max-w-3xl mx-auto leading-relaxed">
            Rent premium, fully serviced bikes and automatic scooters starting at just ₹599/day.
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
            ${BIKES.slice(0, 8).map(renderBikeCard).join('')}
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
              <p class="text-xs text-neutral-400">Lock your ride in under 60 seconds with simple paperless KYC.</p>
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
    description: 'Explore the full self-drive fleet in Kolkata: Activa, Burgman, Jupiter, Pulsar, Apache 160, RE Classic 350, Hunter 350, Duke 390 & Yamaha R15. Transparent rates starting ₹599/day.',
    canonical: 'https://rydeit.in/bikes',
    image: 'https://rydeit.in/images/hero-xtreme-125r.jpg',
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
            <p class="text-sm text-neutral-400 max-w-2xl mx-auto">From fuel-efficient city scooties to powerful Royal Enfield cruisers and supersports. Check individual specs and rates.</p>
            <div class="flex flex-wrap justify-center gap-3 pt-4">
              <a href="/scooters" class="px-5 py-2 rounded-full bg-white/10 hover:bg-[#FF5F1F] text-xs font-bold uppercase transition-all">View Scooters (Activa, Burgman, etc.)</a>
              <a href="/motorcycles" class="px-5 py-2 rounded-full bg-white/10 hover:bg-[#FF5F1F] text-xs font-bold uppercase transition-all">View Motorcycles (Royal Enfield, Duke, etc.)</a>
              <a href="/rates" class="px-5 py-2 rounded-full bg-white/10 hover:bg-[#FF5F1F] text-xs font-bold uppercase transition-all">Full Rate Card</a>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${BIKES.map(renderBikeCard).join('')}
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
    image: 'https://rydeit.in/images/honda-activa-125.jpg',
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
            ${BIKES.filter(b => b.category === 'Scooter').map(renderBikeCard).join('')}
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
    image: 'https://rydeit.in/images/ktm-duke-390.jpg',
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
            ${BIKES.filter(b => b.category !== 'Scooter').map(renderBikeCard).join('')}
          </div>
        </div>
      </main>
      ${sharedFooter}
    `
  },
  {
    path: '/pickup-kolkata',
    outPath: 'pickup-kolkata/index.html',
    title: 'Kolkata Airport & Railway Station Bike Rentals - CCU, Howrah, Sealdah | Rydeit',
    description: 'Rent self-drive bikes & scooters delivered directly to Netaji Subhash Chandra Bose Airport (CCU), Howrah Station, or Sealdah Station. ₹199 doorstep handover, zero waiting.',
    canonical: 'https://rydeit.in/pickup-kolkata',
    image: 'https://rydeit.in/images/suziki-burgman.jpg',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Kolkata Airport & Railway Station Bike Delivery',
      'provider': { '@type': 'AutoRental', 'name': 'Rydeit' }
    },
    content: `
      ${sharedHeader}
      <main class="min-h-screen bg-black text-white py-16 px-4">
        <div class="max-w-5xl mx-auto space-y-12">
          <div class="text-center space-y-4">
            <span class="text-[#38BDF8] text-xs font-black uppercase tracking-[0.4em] block">Transit Hub Delivery</span>
            <h1 class="text-4xl md:text-6xl font-heading uppercase">Airport &amp; Station <span class="text-[#FF5F1F]">Pickup in Kolkata</span></h1>
            <p class="text-sm md:text-base text-neutral-300 max-w-2xl mx-auto">
              Arriving by flight at Kolkata CCU, or train at Howrah or Sealdah? Skip taxi queues and surge fares. We hand over your pre-booked two-wheeler right at your arrival point.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-[#0A0A0A] p-6 rounded-2xl border border-white/5 space-y-3">
              <h2 class="font-heading text-lg text-[#38BDF8] uppercase font-bold">Kolkata Airport (CCU)</h2>
              <p class="text-xs text-neutral-400">Terminal 2 Gate 1 arrival ramp handover. Perfect for arriving executives and tourists heading directly to New Town or Central Kolkata.</p>
            </div>
            <div class="bg-[#0A0A0A] p-6 rounded-2xl border border-white/5 space-y-3">
              <h2 class="font-heading text-lg text-[#FF5F1F] uppercase font-bold">Howrah Station (HWH)</h2>
              <p class="text-xs text-neutral-400">Handover outside the main station complex. Quick access to Vidyasagar Setu (2nd Hooghly Bridge) into South Kolkata.</p>
            </div>
            <div class="bg-[#0A0A0A] p-6 rounded-2xl border border-white/5 space-y-3">
              <h2 class="font-heading text-lg text-amber-400 uppercase font-bold">Sealdah Station (SDAH)</h2>
              <p class="text-xs text-neutral-400">Direct forecourt handover coordinated with your train arrival time. Immediate access to MG Road and EM Bypass.</p>
            </div>
          </div>
          <div class="text-center pt-6">
            <a href="/book" class="inline-block bg-[#FF5F1F] hover:bg-amber-400 hover:text-black text-white font-heading text-xs tracking-widest uppercase py-4 px-10 rounded-full font-bold shadow-xl transition-all">Book Airport/Station Delivery</a>
          </div>
        </div>
      </main>
      ${sharedFooter}
    `
  },
  {
    path: '/outstation-bike-rentals',
    outPath: 'outstation-bike-rentals/index.html',
    title: 'Outstation Bike Rentals from Kolkata - Digha, Mandarmani, Bakkhali, Shantiniketan | Rydeit',
    description: 'Rent highway-ready cruisers & sports bikes for road trips from Kolkata. Royal Enfield Classic 350, Hunter & Duke 390 with ₹99/day outstation pass and 24x7 highway support.',
    canonical: 'https://rydeit.in/outstation-bike-rentals',
    image: 'https://rydeit.in/images/re-classic-350.jpg',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Outstation Bike Rentals from Kolkata',
      'provider': { '@type': 'AutoRental', 'name': 'Rydeit' }
    },
    content: `
      ${sharedHeader}
      <main class="min-h-screen bg-black text-white py-16 px-4">
        <div class="max-w-5xl mx-auto space-y-12">
          <div class="text-center space-y-4">
            <span class="text-amber-400 text-xs font-black uppercase tracking-[0.4em] block">Bengal Highway Road Trips</span>
            <h1 class="text-4xl md:text-6xl font-heading uppercase">Outstation Bike <span class="text-[#FF5F1F]">Rentals from Kolkata</span></h1>
            <p class="text-sm md:text-base text-neutral-300 max-w-2xl mx-auto">
              Plan your weekend road trip with confidence. Fully serviced Royal Enfield cruisers, KTM sports machines, and touring bikes permitted on national highways.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-[#0A0A0A] p-8 rounded-2xl border border-white/5 space-y-3">
              <h2 class="text-xl font-heading uppercase text-white font-bold">Kolkata to Digha (185 km)</h2>
              <p class="text-xs text-neutral-300">4.5 hour scenic ride via NH-16 (Kolaghat) and NH-116B. Two-wheelers enjoy 100% toll tax exemption. Best on Royal Enfield Classic 350.</p>
            </div>
            <div class="bg-[#0A0A0A] p-8 rounded-2xl border border-white/5 space-y-3">
              <h2 class="text-xl font-heading uppercase text-white font-bold">Kolkata to Mandarmani (170 km)</h2>
              <p class="text-xs text-neutral-300">Coastal state highway ride ending in sea breezes and red crab beach resorts. Recommended on Hunter 350 or TVS Apache 160.</p>
            </div>
            <div class="bg-[#0A0A0A] p-8 rounded-2xl border border-white/5 space-y-3">
              <h2 class="text-xl font-heading uppercase text-white font-bold">Kolkata to Bakkhali &amp; Henry’s Island (130 km)</h2>
              <p class="text-xs text-neutral-300">Delta ride via Diamond Harbour Road (NH-12) and the high-span Namkhana Bridge across mangrove waterways.</p>
            </div>
            <div class="bg-[#0A0A0A] p-8 rounded-2xl border border-white/5 space-y-3">
              <h2 class="text-xl font-heading uppercase text-white font-bold">Kolkata to Shantiniketan (165 km)</h2>
              <p class="text-xs text-neutral-300">Fast 4-lane cruising on NH-19 (Durgapur Expressway) with iconic breakfast stops at Shaktigarh for fresh langcha.</p>
            </div>
          </div>
          <div class="text-center pt-6">
            <a href="/bikes" class="inline-block bg-[#FF5F1F] hover:bg-amber-400 hover:text-black text-white font-heading text-xs tracking-widest uppercase py-4 px-10 rounded-full font-bold shadow-xl transition-all">Choose Touring Machine</a>
          </div>
        </div>
      </main>
      ${sharedFooter}
    `
  },
  {
    path: '/delivery-bike-rentals',
    outPath: 'delivery-bike-rentals/index.html',
    title: 'Delivery Bike Rentals in Kolkata - Swiggy, Zomato, Blinkit, Zepto, Rapido | Rydeit',
    description: 'Affordable two-wheeler rentals for delivery executives in Kolkata. Fuel-efficient Honda Activa & Shine 125, free maintenance, ₹1,000 deposit, weekly packages from ₹3,999/week.',
    canonical: 'https://rydeit.in/delivery-bike-rentals',
    image: 'https://rydeit.in/images/honda-shine-125.jpg',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Gig Delivery Bike Rentals Kolkata',
      'provider': { '@type': 'AutoRental', 'name': 'Rydeit' }
    },
    content: `
      ${sharedHeader}
      <main class="min-h-screen bg-black text-white py-16 px-4">
        <div class="max-w-5xl mx-auto space-y-12">
          <div class="text-center space-y-4">
            <span class="text-[#FF5F1F] text-xs font-black uppercase tracking-[0.4em] block">For Delivery Partners</span>
            <h1 class="text-4xl md:text-6xl font-heading uppercase">Delivery Bike <span class="text-[#FF5F1F]">Rentals in Kolkata</span></h1>
            <p class="text-sm md:text-base text-neutral-300 max-w-2xl mx-auto">
              Fuel-efficient scooters and commuters tailored for Swiggy, Zomato, Zepto, Blinkit, and Rapido partners. Free periodic servicing and 90-minute breakdown support included.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-[#0A0A0A] p-6 rounded-2xl border border-white/5 space-y-2">
              <h3 class="font-bold text-white uppercase">55-62 km/L Mileage</h3>
              <p class="text-xs text-neutral-400">Refined Honda eSP engines reduce daily petrol costs so you keep more of your delivery earnings.</p>
            </div>
            <div class="bg-[#0A0A0A] p-6 rounded-2xl border border-white/5 space-y-2">
              <h3 class="font-bold text-white uppercase">90-Min Breakdown Replacement</h3>
              <p class="text-xs text-neutral-400">Never miss incentives. Our mobile mechanic reaches you anywhere in Kolkata or swaps your vehicle.</p>
            </div>
            <div class="bg-[#0A0A0A] p-6 rounded-2xl border border-white/5 space-y-2">
              <h3 class="font-bold text-white uppercase">Zero Maintenance Expense</h3>
              <p class="text-xs text-neutral-400">Oil changes, brake shoe replacements, and tuneups are 100% free at our central Kidderpore garage.</p>
            </div>
          </div>
          <div class="text-center pt-6">
            <a href="/book" class="inline-block bg-[#FF5F1F] hover:bg-amber-400 hover:text-black text-white font-heading text-xs tracking-widest uppercase py-4 px-10 rounded-full font-bold shadow-xl transition-all">Rent for Delivery Shifts</a>
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
    description: 'Check transparent 24-hour daily, weekly & monthly bike rental rates in Kolkata. Scooters starting ₹599/day, Royal Enfield from ₹1,500/day. ₹1,000 flat refundable deposit.',
    canonical: 'https://rydeit.in/rates',
    image: 'https://rydeit.in/images/yamaha-r15-v4.jpg',
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
            <p class="text-sm text-neutral-400">All prices in Indian Rupees (INR). Starting from ₹599/day. 24-hour daily billing with instant booking.</p>
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
                      <td class="p-4 md:p-6 font-bold text-white uppercase"><a href="/bikes/${b.slug}" class="hover:text-amber-400">${b.name}</a></td>
                      <td class="p-4 md:p-6 text-neutral-400">${b.category}</td>
                      <td class="p-4 md:p-6 text-amber-400 font-bold">₹${b.rate}</td>
                      <td class="p-4 md:p-6 text-neutral-300">₹${Math.round(b.rate * 6.2)}</td>
                      <td class="p-4 md:p-6 text-right">
                        <a href="/bikes/${b.slug}" class="bg-[#FF5F1F] hover:bg-amber-400 hover:text-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider inline-block">Specs &amp; Rates</a>
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
    image: 'https://rydeit.in/images/tvs-apache-rtr-160.jpg',
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
    path: '/about',
    outPath: 'about/index.html',
    title: 'About Rydeit - Self-Drive Bike & Scooter Rentals in Kolkata',
    description: 'Learn about Rydeit Kolkata: founded in 2023, our 28-point mechanical servicing, commercial insurance, 90-minute breakdown guarantee, and central Kidderpore garage.',
    canonical: 'https://rydeit.in/about',
    image: 'https://rydeit.in/images/hero-xtreme-125r.jpg',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      'name': 'About Rydeit Rentals Kolkata'
    },
    content: `
      ${sharedHeader}
      <main class="min-h-screen bg-black text-white py-16 px-4">
        <div class="max-w-4xl mx-auto space-y-8">
          <div class="text-center space-y-3">
            <span class="text-[#FF5F1F] text-xs font-black uppercase tracking-[0.4em] block">Our Mission &amp; Standards</span>
            <h1 class="text-4xl md:text-5xl font-heading uppercase">About <span class="text-[#FF5F1F]">Rydeit</span></h1>
            <p class="text-sm text-neutral-300 leading-relaxed max-w-2xl mx-auto">
              Founded in 2023 by motorcycle enthusiasts, Rydeit is Kolkata's premier transparent self-drive two-wheeler rental company.
            </p>
          </div>
          <div class="bg-[#0A0A0A] p-8 md:p-12 rounded-3xl border border-white/5 space-y-6 text-sm text-neutral-300 leading-relaxed font-sans">
            <div>
              <h2 class="text-xl font-heading uppercase text-white font-bold mb-2">Who Runs Rydeit &amp; Our Roots</h2>
              <p>Headquartered at <strong>${ADDRESS}</strong> in Kidderpore, Rydeit is operated by an in-house team of certified mechanics, logistics handlers, and customer support professionals. Since 2023, we have powered over 3,500 journeys across West Bengal.</p>
            </div>
            <div>
              <h2 class="text-xl font-heading uppercase text-white font-bold mb-2">28-Point Mechanical Servicing Process</h2>
              <p>Every two-wheeler passes through our strict 28-point pre-delivery check: Motul engine oil inspection, tyre tread depth verification (&gt;3mm), brake pad caliper checks, electrical battery diagnostics, and chain lubing before customer handover.</p>
            </div>
            <div>
              <h2 class="text-xl font-heading uppercase text-white font-bold mb-2">Insurance &amp; Passenger Safety</h2>
              <p>Every bike is covered by Comprehensive Third-Party Commercial Liability and passenger accidental protection. We provide complimentary ISI-certified safety helmets with each vehicle.</p>
            </div>
            <div>
              <h2 class="text-xl font-heading uppercase text-white font-bold mb-2">90-Minute On-Road Breakdown Policy</h2>
              <p>In the unlikely event of an on-road issue within Kolkata, our mobile mechanic van arrives on-site or replaces your vehicle within 90 minutes. Mechanical repairs carry zero deductible for riders.</p>
            </div>
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
    path: '/contact',
    outPath: 'contact/index.html',
    title: 'Contact & Garage Location in Kolkata | Rydeit',
    description: 'Visit Rydeit at 6C, Mohammadan Burial Ground Lane, Kolkata - 700023. Call +91 7980869336 or email hi.rydeit@gmail.com. Open daily 06:00 AM - 10:00 PM.',
    canonical: 'https://rydeit.in/contact',
    image: 'https://rydeit.in/images/honda-shine-125.jpg',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      'name': 'Rydeit - Bike & Scooter Rentals in Kolkata',
      'image': 'https://rydeit.in/images/honda-shine-125.jpg',
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
                <a href="https://wa.me/917980869336" class="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider inline-block">WhatsApp Us</a>
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
                title="Rydeit Garage Location"
              ></iframe>
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
    image: 'https://rydeit.in/images/re-hunter-350.jpg',
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
          </div>
        </div>
      </main>
      ${sharedFooter}
    `
  }
];

// Add individual 14 bike model pages
BIKES.forEach(b => {
  pages.push({
    path: `/bikes/${b.slug}`,
    outPath: `bikes/${b.slug}/index.html`,
    title: `${b.name} on Rent in Kolkata - Starting ₹${b.rate}/day | Rydeit`,
    description: `Rent ${b.name} in Kolkata starting at ₹${b.rate}/day. ${b.desc}. Free ISI helmet, ₹1,000 flat deposit, instant booking and doorstep delivery across Kolkata.`,
    canonical: `https://rydeit.in/bikes/${b.slug}`,
    image: `https://rydeit.in${b.img}`,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': `${b.name} on Rent in Kolkata`,
      'image': `https://rydeit.in${b.img}`,
      'description': b.desc,
      'brand': { '@type': 'Brand', 'name': 'Rydeit' },
      'offers': {
        '@type': 'Offer',
        'url': `https://rydeit.in/bikes/${b.slug}`,
        'priceCurrency': 'INR',
        'price': b.rate.toString(),
        'availability': 'https://schema.org/InStock',
        'seller': { '@type': 'AutoRental', 'name': 'Rydeit' }
      }
    },
    content: `
      ${sharedHeader}
      <main class="min-h-screen bg-black text-white py-16 px-4">
        <div class="max-w-5xl mx-auto space-y-12">
          <!-- Breadcrumb -->
          <nav class="text-xs uppercase tracking-widest text-neutral-400">
            <a href="/" class="hover:text-amber-400">Home</a> /
            <a href="/bikes" class="hover:text-amber-400">Fleet</a> /
            <span class="text-amber-400 font-bold">${b.name}</span>
          </nav>

          <!-- Top Hero Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-[#0A0A0A] p-8 md:p-12 rounded-3xl border border-white/5 shadow-2xl">
            <div class="rounded-2xl overflow-hidden h-72 sm:h-80 bg-black/40">
              <img src="${b.img}" alt="${b.name} for rent in Kolkata" class="w-full h-full object-cover" />
            </div>
            <div class="space-y-4">
              <span class="text-[#FF5F1F] text-xs font-mono font-bold uppercase tracking-wider block">${b.category}</span>
              <h1 class="text-3xl md:text-5xl font-heading uppercase text-white">${b.name}</h1>
              <p class="text-sm text-neutral-300 font-sans leading-relaxed">${b.desc}</p>
              <div class="flex items-baseline gap-2 pt-2">
                <span class="text-4xl font-heading text-amber-400 font-extrabold">₹${b.rate}</span>
                <span class="text-xs text-neutral-400 font-bold uppercase">/ 24-Hour Day</span>
              </div>
              <div class="pt-4 flex flex-wrap gap-4">
                <a href="/book?bikeId=${b.id}" class="bg-[#FF5F1F] hover:bg-amber-400 hover:text-black text-white font-heading text-xs tracking-widest uppercase py-3.5 px-8 rounded-full font-bold shadow-xl transition-all">Book This ${b.name}</a>
                <a href="tel:${PHONE_RAW}" class="bg-white/10 hover:bg-white/20 text-white font-heading text-xs tracking-widest uppercase py-3.5 px-6 rounded-full font-bold transition-all">Call ${PHONE}</a>
              </div>
            </div>
          </div>

          <!-- Specs Table -->
          <div class="bg-[#0A0A0A] p-8 rounded-3xl border border-white/5 space-y-6">
            <h2 class="text-2xl font-heading uppercase text-white">Technical Specifications</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-sans">
              <div class="bg-black/50 p-4 rounded-xl border border-white/5">
                <span class="text-neutral-400 block mb-1">Max Power</span>
                <strong class="text-white text-sm">${b.power}</strong>
              </div>
              <div class="bg-black/50 p-4 rounded-xl border border-white/5">
                <span class="text-neutral-400 block mb-1">Fuel Economy / Range</span>
                <strong class="text-white text-sm">${b.mileage}</strong>
              </div>
              <div class="bg-black/50 p-4 rounded-xl border border-white/5">
                <span class="text-neutral-400 block mb-1">Transmission</span>
                <strong class="text-white text-sm">${b.transmission}</strong>
              </div>
            </div>
          </div>

          <!-- FAQs -->
          <div class="bg-[#0A0A0A] p-8 rounded-3xl border border-white/5 space-y-6">
            <h2 class="text-2xl font-heading uppercase text-white">Frequently Asked Questions</h2>
            <div class="space-y-4 text-xs text-neutral-300">
              <article class="space-y-1">
                <h3 class="font-bold text-white uppercase text-sm">How do I rent the ${b.name} in Kolkata?</h3>
                <p>Book online by selecting your pickup date and duration. Upload your original Driving License and Aadhaar card for instant KYC approval.</p>
              </article>
              <article class="space-y-1">
                <h3 class="font-bold text-white uppercase text-sm">What is the security deposit for ${b.name}?</h3>
                <p>We collect a flat ₹1,000 refundable security deposit, returned instantly upon vehicle return and inspection.</p>
              </article>
            </div>
          </div>
        </div>
      </main>
      ${sharedFooter}
    `
  });
});

// Generate static HTML for each page
pages.forEach(page => {
  let html = template;

  // Replace Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${page.title}</title>`);

  // Replace Meta Description
  if (html.includes('name="description"')) {
    html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${page.description}" />`);
  } else {
    html = html.replace('</head>', `  <meta name="description" content="${page.description}" />\n</head>`);
  }

  // Replace Canonical Link
  if (html.includes('rel="canonical"')) {
    html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, `<link rel="canonical" href="${page.canonical}" />`);
  } else {
    html = html.replace('</head>', `  <link rel="canonical" href="${page.canonical}" />\n</head>`);
  }

  // Strip existing og and twitter tags to prevent duplicates
  html = html.replace(/<meta\s+property="og:[^>]*\/?>/gi, '');
  html = html.replace(/<meta\s+name="twitter:[^>]*\/?>/gi, '');
  html = html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');

  // OpenGraph & Twitter tags with per-page image
  const pageImage = page.image || 'https://rydeit.in/images/re-hunter-350.jpg';
  const ogTags = `
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${page.title}" />
  <meta property="og:description" content="${page.description}" />
  <meta property="og:url" content="${page.canonical}" />
  <meta property="og:site_name" content="Rydeit" />
  <meta property="og:image" content="${pageImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${page.title}" />
  <meta name="twitter:description" content="${page.description}" />
  <meta name="twitter:image" content="${pageImage}" />
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
