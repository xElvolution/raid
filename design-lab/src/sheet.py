import sys;from PIL import Image
d=sys.argv[1];out=sys.argv[2];S=['home','feed','market','profile','callit','calledit']
W,H=390,844;im=Image.new('RGB',(W*6+70,H+20),'#444')
for i,s in enumerate(S):
  a=Image.open(f'../{d}/{s}.png').convert('RGB').resize((W,H),Image.LANCZOS);im.paste(a,(10+i*(W+10),10))
im.save(out,quality=85)
