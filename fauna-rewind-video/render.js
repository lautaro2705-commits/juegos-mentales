const {chromium}=require('playwright');const {spawn}=require('child_process');const fs=require('fs');const path=require('path');
const DIR=__dirname,FPS=30,DUR=15,N=FPS*DUR;
const mode=process.argv[2]||'stills';
(async()=>{
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  page.on('pageerror',e=>console.error('PAGEERR',e.message));
  await page.goto('file://'+path.join(DIR,'index.html'));
  await page.evaluate(async()=>{await Promise.all(["290px Anton","40px Bebas","70px VT","200px Pinyon","bold 30px Mono"].map(f=>document.fonts.load(f)));await document.fonts.ready;window.init();});
  if(mode==='stills'){
    const ts=(process.argv[3]||'1.5,4.5,8,11.8,13.7').split(',').map(Number);
    fs.mkdirSync(path.join(DIR,'stills'),{recursive:true});
    for(const t of ts){await page.evaluate(t=>window.seek(t),t);await page.screenshot({path:path.join(DIR,'stills',`t${t}.png`)});console.log('still',t)}
  }else{
    const FF=process.env.FFMPEG;
    const out=process.argv[3]||path.join(DIR,'out.mp4');
    const ff=spawn(FF,['-y','-f','image2pipe','-framerate',String(FPS),'-i','-','-i',path.join(DIR,'audio.wav'),'-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart','-c:a','aac','-b:a','192k','-shortest',out],{stdio:['pipe','inherit','inherit']});
    const t0=Date.now();
    for(let f=0;f<N;f++){await page.evaluate(t=>window.seek(t),f/FPS);const buf=await page.screenshot({type:'png'});
      if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
      if(f%50===0)console.log('frame',f,((Date.now()-t0)/1000).toFixed(1)+'s')}
    ff.stdin.end();await new Promise(r=>ff.on('close',r));console.log('done',out);
  }
  await browser.close();
})();
