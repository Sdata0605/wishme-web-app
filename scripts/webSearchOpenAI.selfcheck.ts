/**
 * Self-check for the OpenAI search step of the `web-search` function: reading OpenAI's reply, deciding when an answer
 * found nothing, cleaning the text and fitting several searches into the room the voice model gets (no network):
 *
 *   node --experimental-strip-types scripts/webSearchOpenAI.selfcheck.ts
 *
 * With LIVE=1 and OPENAI_API_KEY it also asks the real OpenAI search about four people and prints what came back, the
 * time it took and the text the voice model would receive:
 *
 *   LIVE=1 OPENAI_API_KEY=sk-... [OPENAI_SEARCH_MODEL=gpt-4.1] node --experimental-strip-types scripts/webSearchOpenAI.selfcheck.ts
 *
 * Exits with an error (non-zero) on the first failing check.
 */

const oa = await import(new URL('../supabase/functions/web-search/openai.ts', import.meta.url).href);

let checks = 0;
function check(name: string, ok: boolean, detail?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${name}${detail === undefined ? '' : `\n  got: ${JSON.stringify(detail)}`}`);
}

// ─── Reading a Responses API reply (shape taken from a real reply on 2026-10-18) ──
const reply = {
  output: [
    { type: 'web_search_call', id: 'ws_1', status: 'completed', action: { type: 'search', query: 'Dhruv Rathee' } },
    { type: 'web_search_call', id: 'ws_2', status: 'completed', action: { type: 'search', query: 'Dhruv Rathee London' } },
    {
      type: 'message',
      content: [
        {
          type: 'output_text',
          text: 'As of 18 October 2026, Dhruv Rathee joined a protest in London on 17 October. ([timesofindia.indiatimes.com](https://timesofindia.indiatimes.com/articleshow/1.cms?utm_source=openai)) He was detained on 10 October. ([hindustantimes.com](https://www.hindustantimes.com/x?utm_source=openai))',
          annotations: [
            { type: 'url_citation', url: 'https://timesofindia.indiatimes.com/articleshow/1.cms?utm_source=openai', title: 't' },
            { type: 'url_citation', url: 'https://www.hindustantimes.com/x?utm_source=openai', title: 'h' },
            { type: 'url_citation', url: 'https://timesofindia.indiatimes.com/articleshow/2.cms', title: 't2' },
          ],
        },
      ],
    },
  ],
};
const read = oa.readAnswer(reply);
check('answer text is read', read.text.startsWith('As of 18 October 2026'), read.text);
check('outlets are named once each', JSON.stringify(read.sources) === JSON.stringify(['Times of India', 'Hindustan Times']), read.sources);
check('searches are counted', read.searches === 2, read.searches);
check('an empty reply reads as empty', oa.readAnswer({}).text === '' && oa.readAnswer(null).searches === 0);
check('only the message text is used, not the tool call', !read.text.includes('web_search'));

// ─── Answers that found nothing (the real wording of the 2026-10-18 tests) ───
check('gpt-4o-mini "unable to find" is nothing', oa.looksNotFound("I'm unable to find recent news about an individual named Hari Raj Shetty as of October 18, 2026. However, there is..."));
check('gpt-5 "couldn\'t find any verified" is nothing', oa.looksNotFound("I couldn’t find any verified celebrity named “Hari Raj Shetty” in Kannada/Tulu media"));
check('gpt-4.1 "found no recent updates" is nothing', oa.looksNotFound('Here are the latest verified updates about Raj B Shetty. 4. I found no recent updates'.replace('Here are the latest verified updates about Raj B Shetty. 4. ', 'I found no recent updates or credible news regarding "Hari Raj Shetty". ')));
check('"no information" is nothing', oa.looksNotFound('There is no information about this person.'));
check('gpt-4.1-mini "no publicly available information" is nothing', oa.looksNotFound("As of October 18, 2026, there is no publicly available information on an individual named Hari Raj Shetty. It's possible that"));
check('gpt-4.1 "couldn\'t find any reliable recent information" is nothing', oa.looksNotFound('I couldn’t find any reliable recent information specifically about a person named "Hari Raj Shetty."'));
check('a real answer is not nothing (Balasaheb Thorat)', !oa.looksNotFound('As of October 18, 2026, Congress leader Balasaheb Thorat has been actively involved in addressing Maharashtra\'s drought situation.'));
check('a real answer is not nothing (Dhruv Rathee)', !oa.looksNotFound(read.text));
check('"not found" far down the answer is ignored', !oa.looksNotFound(`${'Ajay-Atul composed the music for many films. '.repeat(12)}They did not find a release date for one of them.`));

// ─── Cleaning the text ───────────────────────────────────────────────────────
const tidy = oa.tidyAnswer(read.text);
check('citations are removed', !tidy.includes('timesofindia') && !tidy.includes('](') && !tidy.includes('utm_'), tidy);
check('the sentences stay', tidy.includes('joined a protest in London') && tidy.includes('detained on 10 October.'), tidy);
check('no stray space before punctuation', !/\s[.,;:!?]/.test(tidy), tidy);
check('markdown marks are dropped', oa.tidyAnswer('**Bold** point\n\n- second\n# Head') === 'Bold point - second Head');
check('bare links are dropped', !oa.tidyAnswer('see https://example.com/page now').includes('example'));

// ─── What the voice model receives ───────────────────────────────────────────
const NOW = Date.UTC(2026, 9, 18, 6, 30);
const one = oa.formatOpenAI([{ query: 'Dhruv Rathee', recency: 'any', answer: { text: read.text, sources: read.sources } }], NOW);
check('header says when it was searched', one.startsWith('Searched 18 Oct 2026, 12:00 IST.'), one.split('\n')[0]);
check('a single search has no label', !one.includes('Search "'), one);
check('sources are listed by outlet', one.includes('Sources: Times of India, Hindustan Times.'), one);
check('no web addresses reach the model', !/https?:|www\./.test(one), one);

const long = { text: 'A long answer sentence about the subject. '.repeat(80), sources: ['NDTV'] };
const three = oa.formatOpenAI(
  [
    { query: 'India top news', recency: 'day', answer: long },
    { query: 'world news', recency: 'day', answer: long },
    { query: 'business news India', recency: 'day', answer: { text: 'Sensex rose 300 points on 17 October.', sources: ['Mint'] } },
  ],
  NOW,
);
check('three searches fit the budget', three.length <= 3400 + 8, three.length);
check('the last search is not pushed out by long ones', three.includes('Sensex rose 300 points') && three.includes('Search "business news India":'), three.slice(-300));
const missing = oa.formatOpenAI([{ query: 'zzz qqq', recency: 'any', answer: null }], NOW);
check('no answer says nothing was found', missing.includes('Nothing relevant found for "zzz qqq".'), missing);

console.log(`${checks} offline checks passed.`);

// ─── Live (opt-in) ───────────────────────────────────────────────────────────
if (process.env.LIVE === '1') {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('LIVE=1 needs OPENAI_API_KEY in the environment');
  const model = process.env.OPENAI_SEARCH_MODEL || undefined;
  const asks: Array<[string, 'any' | 'day' | 'week']> = [
    ['Hari Raj Shetty', 'any'],
    ['Balasaheb Thorat', 'week'],
    ['Ajay-Atul', 'week'],
    ['Dhruv Rathee', 'week'],
  ];
  for (const [query, recency] of asks) {
    const o = await oa.openaiSearch(key, query, { recency, thorough: false, model }, 20_000);
    console.log(`\n==== ${query} [${recency}] ${o.ok ? `${(o.ms / 1000).toFixed(1)} s, ${o.searches} search(es), model ${o.model}` : `FAILED ${o.code} ${o.status ?? ''}`}`);
    if (!o.ok) continue;
    console.log(`not-found? ${oa.looksNotFound(o.text)} | sources: ${o.sources.join(', ') || '(none)'}`);
    console.log(oa.formatOpenAI([{ query, recency, answer: { text: o.text, sources: o.sources } }], Date.now()));
  }
}
