import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import type { GetStaticProps } from 'next';
import { useScrollAnimations } from '@/hooks/useScrollAnimations';
import { DriftWall } from '@/components/DriftWall';
import { ScrollFloat } from '@/components/ScrollFloat';
import {
  CouncilMember,
  FacultyMember,
  WheelMember,
  defaultCouncilMembers,
  facultyMembers as defaultFaculty,
  fetchClubData,
} from '@/services/membersService';

type AboutPageProps = {
  initialData: {
    council: CouncilMember[];
    faculty: FacultyMember[];
    wheelCategories: Record<string, WheelMember[]>;
    galleryMembers?: any[];
  } | null;
};

export default function AboutPage({ initialData }: AboutPageProps) {
  useScrollAnimations();

  const [council, setCouncil] = useState<CouncilMember[]>(
    initialData?.council && initialData.council.length > 0 ? initialData.council : defaultCouncilMembers
  );
  const [faculty, setFaculty] = useState<FacultyMember[]>(initialData?.faculty || defaultFaculty);
  const [wheelCategories, setWheelCategories] = useState<Record<string, WheelMember[]>>(
    initialData?.wheelCategories || {}
  );
  const [galleryMembers, setGalleryMembers] = useState<any[]>(
    initialData?.galleryMembers || []
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialData?.council && initialData.council.length > 0) {
      setIsLoading(false);
      return;
    }
    fetch('/api/members')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.council && data.council.length > 0) {
          setCouncil(data.council);
          if (data.faculty) setFaculty(data.faculty);
          if (data.wheelCategories) setWheelCategories(data.wheelCategories);
          if (data.galleryMembers) setGalleryMembers(data.galleryMembers);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [initialData]);

  const allVerifiedMembers = useMemo(() => {
    if (galleryMembers && galleryMembers.length > 0) {
      return galleryMembers.map((m: any) => ({
        id: m.id,
        image: m.photoUrl,
        title: m.name,
        role: `${m.role} • ${m.team}`,
        data: m,
      }));
    }

    const all = Object.values(wheelCategories)
      .flat()
      .map((m) => ({
        id: m.id,
        name: m.name,
        role: `${m.role} • ${m.team}`,
        photoUrl: m.photoUrl,
        position: m.role,
        team: m.team,
      }));

    const councilIds = new Set(
      council.map((c) => (c.id || c.name || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
    );

    const uniqueMap = new Map<string, { id: string; name: string; role: string; photoUrl: string }>();
    all.forEach((m) => {
      const lowerRole = (m.position || m.role || '').toLowerCase();
      const lowerTeam = (m.team || '').toLowerCase();
      const key = (m.id || m.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      if (councilIds.has(key)) return;
      if (
        lowerTeam.includes('leadership') ||
        lowerRole.includes('president') ||
        lowerRole.includes('executive')
      )
        return;

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, m);
      }
    });

    return Array.from(uniqueMap.values())
      .filter((m) => m.photoUrl && !m.photoUrl.includes('vrgc_logo'))
      .map((m) => ({
        id: m.id,
        image: m.photoUrl,
        title: m.name,
        role: m.role,
        data: m,
      }));
  }, [wheelCategories, council, galleryMembers]);

  return (
    <>
      <Head>
        <title>Studio &amp; Leadership — VRGC VIT Bhopal</title>
        <meta
          name="description"
          content="Meet the student leadership, faculty coordinators, and competitive rosters of the Virtual Reality &amp; Gaming Club at VIT Bhopal University."
        />
      </Head>

      <main style={{ background: '#05000a', color: '#ffffff', minHeight: '100vh' }}>
        {/* ══════════════════════════════════════════════════
             SECTION 1: STUDIO HERO
             ══════════════════════════════════════════════════ */}
        <section
          style={{
            position: 'relative',
            padding: '7rem var(--pad, 2rem) 5rem',
            background: 'radial-gradient(circle at 50% 20%, #1e0338 0%, #0b0117 55%, #05000a 100%)',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
          }}
        >
          {/* Subtle Ambient Glow */}
          <div
            style={{
              position: 'absolute',
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '600px',
              height: '350px',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
            <div className="ink-sec-tag" style={{ justifyContent: 'center', marginBottom: '1.25rem' }}>
              <span className="tag-sq"></span> WHO WE ARE &bull; EST. 2017
            </div>

            <h1
              className="text-reveal-sub"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(3.5rem, 8.5vw, 7.5rem)',
                lineHeight: 0.94,
                color: '#ffffff',
                textAlign: 'center',
                margin: '0 auto',
                letterSpacing: '0.02em',
              }}
            >
              <span style={{ display: 'block' }}>GAMERS,</span>
              <span style={{ display: 'block', color: 'var(--purple-light, #c084fc)' }}>DEVELOPERS &amp;</span>
              <span style={{ display: 'block' }}>CHAMPIONS.</span>
            </h1>

            <p
              className="text-reveal-sub"
              style={{
                maxWidth: '740px',
                margin: '1.8rem auto 0',
                textAlign: 'center',
                fontSize: 'clamp(1rem, 2vw, 1.18rem)',
                lineHeight: 1.65,
                color: '#cbd5e1',
              }}
            >
              Premier College Esports and Game Dev and immersive VR and Game Research Studio at VIT Bhopal University. 1000+ active student competitors, tier-1 varsity tournament rosters, game development bootcamps, and dedicated VR hardware laboratories.
            </p>

            {/* ══════════════════════════════════════════════════
                 CIRCULAR EXECUTIVE COUNCIL: THE MINDS BEHIND THE GAMIVERSE
                 ══════════════════════════════════════════════════ */}
            <div style={{ marginTop: '5.5rem', textAlign: 'center' }}>
              <div className="ink-sec-tag" style={{ justifyContent: 'center', marginBottom: '0.8rem' }}>
                <span className="tag-sq"></span> EXECUTIVE COUNCIL
              </div>

              <ScrollFloat
                as="h2"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)',
                  color: '#ffffff',
                  lineHeight: 1,
                  marginTop: '0.5rem',
                  marginBottom: '3.5rem',
                  letterSpacing: '0.04em',
                }}
              >
                THE MINDS BEHIND THE GAMIVERSE
              </ScrollFloat>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
                  gap: '2rem',
                  maxWidth: '1200px',
                  margin: '0 auto',
                }}
              >
                {isLoading && council.length === 0 ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={`skel-council-${idx}`}
                      style={{
                        background: 'rgba(20, 4, 38, 0.7)',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        borderRadius: '16px',
                        padding: '2.5rem 1.8rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '130px',
                          height: '130px',
                          borderRadius: '50%',
                          marginBottom: '1.25rem',
                          background: 'rgba(168, 85, 247, 0.1)',
                          border: '2px dashed rgba(168, 85, 247, 0.3)',
                        }}
                      />
                      <div style={{ width: '130px', height: '22px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', marginBottom: '0.65rem' }} />
                      <div style={{ width: '90px', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', marginBottom: '0.75rem' }} />
                      <div style={{ width: '80px', height: '18px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.15)', marginBottom: '1rem' }} />
                    </div>
                  ))
                ) : (
                  council.map((lead, idx) => {
                    const badgeColors = ['#a855f7', '#fbbf24', '#38bdf8', '#34d399'];
                    const ringColors = [
                      'rgba(168, 85, 247, 0.6)',
                      'rgba(251, 191, 36, 0.6)',
                      'rgba(56, 189, 248, 0.6)',
                      'rgba(52, 211, 153, 0.6)',
                    ];
                    const ringColor = ringColors[idx % ringColors.length];
                    const badgeColor = badgeColors[idx % badgeColors.length];
                    const photoSrc = lead.photoUrl;

                    return (
                      <div
                        key={lead.id || lead.name}
                        style={{
                          background: 'rgba(20, 4, 38, 0.75)',
                          border: '1px solid rgba(168, 85, 247, 0.25)',
                          borderRadius: '16px',
                          padding: '2.5rem 1.8rem',
                          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.5)',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          backdropFilter: 'blur(16px)',
                          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease, box-shadow 0.3s ease',
                        }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            width: '130px',
                            height: '130px',
                            margin: '0 auto 1.35rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              inset: '-6px',
                              borderRadius: '50%',
                              border: `2px dashed ${ringColor}`,
                              pointerEvents: 'none',
                            }}
                          />
                          <div
                            style={{
                              width: '130px',
                              height: '130px',
                              borderRadius: '50%',
                              display: 'flex',
                              position: 'relative',
                              overflow: 'hidden',
                              border: `3px solid ${badgeColor}`,
                              background: '#0d011a',
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photoSrc}
                              alt={lead.name}
                              loading="eager"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                              }}
                              onError={(e) => {
                                if (process.env.NODE_ENV !== 'production') {
                                  console.warn('Member Image Load Failed:', {
                                    Member: lead.name,
                                    Registration: lead.id,
                                    UUID: (lead.photoUrl || '').replace('/images/', '').replace('.webp', ''),
                                    'Image URL': lead.photoUrl,
                                  });
                                }
                                const target = e.currentTarget;
                                if (target.src !== '/vrgc_logo.jpg' && !target.src.endsWith('/vrgc_logo.jpg')) {
                                  target.src = '/vrgc_logo.jpg';
                                }
                              }}
                            />
                          </div>
                        </div>

                        <h3
                          style={{
                            fontFamily: 'var(--font-head)',
                            fontSize: '1.45rem',
                            fontWeight: 800,
                            color: '#ffffff',
                            marginBottom: '0.35rem',
                            lineHeight: 1.2,
                          }}
                        >
                          {lead.name}
                        </h3>

                        <span style={{ color: badgeColor, fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.4rem' }}>
                          {lead.role}
                        </span>

                        <span
                          style={{
                            background: 'rgba(168, 85, 247, 0.15)',
                            color: '#e2e8f0',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            letterSpacing: '0.12em',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            marginTop: '0.25rem',
                          }}
                        >
                          {(lead.team || 'LEADERSHIP').toUpperCase()}
                        </span>

                        <p style={{ color: '#94a3b8', marginTop: '0.95rem', fontSize: '0.88rem', lineHeight: 1.6, margin: '0.95rem 0 0' }}>
                          {lead.bio}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ══════════════════════════════════════════════════
                   FACULTY ADVISORY: DR. RAMRAJ DANGI & DR. SIVABALAN KR
                   ══════════════════════════════════════════════════ */}
              <div style={{ marginTop: '6rem', paddingTop: '4rem', borderTop: '1px solid rgba(168, 85, 247, 0.2)' }}>
                <div className="ink-sec-tag" style={{ justifyContent: 'center', marginBottom: '0.8rem' }}>
                  <span className="tag-sq"></span> INSTITUTIONAL MENTORSHIP
                </div>

                <ScrollFloat
                  as="h3"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
                    color: '#ffffff',
                    lineHeight: 1,
                    marginTop: '0.5rem',
                    marginBottom: '2.5rem',
                    textAlign: 'center',
                    letterSpacing: '0.04em',
                  }}
                >
                  FACULTY COORDINATORS
                </ScrollFloat>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '2rem',
                    maxWidth: '920px',
                    margin: '0 auto',
                  }}
                >
                  {faculty.map((fac) => {
                    const facultyImg =
                      fac.image ||
                      (fac.name.toLowerCase().includes('ramraj')
                        ? '/faculty/ramraj_dangi.png'
                        : '/faculty/siva_balan.png');

                    return (
                      <div
                        key={fac.name}
                        style={{
                          background: 'rgba(20, 4, 38, 0.75)',
                          border: '1px solid rgba(168, 85, 247, 0.25)',
                          borderRadius: '16px',
                          padding: '2.5rem 2rem',
                          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.5)',
                          textAlign: 'center',
                          backdropFilter: 'blur(16px)',
                        }}
                      >
                        <div
                          style={{
                            width: '104px',
                            height: '104px',
                            borderRadius: '50%',
                            margin: '0 auto 1.25rem',
                            padding: '3px',
                            background: 'linear-gradient(135deg, #7c3aed, #c084fc)',
                            boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)',
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={facultyImg}
                            alt={fac.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '50%',
                              background: '#0d011a',
                            }}
                          />
                        </div>
                        <h4 style={{ fontFamily: 'var(--font-head)', fontSize: '1.4rem', color: '#ffffff', fontWeight: 800, marginBottom: '0.35rem' }}>
                          {fac.name}
                        </h4>
                        <div style={{ color: '#c084fc', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                          {fac.role}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.85rem' }}>
                          {fac.department}
                        </div>
                        <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>
                          {fac.bio}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
             FULLSCREEN ROSTER DRIFT WALL GALLERY
             FULL-BLEED EDGE-TO-EDGE CANVAS
             ══════════════════════════════════════════════════ */}
        <section
          style={{
            position: 'relative',
            width: '100%',
            height: '100vh',
            minHeight: '720px',
            overflow: 'hidden',
            background: 'radial-gradient(ellipse at 50% 50%, #17042c 0%, #0c0217 60%, #05000a 100%)',
            borderTop: '1px solid rgba(168, 85, 247, 0.25)',
            borderBottom: '1px solid rgba(168, 85, 247, 0.25)',
          }}
        >
          {/* Floating Navigation Pill */}
          <div
            style={{
              position: 'absolute',
              top: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.5rem 1.25rem',
              background: 'rgba(12, 2, 24, 0.85)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '999px',
              backdropFilter: 'blur(12px)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: '#e2e8f0',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              pointerEvents: 'none',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 10px #a855f7' }}></span>
            <span>HOLD &amp; DRAG TO EXPLORE &bull; HOVER FOR INTEL</span>
          </div>

          <DriftWall
            items={allVerifiedMembers}
            columns={8}
            tileWidth={220}
            tileHeight={150}
            gap={20}
            radius={16}
            tilt={12}
            turn={-10}
            perspective={1200}
            depth={80}
            speed={34}
            direction="up"
            variance={0.35}
            parallax={0.5}
            pauseOnHover={false}
            lift={68}
            fade={0.45}
            dim={0.68}
            overlayColor="#060010"
          />
        </section>

        {/* ══════════════════════════════════════════════════
             SECTION 3: 4 PILLARS OF VRGC
             ══════════════════════════════════════════════════ */}
        <section className="ink-sec-layout" style={{ background: '#080010', position: 'relative', padding: '6rem var(--pad, 2rem)' }}>
          <div className="ink-sec-tag" style={{ justifyContent: 'center' }}>
            <span className="tag-sq"></span> OUR ECOSYSTEM
          </div>
          <ScrollFloat
            as="h2"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 7vw, 5.5rem)', textAlign: 'center', color: '#fff', lineHeight: 0.95, marginBottom: '1rem', letterSpacing: '0.03em' }}
          >
            THE FOUR PILLARS OF VRGC
          </ScrollFloat>
          <p style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 3.5rem', color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Every domain is engineered for excellence. Whether competing on the national stage or writing spatial shaders, our departments operate with professional rigor.
          </p>

          <div className="dept-grid">
            <div className="dept-card">
              <span className="dept-num">01</span>
              <span className="dept-badge">COMPETITIVE DIVISION</span>
              <ScrollFloat as="h3" containerClassName="dept-title">
                E-SPORTS
              </ScrollFloat>
              <p className="dept-desc">
                Fielding varsity rosters in VALORANT, BGMI, FREE FIRE, FIFA and TEKKEN. Regular scrims against premier collegiate squads, dedicated coaching staff, analytics reviews, and inter college LAN tournament invites.
              </p>
              <div className="dept-stats">
                <div><div className="dept-stat-num">&#8377;20K+</div><div className="dept-stat-label">Prize Money</div></div>
                <div><div className="dept-stat-num">1000+</div><div className="dept-stat-label">Gamers</div></div>
                <div><div className="dept-stat-num">84%</div><div className="dept-stat-label">Scrim Winrate</div></div>
              </div>
            </div>

            <div className="dept-card">
              <span className="dept-num">02</span>
              <span className="dept-badge">INNOVATION LAB</span>
              <ScrollFloat as="h3" containerClassName="dept-title">
                DEVELOPMENT
              </ScrollFloat>
              <p className="dept-desc">
                Building next-generation virtual environments, spatial audio experiments, and custom Unreal Engine 5 games. Our teams publish games on itch.io and Steam, and build proprietary VR tools.
              </p>
              <div className="dept-stats">
                <div><div className="dept-stat-num">9</div><div className="dept-stat-label">Published Games</div></div>
                <div><div className="dept-stat-num">Meta Q3</div><div className="dept-stat-label">Hardware Rig</div></div>
                <div><div className="dept-stat-num">UE5 &bull; Unity</div><div className="dept-stat-label">Core Stacks</div></div>
              </div>
            </div>

            <div className="dept-card">
              <span className="dept-num">03</span>
              <span className="dept-badge">TECHNICAL KNOWLEDGE</span>
              <ScrollFloat as="h3" containerClassName="dept-title">
                WORKSHOPS
              </ScrollFloat>
              <p className="dept-desc">
                Hands-on technical masterclasses covering game engine architecture, 3D asset pipelines in Blender, VR tracking calibration, tournament broadcast operations, and GPU optimization.
              </p>
              <div className="dept-stats">
                <div><div className="dept-stat-num">10+</div><div className="dept-stat-label">Sessions Held</div></div>
                <div><div className="dept-stat-num">150+</div><div className="dept-stat-label">Students Trained</div></div>
                <div><div className="dept-stat-num">Quarterly</div><div className="dept-stat-label">Cadence</div></div>
              </div>
            </div>

            <div className="dept-card">
              <span className="dept-num">04</span>
              <span className="dept-badge">BROADCAST &amp; MEDIA</span>
              <ScrollFloat as="h3" containerClassName="dept-title">
                CASTING
              </ScrollFloat>
              <p className="dept-desc">
                High quality Hinglish Casting with over 10k+ views on youtube streams with 100+ watching hours. Conducted 50+ live streams in youtube.
              </p>
              <div className="dept-stats">
                <div><div className="dept-stat-num">10K+</div><div className="dept-stat-label">YouTube Views</div></div>
                <div><div className="dept-stat-num">100+</div><div className="dept-stat-label">Watch Hours</div></div>
                <div><div className="dept-stat-num">50+</div><div className="dept-stat-label">Live Streams</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
             SECTION 4: VR HARDWARE SHOWCASE
             ══════════════════════════════════════════════════ */}
        <section className="ink-sec-layout" style={{ background: '#0d011a', borderTop: '1px solid rgba(168, 85, 247, 0.15)', padding: '6rem var(--pad, 2rem)' }}>
          <div className="ink-sec-tag" style={{ justifyContent: 'center' }}>
            <span className="tag-sq"></span> CAMPUS RESEARCH FACILITY
          </div>
          <ScrollFloat
            as="h2"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 7vw, 5rem)', textAlign: 'center', color: '#fff', lineHeight: 0.95, marginBottom: '1rem', letterSpacing: '0.03em' }}
          >
            THE VR HARDWARE &amp; ESPORTS LAB
          </ScrollFloat>
          <p style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 3.5rem', color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Our flagship campus facility serves as both a high-performance tournament practice arena and a spatial computing incubation lab.
          </p>

          <div className="lab-specs-grid">
            <div className="lab-spec-box">
              <div className="lab-spec-val">12x</div>
              <div className="lab-spec-title">RTX 3060 Rigs</div>
              <div className="lab-spec-sub">360Hz Esports Displays</div>
            </div>
            <div className="lab-spec-box">
              <div className="lab-spec-val">3x</div>
              <div className="lab-spec-title">Meta Quest 2 &amp; 3</div>
              <div className="lab-spec-sub">Oculus Rift &amp; HTC Vive</div>
            </div>
            <div className="lab-spec-box">
              <div className="lab-spec-val">1 Gbps</div>
              <div className="lab-spec-title">Multiple Routers &amp; Hubs</div>
              <div className="lab-spec-sub">&lt; 5ms LAN Ping</div>
            </div>
            <div className="lab-spec-box">
              <div className="lab-spec-val">4K 60</div>
              <div className="lab-spec-title">Broadcast Desk</div>
              <div className="lab-spec-sub">Studio Setup</div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  let data = null;
  try {
    data = await fetchClubData();
  } catch {
    // Supabase/Firestore unreachable — render page with fallback state
  }
  return {
    props: {
      initialData: data || null,
    },
    revalidate: 60,
  };
};
