export interface BikeDetailModel {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  category: 'Scooter' | 'Bikes' | 'Royal Enfield' | 'Sports';
  dailyRate: number;
  imageUrl: string;
  color: string;
  specs: {
    displacement: string;
    maxPower: string;
    maxTorque: string;
    mileage: string;
    fuelTank: string;
    transmission: string;
    kerbWeight: string;
    seatHeight: string;
    braking: string;
  };
  overview: string;
  whyRent: string[];
  faqs: { question: string; answer: string }[];
  idealFor: string[];
  metaTitle: string;
  metaDescription: string;
}

export const BIKE_DETAILS: Record<string, BikeDetailModel> = {
  'suzuki-burgman': {
    id: 15,
    slug: 'suzuki-burgman',
    name: 'Suzuki Burgman Street 125',
    tagline: 'Maxi-scooter luxury with expansive legroom & relaxed touring ergonomics in Kolkata',
    category: 'Scooter',
    dailyRate: 700,
    imageUrl: '/images/suziki-burgman.jpg',
    color: 'yellow',
    specs: {
      displacement: '124 cc SOHC, 2-Valve Single Cylinder',
      maxPower: '8.7 PS @ 6,750 rpm',
      maxTorque: '10.0 Nm @ 5,500 rpm',
      mileage: '48 - 52 km/L in city conditions',
      fuelTank: '5.5 Litres',
      transmission: 'CVT Automatic',
      kerbWeight: '110 kg',
      seatHeight: '780 mm',
      braking: 'Front Disc, Combined Braking System (CBS)'
    },
    overview: 'The Suzuki Burgman Street 125 brings European maxi-scooter flair to the streets of Kolkata. Featuring wide front bodywork, wind protection, stretched footboard positions, and a glove box with a mobile charging socket, the Burgman is tailor-made for navigating Kolkata’s long stretches across EM Bypass, New Town, and Howrah with supreme ease.',
    whyRent: [
      'Relaxed foot-forward cruiser riding posture reduces fatigue in heavy Kolkata traffic.',
      'Generous 21.5L illuminated under-seat storage fits shopping bags, backpack, or standard helmets.',
      'USB mobile charging port in lockable front glovebox keeps your navigation alive.',
      'Refined Suzuki Eco Performance (SEP) engine yields over 50 kmpl with quiet exhaust note.'
    ],
    faqs: [
      {
        question: 'Can I rent a Suzuki Burgman for airport pickup at Kolkata CCU?',
        answer: 'Yes! We deliver the Suzuki Burgman directly to Netaji Subhash Chandra Bose International Airport (CCU) Terminal 2 for ₹199 doorstep convenience. Book online with your flight details.'
      },
      {
        question: 'What is the security deposit for renting the Suzuki Burgman?',
        answer: 'We collect a flat refundable deposit of ₹1,000 at handover. It is refunded instantly upon returning the scooter in good condition.'
      },
      {
        question: 'Is a helmet included with the Burgman rental?',
        answer: 'Yes, one complimentary ISI-certified safety helmet is provided free with every rental. An extra helmet for a pillion rider can be provided upon request.'
      },
      {
        question: 'Can I take the Burgman to Digha or Mandarmani?',
        answer: 'Yes, our scooters are permitted for outstation journeys across West Bengal with a nominal ₹99/day outstation surcharge. Burgman’s comfortable posture makes it popular for coastal getaways.'
      }
    ],
    idealFor: ['City Commutes', 'Couples Touring', 'Airport/Station Luggage Runs', 'Weekend Beach Trips'],
    metaTitle: 'Suzuki Burgman 125 on Rent in Kolkata - ₹700/day | Rydeit',
    metaDescription: 'Rent Suzuki Burgman Street 125 in Kolkata from ₹700/day. Maxi-scooter comfort, USB charger, free ISI helmet, ₹1,000 refundable deposit. Fast delivery across Kolkata.'
  },

  'honda-activa-125': {
    id: 16,
    slug: 'honda-activa-125',
    name: 'Honda Activa 125',
    tagline: 'India’s most dependable 125cc scooter with all-metal durability & eSP silent start',
    category: 'Scooter',
    dailyRate: 700,
    imageUrl: '/images/honda-activa-125.jpg',
    color: 'black',
    specs: {
      displacement: '124 cc 4-Stroke, PGM-FI eSP Engine',
      maxPower: '8.3 PS @ 6,250 rpm',
      maxTorque: '10.4 Nm @ 5,000 rpm',
      mileage: '50 - 55 km/L tested mileage',
      fuelTank: '5.3 Litres',
      transmission: 'V-Matic Automatic',
      kerbWeight: '109 kg',
      seatHeight: '765 mm',
      braking: 'Combi-Brake System (CBS) with Equalizer'
    },
    overview: 'The Honda Activa 125 is the gold standard for reliable, hassle-free riding in Kolkata. With an all-metal body that shrugs off tight street parking, silent ACG starter motor, and smooth eSP fuel-injected engine, it effortlessly handles lanes from Burrabazar to Salt Lake Sector V.',
    whyRent: [
      'Zero learning curve: completely twist-and-go automatic operation for all riders.',
      'Robust metal bodywork provides superior peace of mind in congested market parking.',
      'Stellar 52+ kmpl fuel economy keeps your Kolkata transit exceptionally affordable.',
      'Low 765 mm seat height makes it comfortable for riders of all heights and experience levels.'
    ],
    faqs: [
      {
        question: 'What documents are required to rent the Honda Activa in Kolkata?',
        answer: 'You only need a valid original Driving License and an Aadhaar Card or Voter ID. We complete paperless online KYC in under 2 minutes.'
      },
      {
        question: 'Is fuel included in the Activa rental rate?',
        answer: 'Vehicles are provided with enough reserve fuel (1-2 litres) to reach the nearest petrol pump. You simply return the scooter with the same fuel level as received.'
      },
      {
        question: 'Can I rent an Activa for delivery gigs (Swiggy, Zomato, Rapido)?',
        answer: 'Yes! Activa 125 is our most popular model for gig delivery partners. We offer special discounted weekly and monthly commercial plans.'
      }
    ],
    idealFor: ['Daily Commuters', 'Gig Delivery Professionals', 'Market Errands', 'Tourists exploring North Kolkata'],
    metaTitle: 'Honda Activa 125 on Rent in Kolkata - ₹700/day | Rydeit',
    metaDescription: 'Rent Honda Activa 125 in Kolkata starting at ₹700/day. Fuel-efficient 52+ kmpl, metal body, free ISI helmet, paperless KYC, and doorstep delivery available.'
  },

  'tvs-jupiter-125': {
    id: 17,
    slug: 'tvs-jupiter-125',
    name: 'TVS Jupiter 125',
    tagline: 'Family comfort champion with 33L storage and front external fuel fill',
    category: 'Scooter',
    dailyRate: 700,
    imageUrl: '/images/tvs-jupiter-125.jpg',
    color: 'orange',
    specs: {
      displacement: '124.8 cc Single Cylinder, 4-Stroke Air-Cooled',
      maxPower: '8.15 PS @ 6,500 rpm',
      maxTorque: '10.5 Nm @ 4,500 rpm',
      mileage: '50 - 53 km/L',
      fuelTank: '5.1 Litres (Front Floorboard Tank)',
      transmission: 'CVT Automatic',
      kerbWeight: '108 kg',
      seatHeight: '765 mm',
      braking: 'Sync Braking Technology (SBT)'
    },
    overview: 'The TVS Jupiter 125 is uniquely engineered for convenience. By moving the fuel tank under the floorboard, TVS created an enormous 33-litre underseat storage cavity capable of storing two full-face helmets or overnight travel luggage. Combined with a long cushioned seat and front fuel nozzle, it is Kolkata’s premier family rental scooter.',
    whyRent: [
      'Massive 33-litre storage bay accommodates two full-face helmets or laptop backpacks.',
      'Front external fuel filler cap means you never have to step off the scooter at the pump.',
      'Plush, extra-long seat ensures ultimate pillion passenger comfort.',
      'Eco-meter light guides you to maximize fuel efficiency through Kolkata gridlock.'
    ],
    faqs: [
      {
        question: 'Does the TVS Jupiter 125 fit a laptop bag under the seat?',
        answer: 'Yes! Because the fuel tank is located under the floorboard, the entire 33-litre underseat bay is flat and easily accommodates standard 15-inch laptop bags or backpacks.'
      },
      {
        question: 'Is doorstep delivery available for the Jupiter 125 in Kolkata?',
        answer: 'Yes, we deliver across Kolkata, Salt Lake, New Town, and Howrah for ₹199 per trip.'
      }
    ],
    idealFor: ['Family Outings', 'Shopping Sprees', 'Office Commuters with Bags', 'Leisure City Rides'],
    metaTitle: 'TVS Jupiter 125 on Rent in Kolkata - ₹700/day | Rydeit',
    metaDescription: 'Rent TVS Jupiter 125 in Kolkata from ₹700/day. Huge 33L under-seat storage, front fuel fill, free ISI helmet, ₹1,000 refundable deposit. Delivered in minutes.'
  },

  'honda-dio-125': {
    id: 18,
    slug: 'honda-dio-125',
    name: 'Honda Dio 125',
    tagline: 'Aggressive street styling with punchy 125cc acceleration for Kolkata youth',
    category: 'Scooter',
    dailyRate: 700,
    imageUrl: '/images/honda-dio-125.jpg',
    color: 'teal',
    specs: {
      displacement: '123.97 cc 4-Stroke, SI Engine with eSP',
      maxPower: '8.28 PS @ 6,250 rpm',
      maxTorque: '10.4 Nm @ 5,000 rpm',
      mileage: '48 - 52 km/L',
      fuelTank: '5.3 Litres',
      transmission: 'Automatic (V-Matic)',
      kerbWeight: '104 kg',
      seatHeight: '765 mm',
      braking: 'Combi-Brake System with Wave Disc'
    },
    overview: 'The Honda Dio 125 is the sportiest automatic scooter in our Kolkata fleet. Featuring an edgy dual-tone body, split LED position lamps, sporty dual-outlet muffler, and lightweight nimble chassis, the Dio 125 darts through dense traffic around Park Street, Gariahat, and College Street with effortless ease.',
    whyRent: [
      'Lightweight 104 kg kerb weight offers razor-sharp agility in tight Kolkata alleyways.',
      'Sporty exhaust note and modern digital instrumentation with real-time fuel readout.',
      'High ground clearance handles Kolkata monsoon waterlogging and uneven tram rails smoothly.',
      'Low deposit of just ₹1,000 and instant digital onboarding.'
    ],
    faqs: [
      {
        question: 'Is Honda Dio 125 suitable for college students and first-time riders?',
        answer: 'Absolutely. It is lightweight, fully automatic, extremely easy to maneuver, and comes with CBS safety braking.'
      }
    ],
    idealFor: ['College Students', 'Young Explorers', 'Cafe Hopping on Park Street', 'Quick City Commutes'],
    metaTitle: 'Honda Dio 125 on Rent in Kolkata - ₹700/day | Rydeit',
    metaDescription: 'Rent Honda Dio 125 in Kolkata starting at ₹700/day. Sporty look, high mileage, free helmet, instant KYC. Home delivery across Kolkata.'
  },

  'ather-450x': {
    id: 19,
    slug: 'ather-450x',
    name: 'Ather 450X Gen 3',
    tagline: 'High-tech performance electric scooter with Warp mode acceleration & touchscreen maps',
    category: 'Scooter',
    dailyRate: 900,
    imageUrl: '/images/ather-450x.jpg',
    color: 'teal',
    specs: {
      displacement: '3.7 kWh Lithium-ion Battery / 6.2 kW PMSM Motor',
      maxPower: '6.2 kW Peak Power, 26 Nm Instant Torque',
      maxTorque: '26 Nm instantaneous torque from 0 RPM',
      mileage: '146 km Certified Range (105 km TrueRange in Eco)',
      fuelTank: 'Electric (Home 5A socket & Ather Grid fast charge)',
      transmission: 'Direct Drive Belt',
      kerbWeight: '111.6 kg',
      seatHeight: '780 mm',
      braking: 'Front & Rear Disc Brakes with Regenerative Braking'
    },
    overview: 'Experience the electric revolution in Kolkata with the Ather 450X Gen 3. Boasting Warp Mode that catapults you from 0 to 40 km/h in just 3.3 seconds, an IP67 water-resistant battery, 7-inch touchscreen dashboard with onboard Google Maps, and zero fuel costs, the Ather 450X is the most futuristic ride in the city.',
    whyRent: [
      'Zero fuel expenditure: charge anywhere using a standard 5A home socket or Kolkata Ather Grid fast chargers.',
      'Instant 26 Nm torque outpaces sports bikes off every traffic light on the EM Bypass.',
      'Onboard 7-inch touchscreen with turn-by-turn navigation eliminates looking at phone mounts.',
      'Silent, green, emission-free ride with regenerative braking.'
    ],
    faqs: [
      {
        question: 'How do I charge the rented Ather 450X?',
        answer: 'We provide a portable 5A home charger with the scooter that plugs into any standard household 3-pin socket (0 to 80% in 4.5 hours). You can also use public Ather Grid fast chargers located throughout Kolkata.'
      },
      {
        question: 'What is the real-world range on a single charge?',
        answer: 'You will achieve approximately 105 km in Eco Mode, 85 km in Ride Mode, and 65 km in Warp Mode on Kolkata roads.'
      }
    ],
    idealFor: ['Tech Enthusiasts', 'Eco-Conscious Commuters', 'New Town / Salt Lake Tech Corridor', 'Quiet City Cruising'],
    metaTitle: 'Ather 450X Electric Scooter on Rent in Kolkata - ₹900/day | Rydeit',
    metaDescription: 'Rent Ather 450X electric scooter in Kolkata from ₹900/day. 0-40 in 3.3s, onboard Google Maps, portable charger included. Zero fuel costs. Delivered in minutes.'
  },

  'hero-xtreme-125r': {
    id: 1,
    slug: 'hero-xtreme-125r',
    name: 'Hero Xtreme 125R',
    tagline: 'Aggressive streetfighter styling, single-channel ABS & 60+ kmpl real-world mileage',
    category: 'Bikes',
    dailyRate: 700,
    imageUrl: '/images/hero-xtreme-125r.jpg',
    color: 'black',
    specs: {
      displacement: '124.7 cc Sprint-EBT Air-Cooled Single Cylinder',
      maxPower: '11.55 PS @ 8,250 rpm',
      maxTorque: '10.5 Nm @ 6,000 rpm',
      mileage: '60 - 66 km/L',
      fuelTank: '10 Litres',
      transmission: '5-Speed Constant Mesh',
      kerbWeight: '136 kg',
      seatHeight: '794 mm',
      braking: 'Single-Channel ABS with 276mm Front Disc'
    },
    overview: 'The Hero Xtreme 125R redefines the 125cc commuter category with full-blown naked streetfighter aesthetics. Equipped with front ABS, beefy 37mm telescopic forks, full LED lighting, and a rev-happy Sprint-EBT engine, it delivers motorcycle thrills while keeping fuel costs under control across Kolkata.',
    whyRent: [
      'Safety-first single-channel ABS prevents front wheel skidding during sudden monsoon braking.',
      'Unrivalled 60+ kmpl mileage stretches your travel budget across Bengal.',
      'Muscular fuel tank extensions and low-slung LED headlamp turn heads everywhere.',
      'Smooth 5-speed gearbox for effortless highway and flyover cruising.'
    ],
    faqs: [
      {
        question: 'Can I rent the Hero Xtreme 125R for weekly rentals?',
        answer: 'Yes! We offer 15% discount for bookings of 7+ days. It is one of the most cost-effective motorcycles in Kolkata.'
      }
    ],
    idealFor: ['Daily Office Goers', 'Cost-Conscious Tourers', 'First-Time Geared Bike Riders', 'Highway Runs on NH-16'],
    metaTitle: 'Hero Xtreme 125R on Rent in Kolkata - ₹700/day | Rydeit',
    metaDescription: 'Rent Hero Xtreme 125R in Kolkata from ₹700/day. 60+ kmpl mileage, single-channel ABS, free ISI helmet, ₹1,000 refundable deposit. Instant booking.'
  },

  'honda-shine-125': {
    id: 3,
    slug: 'honda-shine-125',
    name: 'Honda Shine 125',
    tagline: 'Silky smooth 125cc 5-speed commuter with legendary Japanese reliability',
    category: 'Bikes',
    dailyRate: 700,
    imageUrl: '/images/honda-shine-125.jpg',
    color: 'orange',
    specs: {
      displacement: '123.94 cc 4-Stroke SI Engine with eSP',
      maxPower: '10.74 PS @ 7,500 rpm',
      maxTorque: '11.0 Nm @ 6,000 rpm',
      mileage: '58 - 65 km/L',
      fuelTank: '10.5 Litres',
      transmission: '5-Speed Manual',
      kerbWeight: '114 kg',
      seatHeight: '791 mm',
      braking: 'Combi-Brake System (CBS) with Equalizer'
    },
    overview: 'The Honda Shine 125 is celebrated across India for its vibration-free, butter-smooth engine. Its 5-speed transmission allows relaxed cruising at 60-70 km/h with whisper-quiet operation, making it the most sensible and fatigue-free bike rental for all-day riding throughout Kolkata.',
    whyRent: [
      'Whisper-quiet eSP engine with zero noticeable vibrations even after 8 hours of riding.',
      '5-speed gearbox keeps RPMs relaxed on Vidyasagar Setu and Kona Expressway.',
      'Light 114 kg weight and comfortable upright handlebar relieve back and shoulder strain.',
      'High fuel economy of 60+ kmpl minimizes refuelling stops.'
    ],
    faqs: [
      {
        question: 'What is the deposit and cancellation policy for the Honda Shine?',
        answer: 'We collect ₹1,000 flat deposit. Cancellations made 24 hours prior to pickup receive a 100% full advance refund.'
      }
    ],
    idealFor: ['Business Commuters', 'Inter-City Work Trips', 'Long Shift Deliveries', 'Relaxed Sightseeing'],
    metaTitle: 'Honda Shine 125 on Rent in Kolkata - ₹700/day | Rydeit',
    metaDescription: 'Rent Honda Shine 125 in Kolkata from ₹700/day. Smooth 5-speed ride, 60+ kmpl, free ISI helmet, ₹1,000 refundable deposit. Delivered in minutes.'
  },

  'bajaj-pulsar-150': {
    id: 5,
    slug: 'bajaj-pulsar-150',
    name: 'Bajaj Pulsar 150',
    tagline: 'The iconic wolf-eyed street machine with robust mid-range torque',
    category: 'Bikes',
    dailyRate: 700,
    imageUrl: '/images/bajaj-pulsar-150.jpg',
    color: 'black',
    specs: {
      displacement: '149.5 cc Twin Spark DTS-i FI Engine',
      maxPower: '14.0 PS @ 8,500 rpm',
      maxTorque: '13.25 Nm @ 6,500 rpm',
      mileage: '45 - 50 km/L',
      fuelTank: '15 Litres (Huge 700+ km cruising range)',
      transmission: '5-Speed Manual',
      kerbWeight: '148 kg',
      seatHeight: '785 mm',
      braking: '260mm Front Disc with Single-Channel ABS'
    },
    overview: 'The Bajaj Pulsar 150 is the definitive youth motorcycle that shaped Indian street riding. Powered by Bajaj’s proven DTS-i engine, it delivers punchy acceleration, a reassuring 15-litre fuel tank for long non-stop highway rides, and legendary road presence across Kolkata.',
    whyRent: [
      'Substantial 15-litre tank gives a massive range exceeding 700 km between fill-ups.',
      'Punchy 13.25 Nm mid-range torque makes overtaking buses and lorries effortless.',
      'Iconic wolf-eyed headlamp with twin pilot lamps provides confident night illumination.',
      'Sturdy steel chassis inspires confidence on rough suburban roads.'
    ],
    faqs: [
      {
        question: 'Can I rent a Pulsar 150 for an outstation trip to Shantiniketan or Digha?',
        answer: 'Yes! The Pulsar 150 is one of our most popular rental motorcycles for outstation trips thanks to its comfortable seating and large 15L fuel tank.'
      }
    ],
    idealFor: ['Outstation Road Trips', 'Highway Commuters', 'College Students', 'Pillion Rides'],
    metaTitle: 'Bajaj Pulsar 150 on Rent in Kolkata - ₹700/day | Rydeit',
    metaDescription: 'Rent Bajaj Pulsar 150 in Kolkata at ₹700/day. 15L fuel tank, DTS-i power, free ISI helmet, ₹1,000 refundable deposit. Doorstep delivery available.'
  },

  'tvs-apache-rtr-160': {
    id: 6,
    slug: 'tvs-apache-rtr-160',
    name: 'TVS Apache RTR 160 4V',
    tagline: 'Track-tuned 160cc streetfighter with 4-valve oil-cooled motor & dual ride modes',
    category: 'Bikes',
    dailyRate: 900,
    imageUrl: '/images/tvs-apache-rtr-160.jpg',
    color: 'orange',
    specs: {
      displacement: '159.7 cc Oil-Cooled 4-Valve Single Cylinder',
      maxPower: '17.55 PS @ 9,250 rpm (Sport Mode)',
      maxTorque: '14.73 Nm @ 7,250 rpm',
      mileage: '42 - 46 km/L',
      fuelTank: '12 Litres',
      transmission: '5-Speed with Race-Tuned Slipper Clutch',
      kerbWeight: '146 kg',
      seatHeight: '800 mm',
      braking: 'Single-Channel Super-Moto ABS with Roto-Petal Discs'
    },
    overview: 'Born from TVS Racing heritage, the Apache RTR 160 4V produces a class-leading 17.55 PS of power. With distinct Urban, Rain, and Sport riding modes, Showa-tuned monoshock suspension, and a deep throaty bass exhaust, it is the performance rider’s first choice in Kolkata.',
    whyRent: [
      'Class-leading 17.55 PS power delivers exhilarating flyover launches.',
      'Multiple Ride Modes (Sport / Urban / Rain) adjust ABS and power delivery for wet Kolkata roads.',
      'Glide Through Technology (GTT) prevents stalling during bumper-to-bumper city crawls.',
      'Wave disc brakes and Super-Moto ABS ensure sharp, controlled deceleration.'
    ],
    faqs: [
      {
        question: 'Does the Apache RTR 160 4V have a slipper clutch?',
        answer: 'Yes, it features a race-tuned slipper clutch that prevents rear-wheel hop during aggressive downshifts.'
      }
    ],
    idealFor: ['Performance Commuters', 'Enthusiast Weekend Rides', 'Rainy Season Safe Riding', 'Flyover Sprints'],
    metaTitle: 'TVS Apache RTR 160 4V on Rent in Kolkata - ₹900/day | Rydeit',
    metaDescription: 'Rent TVS Apache RTR 160 4V in Kolkata for ₹900/day. 17.55 PS, ride modes, slipper clutch, free ISI helmet, ₹1,000 deposit. Book online instantly.'
  },

  're-hunter-350': {
    id: 8,
    slug: 're-hunter-350',
    name: 'Royal Enfield Hunter 350',
    tagline: 'Compact urban roadster powered by the legendary 349cc J-series engine',
    category: 'Royal Enfield',
    dailyRate: 1500,
    imageUrl: '/images/re-hunter-350.jpg',
    color: 'teal',
    specs: {
      displacement: '349 cc Single Cylinder, Air-Oil Cooled J-Series',
      maxPower: '20.2 bhp @ 6,100 rpm',
      maxTorque: '27.0 Nm @ 4,000 rpm',
      mileage: '35 - 38 km/L',
      fuelTank: '13 Litres',
      transmission: '5-Speed Constant Mesh',
      kerbWeight: '181 kg (lightest 350cc Royal Enfield)',
      seatHeight: '790 mm (accessible for all riders)',
      braking: 'Dual-Channel ABS with 300mm Front & 270mm Rear Disc'
    },
    overview: 'The Hunter 350 combines iconic Royal Enfield character with compact, nimble geometry. Weighing 14 kg lighter than the Classic 350 and equipped with 17-inch alloy wheels, the Hunter darts through North Kolkata lanes as effortlessly as modern roadsters while delivering the unmistakable low-end thump.',
    whyRent: [
      'Accessible 790 mm seat height and lighter 181 kg weight make it easy for any rider to handle.',
      'Tubeless tyres on 17-inch black alloy wheels ensure stress-free puncture resistance.',
      'Beefy 27 Nm low-end torque pulls strongly from low speeds without frequent gear shifts.',
      'USB mobile charging port located conveniently beneath the handlebar.'
    ],
    faqs: [
      {
        question: 'Is the Hunter 350 easy to ride in Kolkata city traffic?',
        answer: 'Yes! Unlike heavier heritage Enfields, the Hunter features sharper steering geometry and 17-inch wheels, making it remarkably nimble in city traffic.'
      },
      {
        question: 'Can I take the Hunter 350 on the highway to Digha or Mayapur?',
        answer: 'Absolutely. The J-series engine cruises comfortably at 80-90 km/h with negligible vibrations. Outstation travel requires only the standard ₹99/day surcharge.'
      }
    ],
    idealFor: ['Urban Cruising', 'Heritage Kolkata Tours', 'Weekend Road Trips to Digha & Mandarmani', 'First-Time Enfield Riders'],
    metaTitle: 'Royal Enfield Hunter 350 on Rent in Kolkata - ₹1,500/day | Rydeit',
    metaDescription: 'Rent Royal Enfield Hunter 350 in Kolkata from ₹1,500/day. 349cc J-series engine, dual-channel ABS, free ISI helmet, ₹1,000 refundable deposit. Delivered in minutes.'
  },

  're-classic-350': {
    id: 12,
    slug: 're-classic-350',
    name: 'Royal Enfield Classic 350',
    tagline: 'The timeless British retro cruiser with cushioned split seats & signature exhaust thump',
    category: 'Royal Enfield',
    dailyRate: 1600,
    imageUrl: '/images/re-classic-350.jpg',
    color: 'black',
    specs: {
      displacement: '349 cc J-Series Counterbalanced Air-Oil Cooled',
      maxPower: '20.2 bhp @ 6,100 rpm',
      maxTorque: '27.0 Nm @ 4,000 rpm',
      mileage: '34 - 37 km/L',
      fuelTank: '13 Litres',
      transmission: '5-Speed Constant Mesh',
      kerbWeight: '195 kg',
      seatHeight: '805 mm',
      braking: 'Dual-Channel ABS with Front 300mm & Rear 270mm Disc'
    },
    overview: 'The Royal Enfield Classic 350 is Kolkata’s ultimate cruiser motorcycle. Featuring the counterbalanced J-series engine that eliminates harsh vibrations, cushioned spring-saddle split seats, iconic teardrop tank, and unmistakable exhaust note, the Classic 350 is built for romantic evening rides along the Princep Ghat or week-long expeditions across Bengal and the Northeast.',
    whyRent: [
      'Ultra-comfortable sprung split seats provide royal comfort for rider and pillion.',
      'Refined J-series engine cruises at 90 km/h with smooth, vibration-free delivery.',
      'Dual-channel ABS provides confident stopping power under all weather conditions.',
      'Unrivalled heritage presence: the ultimate machine for wedding entries, road trips, and photo shoots.'
    ],
    faqs: [
      {
        question: 'What is the security deposit for renting the Classic 350 in Kolkata?',
        answer: 'Our security deposit is just ₹1,000 (flat across all models). It is refunded immediately at return.'
      },
      {
        question: 'Can I take the Classic 350 to North Bengal, Sikkim, or Bhutan?',
        answer: 'Yes! Long-duration outstation rentals are supported. Please let us know during booking so we can inspect tires and chains for mountain terrain.'
      },
      {
        question: 'Are saddlebags or phone holders available for the Classic 350?',
        answer: 'Yes, we provide heavy-duty mobile phone holders with USB power, and touring luggage straps upon request.'
      }
    ],
    idealFor: ['Highways & Long Tours', 'Couple Getaways', 'Princep Ghat & Red Road Cruising', 'Heritage Photo Shoots'],
    metaTitle: 'Royal Enfield Classic 350 on Rent in Kolkata - ₹1,600/day | Rydeit',
    metaDescription: 'Rent Royal Enfield Classic 350 in Kolkata from ₹1,600/day. J-series engine, dual-channel ABS, free ISI helmet, ₹1,000 refundable deposit. Book online now.'
  },

  'bajaj-pulsar-ns200': {
    id: 9,
    slug: 'bajaj-pulsar-ns200',
    name: 'Bajaj Pulsar NS200',
    tagline: 'High-revving 200cc liquid-cooled streetfighter with perimeter frame & 6-speed gearbox',
    category: 'Sports',
    dailyRate: 1200,
    imageUrl: '/images/bajaj-pulsar-ns200.jpg',
    color: 'orange',
    specs: {
      displacement: '199.5 cc Triple Spark 4-Valve Liquid-Cooled FI',
      maxPower: '24.5 PS @ 9,750 rpm',
      maxTorque: '18.74 Nm @ 8,000 rpm',
      mileage: '35 - 38 km/L',
      fuelTank: '12 Litres',
      transmission: '6-Speed Manual',
      kerbWeight: '158 kg',
      seatHeight: '805 mm',
      braking: 'Dual-Channel ABS with Grimeca Calipers & Petal Discs'
    },
    overview: 'The Bajaj Pulsar NS200 delivers 24.5 PS of pure liquid-cooled naked excitement. Built around a pressed steel perimeter frame with upside-down (USD) front forks and a 6-speed close-ratio transmission, the NS200 devours open highway asphalt and sweeps through corners with pinpoint precision.',
    whyRent: [
      'Raw 24.5 PS output accelerates from 0 to 100 km/h in under 10 seconds.',
      'Liquid-cooling ensures peak engine performance never fades during intense Kolkata summer traffic.',
      'USD front forks and perimeter frame offer track-level stability at triple-digit highway speeds.',
      'Dual-channel ABS with petal discs ensures aggressive, fade-free braking.'
    ],
    faqs: [
      {
        question: 'Is the NS200 comfortable for a pillion rider?',
        answer: 'Yes, the NS200 features a wide stepped seat and robust split grab rails for pillion security.'
      }
    ],
    idealFor: ['Highway Sprints', 'Sport Touring', 'Weekend Enthusiast Rides', 'Durgapur Expressway Runs'],
    metaTitle: 'Bajaj Pulsar NS200 on Rent in Kolkata - ₹1,200/day | Rydeit',
    metaDescription: 'Rent Bajaj Pulsar NS200 in Kolkata for ₹1,200/day. 24.5 PS liquid-cooled engine, 6-speed, USD forks, free helmet, ₹1,000 deposit. Instant booking.'
  },

  'yamaha-r15-v4': {
    id: 10,
    slug: 'yamaha-r15-v4',
    name: 'Yamaha R15 V4',
    tagline: 'Pure track-bred supersport with Variable Valve Actuation (VVA) & aerodynamic fairing',
    category: 'Sports',
    dailyRate: 1800,
    imageUrl: '/images/yamaha-r15-v4.jpg',
    color: 'teal',
    specs: {
      displacement: '155 cc Liquid-Cooled 4-Valve SOHC with VVA',
      maxPower: '18.4 PS @ 10,000 rpm',
      maxTorque: '14.2 Nm @ 7,500 rpm',
      mileage: '40 - 45 km/L',
      fuelTank: '11 Litres',
      transmission: '6-Speed with Assist & Slipper Clutch',
      kerbWeight: '142 kg',
      seatHeight: '815 mm',
      braking: 'Dual-Channel ABS with Traction Control System'
    },
    overview: 'The Yamaha R15 V4 is the most sophisticated sub-200cc motorcycle in India. Powered by Yamaha’s MotoGP-derived 155cc engine with Variable Valve Actuation, inverted gold USD forks, aerodynamically sculpted full fairing, and Traction Control, the R15 V4 offers uncompromising racetrack ergonomics and handling.',
    whyRent: [
      'Variable Valve Actuation (VVA) delivers dual personality: docile in city traffic and explosive above 7,400 RPM.',
      'Assist & Slipper Clutch enables ultra-light clutch lever pulls and seamless downshifts.',
      'Traction Control System (TCS) prevents rear-wheel spin on slippery Kolkata tram tracks and wet asphalt.',
      'Show-stopping supersport looks that turn heads across Park Street and Salt Lake.'
    ],
    faqs: [
      {
        question: 'Does the Yamaha R15 V4 have aggressive track ergonomics?',
        answer: 'Yes, it features clip-on handlebars and rear-set footpegs designed for aerodynamic, dedicated sport riding.'
      }
    ],
    idealFor: ['Sportbike Enthusiasts', 'Track-Style Cornering', 'Aerodynamic Highway Cruising', 'Cinematic Shoots'],
    metaTitle: 'Yamaha R15 V4 on Rent in Kolkata - ₹1,800/day | Rydeit',
    metaDescription: 'Rent Yamaha R15 V4 in Kolkata from ₹1,800/day. MotoGP DNA, VVA, traction control, slipper clutch, free ISI helmet, ₹1,000 refundable deposit.'
  },

  'ktm-duke-390': {
    id: 11,
    slug: 'ktm-duke-390',
    name: 'KTM Duke 390',
    tagline: 'The ultimate 43.5 PS naked street rocket with slipper clutch and cornering thrills',
    category: 'Sports',
    dailyRate: 2200,
    imageUrl: '/images/ktm-duke-390.jpg',
    color: 'orange',
    specs: {
      displacement: '373.2 cc Single Cylinder, 4-Valve Liquid-Cooled DOHC',
      maxPower: '43.5 PS @ 9,000 rpm',
      maxTorque: '37.0 Nm @ 7,000 rpm',
      mileage: '26 - 30 km/L',
      fuelTank: '13.4 Litres',
      transmission: '6-Speed with PASC Slipper Clutch & Quickshifter',
      kerbWeight: '167 kg',
      seatHeight: '820 mm',
      braking: 'Dual-Channel Bosch 9.1MP ABS with Supermoto Mode & 320mm Disc'
    },
    overview: 'The KTM Duke 390 is an adrenaline pump on two wheels. Producing a staggering 43.5 horsepower in a featherweight 167 kg trellis chassis, it boasts WP Apex suspension, ride-by-wire throttle, full-color TFT display, and Supermoto ABS. For riders seeking unmatched acceleration and razor-sharp highway performance from Kolkata, nothing compares.',
    whyRent: [
      'Monstrous 43.5 PS output launches from 0 to 100 km/h in 5.4 seconds.',
      'WP Apex inverted 43mm front forks and rear monoshock provide world-class damping.',
      'Supermoto ABS mode allows rear wheel lock-up for experienced track and stunt riders.',
      'Full-color TFT display with ambient light sensors and Bluetooth connectivity.'
    ],
    faqs: [
      {
        question: 'What riding experience is recommended for the KTM Duke 390?',
        answer: 'Because of its explosive 43.5 PS output and instantaneous throttle response, we recommend the Duke 390 for experienced motorcycle riders who hold a valid geared two-wheeler license.'
      },
      {
        question: 'Can I rent the Duke 390 for long touring to Darjeeling or Kalimpong?',
        answer: 'Yes! The Duke 390 is exceptionally capable of mountain ascents. We perform a complete pre-trip inspection of coolant, brake fluid, and chain tension.'
      }
    ],
    idealFor: ['Experienced Sport Riders', 'Expressway Long Tours', 'Mountain Tours to North Bengal', 'Pure Adrenaline'],
    metaTitle: 'KTM Duke 390 on Rent in Kolkata - ₹2,200/day | Rydeit',
    metaDescription: 'Rent KTM Duke 390 in Kolkata from ₹2,200/day. 43.5 PS corner rocket, quickshifter, slipper clutch, free ISI helmet, ₹1,000 deposit. Instant booking.'
  }
};

export const getBikeSlugById = (id: number): string => {
  const map: Record<number, string> = {
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
  return map[id] || 're-classic-350';
};
