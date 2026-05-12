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
  /adtdp\.com\//,                 /* CyberAgent (amanad/dynalyst-sync 等) */
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

  /* 2026-05-01 audit (round 6): live scan extended to 40 sites (job/EC/niche)
     + ABP-JP filter list (k2jp/abp-japanese-filters) cross-check. */
  /* — Path-based — */
  /www\.google\.com\/rmkt\/collect\//,    /* Google Remarketing — 31-site spread */
  /www\.google\.co\.jp\/pagead\/1p-user-list\//, /* Google 1p user list */
  /xmtrading\.com\/affiliate_tracking/,   /* XM affiliate */

  /* — Live-scan additions (suffix) — */
  /r-ad\.ne\.jp\//,                       /* Recruit ad network */
  /r-adimg\.com\//,                       /* Recruit ad image CDN */
  /iqm\.com\//,                           /* IQM Corp */
  /flvcdn\.net\//,                        /* FlvCDN tag */
  /seseasky\.com\//,                      /* SeaSky obs */
  /paa-reporting-advertising\.amazon\//,  /* Amazon PAA reporting */
  /rtbsystem\.com\//,                     /* RTB System */
  /adentifi\.com\//,                      /* Adentifi */
  /kargo\.com\//,                         /* Kargo */
  /loudecho\.ai\//,                       /* LoudEcho */
  /adroll\.com\//,                        /* AdRoll */
  /monetize-ssp\.com\//,                  /* Monetize SSP */
  /adlion\.jp\//,                         /* Adlion */
  /slim01\.jp\//,                         /* Slim01 (sister of slim02) */
  /robee\.tech\//,                        /* Robee */
  /marketo\.net\//,                       /* Marketo */
  /contentsquare\.net\//,                 /* ContentSquare */
  /advortex\.cloud\//,                    /* Advortex */
  /cms\.analytics\.yahoo\.com\//,         /* Yahoo CMS analytics */
  /dataplane\.rum\.[a-z0-9-]+\.amazonaws\.com\//, /* AWS RUM analytics */

  /* — ABP-JP cross-check additions — */
  /* Media-publisher own ad serving SDs */
  /ad\.ameba\.jp\//,                      /* Ameba ads */
  /ad\.goo\.ne\.jp\//,                    /* goo */
  /ad\.hatena\.ne\.jp\//,                 /* Hatena */
  /ad\.mainichi\.jp\//, /an\.mainichi\.jp\//, /* Mainichi */
  /ad\.ntv\.co\.jp\//,                    /* NTV */
  /ad\.response\.jp\//,                   /* Response */
  /ad\.watch\.impress\.co\.jp\//, /ngs\.impress\.co\.jp\//, /* Impress */
  /adcl\.sankei\.co\.jp\//,               /* Sankei */
  /bizad\.nikkeibp\.co\.jp\//,            /* Nikkei BP */
  /b\.gnavi\.co\.jp\//,                   /* Gnavi */
  /imp\.allabout\.co\.jp\//, /mtx\.allabout\.co\.jp\//, /* AllAbout */
  /adimp\.excite\.co\.jp\//, /p4p\.excite\.co\.jp\//, /* Excite */
  /track\.hatena\.ne\.jp\//, /red\.hatena\.ne\.jp\//, /* Hatena tracking */
  /* Rakuten ad / tool subdomains */
  /dynamic\.rakuten\.co\.jp\//,
  /etool\.rakuten\.co\.jp\//,
  /pitatto\.rakuten\.co\.jp\//,
  /ias\.rakuten\.co\.jp\//,
  /* Independent ad-tech vendors (still active per cross-check) */
  /4dsply\.com\//,                        /* 4Dsply */
  /actionrtb\.com\//,                     /* Action RTB */
  /ads2rtb\.com\//,                       /* Ads2RTB */
  /contextrtb\.com\//,                    /* Context RTB */
  /rtbads\.info\//, /rtbidder\.net\//,    /* RTB ad networks */
  /rtbinternet\.com\//, /rtbtraf\.com\//,
  /acxiom-online\.com\//,                 /* Acxiom */
  /online-metrix\.net\//,                 /* ThreatMetrix */
  /taxel\.jp\//,                          /* Taxel */
  /proparm\.jp\//,                        /* ProParm */
  /mediad2\.jp\//,                        /* MediaD2 */
  /navdmp\.com\//, /navicast\.jp\//,      /* Nav DMP */
  /onedmp\.com\//,                        /* OneDMP */
  /pdmp\.jp\//, /dmpcounter\.com\//, /dtmp\.jp\//, /dtpf\.jp\//, /gmodmp\.jp\//,
  /log-marketing\.jp\//, /mcnt\.jp\//,
  /rtoaster\.jp\//,                       /* Rtoaster CDP */
  /showcase-tv\.jp\//,                    /* Showcase Adv */
  /microadinc\.com\//,                    /* MicroAd US */
  /zucks\.jp\//,                          /* Zucks .jp TLD */

  /* 2026-05-01 audit (round 7): EasyList cross-check + adult + mobile SDK. */
  /* — EasyList established vendors — */
  /popads\.net\//,                        /* PopAds */
  /popcash\.net\//,                       /* PopCash */
  /popunder\.(bid|ru)\//,                 /* Popunder */
  /getpopunder\.com\//, /mypopads\.com\//, /* Popunder networks */
  /revcontent\.com\//,                    /* RevContent */
  /tribalfusion\.com\//,                  /* TribalFusion (Exponential) */
  /sociomantic\.com\//,                   /* Sociomantic (Criteo subsidiary) */
  /videoplaza\.tv\//,                     /* VideoPlaza (Ooyala) */
  /spotxchange\.com\//,                   /* SpotX */
  /serverbid\.com\//,                     /* ServerBid */
  /stickyadstv\.com\//,                   /* StickyADS.tv (FreeWheel) */
  /htlbid\.com\//,                        /* HtlBid */
  /kueezrtb\.com\//,                      /* Kueez */
  /metrica-yandex\.com\//,                /* Yandex Metrica */
  /cdn-adtech\.com\//,                    /* AdTech */
  /tradeadexchange\.com\//,               /* TradeAdExchange */
  /uidsync\.net\//,                       /* UID Sync */
  /web\.adblade\.com\//,                  /* AdBlade */
  /genieedmp\.com\//, /genieessp\.com\//, /* Geniee global */
  /adscale\.de\//,                        /* AdScale */
  /adnxs(?:\.net|1\.com|-simple\.com)\//, /* Xandr sisters */
  /googleadservices-cn\.com\//,           /* Google Ads CN */
  /propellerads\.tech\//,                 /* PropellerAds tech */
  /safesync\.com\//,                      /* SafeSync */
  /m-rtb\.com\//,                         /* m-RTB */

  /* — Adult ad networks — */
  /trafficjunky\.net\//,                  /* TrafficJunky (Pornhub) */
  /ero-advertising\.com\//,               /* Ero-Advertising */
  /adultadvertising\.net\//,              /* AdultAdvertising */

  /* 2026-05-12 audit (round 8): live scan extended to 66 sites
     — user-directed (apex-leaks-overwatch2/corocoro/x/facebook/reddit/amazon)
     + manga viewer (comic-walker/comicdays/manga-up)
     + overseas gaming (dexerto/dotesports/pcgamer/eurogamer/polygon/ign/gamespot)
     + EC (rakuten/yahoo-shopping/mercari/yodobashi)
     + SNS (bsky/threads). */
  /* — Overseas gaming SSP/DSP cluster (33across/Opera/Smilewanted/...) — */
  /opera\.com\/(?:pub|sync|setuid|adx|oa)/, /* Opera Mediaworks DSP (t.adx/t.oa) */
  /t\.(?:adx|oa)\.opera\.com\//,           /* Opera DSP hosts */
  /33across\.com\//,                       /* 33across SSP */
  /smilewanted\.com\//,                    /* Smilewanted SSP */
  /rbstsystems\.live\//,                   /* RBST sync */
  /iqzonertb\.live\//,                     /* IQZone RTB */
  /pbs\.optidigital\.com\//, /scripts\.opti-digital\.com\//, /* Opti Digital */
  /eskimi\.com\//,                         /* Eskimi DSP */
  /sundaysky\.com\//,                      /* SundaySky DMP */
  /the-ozone-project\.com\//,              /* Ozone Project SSP */
  /tynt\.com\//,                           /* 33across Tynt */
  /newsroom\.bi\//,                        /* newsroom.bi tracker */
  /a-mx\.com\//, /a-mo\.net\//,            /* AMX DSP (a-mo already; a-mx host) */
  /dv\.tech\//,                            /* DoubleVerify DV (cdn/pub/vtrk) */
  /omni-dex\.io\//,                        /* Omni-Dex exchange */
  /shb-sync\.com\//,                       /* SHB sync */
  /servebom\.com\//,                       /* ServeBom */
  /flashtalking\.com\//,                   /* Flashtalking creative */
  /ck-ie\.com\//,                          /* CK-IE InMobi sync */
  /ghtinc\.com\//,                         /* GHT Inc cookie match */
  /hybrid\.ai\//,                          /* Hybrid.ai DSP */
  /hadronid\.net\//, /hadron\.ad\.gt\//,   /* Hadron ID */
  /cmcd1\.com\//,                          /* CMCD/RhythmOne */
  /ortb\.net\//,                           /* ORTB tracker */
  /pinklion\.io\//,                        /* PinkLion sync */
  /e-volution\.ai\//,                      /* e-volution DSP */
  /admixer\.net\//,                        /* Admixer */
  /ads-tinyorbit\.com\//,                  /* TinyOrbit */
  /sascdn\.com\//,                         /* SmartAdServer CDN */
  /brandmetrics\.com\//,                   /* BrandMetrics */
  /pangle-ads\.com\//,                     /* ByteDance Pangle ads */
  /bidpapers\.com\//,                      /* Bidpapers */
  /infolinks\.com\//,                      /* Infolinks */
  /sentinelpro\.com\//,                    /* Sentinel Pro (Valnet) */
  /cm-exchange\.toast\.com\//, /cm\.nhnace\.com\//, /* NHN/Toast cookie match */
  /rqtrk\.eu\//,                           /* rqtrk EU tracker */
  /pgammedia\.com\//,                      /* PGam Media */
  /aditude\.(?:io|cloud)\//,               /* Aditude (raven/edge/geo) */
  /vidazoo\.com\//,                        /* Vidazoo */
  /clickagy\.com\//,                       /* Clickagy aorta */
  /sonobi\.com\//,                         /* Sonobi */
  /pubeasy\.io\//,                         /* PubEasy */
  /ottadvisors\.com\//,                    /* OTT Advisors */
  /mrf\.io\//,                             /* Marfeel SDK */
  /admaster\.cc\//,                        /* AdMaster */
  /ftstatic\.com\//,                       /* Future static (ajs/agen) */
  /ad-score\.com\//,                       /* Adloox AdScore */
  /anonymised\.io\//, /anonm\.io\//,       /* Anonymised.io DMP */
  /cpmstar\.com\//,                        /* CPMStar */
  /adsninja\.ca\//,                        /* AdsNinja */
  /webcontentassessor\.com\//,             /* WebContentAssessor */
  /pbxai\.com\//,                          /* PBX AI */
  /cpx\.to\//,                             /* CPX */
  /postrelease\.com\//,                    /* Nativo Postrelease */
  /p7cloud\.net\//,                        /* p7cloud (ARCSPAN) */
  /bidgx\.com\//,                          /* bidgx */
  /html-load\.com\//,                      /* html-load creative */
  /clarium\.io\//,                         /* Clarium adblock detect */
  /\.ad\.gt\//,                            /* ad.gt (a.ad.gt/seg.ad.gt) */
  /udmserve\.net\//,                       /* udmserve */
  /dotmetrics\.net\//,                     /* dotmetrics */
  /cinarra\.com\//,                        /* Cinarra */
  /xplosion\.de\//,                        /* Xplosion */
  /acuityplatform\.com\//,                 /* AcuityPlatform */
  /bttrack\.com\//,                        /* bttrack */
  /wikia-services\.com\/__track/,          /* Fandom tracker (path-limited) */
  /wikia\.nocookie\.net\/.*\/prebid/,      /* Fandom prebid (path-limited) */
  /groovinads\.com\//,                     /* GroovinAds */
  /adfarm1\.adition\.com\//,               /* Adition DSP */
  /insightexpressai\.com\//,               /* Kantar InsightExpressAI */
  /trackonomics\.net\//,                   /* Trackonomics */
  /optmn\.cloud\//,                        /* optmn cloud */
  /parsely\.com\//, /p1\.parsely\.com\//,  /* Parse.ly analytics */
  /pbs\.yahoo\.com\/setuid/,               /* Yahoo PBS setuid (path-limited) */
  /i\.viafoura\.co\/v3\/.*\/ingest/,       /* Viafoura ingest (path-limited) */
  /events\.newsroom\.bi\//,                /* newsroom.bi events */
  /sonar\.script\.ac\//,                   /* script.ac sonar (host-limited) */
  /ctnsnet\.com\//,                        /* ctnsnet */
  /mobilefuse\.com\//,                     /* MobileFuse */
  /ml314\.com\//,                          /* ML314 Bombora */
  /pinimg\.com\/ct/, /ct\.pinterest\.com\//, /* Pinterest conv pixel */
  /cookielaw\.org\//,                      /* OneTrust cookielaw (CMP) */
  /cookiebot\.com\//, /consentcdn\.cookiebot\.com\//, /* Cookiebot CMP */
  /link-ag\.net\//,                        /* Link-AG affiliate */
  /valuecommerce\.com\//,                  /* ValueCommerce affiliate */
  /ad-drop\.jp\//,                         /* Ad-Drop JP SSP */
  /authorizedvault\.com\//,                /* Authorized Vault sync */
  /jp1media\.com\//,                       /* JP1 Media */
  /mira-dsp\.com\//,                       /* mira-dsp */
  /eagle-insight\.com\//,                  /* Eagle Insight */
  /adster\.tech\//,                        /* Adster */
  /disqus\.com\/redirectuser/,             /* Disqus SSP redirectuser (path-limited) */
  /prebid\.cloud\//,                       /* Prebid cloud */
  /posthog\.com\//,                        /* PostHog analytics */
  /go-mpulse\.net\//,                      /* Akamai mPulse RUM */
  /s\.yjtag\.jp\//,                        /* Yahoo JP smart tag (s.yjtag.jp) */
  /\/events\?cee=no/,                      /* Marfeel CEE event ingest (path-only) */

  /* 2026-05-13 audit (round 9): live scan of 15 webtoon/manga + overseas
     image-board/matome sites (webtoons/lezhin/tappytoon/mangadex/mangaplus/
     bookwalker/toomics/9gag/imgur/boredpanda/knowyourmeme/cracked/demilked/
     quora/imgflip). imgur SPA stuck → added 60s hard timeout to scanner.
     Heavy overlap with Bounce Exchange / Intergient / Playwire stack. */
  /onetrust\.com\//,                       /* OneTrust SDK (cookielaw was; CDN sub-hosts) */
  /intergient\.com\//,                     /* Intergient SSP */
  /intergi\.com\//,                        /* Intergi (sister) */
  /bounceexchange\.com\//, /bouncex\.net\//, /* Bounce Exchange */
  /wknd\.ai\//,                            /* wknd.ai (Adelaide) */
  /connectad\.io\//,                       /* ConnectAd */
  /playwire\.com\//,                       /* Playwire ad mgmt */
  /viously\.com\//,                        /* Viously video ads */
  /pro-market\.net\//,                     /* ProMarket DSP */
  /thrtle\.com\//,                         /* throttle sync (suspect) */
  /cdnwidget\.com\//,                      /* cdnwidget (Bounce-related) */
  /rapidedge\.io\//,                       /* RapidEdge metrics */
  /bydata\.com\//,                         /* bydata telemetry */
  /media-lab\.ai\//,                       /* media-lab analytics */
  /startappnetwork\.com\//,                /* StartApp network (host suffix) */
  /mygaru\.com\//, /mgaru\.dev\//,         /* myGaru ID */
  /e-planning\.net\//,                     /* e-planning DSP */
  /rezync\.com\//,                         /* ReZync sync */
  /aaxads\.com\//,                         /* AAX ads */
  /cdnbasket\.net\//,                      /* cdnbasket */
  /trueanthem\.com\//,                     /* TrueAnthem */
  /t13\.io\//,                             /* t13 SSP */
  /lunamedia\.live\//,                     /* LunaMedia */
  /uidapi\.com\//,                         /* UID2 (TheTradeDesk) */
  /airbridge\.io\//, /abr\.ge\//,          /* Airbridge mobile attribution */
  /amplitude\.com\//,                      /* Amplitude analytics */
  /tr\.snapchat\.com\//, /tr6\.snapchat\.com\//, /* Snapchat pixel */
  /quantcount\.com\//,                     /* Quantcast (sister of quantserve) */
  /dwin2\.com\//,                          /* AWIN affiliate */
  /\.pub\.network\//,                      /* Pub.network ad mgmt */
  /privacy-center\.org\//,                 /* privacy-center CMP */
  /rkdms\.com\//,                          /* RKDMS */
  /analytics\.ahrefs\.com\//,              /* Ahrefs analytics */
  /groovespacing\.com\//,                  /* groovespacing (suspect) */
  /honeybulb\.com\//,                      /* honeybulb (suspect) */
  /marriedmailbox\.com\//,                 /* marriedmailbox (suspect) */
  /webbyword\.net\//,                      /* webbyword (suspect) */
  /appsflyersdk\.com\//, /onelink\.me\//,  /* AppsFlyer */
  /tivan\.naver\.com\//, /veta\.naver\.com\//, /* Naver tracker (host-limited) */
  /ntv\.io\//,                             /* Nativo (s.ntv.io serve) */
  /\/\/alb\.reddit\.com\//, /pixel-config\.reddit\.com\//, /* Reddit Pixel */
  /www\.redditstatic\.com\/ads\//,         /* Reddit Pixel JS (path-limited) */
  /capig\.stape\.jp\//,                    /* Stape sGTM (capig) */
  /sync\.adtech\.ink\//,                   /* AdTech.ink sync */
  /sync\.adtelligent\.com\//,              /* Adtelligent sync */

  /* — Mobile ad SDKs (also fire from in-app WebView) — */
  /applovin\.com\//,                      /* AppLovin */
  /applvn\.com\//,                        /* AppLovin short */
  /unityads\.unity3d\.com\//,             /* Unity Ads */
  /\/\/unityads\.com\//,                  /* Unity Ads alt */
  /ironsrc\.com\//,                       /* IronSource */
  /ironsrc\.mobi\//,                      /* IronSource mobile */
  /vungle\.com\//,                        /* Vungle */
  /chartboost\.com\//,                    /* Chartboost */
  /tapjoy\.com\//,                        /* Tapjoy */
  /tapjoyads\.com\//,                     /* Tapjoy ads */
  /mintegral\.com\//,                     /* Mintegral */
  /liftoff\.io\//,                        /* Liftoff */
  /pangle\.io\//,                         /* Pangle (Bytedance) */
  /adgatemedia\.com\//,                   /* AdGate Media */
  /fyber\.com\//,                         /* Fyber */
  /inner-active\.mobi\//,                 /* Fyber Inneractive */
  /flurry\.com\//,                        /* Flurry */
  /startapp\.com\//,                      /* StartApp */
];

function isAdUrl(url) {
  for (const pat of AD_SERVER_PATTERNS) if (pat.test(url)) return true;
  return false;
}

module.exports = { AD_SERVER_PATTERNS, isAdUrl };
