/**
 * Pattern-based merchant categorization. Uses keyword heuristics and major
 * chains to classify ~60-70% of transactions without any API call.
 * Remaining unknowns can be sent to the AI categorization endpoint.
 *
 * Category strings are chosen to align with classifyTxn() expectations:
 *   "Food & Drink"  → dining   (matches /food|dining|drink/)
 *   "Groceries"     → groceries (matches /grocery|groceries/)
 *   "Gas"           → travel_other (matches /travel|gas/)
 *   "Travel"        → travel_other (matches /travel|gas/)
 *   "Entertainment" → display only (falls through to 'other' for points)
 *   "Shopping"      → display only
 *   etc.
 */

interface MerchantRule {
  pattern: RegExp;
  category: string;
}

const RULES: MerchantRule[] = [
  // ── Airlines (description-based, classifyTxn also catches these) ──
  {
    pattern:
      /\b(DELTA|UNITED\s+AIR|AMERICAN\s+AIR|SOUTHWEST|JETBLUE|JET\s*BLUE|ALASKA\s+AIR|SPIRIT\s+AIR|FRONTIER\s+AIR|HAWAIIAN\s+AIR|ALLEGIANT|SUN\s+COUNTRY|AIR\s+CANADA|BRITISH\s+AIR|LUFTHANSA|EMIRATES|QATAR\s+AIR|SINGAPORE\s+AIR|KOREAN\s+AIR|ANA\s+AIR|JAL\b|CATHAY|VIRGIN\s+ATL|ICELANDAIR|NORWEGIAN\s+AIR|RYANAIR|EASYJET|WIZZ\s+AIR)\b/i,
    category: "Travel",
  },

  // ── Hotels ──
  {
    pattern:
      /\b(MARRIOTT|HILTON|HYATT|IHG\b|HOLIDAY\s+INN|RESIDENCE\s+INN|COURTYARD|WESTIN\b|SHERATON|HAMPTON\s+INN|DOUBLETREE|EMBASSY\s+SUITE|FAIRFIELD|SPRINGHILL|W\s+HOTEL|RITZ.CARLTON|FOUR\s+SEASONS|ST\.?\s*REGIS|BEST\s+WESTERN|WYNDHAM|RADISSON|OMNI\b|INTERCONTINENTAL|CROWNE\s+PLAZA|KIMPTON|ALOFT|LA\s+QUINTA|MOTEL\s+6|SUPER\s+8|DAYS\s+INN|COMFORT\s+INN|QUALITY\s+INN|EXTENDED\s+STAY)\b/i,
    category: "Travel",
  },

  // ── Airbnb / VRBO ──
  { pattern: /\bAIRBNB\b|\bVRBO\b/i, category: "Travel" },

  // ── Food delivery ──
  {
    pattern:
      /UBER\s*\*?\s*EATS|DOORDASH|DD\s*\*?\s*DOORDASH|GRUBHUB|POSTMATES|CAVIAR|SEAMLESS/i,
    category: "Food & Drink",
  },

  // ── Rideshare ──
  { pattern: /\bLYFT\b|\bUBER\s+TRIP\b|\bUBER\s+\*TRIP/i, category: "Travel" },

  // ── Streaming ──
  {
    pattern:
      /\b(NETFLIX|HULU|DISNEY\+?|SPOTIFY|APPLE\.COM\/BILL|YOUTUBE\s*(PREMIUM|TV)|HBO|PARAMOUNT\+?|PEACOCK|ESPN\+?|SLING\s*TV|AMAZON\s*(PRIME\s*VIDEO|VIDEO)|TIDAL|AUDIBLE|PANDORA|SIRIUSXM|CRUNCHYROLL|DISCOVERY\+?|MAX\.COM)\b/i,
    category: "Entertainment",
  },

  // ── Online groceries ──
  {
    pattern:
      /\b(INSTACART|AMAZON\s*FRESH|AMAZONFRESH|WHOLE\s+FOODS\s+ONLINE|SHIPT|FRESHDIRECT|THRIVE\s+MARKET|HUNGRYROOT|MISFITS\s+MARKET|IMPERFECT\s+FOODS)\b/i,
    category: "Groceries",
  },

  // ── Gas — major chains ──
  {
    pattern:
      /\b(SHELL\s+(OIL|SERV)|CHEVRON|EXXON|MOBIL\b|BP\b|TEXACO|SUNOCO|VALERO|CITGO|ARCO\b|MARATHON\s*(GAS|PETR)|PHILLIPS\s+66|SPEEDWAY|CIRCLE\s+K|QUIKTRIP|QT\s+\d|WAWA|RACETRAC|MURPHY\s*(USA|OIL)|SHEETZ|LOVES\s+TRAVEL|PILOT\s+(TRAVEL|FLYING)|FLYING\s+J|CUMBERLAND\s+FARMS|KWIK\s+TRIP|CASEY.S\s+GEN|KUM\s*&\s*GO|BUCCEES|BUCEE)\b/i,
    category: "Gas",
  },

  // ── Gas — keyword patterns ──
  { pattern: /\b(GAS\s+STATION|FUEL\s+(CENTER|STOP)|PETRO\b|PETROLEUM)\b/i, category: "Gas" },

  // ── Grocery — major chains ──
  {
    pattern:
      /\b(KROGER|SAFEWAY|ALBERTSONS|PUBLIX|H[\s-]?E[\s-]?B\b|MEIJER|ALDI\b|TRADER\s+JOE|WHOLE\s+FOODS|FOOD\s+LION|GIANT\s+(FOOD|EAGLE)|STOP\s*&\s*SHOP|SHOPRITE|WEGMANS|SPROUTS|HARRIS\s+TEETER|WINCO|PIGGLY|HY[\s-]?VEE|FRED\s+MEYER|FRYS\s+FOOD|RALPHS|VONS\b|KING\s+SOOPERS|SMITHS\s+(FOOD|MARKET)|MARKET\s+BASKET|FOOD\s*4\s*LESS|SAVE[\s-]?A[\s-]?LOT|FOODMAXX|STATER\s+BROS|LUCKY\s+SUPER|GROCERY\s+OUTLET|NATURAL\s+GROCERS)\b/i,
    category: "Groceries",
  },

  // ── Wholesale ──
  {
    pattern: /\b(COSTCO|SAMS\s+CLUB|SAM'?S\s+CLUB|BJS\s+WHOLESALE|BJ'?S\s+WHOL)\b/i,
    category: "Groceries",
  },

  // ── Fast food / major restaurant chains ──
  {
    pattern:
      /\b(MCDONALD|BURGER\s+KING|WENDY'?S|TACO\s+BELL|CHICK[\s-]?FIL[\s-]?A|CHIPOTLE|SUBWAY\b|KFC\b|POPEYES|FIVE\s+GUYS|IN[\s-]?N[\s-]?OUT|JACK\s+IN\s+THE|SONIC\s+DRIVE|ARBY'?S|PANDA\s+EXPRESS|PANERA|JIMMY\s+JOHN|JERSEY\s+MIKE|FIREHOUSE\s+SUB|WINGSTOP|RAISING\s+CANE|WHATABURGER|CARL'?S\s+JR|HARDEES|CULVERS|ZAXBY|SHAKE\s+SHACK|SMASHBURGER|NOODLES\s*&\s*CO|CHILIS|APPLEBEES|OLIVE\s+GARDEN|RED\s+LOBSTER|OUTBACK\s+STEAK|TEXAS\s+ROADHOUSE|TGI\s+FRIDAY|BUFFALO\s+WILD|DENNYS|IHOP\b|CRACKER\s+BARREL|CHEESECAKE\s+FACT|P\s*\.?\s*F\s*\.?\s*CHANG|LONGHORN\s+STEAK|WAFFLE\s+HOUSE|STARBUCKS|DUNKIN|PEETS\s+COFFEE|TIM\s+HORTON|DUTCH\s+BROS|CARIBOU\s+COFFEE|DOMINOS|PIZZA\s+HUT|PAPA\s+JOHN|LITTLE\s+CAESARS|BASKIN\s+ROBB|DAIRY\s+QUEEN|COLD\s+STONE|JAMBA|SMOOTHIE\s+KING|TROPICAL\s+SMOOTHIE|KRISPY\s+KREME|SWEETGREEN|CAVA\b|WINGSTOP|PORTILLOS|BONEFISH|HABIT\s+BURGER|COOKOUT|ZOES\s+KITCHEN|MOD\s+PIZZA|BLAZE\s+PIZZA|PIEOLOGY)\b/i,
    category: "Food & Drink",
  },

  // ── Restaurant keyword patterns (catches most sit-down restaurants) ──
  {
    pattern:
      /\b(RESTAURANT|RISTORANTE|RESTAU|CAFE\b|CAFFÉ|COFFEE\s+(SHOP|HOUSE|BEAN)|DINER\b|BISTRO|BRASSERIE|TRATTORIA|OSTERIA|PIZZERIA|TAQUERIA|CANTINA|STEAKHOUSE|STEAK\s+HOUSE|CHOPHOUSE|GRILL\s*(HOUSE|ROOM|\b)|GRILLE\b|BBQ|BARBEQUE|BARBECUE|SMOKEHOUSE|SEAFOOD|SUSHI|RAMEN|POKE\b|PHO\b|THAI\s+(CUISINE|FOOD|KITCHEN)|WOK\b|NOODLE|DUMPLING|DIM\s+SUM|TERIYAKI|HIBACHI|TEPPAN|KOREAN\s+(BBQ|FOOD|KITCHEN)|CHINESE\s+(FOOD|KITCHEN|RESTAURANT)|INDIAN\s+(CUISINE|FOOD|KITCHEN)|MEXICAN\s+(FOOD|KITCHEN|GRILL|RESTAURANT)|ITALIAN\s+(KITCHEN|BISTRO|RESTAURANT)|BURRITO|TACO\s+(SHOP|STAND)|BURGER\b|WING\s*(S|Z)\b|SANDWICH|DELI\b|DELICATESSEN|BAKERY|BAKE\s+SHOP|PATISSERIE|CREPERIE|GELATO|FROZEN\s+YOGURT|FROYO|BOBA|BUBBLE\s+TEA|JUICE\s+BAR|SMOOTHIE|BREWERY|BREW\s*(PUB|HOUSE)|TAPROOM|TAPHOUSE|TAVERN|PUB\b|BAR\s+AND\s+GRILL|SALOON|LOUNGE|WINE\s+BAR|COCKTAIL|FOOD\s+(TRUCK|HALL|COURT)|KITCHEN\b|EATERY|EATS\b|CATERING|DONUT|DOUGHNUT|BAGEL|BRUNCH|PANCAKE|WAFFLE|WINGZ|PITA|FALAFEL|GYRO|KEBAB|SHAWARMA|CURRY)\b/i,
    category: "Food & Drink",
  },

  // ── Drugstore / Pharmacy ──
  {
    pattern: /\b(CVS|WALGREENS|RITE\s+AID|DUANE\s+READE|PHARMACY|PHARMA\b)\b/i,
    category: "Health & Wellness",
  },

  // ── Gym / Fitness ──
  {
    pattern:
      /\b(PLANET\s+FITNESS|LA\s+FITNESS|EQUINOX|GOLDS\s+GYM|ANYTIME\s+FIT|ORANGETHEORY|CROSSFIT|SOULCYCLE|PELOTON|YMCA|24\s+HOUR\s+FIT|CRUNCH\s+FIT|LIFE\s+TIME\s+FIT|GYM\b|FITNESS\s+(CENTER|CLUB))\b/i,
    category: "Health & Wellness",
  },

  // ── Car rental / travel ──
  {
    pattern:
      /\b(HERTZ|ENTERPRISE\s+RENT|AVIS\b|BUDGET\s+RENT|NATIONAL\s+CAR|ALAMO\s+RENT|DOLLAR\s+RENT|THRIFTY|ZIPCAR|TURO\b|SIXT\b)\b/i,
    category: "Travel",
  },

  // ── Travel booking ──
  {
    pattern:
      /\b(EXPEDIA|BOOKING\.COM|HOTELS\.COM|KAYAK|PRICELINE|TRAVELOCITY|TRIPADVISOR|HOPPER|ORBITZ|CHEAPTICKETS)\b/i,
    category: "Travel",
  },

  // ── Home improvement ──
  {
    pattern:
      /\b(HOME\s+DEPOT|LOWES|MENARDS|ACE\s+HARDWARE|TRUE\s+VALUE|HARBOR\s+FREIGHT)\b/i,
    category: "Home",
  },

  // ── Electronics ──
  {
    pattern: /\b(BEST\s+BUY|APPLE\s+STORE|MICROSOFT\s+STORE|B\s*&?\s*H\s+PHOTO|MICRO\s+CENTER)\b/i,
    category: "Shopping",
  },

  // ── Department / retail ──
  {
    pattern:
      /\b(TARGET|WALMART(?!\s*(GROCERY|\.COM\/GROCERY))|NORDSTROM|MACYS|KOHLS|JCPENNEY|TJ\s*MAXX|TJMAXX|MARSHALLS|ROSS\s+STORES|BURLINGTON\s+COAT|HOMEGOODS|SAKS\s+FIFTH|BLOOMINGDALE|NEIMAN\s+MARCUS|AMAZON\.COM|AMZN)\b/i,
    category: "Shopping",
  },

  // ── Walmart grocery specifically ──
  {
    pattern: /WALMART\s*(GROCERY|\.COM\/GROCERY)/i,
    category: "Groceries",
  },

  // ── Auto ──
  {
    pattern:
      /\b(AUTOZONE|O'?REILLY\s+AUTO|ADVANCE\s+AUTO|JIFFY\s+LUBE|VALVOLINE|MIDAS\b|PEP\s+BOYS|DISCOUNT\s+TIRE|FIRESTONE|GOODYEAR|MAACO|MEINEKE|SAFELITE)\b/i,
    category: "Automotive",
  },

  // ── Utilities / telecom keyword patterns ──
  {
    pattern:
      /\b(AT&T|ATT\b|VERIZON|T-?MOBILE|COMCAST|XFINITY|SPECTRUM|COX\s+COMM|CENTURYLINK|OPTIMUM|ELECTRIC\b|POWER\s+CO|WATER\s+(DEPT|UTIL)|GAS\s+CO|UTILITY|UTILIT)\b/i,
    category: "Bills & Utilities",
  },

  // ── Insurance ──
  {
    pattern:
      /\b(GEICO|STATE\s+FARM|PROGRESSIVE|ALLSTATE|LIBERTY\s+MUTUAL|USAA|FARMERS\s+INS|NATIONWIDE\s+INS|INSURANCE)\b/i,
    category: "Bills & Utilities",
  },

  // ── Subscriptions ──
  {
    pattern:
      /\b(ADOBE|MICROSOFT\s+365|GOOGLE\s+(ONE|STORAGE)|DROPBOX|ICLOUD|ZOOM\s*(US|VIDEO)|NOTION|EVERNOTE)\b/i,
    category: "Entertainment",
  },
];

/**
 * Attempt to categorize a merchant description using keyword patterns.
 * Returns a category string or null if no pattern matches.
 */
export function lookupMerchantCategory(description: string): string | null {
  if (!description) return null;
  for (const rule of RULES) {
    if (rule.pattern.test(description)) {
      return rule.category;
    }
  }
  return null;
}
