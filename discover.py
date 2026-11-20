#!/usr/bin/env python3
"""Build a static discovery index from public Google News RSS searches.
No logins, form submission, CAPTCHA solving or scraping protected pages.
"""
import datetime as dt, email.utils, hashlib, json, pathlib, re, urllib.parse, urllib.request, xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parent
SEARCHES=[
 ('fr','CH:fr','concours gagner suisse gratuit'),
 ('fr','CH:fr','jeu concours suisse romande participer'),
 ('de','CH:de','Gewinnspiel Schweiz gratis teilnehmen'),
 ('it','CH:it','concorso a premi Svizzera gratis'),
]
BAD=re.compile(r'\b(casino|paris sportifs|wetten|lotterie payante|lotto|betting|poker)\b',re.I)
GOOD=re.compile(r'concours|gewinnspiel|verlosung|tirage au sort|concorso|gagnez|gewinnen|vinci|à gagner',re.I)
now=dt.datetime.now(dt.timezone.utc)
items={}
for lang,geo,query in SEARCHES:
    params=urllib.parse.urlencode({'q':query+' when:30d','hl':lang,'gl':'CH','ceid':geo})
    url='https://news.google.com/rss/search?'+params
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'ConcoursgratuitsCH/1.1 (public RSS reader)'})
        with urllib.request.urlopen(req,timeout=18) as resp: data=resp.read(2_000_000)
        root=ET.fromstring(data)
        for node in root.findall('.//item'):
            title=(node.findtext('title') or '').strip(); link=(node.findtext('link') or '').strip()
            source=(node.findtext('source') or '').strip()
            if not GOOD.search(title) or BAD.search(title) or not link.startswith('https://'): continue
            date=node.findtext('pubDate') or ''
            try:
                published=email.utils.parsedate_to_datetime(date).astimezone(dt.timezone.utc)
                if (now-published).days>45: continue
            except Exception: published=now
            key=hashlib.sha256(re.sub(r'\W+','',title.lower()).encode()).hexdigest()[:18]
            if key not in items:
                items[key]={'id':key,'name':title[:180],'url':link,'source':source[:100], 'language':lang,'published':published.date().isoformat(),'verified':False}
    except Exception as exc:
        print('Feed unavailable:',lang,str(exc)[:180])
records=sorted(items.values(),key=lambda x:x['published'],reverse=True)[:120]
# Never silently replace a good catalog with empty results on temporary feed failure.
output=ROOT/'discoveries.json'
if records:
    output.write_text(json.dumps({'updated':now.isoformat(timespec='seconds'),'source':'Public news RSS search results; not verified contests','items':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
else:
    print('No feed results: retaining previous catalog')
print('Discovered',len(records),'candidate links')
