/**
 * AutoPath Mock Routes Data Store
 * 
 * Provides development mock route data matching the backend database schema.
 * Contains high-fidelity road-following geometry coordinates along actual Kolkata roads,
 * start stop, destination stop, and ordered intermediate stops.
 */

export const routesData = [
  {
    id: 'ruby-gariahat',
    code: 'AK-14',
    codeAlt: 'AUTO #RB-GH-01',
    name: 'Ruby More ⇄ Gariahat',
    subtitle: 'Via Acropolis, Kasba & Bijan Setu Overbridge',
    bengaliName: 'রুবি মোড় ⇄ গড়িয়াহাট',
    bengaliSubtitle: 'রুবি মোড় ⇄ কসবা ⇄ বিজন সেতু ⇄ গড়িয়াহাট মোড় (সরাসরি রুট)',
    hindiName: 'रूबी मोड़ ⇄ गड़ियाहाট',
    originStandId: 'ruby-more',
    destinationStandId: 'gariahat',
    startStop: {
      id: 'stop-ruby',
      name: 'Ruby More (Origin Stand)',
      bengaliName: 'রুবি মোড় (প্রারম্ভিক স্ট্যান্ড)',
      coordinates: [22.5134, 88.3995],
      isStand: true,
      subtext: 'EM Bypass Jn.'
    },
    destinationStop: {
      id: 'stop-gariahat',
      name: 'Gariahat Crossing (Terminus)',
      bengaliName: 'গড়িয়াহাট ক্রসিং (টার্মিনাস)',
      coordinates: [22.5190, 88.3645],
      isStand: true,
      subtext: 'Transfer to Kalighat Auto & Tram Depot'
    },
    fareRange: '₹12 - ₹15',
    fareFixed: '₹16.00 Fixed',
    govtShareFare: '₹16 - ₹18 Govt Share Fare',
    fareType: 'Per Seat Share',
    distance: '~4.2 km',
    distanceKm: 4.2,
    estTravel: '15-20m',
    estTravelMin: 18,
    queueFreq: '2-4 min',
    isDirect: true,
    isRecommended: true,
    status: 'Active Queue Now',
    routeType: 'direct', // 'direct' | 'connecting' | 'branch'
    category: 'High Frequency: 2-3 min interval',
    notes: 'High frequency bay with continuous rolling dispatch along the Rashbehari connector.',
    // Detailed road-following coordinates along Rashbehari Connector and Bijan Setu
    pathCoordinates: [
      [22.51340, 88.39950], // Ruby More Roundabout
      [22.51345, 88.39880],
      [22.51355, 88.39760],
      [22.51375, 88.39630],
      [22.51410, 88.39490],
      [22.51450, 88.39320],
      [22.51480, 88.39210],
      [22.51500, 88.39100], // Acropolis Mall / Rajdanga
      [22.51520, 88.38980],
      [22.51545, 88.38820],
      [22.51570, 88.38680],
      [22.51580, 88.38600], // Bosepukur Junction
      [22.51600, 88.38480],
      [22.51625, 88.38350],
      [22.51650, 88.38200], // Kasba Old Police Station
      [22.51675, 88.38070],
      [22.51705, 88.37940],
      [22.51735, 88.37800], // Rathtala / Bijan Setu Ramp
      [22.51765, 88.37670],
      [22.51810, 88.37520],
      [22.51850, 88.37350], // Bijan Setu Overbridge
      [22.51885, 88.37190],
      [22.51920, 88.37030],
      [22.51950, 88.36850], // Ballygunge Station (South) / Ekdalia
      [22.51945, 88.36720],
      [22.51930, 88.36580],
      [22.51900, 88.36450]  // Gariahat Crossing Terminus
    ],
    stops: [
      {
        id: 'stop-ruby',
        name: 'Ruby More (Origin Stand)',
        bengaliName: 'রুবি মোড় (প্রারম্ভিক স্ট্যান্ড)',
        order: 1,
        distance: '0.0 km',
        distKm: 0.0,
        badge: 'Sheltered Queue Shed',
        subtext: 'EM Bypass Jn.',
        isStand: true,
        coordinates: [22.5134, 88.3995]
      },
      {
        id: 'stop-acropolis',
        name: 'Acropolis Mall / Rajdanga',
        bengaliName: 'অ্যাক্রোপলিস মল / রাজডাঙ্গা',
        order: 2,
        distance: '1.1 km',
        distKm: 1.1,
        badge: 'High Boarding',
        subtext: 'Rajdanga Main Rd',
        isStand: false,
        coordinates: [22.5150, 88.3910]
      },
      {
        id: 'stop-kasba',
        name: 'Kasba Old Police Station',
        bengaliName: 'কসবা পুরাতন থানা মোড়',
        order: 3,
        distance: '2.3 km',
        distKm: 2.3,
        badge: null,
        subtext: 'Bosepukur Connector',
        isStand: false,
        coordinates: [22.5165, 88.3820]
      },
      {
        id: 'stop-bijansetu',
        name: 'Bijan Setu (Overbridge Entry)',
        bengaliName: 'বিজন সেতু (উড়ালপুল প্রবেশ)',
        order: 4,
        distance: '3.1 km',
        distKm: 3.1,
        badge: 'Peak Congestion Area',
        subtext: 'Ballygunge-Kasba Viaduct',
        isStand: false,
        coordinates: [22.5185, 88.3735]
      },
      {
        id: 'stop-ballygunge-stn',
        name: 'Ballygunge Railway Stn (South)',
        bengaliName: 'বালিগঞ্জ রেল স্টেশন (দক্ষিণ)',
        order: 5,
        distance: '3.7 km',
        distKm: 3.7,
        badge: 'Suburban Rail Transfer',
        badgeIcon: 'train',
        subtext: 'Direct footbridge to Sealdah EMU trains',
        isStand: false,
        coordinates: [22.5195, 88.3685]
      },
      {
        id: 'stop-gariahat',
        name: 'Gariahat Crossing (Terminus)',
        bengaliName: 'গড়িয়াহাট ক্রসিং (টার্মিনাস)',
        order: 6,
        distance: '4.2 km',
        distKm: 4.2,
        badge: 'Rashbehari Ave Stand',
        subtext: 'Transfer to Kalighat Auto & Tram Depot',
        isStand: true,
        coordinates: [22.5190, 88.3645]
      }
    ]
  },
  {
    id: 'ruby-jadavpur',
    code: 'R-02',
    codeAlt: 'AUTO #RB-JD-02',
    name: 'Ruby More ⇄ Jadavpur 8B',
    subtitle: 'Via Kalikapur, Santoshpur Bypass & Sukanta Setu',
    bengaliName: 'রুবি মোড় ⇄ যাদবপুর ৮বি',
    bengaliSubtitle: 'রুবি মোড় ⇄ যাদবপুর ৮বি বাস স্ট্যান্ড',
    hindiName: 'रूबी मोड़ ⇄ जादवपुर 8बी',
    originStandId: 'ruby-more',
    destinationStandId: 'jadavpur-8b',
    startStop: {
      id: 'rj-1',
      name: 'Ruby More',
      bengaliName: 'রুবি মোড়',
      coordinates: [22.5134, 88.3995],
      isStand: true
    },
    destinationStop: {
      id: 'rj-5',
      name: 'Jadavpur 8B Terminal',
      bengaliName: 'যাদবপুর ৮বি টার্মিনাল',
      coordinates: [22.4988, 88.3712],
      isStand: true
    },
    fareRange: '₹15 Fixed',
    fareFixed: '₹15.00 Fixed',
    govtShareFare: '₹15 Fixed Union Fare',
    fareType: 'Fixed Rate',
    distance: '~3.8 km',
    distanceKm: 3.8,
    estTravel: '15m',
    estTravelMin: 15,
    queueFreq: 'Every 3 mins',
    isDirect: true,
    status: 'Every 3 mins',
    routeType: 'direct',
    category: 'Connects JU Campus',
    notes: 'Direct corridor connecting EM Bypass to Jadavpur University Central Gate.',
    pathCoordinates: [
      [22.51340, 88.39950], // Ruby More
      [22.51180, 88.39910],
      [22.50990, 88.39820],
      [22.50800, 88.39700], // Kalikapur
      [22.50650, 88.39520],
      [22.50480, 88.39300],
      [22.50300, 88.39000], // Santoshpur Bypass
      [22.50180, 88.38650],
      [22.50060, 88.38320],
      [22.49950, 88.38000], // Sukanta Setu
      [22.49910, 88.37680],
      [22.49890, 88.37400],
      [22.49880, 88.37120]  // Jadavpur 8B
    ],
    stops: [
      { id: 'rj-1', name: 'Ruby More', bengaliName: 'রুবি মোড়', order: 1, distance: '0.0 km', distKm: 0, coordinates: [22.5134, 88.3995], isStand: true },
      { id: 'rj-2', name: 'Kalikapur Crossing', bengaliName: 'কালিকাপুর', order: 2, distance: '1.2 km', distKm: 1.2, coordinates: [22.5080, 88.3970], isStand: false },
      { id: 'rj-3', name: 'Santoshpur Bypass', bengaliName: 'সন্তোষপুর বাইপাস', order: 3, distance: '2.1 km', distKm: 2.1, coordinates: [22.5030, 88.3900], isStand: false },
      { id: 'rj-4', name: 'Sukanta Setu', bengaliName: 'সুকান্ত সেতু', order: 4, distance: '3.0 km', distKm: 3.0, coordinates: [22.4995, 88.3800], isStand: false },
      { id: 'rj-5', name: 'Jadavpur 8B Terminal', bengaliName: 'যাদবপুর ৮বি টার্মিনাল', order: 5, distance: '3.8 km', distKm: 3.8, coordinates: [22.4988, 88.3712], isStand: true }
    ]
  },
  {
    id: 'ruby-garia',
    code: 'R-03',
    codeAlt: 'AUTO #RB-GM-03',
    name: 'Ruby More ⇄ Garia (Kavi Nazrul)',
    subtitle: 'Via Singhabadi, Mukundapur & Ajoy Nagar',
    bengaliName: 'রুবি মোড় ⇄ গড়িয়া (কবি নজরুল)',
    bengaliSubtitle: 'রুবি মোড় ⇄ গড়িয়া কবি নজরুল মেট্রো',
    hindiName: 'रूबी मोड़ ⇄ गड़िया (कवि नजरुल)',
    originStandId: 'ruby-more',
    destinationStandId: 'garia-metro',
    startStop: {
      id: 'rg-1',
      name: 'Ruby More',
      bengaliName: 'রুবি মোড়',
      coordinates: [22.5134, 88.3995],
      isStand: true
    },
    destinationStop: {
      id: 'rg-6',
      name: 'Garia Metro (Kavi Nazrul)',
      bengaliName: 'গড়িয়া কবি নজরুল',
      coordinates: [22.4645, 88.3790],
      isStand: true
    },
    fareRange: '₹20 Fixed',
    fareFixed: '₹20.00 Fixed',
    govtShareFare: '₹20 Fixed Union Fare',
    fareType: 'Fixed Rate',
    distance: '~6.5 km',
    distanceKm: 6.5,
    estTravel: '25m',
    estTravelMin: 25,
    queueFreq: 'Every 4 mins',
    isDirect: true,
    status: 'Every 4 mins',
    routeType: 'direct',
    category: 'Medical Hub link',
    notes: 'Direct EM Bypass southern trunk route linking major hospitals and metro line.',
    pathCoordinates: [
      [22.51340, 88.39950], // Ruby More
      [22.50850, 88.40010],
      [22.50300, 88.40050], // Singhabadi
      [22.49800, 88.39950],
      [22.49300, 88.39800], // Mukundapur
      [22.48800, 88.39600],
      [22.48300, 88.39300], // Ajoy Nagar
      [22.47850, 88.38980],
      [22.47400, 88.38600], // Peerless
      [22.46950, 88.38250],
      [22.46450, 88.37900]  // Garia Metro
    ],
    stops: [
      { id: 'rg-1', name: 'Ruby More', bengaliName: 'রুবি মোড়', order: 1, distance: '0.0 km', distKm: 0, coordinates: [22.5134, 88.3995], isStand: true },
      { id: 'rg-2', name: 'Singhabadi', bengaliName: 'সিংহবাড়ি', order: 2, distance: '1.4 km', distKm: 1.4, coordinates: [22.5030, 88.4005], isStand: false },
      { id: 'rg-3', name: 'Mukundapur Hospital Corridor', bengaliName: 'মুকুন্দপুর', order: 3, distance: '2.8 km', distKm: 2.8, coordinates: [22.4930, 88.3980], isStand: false },
      { id: 'rg-4', name: 'Ajoy Nagar Crossing', bengaliName: 'অজয় নগর', order: 4, distance: '4.2 km', distKm: 4.2, coordinates: [22.4830, 88.3930], isStand: false },
      { id: 'rg-5', name: 'Peerless Hospital Gate', bengaliName: 'পিয়ারলেস', order: 5, distance: '5.4 km', distKm: 5.4, coordinates: [22.4740, 88.3860], isStand: false },
      { id: 'rg-6', name: 'Garia Metro (Kavi Nazrul)', bengaliName: 'গড়িয়া কবি নজরুল', order: 6, distance: '6.5 km', distKm: 6.5, coordinates: [22.4645, 88.3790], isStand: true }
    ]
  },
  {
    id: 'ruby-chowbaga',
    code: 'R-04',
    codeAlt: 'AUTO #RB-CB-04',
    name: 'Ruby More ⇄ Chowbaga / Anandapur',
    subtitle: 'Via Urbana Complex & Heritage Campus',
    bengaliName: 'রুবি মোড় ⇄ চৌবাগা / আনন্দপুর',
    bengaliSubtitle: 'রুবি মোড় ⇄ চৌবাগা / আনন্দপুর',
    hindiName: 'रूबी मोड़ ⇄ चौबागा / आनंदपुर',
    originStandId: 'ruby-more',
    destinationStandId: 'chowbaga',
    startStop: {
      id: 'rc-1',
      name: 'Ruby More',
      bengaliName: 'রুবি মোড়',
      coordinates: [22.5134, 88.3995],
      isStand: true
    },
    destinationStop: {
      id: 'rc-5',
      name: 'Chowbaga Stand',
      bengaliName: 'চৌবাগা স্ট্যান্ড',
      coordinates: [22.5180, 88.4230],
      isStand: true
    },
    fareRange: '₹12 - ₹14',
    fareFixed: '₹14.00 Fixed',
    govtShareFare: '₹14 Fixed Union Fare',
    fareType: 'Fixed Rate',
    distance: '~3.1 km',
    distanceKm: 3.1,
    estTravel: '12m',
    estTravelMin: 12,
    queueFreq: 'Every 5 mins',
    isDirect: true,
    status: 'Every 5 mins',
    routeType: 'direct',
    category: 'Urbana & College Belt',
    notes: 'Popular commuter route for students of Heritage and residents of Urbana township.',
    pathCoordinates: [
      [22.51340, 88.39950], // Ruby More
      [22.51390, 88.40350],
      [22.51450, 88.40800], // Anandapur Thana
      [22.51520, 88.41150],
      [22.51600, 88.41400], // Urbana Complex
      [22.51650, 88.41620],
      [22.51700, 88.41800], // Heritage Campus
      [22.51750, 88.42050],
      [22.51800, 88.42300]  // Chowbaga
    ],
    stops: [
      { id: 'rc-1', name: 'Ruby More', bengaliName: 'রুবি মোড়', order: 1, distance: '0.0 km', distKm: 0, coordinates: [22.5134, 88.3995], isStand: true },
      { id: 'rc-2', name: 'Anandapur Thana', bengaliName: 'আনন্দপুর থানা', order: 2, distance: '1.0 km', distKm: 1.0, coordinates: [22.5145, 88.4080], isStand: false },
      { id: 'rc-3', name: 'Urbana Complex Gate', bengaliName: 'আরবানা কমপ্লেক্স', order: 3, distance: '1.9 km', distKm: 1.9, coordinates: [22.5160, 88.4140], isStand: false },
      { id: 'rc-4', name: 'Heritage Campus Gate', bengaliName: 'হেরিটেজ ক্যাম্পাস', order: 4, distance: '2.5 km', distKm: 2.5, coordinates: [22.5170, 88.4180], isStand: false },
      { id: 'rc-5', name: 'Chowbaga Stand', bengaliName: 'চৌবাগা স্ট্যান্ড', order: 5, distance: '3.1 km', distKm: 3.1, coordinates: [22.5180, 88.4230], isStand: true }
    ]
  },
  {
    id: 'ruby-jadavpur-gariahat-transfer',
    code: 'TRANSFER-01',
    codeAlt: 'CONNECTING ROUTE (1 TRANSFER)',
    name: 'Ruby More ⇄ Jadavpur 8B ⇄ Gariahat',
    subtitle: 'Leg 1: Ruby to 8B via Santoshpur (12m) • Leg 2: 8B to Gariahat via Dhakuria (14m)',
    bengaliName: 'রুবি মোড় ⇄ যাদবপুর ৮বি ⇄ গড়িয়াহাট',
    bengaliSubtitle: 'যাদবপুর ৮বি-তে ১টি বদল (মোট ৯টি স্টপেজ)',
    hindiName: 'रूबी मोड़ ⇄ जादवपुर 8बी ⇄ गड़ियाहाट',
    originStandId: 'ruby-more',
    destinationStandId: 'gariahat',
    transferStandId: 'jadavpur-8b',
    startStop: {
      id: 'tj-1',
      name: 'Ruby More',
      bengaliName: 'রুবি মোড়',
      coordinates: [22.5134, 88.3995],
      isStand: true
    },
    destinationStop: {
      id: 'tj-7',
      name: 'Gariahat Crossing',
      bengaliName: 'গড়িয়াহাট ক্রসিং',
      coordinates: [22.5190, 88.3645],
      isStand: true
    },
    transferDetails: '50m walk between Stand A & Stand C at 8B Terminal (Transfer Wait ~3 mins)',
    fareRange: '₹22 Combined Fare',
    fareFixed: '₹22.00 Combined',
    govtShareFare: '₹22 Combined Fare',
    fareType: 'Combined Multi-Leg',
    distance: '~5.9 km',
    distanceKm: 5.9,
    estTravel: '29m',
    estTravelMin: 29,
    queueFreq: 'High Availability',
    isDirect: false,
    routeType: 'connecting',
    category: 'Transfer @ Jadavpur 8B • Total 9 Stoppages',
    notes: 'Reliable bypass when Kasba / Bijan Setu traffic is heavily stalled.',
    pathCoordinates: [
      [22.51340, 88.39950],
      [22.50990, 88.39820],
      [22.50800, 88.39700],
      [22.50300, 88.39000],
      [22.49950, 88.38000],
      [22.49880, 88.37120], // Jadavpur 8B transfer
      [22.50200, 88.36950],
      [22.50500, 88.36800], // Dhakuria Bridge
      [22.50850, 88.36700],
      [22.51200, 88.36600], // Golpark
      [22.51550, 88.36520],
      [22.51900, 88.36450]  // Gariahat
    ],
    stops: [
      { id: 'tj-1', name: 'Ruby More', bengaliName: 'রুবি মোড়', order: 1, distance: '0.0 km', coordinates: [22.5134, 88.3995], isStand: true },
      { id: 'tj-2', name: 'Kalikapur', bengaliName: 'কালিকাপুর', order: 2, distance: '1.2 km', coordinates: [22.5080, 88.3970], isStand: false },
      { id: 'tj-3', name: 'Santoshpur', bengaliName: 'সন্তোষপুর', order: 3, distance: '2.1 km', coordinates: [22.5030, 88.3900], isStand: false },
      { id: 'tj-4', name: 'Jadavpur 8B Terminal (Transfer Point)', bengaliName: 'যাদবপুর ৮বি (বদল বিন্দু)', order: 4, distance: '3.8 km', coordinates: [22.4988, 88.3712], isStand: true, isTransfer: true },
      { id: 'tj-5', name: 'Dhakuria Bridge', bengaliName: 'ঢাকুড়িয়া সেতু', order: 5, distance: '4.6 km', coordinates: [22.5050, 88.3680], isStand: false },
      { id: 'tj-6', name: 'Golpark Roundabout', bengaliName: 'গোলপার্ক মোড়', order: 6, distance: '5.2 km', coordinates: [22.5120, 88.3660], isStand: false },
      { id: 'tj-7', name: 'Gariahat Crossing', bengaliName: 'গড়িয়াহাট ক্রসিং', order: 7, distance: '5.9 km', coordinates: [22.5190, 88.3645], isStand: true }
    ]
  },
  {
    id: 'ruby-phari-branch',
    code: 'BRANCH-01',
    codeAlt: 'BRANCH RUN (SHORT RUN)',
    name: 'Ruby More ⇄ Ballygunge Phari (Short Run)',
    subtitle: '5 Stoppages • Faster during Kasba market peak traffic hours',
    bengaliName: 'রুবি মোড় ⇄ বালিগঞ্জ ফাঁড়ি (সংক্ষিপ্ত রুট)',
    bengaliSubtitle: 'বালিগঞ্জ ফাঁড়ি পর্যন্ত • গড়িয়াহাটে ৪০০ মি হাঁটা দূরত্ব',
    hindiName: 'रूबी मोड़ ⇄ बालीगंज फाड़ी',
    originStandId: 'ruby-more',
    destinationStandId: 'ballygunge-phari',
    startStop: {
      id: 'bp-1',
      name: 'Ruby More',
      bengaliName: 'রুবি মোড়',
      coordinates: [22.5134, 88.3995],
      isStand: true
    },
    destinationStop: {
      id: 'bp-5',
      name: 'Ballygunge Phari Terminus',
      bengaliName: 'বালিগঞ্জ ফাঁড়ি টার্মিনাস',
      coordinates: [22.5280, 88.3655],
      isStand: true
    },
    fareRange: '₹15 Direct Fare',
    fareFixed: '₹15.00 Direct Fare',
    govtShareFare: '₹15 Direct Fare',
    fareType: 'Direct Fare',
    distance: '~3.9 km',
    distanceKm: 3.9,
    estTravel: '14m',
    estTravelMin: 14,
    queueFreq: 'Frequent Branch',
    isDirect: true,
    routeType: 'branch',
    category: 'Terminates at Ballygunge Phari • 400m walk to Gariahat',
    notes: 'Short branch terminates before Gariahat jam point. 5 mins brisk walk to Gariahat market.',
    pathCoordinates: [
      [22.51340, 88.39950],
      [22.51410, 88.39490],
      [22.51500, 88.39100],
      [22.51650, 88.38200],
      [22.51850, 88.37350],
      [22.52200, 88.37000],
      [22.52550, 88.36750],
      [22.52800, 88.36550]  // Ballygunge Phari
    ],
    stops: [
      { id: 'bp-1', name: 'Ruby More', bengaliName: 'রুবি মোড়', order: 1, distance: '0.0 km', coordinates: [22.5134, 88.3995], isStand: true },
      { id: 'bp-2', name: 'Acropolis Mall', bengaliName: 'অ্যাক্রোপলিস', order: 2, distance: '1.1 km', coordinates: [22.5150, 88.3910], isStand: false },
      { id: 'bp-3', name: 'Kasba Thana', bengaliName: 'কসবা থানা', order: 3, distance: '2.3 km', coordinates: [22.5165, 88.3820], isStand: false },
      { id: 'bp-4', name: 'Bijan Setu North Ramp', bengaliName: 'বিজন সেতু উত্তর', order: 4, distance: '3.1 km', coordinates: [22.5185, 88.3735], isStand: false },
      { id: 'bp-5', name: 'Ballygunge Phari Terminus', bengaliName: 'বালিগঞ্জ ফাঁড়ি টার্মিনাস', order: 5, distance: '3.9 km', coordinates: [22.5280, 88.3655], isStand: true }
    ]
  }
];
