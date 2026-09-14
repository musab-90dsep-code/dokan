                        export const toBengaliDigits = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null || num === '') return '০';
  const str = String(num);
  const bengaliNumerals: Record<string, string> = {
    '0': '০',
    '1': '১',
    '2': '২',
    '3': '৩',
    '4': '৪',
    '5': '৫',
    '6': '৬',
    '7': '৭',
    '8': '৮',
    '9': '৯',
  };
  return str.replace(/[0-9]/g, (match) => bengaliNumerals[match] || match);
};

export const toEnglishDigits = (str: string | number | undefined | null): string => {
  if (str === undefined || str === null || str === '') return '';
  const bnToEn: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return String(str).replace(/[০-৯]/g, (match) => bnToEn[match] || match);
};

export const normalizeForSearch = (str: string | number | undefined | null): string => {
  if (!str) return '';
  return toEnglishDigits(String(str)).toLowerCase().trim();
};

export const formatBengaliTaka = (amount: number | undefined | null, includeSymbol: boolean = false): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '০/=';
  const formatted = amount.toLocaleString('en-IN');
  const bnFormatted = toBengaliDigits(formatted);
  return includeSymbol ? `৳ ${bnFormatted}/=` : `${bnFormatted}/=`;
};

const bnWordsMap: Record<number, string> = {
  0: 'শূন্য', 1: 'এক', 2: 'দুই', 3: 'তিন', 4: 'চার', 5: 'পাঁচ', 6: 'ছয়', 7: 'সাত', 8: 'আট', 9: 'নয়', 10: 'দশ',
  11: 'এগারো', 12: 'বারো', 13: 'তেরো', 14: 'চৌদ্দ', 15: 'পনেরো', 16: 'ষোলো', 17: 'সতেরো', 18: 'আঠারো', 19: 'উনিশ', 20: 'বিশ',
  21: 'একুশ', 22: 'বাইশ', 23: 'তেইশ', 24: 'চব্বিশ', 25: 'পঁচিশ', 26: 'ছাব্বিশ', 27: 'সাতাশ', 28: 'আঠাশ', 29: 'উনত্রিশ', 30: 'ত্রিশ',
  31: 'একত্রিশ', 32: 'বত্রিশ', 33: 'তেত্রিশ', 34: 'চৌত্রিশ', 35: 'পঁয়ত্রিশ', 36: 'ছত্রিশ', 37: 'সাইত্রিশ', 38: 'আটত্রিশ', 39: 'উনচল্লিশ', 40: 'চল্লিশ',
  41: 'একচল্লিশ', 42: 'বিয়াল্লিশ', 43: 'তেতাল্লিশ', 44: 'চৌয়াল্লিশ', 45: 'পঁয়তাল্লিশ', 46: 'ছেচল্লিশ', 47: 'সাতচল্লিশ', 48: 'আটচল্লিশ', 49: 'উনপঞ্চাশ', 50: 'পঞ্চাশ',
  51: 'একান্ন', 52: 'বায়ান্ন', 53: 'তিপ্পান্ন', 54: 'চৌয়ান্ন', 55: 'পঞ্চান্ন', 56: 'ছাপ্পান্ন', 57: 'সাতান্ন', 58: 'আটান্ন', 59: 'উনষাট', 60: 'ষাট',
  61: 'একষট্টি', 62: 'বাষট্টি', 63: 'তেষট্টি', 64: 'চৌষট্টি', 65: 'পঁয়ষট্টি', 66: 'ছেষট্টি', 67: 'সাতষট্টি', 68: 'আটষট্টি', 69: 'উনসত্তর', 70: 'সত্তর',
  71: 'একাত্তর', 72: 'বাস্তুর', 73: 'তিয়াত্তর', 74: 'চৌয়াত্তর', 75: 'পঁচাত্তর', 76: 'ছিয়াত্তর', 77: 'সাতাত্তর', 78: 'আটাত্তর', 79: 'উনাশি', 80: 'আশি',
  81: 'একাশি', 82: 'বিরাশি', 83: 'তিরাশি', 84: 'চৌরাশি', 85: 'পঁচাশি', 86: 'ছিয়াশি', 87: 'সাতাশি', 88: 'অষ্টাদশ', 89: 'উননব্বই', 90: 'নব্বই',
  91: 'একানব্বই', 92: 'বিয়ানব্বই', 93: 'তেরানব্বই', 94: 'চৌরানব্বই', 95: 'পঁচানব্বই', 96: 'ছিয়ানব্বই', 97: 'সাতানব্বই', 98: 'আটানব্বই', 99: 'নিরানব্বই'
};

function convertTwoDigits(n: number): string {
  if (n <= 0) return '';
  return bnWordsMap[n] || String(n);
}

export const numberToBengaliWords = (num: number | undefined | null): string => {
  if (num === undefined || num === null || isNaN(num) || num === 0) return 'শূন্য টাকা মাত্র';
  
  let amount = Math.floor(Math.abs(num));
  let result = '';

  if (amount >= 10000000) {
    const crore = Math.floor(amount / 10000000);
    result += numberToBengaliWords(crore).replace(' টাকা মাত্র', '') + ' কোটি ';
    amount %= 10000000;
  }

  if (amount >= 100000) {
    const lakh = Math.floor(amount / 100000);
    result += convertTwoDigits(lakh) + ' লক্ষ ';
    amount %= 100000;
  }

  if (amount >= 1000) {
    const thousand = Math.floor(amount / 1000);
    result += convertTwoDigits(thousand) + ' হাজার ';
    amount %= 1000;
  }

  if (amount >= 100) {
    const hundred = Math.floor(amount / 100);
    result += convertTwoDigits(hundred) + ' শত ';
    amount %= 100;
  }

  if (amount > 0) {
    result += convertTwoDigits(amount) + ' ';
  }

  return (result.trim() + ' টাকা মাত্র').replace(/\s+/g, ' ');
};

export const formatCurrencyToWords = (amount: number): string => {
  const taka = Math.floor(amount);
  const poisha = Math.round((amount - taka) * 100);
  let result = '';
  if (taka > 0) result += `${numberToBengaliWords(taka).replace(' টাকা মাত্র', '')}`;
  if (poisha > 0) result += `${result ? ' এবং ' : ''}${convertTwoDigits(poisha)} পয়সা`;
  return `${result} টাকা মাত্র`;
};

export interface ParsedProductInfo {
  categoryName: string;
  brandName: string;
  sizeName: string;
  cementType?: 'OPC' | 'PCC' | '';
}

export function parseProductDetails(item: { 
  name: string; 
  category?: string; 
  brand?: string; 
  mmSize?: string; 
  size?: string; 
  variant?: string;
  cementType?: string;
}): ParsedProductInfo {
  const name = item.name || '';
  const lowerName = name.toLowerCase();

  // 1. Category / Product Type (পণ্য / রড / সিমেন্ট / রিং)
  let categoryName = item.category || '';
  if (!categoryName) {
    if (lowerName.includes('সিমেন্ট') || lowerName.includes('cement')) {
      categoryName = 'সিমেন্ট';
    } else if (lowerName.includes('রড') || lowerName.includes('rod') || lowerName.includes('মিলি') || lowerName.includes('mm')) {
      categoryName = 'রড';
    } else if (lowerName.includes('রিং') || lowerName.includes('ring')) {
      categoryName = 'রিং';
    } else {
      categoryName = name || 'অন্যান্য';
    }
  }

  // Detect cement type if present
  let detectedCementType: 'OPC' | 'PCC' | '' = '';
  if (item.cementType === 'OPC' || item.cementType === 'PCC') {
    detectedCementType = item.cementType;
  } else if (item.variant === 'OPC' || item.variant === 'PCC') {
    detectedCementType = item.variant;
  } else if (/\bopc\b|\(opc\)|ওপিসি/i.test(lowerName)) {
    detectedCementType = 'OPC';
  } else if (/\bpcc\b|\(pcc\)|পিসিসি/i.test(lowerName)) {
    detectedCementType = 'PCC';
  }

  // 2. Brand (ব্র্যান্ড)
  let brandName = item.brand || '';
  if (!brandName) {
    const knownBrands = [
      'BSRM', 'SCRM TMX', 'SCRM', 'KSML', 'HKG', 'DSRM',
      'Holcim Strong structure', 'Holcim Supercrete Plus', 'Holcim Supercrete', 'Holcim Coastal Guard', 'Holcim Waterprotect', 'King Brand', 'Aman',
      'KSRM', 'AKS', 'GPH Ispat', 'Anwar Ispat', 'RSRM', 'Baizid', 'Metrocem', 'SSRM',
      'শাহ সিমেন্ট', 'সেভেন রিংস', 'বসুন্ধরা সিমেন্ট', 'ফ্রেশ সিমেন্ট', 'ক্রাউন সিমেন্ট', 'প্রিমিয়ার সিমেন্ট',
      'হোলসিম সিমেন্ট', 'আকিজ সিমেন্ট', 'শাহ', 'সেভেন রিং', 'বসুন্ধরা', 'ফ্রেশ', 'ক্রাউন', 'প্রিমিয়ার', 'হোলসিম', 'আকিজ'
    ];
    for (const b of knownBrands) {
      if (name.includes(b)) {
        brandName = b.endsWith('সিমেন্ট') ? b : (categoryName === 'সিমেন্ট' ? `${b} সিমেন্ট` : b);
        break;
      }
    }
    if (!brandName && categoryName === 'সিমেন্ট') {
      const cleaned = name.replace(/\((?:OPC|PCC|ওপিসি|পিসিসি)\)/gi, '').replace(/\b(?:OPC|PCC|ওপিসি|পিসিসি)\b/gi, '').trim();
      if (cleaned) brandName = cleaned;
    }
  }

  // 3. Size / Variant (সাইজ / গ্রেড / টাইপ)
  let sizeName = item.mmSize || item.size || item.variant || '';
  if (categoryName === 'সিমেন্ট' && detectedCementType) {
    sizeName = detectedCementType;
  } else if (!sizeName) {
    if (detectedCementType) {
      sizeName = detectedCementType;
    } else {
      const mmMatch = name.match(/([0-9০-৯]+(?:\.[0-9০-৯]+)?\s*(?:মিলি|mm))/i) 
                   || name.match(/([0-9০-৯]+)\s*(?:মিলি|mm)/i)
                   || name.match(/\b(8|10|12|16|20|22|25|28|32|৮|১০|১২|১৬|২০|২২|২৫|২৮|৩২)\s*(?:মিলি|mm|রড)?/i);
      if (mmMatch) {
        const numPart = (mmMatch[1] || mmMatch[0]).replace(/(?:মিলি|mm|রড)/gi, '').trim();
        sizeName = numPart ? `${numPart} মিলি` : mmMatch[0];
      } else {
        const ringDashMatch = name.match(/\b([0-9০-৯]+-[0-9০-৯]+)\b/) || name.match(/Pistol\s*ring/i) || name.match(/পিস্তল\s*রিং/i);
        const ringMatch = name.match(/([0-9০-৯]+["″]?\s*[\*×xX]\s*[0-9০-৯]+["″]?)/);
        if (ringDashMatch) {
          sizeName = ringDashMatch[0];
        } else if (ringMatch) {
          sizeName = ringMatch[1].replace(/[*xX]/g, '″ × ') + (ringMatch[1].includes('″') ? '' : '″');
        }
      }
    }
  }

  return {
    categoryName: categoryName || 'পণ্য',
    brandName: brandName || '—',
    sizeName: sizeName || '—',
    cementType: detectedCementType
  };
}

/**
 * Universal cleaner for legacy Bijoy 52 / SutonnyMJ text remnants in product names and ledger descriptions.
 * Converts strings like "10 মি.মি Gm wm Avi Gg রড" to "10 মি.মি এসসিআরএম রড".
 */
export function cleanLegacyBengaliText(input: any): string {
  if (input === null || input === undefined) return '';
  let str = String(input).trim();
  if (!str) return '';

  // 1. Specific brand phrases (longest phrase first)
  const PHRASES: [RegExp, string | ((m: string) => string)][] = [
    // SCRM rod
    [/10\s*wg[:.]\s*wj\s+Gm\s+wm\s+Avi\s+Gg\s+iW/gi, '10 মি.মি এসসিআরএম রড'],
    [/12\s*wg[:.]\s*wj\s+Gm\s+wm\s+Avi\s+Gg\s+iW/gi, '12 মি.মি এসসিআরএম রড'],
    [/16\s*wg[:.]\s*wj\s+Gm\s+wm\s+Avi\s+Gg\s+iW/gi, '16 মি.মি এসসিআরএম রড'],
    [/20\s*wg[:.]\s*wj\s+Gm\s+wm\s+Avi\s+Gg\s+iW/gi, '20 মি.মি এসসিআরএম রড'],
    [/22\s*wg[:.]\s*wj\s+Gm\s+wm\s+Avi\s+Gg\s+iW/gi, '22 মি.মি এসসিআরএম রড'],
    [/25\s*wg[:.]\s*wj\s+Gm\s+wm\s+Avi\s+Gg\s+iW/gi, '25 মি.মি এসসিআরএম রড'],
    [/8\s*wg[:.]\s*wj\s+Gm\s+wm\s+Avi\s+Gg\s+iW/gi, '8 মি.মি এসসিআরএম রড'],

    // BSRM rod
    [/10\s*wg[:.]\s*wj\s+(?:we|G)\s+Gm\s+Avi\s+Gg\s+iW/gi, '10 মি.মি বিএসআরএম রড'],
    [/12\s*wg[:.]\s*wj\s+(?:we|G)\s+Gm\s+Avi\s+Gg\s+iW/gi, '12 মি.মি বিএসআরএম রড'],
    [/16\s*wg[:.]\s*wj\s+(?:we|G)\s+Gm\s+Avi\s+Gg\s+iW/gi, '16 মি.মি বিএসআরএম রড'],
    [/20\s*wg[:.]\s*wj\s+(?:we|G)\s+Gm\s+Avi\s+Gg\s+iW/gi, '20 মি.মি বিএসআরএম রড'],
    [/22\s*wg[:.]\s*wj\s+(?:we|G)\s+Gm\s+Avi\s+Gg\s+iW/gi, '22 মি.মি বিএসআরএম রড'],
    [/25\s*wg[:.]\s*wj\s+(?:we|G)\s+Gm\s+Avi\s+Gg\s+iW/gi, '25 মি.মি বিএসআরএম রড'],
    [/8\s*wg[:.]\s*wj\s+(?:we|G)\s+Gm\s+Avi\s+Gg\s+iW/gi, '8 মি.মি বিএসআরএম রড'],

    // Fresh rod
    [/(?:10|12|16|20|22|25|8)\s*wg[:.]\s*wj\s+†d«m\s+iW/gi, (m: string) => m.replace(/wg[:.]\s*wj/gi, 'মি.মি').replace(/†d«m/g, 'ফ্রেশ').replace(/iW/g, 'রড')],

    // KSML rod
    [/16\s*wg[:.]\s*wj\s+‡K\s+Gm\s+Gg\s+Gj\s+iW/gi, '16 মি.মি কেএসএমএল রড'],
    [/12\s*wg[:.]\s*wj\s+‡K\s+Gm\s+Gg\s+Gj\s+iW/gi, '12 মি.মি কেএসএমএল রড'],
    [/10\s*wg[:.]\s*wj\s+‡K\s+Gm\s+Gg\s+Gj\s+iW/gi, '10 মি.মি কেএসএমএল রড'],
    [/8\s*wg[:.]\s*wj\s+‡K\s+Gm\s+Gg\s+Gj\s+iW/gi, '8 মি.মি কেএসএমএল রড'],

    // Anwar / AKS rod
    [/(?:10|12|16)\s*wg[:.]\s*wj\s+Av‡bvqvi\s+iW/gi, (m: string) => m.replace(/wg[:.]\s*wj/gi, 'মি.মি').replace(/Av‡bvqvi/g, 'আনোয়ার').replace(/iW/g, 'রড')],
    [/(?:10|12|16)\s*wg[:.]\s*wj\s+G‡KGm\s+iW/gi, (m: string) => m.replace(/wg[:.]\s*wj/gi, 'মি.মি').replace(/G‡KGm/g, 'একেএস').replace(/iW/g, 'রড')],

    // Cements & Brands
    [/G¨vsKi\s+wm‡g›U/gi, 'অ্যাংকর সিমেন্ট'],
    [/wm‡g›U\s+G¨vsKi\s+Avc/gi, 'অ্যাংকর সিমেন্ট'],
    [/wm‡g›U\s+G¨vsKi/gi, 'অ্যাংকর সিমেন্ট'],
    [/G¨vsKi\s+Avc/gi, 'অ্যাংকর সিমেন্ট'],
    [/†nvjwmg\s+wm‡g›U/gi, 'হোলসিম সিমেন্ট'],
    [/wm‡g›U\s+†nvjwmg/gi, 'হোলসিম সিমেন্ট'],
    [/‡kL\s+wm‡g›U/gi, 'শেখ সিমেন্ট'],
    [/kvn\s+wm‡g›U/gi, 'শাহ সিমেন্ট'],
    [/AvwKR\s+wm‡g›U/gi, 'আকিজ সিমেন্ট'],
    [/µvDb\s+wm‡g›U/gi, 'ক্রাউন সিমেন্ট'],
    [/†m‡fb\s+wis\s+wm‡g›U/gi, 'সেভেন রিংস সিমেন্ট'],

    // Charges
    [/‡jevwi|‡jevix/gi, 'লেবার বিল'],
    [/fvov/gi, 'ভাড়া']
  ];

  for (const [pattern, replacement] of PHRASES) {
    if (typeof replacement === 'string') {
      str = str.replace(pattern, replacement);
    } else {
      str = str.replace(pattern, replacement as any);
    }
  }

  // 2. Individual Brand tokens anywhere in text (handles already partially converted text like "10 মি.মি Gm wm Avi Gg রড")
  str = str.replace(/Gm\s+wm\s+Avi\s+Gg/gi, 'এসসিআরএম');
  str = str.replace(/we\s+Gm\s+Avi\s+Gg/gi, 'বিএসআরএম');
  str = str.replace(/G\s+Gm\s+Avi\s+Gg/gi, 'বিএসআরএম');
  str = str.replace(/‡K\s+Gm\s+Gg\s+Gj/gi, 'কেএসএমএল');
  str = str.replace(/Av‡bvqvi/gi, 'আনোয়ার');
  str = str.replace(/G‡KGm/gi, 'একেএস');
  str = str.replace(/G¨vsKi/gi, 'অ্যাংকর');
  str = str.replace(/†nvjwmg/gi, 'হোলসিম');
  str = str.replace(/wm‡g›U/gi, 'সিমেন্ট');
  str = str.replace(/†d«m/gi, 'ফ্রেশ');
  str = str.replace(/iW/g, 'রড');
  str = str.replace(/wg[:.]\s*wj/gi, 'মি.মি');

  // Normalize multi-spaces
  return str.replace(/\s+/g, ' ').trim();
}

