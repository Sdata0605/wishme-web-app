/**
 * Self-check for the `web-search` function's parsers and answer building, against saved pages (no network):
 *
 *   node --experimental-strip-types scripts/webSearch.selfcheck.ts
 *
 * With LIVE=1 it also asks the real services (Open-Meteo, Google News, DuckDuckGo, Wikipedia) from this machine and
 * prints what came back, to see that the parsers still match the live pages:
 *
 *   LIVE=1 node --experimental-strip-types scripts/webSearch.selfcheck.ts
 *
 * Exits with an error (non-zero) on the first failing check.
 */

const p = await import(new URL('../supabase/functions/web-search/providers.ts', import.meta.url).href);
const tv = await import(new URL('../supabase/functions/web-search/tavily.ts', import.meta.url).href);

let checks = 0;
function check(name: string, ok: boolean, detail?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${name}${detail === undefined ? '' : `\n  got: ${JSON.stringify(detail)}`}`);
}

// ─── Text helpers ────────────────────────────────────────────────────────────
check('entities decode', p.decodeEntities('Tom &amp; Jerry &#39;s &quot;x&quot; &#x2013; &nbsp;y') === `Tom & Jerry 's "x" –  y`);
check('plainText strips tags and CDATA', p.plainText('<![CDATA[<b>Gold</b> up  &amp; steady]]>') === 'Gold up & steady');
check('non-Latin detection', p.isNonLatin('मुंबई का मौसम') && !p.isNonLatin('mumbai weather'));
check('clip keeps short text', p.clip('hello', 10) === 'hello' && p.clip('hello world', 6).endsWith('…'));

// ─── Keeping the subject of the question (the exact queries the model sent in the 2026-10-15 phone session) ──
check('padded "who is current CM" keeps the subject', p.simplifyQuery('who is current Chief Minister of Karnataka October 2026') === 'Chief Minister of Karnataka', p.simplifyQuery('who is current Chief Minister of Karnataka October 2026'));
check('biography words are dropped', p.simplifyQuery('MLA Balasaheb Thorat biography political career') === 'MLA Balasaheb Thorat');
check('"latest" and "status" are dropped', p.simplifyQuery('Karnataka Chief Minister status latest') === 'Karnataka Chief Minister');
check('a date is dropped, the topic stays', p.simplifyQuery('India news today 15 October 2026') === 'India');
check('only fillers left: keep what was asked', p.simplifyQuery('latest news today') === 'latest news today');
check('Marathi / Hindi words are untouched', p.simplifyQuery('बाळासाहेब थोरात कोण आहेत') === 'बाळासाहेब थोरात कोण आहेत');
check('numbers that are not a date survive', p.simplifyQuery('iPhone 16 price today') === 'iPhone 16 price');
check('timely questions are recognised', p.isTimely('gold price today') && p.isTimely('who is the current chief minister') && !p.isTimely('capital of France'));

// ─── Weather ─────────────────────────────────────────────────────────────────
check('place from "weather in Pune"', p.placeFromQuery('weather in Pune') === 'Pune');
check('place from "Pune weather today"', p.placeFromQuery('Pune weather today') === 'Pune');
check('place from "will it rain in New Delhi tomorrow?"', p.placeFromQuery('will it rain in New Delhi tomorrow?') === 'New Delhi');
check('no place from "gold price"', p.placeFromQuery('gold price today') === '');
const wx = p.weatherAnswer(
  { name: 'Pune', admin1: 'Maharashtra', latitude: 18.5, longitude: 73.8 },
  {
    current: { temperature_2m: 27.4, apparent_temperature: 30.1, relative_humidity_2m: 71, wind_speed_10m: 9.2, weather_code: 3 },
    daily: {
      time: ['2026-10-15', '2026-10-16', '2026-10-17'],
      weather_code: [61, 2, 0],
      temperature_2m_max: [31, 32, 33],
      temperature_2m_min: [22, 22, 23],
      precipitation_probability_max: [60, 20, null],
    },
  },
);
check('weather answer has now/today/tomorrow', wx.startsWith('Now in Pune, Maharashtra: 27°C (feels like 30°C), overcast') && wx.includes('Today: 22 to 31°C, light rain, 60% chance of rain.') && wx.includes('Tomorrow: 22 to 32°C, partly cloudy, 20% chance of rain.'), wx);
check('missing rain chance is left out', wx.includes('Day after tomorrow: 23 to 33°C, clear sky.') && !wx.includes('null'), wx);

// ─── News RSS ────────────────────────────────────────────────────────────────
const rss = `<?xml version="1.0"?><rss><channel><title>x</title>
<item><title>RBI keeps repo rate unchanged - The Hindu</title><link>https://news.google.com/rss/articles/AAA</link><pubDate>Wed, 15 Oct 2026 04:30:00 GMT</pubDate><description>&lt;a href="x"&gt;RBI keeps&lt;/a&gt;</description><source url="https://www.thehindu.com">The Hindu</source></item>
<item><title><![CDATA[Gold &amp; silver rally on weak dollar - Mint]]></title><link>https://news.google.com/rss/articles/BBB</link><pubDate>Wed, 15 Oct 2026 03:00:00 GMT</pubDate><source url="https://www.livemint.com">Mint</source></item>
<item><title>Short</title><link>l</link></item></channel></rss>`;
const news = p.parseNewsRss(rss);
check('news: three items parsed', news.length === 3, news);
check('news: title split from source', news[0].title === 'RBI keeps repo rate unchanged' && news[0].source === 'The Hindu', news[0]);
check('news: CDATA and entities cleaned', news[1].title === 'Gold & silver rally on weak dollar' && news[1].source === 'Mint', news[1]);
check('news: date normalised', news[0].published === '2026-10-15T04:30:00.000Z', news[0]);
check('news: respects max', p.parseNewsRss(rss, 2).length === 2);

// ─── DuckDuckGo HTML ─────────────────────────────────────────────────────────
const ddg = `<div class="results">
<div class="result results_links results_links_deep web-result">
 <h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.goodreturns.in%2Fgold-rates%2F&amp;rut=abc">Gold Rate Today in India - GoodReturns</a></h2>
 <a class="result__snippet" href="//duckduckgo.com/l/?uddg=x">Check the <b>gold</b> rate today: 24K &amp; 22K per gram in <b>Mumbai</b>.</a>
</div>
<div class="result results_links result--ad">
 <h2 class="result__title"><a rel="nofollow" class="result__a" href="https://duckduckgo.com/y.js?ad_domain=x">Sponsored thing</a></h2>
 <a class="result__snippet" href="x">buy now</a>
</div>
<div class="result results_links">
 <h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FGold">Gold - Wikipedia</a></h2>
 <a class="result__snippet" href="x">Gold is a chemical element.</a>
</div></div>`;
const dd = p.parseDdgHtml(ddg);
check('ddg: ad skipped, two results', dd.length === 2, dd);
check('ddg: link unwrapped', dd[0].url === 'https://www.goodreturns.in/gold-rates/' && dd[0].source === 'goodreturns.in', dd[0]);
check('ddg: snippet cleaned', dd[0].snippet === 'Check the gold rate today: 24K & 22K per gram in Mumbai.', dd[0]);
check('ddg: second result', dd[1].title === 'Gold - Wikipedia' && dd[1].snippet === 'Gold is a chemical element.', dd[1]);

// ─── Bing HTML (the page layout seen from Supabase's servers, plus the desktop layout and a redirect link) ──
const redirect = 'https://www.bing.com/ck/a?!&amp;&amp;p=abc&amp;u=a1' + Buffer.from('https://www.tanishq.co.in/gold-rate.html').toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_') + '&amp;ntb=1';
const bing = `<ol id="b_results">
<li class="b_algo" data-id=""><link rel="stylesheet" href="/x.css"/><div class="b_tpcn"><a class="tilk" href="https://www.goodreturns.in/gold-rates/mumbai.html"><div class="tptt">goodreturns.in</div></a></div>
 <div class="b_algoheader"><a href="https://www.goodreturns.in/gold-rates/mumbai.html" h="ID=SERP,5090.2"><h2>Todays <strong>Gold Rate in Mumbai</strong>, 18, 22 &amp; 24 Carat on 15 October 2026</h2></a></div>
 <div class="b_caption"><p class="b_lineclamp3"><span class="news_dt">6 hours ago</span>&nbsp;&#0183;&#32;Gold Rate in Mumbai Today (15 October 2026): Get 18K, 22 Carat &amp; 24 Karat gold rate in Mumbai</p></div></li>
<li class="b_algo b_vtl"><div class="b_title"><h2><a href="${redirect}" h="ID=SERP,1">Gold Rate Today - <strong>Tanishq</strong></a></h2></div>
 <div class="b_caption"><p>Check today's 24K gold rate in India.</p></div></li>
<li class="b_algo"><div class="b_algoheader"><h2>No link here</h2></div></li>
</ol>`;
const bg = p.parseBingHtml(bing);
check('bing: two usable results (the one without a link is skipped)', bg.length === 2, bg);
check('bing: mobile layout title, url and freshness kept', bg[0].title === 'Todays Gold Rate in Mumbai, 18, 22 & 24 Carat on 15 October 2026' && bg[0].url === 'https://www.goodreturns.in/gold-rates/mumbai.html' && bg[0].snippet.startsWith('6 hours ago') && bg[0].source === 'goodreturns.in', bg[0]);
check('bing: desktop layout with a redirect link is unwrapped', bg[1].title === 'Gold Rate Today - Tanishq' && bg[1].url === 'https://www.tanishq.co.in/gold-rate.html' && bg[1].snippet === "Check today's 24K gold rate in India.", bg[1]);
check('bing: empty page gives nothing', p.parseBingHtml('<html>captcha</html>').length === 0);
check('bing: unwrap leaves normal links alone', p.unwrapBingLink('https://example.com/a?u=a1xx') === 'https://example.com/a?u=a1xx');

// ─── Off-topic results are thrown away ───────────────────────────────────────
const junk = [
  { title: 'CHIEF Definition & Meaning - Merriam-Webster', snippet: 'The meaning of CHIEF is accorded highest rank.', source: 'm-w.com', url: 'https://www.merriam-webster.com/dictionary/chief' },
  { title: 'Chief - Wikipedia', snippet: 'This disambiguation page lists articles associated with the title Chief.', source: 'wikipedia.org', url: 'https://en.wikipedia.org/wiki/Chief' },
];
const good = { title: 'Chief Minister of Karnataka - Wikipedia', snippet: 'The chief minister is the head of government of the state of Karnataka.', source: 'wikipedia.org', url: 'https://en.wikipedia.org/wiki/Chief_Minister_of_Karnataka' };
check('junk results for "chief minister of Karnataka" are dropped', p.filterRelevant(junk, 'chief minister of Karnataka').length === 0);
check('the relevant one survives among junk', p.filterRelevant([...junk, good], 'who is the chief minister of Karnataka').length === 1);
check('forum spam for a different question is dropped', p.filterRelevant([{ title: 'Tank mates for my Orchid dottyback', snippet: 'reef forum', source: 'x', url: 'https://x.com/a' }], 'Karnataka chief minister current').length === 0);
check('a query of only stopwords keeps everything', p.filterRelevant(junk, 'what is the').length === 2);
check('Hindi query words are matched', p.filterRelevant([{ title: 'आज का सोने का भाव', snippet: '', source: 's', url: 'u' }], 'आज सोने का भाव').length === 1);
check('Hindi words with vowel signs are not cut apart', p.filterRelevant([{ title: 'भारत में सोने की कीमत', snippet: 'आज का भाव', source: 's', url: 'u' }], 'सोने का भाव').length === 1);
check('an unrelated Hindi page is dropped', p.filterRelevant([{ title: 'क्रिकेट स्कोर आज', snippet: '', source: 's', url: 'u' }], 'सोने का भाव').length === 0);
check('Tamil words with vowel signs match too', p.filterRelevant([{ title: 'இன்றைய தங்கம் விலை', snippet: '', source: 's', url: 'u' }], 'தங்கம் விலை').length === 1);

// ─── Wikipedia ───────────────────────────────────────────────────────────────
const wiki = p.parseWikiJson({
  query: {
    pages: {
      '2': { title: 'Second', extract: 'Two.', fullurl: 'https://en.wikipedia.org/wiki/Second', index: 2 },
      '1': { title: 'First', extract: 'One &amp; only.', fullurl: 'https://en.wikipedia.org/wiki/First', index: 1 },
      '3': { title: 'No extract', index: 3 },
    },
  },
});
check('wiki: ordered by rank, empty skipped', wiki.length === 2 && wiki[0].title === 'First' && wiki[0].snippet === 'One & only.' && wiki[1].title === 'Second', wiki);
check('wiki: bad input gives nothing', p.parseWikiJson(null).length === 0 && p.parseWikiJson({}).length === 0);

// ─── Trimming ────────────────────────────────────────────────────────────────
const long = (n: number) => 'x'.repeat(n);
const trimmed = p.trimOutput({
  answer: long(900),
  results: [1, 2, 3, 4, 5, 6].map((i) => ({ title: `T${i}`, snippet: long(500), source: 's', url: `u${i}` })),
});
const size = (trimmed.answer?.length ?? 0) + trimmed.results.reduce((s: number, r: any) => s + r.title.length + r.snippet.length, 0);
check('trim: answer capped', (trimmed.answer?.length ?? 0) <= 600, trimmed.answer?.length);
check('trim: at most 4 results', trimmed.results.length <= 4, trimmed.results.length);
check('trim: about 1,500 characters', size <= 1600, size);
check('trim: snippets capped at 300', trimmed.results.every((r: any) => r.snippet.length <= 300));


// ─── Tavily: freshness hint -> options ───────────────────────────────────────
check('day = news index + general index, both limited to the last day', JSON.stringify(tv.optionsFor('day')) === JSON.stringify([{ topic: 'news', time_range: 'day' }, { topic: 'general', time_range: 'day', country: 'india' }]), tv.optionsFor('day'));
check('week = news index + general index, both limited to the last week', JSON.stringify(tv.optionsFor('week')) === JSON.stringify([{ topic: 'news', time_range: 'week' }, { topic: 'general', time_range: 'week', country: 'india' }]));
check('month = general pages, last month', JSON.stringify(tv.optionsFor('month')) === JSON.stringify([{ topic: 'general', time_range: 'month', country: 'india' }]));
check('any = general pages, India-leaning, one search', JSON.stringify(tv.optionsFor('any')) === JSON.stringify([{ topic: 'general', country: 'india' }]));

// ─── Tavily: what the model reads ────────────────────────────────────────────
const NOW = Date.parse('2026-10-15T08:35:00Z'); // 14:05 IST on 15 Oct 2026
check('source names', tv.sourceName('https://www.bbc.com/news/articles/x') === 'BBC' && tv.sourceName('https://www.thehindu.com/a') === 'The Hindu' && tv.sourceName('https://example.org/a') === 'example.org' && tv.sourceName('https://timesofindia.indiatimes.com/a') === 'Times of India');
check('date labels in Indian time', tv.dateLabel('2026-10-15T01:00:00Z', NOW) === '15 Oct (today)' && tv.dateLabel('2026-10-14T20:00:00Z', NOW) === '15 Oct (today)' && tv.dateLabel('2026-10-14T05:00:00Z', NOW) === '14 Oct (yesterday)' && tv.dateLabel('2026-10-12T05:00:00Z', NOW) === '12 Oct (3 days ago)' && tv.dateLabel('2026-09-11T05:00:00Z', NOW) === '11 Sep' && tv.dateLabel(null, NOW) === '' && tv.dateLabel('nonsense', NOW) === '', [tv.dateLabel('2026-10-14T20:00:00Z', NOW), tv.dateLabel('2026-10-12T05:00:00Z', NOW), tv.dateLabel('2026-09-11T05:00:00Z', NOW)]);
check('the search time is stated', tv.nowLabel(NOW) === '15 Oct 2026, 14:05 IST', tv.nowLabel(NOW));

const R = (title: string, url: string, content: string, score: number, published_date?: string) => ({ title, url, content, score, published_date });
const cjp = {
  query: 'CJP protest', recency: 'week',
  results: [
    R('CJP leaders jailed after Jantar Mantar protest', 'https://www.bbc.com/news/articles/a', 'Two leaders were remanded to five days of judicial custody. See [more here](https://example.com/more) https://t.co/abc', 0.81, '2026-10-14T04:25:31Z'),
    R('Cockroach leaders sent to judicial custody', 'https://www.dw.com/en/b', 'Leaders face formal charges after they entered Jantar Mantar.', 0.66, '2026-10-14T05:08:14Z'),
    R('CJP leaders jailed after Jantar Mantar protest - NDTV', 'https://www.ndtv.com/c', 'The same story on NDTV.', 0.6, '2026-10-14T09:00:00Z'),
    R('Old background piece on the movement', 'https://www.thehindu.com/d', 'How the movement began.', 0.5, '2026-10-05T09:00:00Z'),
    R('Release CJP leaders', 'https://www.amnestyusa.org/e', 'Amnesty calls for release.', 0.65, '2026-10-14T16:00:00Z'),
    R('Junk video', 'https://www.example.com/v', 'x', 0.05),
    R('Another from the same site 1', 'https://www.dw.com/en/f', 'More DW.', 0.4, '2026-10-13T05:00:00Z'),
    R('Another from the same site 2', 'https://www.dw.com/en/g', 'Even more DW.', 0.39, '2026-10-12T05:00:00Z'),
  ],
};
const text = tv.formatForModel([cjp], NOW);
check('starts with when it was searched', text.startsWith('Searched 15 Oct 2026, 14:05 IST.'), text.slice(0, 60));
check('no web addresses reach the model', !/https?:|www\.|\.com\/|t\.co/.test(text), text);
check('the same story from two outlets is one line with "also"', (text.match(/CJP leaders jailed/g) ?? []).length === 1 && /\(also: BBC\)/.test(text), text);
check('newest first for a week-old ask', text.indexOf('Amnesty International') < text.indexOf('Old background'), text);
check('results are named and dated', /Amnesty International, 14 Oct \(yesterday\)/.test(text), text);
check('junk below the score floor is dropped', !text.includes('Junk video'));
check('at most two results per site', (text.match(/DW,/g) ?? []).length <= 2, text);
check('different days are called out', /sources are from different days/.test(text), text);
check('at most five results for one search', (text.match(/^\d+\. /gm) ?? []).length <= 5);
check('size stays under the cap', text.length <= 2400, text.length);
const md = tv.formatForModel([{ query: 'q', recency: 'any', results: [R('A page', 'https://www.bbc.com/news/articles/z', 'First [see more here](https://example.com/more) and ![img](https://x.com/i.png) then https://t.co/abc end', 0.9)] }], NOW);
check('markdown links keep their words and lose the address', /First see more here and img then end/.test(md) && !/example\.com|t\.co|x\.com/.test(md), md);

const fresh = tv.formatForModel([{ query: 'Balasaheb Thorat', recency: 'any', results: [R('Balasaheb Thorat', 'https://en.wikipedia.org/wiki/Balasaheb_Thorat', 'Balasaheb Thorat is an Indian politician who served as the revenue minister in Maharashtra.', 0.95)] }], NOW);
check('an undated person page has a source, no date and no repeated heading', /1\. Wikipedia: Balasaheb Thorat is an Indian politician who served/.test(fresh), fresh);

const stale = tv.formatForModel([{ query: 'gold rate Mumbai', recency: 'day', results: [R('Gold rate today Mumbai', 'https://www.5paisa.com/g', '24K gold per 10 gm Rs 1,49,280', 0.9, '2026-10-11T05:00:00Z'), R('Gold price', 'https://paytm.com/g', 'Rs 15,063 per gram', 0.8, '2026-10-12T05:00:00Z')] }], NOW);
check('nothing fresh is admitted', /nothing from the last day was found; the newest is 12 Oct/.test(stale), stale);

const three = tv.formatForModel(
  ['India top news', 'world news', 'business news India'].map((q, n) => ({ query: q, recency: 'day', results: [1, 2, 3, 4, 5].map((i) => R(`${q} story ${i} about subject ${n}${i} unlike others`, `https://site${i}${n}.com/a`, 'x'.repeat(500), 0.9 - i / 20, '2026-10-15T03:00:00Z')) })),
  NOW,
);
check('three searches are labelled', /Search "India top news":/.test(three) && /Search "world news":/.test(three) && /Search "business news India":/.test(three), three.slice(0, 200));
check('three searches stay under 3,200 characters', three.length <= 3200, three.length);
check('an empty search says so', /Nothing relevant found for "zzz"/.test(tv.formatForModel([{ query: 'zzz', recency: 'any', results: [] }], NOW)));

console.log(`${checks} offline checks passed`);

// ─── Live (optional) ─────────────────────────────────────────────────────────
if (process.env.LIVE) {
  const show = (label: string, out: any) =>
    console.log(`\n${label}:`, out ? `${out.provider}${out.answer ? `\n  answer: ${out.answer}` : ''}\n  ${out.results.map((r: any) => `- ${r.title} [${r.source}] ${r.snippet.slice(0, 90)}`).join('\n  ')}` : 'NOTHING');
  show('weather Pune', await p.weatherProvider('Pune', 'en', 4000));
  show('news India', await p.newsProvider('India economy', 'en', 4000));
  show('news top', await p.newsProvider('', 'en', 4000));
  show('bing gold price', await p.bingProvider('gold price today Mumbai', 'en', 4000));
  show('bing CM Karnataka', await p.bingProvider('chief minister of Karnataka', 'en', 4000));
  show('bing hindi', await p.bingProvider('आज सोने का भाव', 'hi', 4000));
  show('ddg gold price', await p.duckDuckGoProvider('gold price today Mumbai', 4000));
  show('ddg CM Karnataka', await p.duckDuckGoProvider('chief minister of Karnataka', 4000));
  for (const q of ['MLA Balasaheb Thorat biography political career', 'who is current Chief Minister of Karnataka October 2026', 'Karnataka Chief Minister status latest']) {
    const s = p.simplifyQuery(q);
    show(`wikipedia "${q}" -> "${s}"`, await p.wikipediaProvider(s, 'en', 4000));
    if (p.isTimely(q)) show(`news "${s}"`, await p.newsProvider(s, 'en', 4000));
  }
  show('news "India" (was "India news today 15 October 2026")', await p.newsProvider(p.simplifyQuery('India news today 15 October 2026'), 'en', 4000));
  show('wikipedia', await p.wikipediaProvider('Chandrayaan-3', 'en', 4000));
  show('wikipedia hindi', await p.wikipediaProvider('ताज महल', 'hi', 4000));
}


// ─── Live Tavily (optional): the real questions through the real search and the real formatting ─────────
if (process.env.TAVILY_API_KEY) {
  const key = process.env.TAVILY_API_KEY;
  const cases: { q: string[]; recency: 'any' | 'day' | 'week' | 'month' }[] = [
    { q: ['Balasaheb Thorat'], recency: 'any' },
    { q: ['Karnataka chief minister'], recency: 'any' },
    { q: ['CJP protest'], recency: 'week' },
    { q: ['gold rate Mumbai 24 carat'], recency: 'day' },
    { q: ['India top news', 'world news', 'business news India'], recency: 'day' },
    { q: ['बालासाहेब थोरात'], recency: 'any' },
    { q: ['Zxqvbn Prathamesh Wadkarrr MLA'], recency: 'any' },
  ];
  let credits = 0;
  for (const c of cases) {
    const t = Date.now();
    const outs = await Promise.all(c.q.map((q) => tv.tavilySearch(key, q, { recency: c.recency, depth: 'basic', maxResults: c.q.length === 1 ? 6 : 5 }, 8000)));
    const ms = Date.now() - t;
    const sets = outs.map((o: any, i: number) => ({ query: c.q[i], recency: c.recency, results: o.ok ? o.results : [] }));
    outs.forEach((o: any) => {
      if (o.ok) credits += o.credits;
    });
    const out = tv.formatForModel(sets, Date.now());
    console.log(`\n=== ${c.q.join(' | ')} [${c.recency}] ${ms} ms, ${outs.map((o: any) => (o.ok ? `${o.credits} credit(s)` : `FAILED ${o.code}`)).join(', ')}, ${out.length} chars`);
    console.log(out);
  }
  console.log(`\nlive credits used: ${credits}`);
}
