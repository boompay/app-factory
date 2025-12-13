
type PhoneFormat = "e164" | "national" | "digits";

const US_AREA_CODES: number[] = [
    201,202,203,205,206,207,208,209,212,213,214,215,216,217,218,219,
    224,225,228,229,231,234,239,240,248,251,252,253,254,256,260,267,
    269,270,272,276,281,301,302,303,304,305,307,308,309,310,312,314,
    315,316,317,318,319,320,321,323,325,330,331,334,336,337,339,346,
    347,351,352,360,361,364,380,385,386,401,402,404,405,406,407,408,
    409,410,412,413,414,415,417,419,423,424,425,430,432,434,435,440,
    442,443,447,458,463,469,470,475,478,479,480,484,501,502,503,504,
    505,507,508,509,510,512,513,515,516,517,518,520,530,531,534,539,
    540,541,551,557,559,561,562,563,564,567,570,571,573,574,575,580,
    585,586,601,602,603,605,606,607,608,609,610,612,614,615,616,617,
    618,619,620,623,626,628,629,630,631,636,641,646,650,651,657,659,
    660,661,662,667,669,678,681,682,689,701,702,703,704,706,707,708,
    712,713,714,715,716,717,718,719,720,724,725,727,730,731,732,734,
    737,740,743,747,754,757,760,762,763,765,769,770,772,773,774,775,
    779,781,785,786,801,802,803,804,805,806,808,810,812,813,814,815,
    816,817,818,820,828,830,831,832,843,845,847,848,850,854,856,857,
    858,859,860,862,863,864,865,870,872,878,901,903,904,906,907,908,
    909,910,912,913,914,915,916,917,918,919,920,925,928,929,930,931,
    934,936,937,938,939,940,941,947,949,951,952,954,956,959,970,971,
    972,973,975,978,979,980,984,985,986,989
  ];
/**
 * Generate a random syntactically-valid US/Canada phone number (NANP).
 * - Country code: +1
 * - Area code: NXX (N=2–9, X=0–9, not N11)
 * - Central office: NXX (N=2–9, X=0–9, not N11)
 * - Line number: XXXX (0000–9999)
 */
export function generateRandomUsCaPhone(format: PhoneFormat = "e164"): string {
  const countryCode = "1";
  const areaCode = String(US_AREA_CODES[randomInt(0, US_AREA_CODES.length - 1)]);
  const centralOffice = generateNanpCode();
  const lineNumber = randomInt(0, 9999).toString().padStart(4, "0");

  switch (format) {
    case "e164":
      // +11234567890
      return `+${countryCode}${areaCode}${centralOffice}${lineNumber}`;
    case "digits":
      // 11234567890
      return `${countryCode}${areaCode}${centralOffice}${lineNumber}`;
    case "national":
    default:
      // (123) 456-7890
      return `(${areaCode}) ${centralOffice}-${lineNumber}`;
  }
}

/** Random integer between min and max inclusive */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a NANP code: NXX
 * - first digit 2–9
 * - second & third 0–9
 * - avoid N11 (e.g., 211, 311, 911…)
 */
function generateNanpCode(): string {
  // Generate an NXX code:
  // - first digit 2–9
  // - next two digits 0–9
  // - avoid N11 patterns (like 911, 411, etc.)
  let first: number;
  let second: number;
  let third: number;

  do {
    first = randomInt(2, 9);
    second = randomInt(0, 9);
    third = randomInt(0, 9);
  } while (second === 1 && third === 1);

  return `${first}${second}${third}`;
}
