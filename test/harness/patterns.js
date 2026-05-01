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

  /* 2026-05-01 audit (round 4): live scan of 16 sites — added newspapers
     (mainichi/asahi/sankei/sponichi), business mags (president/toyokeizai/
     bunshun/diamond), nlab.itmedia, yaraon. Surfaced JP-news SSP stack +
     more global header-bidding networks. */
  /* — DSP / SSP / cookie-sync — */
  /syncingbridge\.com\//,                 /* user-sync bridge */
  /eyeota\.net\//,                        /* DMP */
  /ad-m\.asia\//,                         /* Ad-Mate Asia */
  /relaido\.jp\//,                        /* Relaido video */
  /piano\.io\//,                          /* Piano DMP / paywall analytics */
  /shinobi\.jp\//,                        /* Shinobi adv */
  /bance\.jp\//,                          /* Bance SSP/DSP family */
  /liadm\.com\//,                         /* LiveIntent */
  /caprofitx\.com\//,                     /* CA ProFitX */
  /connatix\.com\//,                      /* Connatix video */
  /nrich\.ai\//,                          /* Nrich DSP */
  /4dex\.tech\//,                         /* 4dex tech (sister of 4dex.io) */
  /insiad\.com\//,                        /* InsiAd */
  /primis\.tech\//,                       /* Primis */
  /gsspat\.jp\//,                         /* Geniee SSP-AT */
  /indexww\.com\//,                       /* Index Exchange */
  /hubvisor\.io\//,                       /* Hubvisor */
  /agkn\.com\//,                          /* Aki Tech */
  /w55c\.net\//,                          /* DataXu */
  /yellowblue\.io\//,                     /* YellowBlue */
  /admanmedia\.com\//,                    /* Adman Media */
  /gmossp-sp\.jp\//,                      /* GMO SSP */
  /measureadv\.com\//,                    /* MeasureAdv */
  /sparteo\.com\//,                       /* Sparteo */
  /sitescout\.com\//,                     /* Centro/SiteScout */
  /everesttech\.net\//,                   /* Adobe Everest DSP */
  /colossusssp\.com\//,                   /* Colossus SSP */
  /openxcdn\.net\//,                      /* OpenX CDN */
  /ipredictive\.com\//,                   /* Adelphic */
  /krushmedia\.com\//,                    /* Krush Media */
  /turn\.com\//,                          /* Amobee Turn */
  /imrworldwide\.com\//,                  /* Nielsen */
  /smartadhi\.com\//,                     /* SmartAdhi */
  /springserve\.com\//,                   /* SpringServe */
  /tremorhub\.com\//,                     /* Tremor */
  /fireworktv\.com\//,                    /* Firework */
  /d2-apps\.net\//,                       /* D2-apps */
  /monetixads\.com\//,                    /* MonetixAds */
  /ocmthood\.com\//,                      /* OCMTHood */
  /bricks-co\.com\//,                     /* Bricks */
  /mulan\.cloud\//,                       /* Mulan */
  /sp-trk\.com\//,                        /* sp-trk */
  /pushmaster-cdn\.xyz\//,                /* PushMaster */
  /ust-ad\.com\//,                        /* UST Ad */
  /mediarithmics\.com\//,                 /* Mediarithmics */
  /omnitagjs\.com\//,                     /* Omni */
  /chartbeat\.(com|net)\//,               /* Chartbeat analytics */
  /exelator\.com\//,                      /* Nielsen Exelate */
  /macromill\.com\//,                     /* Macromill */
  /npttech\.com\//,                       /* NPTTech */
  /slim02\.jp\//,                         /* Slim02 DSP */
  /smartnews-ads\.com\//,                 /* SmartNews Ads */
  /pa-cd\.com\//,                         /* パークリック */
  /fwpub1\.com\//,                        /* fwpub1 (FreeWheel pub) */
  /fwpixel\.com\//,                       /* fwpixel */
  /salesforce\.com\/web\/v2\/authentication/, /* SF c360a auth — narrow */

  /* — Yahoo / Google / LINE specifics (host-precise) — */
  /apm\.yahoo\.co\.jp\//,                 /* Yahoo PPM */
  /cksync\.yahoo\.co\.jp\//,              /* Yahoo cookie sync */
  /im\.c\.yimg\.jp\//,                    /* Yahoo display creative */
  /imasdk\.googleapis\.com\//,            /* Google IMA video ads SDK */
  /\/\/c\.bing\.com\/c\.gif/,             /* Bing tracking */
  /fluctssp\.smt\.docomo\.ne\.jp\//,      /* DOCOMO Fluct SSP */
  /tr\.line\.me\//,                       /* LINE Tag */
  /d\.line-scdn\.net\/n\/line_tag/,       /* LINE Tag CDN (path) */
  /\/\/c360a\.salesforce\.com\//,         /* Salesforce CDP */
  /adsdkprod\.azureedge\.net\//,          /* CA viewability SDK */
  /miyuki-web\.net\//,                    /* miyuki-web (was: edayo only) */
  /ssp-sync\.i-mobile\.co\.jp\//,         /* i-mobile sync */
  /www\.temu\.com\/api\/x/,               /* Temu /api/x pixel */

  /* 2026-05-01 audit (round 5): live scan extended to 30 sites — added
     IT/gaming/lifestyle/job/matome categories. Surfaced GAM/AAM long tail. */
  /* — Path-based — */
  /www\.google\.com\/ccm\//,              /* Google Conversion Manager */
  /www\.google\.co\.jp\/ads\/ga-audiences/, /* Google Ads audience */
  /csi\.gstatic\.com\/csi/,               /* Google CSI */
  /yandex\.ru\/an\/mapuid/,               /* Yandex ad mapuid */
  /\/\/odr\.mookie1\.com\//,              /* Xandr Mookie */
  /a9\.amazon\.dev\/csm\//,               /* Amazon adsq tungsten */
  /\.tq-tungsten\.com\//,                 /* Amazon Tungsten 2nd */

  /* — DSP / SSP / cookie-sync (suffix) — */
  /3lift\.com\//,                         /* TripleLift */
  /presage\.io\//,                        /* Presage */
  /1rx\.io\//,                            /* Rhythmone */
  /demdex\.net\//,                        /* Adobe Audience Manager */
  /bidr\.io\//,                           /* RTBHouse Beeswax */
  /stackadapt\.com\//,                    /* StackAdapt */
  /uncn\.jp\//,                           /* UNICOIN DMP */
  /admatic\.de\//,                        /* AdMatic.de */
  /seedtag\.com\//,                       /* Seedtag */
  /clvrads\.com\//,                       /* clvrads */
  /nextmillmedia\.com\//,                 /* Next Millennium */
  /onetag-sys\.com\//,                    /* OneTag SYS */
  /sp-gn\.com\//,                         /* SP-GN */
  /servenobid\.com\//,                    /* ServeNobid */
  /cootlogix\.com\//,                     /* Cootlogix */
  /bfmio\.com\//,                         /* Beachfront */
  /ingage\.tech\//,                       /* Ingage */
  /nr-data\.net\//,                       /* New Relic Browser */
  /aiasahi\.jp\//,                        /* Asahi advertising */
  /adobedtm\.com\//,                      /* Adobe DTM */
  /omtrdc\.net\//,                        /* Adobe Marketing Cloud */
  /clmbtech\.com\//,                      /* Columbus */
  /aralego\.com\//,                       /* Aralego */
  /presco\.asia\//,                       /* Presco */
  /company-target\.com\//,                /* Company Target */
  /tiktokw\.us\//,                        /* TikTok analytics */
  /brand-display\.com\//,                 /* Brand Display DMP */
  /adotmob\.com\//,                       /* Adotmob */
  /cnobi\.jp\//,                          /* cnobi */
  /seenthis\.se\//,                       /* Seenthis */
  /onesignal\.com\//,                     /* OneSignal push */
  /nowads\.com\//,                        /* nowads */
  /adsboosters\.xyz\//,                   /* adsboosters */
  /zimg\.jp\//,                           /* Zucks image CDN */
  /cloudflareinsights\.com\//,            /* CF Web Analytics */
  /connectid\.analytics\.yahoo\.com\//,   /* Yahoo ConnectID */
  /rfihub\.com\//,                        /* Rocket Fuel */
];

function isAdUrl(url) {
  for (const pat of AD_SERVER_PATTERNS) if (pat.test(url)) return true;
  return false;
}

module.exports = { AD_SERVER_PATTERNS, isAdUrl };
