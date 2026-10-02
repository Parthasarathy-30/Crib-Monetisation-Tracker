export function detectCity(location: string = '', pgName: string = ''): string {
  const loc = (location + ' ' + pgName).toUpperCase().trim();

  // 1. Bangalore (Karnataka)
  if (
    loc.includes('BANGLORE') || 
    loc.includes('BANGALORE') || 
    loc.includes('WHITEFIELD') || 
    loc.includes('KORAMANGALA') || 
    loc.includes('HSR') || 
    loc.includes('BTM') || 
    loc.includes('ELECTRONIC CITY') ||
    loc.includes('INDIRANAGAR') ||
    loc.includes('MARATHAHALLI') ||
    loc.includes('BELLANDUR') ||
    loc.includes('HEBBAL') ||
    loc.includes('YELAHANKA') ||
    loc.includes('JAYANAGAR')
  ) {
    return 'Bangalore';
  }

  // 2. Kerala
  if (
    loc.includes('KERALA') || 
    loc.includes('TRIVANDRUM') || 
    loc.includes('THIRUVANANTHAPURAM') || 
    loc.includes('KOCHI') || 
    loc.includes('COCHIN') || 
    loc.includes('CALICUT') || 
    loc.includes('KOZHIKODE') || 
    loc.includes('ERNAKULAM') ||
    loc.includes('THRISSUR') ||
    loc.includes('KOTTAYAM') ||
    loc.includes('PALAKKAD') ||
    loc.includes('MALAPPURAM') ||
    loc.includes('KANNUR')
  ) {
    return 'Kerala';
  }

  // 3. Coimbatore & West Tamil Nadu
  if (
    loc.includes('COIMBATORE') ||
    loc.includes('SARAVANAMPATTI') ||
    loc.includes('GANDHIPURAM') ||
    loc.includes('PEELAMEDU') ||
    loc.includes('RS PURAM') ||
    loc.includes('SINGANALLUR') ||
    loc.includes('HOPES') ||
    loc.includes('TIDEL') ||
    loc.includes('SITRA') ||
    loc.includes('KUNIAMUTHUR') ||
    loc.includes('VADAVALLI') ||
    loc.includes('SAIBABA') ||
    loc.includes('CHINNAVEDAMPATTI') ||
    loc.includes('KALAPATTI') ||
    loc.includes('THUDIYALUR') ||
    loc.includes('SUNDARAPURAM') ||
    loc.includes('GANAPATHY') ||
    loc.includes('ECHANARI') ||
    loc.includes('ERODE') ||
    loc.includes('TIRUPPUR') ||
    loc.includes('POLLACHI') ||
    loc.includes('CBE')
  ) {
    return 'Coimbatore';
  }

  // 4. Vellore
  if (
    loc.includes('VELLORE') ||
    loc.includes('KATPADI')
  ) {
    return 'Vellore';
  }

  // 5. Default: Chennai (Metropolitan area and suburbs)
  return 'Chennai';
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function normalizeAreaName(location: string = ''): string {
  if (!location) return 'Other';
  const clean = location.trim().toUpperCase();

  // Chennai Areas with proper Title Case
  if (clean.includes('ANNA NAGAR') || clean.includes('ANNANAGAR')) return 'Anna Nagar';
  if (clean.includes('PERAMBUR') || clean.includes('PERAMBUR')) return 'Perambur';
  if (clean.includes('AMBATTUR') || clean.includes('AMBUTTUR') || clean.includes('AMBATHUR')) return 'Ambattur';
  if (clean.includes('MOGAPPAIR') || clean.includes('MOGAPPIR') || clean.includes('MUGAPPAIR')) return 'Mogappair';
  if (clean.includes('PORUR')) return 'Porur';
  if (clean.includes('THORAIPAKKAM') || clean.includes('THORAPAKKAM') || clean.includes('THURAIPAKKAM')) return 'Thoraipakkam';
  if (clean.includes('SHOLINGANALLUR') || clean.includes('SHOLINGNALUR') || clean.includes('SOLINGANALLUR')) return 'Sholinganallur';
  if (clean.includes('EKKATTUTHANGAL') || clean.includes('EKAATTUTHANGAL') || clean.includes('EKKATUTHANGAL')) return 'Ekkattuthangal';
  if (clean.includes('KARAPAKKAM') || clean.includes('KARAPAKAM')) return 'Karapakkam';
  if (clean.includes('SIRUSERI') || clean.includes('SIRUCHERI') || clean.includes('SRIRUCHERI')) return 'Siruseri';
  if (clean.includes('VELACHERY') || clean.includes('VELACHERI')) return 'Velachery';
  if (clean.includes('PERUNGUDI') || clean.includes('PERUNGKUDI')) return 'Perungudi';
  if (clean.includes('T NAGAR') || clean.includes('T.NAGAR') || clean.includes('THIYAGARAYA')) return 'T. Nagar';
  if (clean.includes('NAVALUR') || clean.includes('NAVALOOR')) return 'Navalur';
  if (clean.includes('VANDALUR') || clean.includes('VANDALOOR')) return 'Vandalur';
  if (clean.includes('KODAMBAKKAM') || clean.includes('KODAMBAKAM')) return 'Kodambakkam';
  if (clean.includes('MUGALIVAKKAM') || clean.includes('MUGALIVAKAM')) return 'Mugalivakkam';
  if (clean.includes('TAMBARAM') || clean.includes('TAMBRAM')) return 'Tambaram';
  if (clean.includes('RAMAPURAM')) return 'Ramapuram';
  if (clean.includes('MEDAVAKKAM')) return 'Medavakkam';
  if (clean.includes('SRIPERUMBUDUR') || clean.includes('SRIPERUMPUTHUR')) return 'Sriperumbudur';
  if (clean.includes('PADUR')) return 'Padur';
  if (clean.includes('CHROMPET') || clean.includes('CHROMPETE')) return 'Chrompet';
  if (clean.includes('THIRUVANMIYUR') || clean.includes('THIRUVANMAYUR')) return 'Thiruvanmiyur';
  if (clean.includes('VADAPALANI') || clean.includes('VADA PALANI')) return 'Vadapalani';
  if (clean.includes('GUINDY')) return 'Guindy';
  if (clean.includes('KOYAMBEDU') || clean.includes('KOYEMBEDU')) return 'Koyambedu';
  if (clean.includes('ALANDUR')) return 'Alandur';
  if (clean.includes('ASHOK NAGAR')) return 'Ashok Nagar';
  if (clean.includes('NUNGAMBAKKAM')) return 'Nungambakkam';
  if (clean.includes('AVADI')) return 'Avadi';
  if (clean.includes('POONAMALLEE') || clean.includes('POONAMALLE')) return 'Poonamallee';
  if (clean.includes('SAIDAPET')) return 'Saidapet';
  if (clean.includes('KILPAUK')) return 'Kilpauk';
  if (clean.includes('EGMORE')) return 'Egmore';
  if (clean.includes('ROYAPETTAH')) return 'Royapettah';
  if (clean.includes('TRIPLICANE')) return 'Triplicane';
  if (clean.includes('PALLAVARAM')) return 'Pallavaram';
  if (clean.includes('MADIPAKKAM')) return 'Madipakkam';
  if (clean.includes('ADYAR')) return 'Adyar';
  if (clean.includes('BESANT NAGAR')) return 'Besant Nagar';
  if (clean.includes('KELAMBAKKAM')) return 'Kelambakkam';
  if (clean.includes('KANCHIPURAM')) return 'Kanchipuram';
  if (clean.includes('CHETPET')) return 'Chetpet';

  // Coimbatore Areas
  if (clean.includes('SARAVANAMPATTI')) return 'Saravanampatti';
  if (clean.includes('GANDHIPURAM')) return 'Gandhipuram';
  if (clean.includes('PEELAMEDU')) return 'Peelamedu';
  if (clean.includes('RS PURAM') || clean.includes('R.S PURAM')) return 'RS Puram';
  if (clean.includes('ECHANARI')) return 'Echanari';
  if (clean.includes('ERODE')) return 'Erode';
  if (clean.includes('COIMBATORE')) return 'Coimbatore Central';

  // Bangalore Areas
  if (clean.includes('WHITEFIELD')) return 'Whitefield';
  if (clean.includes('KORAMANGALA')) return 'Koramangala';
  if (clean.includes('HSR')) return 'HSR Layout';
  if (clean.includes('BTM')) return 'BTM Layout';
  if (clean.includes('ELECTRONIC CITY')) return 'Electronic City';
  if (clean.includes('INDIRANAGAR')) return 'Indiranagar';
  if (clean.includes('BANGLORE') || clean.includes('BANGALORE')) return 'Bangalore Central';

  // Kerala
  if (clean.includes('TRIVANDRUM') || clean.includes('THIRUVANANTHAPURAM')) return 'Trivandrum';
  if (clean.includes('KOCHI') || clean.includes('COCHIN') || clean.includes('ERNAKULAM')) return 'Kochi / Ernakulam';
  if (clean.includes('CALICUT') || clean.includes('KOZHIKODE')) return 'Kozhikode';
  if (clean.includes('KERALA')) return 'Kerala Region';

  // Fallback: remove zipcodes/chennai tags and convert to Title Case
  const stripped = clean
    .replace(/\b(CHENNAI|TAMIL NADU|TN|\d{6})\b/g, '')
    .trim();

  return stripped ? toTitleCase(stripped) : toTitleCase(clean);
}
