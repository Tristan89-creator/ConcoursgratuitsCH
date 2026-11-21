#!/usr/bin/env python3
"""Collect public RSS candidate links. No private data, logins, protected scraping or automatic entry."""
import datetime as dt
import email.utils
import hashlib
import json
import pathlib
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent
SEARCHES = [
    ('fr', 'CH:fr', 'concours gratuit suisse gagner'),
    ('fr', 'CH:fr', 'jeu concours suisse romande participer'),
    ('fr', 'CH:fr', 'concours bon cadeau suisse'),
    ('fr', 'CH:fr', 'concours voyage suisse gratuit'),
    ('fr', 'CH:fr', 'site:ch concours à gagner'),
    ('de', 'CH:de', 'Gewinnspiel Schweiz gratis teilnehmen'),
    ('de', 'CH:de', 'Verlosung Schweiz Gutschein gewinnen'),
    ('de', 'CH:de', 'Wettbewerb gewinnen Schweiz'),
    ('it', 'CH:it', 'concorso a premi Svizzera gratis'),
    ('it', 'CH:it', 'vinci concorso Svizzera'),
]
GOOD = re.compile(r'concours|gewinnspiel|verlosung|tirage au sort|concorso|gagnez|gewinnen|vinci|à gagner|wettbewerb', re.I)
BAD = re.compile(r'casino|paris sportifs|wetten|lotterie payante|lotto|betting|poker|lottery ticket', re.I)
now = dt.datetime.now(dt.timezone.utc)
items = {}
successful_feeds = 0
for lang, geo, query in SEARCHES:
    params = urllib.parse.urlencode({'q': query + ' when:30d', 'hl': lang, 'gl': 'CH', 'ceid': geo})
    url = 'https://news.google.com/rss/search?' + params
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'ConcoursgratuitsCH/1.3 (public RSS reader)'})
        with urllib.request.urlopen(req, timeout=15) as response:
            data = response.read(2_000_000)
        feed = ET.fromstring(data)
        successful_feeds += 1
        for node in feed.findall('.//item'):
            title = (node.findtext('title') or '').strip()
            link = (node.findtext('link') or '').strip()
            source = (node.findtext('source') or '').strip()
            if not GOOD.search(title) or BAD.search(title) or not link.startswith('https://'):
                continue
            try:
                published = email.utils.parsedate_to_datetime(node.findtext('pubDate') or '').astimezone(dt.timezone.utc)
            except (TypeError, ValueError, OverflowError):
                published = now
            if (now - published).days > 45:
                continue
            key = hashlib.sha256(re.sub(r'\W+', '', title.lower()).encode()).hexdigest()[:18]
            if key not in items:
                items[key] = {'id': key, 'name': title[:180], 'url': link,
                              'source': source[:100], 'language': lang,
                              'published': published.date().isoformat(), 'verified': False}
    except Exception as exc:
        print('Feed unavailable:', lang, str(exc)[:160])
records = sorted(items.values(), key=lambda x: x['published'], reverse=True)[:200]
output = ROOT / 'discoveries.json'
# Preserve the last successful catalog if all sources fail or temporarily return no candidates.
if records:
    output.write_text(json.dumps({'updated': now.isoformat(timespec='seconds'),
                                  'source': 'Public RSS search candidates; NOT verified free Swiss contests',
                                  'items': records}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
else:
    print('No candidate results; preserving previous catalog')
print(f'Feeds accessed: {successful_feeds}/{len(SEARCHES)}; discovered {len(records)} candidate links')
