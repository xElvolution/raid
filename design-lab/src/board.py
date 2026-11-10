import json,sys
D={
'A':dict(name='ARENA',pitch='The fight is the product: a dark night-arena with chunky, soft shapes and huge springy % numerals.',bg='#0A0A0F',fg='#F4F3F8',mut='#8A889A',disp="'Bricolage Grotesque'",body='Inter',
 tok=['Type · Bricolage Grotesque 800 (display) + Inter','Shape · soft 20–34px radii, pill controls, bottom sheets','Density · roomy, one big thing per screen','Motion · springy overshoot, cards rise and settle']),
'B':dict(name='TICKET',pitch='Every call is a printed betting slip: warm paper, editorial serif, perforations and a purple CALLED IT stamp.',bg='#F3EFE6',fg='#16141C',mut='#7A7468',disp="'Instrument Serif'",body='Geist',
 tok=['Type · Instrument Serif + Geist + Geist Mono numbers','Shape · sharp 4px, 1.5px ink rules, hard offset shadows, perforated stubs','Density · editorial, medium, list-like','Motion · tickets are dealt in sideways; stamp slams']),
'C':dict(name='BROADCAST',pitch='Called as live matchday TV: condensed caps, a scoreboard bug for Yes vs No, hard diagonal cuts and wipes.',bg='#000',fg='#fff',mut='#8D8D96',disp="'Big Shoulders Display'",body='Inter',
 tok=['Type · Big Shoulders Display 900 caps + JetBrains Mono + Inter','Shape · zero radius, 45° clipped corners, full-bleed bars','Density · dense, every pixel is score info','Motion · fast diagonal purple wipes, kinetic type']),
}
d=sys.argv[1];c=D[d];S=['home','feed','market','profile','callit','calledit'];L=['Home','Feed · mini battle','Market + trade sheet','Caller Card','Call it (AI)','CALLED IT']
h=f"""<html><body style="margin:0;width:2600px;background:{c['bg']};color:{c['fg']};font-family:{c['body']};padding:70px 80px;box-sizing:border-box">
<div style="display:flex;justify-content:space-between;align-items:flex-end"><div><div style="font:600 22px Inter;letter-spacing:.2em;color:#7C5CFF">CALLED · DIRECTION {d}</div><div style="font-family:{c['disp']};font-weight:{'400' if d=='B' else '900'};font-size:150px;line-height:1;margin-top:10px">{c['name']}</div>
<div style="font-size:30px;max-width:1300px;margin-top:16px;line-height:1.3">{c['pitch']}</div></div>
<div style="display:flex;gap:14px">{''.join(f'<div style="text-align:center;font:600 16px Inter;color:{c["mut"]}"><div style="width:110px;height:110px;background:{x};border:2px solid {c["mut"]}"></div>{x}</div>' for x in ['#7C5CFF','#1FD17A','#FF4B5C',c['bg'],c['fg']])}</div></div>
<div style="display:flex;gap:40px;margin:30px 0 40px;font-size:21px;color:{c['mut']}">{''.join(f'<div>{t}</div>' for t in c['tok'])}</div>
<div style="display:flex;gap:28px">{''.join(f'<div><img src="../{d}/{s}.png" style="width:390px;height:844px;border-radius:44px;display:block;box-shadow:0 0 0 2px {c["mut"]}"><div style="font:600 20px Inter;margin-top:14px;color:{c["mut"]}">{l}</div></div>' for s,l in zip(S,L))}</div></body></html>"""
open(f'board-{d}.html','w').write(h)
