import { useId, type SVGProps } from "react";

// Driftpost logo (source: brand/driftpost-logo.svg). Uses currentColor so it follows the theme.
const D_SHAPE = "M469 186H792A325.5 325.5 0 0 1 792 837H469Z";
/** The wavy band cut out of the D… */
const CUT = "M369 389 C410 364 440 358 485 358 C580 358 630 409 705 409 C760 409 800 394 836 375 L836 684 C800 703 760 718 705 718 C630 718 580 667 485 667 C440 667 410 673 369 698 Z";
/** …and the three waves drawn back in, reaching out past the D's left edge. */
const WAVES = "M369 444 C410 419 440 413 485 413 C580 413 630 464 705 464 C760 464 800 449 836 430 L836 478 C800 497 760 512 705 512 C630 512 580 461 485 461 C440 461 410 467 369 492 Z M369 547 C410 522 440 516 485 516 C580 516 630 567 705 567 C760 567 800 552 836 533 L836 581 C800 600 760 615 705 615 C630 615 580 564 485 564 C440 564 410 570 369 595 Z M369 650 C410 625 440 619 485 619 C580 619 630 670 705 670 C760 670 800 655 836 636 L836 684 C800 703 760 718 705 718 C630 718 580 667 485 667 C440 667 410 673 369 698 Z";

export function Logo({ title = "Driftpost", ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  const id = `dp-cut-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="343 111 800 800" role="img" aria-label={title || undefined} fill="currentColor" {...props}>
      <mask id={id} maskUnits="userSpaceOnUse" x="343" y="111" width="800" height="800">
        <rect x="343" y="111" width="800" height="800" fill="#fff" />
        <path d={CUT} fill="#000" />
      </mask>
      <path d={D_SHAPE} mask={`url(#${id})`} />
      <path d={WAVES} />
    </svg>
  );
}
