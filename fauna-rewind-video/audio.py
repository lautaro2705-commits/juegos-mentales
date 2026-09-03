import numpy as np
SR=44100; DUR=15.0; N=int(SR*DUR)
t=np.arange(N)/SR
rng=np.random.default_rng(7)
out=np.zeros(N)

def add(sig,start,gain=1.0):
    i=int(start*SR); n=min(len(sig),N-i)
    if n>0: out[i:i+n]+=sig[:n]*gain

def env(n,a,d,s=0.0,r=0.0):
    e=np.ones(n); A=int(a*SR); D=int(d*SR); R=int(r*SR)
    if A>0: e[:A]=np.linspace(0,1,A)
    if D>0: e[A:A+D]=np.linspace(1,s,min(D,max(0,n-A)))
    if A+D<n: e[A+D:]=s
    if R>0 and R<n: e[-R:]*=np.linspace(1,0,R)
    return e

def fft_filter(sig,lo=None,hi=None,slope=1.0):
    F=np.fft.rfft(sig); f=np.fft.rfftfreq(len(sig),1/SR); m=np.ones_like(f)
    if hi is not None: m*=1/(1+(f/hi)**(4*slope))
    if lo is not None: m*=1/(1+(lo/np.maximum(f,1))**(4*slope))
    return np.fft.irfft(F*m,n=len(sig))

def saw(freq,n,detune=0.0):
    tt=np.arange(n)/SR
    s=np.zeros(n)
    for dt in (-detune,0,detune):
        ph=(tt*freq*(1+dt))%1.0
        s+=2*ph-1
    return s/3

def note(midi): return 440*2**((midi-69)/12)

def conv(sig,ir):
    n=len(sig)+len(ir)-1
    return np.fft.irfft(np.fft.rfft(sig,n)*np.fft.rfft(ir,n),n)[:len(sig)+len(ir)-1]

# ---------- 0.0-2.9s : tape rewind ----------
n=int(2.7*SR); tt=np.arange(n)/SR
# motor whine sweeping up with wobble
f=700+2600*(tt/2.7)**0.6+40*np.sin(2*np.pi*7*tt)
ph=np.cumsum(f)/SR
whine=np.sin(2*np.pi*ph)*0.18+np.sin(2*np.pi*2*ph)*0.06
whine*=env(n,0.15,0.0,1.0,0.25)
# tape hiss/rumble + mechanical flutter
hiss=fft_filter(rng.standard_normal(n),lo=600,hi=6000)*0.16*(0.7+0.3*np.sin(2*np.pi*25*tt))
hiss*=env(n,0.2,0.0,1.0,0.2)
rumble=fft_filter(rng.standard_normal(n),hi=120)*0.5*env(n,0.1,0.0,1.0,0.2)
add(whine+hiss+rumble,0.0)
# chatter garbled voices (backwards playback feel): random short bandpassed bursts
for k in range(40):
    st=0.3+rng.random()*2.2; ln=int(SR*(0.02+rng.random()*0.06))
    b=fft_filter(rng.standard_normal(ln),lo=300+rng.random()*1500,hi=2000+rng.random()*3000)
    add(b*env(ln,0.003,0.0,1.0,0.01)*0.12,st)
# clunk at 2.78s (deck stops)
n=int(0.35*SR); tt=np.arange(n)/SR
clunk=np.sin(2*np.pi*(90*np.exp(-tt*18)+40)*tt)*env(n,0.001,0.3)*0.9
click=fft_filter(rng.standard_normal(int(0.02*SR)),lo=1500)*env(int(0.02*SR),0.0005,0.02)*0.6
add(clunk,2.78); add(click,2.78); add(click*0.6,2.86)

# ---------- 3.0-15s : synthwave beat 118 BPM ----------
BPM=118; beat=60/BPM; start=3.0
def kick(n=int(0.35*SR)):
    tt=np.arange(n)/SR
    f=160*np.exp(-tt*28)+48
    s=np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,0.0005,0.33)
    s+=fft_filter(rng.standard_normal(n),lo=2000)*env(n,0.0002,0.01)*0.4
    return np.tanh(s*2.2)*0.9
def snare():
    n=int(0.32*SR); tt=np.arange(n)/SR
    body=np.sin(2*np.pi*190*tt)*env(n,0.0005,0.08)*0.5
    nz=fft_filter(rng.standard_normal(n),lo=1200,hi=9000)*env(n,0.0005,0.14)
    # gated reverb: dense noise tail, hard cut at 170ms
    ir=rng.standard_normal(int(0.17*SR))*np.linspace(1,0.6,int(0.17*SR)); ir[-int(0.005*SR):]*=np.linspace(1,0,int(0.005*SR))
    gated=conv(nz,ir*0.02)
    gated=fft_filter(gated[:n],lo=900,hi=7000)
    return (body+nz*0.8+gated*1.6)*0.85
def hat(open_=False):
    n=int((0.25 if open_ else 0.05)*SR)
    return fft_filter(rng.standard_normal(n),lo=7000)*env(n,0.0005,0.24 if open_ else 0.045)*0.28
def stab(midis,dur):
    n=int(dur*SR); s=np.zeros(n)
    for m in midis: s+=saw(note(m),n,0.008)
    s=fft_filter(s/len(midis),hi=2500)
    return s*env(n,0.004,dur*0.9,0.0)*0.55
def bass(m,dur):
    n=int(dur*SR); s=saw(note(m),n,0.004)+np.sin(2*np.pi*note(m)*np.arange(n)/SR)*0.6
    s=fft_filter(s,hi=900)
    return s*env(n,0.003,dur*0.85,0.0,0.01)*0.5

K=kick(); SN=snare(); HH=hat(); OH=hat(True)
# progression per bar (2 beats per chord change = 1.017s): Am F C G  (A minor)
chords=[(57,60,64,69),(53,57,60,65),(48,55,60,64),(55,59,62,67)]
roots=[45,41,36,43]
total_beats=int((DUR-start)/beat)+1
for b in range(total_beats):
    tb=start+b*beat
    if tb>=DUR: break
    add(K,tb)
    if b%2==1: add(SN,tb)
    add(HH,tb,0.9); add(HH,tb+beat/2,0.6)
    if b%4==3: add(OH,tb+beat/2,0.7)
    ci=(b//2)%4
    # bass 16ths: root octave pattern
    for s in range(4):
        m=roots[ci]+(12 if s%2 else 0)
        add(bass(m,beat/4*0.9),tb+s*beat/4)
    if b%2==0:
        add(stab(chords[ci],beat*0.6),tb,0.9)
        add(stab([m+12 for m in chords[ci]],beat*0.35),tb+beat*1.5,0.5)
# final hit at 13.5s: big stab + long reverb, then tape stop
n=int(1.4*SR)
hit=stab((57,60,64,69,76),1.4)
ir=rng.standard_normal(int(1.2*SR))*np.exp(-np.arange(int(1.2*SR))/SR*3.5)
hitrev=fft_filter(conv(hit,ir*0.01)[:n],hi=5000)
add(hit*1.1,13.5); add(hitrev*0.9,13.5); add(K*1.2,13.5)
add(click,14.7); add(clunk*0.6,14.7)

# vhs hiss bed
add(fft_filter(rng.standard_normal(N),lo=3000,hi=12000)*0.012,0)
# fade out last 0.4s
out[-int(0.3*SR):]*=np.linspace(1,0,int(0.3*SR))
out=np.tanh(out*1.1)
out=out/np.max(np.abs(out))*0.95
import wave,struct
pcm=(out*32767).astype('<i2')
with wave.open('audio.wav','wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('audio.wav',len(out)/SR,'s')
