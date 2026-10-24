"""Extract the 9 Massachusetts 2026 ballot questions from the official
Information for Voters booklet text (pypdf output). Summary bodies are emitted
by pypdf just BEFORE each question's summary-page header, so we read backwards
from the header to the previous standalone page-number line."""
import re, json
lines=open('official/IFV_2026_English.txt').read().split('\n')
text='\n'.join(lines)
def clean(s):
    s=re.sub(r'\s*\n\s*',' ',s); s=re.sub(r'\s{2,}',' ',s); return s.strip()
hdr=re.compile(r'^QUESTION (\d): (Law Proposed by Initiative Petition|Referendum on an Existing Law)\s*$')
first={}
for i,l in enumerate(lines):
    m=hdr.match(l.strip())
    if m and int(m.group(1)) not in first: first[int(m.group(1))]=i
tags={1:["everyone"],2:["public_defender_user","state_employee"],3:["everyone","primary_voter"],4:["unregistered","everyone"],5:["everyone"],6:["open_space"],7:["owner","single_family_interest","renter"],8:["cannabis_consumer"],9:["firearm_owner"]}
direction={1:{"everyone":"who_decides"},2:{"public_defender_user":"rule_change","state_employee":"rule_change"},3:{"everyone":"who_decides","primary_voter":"rule_change"},4:{"unregistered":"expands","everyone":"rule_change"},5:{"everyone":"rule_change"},6:{"open_space":"expands"},7:{"owner":"rule_change","single_family_interest":"expands","renter":"rule_change"},8:{"cannabis_consumer":"restricts"},9:{"firearm_owner":"rule_change"}}
out=[]
for q in range(1,10):
    h=first[q]
    # summary body: back up to previous standalone page-number line
    j=h-1
    while j>0 and not re.match(r'^\s*\d{1,2}\s*$',lines[j]): j-=1
    body=clean('\n'.join(lines[j+1:h]))
    # page region: header to next QUESTION header
    k=h+1
    while k<len(lines) and not lines[k].strip().startswith('QUESTION '): k+=1
    page='\n'.join(lines[h:k])
    kind="referendum" if "Referendum" in lines[h] else "initiative"
    # official title: lines after header until the 'Do you approve' line
    t=[]
    for l in lines[h+1:h+5]:
        if l.strip().startswith('Do you approve'): break
        t.append(l.strip())
    title=clean(' '.join(t))
    y=re.search(r'(A YES VOTE .*?)(?=\nA NO VOTE)',page,re.S)
    n=re.search(r'(A NO VOTE .*?)(?=\n ?SUMMARY|\n ?WHAT YOUR|\nQUESTION|$)',page,re.S)
    yes=clean(y.group(1)) if y else None
    no=clean(n.group(1)) if n else None
    if no: no=re.sub(r'\s*WHAT YOUR.*$','',no).strip()
    f=re.search(r'Finance\.\s*\n(.*?)\n\s*\d{1,2}\s*\n',page,re.S)
    fiscal=clean(f.group(1)) if f else None
    out.append({"id":q,"official_title":title,"type":kind,"ag_summary":body,"yes_means":yes,"no_means":no,
        "fiscal_statement":fiscal,
        "full_text_url":f"https://www.sec.state.ma.us/divisions/elections/research-and-statistics/2026-Information-for-voters/2026-ballot-question{q}.htm",
        "source":"Information for Voters 2026, Secretary of the Commonwealth. Summary by the Attorney General; YES/NO statements by the AG and the Secretary jointly.",
        "tags":tags[q],"direction_by_tag":direction[q],"why_templates":{},"board_metric":None,
        "review_status":"machine-extracted from official PDF; human review required before shipping"})
json.dump(out,open('questions.json','w'),indent=2,ensure_ascii=False)
for o in out:
    print(f"Q{o['id']} [{o['type']}] {o['official_title']}\n   summary {len(o['ag_summary'])} chars: {o['ag_summary'][:110]}...\n   YES: {o['yes_means'][:90] if o['yes_means'] else None}\n   NO : {o['no_means'][:90] if o['no_means'] else None}\n   fiscal: {(o['fiscal_statement'] or '')[:80]}\n")
