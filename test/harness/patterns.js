/*
 * Ad-server URL patterns for request classification.
 *
 * Tier 1: bid endpoints / SSP auction / tracking tags
 * Tier 2: creative CDN / image hosts where the actual ad body is served
 *
 * Both count as "ad requests" for counting purposes — from a user's
 * perspective an unblocked creative fetch is still an ad load.
 *
 * JP-heavy coverage: Geniee, Fluct/adingo, i-mobile, Zucks, AMoAd, Nend,
 * Adstir, MicroAd, Yahoo Yads, Intimate Merger, Cxense, Browsi, D2C,
 * SoCDM, Aman/TrueData, DC Tag, Nakanohito.
 */
const AD_SERVER_PATTERNS = [
  /* tier 1 — Google / Amazon / classic SSP */
  /doubleclick\.net\//,
  /googlesyndication\.com\//,
  /googletagservices\.com\//,
  /googletagmanager\.com\/gtag/,
  /pubads\.g\.doubleclick\.net/,
  /safeframe\.googlesyndication\.com/,
  /pagead2\.googlesyndication\.com/,
  /adservice\.google\.(com|co\.jp)/,
  /fundingchoicesmessages\.google\.com/,
  /adtrafficquality\.google/,
  /google-analytics\.com\//,
  /analytics\.google\.com\//,
  /amazon-adsystem\.com\//,
  /criteo\.(com|net)\//,
  /ib\.adnxs\.com/,
  /rubiconproject\.com\//,
  /openx\.net\//,
  /pubmatic\.com\//,
  /adform\.net\//,
  /taboola\.com\//,
  /outbrain\.com\//,

  /* tier 1 — Yahoo JP */
  /yjtag\.yahoo\.co\.jp/,
  /s\.yimg\.jp\/.*\/ad/,
  /yads\.yahoo\.co\.jp/,
  /clb\.yahoo\.co\.jp/,
  /dsb\.yahoo\.co\.jp/,
  /\/\/yie\.jp\//,

  /* tier 1 — JP SSP / DMP */
  /gssprt\.jp\//,
  /cpt\.geniee\.jp/,
  /adingo\.jp\//,
  /fout\.jp\//,
  /i-mobile\.co\.jp\/(script|banner|ad)/,
  /zucks\.(co\.jp|net)\//,
  /amoad\.com\//,
  /nend\.net\//,
  /ad-stir\.com\//,
  /microad\.jp\//,
  /impact-ad\.jp\//,
  /im-apps\.net\//,
  /cxense\.com\//,
  /nakanohito\.jp\//,
  /amanad\.adtdp\.com\//,
  /socdm\.com\//,
  /ladsp\.com\//,
  /dc-tag\.jp\//,
  /hera\.d2c\.ne\.jp\//,
  /webpush\.jp\//,

  /* tier 1 — global SSP / DSP / cookie sync */
  /id5-sync\.com\//,
  /browsiprod\.com\//,
  /adsrvr\.org\//,                /* TheTradeDesk (was: match.adsrvr.org only) */
  /tapad\.com\//,
  /lijit\.com\//,
  /s-onetag\.com\//,
  /ad-delivery\.net\//,
  /ads-twitter\.com\//,
  /analytics\.twitter\.com\//,
  /connect\.facebook\.net\//,

  /* tier 1 — viewability / brand safety */
  /adsafeprotected\.com\//,
  /moatads\.com\//,
  /scorecardresearch\.com\//,

  /* tier 2 — creative CDN */
  /tpc\.googlesyndication\.com/,
  /static\.criteo\.(com|net)/,
  /images\.criteo\.(com|net)/,
  /cas\.criteo\.com/,
  /ads\.yahoo\.co\.jp/,
  /amg\.yahoo\.co\.jp/,
  /m\.webtrends\.com/,
  /img\.ak\.impact-ad\.jp/,
  /img\.i-mobile\.co\.jp/,
  /cdn\.adingo\.jp/,
  /cdn\.id5-sync\.com/,

  /* 2026-05-01 audit: corpus HAR で既存リストから漏れた広告ホスト */
  /yads\.c\.yimg\.jp/,                    /* Yahoo yads-async.js CDN */
  /casalemedia\.com\//,                   /* Index Exchange SSP */
  /bidswitch\.net\//,                     /* BidSwitch cookie-sync */
  /flux-cdn\.com\//,                      /* GeoEdge ad-quality */
  /rumcdn\.geoedge\.be\//,                /* GeoEdge ad-quality */
  /\/\/t\.co\/i\/adsct/,                  /* Twitter ad conversion pixel */
  /www\.facebook\.com\/privacy_sandbox\/pixel/, /* FB Privacy Sandbox conv */
  /cdn\.jsdelivr\.net\/gh\/prebid/,       /* Prebid.js currency-file */
  /transcend-cdn\.com/,                   /* CMP — count only, not blocked */

  /* 2026-05-01 audit (round 2): 廃止 HAR + 旧 corpus からの拾い直し */
  /admatrix\.jp\//,                       /* PolymorphicAds DSP (4gamer 専属) */
  /polymorphicads\.jp\//,                 /* PolymorphicAds CDN */
  /stat\.amebame\.com\/pub\/ads/,         /* Ameba ads serving */
  /meas\.ad\.pr\.ameba\.jp\//,            /* Ameba PR measurement */
  /4dex\.io\//,                           /* Prebid Analytics */
  /ups\.analytics\.yahoo\.com/,           /* Yahoo Unified Profile Sync */
  /sy\.ameblo\.jp\/sync/,                 /* Ameblo cookie sync */
  /semasio\.net\//,                       /* Semasio DMP */
  /a-mo\.net\//,                          /* AMobee SSP */
  /nexx360\.io\//,                        /* Nexx360 SSP */
  /cdn\.jsdelivr\.net\/npm\/prebid/,      /* Prebid universal-creative */
  /www\.temu\.com\/api\/adx/,             /* Temu adx pixel (path-limited) */

  /* 2026-05-01 audit (round 3): live scan of gamewith/game8/alfalfalfa/jin115/
     gendai.media/nikkansports — vast SSP/DSP long-tail. Where multiple
     subdomains hit, parent registrable domain is used to cover the whole net. */
  /* — DSP / SSP global — */
  /dotomi\.com\//,                        /* Conversant cookie match */
  /smartadserver\.com\//,                 /* Smart AdServer */
  /360yield\.com\//,                      /* Improve Digital */
  /adkernel\.com\//,                      /* AdKernel */
  /contextweb\.com\//,                    /* Contextweb (PubMatic) */
  /yieldmo\.com\//,                       /* Yieldmo */
  /sharethrough\.com\//,                  /* Sharethrough */
  /loopme\.me\//,                         /* LoopMe */
  /moloco\.com\//,                        /* Moloco DSP */
  /blismedia\.com\//,                     /* Blis */
  /goldspotmedia\.com\//,                 /* GoldSpot */
  /btloader\.com\//,                      /* Sortable BurstThroughLoader */
  /dns-finder\.com\//,                    /* DNS Finder */
  /fastclick\.net\//,                     /* FastClick */
  /mfadsrvr\.com\//,                      /* MFAdsrvr */
  /pmbmonetize\.live\//,                  /* PMBMonetize */
  /rtbhouse\.com\//,                      /* RTB House */
  /creativecdn\.com\//,                   /* RTB House creative CDN */
  /2mdn\.net\//,                          /* Google video creative */
  /teads\.tv\//,                          /* Teads */
  /mathtag\.com\//,                       /* MediaMath */
  /gumgum\.com\//,                        /* GumGum */
  /amxrtb\.com\//,                        /* AMX RTB */
  /amx1\.net\//,                          /* AMX 1 */
  /simpli\.fi\//,                         /* Simpli.fi */
  /richaudience\.com\//,                  /* RichAudience */
  /fwmrm\.net\//,                         /* FreeWheel */
  /zemanta\.com\//,                       /* Outbrain Zemanta */
  /outbrainimg\.com\//,                   /* Outbrain creative CDN */
  /advolve\.io\//,                        /* Advolve */
  /adtarget\.biz\//,                      /* AdTarget */
  /durationmedia\.net\//,                 /* Duration Media */
  /deepintent\.com\//,                    /* DeepIntent */
  /trustedstack\.com\//,                  /* TrustedStack */
  /ymmobi\.com\//,                        /* YM Mobi */
  /sportradarserving\.com\//,             /* Sportradar */
  /intentiq\.com\//,                      /* IntentIQ */
  /smaato\.net\//,                        /* Smaato */
  /unrulymedia\.com\//,                   /* Unruly (Tremor) */
  /playdigo\.com\//,                      /* Playdigo */
  /betweendigital\.com\//,                /* BetweenDigital */
  /confiant-integrations\.net\//,         /* Confiant ad-security */
  /privacymanager\.io\//,                 /* PrivacyManager CMP */
  /appier\.net\//,                        /* Appier */
  /pippio\.com\//,                        /* LiveRamp Pippio */
  /quantserve\.com\//,                    /* Quantcast */
  /inmobi\.com\//,                        /* InMobi */
  /liftdsp\.com\//,                       /* Lift DSP */
  /adrecover\.com\//,                     /* AdRecover */
  /anymind360\.com\//,                    /* AnyMind ATS */
  /img-c\.net\//,                         /* MicroAd creative */
  /lmadps\.jp\//,                         /* Lemma */
  /mediago\.io\//,                        /* MediaGo */

  /* — DMP / data / brand-safety — */
  /rlcdn\.com\//,                         /* LiveRamp */
  /crwdcntrl\.net\//,                     /* Lotame */
  /doubleverify\.com\//,                  /* DoubleVerify viewability */
  /media\.net\//,                         /* Media.net ad network */
  /opecloud\.com\//,                      /* OpeCloud */
  /ccgateway\.net\//,                     /* Permutive */
  /travelaudience\.com\//,                /* TravelAudience */

  /* — JP-specific — */
  /a\.flux\.jp\//,                        /* Flux SSP analytics */
  /rtbrain\.app\//,                       /* RTBrain */
  /adpushup\.com\//,                      /* AdPushup */
  /speee-ad\.jp\//,                       /* Speee 広告 */
  /speee-ad\.akamaized\.net\//,           /* Speee CDN */
  /gsspcln\.jp\//,                        /* Geniee Cleantag */
  /genieesspv\.jp\//,                     /* Geniee SSP V */
  /mgid\.com\//,                          /* MGID (was: cdn/jsc only) */
  /b99\.yahoo\.co\.jp\//,                 /* Yahoo conversion */
  /cdp\.livedoor\.com\//,                 /* Livedoor CDP */
  /counter2\.blog\.livedoor\.com\//,      /* Livedoor counter */
  /t\.blog\.livedoor\.jp\//,              /* Livedoor tracking */
  /ipcheck\.blogsys\.jp\//,               /* Blogsys IP check */
  /cadmus2\.script\.ac\//,                /* Cadmus (script.ac全体は危険) */
  /imp-bidapi\.i-mobile\.co\.jp\//,       /* i-mobile bidapi */
  /spimgv1\.i-mobile\.co\.jp\//,          /* i-mobile creative */
  /spnativeapi-direct\.i-mobile\.co\.jp\//, /* i-mobile native */
  /spnativeapi-tls\.i-mobile\.co\.jp\//,  /* i-mobile native */
  /afl\.rakuten\.co\.jp\//,               /* Rakuten affiliate */
  /xml\.affiliate\.rakuten\.co\.jp\//,    /* Rakuten widget */

  /* — path-only — */
  /serv\.ds\.kakao\.com\/adx/,            /* Kakao Adx */
  /px\.ads\.linkedin\.com/,               /* LinkedIn ads pixel */
];

function isAdUrl(url) {
  for (const pat of AD_SERVER_PATTERNS) if (pat.test(url)) return true;
  return false;
}

module.exports = { AD_SERVER_PATTERNS, isAdUrl };
