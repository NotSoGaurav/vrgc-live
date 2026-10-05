import Head from 'next/head';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>Maintenance — Studio &amp; About | VRGC VIT Bhopal</title>
        <meta
          name="description"
          content="The VRGC Studio &amp; Member Directory is currently undergoing scheduled maintenance and roster updates."
        />
        <meta name="robots" content="noindex, follow" />
      </Head>

      <main
        style={{
          minHeight: '82vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '9rem',
          paddingBottom: '6rem',
          paddingLeft: 'var(--pad)',
          paddingRight: 'var(--pad)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient background glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'clamp(300px, 60vw, 650px)',
            height: 'clamp(300px, 60vw, 650px)',
            background: 'radial-gradient(circle, rgba(123, 47, 255, 0.15) 0%, rgba(234, 179, 8, 0.08) 50%, transparent 70%)',
            pointerEvents: 'none',
            filter: 'blur(60px)',
            zIndex: 0,
          }}
        />

        <div
          style={{
            maxWidth: '640px',
            width: '100%',
            background: 'rgba(15, 3, 28, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(234, 179, 8, 0.35)',
            borderRadius: '24px',
            padding: 'clamp(2.5rem, 6vw, 3.5rem) clamp(1.5rem, 5vw, 2.5rem)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(234, 179, 8, 0.1)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Status Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.45rem 1.1rem',
              borderRadius: '100px',
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.45)',
              color: '#fbbf24',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '1.75rem',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#fbbf24',
                boxShadow: '0 0 10px #fbbf24',
                display: 'inline-block',
              }}
            />
            ROSTER &amp; STUDIO UPDATE IN PROGRESS
          </div>

          <div style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1 }}>
            ⚡
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.4rem, 6vw, 3.8rem)',
              color: '#ffffff',
              lineHeight: 1,
              letterSpacing: '0.02em',
              marginBottom: '1rem',
            }}
          >
            PAGE UNDER <span style={{ color: '#fbbf24' }}>MAINTENANCE</span>
          </h1>

          <p
            style={{
              color: 'var(--white-muted)',
              fontSize: 'clamp(0.95rem, 1.8vw, 1.05rem)',
              lineHeight: 1.65,
              marginBottom: '2rem',
              maxWidth: '520px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            We are currently upgrading the <strong>VRGC Studio</strong> and syncing our latest verified member directory, executive council portfolios, and research laboratory archives.
          </p>

          <div
            style={{
              background: 'rgba(234, 179, 8, 0.06)',
              borderLeft: '3px solid #fbbf24',
              borderRadius: '8px',
              padding: '0.9rem 1.2rem',
              textAlign: 'left',
              marginBottom: '2.5rem',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#fef08a', lineHeight: 1.5 }}>
              💡 In the meantime, you can explore ongoing campus tournaments, tune into our live stream arena, or join our community Discord.
            </p>
          </div>

          {/* Action Links */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/"
              className="btn-ink-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.75rem 1.75rem',
                fontSize: '0.88rem',
              }}
            >
              &larr; Return Home
            </Link>

            <Link
              href="/events"
              className="btn-ink-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.75rem 1.75rem',
                fontSize: '0.88rem',
              }}
            >
              View Tournaments &rarr;
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
