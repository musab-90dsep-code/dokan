// Utility for converting numbers to Bengali digits and Bengali words (টাকা কথায়)

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
