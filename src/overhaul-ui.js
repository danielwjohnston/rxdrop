const STYLE_ID = 'rxdrop-overhaul-styles';

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* Authored environment art lives behind the canvas; gameplay remains crisp above it. */
    #board {
      background-color: rgba(2, 5, 14, .72);
      background-blend-mode: normal, screen;
      transition: background-image .45s ease, background-position .45s ease;
    }

    /* The virus theatre is character feedback, not expendable desktop chrome. */
    #virus-tally.tally {
      display: block !important;
      min-height: 62px;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--era-accent) 22%, transparent);
      background: radial-gradient(circle at 50% 20%, color-mix(in srgb, var(--era-accent) 10%, transparent), rgba(2,5,14,.42));
    }

    #sonic-button.is-lit,
    #sonic-button:active {
      color: #07151b;
      background: linear-gradient(180deg, #a9fbff, #55dbe8);
      border-color: #c9fdff;
      box-shadow: 0 0 18px rgba(127,243,255,.35);
    }

    .rx-sonic-meter .meter__fill {
      background: linear-gradient(90deg, #4ecbd8, #9cf8ff, #ffffff);
      box-shadow: 0 0 10px rgba(127,243,255,.35);
    }

    body.is-sonic-therapy #board {
      filter: saturate(.82) brightness(.72);
    }

    body.is-sonic-therapy #sonic-therapy {
      box-shadow: inset 0 0 34px rgba(127,243,255,.11), 0 0 28px rgba(0,0,0,.38);
      border: 1px solid rgba(127,243,255,.26);
      backdrop-filter: blur(1.5px);
    }

    @media (max-width: 720px) {
      #virus-tally.tally {
        display: block !important;
        flex: 1 1 100%;
        width: 100%;
        height: 48px !important;
        min-height: 48px;
        order: 20;
      }

      .panel--right {
        max-height: 31vh;
      }

      body.is-sonic-therapy .touchpad button:not(#sonic-button):not(#light-button) {
        opacity: .38;
      }

      #sonic-therapy {
        inset: 3% 3% 5% !important;
        width: 94% !important;
        height: 92% !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #board,
      .panel,
      .button,
      .meter__fill {
        transition: none !important;
      }
    }
  `;
  document.head.append(style);
}
