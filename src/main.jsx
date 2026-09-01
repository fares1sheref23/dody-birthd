import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const COPY = {
  title: 'To Mawada — My Favorite Person',
  hero: 'الحكاية دي معمولة عشانك إنتِ، يا أجمل صدفة في أيامي.',
  gallery: 'كل صورة هنا شايلة حكاية،\nحتى لو محدش يعرف تفاصيلها غيرنا.',
  gift: 'محل قصر الهدايا — منطقة السنترال، نجع حمادي، محافظة قنا',
  phone: '01276218191',
  relationshipStart: '2026-04-09T00:00:00+03:00',
};

const cleanTitle = (name) => {
  const raw = name.replace(/\.(mp3|mpeg|m4a|wav|ogg|aac)$/i, '').replace(/[_.]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (/ahwak/i.test(raw) || /اهواك/.test(raw)) return 'بهواك — عبد الحليم';
  if (/بدو|بسام ابو عواد/.test(raw)) return 'الأغنية البدوية';
  return raw.replace(/vidssave\.com/ig, '').replace(/بدون موسيق[ىي]/g, '').trim() || 'أغنية لينا';
};

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function useAudioManager(background) {
  const backgroundRef = useRef(null);
  const galleryRef = useRef(null);
  const backgroundPausedByUser = useRef(false);
  const [state, setState] = useState({ bgPlaying: false, muted: false, volume: 0.28, active: null, progress: 0, duration: 0 });

  const updateBg = useCallback(() => {
    const a = backgroundRef.current;
    if (a) setState(s => ({ ...s, bgPlaying: !a.paused, muted: a.muted, volume: a.volume }));
  }, []);

  useEffect(() => {
    if (!background?.path) return;
    const bg = new Audio(background.path);
    bg.loop = true; bg.volume = 0.28; backgroundRef.current = bg;
    const track = new Audio(); galleryRef.current = track;
    const restoreBackground = () => {
      if (!backgroundPausedByUser.current && bg.paused) bg.play().catch(() => {});
      setState(s => ({ ...s, active: null, progress: 0, duration: 0 }));
    };
    const sync = () => setState(s => ({ ...s, progress: track.currentTime, duration: track.duration || 0 }));
    bg.addEventListener('play', updateBg); bg.addEventListener('pause', updateBg); bg.addEventListener('volumechange', updateBg);
    track.addEventListener('timeupdate', sync); track.addEventListener('loadedmetadata', sync); track.addEventListener('ended', restoreBackground); track.addEventListener('pause', () => { if (track.currentTime > 0 && track.currentTime < (track.duration || Infinity)) restoreBackground(); });
    bg.play().catch(() => setState(s => ({ ...s, bgPlaying: false })));
    return () => { bg.pause(); track.pause(); bg.removeEventListener('play', updateBg); bg.removeEventListener('pause', updateBg); bg.removeEventListener('volumechange', updateBg); };
  }, [background?.path, updateBg]);

  const toggleBackground = useCallback(() => {
    const a = backgroundRef.current; if (!a) return;
    if (a.paused) { backgroundPausedByUser.current = false; a.play().catch(() => {}); }
    else { backgroundPausedByUser.current = true; a.pause(); }
  }, []);
  const setBgVolume = useCallback((value) => { const a = backgroundRef.current; if (a) { a.volume = Number(value); a.muted = false; updateBg(); } }, [updateBg]);
  const toggleMute = useCallback(() => { const a = backgroundRef.current; if (a) { a.muted = !a.muted; updateBg(); } }, [updateBg]);
  const toggleSong = useCallback((song) => {
    const bg = backgroundRef.current, track = galleryRef.current; if (!track) return;
    if (state.active === song.path) { track.pause(); return; }
    track.pause(); if (bg) bg.pause();
    track.src = song.path; track.volume = 0.8; track.play().then(() => setState(s => ({ ...s, active: song.path }))).catch(() => {});
  }, [state.active]);
  const seek = useCallback((value) => { if (galleryRef.current) galleryRef.current.currentTime = Number(value); }, []);
  const setSongVolume = useCallback((value) => { if (galleryRef.current) galleryRef.current.volume = Number(value); }, []);
  return { ...state, toggleBackground, setBgVolume, toggleMute, toggleSong, seek, setSongVolume };
}

function MusicDock({ music }) {
  return <aside className="music-dock" aria-label="التحكم في موسيقى الخلفية">
    <button className="round-button" onClick={music.toggleBackground} aria-label={music.bgPlaying ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى'}>{music.bgPlaying ? 'Ⅱ' : '▶'}</button>
    <div><small>{music.bgPlaying ? 'شغالة بهدوء' : 'الموسيقى متوقفة'}</small><b>أغنية فارس المخبيها ليكي</b></div>
    <button className="icon-button" onClick={music.toggleMute} aria-label="كتم الصوت">{music.muted ? '🔇' : '♬'}</button>
    <input aria-label="مستوى صوت الخلفية" type="range" min="0" max="1" step="0.02" value={music.muted ? 0 : music.volume} onChange={e => music.setBgVolume(e.target.value)} />
  </aside>;
}

function Lightbox({ photos, index, onClose, onMove }) {
  useEffect(() => { const handler = e => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') onMove(-1); if (e.key === 'ArrowLeft') onMove(1); }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [onClose, onMove]);
  const start = useRef(0);
  return <div className="lightbox" role="dialog" aria-modal="true" aria-label="عرض الذكريات" onClick={onClose} onTouchStart={e => { start.current = e.touches[0].clientX; }} onTouchEnd={e => { const delta = e.changedTouches[0].clientX - start.current; if (Math.abs(delta) > 45) onMove(delta > 0 ? 1 : -1); }}>
    <button className="close" onClick={onClose} aria-label="إغلاق">×</button><button className="light-nav next" onClick={e => { e.stopPropagation(); onMove(1); }} aria-label="الصورة التالية">‹</button>
    <figure onClick={e => e.stopPropagation()}><img src={photos[index].path} alt={`ذكرى رقم ${index + 1}`} /><figcaption>{index + 1} / {photos.length}</figcaption></figure>
    <button className="light-nav prev" onClick={e => { e.stopPropagation(); onMove(-1); }} aria-label="الصورة السابقة">›</button>
  </div>;
}

function VideoGallery({ videos }) {
  const [selected, setSelected] = useState(null);
  return <section className="videos section"><p className="eyebrow">ذكريات بصوت وحركة</p><h2>لحظات بتتحرك قدامي</h2><p>في ذكريات مش كفاية تتشاف في صورة…<br/>لازم نرجع نعيشها تاني.</p>
    {videos.length ? <div className="video-grid">{videos.map((video, index) => <button className="video-card" key={video.path} onClick={() => setSelected(index)}><video src={video.path} muted preload="metadata" playsInline onMouseEnter={e => e.currentTarget.play().catch(() => {})} onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }} /><span>▶</span><b>لحظة من حكايتنا</b></button>)}</div> : <div className="empty">أول ما نحط فيديوهاتنا هنا، هتعيش اللحظة من جديد. ✦</div>}
    {selected !== null && <div className="lightbox video-lightbox" role="dialog" aria-modal="true" aria-label="عرض الفيديو" onClick={() => setSelected(null)}><button className="close" onClick={() => setSelected(null)} aria-label="إغلاق">×</button><video controls autoPlay playsInline src={videos[selected].path} onClick={e => e.stopPropagation()} /></div>}
  </section>;
}

function RelationshipCounter() {
  const calculate = () => { const diff = Math.max(0, Date.now() - new Date(COPY.relationshipStart).getTime()); return { d: Math.floor(diff / 86400000), h: Math.floor(diff / 3600000) % 24, m: Math.floor(diff / 60000) % 60, s: Math.floor(diff / 1000) % 60 }; };
  const [time, setTime] = useState(calculate);
  useEffect(() => { const timer = setInterval(() => setTime(calculate()), 1000); return () => clearInterval(timer); }, []);
  return <section className="counter section"><p className="eyebrow">عداد الحكاية</p><h2>من يوم 9 أبريل 2026،<br/>والحكاية بتكبر كل يوم.</h2><div className="counter-grid">{[[time.d,'يوم'],[time.h,'ساعة'],[time.m,'دقيقة'],[time.s,'ثانية']].map(([number,label]) => <div key={label}><b>{String(number).padStart(2, '0')}</b><small>{label}</small></div>)}</div></section>;
}

function Quiz({ onComplete }) {
  const questions = [
    ['مين بدأ الاعتراف بالحب؟', 'فارس'], ['مين بيرجع يتصل بعد ما يقول “هنقفل”؟', 'إحنا الاتنين'], ['إيه أكتر حاجة فارس بيحبها في مودة؟', 'كل تفاصيلها']
  ];
  const [answer, setAnswer] = useState(0);
  const completed = answer >= questions.length;
  return <section className="quiz section"><p className="eyebrow">اختبار صغير قوي</p><h2>مين عارف التاني أكتر؟</h2><div className="quiz-card"><span>♡</span><p>{completed ? 'إنتِ كسبتي… عشان إنتِ أصلًا أحلى إجابة.' : questions[answer][0]}</p><button onClick={() => { if (!completed) { if (answer === questions.length - 1) onComplete(); setAnswer(answer + 1); } }}>{completed ? '♥' : questions[answer][1]}</button>{completed && <i>✦ ♥ ✦</i>}</div></section>;
}

function App() {
  const [assets, setAssets] = useState([]); const [intro, setIntro] = useState(true); const [lightbox, setLightbox] = useState(null); const [quizDone, setQuizDone] = useState(false); const [giftOpen, setGiftOpen] = useState(false); const [hiddenOpen, setHiddenOpen] = useState(false); const [progress, setProgress] = useState(0);
  useEffect(() => { fetch('/assets.json').then(r => r.ok ? r.json() : []).then(setAssets).catch(() => setAssets([])); }, []);
  useEffect(() => { const update = () => setProgress(Math.round((window.scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)) * 100)); update(); window.addEventListener('scroll', update, { passive: true }); return () => window.removeEventListener('scroll', update); }, []);
  const photos = useMemo(() => assets.filter(a => a.type === 'image'), [assets]);
  const videos = useMemo(() => assets.filter(a => a.type === 'video'), [assets]);
  const audio = useMemo(() => assets.filter(a => a.type === 'audio'), [assets]);
  const background = audio.find(a => a.special); const songs = audio.filter(a => !a.special);
  const music = useAudioManager(background);
  const start = () => { setIntro(false); if (!music.bgPlaying) music.toggleBackground(); };
  return <main>
    <div className="journey-progress" aria-label={`تقدم الحكاية ${progress}%`}><i style={{ width: `${progress}%` }}/></div>
    {intro && <section className="welcome-gate"><div className="gate-card"><span>♥</span><p>في كام حكاية بتبدأ من أول نظرة…</p><button onClick={start}>دوسي عشان تبدأ الحكاية ♥</button><small>صوت الحكاية هيشتغل أول ما تدوسي</small></div></section>}
    <MusicDock music={music} />
    <section className="hero section"><p className="eyebrow">{COPY.title}</p><span className="cake">⌁<i>♢</i></span><h1>كل سنة وإنتِ مودة…<br/>كل سنة وإنتِ دودة…<br/>وكل سنة وإنتِ أجمل حاجة حصلتلي.</h1><button className="hero-button" onClick={() => document.querySelector('#welcome')?.scrollIntoView({behavior:'smooth'})}>افتحي هديتك</button><div className="hero-orbit orbit-one">✦</div><div className="hero-orbit orbit-two">♡</div></section>
    <section className="letter welcome-letter section" id="welcome"><div className="welcome-photo">{photos[0] ? <img src={photos[0].path} alt="ذكرى مميزة لمودة"/> : <span>♥</span>}</div><div><p className="eyebrow">أول صفحة</p><h2>مودة… أو دودة… أو دودتي،<br/>أي اسم فيهم بيخلّي قلبي يبتسم.</h2><p>كل تفصيلة هنا معمولة مخصوص عشانك.<br/>خدي وقتك… دي حكايتنا.</p><b>من فارس</b><a className="inline-link" href="#memories">نبدأ الحكاية ↓</a></div></section>
    <section className="memories section" id="memories"><div className="section-heading"><div><p className="eyebrow">دفتر الذكريات</p><h2>صورنا اللي بتضحك لوحدها</h2><p>{COPY.gallery}</p></div><strong>ذكرياتنا — {photos.length} صورة</strong></div>
      {photos.length ? <div className="photo-wall">{photos.map((photo, i) => <button className="polaroid" key={photo.path} style={{ '--tilt': `${[-2, 2, -1, 3, -3][i % 5]}deg` }} onClick={() => setLightbox(i)}><span className="tape"/><img loading="lazy" src={photo.path} alt={`ذكرى مشتركة رقم ${i + 1}`} onError={e => e.currentTarget.parentElement.style.display = 'none'} /><i>{['لحظة مننا', 'ضحكة حلوة', 'افتكرنا هنا', 'إحنا'][i % 4]}</i></button>)}</div> : <div className="empty">أول ما تحطي صورنا هنا، الدفتر ده هيتملي بيها. ♥</div>}
    </section>
    <VideoGallery videos={videos} />
    <section className="timeline section"><p className="eyebrow">على مهلك كده</p><h2>والحكاية لسه طويلة</h2><div className="timeline-row"><article><b>الكلام اللي بيطوّل</b><p>قعدات الكلام الطويلة، حتى بعد ما المكالمة تخلص ونفضل نرن على بعض ونتكلم تاني.</p></article><article><b>أول اعتراف</b><p>اليوم اللي فارس اعترف فيه بحبه الأول.</p></article><article><b>ملجأ لبعض</b><p>وقت ما كنا بنهرب من الدنيا ونلجأ لبعض عشان نهدى.</p></article><article><b>كل يوم أكتر</b><p>كل مرة نكتشف إن حبنا كبر أكتر.</p></article></div></section>
    <RelationshipCounter />
    <Quiz onComplete={() => setQuizDone(true)} />
    <section className="notes section"><p className="eyebrow">افتحيهم واحدة واحدة</p><h2>شوية كلام مخبيينه في القلب</h2><div className="note-grid">{[['افتحيها لما تزعلي','أنا بحبك جدًا، وبحب كل حاجة فيكي… حتى جنانك وغبائك اللطيف.'],['افتحيها لما توحشيني','طيبتك واهتمامك وخوفك عليا بيخلوني أحس إن في حد بجد واخد باله مني.'],['افتحيها لما تحتاجي تبتسمي','حتى المكالمة اللي بنقول عليها آخر مكالمة، بنرجع بعدها نرن ونتكلم تاني.'],['افتحيها من غير مناسبة','وجودك في اليوم العادي بيخلّيه مميز من غير أي مجهود.'],['افتحي آخر واحدة','مهما حصل، أنا باختارك كل يوم من أول وجديد.']].map(([title,message]) => <details key={title}><summary>✉ {title}</summary><p>{message}</p></details>)}</div></section>
    <section className="soundtrack section"><p className="eyebrow">our little soundtrack</p><h2>أغاني بتفكّرني بينا</h2><p>كل أغنية هنا ليها إحساس… اختاري واحدة وخلّيها تكمل المشهد.</p><div className="special-track"><span>♫</span><div><b>أغنية فارس المخبيها ليكي</b><small>{background ? 'بتلعب في الخلفية عشان الحكاية تفضل مكملة.' : 'هتظهر هنا أول ما تضيفيها.'}</small></div></div><div className="song-list">{songs.map((song, i) => { const active = music.active === song.path; return <article className={`song-card ${active ? 'active' : ''}`} key={song.path}><div className="song-top"><button onClick={() => music.toggleSong(song)} aria-label={active ? 'إيقاف' : 'تشغيل'}>{active ? 'Ⅱ' : '▶'}</button><div><b>{cleanTitle(song.name)}</b><small>{active ? 'بتشغل دلوقتي' : 'من حكايتنا'}</small></div>{active && <div className="equalizer"><i/><i/><i/><i/></div>}</div><input type="range" min="0" max={music.duration || 1} value={active ? music.progress : 0} onChange={e => music.seek(e.target.value)} aria-label="تقدم الأغنية" /><div className="song-bottom"><span>{active ? formatTime(music.progress) : '0:00'} / {active ? formatTime(music.duration) : '--:--'}</span><label>♬ <input type="range" min="0" max="1" step="0.05" defaultValue="0.8" onChange={e => music.setSongVolume(e.target.value)} aria-label="صوت الأغنية" /></label></div></article>; })}</div></section>
    <section className="dreams section"><p className="eyebrow">مواعيد جايّة</p><h2>نفسي نكمل الحكاية دي للآخر</h2><div className="dream-list">{['نتخطب','نتجوز','ننجح في حياتنا','نحقق كل اللي بنحلم بيه','نفضل نختار بعض كل يوم'].map(x => <span key={x}>✦ {x}</span>)}</div><p className="funny-card">نقفل المكالمة من غير ما نرجع نرن بعدها بخمس دقايق<br/><b>مستحيل تقريبًا.</b></p></section>
    <section className="reveal section"><button className={`hidden-card ${hiddenOpen ? 'opened' : ''}`} onClick={() => setHiddenOpen(true)}><small>في حاجة مستخبية هنا…</small><b>{hiddenOpen ? 'دودتي، إنتِ من أجمل الحاجات اللي حصلتلي. ✦' : 'دوسي واكتشفيها'}</b></button></section>
    <section className="final section"><span className="tiny-heart">♥</span><p className="eyebrow">في حاجة أخيرة</p>{!quizDone ? <div className="locked"><span>⌁</span><h2>المفاجأة مستنياكي في آخر الحكاية</h2><p>جاوبي على اختبارنا الصغير الأول، وبعدين نفتحها سوا.</p><a href="#welcome">ارجعي اكملي الرحلة ↑</a></div> : !giftOpen ? <div className="locked unlocked"><h2>Are you ready for the real surprise?</h2><button onClick={() => { setGiftOpen(true); if (!music.bgPlaying) music.toggleBackground(); }}>أنا جاهزة ♥</button></div> : <><h2>استني… دي مش نهاية الحكاية.</h2><p>أنا جايبلك هدية معنوية صغيرة، بس معناها كبير عندي…<br/>حاجة كل ما تبصي عليها تفتكريني، وتفتكري إنك دايمًا في بالي.</p><div className="gift-card"><span>🎁</span><h3>هديتك مستنياكي عند:</h3><b>{COPY.gift}</b><hr/><small>العنوان</small><p>السنترال، مدينة نجع حمادي، محافظة قنا</p><small>التليفون</small><a className="gift-action" href="https://www.google.com/maps/search/?api=1&query=%D9%85%D8%AD%D9%84+%D9%82%D8%B5%D8%B1+%D8%A7%D9%84%D9%87%D8%AF%D8%A7%D9%8A%D8%A7+%D9%86%D8%AC%D8%B9+%D8%AD%D9%85%D8%A7%D8%AF%D9%8A" target="_blank" rel="noreferrer">افتحي العنوان</a><a className="gift-action" href={`tel:${COPY.phone}`}>اتصلي بالمحل</a></div><div className="birthday-end"><h2>Happy Birthday يا دودتي ♥</h2><p>بحبك يا مودة.<br/>And I’ll keep choosing you, every single day.</p><b>— فارس، اللي بيحبك أكتر مما بيعرف يقول</b><button onClick={() => { window.scrollTo({top:0,behavior:'smooth'}); music.toggleBackground(); }}>نعيشها تاني ♫</button></div></>}</section>
    {lightbox !== null && <Lightbox photos={photos} index={lightbox} onClose={() => setLightbox(null)} onMove={by => setLightbox(i => (i + by + photos.length) % photos.length)} />}
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
